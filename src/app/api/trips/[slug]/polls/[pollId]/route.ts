import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Close a poll (organizer or poll creator only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; pollId: string }> }
) {
  try {
    const { slug, pollId } = await params;
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

    // Check poll exists and belongs to this trip
    const { data: poll } = await supabase
      .from('polls')
      .select('*, options:poll_options(*), votes:poll_votes(*)')
      .eq('id', pollId)
      .eq('trip_id', trip.id)
      .single();

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Only organizer or poll creator can close
    if (member.role !== 'organizer' && poll.created_by !== member.id) {
      return NextResponse.json({ error: 'Only organizer or poll creator can close polls' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'close') {
      // Calculate winning option
      const voteCounts: Record<string, number> = {};
      for (const vote of (poll.votes || [])) {
        voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
      }

      let winningOptionId: string | null = null;
      let maxVotes = 0;
      for (const [optId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          winningOptionId = optId;
        }
      }

      const winningOption = poll.options?.find((o: { id: string }) => o.id === winningOptionId);

      // Close the poll
      const { error: closeError } = await supabase
        .from('polls')
        .update({ status: 'closed' })
        .eq('id', pollId);

      if (closeError) throw closeError;

      // Update linked decision if exists
      if (winningOption) {
        await supabase
          .from('decisions')
          .update({
            status: 'decided',
            decided_value: winningOption.label,
            decided_at: new Date().toISOString(),
          })
          .eq('poll_id', pollId);
      }

      // Log activity
      await supabase.from('activity_log').insert({
        trip_id: trip.id,
        member_id: member.id,
        action_type: 'poll_closed',
        action_detail: { question: poll.question, winner: winningOption?.label },
      });

      return NextResponse.json({ success: true, winner: winningOption?.label || null });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update poll error:', error);
    return NextResponse.json({ error: 'Failed to update poll' }, { status: 500 });
  }
}

// Delete a poll (organizer only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; pollId: string }> }
) {
  try {
    const { slug, pollId } = await params;
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

    if (!member || member.role !== 'organizer') {
      return NextResponse.json({ error: 'Only organizer can delete polls' }, { status: 403 });
    }

    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId)
      .eq('trip_id', trip.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete poll error:', error);
    return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 });
  }
}
