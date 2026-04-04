import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get optimized settlement transfers
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

    // Get all expenses with splits
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*, splits:expense_splits(*)')
      .eq('trip_id', trip.id);

    // Get members
    const { data: members } = await supabase
      .from('members')
      .select('id, name, avatar_url')
      .eq('trip_id', trip.id);

    if (!members) {
      return NextResponse.json({ settlements: [] });
    }

    // Calculate net balances
    const balances: Record<string, number> = {};
    members.forEach((m) => {
      balances[m.id] = 0;
    });

    (expenses || []).forEach((expense) => {
      const amount = parseFloat(expense.amount);
      const payerId = expense.paid_by;

      if (balances[payerId] !== undefined) {
        balances[payerId] += amount;
      }

      (expense.splits || []).forEach((split: { member_id: string; share_amount: string | number }) => {
        const shareAmount = parseFloat(String(split.share_amount));
        if (balances[split.member_id] !== undefined) {
          balances[split.member_id] -= shareAmount;
        }
      });
    });

    // Optimize settlements using greedy algorithm
    // Separate into creditors (owed money) and debtors (owe money)
    const creditors: { id: string; name: string; amount: number }[] = [];
    const debtors: { id: string; name: string; amount: number }[] = [];

    members.forEach((m) => {
      const balance = Math.round((balances[m.id] || 0) * 100) / 100;
      if (balance > 0.01) {
        creditors.push({ id: m.id, name: m.name, amount: balance });
      } else if (balance < -0.01) {
        debtors.push({ id: m.id, name: m.name, amount: Math.abs(balance) });
      }
    });

    // Sort: largest debts and credits first for fewer transfers
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements: {
      from: { id: string; name: string };
      to: { id: string; name: string };
      amount: number;
    }[] = [];

    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const transfer = Math.min(creditors[ci].amount, debtors[di].amount);
      if (transfer > 0.01) {
        settlements.push({
          from: { id: debtors[di].id, name: debtors[di].name },
          to: { id: creditors[ci].id, name: creditors[ci].name },
          amount: Math.round(transfer * 100) / 100,
        });
      }

      creditors[ci].amount -= transfer;
      debtors[di].amount -= transfer;

      if (creditors[ci].amount < 0.01) ci++;
      if (debtors[di].amount < 0.01) di++;
    }

    return NextResponse.json({ settlements });
  } catch (error) {
    console.error('Get settlement error:', error);
    return NextResponse.json({ error: 'Failed to calculate settlement' }, { status: 500 });
  }
}
