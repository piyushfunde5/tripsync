import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// List all itinerary items for a trip
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

    const { data: items } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', trip.id)
      .order('day_number', { ascending: true })
      .order('sort_order', { ascending: true });

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error('Get itinerary error:', error);
    return NextResponse.json({ error: 'Failed to load itinerary' }, { status: 500 });
  }
}

// Add a new itinerary item
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
      .select('id, title')
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
    const { dayNumber, title, description, location, startTime, endTime, category } = body;

    if (!title?.trim() || typeof dayNumber !== 'number' || dayNumber < 1) {
      return NextResponse.json({ error: 'Title and valid day number are required' }, { status: 400 });
    }

    // Get max sort_order for this day
    const { data: existing } = await supabase
      .from('itinerary_items')
      .select('sort_order')
      .eq('trip_id', trip.id)
      .eq('day_number', dayNumber)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data: item, error: insertError } = await supabase
      .from('itinerary_items')
      .insert({
        trip_id: trip.id,
        day_number: dayNumber,
        title: title.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        start_time: startTime || null,
        end_time: endTime || null,
        category: category || null,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'itinerary_added',
      action_detail: { title: title.trim(), day: dayNumber, category },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Create itinerary item error:', error);
    return NextResponse.json({ error: 'Failed to add itinerary item' }, { status: 500 });
  }
}
