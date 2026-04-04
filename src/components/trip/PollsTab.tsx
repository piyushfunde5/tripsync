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
    <div className="space-y-6">
      {/* Active Polls */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-neutral-900">Active Polls</h2>
          <button
            onClick={() => setShowCreatePoll(true)}
            className="text-sm font-medium text-primary hover:text-primary-dark"
          >
            + New Poll
          </button>
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
          <h2 className="text-base font-semibold text-neutral-900 mb-3">Closed Polls</h2>
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-neutral-900">Decision Log</h2>
          <button
            onClick={() => setShowCreateDecision(true)}
            className="text-sm font-medium text-primary hover:text-primary-dark"
          >
            + Log Decision
          </button>
        </div>

        {decisions.length > 0 ? (
          <div className="bg-white rounded-xl border border-neutral-100 shadow-sm divide-y divide-neutral-50">
            {decisions.map((d) => {
              const status = d.status as DecisionStatus;
              const canUpdate = isOrganizer || status === 'proposed';

              return (
                <div key={d.id as string} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-neutral-900 truncate">{d.title as string}</p>
                        {d.category ? (
                          <span className="text-xs text-neutral-400 shrink-0">{d.category as string}</span>
                        ) : null}
                      </div>
                      {d.decided_value ? (
                        <p className="text-xs text-neutral-500 mt-0.5">{d.decided_value as string}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={status} />
                      {canUpdate && status === 'proposed' && isOrganizer && (
                        <button
                          onClick={() => handleUpdateDecision(d.id as string, 'decided')}
                          className="text-xs text-primary hover:text-primary-dark font-medium"
                        >
                          Mark Decided
                        </button>
                      )}
                      {canUpdate && status === 'decided' && isOrganizer && (
                        <button
                          onClick={() => handleUpdateDecision(d.id as string, 'booked')}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          Mark Booked
                        </button>
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
