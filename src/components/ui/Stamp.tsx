'use client';

type StampStatus = 'in' | 'maybe' | 'out' | 'pending' | 'planning' | 'ongoing' | 'completed';

const STAMP_CONFIG: Record<StampStatus, { label: string; color: string; bg: string }> = {
  in:        { label: 'In ✓',    color: 'var(--ts-in)',     bg: 'var(--ts-in-bg)' },
  maybe:     { label: 'Maybe',   color: 'var(--ts-maybe)',  bg: 'var(--ts-maybe-bg)' },
  out:       { label: 'Out',     color: 'var(--ts-out)',    bg: 'var(--ts-out-bg)' },
  pending:   { label: 'Pending', color: 'var(--ts-ink-3)',  bg: 'var(--ts-card-2)' },
  planning:  { label: 'Planning',color: 'var(--ts-terra)',  bg: 'rgba(217,107,63,.1)' },
  ongoing:   { label: 'Live ✈',  color: 'var(--ts-teal)',   bg: 'var(--ts-info-bg)' },
  completed: { label: 'Done',    color: 'var(--ts-out)',    bg: 'var(--ts-out-bg)' },
};

interface StampProps {
  status: StampStatus;
  rotate?: number;
  size?: 'sm' | 'md';
}

export default function Stamp({ status, rotate, size = 'sm' }: StampProps) {
  const cfg = STAMP_CONFIG[status] || STAMP_CONFIG.pending;
  const deg = rotate ?? (status === 'in' ? -4 : status === 'out' ? 6 : -3);
  const fontSize = size === 'md' ? 11 : 9;
  const padding = size === 'md' ? '4px 10px' : '3px 7px';

  return (
    <div
      style={{
        display: 'inline-block',
        border: `1.5px dashed ${cfg.color}`,
        color: cfg.color,
        background: cfg.bg,
        padding,
        borderRadius: 4,
        fontSize,
        fontWeight: 700,
        letterSpacing: '.15em',
        textTransform: 'uppercase',
        transform: `rotate(${deg}deg)`,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--ts-sans)',
      }}
    >
      {cfg.label}
    </div>
  );
}
