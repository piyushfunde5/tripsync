import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all trips the user is a member of
    const { data: members, error } = await supabase
      .from('members')
      .select(`
        rsvp_status,
        role,
        trip:trips (
          id, slug, title, destination, start_date, end_date, status,
          members (id, name, avatar_url, rsvp_status, user_id)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const trips = (members || [])
      .map((m: any) => m.trip)
      .filter(Boolean);

    return NextResponse.json({ trips });
  } catch (error) {
    console.error('Get trips error:', error);
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, destination, startDate, endDate, rsvpDeadline, budgetMin, budgetMax } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        title,
        slug,
        destination,
        start_date: startDate,
        end_date: endDate,
        rsvp_deadline: rsvpDeadline ? new Date(rsvpDeadline).toISOString() : null,
        budget_min: budgetMin ?? null,
        budget_max: budgetMax ?? null,
        status: 'planning',
        created_by: null, // Will be updated after member is created
      })
      .select()
      .single();

    if (tripError) {
      // Slug collision — retry with different suffix
      if (tripError.code === '23505') {
        return NextResponse.json({ error: 'Trip URL already taken. Try a different name.' }, { status: 409 });
      }
      throw tripError;
    }

    // Add the creator as organizer member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        trip_id: trip.id,
        user_id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Organizer',
        email: user.email!,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'organizer',
        rsvp_status: 'in',
        rsvp_responded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // Update trip's created_by
    await supabase
      .from('trips')
      .update({ created_by: member.id })
      .eq('id', trip.id);

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'trip_created',
      action_detail: { title, slug },
    });

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    console.error('Create trip error:', error);
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
  }
}
