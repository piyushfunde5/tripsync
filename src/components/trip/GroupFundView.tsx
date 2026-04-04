'use client';

import { useState, useEffect, useCallback } from 'react';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import WhatsAppShareButton from '@/components/ui/WhatsAppShareButton';
import { formatCurrency } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
  { value: 'food', icon: '🍽️' },
  { value: 'transport', icon: '🚗' },
  { value: 'stay', icon: '🏨' },
  { value: 'activity', icon: '🎯' },
  { value: 'shopping', icon: '🛍️' },
  { value: 'other', icon: '📦' },
];

interface MemberContribution {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  contributed: number;
  target: number;
  status: 'paid' | 'partial' | 'unpaid';
}

interface FundExpense {
  id: string;
  description: string;
  amount: string | number;
  category: string | null;
  created_at: string;
}

interface FundData {
  fund: {
    id: string;
    target_per_person: number;
    treasurer_id: string;
    is_active: boolean;
    totalCollected: number;
    totalSpent: number;
    remaining: number;
    totalTarget: number;
    treasurer: { id: string; name: string; avatar_url: string | null } | null;
  } | null;
  memberContributions: MemberContribution[];
  fundExpenses: FundExpense[];
  exists: boolean;
}

interface GroupFundViewProps {
  slug: string;
  tripTitle: string;
  members: Record<string, unknown>[];
  currentMemberId: string;
  isOrganizer: boolean;
  onRefresh: () => void;
}

