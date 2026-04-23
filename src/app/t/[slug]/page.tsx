'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import TripDashboard from '@/components/trip/TripDashboard';

interface TripData {
  trip: Record<string, unknown>;
  members: Record<string, unknown>[];
  currentMember: Record<string, unknown> | null;
  activity: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  polls: Record<string, unknown>[];
  isAuthenticated: boolean;
}

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [data, setData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const fetchTrip = async () => {
    try {
      const res = await fetch(`/api/trips/${slug}`);
      if (!res.ok) throw new Error('Trip not found');
      const tripData = await res.json();
      setData(tripData);
    } catch {
      setError('Trip not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrip(); }, [slug]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/trips/${slug}/members`, { method: 'POST' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      await fetchTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const handleRsvp = async (status: string) => {
    try {
      const previousStatus = (data?.currentMember as Record<string, unknown>)?.rsvp_status;
      const res = await fetch(`/api/trips/${slug}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvpStatus: status, previousStatus }),
      });
      if (!res.ok) throw new Error('Failed to update RSVP');
      await fetchTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update RSVP');
    }
  };

  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/t/${slug}` },
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ts-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--ts-ink-3)', fontFamily: 'var(--ts-sans)' }}>Loading trip…</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ts-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✈️</div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ts-ink)', marginBottom: 6 }}>Trip not found</div>
          <div style={{ fontSize: 13, color: 'var(--ts-ink-3)', marginBottom: 20 }}>Check the link and try again.</div>
          <button onClick={() => router.push('/')} style={{ padding: '10px 22px', background: 'var(--ts-terra)', color: 'white', border: 'none', borderRadius: 'var(--ts-r-pill)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>Go home</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const trip = data.trip;

  // Not authenticated — sign in to join
  if (!data.isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ts-paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
          {/* Boarding pass mini preview */}
          <div style={{ background: 'linear-gradient(135deg, #fffaf0, #fbecd3)', borderRadius: 16, padding: '20px 24px', boxShadow: 'var(--ts-shadow-lg)', marginBottom: 28, border: '1px solid var(--ts-line)' }}>
            <div style={{ fontSize: 10, letterSpacing: '.18em', fontWeight: 700, color: 'var(--ts-terra)', textTransform: 'uppercase', marginBottom: 6 }}>You&apos;re invited</div>
            <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 26, fontWeight: 500, color: 'var(--ts-ink)', letterSpacing: '-.01em' }}>{trip.title as string}</div>
            {!!trip.destination && <div style={{ fontSize: 13, color: 'var(--ts-ink-2)', marginTop: 4 }}>📍 {trip.destination as string}</div>}
            <div style={{ fontSize: 12, color: 'var(--ts-ink-3)', marginTop: 4 }}>{data.members.length} member{data.members.length !== 1 ? 's' : ''} already in</div>
          </div>

          <div style={{ fontSize: 14, color: 'var(--ts-ink-2)', marginBottom: 18 }}>Sign in to join this trip</div>

          <button
            onClick={handleSignIn}
            style={{ width: '100%', height: 50, borderRadius: 12, background: 'white', border: '1.5px solid var(--ts-line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 600, fontSize: 15, color: '#3c4043', cursor: 'pointer', fontFamily: 'var(--ts-sans)', boxShadow: 'var(--ts-shadow-sm)' }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.8-6.8C35.6 2.6 30.1 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.9 6.1C12.3 13.7 17.7 9.5 24 9.5z"/>
              <path fill="#34A853" d="M46.6 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.5 3-2.2 5.5-4.8 7.2l7.5 5.8c4.4-4 7.2-10 7.2-17.3z"/>
              <path fill="#4A90E2" d="M10.4 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.5 10.7l7.9-6.1z"/>
              <path fill="#FBBC05" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.2-8.4 2.2-6.3 0-11.7-4.2-13.6-10l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  // Authenticated but not a member — join prompt
  if (!data.currentMember) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ts-paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg, #fffaf0, #fbecd3)', borderRadius: 16, padding: '20px 24px', boxShadow: 'var(--ts-shadow-lg)', marginBottom: 28, border: '1px solid var(--ts-line)' }}>
            <div style={{ fontSize: 10, letterSpacing: '.18em', fontWeight: 700, color: 'var(--ts-terra)', textTransform: 'uppercase', marginBottom: 6 }}>You&apos;re invited</div>
            <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 26, fontWeight: 500, color: 'var(--ts-ink)', letterSpacing: '-.01em' }}>{trip.title as string}</div>
            {!!trip.destination && <div style={{ fontSize: 13, color: 'var(--ts-ink-2)', marginTop: 4 }}>📍 {trip.destination as string}</div>}
            <div style={{ fontSize: 12, color: 'var(--ts-ink-3)', marginTop: 4 }}>{data.members.length} member{data.members.length !== 1 ? 's' : ''} already in</div>
          </div>

          {error && <div style={{ padding: '10px 14px', background: 'var(--ts-err-bg)', borderRadius: 10, fontSize: 13, color: 'var(--ts-err)', marginBottom: 14 }}>{error}</div>}

          <button
            onClick={handleJoin}
            disabled={joining}
            style={{ width: '100%', padding: '14px', background: joining ? 'var(--ts-sand)' : 'var(--ts-terra)', color: joining ? 'var(--ts-ink-3)' : 'white', border: 'none', borderRadius: 'var(--ts-r-pill)', fontSize: 15, fontWeight: 700, cursor: joining ? 'not-allowed' : 'pointer', fontFamily: 'var(--ts-sans)', boxShadow: joining ? 'none' : '0 6px 20px -4px rgba(217,107,63,.45)' }}
          >
            {joining ? 'Joining…' : "✈ I'm joining this trip"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <TripDashboard
      trip={trip}
      members={data.members}
      currentMember={data.currentMember}
      activity={data.activity}
      decisions={data.decisions}
      tasks={data.tasks}
      polls={data.polls}
      slug={slug}
      onRsvp={handleRsvp}
      onRefresh={fetchTrip}
    />
  );
}
