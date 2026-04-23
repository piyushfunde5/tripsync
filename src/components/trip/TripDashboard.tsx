'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OverviewTab from './OverviewTab';
import PollsTab from './PollsTab';
import ItineraryTab from './ItineraryTab';
import TasksTab from './TasksTab';
import ExpensesTab from './ExpensesTab';
import NudgeCenterModal from './NudgeCenterModal';
import AvatarStack from '@/components/ui/AvatarStack';

const tabs = [
  { id: 'overview',  label: 'Overview',  icon: '🏠',  svgPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'polls',     label: 'Polls',     icon: '🗳️', svgPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'itinerary', label: 'Itinerary', icon: '📍',  svgPath: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'tasks',     label: 'Tasks',     icon: '✅',  svgPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'expenses',  label: 'Expenses',  icon: '💸',  svgPath: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
] as const;

type TabId = typeof tabs[number]['id'];

interface TripDashboardProps {
  trip: Record<string, unknown>;
  members: Record<string, unknown>[];
  currentMember: Record<string, unknown>;
  activity: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  polls: Record<string, unknown>[];
  slug: string;
  onRsvp: (status: string) => void;
  onRefresh: () => void;
}

export default function TripDashboard({
  trip, members, currentMember, activity, decisions, tasks, polls, slug, onRsvp, onRefresh,
}: TripDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showNudgeCenter, setShowNudgeCenter] = useState(false);
  const isOrganizer = currentMember.role === 'organizer';

  const memberAvatars = (members as Array<{ name: string; avatar_url?: string }>).map((m, i) => ({
    name: m.name,
    avatarUrl: m.avatar_url,
    color: ['#d96b3f','#0f5257','#f2b04a','#8a4a3a','#4a8e92','#b0451f'][i % 6],
  }));

  const dest = trip.destination as string | undefined;
  const destParts = dest?.split(',').map((s) => s.trim()).filter(Boolean) || [];
  const fromCode = destParts.length > 1 ? destParts[0].slice(0, 3).toUpperCase() : '✈';
  const toCode = destParts.length > 0 ? destParts[destParts.length - 1].slice(0, 3).toUpperCase() : '?';

  const startDate = trip.start_date ? new Date(trip.start_date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
  const endDate = trip.end_date ? new Date(trip.end_date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', minHeight: '100vh', background: 'var(--ts-paper)', display: 'flex', flexDirection: 'column' }}>

      {/* Trip Top Bar */}
      <div style={{ padding: '10px 16px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ts-paper)', borderBottom: '1px solid var(--ts-line)', position: 'sticky', top: 0, zIndex: 20 }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--ts-line)', background: 'var(--ts-card)', cursor: 'pointer', color: 'var(--ts-ink-2)', flexShrink: 0 }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '.18em', fontWeight: 700, color: 'var(--ts-terra)', textTransform: 'uppercase', marginBottom: 1 }}>
            {fromCode} → {toCode}
          </div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 19, fontWeight: 500, letterSpacing: '-.01em', lineHeight: 1.1, color: 'var(--ts-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trip.title as string}
          </div>
          {(startDate || dest) && (
            <div style={{ fontSize: 11.5, color: 'var(--ts-ink-2)', marginTop: 1 }}>
              {dest}{startDate ? ` · ${startDate}${endDate ? `–${endDate}` : ''}` : ''}
            </div>
          )}
        </div>

        <AvatarStack members={memberAvatars} size={26} max={3} />

        {isOrganizer && (
          <button
            onClick={() => setShowNudgeCenter(true)}
            style={{ width: 34, height: 34, borderRadius: 10, color: 'var(--ts-ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ts-card)', border: '1px solid var(--ts-line)', cursor: 'pointer' }}
            title="Nudge Center"
          >
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
          </button>
        )}
      </div>

      {/* Desktop tab bar */}
      <div className="hidden md:flex" style={{ borderBottom: '1px solid var(--ts-line)', padding: '0 16px', gap: 2, background: 'var(--ts-paper)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--ts-terra)' : 'var(--ts-ink-2)',
              background: 'none',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--ts-terra)' : '2px solid transparent',
              cursor: 'pointer', transition: 'color .15s', fontFamily: 'var(--ts-sans)',
            }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === tab.id ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.svgPath}/>
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, paddingBottom: 80 }}>
        {activeTab === 'overview' && (
          <OverviewTab trip={trip} members={members} currentMember={currentMember} activity={activity} decisions={decisions} tasks={tasks} slug={slug} isOrganizer={isOrganizer} onRsvp={onRsvp} onRefresh={onRefresh} />
        )}
        {activeTab === 'polls' && (
          <PollsTab trip={trip} members={members} currentMember={currentMember} decisions={decisions} polls={polls as never[]} slug={slug} isOrganizer={isOrganizer} onRefresh={onRefresh} />
        )}
        {activeTab === 'itinerary' && (
          <ItineraryTab trip={trip} slug={slug} isOrganizer={isOrganizer} />
        )}
        {activeTab === 'tasks' && (
          <TasksTab trip={trip} members={members} currentMember={currentMember} tasks={tasks} slug={slug} isOrganizer={isOrganizer} onRefresh={onRefresh} />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab trip={trip} members={members} currentMember={currentMember} slug={slug} onRefresh={onRefresh} />
        )}
      </div>

      {/* Mobile bottom tab bar */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 640, background: 'var(--ts-card)', borderTop: '1px solid var(--ts-line)', zIndex: 30, display: 'flex' }} className="md:hidden">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: '8px 4px 10px', textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === tab.id ? 'var(--ts-terra)' : 'var(--ts-ink-3)', transition: 'color .15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === tab.id ? 2.5 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.svgPath}/>
            </svg>
            <span style={{ fontSize: 9.5, fontWeight: activeTab === tab.id ? 700 : 500, letterSpacing: '.04em', fontFamily: 'var(--ts-sans)' }}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {showNudgeCenter && (
        <NudgeCenterModal slug={slug} tripTitle={trip.title as string} onClose={() => setShowNudgeCenter(false)} />
      )}
    </div>
  );
}
