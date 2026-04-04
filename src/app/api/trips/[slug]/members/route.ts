import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Join a trip
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

    // Check if already a member
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already a member' }, { status: 409 });
    }

    const { data: member, error } = await supabase
      .from('members')
      .insert({
        trip_id: trip.id,
        user_id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member',
        email: user.email!,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'member',
        rsvp_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'member_joined',
      action_detail: { name: member.name },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Join trip error:', error);
    return NextResponse.json({ error: 'Failed to join trip' }, { status: 500 });
  }
}

// Update RSVP status
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

    const { data: trip } = await supabase
      .from('trips')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const body = await request.json();
    const { rsvpStatus } = body;

    if (!['in', 'out', 'maybe'].includes(rsvpStatus)) {
      return NextResponse.json({ error: 'Invalid RSVP status' }, { status: 400 });
    }

    const { data: member, error } = await supabase
      .from('members')
      .update({
        rsvp_status: rsvpStatus,
        rsvp_responded_at: new Date().toISOString(),
      })
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'rsvp_changed',
      action_detail: { from: body.previousStatus, to: rsvpStatus },
    });

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Update RSVP error:', error);
    return NextResponse.json({ error: 'Failed to update RSVP' }, { status: 500 });
  }
}
