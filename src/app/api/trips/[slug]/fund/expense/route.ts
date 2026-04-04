import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Log a fund expense (treasurer only)
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

    // Only treasurer or organizer can log fund expenses
    if (fund.treasurer_id !== member.id && member.role !== 'organizer') {
      return NextResponse.json({ error: 'Only the treasurer or organizer can log fund expenses' }, { status: 403 });
    }

    const body = await request.json();
    const { description, amount, category } = body;

    if (!description?.trim() || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Description and valid amount are required' }, { status: 400 });
    }

    const { data: expense, error: insertError } = await supabase
      .from('fund_expenses')
      .insert({
        fund_id: fund.id,
        description: description.trim(),
        amount,
        category: category || 'other',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'fund_expense',
      action_detail: { description: description.trim(), amount, category: category || 'other' },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Log fund expense error:', error);
    return NextResponse.json({ error: 'Failed to log fund expense' }, { status: 500 });
  }
}