export default function GroupFundView({ slug, tripTitle, members, currentMemberId, isOrganizer, onRefresh }: GroupFundViewProps) {
  const [data, setData] = useState<FundData | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup form
  const [targetPerPerson, setTargetPerPerson] = useState('15000');
  const [treasurerId, setTreasurerId] = useState(currentMemberId);
  const [settingUp, setSettingUp] = useState(false);

  // Contribution form
  const [showContribForm, setShowContribForm] = useState(false);
  const [contribMemberId, setContribMemberId] = useState('');
  const [contribAmount, setContribAmount] = useState('');
  const [addingContrib, setAddingContrib] = useState(false);

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('other');
  const [addingExpense, setAddingExpense] = useState(false);

  const [error, setError] = useState('');

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const tripUrl = `${appUrl}/t/${slug}`;

  const fetchFund = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${slug}/fund`);
      if (!res.ok) return;
      setData(await res.json());
    } catch (err) {
      console.error('Failed to fetch fund:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchFund();
  }, [fetchFund]);

  const isTreasurer = data?.fund?.treasurer_id === currentMemberId;
  const canManage = isTreasurer || isOrganizer;

  const handleSetup = async () => {
    setError('');
    const target = parseFloat(targetPerPerson);
    if (isNaN(target) || target <= 0) {
      setError('Enter a valid target amount.');
      return;
    }

    setSettingUp(true);
    try {
      const res = await fetch(`/api/trips/${slug}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPerPerson: target, treasurerId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      await fetchFund();
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSettingUp(false);
    }
  };

  const handleContribution = async () => {
    setError('');
    const amt = parseFloat(contribAmount);
    if (!contribMemberId || isNaN(amt) || amt <= 0) {
      setError('Select a member and enter a valid amount.');
      return;
    }
    setAddingContrib(true);
    try {
      const res = await fetch(`/api/trips/${slug}/fund/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: contribMemberId, amount: amt }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setContribAmount('');
      setContribMemberId('');
      setShowContribForm(false);
      await fetchFund();
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setAddingContrib(false);
    }
  };

  const handleFundExpense = async () => {
    setError('');
    const amt = parseFloat(expenseAmount);
    if (!expenseDesc.trim() || isNaN(amt) || amt <= 0) {
      setError('Enter a description and valid amount.');
      return;
    }
    setAddingExpense(true);
    try {
      const res = await fetch(`/api/trips/${slug}/fund/expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: expenseDesc.trim(), amount: amt, category: expenseCategory }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setExpenseDesc('');
      setExpenseAmount('');
      setExpenseCategory('other');
      setShowExpenseForm(false);
      await fetchFund();
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setAddingExpense(false);
    }
  };

  const handleCloseFund = async () => {
    if (!confirm('Close the group fund? This will finalize all balances.')) return;
    try {
      await fetch(`/api/trips/${slug}/fund`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      fetchFund();
    } catch (err) {
      console.error('Close fund error:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-neutral-400 text-sm">Loading fund...</div>;
  }

  // Setup view — no fund exists
  if (!data?.exists || !data.fund) {
    if (!isOrganizer) {
      return (
        <EmptyState
          icon="🏦"
          title="No group fund yet"
          description="The organizer can set up a group fund to collect a fixed amount from everyone."
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
          <h3 className="text-base font-semibold text-neutral-900 mb-1">Set Up Group Fund</h3>
          <p className="text-xs text-neutral-500 mb-4">
            Collect a fixed amount from everyone. The treasurer manages the pool.
          </p>

          {error && <div className="p-2 bg-red-50 text-red-700 rounded-lg text-xs mb-3">{error}</div>}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Target per person</label>
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">₹</span>
                <input
                  type="number"
                  value={targetPerPerson}
                  onChange={(e) => setTargetPerPerson(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Treasurer</label>
              <select
                value={treasurerId}
                onChange={(e) => setTreasurerId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {members.map((m) => (
                  <option key={m.id as string} value={m.id as string}>
                    {m.name as string}{m.id === currentMemberId ? ' (You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSetup}
              disabled={settingUp}
              className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {settingUp ? 'Setting up...' : 'Activate Group Fund'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fund = data.fund;
  const progressPct = fund.totalTarget > 0 ? Math.min((fund.totalCollected / fund.totalTarget) * 100, 100) : 0;

  return (
    <div className="space-y-4">
      {error && <div className="p-2 bg-red-50 text-red-700 rounded-lg text-xs">{error}</div>}

      {/* Fund Dashboard */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-neutral-900">Group Fund</h3>
          {!fund.is_active && (
            <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">Closed</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-xs text-neutral-500">Collected</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(fund.totalCollected)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-neutral-500">Spent</p>
            <p className="text-sm font-bold text-red-600">{formatCurrency(fund.totalSpent)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-neutral-500">Remaining</p>
            <p className={`text-sm font-bold ${fund.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(fund.remaining)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-neutral-100 rounded-full h-2.5 overflow-hidden mb-1">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct >= 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] text-neutral-400 text-right">
          {formatCurrency(fund.totalCollected)} / {formatCurrency(fund.totalTarget)} target
        </p>

        {fund.treasurer && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
            <Avatar name={fund.treasurer.name} avatarUrl={fund.treasurer.avatar_url} size="sm" />
            <span>Treasurer: {fund.treasurer.name}</span>
          </div>
        )}
      </div>

      {/* Contribution Tracking */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900">Contributions</h3>
          {canManage && fund.is_active && (
            <button
              onClick={() => setShowContribForm(!showContribForm)}
              className="text-xs text-primary font-medium"
            >
              {showContribForm ? 'Cancel' : '+ Log Payment'}
            </button>
          )}
        </div>

        {/* Contribution form */}
        {showContribForm && (
          <div className="bg-neutral-50 rounded-lg p-3 mb-3 space-y-2">
            <select
              value={contribMemberId}
              onChange={(e) => setContribMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
            >
              <option value="">Select member</option>
              {members.map((m) => (
                <option key={m.id as string} value={m.id as string}>{m.name as string}</option>
              ))}
            </select>
            <input
              type="number"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              placeholder="Amount paid"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              min="0"
            />
            <button
              onClick={handleContribution}
              disabled={addingContrib}
              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {addingContrib ? 'Logging...' : 'Log Contribution'}
            </button>
          </div>
        )}

        {/* Member list */}
        <div className="space-y-2">
          {data.memberContributions.map((mc) => (
            <div key={mc.memberId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={mc.name} avatarUrl={mc.avatarUrl} size="sm" />
                <span className="text-sm text-neutral-700">{mc.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600">
                  {formatCurrency(mc.contributed)} / {formatCurrency(mc.target)}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  mc.status === 'paid' ? 'bg-green-100 text-green-700' :
                  mc.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {mc.status === 'paid' ? 'Paid' : mc.status === 'partial' ? 'Partial' : 'Unpaid'}
                </span>
                {mc.status !== 'paid' && (
                  <WhatsAppShareButton
                    message={`Hey ${mc.name}, your contribution for ${tripTitle} is pending. Target: ₹${mc.target.toLocaleString('en-IN')}. Please check: ${tripUrl}`}
                    label=""
                    className="!px-1.5 !py-1 text-[10px]"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fund Expenses */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            Fund Expenses ({data.fundExpenses.length})
          </h3>
          {canManage && fund.is_active && (
            <button
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className="text-xs text-primary font-medium"
            >
              {showExpenseForm ? 'Cancel' : '+ Add Expense'}
            </button>
          )}
        </div>

        {/* Expense form */}
        {showExpenseForm && (
          <div className="bg-neutral-50 rounded-lg p-3 mb-3 space-y-2">
            <input
              type="text"
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              placeholder="Description"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
            />
            <input
              type="number"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="Amount"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              min="0"
            />
            <div className="flex gap-1.5 flex-wrap">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setExpenseCategory(cat.value)}
                  className={`text-xs px-2 py-1 rounded-lg border ${
                    expenseCategory === cat.value
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-neutral-200 text-neutral-500'
                  }`}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
            <button
              onClick={handleFundExpense}
              disabled={addingExpense}
              className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {addingExpense ? 'Adding...' : 'Add Fund Expense'}
            </button>
          </div>
        )}

        {data.fundExpenses.length > 0 ? (
          <div className="space-y-2">
            {data.fundExpenses.map((fe) => (
              <div key={fe.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {EXPENSE_CATEGORIES.find((c) => c.value === fe.category)?.icon || '📦'}
                  </span>
                  <span className="text-sm text-neutral-700">{fe.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900">
                    {formatCurrency(parseFloat(String(fe.amount)))}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(fe.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 text-center py-3">No expenses yet.</p>
        )}
      </div>

      {/* Close Fund (organizer/treasurer, when active) */}
      {canManage && fund.is_active && (
        <button
          onClick={handleCloseFund}
          className="w-full py-2.5 bg-neutral-100 text-neutral-600 rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors"
        >
          Close Fund
        </button>
      )}

      {/* Settlement summary when closed */}
      {!fund.is_active && fund.remaining !== 0 && (
        <div className={`rounded-xl p-4 border shadow-sm ${
          fund.remaining > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <p className="text-sm font-medium text-neutral-900 mb-1">
            {fund.remaining > 0 ? '💰 Surplus' : '⚠️ Deficit'}
          </p>
          <p className={`text-lg font-bold ${fund.remaining > 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(Math.abs(fund.remaining))}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {fund.remaining > 0
              ? `₹${Math.round(fund.remaining / members.length).toLocaleString('en-IN')} to return per person`
              : `₹${Math.round(Math.abs(fund.remaining) / members.length).toLocaleString('en-IN')} more needed per person`}
          </p>
        </div>
      )}
    </div>
  );
}
