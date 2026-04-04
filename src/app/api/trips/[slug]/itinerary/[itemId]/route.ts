import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Update an itinerary item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  try {
    const { slug, itemId } = await params;
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

    // Only organizer can edit itinerary items
    if (member.role !== 'organizer') {
      return NextResponse.json({ error: 'Only the organizer can edit itinerary items' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, location, startTime, endTime, category, dayNumber, sortOrder } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (startTime !== undefined) updateData.start_time = startTime || null;
    if (endTime !== undefined) updateData.end_time = endTime || null;
    if (category !== undefined) updateData.category = category || null;
    if (dayNumber !== undefined) updateData.day_number = dayNumber;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('itinerary_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('trip_id', trip.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('Update itinerary item error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// Delete an itinerary item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  try {
    const { slug, itemId } = await params;
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

    if (member.role !== 'organizer') {
      return NextResponse.json({ error: 'Only the organizer can delete itinerary items' }, { status: 403 });
    }

    // Get item for logging
    const { data: existing } = await supabase
      .from('itinerary_items')
      .select('title, day_number')
      .eq('id', itemId)
      .eq('trip_id', trip.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) throw deleteError;

    // Log activity
    await supabase.from('activity_log').insert({
      trip_id: trip.id,
      member_id: member.id,
      action_type: 'itinerary_removed',
      action_detail: { title: existing.title, day: existing.day_number },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete itinerary item error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
