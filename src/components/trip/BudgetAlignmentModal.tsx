'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';

interface BudgetData {
  totalMembers: number;
  submittedCount: number;
  hasSubmitted: boolean;
  currentInput: { min: number; max: number } | null;
  anonymousRanges: { min: number; max: number }[];
  sweetSpot: { min: number; max: number } | null;
  outlierCount: number;
  globalMin: number;
  globalMax: number;
}

interface BudgetAlignmentModalProps {
  slug: string;
  onClose: () => void;
  onUpdated: () => void;
}

const SLIDER_MIN = 5000;
const SLIDER_MAX = 100000;
const SLIDER_STEP = 1000;

export default function BudgetAlignmentModal({ slug, onClose, onUpdated }: BudgetAlignmentModalProps) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [budgetMin, setBudgetMin] = useState(10000);
  const [budgetMax, setBudgetMax] = useState(30000);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const fetchBudget = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${slug}/budget`);
      if (!res.ok) return;
      const budgetData: BudgetData = await res.json();
      setData(budgetData);

      if (budgetData.currentInput) {
        setBudgetMin(budgetData.currentInput.min);
        setBudgetMax(budgetData.currentInput.max);
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Failed to fetch budget:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const handleMinChange = (value: number) => {
    if (value >= budgetMax) {
      setBudgetMin(budgetMax - SLIDER_STEP);
    } else {
      setBudgetMin(value);
    }
  };

  const handleMaxChange = (value: number) => {
    if (value <= budgetMin) {
      setBudgetMax(budgetMin + SLIDER_STEP);
    } else {
      setBudgetMax(value);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${slug}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetMin, budgetMax }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit');
      }

      setSubmitted(true);
      await fetchBudget();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate slider percentage for visual positioning
  const getPercent = (value: number) => {
    return ((value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
  };

  const minPercent = getPercent(budgetMin);
  const maxPercent = getPercent(budgetMax);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-neutral-900">Budget Alignment</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">&times;</button>
        </div>

        <div className="p-4 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-neutral-400 text-sm">Loading...</div>
          ) : (
            <>
              {/* Submission progress */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  {data?.submittedCount || 0}/{data?.totalMembers || 0} members submitted
                </p>
                {submitted && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    ✓ Submitted
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="bg-neutral-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${data && data.totalMembers > 0 ? (data.submittedCount / data.totalMembers) * 100 : 0}%` }}
                />
              </div>

              {/* Budget Input Section */}
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-sm font-medium text-neutral-700 mb-1">
                  What&apos;s your comfortable budget for this trip?
                </p>
                <p className="text-xs text-neutral-400 mb-4">Including transport. Your input is anonymous.</p>

                {/* Range display */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-center">
                    <p className="text-xs text-neutral-400">Min</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(budgetMin)}</p>
                  </div>
                  <div className="text-neutral-300 text-sm">—</div>
                  <div className="text-center">
                    <p className="text-xs text-neutral-400">Max</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(budgetMax)}</p>
                  </div>
                </div>

                {/* Dual range slider */}
                <div className="relative h-10 mb-2">
                  {/* Track background */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-neutral-200 rounded-full" />

                  {/* Active range highlight */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-2 bg-primary/30 rounded-full"
                    style={{
                      left: `${minPercent}%`,
                      width: `${maxPercent - minPercent}%`,
                    }}
                  />

                  {/* Min slider */}
                  <input
                    type="range"
                    min={SLIDER_MIN}
                    max={SLIDER_MAX}
                    step={SLIDER_STEP}
                    value={budgetMin}
                    onChange={(e) => handleMinChange(parseInt(e.target.value))}
                    className="absolute top-0 w-full h-10 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                  />

                  {/* Max slider */}
                  <input
                    type="range"
                    min={SLIDER_MIN}
                    max={SLIDER_MAX}
                    step={SLIDER_STEP}
                    value={budgetMax}
                    onChange={(e) => handleMaxChange(parseInt(e.target.value))}
                    className="absolute top-0 w-full h-10 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                  />
                </div>

                {/* Scale labels */}
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>₹5K</span>
                  <span>₹25K</span>
                  <span>₹50K</span>
                  <span>₹75K</span>
                  <span>₹1L</span>
                </div>

                {error && (
                  <div className="mt-3 p-2 bg-red-50 text-red-700 rounded-lg text-xs">{error}</div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full mt-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : submitted ? 'Update Input' : 'Submit'}
                </button>
              </div>

              {/* Results Section (if anyone has submitted) */}
              {data && data.submittedCount >= 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Group Budget Alignment</h3>

                  {/* Sweet spot */}
                  {data.sweetSpot && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                      <p className="text-xs text-green-600 font-medium mb-1">💡 Sweet Spot</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(data.sweetSpot.min)} — {formatCurrency(data.sweetSpot.max)}
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">per person</p>
                    </div>
                  )}

                  {data.outlierCount > 0 && (
                    <p className="text-xs text-amber-600 text-center">
                      ⚠️ {data.outlierCount} member{data.outlierCount > 1 ? 's' : ''}&apos; range doesn&apos;t overlap with the group
                    </p>
                  )}

                  {/* Anonymous range bars */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-neutral-500 mb-2">Anonymous budget ranges:</p>
                    {data.anonymousRanges.map((range, i) => {
                      const rangeMin = data.globalMin;
                      const rangeMax = data.globalMax;
                      const scale = rangeMax - rangeMin || 1;
                      const leftPct = ((range.min - rangeMin) / scale) * 100;
                      const widthPct = ((range.max - range.min) / scale) * 100;

                      return (
                        <div key={i} className="relative h-6">
                          {/* Background track */}
                          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 bg-neutral-100 rounded-full" />

                          {/* Sweet spot overlay */}
                          {data.sweetSpot && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-3 bg-green-100 rounded-full"
                              style={{
                                left: `${((data.sweetSpot.min - rangeMin) / scale) * 100}%`,
                                width: `${((data.sweetSpot.max - data.sweetSpot.min) / scale) * 100}%`,
                              }}
                            />
                          )}

                          {/* Member range bar */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-3 bg-primary/40 rounded-full border border-primary/30"
                            style={{
                              left: `${leftPct}%`,
                              width: `${Math.max(widthPct, 2)}%`,
                            }}
                          />
                        </div>
                      );
                    })}

                    {/* Scale */}
                    <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                      <span>{formatCurrency(data.globalMin)}</span>
                      <span>{formatCurrency(data.globalMax)}</span>
                    </div>
                  </div>
                </div>
              )}

              {data && data.submittedCount < 2 && data.submittedCount > 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-neutral-400">
                    Waiting for more members to submit their budget input...
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
