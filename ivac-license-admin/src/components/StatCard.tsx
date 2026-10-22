import React from 'react';
import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'amber' | 'blue' | 'rose' | 'purple' | 'slate';
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'emerald',
  badge,
}) => {
  const variantStyles = {
    emerald: {
      bg: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/15 text-emerald-400',
    },
    amber: {
      bg: 'from-amber-500/10 to-yellow-500/5 border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/15 text-amber-400',
    },
    blue: {
      bg: 'from-blue-500/10 to-indigo-500/5 border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/15 text-blue-400',
    },
    rose: {
      bg: 'from-rose-500/10 to-pink-500/5 border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/15 text-rose-400',
    },
    purple: {
      bg: 'from-purple-500/10 to-violet-500/5 border-purple-500/20 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/15 text-purple-400',
    },
    slate: {
      bg: 'from-slate-800/40 to-slate-900/40 border-slate-700/40 hover:border-slate-600',
      iconBg: 'bg-slate-800 text-slate-300',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 border transition-all duration-300 hover:shadow-lg',
        style.bg
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={clsx('rounded-xl p-2.5 shadow-inner', style.iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-white font-mono">{value}</span>
        {badge && (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
            {badge}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
