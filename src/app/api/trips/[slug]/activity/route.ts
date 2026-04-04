import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Full activity feed with filtering
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

    // Parse query params
    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // e.g., 'expense', 'task', 'poll'
    const memberId = url.searchParams.get('member_id');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('activity_log')
      .select('*, member:members(id, name, avatar_url)', { count: 'exact' })
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by action type category
    if (type) {
      const typeFilters: Record<string, string[]> = {
        expense: ['expense_added', 'expense_edited', 'expense_deleted'],
        fund: ['fund_created', 'fund_contribution', 'fund_expense_added'],
        task: ['task_created', 'task_completed', 'task_updated', 'task_deleted'],
        poll: ['poll_created', 'poll_voted', 'poll_closed'],
        decision: ['decision_created', 'decision_updated'],
        member: ['member_joined', 'rsvp_changed'],
        itinerary: ['itinerary_added', 'itinerary_removed'],
        budget: ['budget_submitted'],
      };
      const actionTypes = typeFilters[type];
      if (actionTypes) {
        query = query.in('action_type', actionTypes);
      }
    }

    // Filter by member
    if (memberId) {
      query = query.eq('member_id', memberId);
    }

    const { data: activities, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      activities: activities || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get activity error:', error);
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });
  }
}
