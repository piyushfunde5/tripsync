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
    return <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--ts-ink-3)', fontFamily: 'var(--ts-sans)' }}>Loading fund…</div>;
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

    const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1.5px solid var(--ts-line-2)', borderRadius: 10, background: 'var(--ts-card)', color: 'var(--ts-ink)', fontSize: 14, fontFamily: 'var(--ts-sans)', outline: 'none', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ts-ink-2)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'var(--ts-card)', border: '1px solid var(--ts-line)', borderRadius: 16, boxShadow: 'var(--ts-shadow-sm)', padding: '16px' }}>
          <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 18, color: 'var(--ts-ink)', marginBottom: 4 }}>Set Up Group Fund</div>
          <div style={{ fontSize: 12.5, color: 'var(--ts-ink-3)', marginBottom: 16 }}>Collect a fixed amount from everyone. The treasurer manages the pool.</div>

          {error && <div style={{ padding: '9px 13px', background: 'var(--ts-err-bg)', borderRadius: 10, fontSize: 13, color: 'var(--ts-err)', marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle as React.CSSProperties}>Target per person</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16, color: 'var(--ts-ink-2)' }}>₹</span>
                <input type="number" value={targetPerPerson} onChange={(e) => setTargetPerPerson(e.target.value)} style={{ ...inputStyle, flex: 1 }} min="0" />
              </div>
            </div>
            <div>
              <label style={labelStyle as React.CSSProperties}>Treasurer</label>
              <select value={treasurerId} onChange={(e) => setTreasurerId(e.target.value)} style={inputStyle}>
                {members.map((m) => (
                  <option key={m.id as string} value={m.id as string}>{m.name as string}{m.id === currentMemberId ? ' (You)' : ''}</option>
                ))}
              </select>
            </div>
            <button onClick={handleSetup} disabled={settingUp} style={{ width: '100%', padding: '13px', background: settingUp ? 'var(--ts-sand)' : 'var(--ts-terra)', color: settingUp ? 'var(--ts-ink-3)' : 'white', border: 'none', borderRadius: 'var(--ts-r-pill)', fontWeight: 700, fontSize: 14, cursor: settingUp ? 'not-allowed' : 'pointer', fontFamily: 'var(--ts-sans)', boxShadow: settingUp ? 'none' : '0 6px 20px -4px rgba(217,107,63,.45)' }}>
              {settingUp ? 'Setting up…' : 'Activate Group Fund'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fund = data.fund;
  const progressPct = fund.totalTarget > 0 ? Math.min((fund.totalCollected / fund.totalTarget) * 100, 100) : 0;
  const progressColor = progressPct >= 100 ? 'var(--ts-ok)' : progressPct >= 50 ? 'var(--ts-sun)' : 'var(--ts-err)';

  const inputSt: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1.5px solid var(--ts-line-2)', borderRadius: 10, background: 'var(--ts-card)', color: 'var(--ts-ink)', fontSize: 14, fontFamily: 'var(--ts-sans)', outline: 'none', boxSizing: 'border-box' };
  const cardSt: React.CSSProperties = { background: 'var(--ts-card)', border: '1px solid var(--ts-line)', borderRadius: 16, boxShadow: 'var(--ts-shadow-sm)', padding: '14px' };
  const secTitle: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: 'var(--ts-ink-2)', letterSpacing: '.08em', textTransform: 'uppercase' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div style={{ padding: '9px 13px', background: 'var(--ts-err-bg)', borderRadius: 10, fontSize: 13, color: 'var(--ts-err)' }}>{error}</div>}

      {/* Fund overview card */}
      <div style={cardSt}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 18, color: 'var(--ts-ink)' }}>Group Fund</div>
          {!fund.is_active && <span style={{ fontSize: 10, background: 'var(--ts-card-2)', color: 'var(--ts-ink-3)', padding: '2px 8px', borderRadius: 999, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Closed</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Collected', val: fund.totalCollected, color: 'var(--ts-ok)' },
            { label: 'Spent',     val: fund.totalSpent,     color: 'var(--ts-err)' },
            { label: 'Remaining', val: fund.remaining,      color: fund.remaining >= 0 ? 'var(--ts-ok)' : 'var(--ts-err)' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '10px 6px', background: 'var(--ts-card-2)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--ts-ink-3)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 16, fontWeight: 500, color }}>{formatCurrency(val)}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 6, borderRadius: 3, background: 'var(--ts-card-2)', overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: progressColor, transition: 'width .5s ease' }} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--ts-ink-3)', textAlign: 'right' }}>
          {formatCurrency(fund.totalCollected)} / {formatCurrency(fund.totalTarget)} target
        </div>

        {fund.treasurer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: 'var(--ts-ink-2)' }}>
            <Avatar name={fund.treasurer.name} avatarUrl={fund.treasurer.avatar_url} size={22} />
            <span>Treasurer: <strong>{fund.treasurer.name}</strong></span>
          </div>
        )}
      </div>

      {/* Contributions */}
      <div style={cardSt}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={secTitle}>Contributions</div>
          {canManage && fund.is_active && (
            <button onClick={() => setShowContribForm(!showContribForm)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--ts-terra)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>
              {showContribForm ? 'Cancel' : '+ Log Payment'}
            </button>
          )}
        </div>

        {showContribForm && (
          <div style={{ background: 'var(--ts-card-2)', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select value={contribMemberId} onChange={(e) => setContribMemberId(e.target.value)} style={inputSt}>
              <option value="">Select member</option>
              {members.map((m) => <option key={m.id as string} value={m.id as string}>{m.name as string}</option>)}
            </select>
            <input type="number" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} placeholder="Amount paid" style={inputSt} min="0" />
            <button onClick={handleContribution} disabled={addingContrib} style={{ padding: '10px', background: 'var(--ts-ok)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: addingContrib ? 'not-allowed' : 'pointer', fontFamily: 'var(--ts-sans)', opacity: addingContrib ? .6 : 1 }}>
              {addingContrib ? 'Logging…' : 'Log Contribution'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.memberContributions.map((mc) => {
            const statusBg = mc.status === 'paid' ? 'var(--ts-ok-bg)' : mc.status === 'partial' ? 'var(--ts-warn-bg)' : 'var(--ts-err-bg)';
            const statusFg = mc.status === 'paid' ? 'var(--ts-ok)' : mc.status === 'partial' ? 'var(--ts-warn)' : 'var(--ts-err)';
            return (
              <div key={mc.memberId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={mc.name} avatarUrl={mc.avatarUrl} size={28} />
                  <span style={{ fontSize: 13, color: 'var(--ts-ink)' }}>{mc.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ts-ink-2)' }}>{formatCurrency(mc.contributed)} / {formatCurrency(mc.target)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: statusBg, color: statusFg }}>
                    {mc.status === 'paid' ? 'Paid' : mc.status === 'partial' ? 'Partial' : 'Unpaid'}
                  </span>
                  {mc.status !== 'paid' && (
                    <WhatsAppShareButton message={`Hey ${mc.name}, your contribution for ${tripTitle} is pending. Target: ₹${mc.target.toLocaleString('en-IN')}. Please check: ${tripUrl}`} label="" className="!px-1.5 !py-1 text-[10px]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fund Expenses */}
      <div style={cardSt}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={secTitle}>Fund Expenses ({data.fundExpenses.length})</div>
          {canManage && fund.is_active && (
            <button onClick={() => setShowExpenseForm(!showExpenseForm)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--ts-terra)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>
              {showExpenseForm ? 'Cancel' : '+ Add Expense'}
            </button>
          )}
        </div>

        {showExpenseForm && (
          <div style={{ background: 'var(--ts-card-2)', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="text" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="Description" style={inputSt} />
            <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="Amount" style={inputSt} min="0" />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" onClick={() => setExpenseCategory(cat.value)} style={{ padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${expenseCategory === cat.value ? 'var(--ts-terra)' : 'var(--ts-line-2)'}`, background: expenseCategory === cat.value ? 'rgba(217,107,63,.08)' : 'var(--ts-card)', fontSize: 16, cursor: 'pointer' }}>
                  {cat.icon}
                </button>
              ))}
            </div>
            <button onClick={handleFundExpense} disabled={addingExpense} style={{ padding: '10px', background: 'var(--ts-terra)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: addingExpense ? 'not-allowed' : 'pointer', fontFamily: 'var(--ts-sans)', opacity: addingExpense ? .6 : 1 }}>
              {addingExpense ? 'Adding…' : 'Add Fund Expense'}
            </button>
          </div>
        )}

        {data.fundExpenses.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.fundExpenses.map((fe) => (
              <div key={fe.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ts-line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{EXPENSE_CATEGORIES.find((c) => c.value === fe.category)?.icon || '📦'}</span>
                  <span style={{ fontSize: 13, color: 'var(--ts-ink)' }}>{fe.description}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 15, fontWeight: 500, color: 'var(--ts-ink)' }}>{formatCurrency(parseFloat(String(fe.amount)))}</div>
                  <div style={{ fontSize: 10, color: 'var(--ts-ink-3)' }}>{new Date(fe.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12.5, color: 'var(--ts-ink-3)' }}>No expenses yet.</div>
        )}
      </div>

      {/* Close Fund */}
      {canManage && fund.is_active && (
        <button onClick={handleCloseFund} style={{ width: '100%', padding: '12px', background: 'var(--ts-card-2)', color: 'var(--ts-ink-2)', border: '1px solid var(--ts-line-2)', borderRadius: 'var(--ts-r-pill)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>
          Close Fund
        </button>
      )}

      {/* Surplus / Deficit when closed */}
      {!fund.is_active && fund.remaining !== 0 && (
        <div style={{ borderRadius: 14, padding: '14px 16px', border: `1px solid ${fund.remaining > 0 ? 'var(--ts-ok)' : 'var(--ts-err)'}30`, background: fund.remaining > 0 ? 'var(--ts-ok-bg)' : 'var(--ts-err-bg)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ts-ink)', marginBottom: 4 }}>{fund.remaining > 0 ? '💰 Surplus' : '⚠️ Deficit'}</div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 22, fontWeight: 500, color: fund.remaining > 0 ? 'var(--ts-ok)' : 'var(--ts-err)' }}>{formatCurrency(Math.abs(fund.remaining))}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ts-ink-2)', marginTop: 4 }}>
            {fund.remaining > 0 ? `₹${Math.round(fund.remaining / members.length).toLocaleString('en-IN')} to return per person` : `₹${Math.round(Math.abs(fund.remaining) / members.length).toLocaleString('en-IN')} more needed per person`}
          </div>
        </div>
      )}
    </div>
  );
}
