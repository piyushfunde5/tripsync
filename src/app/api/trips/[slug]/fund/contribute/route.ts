import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Log a contribution to the group fund
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
      .select('id, role, name')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get fund
    const { data: fund } = await supabase
      .from('group_funds')
      .select('id, treasurer_id, is_active')
      .eq('trip_id', trip.id)
      .single();

    if (!fund) {
      return NextResponse.json({ error: 'No group fund exists' }, { status: 404 });
    }

    if (!fund.is_active) {
      return NextResponse.json({ error: 'Fund is closed' }, { status: 400 });
    }

    // Only treasurer or organizer can log contributions
    if (fund.treasurer_id !== member.id && member.role !== 'organizer') {
      return NextResponse.json({ error: 'Only the treasurer or organizer can log contributions' }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, amount } = body;

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
    }

    // Validate member exists
    const { data: contributor } = await supabase
      .from('members')
      .select('id, name')
      .eq('id', memberId)
      .eq('trip_id', trip.id)
      .single();

    if (!contributor) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const { data: contribution, error: insertError } = await supabase
      .from('fund_contributions')
      .insert({
        fund_id: fund.id,
        member_id: memberId,
        amount,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'fund_contribution',
      action_detail: { contributor_name: contributor.name, amount, logged_by: member.name },
    });

    return NextResponse.json({ contribution }, { status: 201 });
  } catch (error) {
    console.error('Log contribution error:', error);
    return NextResponse.json({ error: 'Failed to log contribution' }, { status: 500 });
  }
}
