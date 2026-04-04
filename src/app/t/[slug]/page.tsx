'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import SignInButton from '@/components/auth/SignInButton';
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

  useEffect(() => {
    fetchTrip();
  }, [slug]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/trips/${slug}/members`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-500">Loading trip...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-neutral-900 font-medium mb-2">Trip not found</p>
          <p className="text-sm text-neutral-500">Check the link and try again.</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const trip = data.trip;

  // Not authenticated — show sign-in prompt
  if (!data.isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <PageContainer className="py-16 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">{trip.title as string}</h1>
          {trip.destination ? (
            <p className="text-neutral-500 mb-8">{String(trip.destination)}</p>
          ) : null}
          <p className="text-sm text-neutral-500 mb-6">Sign in with Google to join this trip</p>
          <SignInButton redirectTo={`/t/${slug}`} />
        </PageContainer>
      </div>
    );
  }

  // Authenticated but not a member — show join prompt
  if (!data.currentMember) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <PageContainer className="py-16 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">{trip.title as string}</h1>
          {trip.destination ? (
            <p className="text-neutral-500 mb-2">{String(trip.destination)}</p>
          ) : null}
          <p className="text-sm text-neutral-500 mb-2">
            {data.members.length} member{data.members.length !== 1 ? 's' : ''} already joined
          </p>
          <p className="text-lg text-neutral-700 mb-6 mt-8">Join this trip?</p>
          <button
            onClick={handleJoin}
            disabled={joining}
            className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join Trip'}
          </button>
        </PageContainer>
      </div>
    );
  }

  // Authenticated and a member — show full dashboard
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
