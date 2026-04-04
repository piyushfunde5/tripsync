'use client';

import { useState } from 'react';

interface CreatePollModalProps {
  slug: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePollModal({ slug, onClose, onCreated }: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [pollType, setPollType] = useState<'single' | 'multi'>('single');
  const [options, setOptions] = useState([{ label: '' }, { label: '' }]);
  const defaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 16);
  };

  const [deadline, setDeadline] = useState(defaultDeadline());
  const [linkDecision, setLinkDecision] = useState(false);
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionCategory, setDecisionCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => {
    setOptions([...options, { label: '' }]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, label: string) => {
    const updated = [...options];
    updated[idx] = { label };
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validOptions = options.filter((o) => o.label.trim());
    if (!question.trim() || validOptions.length < 2 || !deadline) {
      setError('Please fill in the question, at least 2 options, and a deadline.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${slug}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          pollType,
          deadline: new Date(deadline).toISOString(),
          options: validOptions.map((o) => ({ label: o.label.trim() })),
          decisionTitle: linkDecision ? (decisionTitle.trim() || question.trim()) : undefined,
          decisionCategory: linkDecision ? decisionCategory : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create poll');
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
          <h2 className="text-lg font-semibold text-neutral-900">New Poll</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Where should we stay?"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPollType('single')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  pollType === 'single'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                Single Choice
              </button>
              <button
                type="button"
                onClick={() => setPollType('multi')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  pollType === 'multi'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                Multiple Choice
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Options</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="px-2 text-neutral-400 hover:text-red-500 text-lg"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm text-primary hover:text-primary-dark font-medium"
            >
              + Add Option
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Voting Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          {/* Link to Decision */}
          <div className="border-t border-neutral-100 pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={linkDecision}
                onChange={(e) => setLinkDecision(e.target.checked)}
                className="rounded border-neutral-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-neutral-700">Track as a decision</span>
            </label>
            {linkDecision && (
              <div className="mt-3 space-y-2 pl-6">
                <input
                  type="text"
                  value={decisionTitle}
                  onChange={(e) => setDecisionTitle(e.target.value)}
                  placeholder="Decision title (defaults to question)"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <select
                  value={decisionCategory}
                  onChange={(e) => setDecisionCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Category (optional)</option>
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
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Poll'}
          </button>
        </form>
      </div>
    </div>
  );
}
