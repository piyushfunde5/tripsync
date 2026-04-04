import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const body = await request.json();
    const { title, category, status, decidedValue } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data: decision, error } = await supabase
      .from('decisions')
      .insert({
        trip_id: trip.id,
        title,
        category: category || null,
        status: status || 'proposed',
        decided_value: decidedValue || null,
        decided_at: status === 'decided' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'decision_created',
      action_detail: { title },
    });

    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    console.error('Create decision error:', error);
    return NextResponse.json({ error: 'Failed to create decision' }, { status: 500 });
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

    const body = await request.json();
    const { decisionId, status, decidedValue } = body;

    if (!decisionId) {
      return NextResponse.json({ error: 'Decision ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === 'decided' || status === 'booked') {
        updateData.decided_at = new Date().toISOString();
      }
    }
    if (decidedValue !== undefined) {
      updateData.decided_value = decidedValue;
    }

    const { data: decision, error } = await supabase
      .from('decisions')
      .update(updateData)
      .eq('id', decisionId)
      .eq('trip_id', trip.id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'decision_updated',
      action_detail: { title: decision.title, status },
    });

    return NextResponse.json({ decision });
  } catch (error) {
    console.error('Update decision error:', error);
    return NextResponse.json({ error: 'Failed to update decision' }, { status: 500 });
  }
}
