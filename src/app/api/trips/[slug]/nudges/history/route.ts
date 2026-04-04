import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get email notification history
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
      .select('id, role')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const { data: notifications } = await supabase
      .from('email_notifications')
      .select('*, recipient:members!email_notifications_recipient_member_id_fkey(name)')
      .eq('trip_id', trip.id)
      .order('sent_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ notifications: notifications || [] });
  } catch (error) {
    console.error('Get notification history error:', error);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}
