import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('slug', slug)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Get members
    const { data: members } = await supabase
      .from('members')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: true });

    // Check if current user is a member
    let currentMember = null;
    if (user) {
      currentMember = members?.find((m) => m.user_id === user.id) || null;
    }

    // Get recent activity
    const { data: activity } = await supabase
      .from('activity_log')
      .select('*, member:members(name)')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get decisions
    const { data: decisions } = await supabase
      .from('decisions')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: true });

    // Get tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, assignee:members!tasks_assigned_to_fkey(name, avatar_url)')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: true });

    // Get polls with options and votes
    const { data: polls } = await supabase
      .from('polls')
      .select('*, options:poll_options(*), votes:poll_votes(*, member:members(id, name, avatar_url)), creator:members!polls_created_by_fkey(name)')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      trip,
      members: members || [],
      currentMember,
      activity: activity || [],
      decisions: decisions || [],
      tasks: tasks || [],
      polls: polls || [],
      isAuthenticated: !!user,
    });
  } catch (error) {
    console.error('Get trip error:', error);
    return NextResponse.json({ error: 'Failed to load trip' }, { status: 500 });
  }
}

export async function PATCH(
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

    // Verify organizer
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
      .select('role')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (!member || member.role !== 'organizer') {
      return NextResponse.json({ error: 'Only the organizer can edit trip details' }, { status: 403 });
    }

    const body = await request.json();
    const { data: updated, error } = await supabase
      .from('trips')
      .update(body)
      .eq('id', trip.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ trip: updated });
  } catch (error) {
    console.error('Update trip error:', error);
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
  }
}
