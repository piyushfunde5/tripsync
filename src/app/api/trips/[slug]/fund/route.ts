import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get fund status + balance
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
      .select('id')
      .eq('slug', slug)
      .single();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Get fund
    const { data: fund } = await supabase
      .from('group_funds')
      .select('*, treasurer:members!group_funds_treasurer_id_fkey(id, name, avatar_url)')
      .eq('trip_id', trip.id)
      .single();

    if (!fund) {
      return NextResponse.json({ fund: null, exists: false });
    }

    // Get contributions
    const { data: contributions } = await supabase
      .from('fund_contributions')
      .select('*, member:members(id, name, avatar_url)')
      .eq('fund_id', fund.id)
      .order('contributed_at', { ascending: false });

    // Get fund expenses
    const { data: fundExpenses } = await supabase
      .from('fund_expenses')
      .select('*')
      .eq('fund_id', fund.id)
      .order('created_at', { ascending: false });

    // Get all members for contribution tracking
    const { data: members } = await supabase
      .from('members')
      .select('id, name, avatar_url')
      .eq('trip_id', trip.id);

    // Calculate per-member contributions
    const contributionMap: Record<string, number> = {};
    (members || []).forEach((m) => {
      contributionMap[m.id] = 0;
    });
    (contributions || []).forEach((c) => {
      contributionMap[c.member_id] = (contributionMap[c.member_id] || 0) + parseFloat(String(c.amount));
    });

    const memberContributions = (members || []).map((m) => ({
      memberId: m.id,
      name: m.name,
      avatarUrl: m.avatar_url,
      contributed: Math.round((contributionMap[m.id] || 0) * 100) / 100,
      target: fund.target_per_person || 0,
      status: contributionMap[m.id] >= (fund.target_per_person || 0)
        ? 'paid'
        : contributionMap[m.id] > 0
        ? 'partial'
        : 'unpaid',
    }));

    const totalCollected = Object.values(contributionMap).reduce((s, v) => s + v, 0);
    const totalSpent = (fundExpenses || []).reduce((s, e) => s + parseFloat(String(e.amount)), 0);
    const totalTarget = (fund.target_per_person || 0) * (members || []).length;

    return NextResponse.json({
      fund: {
        ...fund,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        remaining: Math.round((totalCollected - totalSpent) * 100) / 100,
        totalTarget: Math.round(totalTarget * 100) / 100,
      },
      memberContributions,
      fundExpenses: fundExpenses || [],
      exists: true,
    });
  } catch (error) {
    console.error('Get fund error:', error);
    return NextResponse.json({ error: 'Failed to load fund' }, { status: 500 });
  }
}

// Create/activate fund (organizer only)
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

    if (!member || member.role !== 'organizer') {
      return NextResponse.json({ error: 'Only the organizer can create a group fund' }, { status: 403 });
    }

    // Check if fund already exists
    const { data: existing } = await supabase
      .from('group_funds')
      .select('id')
      .eq('trip_id', trip.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Group fund already exists' }, { status: 400 });
    }

    const body = await request.json();
    const { targetPerPerson, treasurerId } = body;

    if (typeof targetPerPerson !== 'number' || targetPerPerson <= 0) {
      return NextResponse.json({ error: 'Valid target amount required' }, { status: 400 });
    }

    // Validate treasurer is a member
    const validTreasurer = treasurerId || member.id;
    const { data: treasurer } = await supabase
      .from('members')
      .select('id, name')
      .eq('id', validTreasurer)
      .eq('trip_id', trip.id)
      .single();

    if (!treasurer) {
      return NextResponse.json({ error: 'Treasurer must be a trip member' }, { status: 400 });
    }

    const { data: fund, error: insertError } = await supabase
      .from('group_funds')
      .insert({
        trip_id: trip.id,
        target_per_person: targetPerPerson,
        treasurer_id: validTreasurer,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'fund_created',
      action_detail: { target_per_person: targetPerPerson, treasurer_name: treasurer.name },
    });

    return NextResponse.json({ fund }, { status: 201 });
  } catch (error) {
    console.error('Create fund error:', error);
    return NextResponse.json({ error: 'Failed to create fund' }, { status: 500 });
  }
}

// Update fund settings (organizer only)
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

    if (!member || member.role !== 'organizer') {
      return NextResponse.json({ error: 'Only the organizer can update the fund' }, { status: 403 });
    }

    const body = await request.json();
    const { targetPerPerson, treasurerId, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (targetPerPerson !== undefined) updateData.target_per_person = targetPerPerson;
    if (treasurerId !== undefined) updateData.treasurer_id = treasurerId;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: updated, error: updateError } = await supabase
      .from('group_funds')
      .update(updateData)
      .eq('trip_id', trip.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ fund: updated });
  } catch (error) {
    console.error('Update fund error:', error);
    return NextResponse.json({ error: 'Failed to update fund' }, { status: 500 });
  }
}
