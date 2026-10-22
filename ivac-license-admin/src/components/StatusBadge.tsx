import React from 'react';
import clsx from 'clsx';
import { LicenseStatus, InstallationStatus, PaymentStatus } from '../types/index.js';

interface StatusBadgeProps {
  status: LicenseStatus | InstallationStatus | PaymentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toUpperCase();

  const styles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    ACTIVE: {
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      label: 'Active',
    },
    PENDING: {
      bg: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      label: 'Pending',
    },
    EXPIRED: {
      bg: 'bg-rose-500/10 border-rose-500/30',
      text: 'text-rose-400',
      dot: 'bg-rose-400',
      label: 'Expired',
    },
    SUSPENDED: {
      bg: 'bg-orange-500/10 border-orange-500/30',
      text: 'text-orange-400',
      dot: 'bg-orange-400',
      label: 'Suspended',
    },
    REVOKED: {
      bg: 'bg-slate-500/10 border-slate-500/30',
      text: 'text-slate-400',
      dot: 'bg-slate-400',
      label: 'Revoked',
    },
    APPROVED: {
      bg: 'bg-teal-500/10 border-teal-500/30',
      text: 'text-teal-400',
      dot: 'bg-teal-400',
      label: 'Approved',
    },
    REJECTED: {
      bg: 'bg-rose-500/10 border-rose-500/30',
      text: 'text-rose-400',
      dot: 'bg-rose-400',
      label: 'Rejected',
    },
  };

  const current = styles[normalized] || {
    bg: 'bg-slate-800 border-slate-700',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
    label: status,
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider',
        current.bg,
        current.text,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full animate-pulse', current.dot)} />
      {current.label}
    </span>
  );
};
