import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get budget alignment results (anonymous ranges + sweet spot)
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
    const { data: currentMember } = await supabase
      .from('members')
      .select('id, budget_min, budget_max')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (!currentMember) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get all members' budget inputs
    const { data: members } = await supabase
      .from('members')
      .select('id, budget_min, budget_max')
      .eq('trip_id', trip.id);

    const totalMembers = members?.length || 0;
    const submittedMembers = (members || []).filter(
      (m) => m.budget_min !== null && m.budget_max !== null
    );
    const submittedCount = submittedMembers.length;

    // Anonymous ranges (no names attached)
    const anonymousRanges = submittedMembers.map((m) => ({
      min: m.budget_min as number,
      max: m.budget_max as number,
    }));

    // Calculate sweet spot (overlap zone)
    let sweetSpot: { min: number; max: number } | null = null;
    let outlierCount = 0;

    if (submittedMembers.length >= 2) {
      // Sweet spot = [max of all mins, min of all maxes]
      const overlapMin = Math.max(...anonymousRanges.map((r) => r.min));
      const overlapMax = Math.min(...anonymousRanges.map((r) => r.max));

      if (overlapMin <= overlapMax) {
        sweetSpot = { min: overlapMin, max: overlapMax };

        // Count outliers (ranges that don't overlap with the sweet spot)
        outlierCount = anonymousRanges.filter(
          (r) => r.max < overlapMin || r.min > overlapMax
        ).length;
      } else {
        // No perfect overlap — find the best approximation
        // Use median range as sweet spot
        const allMins = anonymousRanges.map((r) => r.min).sort((a, b) => a - b);
        const allMaxes = anonymousRanges.map((r) => r.max).sort((a, b) => a - b);
        const mid = Math.floor(allMins.length / 2);
        sweetSpot = {
          min: allMins[mid],
          max: allMaxes[mid],
        };
        outlierCount = anonymousRanges.filter(
          (r) => r.max < sweetSpot!.min || r.min > sweetSpot!.max
        ).length;
      }
    }

    // Global min/max for the scale
    const globalMin = anonymousRanges.length > 0
      ? Math.min(...anonymousRanges.map((r) => r.min))
      : 5000;
    const globalMax = anonymousRanges.length > 0
      ? Math.max(...anonymousRanges.map((r) => r.max))
      : 100000;

    return NextResponse.json({
      totalMembers,
      submittedCount,
      hasSubmitted: currentMember.budget_min !== null && currentMember.budget_max !== null,
      currentInput: currentMember.budget_min !== null ? {
        min: currentMember.budget_min,
        max: currentMember.budget_max,
      } : null,
      anonymousRanges,
      sweetSpot,
      outlierCount,
      globalMin,
      globalMax,
    });
  } catch (error) {
    console.error('Get budget alignment error:', error);
    return NextResponse.json({ error: 'Failed to load budget data' }, { status: 500 });
  }
}

// Submit budget range
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
    const { budgetMin, budgetMax } = body;

    if (typeof budgetMin !== 'number' || typeof budgetMax !== 'number') {
      return NextResponse.json({ error: 'Budget min and max are required' }, { status: 400 });
    }

    if (budgetMin < 0 || budgetMax < 0 || budgetMin > budgetMax) {
      return NextResponse.json({ error: 'Invalid budget range' }, { status: 400 });
    }

    // Update member's budget input
    const { error: updateError } = await supabase
      .from('members')
      .update({
        budget_min: budgetMin,
        budget_max: budgetMax,
      })
      .eq('id', member.id);

    if (updateError) throw updateError;

    // Check if all members have submitted — if so, update trip budget range
    const { data: allMembers } = await supabase
      .from('members')
      .select('budget_min, budget_max')
      .eq('trip_id', trip.id);

    const allSubmitted = allMembers?.every(
      (m) => m.budget_min !== null && m.budget_max !== null
    );

    if (allSubmitted && allMembers && allMembers.length > 0) {
      const overlapMin = Math.max(...allMembers.map((m) => m.budget_min!));
      const overlapMax = Math.min(...allMembers.map((m) => m.budget_max!));

      if (overlapMin <= overlapMax) {
        await supabase
          .from('trips')
          .update({ budget_min: overlapMin, budget_max: overlapMax })
          .eq('id', trip.id);
      }
    }

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'budget_submitted',
      action_detail: { budget_min: budgetMin, budget_max: budgetMax },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit budget error:', error);
    return NextResponse.json({ error: 'Failed to submit budget' }, { status: 500 });
  }
}
