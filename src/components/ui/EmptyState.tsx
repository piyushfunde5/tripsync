'use client';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
      {icon ? (
        <span style={{ fontSize: 40, marginBottom: 16, display: 'block' }}>{icon}</span>
      ) : (
        <svg width="140" height="80" viewBox="0 0 200 120" style={{ marginBottom: 16 }}>
          <path d="M20 90 Q 70 40 130 70 T 180 40" fill="none" stroke="var(--ts-terra)" strokeWidth="2" strokeDasharray="5 5" opacity=".5"/>
          <g transform="translate(178 40) rotate(-25)">
            <path d="M0 0 L-14 5 L-10 0 L-14 -5 Z" fill="var(--ts-terra)"/>
          </g>
          <circle cx="20" cy="90" r="4" fill="var(--ts-teal)"/>
        </svg>
      )}
      <h3 style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 20, margin: '0 0 6px', color: 'var(--ts-ink)' }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--ts-ink-2)', margin: '0 0 20px', maxWidth: 280, lineHeight: 1.5 }}>{description}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', background: 'var(--ts-terra)', color: 'white',
              border: 'none', borderRadius: 'var(--ts-r-pill)', fontSize: 13,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ts-sans)',
            }}
          >
            {actionLabel}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', background: 'var(--ts-card)',
              color: 'var(--ts-ink-2)', border: '1.5px solid var(--ts-line-2)',
              borderRadius: 'var(--ts-r-pill)', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--ts-sans)',
            }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
