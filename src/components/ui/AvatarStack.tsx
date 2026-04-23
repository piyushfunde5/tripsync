'use client';

import Avatar from './Avatar';

interface Member {
  name: string;
  avatarUrl?: string | null;
  color?: string;
}

interface AvatarStackProps {
  members: Member[];
  size?: number;
  max?: number;
}

export default function AvatarStack({ members, size = 26, max = 4 }: AvatarStackProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - max;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((m, i) => (
        <div
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -(size * 0.28),
            border: '2px solid var(--ts-card)',
            borderRadius: '50%',
            zIndex: visible.length - i,
          }}
        >
          <Avatar name={m.name} avatarUrl={m.avatarUrl} size={size} color={m.color} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            marginLeft: -(size * 0.28),
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'var(--ts-card-2)',
            border: '2px solid var(--ts-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.round(size * 0.34),
            fontWeight: 700,
            color: 'var(--ts-ink-2)',
            zIndex: 0,
            flexShrink: 0,
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
