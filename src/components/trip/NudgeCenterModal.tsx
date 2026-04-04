'use client';

import { useState, useEffect, useCallback } from 'react';
import Avatar from '@/components/ui/Avatar';
import WhatsAppShareButton from '@/components/ui/WhatsAppShareButton';

interface PendingAction {
  memberId: string;
  memberName: string;
  memberEmail: string;
  avatarUrl: string | null;
  action: string;
}

interface NudgeData {
  rsvp: { pending: PendingAction[]; count: number };
  polls: { pending: (PendingAction & { pollQuestion: string })[]; count: number; openPollCount: number };
  tasks: { overdue: (PendingAction & { taskTitle: string })[]; pending: (PendingAction & { taskTitle: string })[]; overdueCount: number; pendingCount: number };
  budget: { pending: PendingAction[]; count: number; allSubmitted: boolean };
  totalPending: number;
}

interface NudgeCenterModalProps {
  slug: string;
  tripTitle: string;
  onClose: () => void;
}

export default function NudgeCenterModal({ slug, tripTitle, onClose }: NudgeCenterModalProps) {
  const [data, setData] = useState<NudgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const tripUrl = `${appUrl}/t/${slug}`;

  const fetchNudges = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${slug}/nudges`);
      if (!res.ok) return;
      setData(await res.json());
    } catch (err) {
      console.error('Failed to fetch nudges:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchNudges();
  }, [fetchNudges]);

  const sendEmailNudge = async (type: string, memberIds: string[] | 'all') => {
    const key = typeof memberIds === 'string' ? type : `${type}-${memberIds[0]}`;
    setSending(key);
    setSendResult(null);
    try {
      const res = await fetch(`/api/trips/${slug}/nudges/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, memberIds }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setSendResult({
        message: `Email sent to ${result.sent} member${result.sent !== 1 ? 's' : ''}${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
        type: result.sent > 0 ? 'success' : 'error',
      });
    } catch (err) {
      setSendResult({
        message: err instanceof Error ? err.message : 'Failed to send',
        type: 'error',
      });
    } finally {
      setSending(null);
    }
  };

  const NudgeRow = ({ item, type }: { item: PendingAction; type: string }) => {
    const isCurrentlySending = sending === `${type}-${item.memberId}`;
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar name={item.memberName} avatarUrl={item.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="text-sm text-neutral-700 truncate">{item.memberName}</p>
            <p className="text-xs text-neutral-400 truncate">{item.action}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <WhatsAppShareButton
            message={`Hey ${item.memberName}, you have a pending action for ${tripTitle}:\n${item.action}\n\nOpen: ${tripUrl}`}
            label=""
            className="!px-2 !py-1.5 text-xs"
          />
          <button
            onClick={() => sendEmailNudge(type, [item.memberId])}
            disabled={isCurrentlySending}
            className="px-2 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {isCurrentlySending ? '...' : '✉️'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Nudge Center</h2>
            {data && (
              <p className="text-xs text-neutral-400">{data.totalPending} pending action{data.totalPending !== 1 ? 's' : ''}</p>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">&times;</button>
        </div>

        <div className="p-4 space-y-5">
          {loading ? (
            <div className="text-center py-8 text-neutral-400 text-sm">Loading...</div>
          ) : !data ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">😕</p>
              <p className="text-sm text-neutral-500 mb-3">Failed to load nudges</p>
              <button
                onClick={() => { setLoading(true); fetchNudges(); }}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                Retry
              </button>
            </div>
          ) : data.totalPending === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-sm font-medium text-neutral-700">Everyone&apos;s caught up!</p>
              <p className="text-xs text-neutral-400 mt-1">No pending actions across the trip.</p>
            </div>
          ) : (
            <>
              {/* Status result banner */}
              {sendResult && (
                <div className={`p-2.5 rounded-lg text-xs font-medium ${
                  sendResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {sendResult.message}
                </div>
              )}

              {/* Bulk actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => sendEmailNudge('trip_summary', 'all')}
                  disabled={sending === 'trip_summary'}
                  className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {sending === 'trip_summary' ? 'Sending...' : '📧 Email Trip Summary to All'}
                </button>
              </div>

              {/* RSVP Section */}
              {data.rsvp.count > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      RSVP <span className="text-neutral-400 font-normal">· {data.rsvp.count} pending</span>
                    </h3>
                    <button
                      onClick={() => sendEmailNudge('rsvp_reminder', data.rsvp.pending.map((p) => p.memberId))}
                      disabled={sending === 'rsvp_reminder'}
                      className="text-[10px] text-primary font-medium hover:text-primary-dark disabled:opacity-50"
                    >
                      {sending === 'rsvp_reminder' ? 'Sending...' : 'Email all'}
                    </button>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-3 divide-y divide-neutral-100">
                    {data.rsvp.pending.map((item) => (
                      <NudgeRow key={item.memberId} item={item} type="rsvp_reminder" />
                    ))}
                  </div>
                </div>
              )}

              {/* Polls Section */}
              {data.polls.count > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Polls <span className="text-neutral-400 font-normal">· {data.polls.count} pending vote{data.polls.count !== 1 ? 's' : ''}</span>
                    </h3>
                    <button
                      onClick={() => sendEmailNudge('poll_reminder', data.polls.pending.map((p) => p.memberId))}
                      disabled={sending === 'poll_reminder'}
                      className="text-[10px] text-primary font-medium hover:text-primary-dark disabled:opacity-50"
                    >
                      {sending === 'poll_reminder' ? 'Sending...' : 'Email all'}
                    </button>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-3 divide-y divide-neutral-100">
                    {data.polls.pending.map((item, i) => (
                      <NudgeRow key={`${item.memberId}-${i}`} item={item} type="poll_reminder" />
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              {(data.tasks.overdueCount > 0 || data.tasks.pendingCount > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Tasks
                      {data.tasks.overdueCount > 0 && (
                        <span className="text-red-500 font-normal"> · {data.tasks.overdueCount} overdue</span>
                      )}
                    </h3>
                    <button
                      onClick={() => sendEmailNudge('task_reminder', [...data.tasks.overdue, ...data.tasks.pending].map((p) => p.memberId))}
                      disabled={sending === 'task_reminder'}
                      className="text-[10px] text-primary font-medium hover:text-primary-dark disabled:opacity-50"
                    >
                      {sending === 'task_reminder' ? 'Sending...' : 'Email all'}
                    </button>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-3 divide-y divide-neutral-100">
                    {data.tasks.overdue.map((item, i) => (
                      <NudgeRow key={`overdue-${i}`} item={{ ...item, action: `🔴 ${item.action}` }} type="task_reminder" />
                    ))}
                    {data.tasks.pending.map((item, i) => (
                      <NudgeRow key={`pending-${i}`} item={item} type="task_reminder" />
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Section */}
              {data.budget.count > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Budget <span className="text-neutral-400 font-normal">· {data.budget.count} pending</span>
                    </h3>
                    <button
                      onClick={() => sendEmailNudge('budget_reminder', data.budget.pending.map((p) => p.memberId))}
                      disabled={sending === 'budget_reminder'}
                      className="text-[10px] text-primary font-medium hover:text-primary-dark disabled:opacity-50"
                    >
                      {sending === 'budget_reminder' ? 'Sending...' : 'Email all'}
                    </button>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-3 divide-y divide-neutral-100">
                    {data.budget.pending.map((item) => (
                      <NudgeRow key={item.memberId} item={item} type="budget_reminder" />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
