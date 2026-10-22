import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  KeyRound,
  Calendar,
  Laptop,
  AlertTriangle,
  RotateCcw,
  Check,
  Copy,
  Clock,
  ShieldAlert,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { licenseService } from '../services/licenseService.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { Modal } from '../components/Modal.js';

export const LicenseDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [newLimit, setNewLimit] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Reissue Key State
  const [isReissueOpen, setIsReissueOpen] = useState(false);
  const [reissuedKeyData, setReissuedKeyData] = useState<{
    plainLicenseKey: string;
    keyMasked: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showFullKey, setShowFullKey] = useState(true);

  const handleCopyKey = () => {
    const keyToCopy = license?.plainKey || license?.keyMasked || '';
    if (!keyToCopy) return;
    navigator.clipboard.writeText(keyToCopy);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Revoke Installation Modal
  const [revokingInstId, setRevokingInstId] = useState<string | null>(null);

  // Query
  const { data: license, isLoading, refetch } = useQuery({
    queryKey: ['license', id],
    queryFn: async () => {
      const res = await licenseService.getLicense(id!);
      setNewLimit(res.maxInstallations);
      setCustomerName(res.customerName || '');
      setCustomerContact(res.customerContact || '');
      setAdminNotes(res.adminNotes || '');
      return res;
    },
    enabled: !!id,
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: () =>
      licenseService.updateLicense(id!, {
        maxInstallations: newLimit !== null ? newLimit : license?.maxInstallations,
        customerName,
        customerContact,
        adminNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license', id] });
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      setSaveSuccess(true);
      setLimitWarning(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: any) => {
      setLimitWarning(err.message);
    },
  });

  // Revoke Installation Mutation
  const revokeInstMutation = useMutation({
    mutationFn: (instId: string) => licenseService.revokeInstallation(instId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license', id] });
      setRevokingInstId(null);
      refetch();
    },
  });

  // Reissue Key Mutation
  const reissueMutation = useMutation({
    mutationFn: () => licenseService.reissueKey(id!),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['license', id] });
      setIsReissueOpen(false);
      setReissuedKeyData(res);
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Clock className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
        Loading license details...
      </div>
    );
  }

  if (!license) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>License not found.</p>
        <button
          onClick={() => navigate('/licenses')}
          className="mt-4 px-4 py-2 bg-slate-800 rounded-xl text-white text-xs font-semibold"
        >
          Return to License List
        </button>
      </div>
    );
  }

  const activeInstallations = (license.installations || []).filter((i) => i.status === 'ACTIVE');

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/licenses')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Licenses</span>
        </button>

        <button
          onClick={() => setIsReissueOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reissue Key</span>
        </button>
      </div>

      {/* Main License Overview Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
              License Key
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 shadow-inner">
                <KeyRound className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-mono text-xl sm:text-2xl font-black tracking-wider text-emerald-400 select-all">
                  {license.plainKey ? (showFullKey ? license.plainKey : license.keyMasked) : license.keyMasked}
                </span>

                {license.plainKey && (
                  <button
                    onClick={() => setShowFullKey(!showFullKey)}
                    title={showFullKey ? 'Mask Key' : 'Reveal Full Key'}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors ml-1"
                  >
                    {showFullKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}

                <button
                  onClick={handleCopyKey}
                  title="Copy Full License Key"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ml-1 ${
                    copiedKey
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 active:scale-95'
                  }`}
                >
                  {copiedKey ? (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy Key</span>
                    </>
                  )}
                </button>
              </div>

              <StatusBadge status={license.status} />
            </div>

            {!license.plainKey && (
              <div className="mt-2.5 flex items-center gap-2 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl w-fit">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>One-way masked key. Click <strong>Reissue Key</strong> above to generate a full readable key.</span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 font-mono mt-2.5">License UUID: {license.id}</p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Browser Quota</span>
              <span className="text-lg font-mono font-bold text-white">
                <span className="text-emerald-400">{activeInstallations.length}</span> / {license.maxInstallations}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Validity Plan</span>
              <span className="text-lg font-mono font-bold text-white">{license.validityDays} Days</span>
            </div>
          </div>
        </div>

        {/* Timestamps & Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-xs">
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">First Activated</span>
            <span className="text-slate-200 font-medium mt-1 block">
              {license.activatedAt ? new Date(license.activatedAt).toLocaleString() : 'Not Yet Activated'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Expiration Date</span>
            <span className="text-slate-200 font-medium mt-1 block">
              {license.expiresAt ? new Date(license.expiresAt).toLocaleString() : 'Calculates on 1st activation'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Last Validated</span>
            <span className="text-slate-200 font-medium mt-1 block">
              {license.lastValidatedAt ? new Date(license.lastValidatedAt).toLocaleString() : 'Never'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Created On</span>
            <span className="text-slate-200 font-medium mt-1 block">
              {new Date(license.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* REGISTERED BROWSER INSTALLATIONS TABLE */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Registered Browser Installations</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Active: <span className="text-emerald-400 font-bold">{activeInstallations.length}</span> of {license.maxInstallations} slots used
          </span>
        </div>

        {license.installations && license.installations.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Installation ID</th>
                  <th className="px-4 py-3">Label / Device</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">First Activated</th>
                  <th className="px-4 py-3">Last Seen</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {license.installations.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono text-emerald-400 text-[11px]">
                      {inst.installationId}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {inst.installationLabel || 'Chrome Browser'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inst.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {new Date(inst.firstActivatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {new Date(inst.lastSeenAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inst.status === 'ACTIVE' && (
                        <button
                          onClick={() => setRevokingInstId(inst.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-colors"
                        >
                          Revoke Slot
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl text-slate-500 text-xs">
            No browsers have registered this key yet.
          </div>
        )}
      </div>

      {/* EDIT CONFIGURATION & QUOTA FORM */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white">License Attributes & Browser Quota</h3>

        {limitWarning && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{limitWarning}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>License settings updated successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Change Max Installations */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Max Browser Installations
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={newLimit || 1}
              onChange={(e) => {
                setLimitWarning(null);
                const val = parseInt(e.target.value, 10) || 1;
                setNewLimit(val);
                if (val < activeInstallations.length) {
                  setLimitWarning(
                    `Warning: Limit (${val}) is lower than current active installations (${activeInstallations.length}). You must revoke excess browser slots first.`
                  );
                }
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Currently {activeInstallations.length} active installation(s) registered.
            </p>
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Customer Contact */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Customer Contact</label>
            <input
              type="text"
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Admin Notes</label>
            <input
              type="text"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all transform active:scale-98"
          >
            <Save className="h-4 w-4" />
            <span>{updateMutation.isPending ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* CONFIRM REVOKE INSTALLATION MODAL */}
      <Modal
        isOpen={!!revokingInstId}
        onClose={() => setRevokingInstId(null)}
        title="Revoke Browser Installation"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Revoking this browser installation will immediately free 1 installation slot and disallow this specific browser profile from running automated workflows until reactivated.
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setRevokingInstId(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => revokeInstMutation.mutate(revokingInstId!)}
              disabled={revokeInstMutation.isPending}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all"
            >
              {revokeInstMutation.isPending ? 'Revoking...' : 'Confirm Revocation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* REISSUE KEY CONFIRM MODAL */}
      <Modal
        isOpen={isReissueOpen}
        onClose={() => setIsReissueOpen(false)}
        title="Reissue / Rotate License Key"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
            <strong>Security Warning:</strong> Reissuing will generate a brand new plaintext key and invalidate the previous key immediately. All active browsers will need to be reactivated with the new key.
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsReissueOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => reissueMutation.mutate()}
              disabled={reissueMutation.isPending}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all"
            >
              {reissueMutation.isPending ? 'Reissuing...' : 'Confirm Reissue'}
            </button>
          </div>
        </div>
      </Modal>

      {/* REISSUED KEY DISPLAY MODAL */}
      <Modal
        isOpen={!!reissuedKeyData}
        onClose={() => setReissuedKeyData(null)}
        title="New License Key Reissued"
        maxWidth="sm"
      >
        <div className="space-y-4 text-center text-xs">
          <p className="text-slate-300">
            Please copy this new plaintext key now and share it with the customer:
          </p>
          <div className="p-4 bg-slate-950 border-2 border-emerald-500/80 rounded-2xl">
            <div className="font-mono text-lg font-bold text-emerald-400 tracking-wider">
              {reissuedKeyData?.plainLicenseKey}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(reissuedKeyData!.plainLicenseKey);
                setCopiedKey(true);
                setTimeout(() => setCopiedKey(false), 2000);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px]"
            >
              {copiedKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
            </button>
          </div>
          <button
            onClick={() => setReissuedKeyData(null)}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
          >
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
};
