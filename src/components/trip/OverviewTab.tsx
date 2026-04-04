'use client';

import { useState } from 'react';
import MemberCard from '@/components/ui/MemberCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DeadlineCountdown from '@/components/ui/DeadlineCountdown';
import BudgetBar from '@/components/ui/BudgetBar';
import WhatsAppShareButton from '@/components/ui/WhatsAppShareButton';
import BudgetAlignmentModal from './BudgetAlignmentModal';
import ActivityHistoryModal from './ActivityHistoryModal';
import { formatCurrency, daysUntil } from '@/lib/utils';
import type { RsvpStatus, DecisionStatus } from '@/types';

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

export default function OverviewTab({
  trip, members, currentMember, activity, decisions, tasks, slug, isOrganizer, onRsvp, onRefresh,
}: OverviewTabProps) {
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const rsvpCounts = {
    in: members.filter((m) => m.rsvp_status === 'in').length,
    maybe: members.filter((m) => m.rsvp_status === 'maybe').length,
    out: members.filter((m) => m.rsvp_status === 'out').length,
    pending: members.filter((m) => m.rsvp_status === 'pending').length,
  };

  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const decidedDecisions = decisions.filter((d) => d.status === 'decided' || d.status === 'booked').length;
  const tripDays = trip.start_date ? daysUntil(trip.start_date as string) : null;

  const currentRsvp = currentMember.rsvp_status as RsvpStatus;
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const tripUrl = `${appUrl}/t/${slug}`;

  return (
    <div className="space-y-6">
      {/* Share Link */}
      <div className="bg-white rounded-xl p-4 border border-neutral-100 shadow-sm">
        <p className="text-sm font-medium text-neutral-700 mb-2">Share this trip</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={tripUrl}
            className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-600"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(tripUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="mt-3">
          <WhatsAppShareButton
            message={`Hey! I'm planning a trip: ${trip.title}\nTap this link to RSVP (takes 10 seconds):\n${tripUrl}\nPlease respond by ${trip.rsvp_deadline ? new Date(trip.rsvp_deadline as string).toLocaleDateString('en-IN') : 'soon'}.`}
            label="Share on WhatsApp"
            className="w-full justify-center"
          />
        </div>
      </div>

      {/* RSVP Status Board */}
      <div className="bg-white rounded-xl p-4 border border-neutral-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-neutral-900">Who&apos;s In?</h2>
          {trip.rsvp_deadline ? (
            <DeadlineCountdown deadline={trip.rsvp_deadline as string} />
          ) : null}
        </div>

        {/* RSVP buttons for current user */}
        {currentRsvp === 'pending' && (
          <div className="flex gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
            <button
              onClick={() => onRsvp('in')}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              I&apos;m In
            </button>
            <button
              onClick={() => onRsvp('maybe')}
              className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Maybe
            </button>
            <button
              onClick={() => onRsvp('out')}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Can&apos;t Make It
            </button>
          </div>
        )}

        {currentRsvp !== 'pending' && (
          <div className="flex gap-2 mb-4 p-3 bg-neutral-50 rounded-lg">
            <span className="text-sm text-neutral-500 flex items-center gap-2">
              Your RSVP: <StatusBadge status={currentRsvp} />
            </span>
            <button
              onClick={() => {
                const next = currentRsvp === 'in' ? 'maybe' : currentRsvp === 'maybe' ? 'out' : 'in';
                onRsvp(next);
              }}
              className="ml-auto text-xs text-primary hover:text-primary-dark font-medium"
            >
              Change
            </button>
          </div>
        )}

        {/* Member list */}
        <div className="divide-y divide-neutral-50">
          {members.map((m) => (
            <div key={m.id as string} className="flex items-center justify-between">
              <MemberCard
                name={m.name as string}
                avatarUrl={m.avatar_url as string | null}
                rsvpStatus={m.rsvp_status as RsvpStatus}
              />
              {isOrganizer && m.rsvp_status === 'pending' && (
                <WhatsAppShareButton
                  message={`Hey ${m.name}, the ${trip.title} RSVP closes soon. Tap to respond: ${tripUrl}`}
                  label="Nudge"
                  className="text-xs px-2 py-1"
                />
              )}
            </div>
          ))}
        </div>

        {/* Summary bar */}
        <div className="mt-3 pt-3 border-t border-neutral-100 text-sm text-neutral-500">
          {rsvpCounts.in} In, {rsvpCounts.maybe} Maybe, {rsvpCounts.pending} Pending
        </div>
      </div>

      {/* Budget Snapshot */}
      <div className="bg-white rounded-xl p-4 border border-neutral-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-neutral-900">Budget</h2>
          <button
            onClick={() => setShowBudgetModal(true)}
            className="text-sm text-primary font-medium hover:text-primary-dark transition-colors"
          >
            {trip.budget_min && trip.budget_max ? 'View Alignment' : 'Set Up'}
          </button>
        </div>
        {trip.budget_min && trip.budget_max ? (
          <>
            <p className="text-sm text-neutral-600 mb-2">
              Group budget range: {formatCurrency(trip.budget_min as number)} - {formatCurrency(trip.budget_max as number)} per person
            </p>
            <BudgetBar planned={trip.budget_max as number} actual={0} label="Planned vs Spent" />
          </>
        ) : (
          <p className="text-sm text-neutral-500">Budget not aligned yet. Tap &quot;Set Up&quot; to collect inputs.</p>
        )}
      </div>

      {showBudgetModal && (
        <BudgetAlignmentModal
          slug={slug}
          onClose={() => setShowBudgetModal(false)}
          onUpdated={() => { if (onRefresh) onRefresh(); }}
        />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 border border-neutral-100 shadow-sm text-center">
          <p className="text-xl font-bold text-neutral-900">{decidedDecisions}/{decisions.length}</p>
          <p className="text-xs text-neutral-500">Decisions</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-neutral-100 shadow-sm text-center">
          <p className="text-xl font-bold text-neutral-900">{completedTasks}/{tasks.length}</p>
          <p className="text-xs text-neutral-500">Tasks Done</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-neutral-100 shadow-sm text-center">
          <p className="text-xl font-bold text-neutral-900">{tripDays !== null ? (tripDays > 0 ? tripDays : 'Now!') : '—'}</p>
          <p className="text-xs text-neutral-500">Days Until Trip</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-4 border border-neutral-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-neutral-900">Recent Activity</h2>
          <button
            onClick={() => setShowActivityHistory(true)}
            className="text-xs text-primary font-medium hover:text-primary-dark"
          >
            View All
          </button>
        </div>
        {activity.length > 0 ? (
          <div className="space-y-2">
            {activity.slice(0, 8).map((a) => (
              <div key={a.id as string} className="flex items-start gap-2 text-sm">
                <span className="text-neutral-400 text-xs mt-0.5 shrink-0">
                  {new Date(a.created_at as string).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-neutral-600">
                  {formatActivity(a)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">No activity yet. Share the trip link to get started!</p>
        )}
      </div>

      {showActivityHistory && (
        <ActivityHistoryModal
          slug={slug}
          members={members}
          onClose={() => setShowActivityHistory(false)}
        />
      )}
    </div>
  );
}

function formatActivity(entry: Record<string, unknown>): string {
  const member = entry.member as Record<string, unknown> | null;
  const name = member?.name as string || 'Someone';
  const detail = entry.action_detail as Record<string, unknown> | null;

  switch (entry.action_type) {
    case 'trip_created': return `${name} created this trip`;
    case 'member_joined': return `${name} joined the trip`;
    case 'rsvp_changed': return `${name} RSVP'd "${detail?.to}"`;
    case 'poll_created': return `${name} created a poll: "${detail?.question || ''}"`;
    case 'poll_voted': return `${name} voted in a poll`;
    case 'task_created': return `${name} created task: "${detail?.title || ''}"`;
    case 'task_completed': return `${name} completed: ${detail?.title || 'a task'}`;
    case 'task_updated': return `${name} updated task: "${detail?.title || ''}"`;
    case 'task_deleted': return `${name} deleted task: "${detail?.title || ''}"`;
    case 'expense_added': {
      const amt = detail?.amount as number;
      return `${name} added ₹${amt?.toLocaleString('en-IN') || '?'} expense (${detail?.category || 'other'})`;
    }
    case 'expense_edited': return `${name} edited an expense`;
    case 'expense_deleted': {
      const delAmt = detail?.amount as number;
      return `${name} deleted ₹${delAmt?.toLocaleString('en-IN') || '?'} expense`;
    }
    case 'decision_created': return `${name} added decision: "${detail?.title || ''}"`;
    case 'decision_updated': return `${name} updated a decision`;
    case 'budget_submitted': return `${name} submitted their budget input`;
    case 'itinerary_added': return `${name} added "${detail?.title || ''}" to Day ${detail?.day || '?'}`;
    case 'itinerary_removed': return `${name} removed "${detail?.title || ''}" from itinerary`;
    default: return `${name} did something`;
  }
}
