'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AvatarStack from '@/components/ui/AvatarStack';
import Stamp from '@/components/ui/Stamp';
import Avatar from '@/components/ui/Avatar';

const MEMBER_COLORS = ['#d96b3f', '#0f5257', '#f2b04a', '#8a4a3a', '#4a8e92', '#b0451f'];

interface Trip {
  id: string;
  slug: string;
  title: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  members: Array<{ id: string; name: string; avatar_url?: string; rsvp_status: string; user_id?: string }>;
  myRole?: string;
}

interface DashboardClientProps {
  user: { name: string; avatarUrl?: string };
  trips: Trip[];
}

function formatDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function daysUntil(d?: string) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff;
}

function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter();
  const destParts = trip.destination?.split(',').map((s) => s.trim()).filter(Boolean) || [];
  const from = destParts.length > 1 ? destParts[0].slice(0, 3).toUpperCase() : '✈';
  const to = destParts.length > 0 ? destParts[destParts.length - 1].slice(0, 3).toUpperCase() : '?';
  const days = daysUntil(trip.start_date);
  const statusLabel = trip.status === 'ongoing' ? 'Happening now' : trip.status === 'completed' ? 'Trip complete' : days !== null && days > 0 ? `in ${days} days` : days === 0 ? 'Today!' : '';

  const members = (trip.members || []).map((m, i) => ({ ...m, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }));

  return (
    <div
      onClick={() => router.push(`/t/${trip.slug}`)}
      style={{
        position: 'relative',
        background: 'var(--ts-card)',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: 'var(--ts-shadow-sm)',
        border: '1px solid var(--ts-line)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow .15s',
      }}
    >
      {/* Ticket notches */}
      <div style={{ position: 'absolute', left: -1, top: '50%', width: 14, height: 20, marginTop: -10, borderRadius: '0 14px 14px 0', background: 'var(--ts-paper)', borderRight: '1px solid var(--ts-line)' }}/>
      <div style={{ position: 'absolute', right: -1, top: '50%', width: 14, height: 20, marginTop: -10, borderRadius: '14px 0 0 14px', background: 'var(--ts-paper)', borderLeft: '1px solid var(--ts-line)' }}/>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '.2em', fontWeight: 700, color: 'var(--ts-terra)', textTransform: 'uppercase', marginBottom: 4 }}>
            {from} → {to}
          </div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.01em', lineHeight: 1.1, color: 'var(--ts-ink)' }}>
            {trip.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ts-ink-2)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            {trip.destination && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📍 {trip.destination}
              </span>
            )}
            {(trip.start_date || trip.end_date) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📅 {formatDate(trip.start_date)}{trip.end_date ? `–${formatDate(trip.end_date)}` : ''}
              </span>
            )}
          </div>
        </div>
        <Stamp status={trip.status as any} />
      </div>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px dashed var(--ts-line-2)' }}>
        <AvatarStack members={members} size={26} max={4} />
        <div style={{ fontSize: 12, color: 'var(--ts-ink-3)' }}>{statusLabel}</div>
      </div>
    </div>
  );
}

export default function DashboardClient({ user, trips }: DashboardClientProps) {
  const router = useRouter();
  const firstName = user.name.split(' ')[0];

  const pendingActions: Array<{ emoji: string; title: string; sub: string; bg: string; fg: string }> = [];
  if (trips.some(t => t.status === 'planning')) {
    pendingActions.push({ emoji: '🗳', title: 'Polls to vote on', sub: 'Check your active trips', bg: '#faecc7', fg: '#c48a1a' });
  }
  if (trips.length > 0) {
    pendingActions.push({ emoji: '✨', title: 'Plan your next trip', sub: 'AI can help suggest', bg: '#dfeedd', fg: '#2f7a4e' });
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--ts-paper)', position: 'relative', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '12px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--ts-line)' }}>
        <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 600, fontSize: 24, letterSpacing: '-.02em', color: 'var(--ts-ink)' }}>
          Trip<span style={{ color: 'var(--ts-terra)' }}>Sync</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--ts-card)', border: '1px solid var(--ts-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ts-ink-2)', cursor: 'pointer' }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={38} color="var(--ts-terra)" />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Greeting */}
        <div style={{ padding: '16px 18px 6px' }}>
          <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 28, letterSpacing: '-.01em', color: 'var(--ts-ink)' }}>
            Hey {firstName},
          </div>
          <div style={{ fontSize: 14, color: 'var(--ts-ink-2)', marginTop: 2 }}>
            {trips.length === 0 ? "Let's plan something." : `${trips.length} trip${trips.length > 1 ? 's' : ''} in your crew.`}
          </div>
        </div>

        {/* Pending actions strip */}
        {pendingActions.length > 0 && (
          <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '10px 18px 6px' }}>
            {pendingActions.map((a, i) => (
              <div key={i} style={{ flex: '0 0 190px', background: 'var(--ts-card)', borderRadius: 14, padding: 12, border: '1px solid var(--ts-line)', boxShadow: 'var(--ts-shadow-sm)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: a.bg, color: a.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{a.emoji}</div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ts-ink)', marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ts-ink-2)' }}>{a.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* My Trips */}
        <div style={{ padding: '18px 18px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 20, color: 'var(--ts-ink)' }}>My Trips</div>
          <div style={{ fontSize: 12, color: 'var(--ts-ink-3)', fontWeight: 700 }}>{trips.length} total</div>
        </div>

        {trips.length === 0 ? (
          <div style={{ padding: '40px 22px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="180" height="110" viewBox="0 0 200 120">
              <path d="M20 90 Q 70 40 130 70 T 180 40" fill="none" stroke="var(--ts-terra)" strokeWidth="2" strokeDasharray="5 5" opacity=".5"/>
              <g transform="translate(178 40) rotate(-25)">
                <path d="M0 0 L-14 5 L-10 0 L-14 -5 Z" fill="var(--ts-terra)"/>
              </g>
              <circle cx="20" cy="90" r="4" fill="var(--ts-teal)"/>
            </svg>
            <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 22, fontWeight: 500, marginTop: 16, color: 'var(--ts-ink)' }}>Let's plan something.</div>
            <div style={{ fontSize: 13, color: 'var(--ts-ink-2)', marginTop: 6, maxWidth: 280, lineHeight: 1.5 }}>Your first trip lives here. Add a name, a date, and share the link with your crew.</div>
            <button
              onClick={() => router.push('/create')}
              style={{ marginTop: 22, padding: '12px 24px', background: 'var(--ts-terra)', color: 'white', border: 'none', borderRadius: 'var(--ts-r-pill)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}
            >
              ✈ Start a trip
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {trips.map(t => <TripCard key={t.id} trip={t} />)}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push('/create')}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 'max(24px, calc(50% - 296px))',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 22px',
          background: 'var(--ts-terra)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--ts-r-pill)',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 24px -4px rgba(217,107,63,.5)',
          fontFamily: 'var(--ts-sans)',
          zIndex: 30,
        }}
      >
        <span style={{ fontSize: 18 }}>+</span> New trip
      </button>
    </div>
  );
}
