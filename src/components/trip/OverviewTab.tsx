'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Stamp from '@/components/ui/Stamp';
import WhatsAppShareButton from '@/components/ui/WhatsAppShareButton';
import BudgetAlignmentModal from './BudgetAlignmentModal';
import ActivityHistoryModal from './ActivityHistoryModal';
import { formatCurrency, daysUntil } from '@/lib/utils';
import type { RsvpStatus } from '@/types';

const MEMBER_COLORS = ['#d96b3f','#0f5257','#f2b04a','#8a4a3a','#4a8e92','#b0451f'];

interface OverviewTabProps {
  trip: Record<string, unknown>;
  members: Record<string, unknown>[];
  currentMember: Record<string, unknown>;
  activity: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  slug: string;
  isOrganizer: boolean;
  onRsvp: (status: string) => void;
  onRefresh?: () => void;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--ts-card)', border: '1px solid var(--ts-line)', borderRadius: 16, boxShadow: 'var(--ts-shadow-sm)', ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 17, color: 'var(--ts-ink)', marginBottom: 12 }}>{children}</div>;
}

export default function OverviewTab({
  trip, members, currentMember, activity, decisions, tasks, slug, isOrganizer, onRsvp, onRefresh,
}: OverviewTabProps) {
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentRsvp = currentMember.rsvp_status as RsvpStatus;
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const tripUrl = `${appUrl}/t/${slug}`;
  const tripDays = trip.start_date ? daysUntil(trip.start_date as string) : null;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const decidedDecisions = decisions.filter(d => d.status === 'decided' || d.status === 'booked').length;

  const budgetMin = trip.budget_min as number | undefined;
  const budgetMax = trip.budget_max as number | undefined;

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* RSVP Board */}
      <Card>
        <div style={{ padding: '14px 14px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <SectionTitle>Who&apos;s in?</SectionTitle>
            {!!trip.rsvp_deadline && (
              <div style={{ fontSize: 11, color: 'var(--ts-warn)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                RSVPs closing soon
              </div>
            )}
          </div>

          {/* My RSVP */}
          {currentRsvp === 'pending' ? (
            <div style={{ padding: '12px', background: 'var(--ts-info-bg)', borderRadius: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--ts-teal)', marginBottom: 10, fontWeight: 600 }}>Are you in? Let the crew know.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onRsvp('in')} style={{ flex: 1, padding: '9px', borderRadius: 10, background: 'var(--ts-ok)', color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>✓ I&apos;m In</button>
                <button onClick={() => onRsvp('maybe')} style={{ flex: 1, padding: '9px', borderRadius: 10, background: 'var(--ts-warn)', color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>~ Maybe</button>
                <button onClick={() => onRsvp('out')} style={{ flex: 1, padding: '9px', borderRadius: 10, background: 'var(--ts-card-2)', color: 'var(--ts-ink-2)', border: '1px solid var(--ts-line-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>✕ Out</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--ts-card-2)', borderRadius: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--ts-ink-2)' }}>Your RSVP:</span>
              <Stamp status={currentRsvp} size="md" />
              <button onClick={() => { const next = currentRsvp === 'in' ? 'maybe' : currentRsvp === 'maybe' ? 'out' : 'in'; onRsvp(next); }} style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ts-terra)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>Change</button>
            </div>
          )}

          {/* Member scroll */}
          <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {members.map((m, i) => (
              <div key={m.id as string} style={{ flex: '0 0 80px', textAlign: 'center', padding: '10px 6px', background: m.id === currentMember.id ? 'var(--ts-card-2)' : 'transparent', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <Avatar name={m.name as string} avatarUrl={m.avatar_url as string | null} size={40} color={MEMBER_COLORS[i % MEMBER_COLORS.length]} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ts-ink)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(m.name as string).split(' ')[0]}
                </div>
                <Stamp status={m.rsvp_status as any} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--ts-line-2)', fontSize: 11.5, color: 'var(--ts-ink-3)' }}>
            {members.filter(m => m.rsvp_status === 'in').length} in ·{' '}
            {members.filter(m => m.rsvp_status === 'maybe').length} maybe ·{' '}
            {members.filter(m => m.rsvp_status === 'pending').length} pending
          </div>
        </div>
      </Card>

      {/* Trip Details + Budget */}
      <Card>
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: budgetMin || budgetMax ? 14 : 0 }}>
            {!!trip.start_date && (
              <div>
                <div style={{ fontSize: 10.5, letterSpacing: '.12em', color: 'var(--ts-ink-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Dates</div>
                <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 15, fontWeight: 500, color: 'var(--ts-ink)' }}>
                  {new Date(trip.start_date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {trip.end_date ? ` – ${new Date(trip.end_date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: '.12em', color: 'var(--ts-ink-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Days until</div>
              <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 15, fontWeight: 500, color: 'var(--ts-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                ✈ {tripDays !== null ? (tripDays > 0 ? `${tripDays} days` : tripDays === 0 ? 'Today!' : 'Ongoing') : '—'}
              </div>
            </div>
          </div>

          {(budgetMin || budgetMax) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ts-ink-3)', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                <span>Budget per person</span>
                <span>{budgetMin ? formatCurrency(budgetMin) : '?'} – {budgetMax ? formatCurrency(budgetMax) : '?'}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--ts-card-2)', overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, var(--ts-terra), var(--ts-sun))' }}/>
              </div>
            </div>
          )}

          {!budgetMin && !budgetMax && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--ts-ink-3)' }}>Budget not aligned yet.</span>
              <button onClick={() => setShowBudgetModal(true)} style={{ fontSize: 13, color: 'var(--ts-terra)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>Set Up →</button>
            </div>
          )}
          {(budgetMin || budgetMax) && (
            <button onClick={() => setShowBudgetModal(true)} style={{ marginTop: 8, fontSize: 12, color: 'var(--ts-terra)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)', padding: 0 }}>View budget alignment →</button>
          )}
        </div>
      </Card>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Decisions', value: `${decidedDecisions}/${decisions.length}` },
          { label: 'Tasks done', value: `${completedTasks}/${tasks.length}` },
          { label: 'Days away', value: tripDays !== null ? (tripDays > 0 ? tripDays : '🎉') : '—' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--ts-card)', border: '1px solid var(--ts-line)', borderRadius: 14, padding: '12px 10px', textAlign: 'center', boxShadow: 'var(--ts-shadow-sm)' }}>
            <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ts-ink)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--ts-ink-3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Share / Invite */}
      <Card>
        <div style={{ padding: '14px' }}>
          <div style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--ts-ink-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Invite your crew</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--ts-card-2)', borderRadius: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--ts-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{tripUrl}</div>
            <button
              onClick={() => { navigator.clipboard.writeText(tripUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ fontSize: 12, fontWeight: 700, color: copied ? 'var(--ts-ok)' : 'var(--ts-terra)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)', flexShrink: 0 }}
            >
              {copied ? 'COPIED ✓' : 'COPY'}
            </button>
          </div>
          <WhatsAppShareButton
            message={`Hey! I'm planning ${trip.title as string} 🌍\nJoin here: ${tripUrl}\nRSVP takes 10 seconds — everyone on the same page.`}
            label="Share on WhatsApp"
            className="w-full justify-center"
          />
        </div>
      </Card>

      {/* Recent Activity */}
      <Card>
        <div style={{ padding: '14px 14px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionTitle>Recent activity</SectionTitle>
            <button onClick={() => setShowActivityHistory(true)} style={{ fontSize: 12, color: 'var(--ts-terra)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>View all</button>
          </div>
          {activity.length > 0 ? (
            activity.slice(0, 6).map((a, i) => (
              <div key={a.id as string} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--ts-line)' }}>
                <div style={{ flexShrink: 0 }}>
                  <Avatar name={(a.member as any)?.name || '?'} size={30} color={MEMBER_COLORS[i % MEMBER_COLORS.length]} />
                </div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: 'var(--ts-ink)' }}>{(a.member as any)?.name || 'Someone'}</span>
                  <span style={{ color: 'var(--ts-ink-2)' }}> {formatActivity(a)}</span>
                  <div style={{ fontSize: 11, color: 'var(--ts-ink-3)', marginTop: 2 }}>
                    {new Date(a.created_at as string).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ fontSize: 13, color: 'var(--ts-ink-3)', paddingBottom: 10 }}>No activity yet. Share the trip link to get started!</p>
          )}
        </div>
      </Card>

      {showBudgetModal && <BudgetAlignmentModal slug={slug} onClose={() => setShowBudgetModal(false)} onUpdated={() => { if (onRefresh) onRefresh(); }} />}
      {showActivityHistory && <ActivityHistoryModal slug={slug} members={members} onClose={() => setShowActivityHistory(false)} />}
    </div>
  );
}

function formatActivity(entry: Record<string, unknown>): string {
  const detail = entry.action_detail as Record<string, unknown> | null;
  switch (entry.action_type) {
    case 'trip_created': return 'created this trip';
    case 'member_joined': return 'joined the trip';
    case 'rsvp_changed': return `RSVP'd "${detail?.to}"`;
    case 'poll_created': return `created a poll: "${detail?.question || ''}"`;
    case 'poll_voted': return 'voted in a poll';
    case 'task_created': return `added task: "${detail?.title || ''}"`;
    case 'task_completed': return `completed: ${detail?.title || 'a task'}`;
    case 'task_updated': return `updated task: "${detail?.title || ''}"`;
    case 'task_deleted': return `deleted task: "${detail?.title || ''}"`;
    case 'expense_added': return `added ₹${(detail?.amount as number)?.toLocaleString('en-IN') || '?'} expense`;
    case 'expense_edited': return 'edited an expense';
    case 'expense_deleted': return `deleted ₹${(detail?.amount as number)?.toLocaleString('en-IN') || '?'} expense`;
    case 'decision_created': return `added decision: "${detail?.title || ''}"`;
    case 'budget_submitted': return 'submitted their budget input';
    case 'itinerary_added': return `added "${detail?.title || ''}" to Day ${detail?.day || '?'}`;
    case 'itinerary_removed': return `removed "${detail?.title || ''}" from itinerary`;
    default: return 'took an action';
  }
}
