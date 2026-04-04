import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { data: polls } = await supabase
      .from('polls')
      .select('*, options:poll_options(*), votes:poll_votes(*, member:members(id, name, avatar_url))')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ polls: polls || [] });
  } catch (error) {
    console.error('Get polls error:', error);
    return NextResponse.json({ error: 'Failed to load polls' }, { status: 500 });
  }
}

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
    const { question, pollType, deadline, options, decisionTitle, decisionCategory } = body;

    if (!question || !deadline || !options?.length) {
      return NextResponse.json({ error: 'Question, deadline, and options are required' }, { status: 400 });
    }

    // Create poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        trip_id: trip.id,
        question,
        poll_type: pollType || 'single',
        deadline,
        created_by: member.id,
      })
      .select()
      .single();

    if (pollError) throw pollError;

    // Create options
    const optionRows = options.map((opt: { label: string; description?: string }, i: number) => ({
      poll_id: poll.id,
      label: opt.label,
      description: opt.description || null,
      sort_order: i,
    }));

    const { error: optError } = await supabase
      .from('poll_options')
      .insert(optionRows);

    if (optError) throw optError;

    // Optionally create linked decision
    if (decisionTitle) {
      await supabase.from('decisions').insert({
        trip_id: trip.id,
        title: decisionTitle,
        category: decisionCategory || null,
        status: 'voting',
        poll_id: poll.id,
      });
    }

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'poll_created',
      action_detail: { question },
    });

    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    console.error('Create poll error:', error);
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
  }
}
