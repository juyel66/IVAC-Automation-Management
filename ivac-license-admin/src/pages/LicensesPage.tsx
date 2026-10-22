import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Copy,
  Check,
  Eye,
  RefreshCw,
  AlertOctagon,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { licenseService, CreateLicenseParams } from '../services/licenseService.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { Modal } from '../components/Modal.js';
import { License } from '../types/index.js';

export const LicensesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyGenerated, setNewKeyGenerated] = useState<{
    plainKey: string;
    license: License;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  // Renewal Modal
  const [renewTarget, setRenewTarget] = useState<License | null>(null);
  const [renewDays, setRenewDays] = useState(30);
  const [renewNote, setRenewNote] = useState('');

  // Revoke Modal
  const [revokeTarget, setRevokeTarget] = useState<License | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Create Form State
  const [formData, setFormData] = useState<CreateLicenseParams>({
    validityDays: 30,
    maxInstallations: 1,
    customerName: '',
    customerContact: '',
    adminNotes: '',
  });

  // Query
  const { data, isLoading } = useQuery({
    queryKey: ['licenses', page, statusFilter, debouncedSearch],
    queryFn: () =>
      licenseService.listLicenses({
        page,
        limit: 10,
        status: statusFilter,
        search: debouncedSearch,
      }),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (params: CreateLicenseParams) => licenseService.createLicense(params),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsCreateOpen(false);
      setNewKeyGenerated({
        plainKey: result.plainLicenseKey,
        license: result.license,
      });
      setFormData({
        validityDays: 30,
        maxInstallations: 1,
        customerName: '',
        customerContact: '',
        adminNotes: '',
      });
    },
  });

  // Renew Mutation
  const renewMutation = useMutation({
    mutationFn: () =>
      licenseService.renewLicense(renewTarget!.id, renewDays, renewNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setRenewTarget(null);
      setRenewNote('');
    },
  });

  // Revoke Mutation
  const revokeMutation = useMutation({
    mutationFn: () =>
      licenseService.revokeLicense(revokeTarget!.id, revokeReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setRevokeTarget(null);
      setRevokeReason('');
    },
  });

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">License Authority</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure validity duration, manage browser device quotas, and inspect entitlements.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all transform active:scale-98"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Generate New License</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by License ID, Customer, Contact, or Masked Key..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'ACTIVE', 'PENDING', 'EXPIRED', 'SUSPENDED', 'REVOKED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Licenses Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">License Key</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Validity</th>
                <th className="px-5 py-3.5">Activated / Expiry</th>
                <th className="px-5 py-3.5">Installations</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading licenses...
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No license records found matching the filter.
                  </td>
                </tr>
              ) : (
                data?.items.map((lic) => (
                  <tr key={lic.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {lic.plainKey || lic.keyMasked}
                        </span>
                        {lic.plainKey && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(lic.plainKey!);
                              setCopiedRowId(lic.id);
                              setTimeout(() => setCopiedRowId(null), 2000);
                            }}
                            title="Copy Full License Key"
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                          >
                            {copiedRowId === lic.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3]" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {lic.id.slice(0, 8)}...</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <StatusBadge status={lic.status} size="sm" />
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="text-slate-200 font-semibold">
                        {lic.customerName || 'Unassigned'}
                      </div>
                      <div className="text-[11px] text-slate-400">{lic.customerContact || '—'}</div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-300">
                      {lic.validityDays} Days
                    </td>

                    <td className="px-5 py-3.5">
                      {lic.activatedAt ? (
                        <>
                          <div className="text-slate-300 text-[11px]">
                            {new Date(lic.activatedAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Exp: {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : '—'}
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] text-amber-400/80 italic">Not Yet Activated</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px]">
                        <span className="text-emerald-400 font-bold">{lic.activeInstallationsCount}</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-slate-300">{lic.maxInstallations}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/licenses/${lic.id}`)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setRenewTarget(lic);
                            setRenewDays(lic.validityDays || 30);
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-colors"
                        >
                          Renew
                        </button>

                        {lic.status !== 'REVOKED' && (
                          <button
                            onClick={() => setRevokeTarget(lic)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                            title="Revoke License"
                          >
                            <AlertOctagon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {data && data.pagination.totalPages > 1 && (
          <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing page <span className="font-bold text-white">{data.pagination.page}</span> of{' '}
              <span className="font-bold text-white">{data.pagination.totalPages}</span> ({data.pagination.total} total)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: GENERATE LICENSE FORM */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Generate New License Key"
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4 text-xs"
        >
          {/* Validity Duration Preset Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Validity Duration (Days)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[7, 15, 30, 90].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setFormData({ ...formData, validityDays: d })}
                  className={`py-1.5 rounded-lg font-bold border transition-all ${
                    formData.validityDays === d
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[180, 365].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setFormData({ ...formData, validityDays: d })}
                  className={`py-1.5 rounded-lg font-bold border transition-all ${
                    formData.validityDays === d
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {d} Days
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={3650}
                value={formData.validityDays}
                onChange={(e) => setFormData({ ...formData, validityDays: parseInt(e.target.value, 10) || 30 })}
                placeholder="Custom"
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              * Note: The clock starts ticking only when user activates key for the first time.
            </p>
          </div>

          {/* Max Browser Quota Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Browser / Installation Limit
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 5].map((limit) => (
                <button
                  type="button"
                  key={limit}
                  onClick={() => setFormData({ ...formData, maxInstallations: limit })}
                  className={`py-1.5 rounded-lg font-bold border transition-all ${
                    formData.maxInstallations === limit
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {limit} Browser{limit > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Customer Name (Optional)</label>
            <input
              type="text"
              value={formData.customerName || ''}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="e.g. Md Juyel Rana"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Customer Contact */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Customer Contact / Phone (Optional)</label>
            <input
              type="text"
              value={formData.customerContact || ''}
              onChange={(e) => setFormData({ ...formData, customerContact: e.target.value })}
              placeholder="e.g. 01700000000 or WhatsApp"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Internal Admin Notes (Optional)</label>
            <textarea
              rows={2}
              value={formData.adminNotes || ''}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              placeholder="e.g. Approved via special agency pricing"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20"
            >
              {createMutation.isPending ? 'Generating...' : 'Generate & Show Key'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: DISPLAY NEW PLAINTEXT KEY ONCE */}
      <Modal
        isOpen={!!newKeyGenerated}
        onClose={() => setNewKeyGenerated(null)}
        title="License Generated Successfully"
        maxWidth="md"
      >
        <div className="space-y-4 text-center">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2.5 text-left text-amber-300 text-xs">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
            <p>
              <strong>Important:</strong> This is the <em>only time</em> the plaintext license key will be displayed. Please copy and provide it to the client now.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border-2 border-emerald-500/80 rounded-2xl relative group">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              Plaintext License Key
            </span>
            <div className="font-mono text-xl font-extrabold text-emerald-400 tracking-wider select-all">
              {newKeyGenerated?.plainKey}
            </div>

            <button
              type="button"
              onClick={() => handleCopyKey(newKeyGenerated!.plainKey)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
            >
              {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedKey ? 'Copied to Clipboard!' : 'Copy License Key'}</span>
            </button>
          </div>

          <div className="text-left text-xs text-slate-400 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500">Duration:</span>{' '}
              <span className="text-white font-semibold">{newKeyGenerated?.license.validityDays} Days</span>
            </div>
            <div>
              <span className="text-slate-500">Browser Limit:</span>{' '}
              <span className="text-white font-semibold">{newKeyGenerated?.license.maxInstallations} Device(s)</span>
            </div>
            <div>
              <span className="text-slate-500">Status:</span>{' '}
              <span className="text-amber-400 font-semibold">Pending Activation</span>
            </div>
          </div>

          <button
            onClick={() => setNewKeyGenerated(null)}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            I Have Copied The Key — Close Window
          </button>
        </div>
      </Modal>

      {/* MODAL 3: RENEW LICENSE */}
      <Modal
        isOpen={!!renewTarget}
        onClose={() => setRenewTarget(null)}
        title={`Renew License: ${renewTarget?.keyMasked}`}
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Extending validity extends the expiry date by the chosen number of days.
          </p>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Additional Validity (Days)</label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setRenewDays(d)}
                  className={`py-1.5 rounded-lg font-bold border transition-all ${
                    renewDays === d
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  +{d} Days
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Renewal Note</label>
            <input
              type="text"
              value={renewNote}
              onChange={(e) => setRenewNote(e.target.value)}
              placeholder="e.g. bKash payment TrxID received"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setRenewTarget(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => renewMutation.mutate()}
              disabled={renewMutation.isPending}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all"
            >
              {renewMutation.isPending ? 'Renewing...' : 'Confirm Renewal'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: REVOKE LICENSE */}
      <Modal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke License Entitlement"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
            <strong>Warning:</strong> Revoking this license will immediately lock automation on all currently registered browser installations.
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Revocation Reason</label>
            <input
              type="text"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g. Chargeback, Terms violation"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setRevokeTarget(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => revokeMutation.mutate()}
              disabled={revokeMutation.isPending}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all"
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Confirm Revoke'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
