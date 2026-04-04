'use client';

import { useState, useEffect, useCallback } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import Avatar from '@/components/ui/Avatar';
import WhatsAppShareButton from '@/components/ui/WhatsAppShareButton';
import AddExpenseModal from './AddExpenseModal';
import GroupFundView from './GroupFundView';
import { formatCurrency } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍽️',
  transport: '🚗',
  stay: '🏨',
  activity: '🎯',
  shopping: '🛍️',
  other: '📦',
};

interface ExpensePayer {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ExpenseSplit {
  id: string;
  member_id: string;
  share_amount: string | number;
  member: { id: string; name: string } | null;
}

interface ExpenseData {
  id: string;
  description: string;
  amount: string | number;
  category: string | null;
  paid_by: string;
  created_at: string;
  payer: ExpensePayer | null;
  splits: ExpenseSplit[];
}

interface BalanceEntry {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  balance: number;
}

interface Settlement {
  from: { id: string; name: string };
  to: { id: string; name: string };
  amount: number;
}

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
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchSettlements = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${slug}/expenses/settlement`);
      if (!res.ok) return;
      const data = await res.json();
      setSettlements(data.settlements || []);
    } catch (err) {
      console.error('Failed to fetch settlements:', err);
    }
  }, [slug]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    if (showSettlement) {
      fetchSettlements();
    }
  }, [showSettlement, fetchSettlements]);

  const handleExpenseCreated = () => {
    setShowAddExpense(false);
    fetchExpenses();
    onRefresh();
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Delete this expense?')) return;
    setDeletingExpense(expenseId);
    try {
      const res = await fetch(`/api/trips/${slug}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to delete expense:', data.error);
      }
      fetchExpenses();
      onRefresh();
    } catch (err) {
      console.error('Delete expense error:', err);
    } finally {
      setDeletingExpense(null);
    }
  };

  if (loading && mode === 'split') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-neutral-400 text-sm">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex bg-neutral-100 rounded-xl p-1">
        <button
          onClick={() => setMode('split')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === 'split'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Quick Split
        </button>
        <button
          onClick={() => setMode('fund')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === 'fund'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Group Fund
        </button>
      </div>

      {/* Group Fund Mode */}
      {mode === 'fund' && (
        <GroupFundView
          slug={slug}
          tripTitle={trip.title as string}
          members={members}
          currentMemberId={currentMemberId}
          isOrganizer={isOrganizer}
          onRefresh={onRefresh}
        />
      )}

      {/* Quick Split Mode */}
      {mode === 'split' && (
        <>
          {expenses.length === 0 && !showAddExpense ? (
            <>
              <EmptyState
                icon="💰"
                title="No expenses yet"
                description="Add expenses as they happen. Split equally or select specific members."
                actionLabel="+ Add Expense"
                onAction={() => setShowAddExpense(true)}
              />
              {showAddExpense && (
                <AddExpenseModal
                  slug={slug}
                  members={members}
                  currentMemberId={currentMemberId}
                  onClose={() => setShowAddExpense(false)}
                  onCreated={handleExpenseCreated}
                />
              )}
            </>
          ) : (
            <>
      {/* Running balance banner */}
      <div className={`rounded-xl p-4 border shadow-sm ${
        currentUserBalance > 0
          ? 'bg-green-50 border-green-200'
          : currentUserBalance < 0
          ? 'bg-red-50 border-red-200'
          : 'bg-white border-neutral-100'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Your balance</p>
            <p className={`text-xl font-bold ${
              currentUserBalance > 0 ? 'text-green-700' :
              currentUserBalance < 0 ? 'text-red-700' :
              'text-neutral-700'
            }`}>
              {currentUserBalance > 0 ? '+' : ''}{formatCurrency(currentUserBalance)}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {currentUserBalance > 0 ? 'The group owes you' :
               currentUserBalance < 0 ? 'You owe the group' :
               'All settled up!'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500 mb-0.5">Total spent</p>
            <p className="text-lg font-semibold text-neutral-700">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowBalances(!showBalances)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showBalances
                ? 'bg-primary text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Balances
          </button>
          <button
            onClick={() => setShowSettlement(!showSettlement)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showSettlement
                ? 'bg-primary text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Settle Up
          </button>
        </div>
        <button
          onClick={() => setShowAddExpense(true)}
          className="text-sm text-primary font-medium hover:text-primary-dark transition-colors"
        >
          + Add Expense
        </button>
      </div>

      {/* Balance Summary (collapsible) */}
      {showBalances && (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-3 space-y-2 animate-in">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">Balance Summary</h3>
          {balanceSummary.map((entry) => (
            <div key={entry.memberId} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Avatar name={entry.name} avatarUrl={entry.avatarUrl} size="sm" />
                <span className="text-sm text-neutral-700">
                  {entry.name}
                  {entry.memberId === currentMemberId && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium ml-1">You</span>
                  )}
                </span>
              </div>
              <span className={`text-sm font-medium ${
                entry.balance > 0 ? 'text-green-600' :
                entry.balance < 0 ? 'text-red-600' :
                'text-neutral-400'
              }`}>
                {entry.balance > 0 ? '+' : ''}{formatCurrency(entry.balance)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Settlement Section (collapsible) */}
      {showSettlement && (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-3 space-y-2 animate-in">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">Settle Up</h3>
          {settlements.length > 0 ? (
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-neutral-700">{s.from.name}</span>
                    <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="font-medium text-neutral-700">{s.to.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-primary">{formatCurrency(s.amount)}</span>
                    <WhatsAppShareButton
                      message={`Hey ${s.from.name}, you owe ${formatCurrency(s.amount)} to ${s.to.name} for the trip. Settle up! 💸\n\n${tripUrl}`}
                      label=""
                      className="!px-1.5 !py-1 text-[10px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 text-center py-3">Everyone is settled up! 🎉</p>
          )}
        </div>
      )}

      {/* Expense List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-900">
          Expenses ({expenses.length})
        </h3>
        {expenses.map((expense) => {
          const amount = parseFloat(String(expense.amount));
          const isPayer = expense.paid_by === currentMemberId;
          const canDelete = isPayer || isOrganizer;
          const isDeleting = deletingExpense === expense.id;

          return (
            <div
              key={expense.id}
              className="bg-white rounded-xl border border-neutral-100 shadow-sm p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  {/* Category icon */}
                  <span className="text-lg shrink-0 mt-0.5">
                    {CATEGORY_ICONS[expense.category || 'other'] || '📦'}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{expense.description}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {expense.payer && (
                        <>
                          <Avatar name={expense.payer.name} avatarUrl={expense.payer.avatar_url} size="sm" />
                          <span className="text-xs text-neutral-500">
                            paid by {isPayer ? 'you' : expense.payer.name}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-neutral-400">
                        Split: {expense.splits.length === members.length
                          ? 'everyone'
                          : expense.splits.map((s) => s.member?.name).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="text-sm font-bold text-neutral-900">{formatCurrency(amount)}</p>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(expense.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={isDeleting}
                      className="text-[10px] text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? '...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Add Button (mobile only) */}
      <button
        onClick={() => setShowAddExpense(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-primary-dark transition-colors z-10"
        aria-label="Add expense"
      >
        +
      </button>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <AddExpenseModal
          slug={slug}
          members={members}
          currentMemberId={currentMemberId}
          onClose={() => setShowAddExpense(false)}
          onCreated={handleExpenseCreated}
        />
      )}
            </>
          )}
        </>
      )}
    </div>
  );
}
