import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
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
      .select('id')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this trip' }, { status: 403 });
    }

    // Get poll with type check
    const { data: poll } = await supabase
      .from('polls')
      .select('id, poll_type, status, deadline')
      .eq('id', pollId)
      .eq('trip_id', trip.id)
      .single();

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (poll.status === 'closed') {
      return NextResponse.json({ error: 'This poll is closed' }, { status: 400 });
    }

    if (new Date(poll.deadline) < new Date()) {
      return NextResponse.json({ error: 'Voting deadline has passed' }, { status: 400 });
    }

    const body = await request.json();
    const { optionId } = body;

    if (!optionId) {
      return NextResponse.json({ error: 'Option ID is required' }, { status: 400 });
    }

    // Verify option belongs to this poll
    const { data: option } = await supabase
      .from('poll_options')
      .select('id')
      .eq('id', optionId)
      .eq('poll_id', pollId)
      .single();

    if (!option) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 });
    }

    // Check existing votes
    const { data: existingVotes } = await supabase
      .from('poll_votes')
      .select('id, option_id')
      .eq('poll_id', pollId)
      .eq('member_id', member.id);

    if (poll.poll_type === 'single' || poll.poll_type === 'date') {
      // Single choice: replace existing vote
      if (existingVotes && existingVotes.length > 0) {
        // If voting for the same option, remove vote (toggle off)
        if (existingVotes[0].option_id === optionId) {
          await supabase
            .from('poll_votes')
            .delete()
            .eq('id', existingVotes[0].id);

          return NextResponse.json({ success: true, action: 'removed' });
        }

        // Replace with new vote
        await supabase
          .from('poll_votes')
          .delete()
          .eq('id', existingVotes[0].id);
      }

      const { error } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          member_id: member.id,
        });

      if (error) throw error;
    } else {
      // Multi choice: toggle vote on this option
      const existingForOption = existingVotes?.find((v) => v.option_id === optionId);

      if (existingForOption) {
        await supabase
          .from('poll_votes')
          .delete()
          .eq('id', existingForOption.id);

        return NextResponse.json({ success: true, action: 'removed' });
      }

      const { error } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          member_id: member.id,
        });

      if (error) throw error;
    }

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'poll_voted',
      action_detail: { poll_id: pollId },
    });

    return NextResponse.json({ success: true, action: 'voted' });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}
