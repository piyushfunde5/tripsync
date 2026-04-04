import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// List all tasks for a trip
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: trip } = await supabase
      .from('trips')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, assignee:members!tasks_assigned_to_fkey(id, name, avatar_url), creator:members!tasks_created_by_fkey(name)')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}

// Create a new task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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
      return NextResponse.json({ error: 'Not a member of this trip' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, assignedTo, deadline } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    // Validate assignee is a member of this trip if provided
    if (assignedTo) {
      const { data: assignee } = await supabase
        .from('members')
        .select('id')
        .eq('id', assignedTo)
        .eq('trip_id', trip.id)
        .single();

      if (!assignee) {
        return NextResponse.json({ error: 'Assignee is not a member of this trip' }, { status: 400 });
      }
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        trip_id: trip.id,
        title: title.trim(),
        description: description?.trim() || null,
        assigned_to: assignedTo || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        status: 'assigned',
        created_by: member.id,
      })
      .select('*, assignee:members!tasks_assigned_to_fkey(id, name, avatar_url)')
      .single();

    if (taskError) throw taskError;

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'task_created',
      action_detail: {
        title: title.trim(),
        assigned_to_name: assignedTo ? task.assignee?.name : null,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
