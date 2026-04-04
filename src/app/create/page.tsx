'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import SignInButton from '@/components/auth/SignInButton';
import { createClient } from '@/lib/supabase/client';
import { generateSlug } from '@/lib/utils';

export default function CreateTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    rsvpDeadline: getDefaultDeadline(),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Please sign in with Google first.');
        setLoading(false);
        return;
      }

      const slug = generateSlug(form.title);

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          slug,
          destination: form.destination || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          rsvpDeadline: form.rsvpDeadline || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create trip');
      }

      const { trip } = await res.json();
      router.push(`/t/${trip.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="px-4 py-4 border-b border-neutral-100 bg-white">
        <PageContainer>
          <a href="/" className="text-xl font-bold text-primary">TripSync</a>
        </PageContainer>
      </header>

      <PageContainer className="py-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">Create a Trip</h1>
        <p className="text-sm text-neutral-500 mb-8">Fill in the basics. You can always change these later.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Trip Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Trip Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Goa March 2026"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Destination <span className="text-neutral-400 font-normal">(optional — can decide later via poll)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Goa"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* RSVP Deadline */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              RSVP Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={form.rsvpDeadline}
              onChange={(e) => setForm({ ...form, rsvpDeadline: e.target.value })}
              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-xs text-neutral-400 mt-1">Members must RSVP by this date</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.title}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Trip'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
          <p className="text-sm text-neutral-500 mb-3">You need to sign in to create a trip</p>
          <SignInButton redirectTo="/create" />
        </div>
      </PageContainer>
    </div>
  );
}

function getDefaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().split('T')[0];
}
