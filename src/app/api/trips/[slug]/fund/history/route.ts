import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Full fund contribution + expense history
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

    // Verify membership
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get fund
    const { data: fund } = await supabase
      .from('group_fund')
      .select('id')
      .eq('trip_id', trip.id)
      .single();

    if (!fund) {
      return NextResponse.json({ contributions: [], expenses: [], history: [] });
    }

    // Get contributions with member info
    const { data: contributions } = await supabase
      .from('fund_contributions')
      .select('*, member:members(id, name, avatar_url)')
      .eq('fund_id', fund.id)
      .order('contributed_at', { ascending: false });

    // Get fund expenses with logger info
    const { data: expenses } = await supabase
      .from('fund_expenses')
      .select('*, logger:members!fund_expenses_logged_by_fkey(id, name, avatar_url)')
      .eq('fund_id', fund.id)
      .order('created_at', { ascending: false });

    // Build unified timeline
    const history = [
      ...(contributions || []).map((c) => ({
        id: c.id,
        type: 'contribution' as const,
        amount: parseFloat(String(c.amount)),
        memberName: c.member?.name || 'Unknown',
        memberAvatar: c.member?.avatar_url || null,
        timestamp: c.contributed_at,
      })),
      ...(expenses || []).map((e) => ({
        id: e.id,
        type: 'expense' as const,
        amount: parseFloat(String(e.amount)),
        description: e.description,
        category: e.category,
        loggedByName: e.logger?.name || 'Unknown',
        loggedByAvatar: e.logger?.avatar_url || null,
        timestamp: e.created_at,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      contributions: contributions || [],
      expenses: expenses || [],
      history,
    });
  } catch (error) {
    console.error('Get fund history error:', error);
    return NextResponse.json({ error: 'Failed to load fund history' }, { status: 500 });
  }
}
