'use client';

import { useState } from 'react';

interface CreateDecisionModalProps {
  slug: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateDecisionModal({ slug, onClose, onCreated }: CreateDecisionModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('proposed');
  const [decidedValue, setDecidedValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${slug}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category: category || undefined,
          status,
          decidedValue: decidedValue.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create decision');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-neutral-900">Log Decision</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">What was decided?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Hotel booked — Taj Mahal Palace"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Select category</option>
              <option value="destination">Destination</option>
              <option value="dates">Dates</option>
              <option value="accommodation">Accommodation</option>
              <option value="transport">Transport</option>
              <option value="activity">Activity</option>
              <option value="food">Food</option>
              <option value="budget">Budget</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'proposed', label: 'Proposed', icon: '○' },
                { value: 'decided', label: 'Decided', icon: '✓' },
                { value: 'booked', label: 'Booked', icon: '✓' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    status === opt.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {(status === 'decided' || status === 'booked') && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Final Value</label>
              <input
                type="text"
                value={decidedValue}
                onChange={(e) => setDecidedValue(e.target.value)}
                placeholder="e.g., Goa, ₹15,000/person, etc."
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Decision'}
          </button>
        </form>
      </div>
    </div>
  );
}
