'use client';

type BadgeStatus = 'in' | 'out' | 'maybe' | 'pending' | 'done' | 'overdue' | 'open' | 'closed' | 'proposed' | 'voting' | 'decided' | 'booked' | 'assigned' | 'in_progress';

const config: Record<BadgeStatus, { bg: string; text: string; icon: string }> = {
  in:          { bg: 'bg-green-100', text: 'text-green-700', icon: '✓' },
  done:        { bg: 'bg-green-100', text: 'text-green-700', icon: '✓' },
  decided:     { bg: 'bg-green-100', text: 'text-green-700', icon: '✓' },
  out:         { bg: 'bg-red-100', text: 'text-red-700', icon: '✗' },
  overdue:     { bg: 'bg-red-100', text: 'text-red-700', icon: '!' },
  maybe:       { bg: 'bg-amber-100', text: 'text-amber-700', icon: '?' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '~' },
  pending:     { bg: 'bg-gray-100', text: 'text-gray-600', icon: '○' },
  closed:      { bg: 'bg-gray-100', text: 'text-gray-600', icon: '⊘' },
  open:        { bg: 'bg-blue-100', text: 'text-blue-700', icon: '●' },
  voting:      { bg: 'bg-blue-100', text: 'text-blue-700', icon: '●' },
  assigned:    { bg: 'bg-blue-100', text: 'text-blue-700', icon: '→' },
  proposed:    { bg: 'bg-gray-100', text: 'text-gray-600', icon: '○' },
  booked:      { bg: 'bg-purple-100', text: 'text-purple-700', icon: '✓' },
};

const labels: Record<BadgeStatus, string> = {
  in: 'In', out: 'Out', maybe: 'Maybe', pending: 'Pending',
  done: 'Done', overdue: 'Overdue', open: 'Open', closed: 'Closed',
  proposed: 'Proposed', voting: 'Voting', decided: 'Decided', booked: 'Booked',
  assigned: 'Assigned', in_progress: 'In Progress',
};

export default function StatusBadge({ status }: { status: BadgeStatus }) {
  const c = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span>{c.icon}</span>
      {labels[status] ?? status}
    </span>
  );
}
