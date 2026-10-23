import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  CreditCard,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { paymentService } from '../services/paymentService.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { Modal } from '../components/Modal.js';
import { PaymentRequest } from '../types/index.js';

export const PaymentsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Approve Modal State
  const [approvingPayment, setApprovingPayment] = useState<PaymentRequest | null>(null);
  const [approveActionType, setApproveActionType] = useState<'GENERATE_NEW' | 'RENEW_EXISTING'>('GENERATE_NEW');
  const [approveNote, setApproveNote] = useState('');
  const [approveResult, setApproveResult] = useState<{
    message: string;
    generatedPlainKey?: string;
    linkedLicenseId?: string;
    actionResult?: 'CREATED' | 'RENEWED';
    license?: {
      id?: string;
      keyMasked?: string;
      plainKey?: string;
      validityDays?: number;
      maxInstallations?: number;
    };
    plan?: {
      name?: string;
      validityDays?: number;
      maxInstallations?: number;
    };
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedTableKeyId, setCopiedTableKeyId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectingPayment, setRejectingPayment] = useState<PaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Query
  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, statusFilter, debouncedSearch],
    queryFn: () =>
      paymentService.listPayments({
        page,
        limit: 10,
        status: statusFilter,
        search: debouncedSearch,
      }),
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: () =>
      paymentService.approvePayment(approvingPayment!.id, {
        adminNote: approveNote,
        actionType: approveActionType,
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      setApprovingPayment(null);
      setApproveNote('');
      setApproveResult(res);
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: () =>
      paymentService.rejectPayment(rejectingPayment!.id, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setRejectingPayment(null);
      setRejectReason('');
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Manual Payment Verification
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit customer bKash and Nagad transaction submissions and release or renew licenses.
          </p>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2 text-xs text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
          <span>Always verify Transaction ID directly with provider SMS/portal before approving.</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Transaction ID, Payer phone, or License ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
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

      {/* Payments Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Transaction ID</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5">Plan / Amount</th>
                <th className="px-5 py-3.5">Payer Contact</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Submitted At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    Loading payments...
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No payment requests found.
                  </td>
                </tr>
              ) : (
                data?.items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-xs font-bold text-white select-all">
                        {p.transactionId}
                      </div>
                      {p.license && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          Linked: {p.license.keyMasked}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px] font-bold">
                        {p.paymentMethod}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="text-slate-200 font-semibold">
                        {p.planName || p.plan?.name || p.planCode}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-emerald-400 font-mono font-bold">
                          ৳ {p.amount} {p.currency}
                        </span>
                        {p.validityDays ? (
                          <span className="text-[10px] text-slate-400">
                            ({p.validityDays}d{p.maxInstallations ? `, ${p.maxInstallations} browser${p.maxInstallations > 1 ? 's' : ''}` : ''})
                          </span>
                        ) : null}
                      </div>
                      {p.customerName && (
                        <div className="text-[10px] text-slate-400">
                          Customer: {p.customerName}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {p.payerContact}
                    </td>

                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.status} size="sm" />
                      {p.adminNote && (
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]" title={p.adminNote}>
                          {p.adminNote}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {p.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setApprovingPayment(p);
                              setApproveNote('Verified with provider');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-colors"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectingPayment(p);
                              setRejectReason('Transaction ID not found in statement');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-colors"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString() : 'Reviewed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.pagination.totalPages > 1 && (
          <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing page <span className="font-bold text-white">{data.pagination.page}</span> of{' '}
              <span className="font-bold text-white">{data.pagination.totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* APPROVE PAYMENT MODAL */}
      <Modal
        isOpen={!!approvingPayment}
        onClose={() => setApprovingPayment(null)}
        title="Approve Customer Payment"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Trx ID:</span>
              <span className="font-mono font-bold text-white">{approvingPayment?.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Plan:</span>
              <span className="font-bold text-emerald-400">{approvingPayment?.planCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payer Phone:</span>
              <span className="font-mono text-slate-300">{approvingPayment?.payerContact}</span>
            </div>
          </div>

          <p className="text-slate-300">
            {approvingPayment?.licenseId
              ? 'This approval will automatically extend the linked license according to the plan duration.'
              : 'This approval will automatically generate a brand new license key for this customer.'}
          </p>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Admin Approval Note</label>
            <input
              type="text"
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setApprovingPayment(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all"
            >
              {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      </Modal>

      {/* APPROVE SUCCESS WITH NEW KEY DISPLAY */}
      <Modal
        isOpen={!!approveResult}
        onClose={() => setApproveResult(null)}
        title="Payment Approved Successfully"
        maxWidth="sm"
      >
        <div className="space-y-4 text-center text-xs">
          <p className="text-slate-300">{approveResult?.message}</p>

          {approveResult?.generatedPlainKey && (
            <div className="p-4 bg-slate-950 border-2 border-emerald-500/80 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Generated Plaintext Key
              </span>
              <div className="font-mono text-lg font-extrabold text-emerald-400 tracking-wider">
                {approveResult.generatedPlainKey}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(approveResult.generatedPlainKey!);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px]"
              >
                {copiedKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setApproveResult(null)}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* REJECT PAYMENT MODAL */}
      <Modal
        isOpen={!!rejectingPayment}
        onClose={() => setRejectingPayment(null)}
        title="Reject Payment Request"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Rejection Reason (Required)
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Transaction ID was not found in statement or amount mismatched"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setRejectingPayment(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all disabled:opacity-50"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
