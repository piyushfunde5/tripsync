import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, buildNudgeEmailHtml } from '@/lib/email';

// Send email nudge (single or bulk)
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

    if (!currentMember || currentMember.role !== 'organizer') {
      return NextResponse.json({ error: 'Only the organizer can send nudge emails' }, { status: 403 });
    }

    const body = await request.json();
    const { type, memberIds } = body;
    // type: 'rsvp_reminder' | 'poll_reminder' | 'task_reminder' | 'budget_reminder' | 'trip_summary'
    // memberIds: string[] | 'all'

    if (!type) {
      return NextResponse.json({ error: 'Notification type is required' }, { status: 400 });
    }

    // Get members to email
    const { data: allMembers } = await supabase
      .from('members')
      .select('id, name, email, rsvp_status')
      .eq('trip_id', trip.id);

    if (!allMembers || allMembers.length === 0) {
      return NextResponse.json({ error: 'No members found' }, { status: 400 });
    }

    let targetMembers = allMembers;
    if (memberIds !== 'all' && Array.isArray(memberIds)) {
      targetMembers = allMembers.filter((m) => memberIds.includes(m.id));
    }

    if (targetMembers.length === 0) {
      return NextResponse.json({ error: 'No target members' }, { status: 400 });
    }

    // Get decisions for email content
    const { data: decisions } = await supabase
      .from('decisions')
      .select('title, status, decided_value')
      .eq('trip_id', trip.id);

    // Get open polls for pending actions
    const { data: openPolls } = await supabase
      .from('polls')
      .select('id, question, votes:poll_votes(member_id)')
      .eq('trip_id', trip.id)
      .eq('status', 'open');

    // Get pending tasks
    const { data: pendingTasks } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, status')
      .eq('trip_id', trip.id)
      .neq('status', 'done');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const tripUrl = `${appUrl}/t/${slug}`;

    const subjectMap: Record<string, string> = {
      rsvp_reminder: `${trip.title} - Please RSVP`,
      poll_reminder: `${trip.title} - Vote pending`,
      task_reminder: `${trip.title} - Task needs attention`,
      budget_reminder: `${trip.title} - Submit your budget`,
      trip_summary: `${trip.title} - Trip Update`,
    };

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const member of targetMembers) {
      // Build per-member pending actions
      const memberPending: string[] = [];

      if (member.rsvp_status === 'pending') {
        const deadlineStr = trip.rsvp_deadline
          ? new Date(trip.rsvp_deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          : 'soon';
        memberPending.push(`RSVP: Please confirm by ${deadlineStr}`);
      }

      (openPolls || []).forEach((poll) => {
        const voterIds = (poll.votes || []).map((v: { member_id: string }) => v.member_id);
        if (!voterIds.includes(member.id)) {
          memberPending.push(`Poll: "${poll.question}" — your vote pending`);
        }
      });

      (pendingTasks || []).forEach((task) => {
        if (task.assigned_to === member.id) {
          const isOverdue = task.status === 'overdue' || (task.assigned_to && new Date() > new Date());
          memberPending.push(`Task${isOverdue ? ' (OVERDUE)' : ''}: "${task.title}"`);
        }
      });

      const html = buildNudgeEmailHtml({
        memberName: member.name,
        tripName: trip.title,
        tripUrl,
        members: allMembers.map((m) => ({ name: m.name, rsvpStatus: m.rsvp_status })),
        pendingActions: memberPending.length > 0 ? memberPending : ['You\'re all caught up!'],
        decisions: (decisions || []).map((d) => ({
          title: d.title,
          status: d.status,
          value: d.decided_value || undefined,
        })),
      });

      const subject = subjectMap[type] || `${trip.title} - Update`;
      const result = await sendEmail({ to: member.email, subject, html });
      results.push({ email: member.email, ...result });

      // Log to email_notifications table
      await supabase.from('email_notifications').insert({
        trip_id: trip.id,
        recipient_email: member.email,
        recipient_member_id: member.id,
        notification_type: type,
        subject,
        status: result.success ? 'sent' : 'failed',
      });
    }

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      sent: sentCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error('Send nudge email error:', error);
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
  }
}
