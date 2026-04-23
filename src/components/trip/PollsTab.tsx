'use client';

import { useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import PollCard from './PollCard';
import CreatePollModal from './CreatePollModal';
import CreateDecisionModal from './CreateDecisionModal';
import type { DecisionStatus } from '@/types';

interface PollOption {
  id: string;
  label: string;
  description: string | null;
  sort_order: number;
}

interface PollVote {
  id: string;
  option_id: string;
  member: { id: string; name: string; avatar_url: string | null } | null;
}

interface PollData {
  id: string;
  question: string;
  poll_type: string;
  deadline: string;
  status: string;
  created_by: string;
  created_at: string;
  options: PollOption[];
  votes: PollVote[];
  creator?: { name: string } | null;
}

interface PollsTabProps {
  trip: Record<string, unknown>;
  members: Record<string, unknown>[];
  currentMember: Record<string, unknown>;
  decisions: Record<string, unknown>[];
  polls: PollData[];
  slug: string;
  isOrganizer: boolean;
  onRefresh: () => void;
}

export default function PollsTab({ members, currentMember, decisions, polls, slug, isOrganizer, onRefresh }: PollsTabProps) {
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showCreateDecision, setShowCreateDecision] = useState(false);

  const currentMemberId = currentMember.id as string;
  const canClosePoll = (poll: PollData) => isOrganizer || poll.created_by === currentMemberId;

  const openPolls = polls.filter((p) => p.status === 'open');
  const closedPolls = polls.filter((p) => p.status === 'closed');

  const handlePollCreated = () => {
    setShowCreatePoll(false);
    onRefresh();
  };

  const handleDecisionCreated = () => {
    setShowCreateDecision(false);
    onRefresh();
  };

  const handleUpdateDecision = async (decisionId: string, status: string, decidedValue?: string) => {
    try {
      const res = await fetch(`/api/trips/${slug}/decisions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, status, decidedValue }),
      });
      if (!res.ok) console.error('Failed to update decision');
      onRefresh();
    } catch (err) {
      console.error('Update decision error:', err);
    }
  };

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Active Polls */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 18, color: 'var(--ts-ink)' }}>Active polls</div>
          <button onClick={() => setShowCreatePoll(true)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--ts-terra)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>+ New</button>
        </div>

        {openPolls.length > 0 ? (
          <div className="space-y-3">
            {openPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                currentMemberId={currentMemberId}
                slug={slug}
                canClose={canClosePoll(poll)}
                totalMembers={members.length}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🗳️"
            title="No active polls"
            description="Create a poll to let your group vote on destinations, dates, or activities."
            actionLabel="+ New Poll"
            onAction={() => setShowCreatePoll(true)}
          />
        )}
      </div>

      {/* Closed Polls */}
      {closedPolls.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 18, color: 'var(--ts-ink)', marginBottom: 12 }}>Past polls</div>
          <div className="space-y-3">
            {closedPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                currentMemberId={currentMemberId}
                slug={slug}
                canClose={false}
                totalMembers={members.length}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Decision Log */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 18, color: 'var(--ts-ink)' }}>Decisions</div>
          <button onClick={() => setShowCreateDecision(true)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--ts-terra)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>+ Log</button>
        </div>

        {decisions.length > 0 ? (
          <div style={{ background: 'var(--ts-card)', border: '1px solid var(--ts-line)', borderRadius: 16, boxShadow: 'var(--ts-shadow-sm)', overflow: 'hidden' }}>
            {decisions.map((d, i) => {
              const status = d.status as DecisionStatus;
              const canUpdate = isOrganizer || status === 'proposed';

              return (
                <div key={d.id as string} style={{ padding: '12px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--ts-line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: status === 'booked' || status === 'decided' ? 'var(--ts-ok-bg)' : 'var(--ts-card-2)', color: status === 'booked' || status === 'decided' ? 'var(--ts-ok)' : 'var(--ts-ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                      {status === 'booked' ? '✓' : status === 'decided' ? '✓' : '·'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--ts-ink-3)', letterSpacing: '.08em', fontWeight: 700, textTransform: 'uppercase' }}>{d.category as string || 'General'}</div>
                      <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 15, color: 'var(--ts-ink)' }}>{d.title as string}</div>
                      {!!d.decided_value && <div style={{ fontSize: 12, color: 'var(--ts-ink-2)', marginTop: 1 }}>{d.decided_value as string}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--ts-ink-3)', padding: '3px 7px', borderRadius: 999, border: '1px solid var(--ts-line-2)' }}>{status}</div>
                      {canUpdate && status === 'proposed' && isOrganizer && (
                        <button onClick={() => handleUpdateDecision(d.id as string, 'decided')} style={{ fontSize: 11, color: 'var(--ts-terra)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>Decide</button>
                      )}
                      {canUpdate && status === 'decided' && isOrganizer && (
                        <button onClick={() => handleUpdateDecision(d.id as string, 'booked')} style={{ fontSize: 11, color: 'var(--ts-ok)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>Book</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="📋"
            title="No decisions yet"
            description="Track group decisions here — from destinations to budget to activities."
            actionLabel="+ Log Decision"
            onAction={() => setShowCreateDecision(true)}
          />
        )}
      </div>

      {/* Modals */}
      {showCreatePoll && (
        <CreatePollModal slug={slug} onClose={() => setShowCreatePoll(false)} onCreated={handlePollCreated} />
      )}
      {showCreateDecision && (
        <CreateDecisionModal slug={slug} onClose={() => setShowCreateDecision(false)} onCreated={handleDecisionCreated} />
      )}
    </div>
  );
}
