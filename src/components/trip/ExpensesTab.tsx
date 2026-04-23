'use client';

import { useState, useEffect, useCallback } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import Avatar from '@/components/ui/Avatar';
import WhatsAppShareButton from '@/components/ui/WhatsAppShareButton';
import AddExpenseModal from './AddExpenseModal';
import GroupFundView from './GroupFundView';
import { formatCurrency } from '@/lib/utils';

const CATEGORY_CONFIG: Record<string, { icon: string; bg: string; fg: string }> = {
  food:      { icon: '🍽️', bg: 'rgba(242,176,74,.15)',  fg: 'var(--ts-sun-d)'  },
  transport: { icon: '🚗', bg: 'rgba(15,82,87,.10)',    fg: 'var(--ts-teal)'   },
  stay:      { icon: '🏨', bg: 'rgba(138,74,58,.10)',   fg: 'var(--ts-clay)'   },
  activity:  { icon: '🎯', bg: 'rgba(217,107,63,.10)',  fg: 'var(--ts-terra)'  },
  shopping:  { icon: '🛍️', bg: 'rgba(180,100,180,.10)', fg: '#8a4aaa'          },
  other:     { icon: '📦', bg: 'rgba(120,120,120,.08)', fg: 'var(--ts-ink-2)'  },
};
const DEFAULT_CAT = { icon: '📦', bg: 'rgba(120,120,120,.08)', fg: 'var(--ts-ink-2)' };

interface ExpensePayer { id: string; name: string; avatar_url: string | null; }
interface ExpenseSplit { id: string; member_id: string; share_amount: string | number; member: { id: string; name: string } | null; }
interface ExpenseData {
  id: string; description: string; amount: string | number; category: string | null;
  paid_by: string; created_at: string; payer: ExpensePayer | null; splits: ExpenseSplit[];
}
interface BalanceEntry { memberId: string; name: string; avatarUrl: string | null; balance: number; }
interface Settlement { from: { id: string; name: string }; to: { id: string; name: string }; amount: number; }

interface ExpensesTabProps {
  trip: Record<string, unknown>;
  members: Record<string, unknown>[];
  currentMember: Record<string, unknown>;
  slug: string;
  onRefresh: () => void;
}

