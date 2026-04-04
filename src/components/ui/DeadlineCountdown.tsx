'use client';

import { getDeadlineStatus } from '@/lib/utils';

const urgencyColors = {
  normal: 'text-neutral-500',
  warning: 'text-amber-600 font-medium',
  urgent: 'text-red-600 font-semibold',
  closed: 'text-neutral-400',
};

export default function DeadlineCountdown({ deadline }: { deadline: string }) {
  const { label, urgency } = getDeadlineStatus(deadline);
  return <span className={`text-sm ${urgencyColors[urgency]}`}>{label}</span>;
}
