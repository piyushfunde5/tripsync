'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';

const CATEGORIES = [
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'stay', label: 'Stay', icon: '🏨' },
  { value: 'activity', label: 'Activity', icon: '🎯' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'other', label: 'Other', icon: '📦' },
];

interface AddExpenseModalProps {
  slug: string;
  members: Record<string, unknown>[];
  currentMemberId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddExpenseModal({ slug, members, currentMemberId, onClose, onCreated }: AddExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [paidBy, setPaidBy] = useState(currentMemberId);
  const [splitType, setSplitType] = useState<'everyone' | 'custom'>('everyone');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(members.map((m) => m.id as string));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid description and amount.');
      return;
    }

    if (splitType === 'custom' && selectedMembers.length === 0) {
      setError('Select at least one member to split among.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${slug}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: parsedAmount,
          category,
          paidBy,
          splitType,
          splitAmong: splitType === 'custom' ? selectedMembers : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add expense');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const splitCount = splitType === 'everyone' ? members.length : selectedMembers.length;
  const parsedAmount = parseFloat(amount) || 0;
  const perPerson = splitCount > 0 ? Math.round((parsedAmount / splitCount) * 100) / 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-neutral-900">Add Expense</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {/* Amount — large, prominent */}
          <div className="text-center py-2">
            <label className="block text-sm font-medium text-neutral-500 mb-1">Amount</label>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl text-neutral-400">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-4xl font-bold text-neutral-900 w-48 text-center border-none outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min="0"
                step="0.01"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for? e.g., Dinner at Britto's"
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          {/* Category — tap to select */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                    category === cat.value
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  <span className="block text-base mb-0.5">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paid by */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Paid by</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {members.map((m) => (
                <option key={m.id as string} value={m.id as string}>
                  {m.name as string}{m.id === currentMemberId ? ' (You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Split among */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Split among</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setSplitType('everyone');
                  setSelectedMembers(members.map((m) => m.id as string));
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  splitType === 'everyone'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setSplitType('custom')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  splitType === 'custom'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                Select Members
              </button>
            </div>

            {splitType === 'custom' && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {members.map((m) => {
                  const memberId = m.id as string;
                  const isSelected = selectedMembers.includes(memberId);
                  return (
                    <label
                      key={memberId}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMember(memberId)}
                        className="rounded border-neutral-300 text-primary focus:ring-primary"
                      />
                      <Avatar name={m.name as string} avatarUrl={m.avatar_url as string | null} size="sm" />
                      <span className="text-sm text-neutral-700">{m.name as string}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Per-person preview */}
            {parsedAmount > 0 && splitCount > 0 && (
              <div className="mt-2 p-2 bg-neutral-50 rounded-lg text-center">
                <span className="text-xs text-neutral-500">
                  ₹{perPerson.toLocaleString('en-IN')} per person × {splitCount} = ₹{parsedAmount.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
