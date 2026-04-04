import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get all pending actions across the trip
export async function GET(
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
      .select('*')
      .eq('slug', slug)
      .single();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Verify organizer
    const { data: currentMember } = await supabase
      .from('members')
      .select('id, role')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (!currentMember) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get all members
    const { data: members } = await supabase
      .from('members')
      .select('id, name, email, avatar_url, rsvp_status, budget_min, budget_max')
      .eq('trip_id', trip.id);

    // Get open polls with votes
    const { data: polls } = await supabase
      .from('polls')
      .select('id, question, deadline, status, votes:poll_votes(member_id)')
      .eq('trip_id', trip.id)
      .eq('status', 'open');

    // Get tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, deadline, status')
      .eq('trip_id', trip.id)
      .neq('status', 'done');

    const allMembers = members || [];
    const memberMap = new Map(allMembers.map((m) => [m.id, m]));

    // Build pending actions per category
    const pendingRsvp = allMembers
      .filter((m) => m.rsvp_status === 'pending')
      .map((m) => ({
        memberId: m.id,
        memberName: m.name,
        memberEmail: m.email,
        avatarUrl: m.avatar_url,
        action: 'RSVP pending',
      }));

    const pendingPolls: { memberId: string; memberName: string; memberEmail: string; avatarUrl: string | null; action: string; pollQuestion: string }[] = [];
    (polls || []).forEach((poll) => {
      const voterIds = new Set((poll.votes || []).map((v: { member_id: string }) => v.member_id));
      allMembers.forEach((m) => {
        if (!voterIds.has(m.id)) {
          pendingPolls.push({
            memberId: m.id,
            memberName: m.name,
            memberEmail: m.email,
            avatarUrl: m.avatar_url,
            action: `Vote pending: "${poll.question}"`,
            pollQuestion: poll.question,
          });
        }
      });
    });

    const overdueTasks: { memberId: string; memberName: string; memberEmail: string; avatarUrl: string | null; action: string; taskTitle: string }[] = [];
    const pendingTasks: typeof overdueTasks = [];
    (tasks || []).forEach((task) => {
      if (!task.assigned_to) return;
      const assignee = memberMap.get(task.assigned_to);
      if (!assignee) return;

      const isOverdue = task.deadline && new Date(task.deadline) < new Date();

      (isOverdue ? overdueTasks : pendingTasks).push({
        memberId: assignee.id,
        memberName: assignee.name,
        memberEmail: assignee.email,
        avatarUrl: assignee.avatar_url,
        action: isOverdue ? `Task overdue: "${task.title}"` : `Task assigned: "${task.title}"`,
        taskTitle: task.title,
      });
    });

    const pendingBudget = allMembers
      .filter((m) => m.budget_min === null || m.budget_max === null)
      .map((m) => ({
        memberId: m.id,
        memberName: m.name,
        memberEmail: m.email,
        avatarUrl: m.avatar_url,
        action: 'Budget input pending',
      }));

    return NextResponse.json({
      rsvp: {
        pending: pendingRsvp,
        count: pendingRsvp.length,
      },
      polls: {
        pending: pendingPolls,
        count: pendingPolls.length,
        openPollCount: (polls || []).length,
      },
      tasks: {
        overdue: overdueTasks,
        pending: pendingTasks,
        overdueCount: overdueTasks.length,
        pendingCount: pendingTasks.length,
      },
      budget: {
        pending: pendingBudget,
        count: pendingBudget.length,
        allSubmitted: pendingBudget.length === 0,
      },
      totalPending: pendingRsvp.length + pendingPolls.length + overdueTasks.length + pendingBudget.length,
    });
  } catch (error) {
    console.error('Get nudges error:', error);
    return NextResponse.json({ error: 'Failed to load nudges' }, { status: 500 });
  }
}
