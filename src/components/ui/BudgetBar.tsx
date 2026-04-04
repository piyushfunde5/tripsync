'use client';

import { formatCurrency } from '@/lib/utils';

interface BudgetBarProps {
  planned: number;
  actual: number;
  label?: string;
}

export default function BudgetBar({ planned, actual, label }: BudgetBarProps) {
  const percentage = planned > 0 ? Math.min((actual / planned) * 100, 120) : 0;
  const isOver = actual > planned;
  const isWarning = percentage >= 80 && !isOver;

  let barColor = 'bg-green-500';
  if (isOver) barColor = 'bg-red-500';
  else if (isWarning) barColor = 'bg-amber-500';

  return (
    <div>
      {label && <p className="text-xs text-neutral-500 mb-1">{label}</p>}
      <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-neutral-500">
        <span>{formatCurrency(actual)} spent</span>
        <span>{formatCurrency(planned)} planned</span>
      </div>
    </div>
  );
}
