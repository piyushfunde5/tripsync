import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Update a task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; taskId: string }> }
) {
  try {
    const { slug, taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: trip } = await supabase
      .from('trips')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('members')
      .select('id, role')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get existing task
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('trip_id', trip.id)
      .single();

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, title, description, assignedTo, deadline } = body;

    const updateData: Record<string, unknown> = {};

    // Status updates: assignee can mark done/in-progress, organizer can do anything
    if (status) {
      const isAssignee = existingTask.assigned_to === member.id;
      const isOrganizer = member.role === 'organizer';
      const isCreator = existingTask.created_by === member.id;

      if (!isAssignee && !isOrganizer && !isCreator) {
        return NextResponse.json({ error: 'Only assignee, creator, or organizer can update task status' }, { status: 403 });
      }

      if (!['assigned', 'in_progress', 'done', 'overdue'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      updateData.status = status;
    }

    // Only organizer/creator can update other fields
    if (title !== undefined || description !== undefined || assignedTo !== undefined || deadline !== undefined) {
      const isOrganizer = member.role === 'organizer';
      const isCreator = existingTask.created_by === member.id;

      if (!isOrganizer && !isCreator) {
        return NextResponse.json({ error: 'Only organizer or creator can edit task details' }, { status: 403 });
      }

      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (assignedTo !== undefined) updateData.assigned_to = assignedTo || null;
      if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline).toISOString() : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select('*, assignee:members!tasks_assigned_to_fkey(id, name, avatar_url)')
      .single();

    if (updateError) throw updateError;

    // Log activity
    const actionType = status === 'done' ? 'task_completed' : 'task_updated';
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: actionType,
      action_detail: {
        title: task.title,
        ...(status ? { status } : {}),
        ...(assignedTo !== undefined ? { assigned_to: task.assignee?.name } : {}),
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// Delete a task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; taskId: string }> }
) {
  try {
    const { slug, taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: trip } = await supabase
      .from('trips')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('members')
      .select('id, role')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get existing task for auth check + logging
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('*, assignee:members!tasks_assigned_to_fkey(name)')
      .eq('id', taskId)
      .eq('trip_id', trip.id)
      .single();

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only organizer or creator can delete
    if (member.role !== 'organizer' && existingTask.created_by !== member.id) {
      return NextResponse.json({ error: 'Only organizer or creator can delete tasks' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) throw deleteError;

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'task_deleted',
      action_detail: { title: existingTask.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
