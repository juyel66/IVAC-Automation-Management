import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  CheckCircle2,
  Clock,
  Ban,
  PauseCircle,
  CreditCard,
  Laptop,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { licenseService } from '../services/licenseService.js';
import { StatCard } from '../components/StatCard.js';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => licenseService.getStats(),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 shadow-xl">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Real-time License Authority
          </span>
          <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            System Overview & Metrics
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Live telemetry on registered browser installations, subscription lifecycle statuses, and manual payment verification requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/licenses')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all transform active:scale-98"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Generate License</span>
          </button>
        </div>
      </div>

      {/* 8 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Licenses"
          value={stats?.totalLicenses ?? 0}
          subtitle="All generated keys in database"
          icon={KeyRound}
          variant="slate"
        />

        <StatCard
          title="Active Licenses"
          value={stats?.activeLicenses ?? 0}
          subtitle="Currently authorized keys"
          icon={CheckCircle2}
          variant="emerald"
        />

        <StatCard
          title="Expiring Soon"
          value={stats?.licensesExpiringSoon ?? 0}
          subtitle="Within the next 7 days"
          icon={AlertTriangle}
          variant="amber"
          badge="Action Recommended"
        />

        <StatCard
          title="Pending Payments"
          value={stats?.pendingPayments ?? 0}
          subtitle="Awaiting manual verification"
          icon={CreditCard}
          variant={stats?.pendingPayments ? 'amber' : 'slate'}
          badge={stats?.pendingPayments ? 'Review Required' : undefined}
        />

        <StatCard
          title="Active Installations"
          value={stats?.activeInstallations ?? 0}
          subtitle="Registered extension browsers"
          icon={Laptop}
          variant="blue"
        />

        <StatCard
          title="Expired Licenses"
          value={stats?.expiredLicenses ?? 0}
          subtitle="Passed expiry timestamp"
          icon={Clock}
          variant="rose"
        />

        <StatCard
          title="Revoked Licenses"
          value={stats?.revokedLicenses ?? 0}
          subtitle="Permanently terminated"
          icon={Ban}
          variant="slate"
        />

        <StatCard
          title="Suspended Licenses"
          value={stats?.suspendedLicenses ?? 0}
          subtitle="Temporarily locked"
          icon={PauseCircle}
          variant="purple"
        />
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          onClick={() => navigate('/licenses')}
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-emerald-500/40 hover:bg-slate-900 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <KeyRound className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-sm font-bold text-white">License Keys</h3>
          <p className="text-xs text-slate-400 mt-1">
            Generate keys, modify limits, extend validity, or revoke licenses.
          </p>
        </div>

        <div
          onClick={() => navigate('/plans')}
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-purple-500/40 hover:bg-slate-900 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <CreditCard className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-sm font-bold text-white">Plans & Pricing</h3>
          <p className="text-xs text-slate-400 mt-1">
            Configure dynamic subscription durations, BDT pricing tiers, and browser limits.
          </p>
        </div>

        <div
          onClick={() => navigate('/payments')}
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-amber-500/40 hover:bg-slate-900 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <CreditCard className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-sm font-bold text-white">Payment Review</h3>
          <p className="text-xs text-slate-400 mt-1">
            Inspect customer-submitted bKash/Nagad transactions and approve or reject.
          </p>
        </div>

        <div
          onClick={() => navigate('/audit-logs')}
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-blue-500/40 hover:bg-slate-900 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-sm font-bold text-white">Security Audit</h3>
          <p className="text-xs text-slate-400 mt-1">
            Review detailed chronological records of all administrative actions and changes.
          </p>
        </div>
      </div>
    </div>
  );
};
