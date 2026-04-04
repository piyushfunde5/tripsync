'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import DeadlineCountdown from '@/components/ui/DeadlineCountdown';

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

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    poll_type: string;
    deadline: string;
    status: string;
    created_at: string;
    options: PollOption[];
    votes: PollVote[];
    creator?: { name: string } | null;
  };
  currentMemberId: string;
  slug: string;
  canClose: boolean;
  totalMembers: number;
  onRefresh: () => void;
}

export default function PollCard({ poll, currentMemberId, slug, canClose, totalMembers, onRefresh }: PollCardProps) {
  const [voting, setVoting] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const isOpen = poll.status === 'open';
  const isPastDeadline = new Date(poll.deadline) < new Date();
  const canVote = isOpen && !isPastDeadline;

  const myVotes = poll.votes.filter((v) => v.member?.id === currentMemberId);
  const myVotedOptionIds = new Set(myVotes.map((v) => v.option_id));

  // Count votes per option
  const voteCounts: Record<string, number> = {};
  const votersByOption: Record<string, { name: string; avatar_url: string | null }[]> = {};
  for (const vote of poll.votes) {
    voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
    if (vote.member) {
      if (!votersByOption[vote.option_id]) votersByOption[vote.option_id] = [];
      votersByOption[vote.option_id].push(vote.member);
    }
  }

  const totalVoters = new Set(poll.votes.map((v) => v.member?.id)).size;
  const maxVotes = Math.max(...Object.values(voteCounts), 0);

  const sortedOptions = [...(poll.options || [])].sort((a, b) => a.sort_order - b.sort_order);

  const handleVote = async (optionId: string) => {
    if (!canVote || voting) return;
    setVoting(optionId);
    try {
      const res = await fetch(`/api/trips/${slug}/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error(data.error);
      }
      onRefresh();
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setVoting(null);
    }
  };

  const handleClose = async () => {
    if (closing) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/trips/${slug}/polls/${poll.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error(data.error);
      }
      onRefresh();
    } catch (err) {
      console.error('Close failed:', err);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-neutral-900">{poll.question}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {poll.poll_type === 'multi' ? 'Multiple choice' : 'Single choice'}
              {poll.creator ? ` · by ${poll.creator.name}` : ''}
            </p>
          </div>
          <div className="shrink-0">
            {isOpen ? (
              <DeadlineCountdown deadline={poll.deadline} />
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Closed</span>
            )}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="px-4 pb-3 space-y-2">
        {sortedOptions.map((option) => {
          const count = voteCounts[option.id] || 0;
          const pct = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
          const isMyVote = myVotedOptionIds.has(option.id);
          const isWinner = !isOpen && count === maxVotes && count > 0;
          const voters = votersByOption[option.id] || [];

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!canVote || voting === option.id}
              className={`w-full text-left rounded-lg border p-3 transition-all relative overflow-hidden ${
                isMyVote
                  ? 'border-primary bg-primary/5'
                  : isWinner
                    ? 'border-green-300 bg-green-50'
                    : 'border-neutral-200 hover:border-neutral-300'
              } ${canVote ? 'cursor-pointer' : 'cursor-default'} ${voting === option.id ? 'opacity-60' : ''}`}
            >
              {/* Progress bar background */}
              {(totalVoters > 0 || !isOpen) && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${
                    isMyVote ? 'bg-primary/10' : isWinner ? 'bg-green-100' : 'bg-neutral-100'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {canVote && (
                    <span className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isMyVote ? 'border-primary bg-primary' : 'border-neutral-300'
                    }`}>
                      {isMyVote && <span className="text-white text-xs">✓</span>}
                    </span>
                  )}
                  <span className={`text-sm truncate ${isMyVote ? 'font-medium text-neutral-900' : 'text-neutral-700'}`}>
                    {option.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Voter avatars */}
                  {voters.length > 0 && (
                    <div className="flex -space-x-1.5">
                      {voters.slice(0, 4).map((v, i) => (
                        <div key={i} className="ring-2 ring-white rounded-full">
                          <Avatar name={v.name} avatarUrl={v.avatar_url} size="sm" />
                        </div>
                      ))}
                      {voters.length > 4 && (
                        <span className="text-xs text-neutral-500 ml-1">+{voters.length - 4}</span>
                      )}
                    </div>
                  )}
                  <span className={`text-xs font-medium ${isMyVote ? 'text-primary' : 'text-neutral-500'}`}>
                    {count} {count === 1 ? 'vote' : 'votes'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          {totalVoters} of {totalMembers} voted
        </p>
        {canClose && isOpen && (
          <button
            onClick={handleClose}
            disabled={closing}
            className="text-xs font-medium text-primary hover:text-primary-dark disabled:opacity-50"
          >
            {closing ? 'Closing...' : 'Close Poll'}
          </button>
        )}
      </div>
    </div>
  );
}