export default function ExpensesTab({ trip, members, currentMember, slug, onRefresh }: ExpensesTabProps) {
  const [mode, setMode] = useState<'split' | 'fund'>('split');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<BalanceEntry[]>([]);
  const [currentUserBalance, setCurrentUserBalance] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<string | null>(null);

  const currentMemberId = currentMember.id as string;
  const isOrganizer = currentMember.role === 'organizer';
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const tripUrl = `${appUrl}/t/${slug}`;

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${slug}/expenses`);
      if (!res.ok) return;
      const data = await res.json();
      setExpenses(data.expenses || []);
      setBalanceSummary(data.balanceSummary || []);
      setCurrentUserBalance(data.currentUserBalance || 0);
      setTotalExpenses(data.totalExpenses || 0);
    } catch (err) { console.error('Failed to fetch expenses:', err); }
    finally { setLoading(false); }
  }, [slug]);

  const fetchSettlements = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${slug}/expenses/settlement`);
      if (!res.ok) return;
      const data = await res.json();
      setSettlements(data.settlements || []);
    } catch (err) { console.error('Failed to fetch settlements:', err); }
  }, [slug]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { if (showSettlement) fetchSettlements(); }, [showSettlement, fetchSettlements]);

  const handleExpenseCreated = () => { setShowAddExpense(false); fetchExpenses(); onRefresh(); };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Delete this expense?')) return;
    setDeletingExpense(expenseId);
    try {
      const res = await fetch(`/api/trips/${slug}/expenses/${expenseId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); console.error('Failed to delete:', d.error); }
      fetchExpenses(); onRefresh();
    } catch (err) { console.error('Delete expense error:', err); }
    finally { setDeletingExpense(null); }
  };

  if (loading && mode === 'split') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
        <div style={{ fontSize: 13, color: 'var(--ts-ink-3)' }}>Loading expenses…</div>
      </div>
    );
  }

  const balanceColor = currentUserBalance > 0 ? 'var(--ts-ok)' : currentUserBalance < 0 ? 'var(--ts-err)' : 'var(--ts-ink-2)';
  const balanceBg   = currentUserBalance > 0 ? 'var(--ts-ok-bg)' : currentUserBalance < 0 ? 'var(--ts-err-bg,#fff0f0)' : 'var(--ts-card-2)';

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Mode toggle */}
      <div style={{ display: 'flex', background: 'var(--ts-card-2)', borderRadius: 12, padding: 4, gap: 4 }}>
        {(['split', 'fund'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '8px 0', borderRadius: 9,
            background: mode === m ? 'var(--ts-card)' : 'transparent',
            boxShadow: mode === m ? 'var(--ts-shadow-sm)' : 'none',
            border: 'none', cursor: 'pointer',
            fontWeight: mode === m ? 700 : 500, fontSize: 13,
            color: mode === m ? 'var(--ts-ink)' : 'var(--ts-ink-2)',
            fontFamily: 'var(--ts-sans)', transition: 'all .15s',
          }}>
            {m === 'split' ? '⚡ Quick Split' : '🫙 Group Fund'}
          </button>
        ))}
      </div>

      {/* Group Fund Mode */}
      {mode === 'fund' && (
        <GroupFundView slug={slug} tripTitle={trip.title as string} members={members} currentMemberId={currentMemberId} isOrganizer={isOrganizer} onRefresh={onRefresh} />
      )}

      {/* Quick Split Mode */}
      {mode === 'split' && (
        <>
          {expenses.length === 0 ? (
            <EmptyState icon="💸" title="No expenses yet" description="Add expenses as they happen. Split equally or choose who's in." actionLabel="+ Add Expense" onAction={() => setShowAddExpense(true)} />
          ) : (
            <>
              {/* Balance banner */}
              <div style={{ background: balanceBg, border: `1px solid ${balanceColor}30`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--ts-ink-3)', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Your balance</div>
                  <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 26, fontWeight: 500, color: balanceColor, letterSpacing: '-.01em' }}>
                    {currentUserBalance > 0 ? '+' : ''}{formatCurrency(currentUserBalance)}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ts-ink-2)', marginTop: 2 }}>
                    {currentUserBalance > 0 ? 'The group owes you' : currentUserBalance < 0 ? 'You owe the group' : 'All settled up! 🎉'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--ts-ink-3)', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Total spent</div>
                  <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ts-ink)', letterSpacing: '-.01em' }}>{formatCurrency(totalExpenses)}</div>
                </div>
              </div>

              {/* Action pills */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Balances', active: showBalances, onClick: () => setShowBalances(!showBalances) },
                    { label: 'Settle Up', active: showSettlement, onClick: () => setShowSettlement(!showSettlement) },
                  ].map((pill) => (
                    <button key={pill.label} onClick={pill.onClick} style={{
                      padding: '6px 14px', borderRadius: 999,
                      border: `1.5px solid ${pill.active ? 'var(--ts-terra)' : 'var(--ts-line-2)'}`,
                      background: pill.active ? 'rgba(217,107,63,.08)' : 'var(--ts-card)',
                      color: pill.active ? 'var(--ts-terra-d)' : 'var(--ts-ink-2)',
                      fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--ts-sans)',
                    }}>
                      {pill.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowAddExpense(true)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--ts-terra)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>+ Add</button>
              </div>

              {/* Balance summary */}
              {showBalances && (
                <div style={{ background: 'var(--ts-card)', border: '1px solid var(--ts-line)', borderRadius: 14, boxShadow: 'var(--ts-shadow-sm)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--ts-line)', fontSize: 11.5, fontWeight: 700, color: 'var(--ts-ink-2)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Balance Summary</div>
                  {balanceSummary.map((entry, i) => (
                    <div key={entry.memberId} style={{ padding: '10px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--ts-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={entry.name} avatarUrl={entry.avatarUrl} size={28} />
                        <span style={{ fontSize: 13, color: 'var(--ts-ink)' }}>
                          {entry.name}
                          {entry.memberId === currentMemberId && <span style={{ fontSize: 10, background: 'rgba(217,107,63,.1)', color: 'var(--ts-terra)', padding: '2px 6px', borderRadius: 999, fontWeight: 700, marginLeft: 6 }}>You</span>}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: entry.balance > 0 ? 'var(--ts-ok)' : entry.balance < 0 ? 'var(--ts-err)' : 'var(--ts-ink-3)' }}>
                        {entry.balance > 0 ? '+' : ''}{formatCurrency(entry.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Settle up */}
              {showSettlement && (
                <div style={{ background: 'var(--ts-card)', border: '1px solid var(--ts-line)', borderRadius: 14, boxShadow: 'var(--ts-shadow-sm)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--ts-line)', fontSize: 11.5, fontWeight: 700, color: 'var(--ts-ink-2)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Settle Up</div>
                  {settlements.length > 0 ? settlements.map((s, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--ts-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ts-ink)' }}>
                        <span style={{ fontWeight: 600 }}>{s.from.name}</span>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--ts-ink-3)" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                        </svg>
                        <span style={{ fontWeight: 600 }}>{s.to.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--ts-terra)', fontSize: 13 }}>{formatCurrency(s.amount)}</span>
                        <WhatsAppShareButton
                          message={`Hey ${s.from.name}, you owe ${formatCurrency(s.amount)} to ${s.to.name} for the trip. Settle up! 💸\n\n${tripUrl}`}
                          label=""
                          className="!px-1.5 !py-1 text-[10px]"
                        />
                      </div>
                    </div>
                  )) : (
                    <div style={{ padding: '18px 14px', textAlign: 'center', fontSize: 13, color: 'var(--ts-ink-3)' }}>Everyone is settled up! 🎉</div>
                  )}
                </div>
              )}

              {/* Expense list — receipt style */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ts-ink-2)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Expenses ({expenses.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {expenses.map((expense) => {
                    const amount = parseFloat(String(expense.amount));
                    const isPayer = expense.paid_by === currentMemberId;
                    const canDelete = isPayer || isOrganizer;
                    const isDeleting = deletingExpense === expense.id;
                    const cat = CATEGORY_CONFIG[expense.category || 'other'] || DEFAULT_CAT;

                    return (
                      <div key={expense.id} style={{ background: 'var(--ts-card)', border: '1px solid var(--ts-line)', borderRadius: 14, boxShadow: 'var(--ts-shadow-sm)', padding: '11px 13px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          {/* Category pill */}
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                            {cat.icon}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ts-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expense.description}</div>
                            {expense.payer && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                                <Avatar name={expense.payer.name} avatarUrl={expense.payer.avatar_url} size={16} />
                                <span style={{ fontSize: 11, color: 'var(--ts-ink-3)' }}>paid by {isPayer ? 'you' : expense.payer.name}</span>
                              </div>
                            )}
                            <div style={{ fontSize: 10.5, color: 'var(--ts-ink-3)', marginTop: 2 }}>
                              Split: {expense.splits.length === members.length ? 'everyone' : expense.splits.map((s) => s.member?.name).filter(Boolean).join(', ')}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 16, color: 'var(--ts-ink)', letterSpacing: '-.01em' }}>{formatCurrency(amount)}</div>
                            <div style={{ fontSize: 10, color: 'var(--ts-ink-3)' }}>{new Date(expense.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
                            {canDelete && (
                              <button onClick={() => handleDelete(expense.id)} disabled={isDeleting} style={{ fontSize: 10.5, color: 'var(--ts-ink-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)', opacity: isDeleting ? .4 : 1 }}>
                                {isDeleting ? '…' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {showAddExpense && (
        <AddExpenseModal slug={slug} members={members} currentMemberId={currentMemberId} onClose={() => setShowAddExpense(false)} onCreated={handleExpenseCreated} />
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAddExpense(true)}
        style={{ position: 'fixed', bottom: 88, right: 'max(16px, calc(50% - 304px))', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'var(--ts-terra)', color: 'white', border: 'none', borderRadius: 'var(--ts-r-pill)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px -4px rgba(217,107,63,.5)', fontFamily: 'var(--ts-sans)', zIndex: 20 }}
      >
        + Add Expense
      </button>
    </div>
  );
}
