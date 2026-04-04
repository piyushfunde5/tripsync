import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Update an expense
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; expenseId: string }> }
) {
  try {
    const { slug, expenseId } = await params;
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

    // Get existing expense
    const { data: existing } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('trip_id', trip.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Only payer or organizer can edit
    if (existing.paid_by !== member.id && member.role !== 'organizer') {
      return NextResponse.json({ error: 'Only the payer or organizer can edit this expense' }, { status: 403 });
    }

    const body = await request.json();
    const { description, amount, category } = body;

    const updateData: Record<string, unknown> = {};
    if (description !== undefined) updateData.description = description.trim();
    if (amount !== undefined) updateData.amount = amount;
    if (category !== undefined) updateData.category = category;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select()
      .single();

    if (updateError) throw updateError;

    // If amount changed, update splits proportionally
    if (amount !== undefined && amount !== parseFloat(existing.amount)) {
      // Get current splits
      const { data: currentSplits } = await supabase
        .from('expense_splits')
        .select('*')
        .eq('expense_id', expenseId);

      if (currentSplits && currentSplits.length > 0) {
        const newShareAmount = Math.round((amount / currentSplits.length) * 100) / 100;
        await supabase
          .from('expense_splits')
          .update({ share_amount: newShareAmount })
          .eq('expense_id', expenseId);
      }
    }

    // Log activity with before/after
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'expense_edited',
      action_detail: {
        expense_id: expenseId,
        before: {
          description: existing.description,
          amount: parseFloat(existing.amount),
          category: existing.category,
        },
        after: {
          description: updated.description,
          amount: parseFloat(updated.amount),
          category: updated.category,
        },
      },
    });

    return NextResponse.json({ expense: updated });
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// Delete an expense
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; expenseId: string }> }
) {
  try {
    const { slug, expenseId } = await params;
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

    // Get existing expense for auth check + logging
    const { data: existing } = await supabase
      .from('expenses')
      .select('*, payer:members!expenses_paid_by_fkey(name)')
      .eq('id', expenseId)
      .eq('trip_id', trip.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Only payer or organizer can delete
    if (existing.paid_by !== member.id && member.role !== 'organizer') {
      return NextResponse.json({ error: 'Only the payer or organizer can delete this expense' }, { status: 403 });
    }

    // Delete expense (splits cascade)
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (deleteError) throw deleteError;

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'expense_deleted',
      action_detail: {
        description: existing.description,
        amount: parseFloat(existing.amount),
        category: existing.category,
        paid_by_name: existing.payer?.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
