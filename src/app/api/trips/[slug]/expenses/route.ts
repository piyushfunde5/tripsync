import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// List all expenses with balances
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

    // Get all expenses with splits and payer info
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*, payer:members!expenses_paid_by_fkey(id, name, avatar_url), splits:expense_splits(*, member:members(id, name))')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false });

    // Get members for balance calculation
    const { data: members } = await supabase
      .from('members')
      .select('id, name, avatar_url')
      .eq('trip_id', trip.id);

    // Calculate balances per member
    // balance > 0 = group owes them, balance < 0 = they owe group
    const balances: Record<string, number> = {};
    (members || []).forEach((m) => {
      balances[m.id] = 0;
    });

    (expenses || []).forEach((expense) => {
      const amount = parseFloat(expense.amount);
      const payerId = expense.paid_by;

      // Payer paid this amount
      if (balances[payerId] !== undefined) {
        balances[payerId] += amount;
      }

      // Each split member owes their share
      (expense.splits || []).forEach((split: { member_id: string; share_amount: string | number }) => {
        const shareAmount = parseFloat(String(split.share_amount));
        if (balances[split.member_id] !== undefined) {
          balances[split.member_id] -= shareAmount;
        }
      });
    });

    // Build balance summary with member info
    const balanceSummary = (members || []).map((m) => ({
      memberId: m.id,
      name: m.name,
      avatarUrl: m.avatar_url,
      balance: Math.round((balances[m.id] || 0) * 100) / 100,
    }));

    // Current user's balance
    const currentMember = (members || []).find((m) => {
      // We need user_id to match, but we only have id here
      // Let's get the current member separately
      return false;
    });

    // Get current member's ID
    const { data: currentMemberData } = await supabase
      .from('members')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    const currentUserBalance = currentMemberData ? (balances[currentMemberData.id] || 0) : 0;

    const totalExpenses = (expenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);

    return NextResponse.json({
      expenses: expenses || [],
      balanceSummary,
      currentUserBalance: Math.round(currentUserBalance * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 });
  }
}

// Add a new expense
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
      .select('id')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const body = await request.json();
    const { description, amount, category, paidBy, splitAmong, splitType } = body;

    if (!description?.trim() || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Description and valid amount are required' }, { status: 400 });
    }

    // Validate paidBy is a member
    const payerId = paidBy || member.id;
    const { data: payer } = await supabase
      .from('members')
      .select('id, name')
      .eq('id', payerId)
      .eq('trip_id', trip.id)
      .single();

    if (!payer) {
      return NextResponse.json({ error: 'Payer is not a member of this trip' }, { status: 400 });
    }

    // Get members for split calculation
    const { data: allMembers } = await supabase
      .from('members')
      .select('id, name')
      .eq('trip_id', trip.id);

    if (!allMembers || allMembers.length === 0) {
      return NextResponse.json({ error: 'No members found' }, { status: 400 });
    }

    // Determine who to split among
    let splitMemberIds: string[];
    if (splitType === 'custom' && splitAmong?.length > 0) {
      splitMemberIds = splitAmong;
    } else {
      // Split among everyone
      splitMemberIds = allMembers.map((m) => m.id);
    }

    // Validate all split members exist
    const validSplitMembers = splitMemberIds.filter((id: string) =>
      allMembers.some((m) => m.id === id)
    );

    if (validSplitMembers.length === 0) {
      return NextResponse.json({ error: 'No valid members to split among' }, { status: 400 });
    }

    // Calculate equal split
    const shareAmount = Math.round((amount / validSplitMembers.length) * 100) / 100;

    // Create expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        trip_id: trip.id,
        description: description.trim(),
        amount,
        category: category || 'other',
        paid_by: payerId,
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    // Create splits
    const splitRows = validSplitMembers.map((memberId: string) => ({
      expense_id: expense.id,
      member_id: memberId,
      share_amount: shareAmount,
    }));

    const { error: splitError } = await supabase
      .from('expense_splits')
      .insert(splitRows);

    if (splitError) throw splitError;

    // Log activity with split member names for audit trail
    const splitMemberNames = validSplitMembers
      .map((id: string) => allMembers.find((m) => m.id === id)?.name)
      .filter(Boolean);

    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'expense_added',
      action_detail: {
        expense_id: expense.id,
        description: description.trim(),
        amount,
        category: category || 'other',
        paid_by_name: payer.name,
        split_count: validSplitMembers.length,
        split_members: splitMemberNames,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
