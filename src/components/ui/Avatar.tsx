'use client';

import { getInitials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number | 'sm' | 'md' | 'lg';
  color?: string;
}

const sizeMap = { sm: 28, md: 36, lg: 48 };

export default function Avatar({ name, avatarUrl, size = 'md', color }: AvatarProps) {
  const px = typeof size === 'number' ? size : sizeMap[size];
  const fontSize = Math.round(px * 0.38);

  const bg = color || '#d96b3f';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: px, height: px, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }

  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 600,
        fontSize,
        flexShrink: 0,
        fontFamily: 'var(--ts-sans)',
      }}
    >
      {getInitials(name)}
    </div>
  );
}
