'use client';

import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import type { RsvpStatus } from '@/types';

interface MemberCardProps {
  name: string;
  avatarUrl?: string | null;
  rsvpStatus: RsvpStatus;
}

export default function MemberCard({ name, avatarUrl, rsvpStatus }: MemberCardProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar name={name} avatarUrl={avatarUrl} />
      <span className="text-sm font-medium text-neutral-900 flex-1">{name}</span>
      <StatusBadge status={rsvpStatus} />
    </div>
  );
}
