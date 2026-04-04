'use client';

import { useState, useEffect, useCallback } from 'react';
import Avatar from '@/components/ui/Avatar';
import { formatCurrency } from '@/lib/utils';

type FilterType = 'all' | 'expense' | 'fund' | 'task' | 'poll' | 'member' | 'itinerary';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'fund', label: 'Fund' },
  { value: 'task', label: 'Tasks' },
  { value: 'poll', label: 'Polls' },
  { value: 'member', label: 'Members' },
  { value: 'itinerary', label: 'Itinerary' },
];

interface ActivityEntry {
  id: string;
  action_type: string;
  action_detail: Record<string, unknown> | null;
  created_at: string;
  member: { id: string; name: string; avatar_url: string | null } | null;
}

interface ActivityHistoryModalProps {
  slug: string;
  members: Record<string, unknown>[];
  onClose: () => void;
}

export default function ActivityHistoryModal({ slug, members, onClose }: ActivityHistoryModalProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [memberFilter, setMemberFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 30;

  const fetchActivity = useCallback(async (reset = false) => {
    const newOffset = reset ? 0 : offset;
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(newOffset) });
      if (filter !== 'all') params.set('type', filter);
      if (memberFilter) params.set('member_id', memberFilter);

      const res = await fetch(`/api/trips/${slug}/activity?${params}`);
      if (!res.ok) return;
      const data = await res.json();

      if (reset) {
        setActivities(data.activities);
        setOffset(0);
      } else {
        setActivities((prev) => [...prev, ...data.activities]);
      }
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setLoading(false);
    }
  }, [slug, filter, memberFilter, offset]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchActivity(true);
  }, [filter, memberFilter, slug]);

  const loadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
  };

  useEffect(() => {
    if (offset > 0) fetchActivity(false);
  }, [offset]);

  const hasMore = activities.length < total;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 shrink-0">
          <h2 className="text-lg font-bold text-neutral-900">Activity History</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 space-y-2 border-b border-neutral-50 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs text-neutral-700"
          >
            <option value="">All members</option>
            {members.map((m) => (
              <option key={m.id as string} value={m.id as string}>
                {m.name as string}
              </option>
            ))}
          </select>
        </div>

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-neutral-400 text-sm">Loading...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-neutral-500">No activity found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activities.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  className="w-full py-2 text-xs text-primary font-medium hover:text-primary-dark mt-2"
                >
                  Load more ({activities.length} / {total})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const detail = entry.action_detail;
  const hasExpandableDetail = entry.action_type === 'expense_edited' || entry.action_type === 'expense_deleted' || entry.action_type === 'expense_added';

  return (
    <div
      className={`py-2.5 border-b border-neutral-50 ${hasExpandableDetail ? 'cursor-pointer' : ''}`}
      onClick={() => hasExpandableDetail && setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 mt-0.5">
          <span className="text-sm">{getActionIcon(entry.action_type)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {entry.member && (
                <Avatar name={entry.member.name} avatarUrl={entry.member.avatar_url} size="sm" />
              )}
              <p className="text-sm text-neutral-700 leading-snug">
                {formatActivityEntry(entry)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                {formatTimestamp(entry.created_at)}
              </span>
              {hasExpandableDetail && (
                <span className="text-neutral-300 text-xs">{expanded ? '▲' : '▼'}</span>
              )}
            </div>
          </div>

          {/* Expanded detail for expense actions */}
          {expanded && detail && (
            <div className="mt-2 ml-6 p-2 bg-neutral-50 rounded-lg text-xs space-y-1">
              {entry.action_type === 'expense_added' && (
                <>
                  <p><span className="text-neutral-500">Description:</span> {detail.description as string}</p>
                  <p><span className="text-neutral-500">Amount:</span> {formatCurrency(detail.amount as number)}</p>
                  <p><span className="text-neutral-500">Category:</span> {detail.category as string}</p>
                  <p><span className="text-neutral-500">Paid by:</span> {detail.paid_by_name as string}</p>
                  <p><span className="text-neutral-500">Split among:</span> {detail.split_count as number} members</p>
                </>
              )}
              {entry.action_type === 'expense_edited' && (
                <>
                  <p className="font-medium text-neutral-600 mb-1">Changes:</p>
                  {renderDiff(detail.before as Record<string, unknown>, detail.after as Record<string, unknown>)}
                </>
              )}
              {entry.action_type === 'expense_deleted' && (
                <>
                  <p><span className="text-neutral-500">Description:</span> {detail.description as string}</p>
                  <p><span className="text-neutral-500">Amount:</span> {formatCurrency(detail.amount as number)}</p>
                  <p><span className="text-neutral-500">Category:</span> {detail.category as string}</p>
                  {detail.paid_by_name && (
                    <p><span className="text-neutral-500">Was paid by:</span> {detail.paid_by_name as string}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderDiff(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  if (!before || !after) return null;
  const fields = ['description', 'amount', 'category'];
  const changes = fields.filter((f) => {
    const b = f === 'amount' ? Number(before[f]) : before[f];
    const a = f === 'amount' ? Number(after[f]) : after[f];
    return b !== a;
  });

  if (changes.length === 0) return <p className="text-neutral-400">No visible changes</p>;

  return (
    <div className="space-y-1">
      {changes.map((field) => (
        <div key={field} className="flex items-center gap-1.5">
          <span className="text-neutral-500 capitalize">{field}:</span>
          <span className="line-through text-red-400">
            {field === 'amount' ? formatCurrency(before[field] as number) : String(before[field])}
          </span>
          <span className="text-neutral-400">→</span>
          <span className="text-green-600 font-medium">
            {field === 'amount' ? formatCurrency(after[field] as number) : String(after[field])}
          </span>
        </div>
      ))}
    </div>
  );
}

function getActionIcon(actionType: string): string {
  const icons: Record<string, string> = {
    trip_created: '🚀',
    member_joined: '👋',
    rsvp_changed: '✋',
    poll_created: '🗳️',
    poll_voted: '✅',
    poll_closed: '🔒',
    task_created: '📝',
    task_completed: '✔️',
    task_updated: '🔄',
    task_deleted: '🗑️',
    expense_added: '💸',
    expense_edited: '✏️',
    expense_deleted: '❌',
    decision_created: '📋',
    decision_updated: '📌',
    budget_submitted: '💰',
    itinerary_added: '📍',
    itinerary_removed: '🗑️',
    fund_created: '🏦',
    fund_contribution: '💵',
    fund_expense_added: '💳',
  };
  return icons[actionType] || '📌';
}

function formatActivityEntry(entry: ActivityEntry): string {
  const name = entry.member?.name || 'Someone';
  const detail = entry.action_detail;

  switch (entry.action_type) {
    case 'trip_created': return `${name} created this trip`;
    case 'member_joined': return `${name} joined the trip`;
    case 'rsvp_changed': return `${name} RSVP'd "${detail?.to}"`;
    case 'poll_created': return `${name} created poll: "${detail?.question || ''}"`;
    case 'poll_voted': return `${name} voted in a poll`;
    case 'poll_closed': return `${name} closed a poll`;
    case 'task_created': return `${name} created task: "${detail?.title || ''}"`;
    case 'task_completed': return `${name} completed: ${detail?.title || 'a task'}`;
    case 'task_updated': return `${name} updated task: "${detail?.title || ''}"`;
    case 'task_deleted': return `${name} deleted task: "${detail?.title || ''}"`;
    case 'expense_added': {
      const amt = detail?.amount as number;
      return `${name} added ${formatCurrency(amt)} expense (${detail?.category || 'other'})`;
    }
    case 'expense_edited': {
      const afterAmt = (detail?.after as Record<string, unknown>)?.amount as number;
      return `${name} edited expense → ${afterAmt ? formatCurrency(afterAmt) : ''}`;
    }
    case 'expense_deleted': {
      const delAmt = detail?.amount as number;
      return `${name} deleted ${formatCurrency(delAmt)} expense`;
    }
    case 'decision_created': return `${name} added decision: "${detail?.title || ''}"`;
    case 'decision_updated': return `${name} updated a decision`;
    case 'budget_submitted': return `${name} submitted budget input`;
    case 'itinerary_added': return `${name} added "${detail?.title || ''}" to Day ${detail?.day || '?'}`;
    case 'itinerary_removed': return `${name} removed "${detail?.title || ''}" from itinerary`;
    case 'fund_created': return `${name} created group fund (${formatCurrency(detail?.target_per_person as number)}/person)`;
    case 'fund_contribution': return `${detail?.contributor_name || name} contributed ${formatCurrency(detail?.amount as number)}`;
    case 'fund_expense_added': return `${name} logged fund expense: ${formatCurrency(detail?.amount as number)}`;
    default: return `${name} performed an action`;
  }
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}
