import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: members } = await supabase
    .from('members')
    .select(`
      rsvp_status, role,
      trip:trips (
        id, slug, title, destination, start_date, end_date, status,
        members (id, name, avatar_url, rsvp_status, user_id)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const trips = (members || [])
    .map((m: any) => ({ ...m.trip, myRole: m.role, myRsvp: m.rsvp_status }))
    .filter(Boolean);

  return (
    <DashboardClient
      user={{ name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Traveller', avatarUrl: user.user_metadata?.avatar_url }}
      trips={trips}
    />
  );
}
