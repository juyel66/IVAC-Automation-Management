import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Clock,
  Laptop,
  Coins,
  ShieldCheck,
  Check,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { planService } from '../services/planService.js';
import { PaymentPlan, CreatePlanInput, UpdatePlanInput } from '../types/index.js';
import { Modal } from '../components/Modal.js';

export const PlansPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<PaymentPlan | null>(null);

  // Notifications
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Create Form State
  const [createForm, setCreateForm] = useState<CreatePlanInput>({
    code: '',
    name: '',
    description: '',
    price: 500,
    currency: 'BDT',
    validityDays: 30,
    maxInstallations: 1,
    isActive: true,
    sortOrder: 1,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdatePlanInput>({
    code: '',
    name: '',
    description: '',
    price: 0,
    currency: 'BDT',
    validityDays: 30,
    maxInstallations: 1,
    isActive: true,
    sortOrder: 0,
  });

  // Fetch plans
  const { data: plans = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-plans', statusFilter, debouncedSearch],
    queryFn: () =>
      planService.listPlans({
        isActive: statusFilter,
        search: debouncedSearch,
      }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreatePlanInput) => planService.createPlan(data),
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-instructions'] });
      setIsCreateOpen(false);
      setFormError(null);
      setCreateForm({
        code: '',
        name: '',
        description: '',
        price: 500,
        currency: 'BDT',
        validityDays: 30,
        maxInstallations: 1,
        isActive: true,
        sortOrder: (plans.length + 1),
      });
      showToast(`Plan "${newPlan.name}" created successfully!`);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create plan.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlanInput }) =>
      planService.updatePlan(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-instructions'] });
      setEditingPlan(null);
      setFormError(null);
      showToast(`Plan "${updated.name}" updated successfully!`);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update plan.');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      planService.togglePlanStatus(id, isActive),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-instructions'] });
      showToast(`Plan "${updated.name}" is now ${updated.isActive ? 'Active' : 'Inactive'}.`);
    },
    onError: (err: any) => {
      showToast(`Error: ${err.message || 'Failed to update plan status'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => planService.deleteOrArchivePlan(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-instructions'] });
      setDeletingPlan(null);
      showToast(res.message);
    },
    onError: (err: any) => {
      showToast(`Error: ${err.message || 'Failed to remove plan'}`);
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  const openEditModal = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setFormError(null);
    setEditForm({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      currency: plan.currency || 'BDT',
      validityDays: plan.validityDays,
      maxInstallations: plan.maxInstallations,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
  };

  // Stats calculation
  const totalPlans = plans.length;
  const activePlans = plans.filter((p) => p.isActive).length;
  const inactivePlans = totalPlans - activePlans;
  const avgPrice = totalPlans > 0
    ? Math.round(plans.reduce((acc, p) => acc + Number(p.price), 0) / totalPlans)
    : 0;

  return (
    <div className="space-y-7">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-500/90 text-slate-950 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur font-semibold text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-emerald-400" />
            <span>Subscription Plans & Dynamic Pricing</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage public subscription durations, BDT pricing tiers, and maximum browser installation limits in real-time.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setCreateForm({
              code: '',
              name: '',
              description: '',
              price: 500,
              currency: 'BDT',
              validityDays: 30,
              maxInstallations: 1,
              isActive: true,
              sortOrder: plans.length + 1,
            });
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Plan</span>
        </button>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Plans</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalPlans}</div>
          <div className="text-[11px] text-slate-500 mt-1">Configured in database</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active for Extension</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{activePlans}</div>
          <div className="text-[11px] text-slate-500 mt-1">Visible on client UI</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Archived / Inactive</span>
            <XCircle className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-300">{inactivePlans}</div>
          <div className="text-[11px] text-slate-500 mt-1">Historical or paused</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Average Price</span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">৳ {avgPrice.toLocaleString()} <span className="text-xs font-medium text-slate-400">BDT</span></div>
          <div className="text-[11px] text-slate-500 mt-1">Across all tiers</div>
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
            placeholder="Search plans by name, code, or description..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { label: 'All Plans', val: 'ALL' },
            { label: 'Active Only', val: 'true' },
            { label: 'Inactive Only', val: 'false' },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val as any)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors shrink-0 ${
                statusFilter === tab.val
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={() => refetch()}
            title="Refresh plans list from server"
            className="p-2 rounded-xl bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors shrink-0"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Plans List Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RotateCw className="h-6 w-6 animate-spin mx-auto text-emerald-400" />
            <p className="text-xs">Loading subscription plans from server...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-rose-500" />
            <p className="text-sm font-semibold">Failed to load subscription plans</p>
            <p className="text-xs text-slate-400">{(error as any)?.message || 'Internal network error'}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No Subscription Plans Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {debouncedSearch
                  ? `No plans matched "${debouncedSearch}". Try a different search keyword.`
                  : 'Get started by creating your first subscription pricing tier for the Chrome extension.'}
              </p>
            </div>
            {!debouncedSearch && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl shadow hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Plan</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Plan Name & Code</th>
                  <th className="py-3.5 px-4">Price (BDT)</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4">Browser Limit</th>
                  <th className="py-3.5 px-4">Sort Order</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {plans.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{p.name}</span>
                          {p._count && p._count.paymentRequests > 0 && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium"
                              title={`${p._count.paymentRequests} orders submitted with this plan`}
                            >
                              {p._count.paymentRequests} orders
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
                            {p.code}
                          </span>
                          {p.description && (
                            <span className="text-[11px] text-slate-400 truncate max-w-xs">
                              {p.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-sm font-bold text-emerald-400">
                        ৳ {Number(p.price).toLocaleString()}
                        <span className="text-[10px] text-slate-400 ml-1 font-sans">{p.currency || 'BDT'}</span>
                      </div>
                    </td>

                    {/* Validity */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{p.validityDays} Days</span>
                      </div>
                    </td>

                    {/* Browser Limit */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                        <Laptop className="h-3.5 w-3.5" />
                        <span>{p.maxInstallations} {p.maxInstallations === 1 ? 'Browser' : 'Browsers'}</span>
                      </div>
                    </td>

                    {/* Sort Order */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        #{p.sortOrder}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: p.id, isActive: !p.isActive })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all ${
                          p.isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white'
                        }`}
                        title="Click to toggle plan status"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            p.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                          }`}
                        />
                        <span>{p.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Edit plan pricing, validity, or limits"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingPlan(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Safely archive or delete this plan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PLAN MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Subscription Plan"
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            createMutation.mutate(createForm);
          }}
          className="space-y-4 text-xs"
        >
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Plan Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase().trim() })}
                placeholder="e.g. PLAN_45D or PLAN_PRO"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Unique identifier for API and client</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Plan Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. 45 Days Agency License"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Customer-facing title</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description (Optional)</label>
            <input
              type="text"
              value={createForm.description || ''}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="e.g. Best for high-frequency agents booking multiple IVAC slots"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Price (BDT) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={createForm.price}
                onChange={(e) => setCreateForm({ ...createForm, price: Math.max(0, Number(e.target.value)) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Validity (Days) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={createForm.validityDays}
                onChange={(e) => setCreateForm({ ...createForm, validityDays: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Max Browsers <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={createForm.maxInstallations}
                onChange={(e) => setCreateForm({ ...createForm, maxInstallations: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Sort Order</label>
              <input
                type="number"
                value={createForm.sortOrder}
                onChange={(e) => setCreateForm({ ...createForm, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Controls display priority in the extension (1, 2, 3...)</span>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 font-semibold">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                />
                <span>Active immediately in public extension</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating Plan...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT PLAN MODAL */}
      <Modal
        isOpen={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        title={`Edit Plan: ${editingPlan?.name || ''}`}
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editingPlan) return;
            setFormError(null);
            updateMutation.mutate({ id: editingPlan.id, data: editForm });
          }}
          className="space-y-4 text-xs"
        >
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Plan Code</label>
              <input
                type="text"
                value={editForm.code || ''}
                onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase().trim() })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Unique stable code</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Plan Name</label>
              <input
                type="text"
                required
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description</label>
            <input
              type="text"
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="e.g. For agencies and team members"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Price (BDT)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={editForm.price ?? 0}
                onChange={(e) => setEditForm({ ...editForm, price: Math.max(0, Number(e.target.value)) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Validity (Days)</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={editForm.validityDays ?? 30}
                onChange={(e) => setEditForm({ ...editForm, validityDays: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Browser Limit</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={editForm.maxInstallations ?? 1}
                onChange={(e) => setEditForm({ ...editForm, maxInstallations: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Display Sort Order</label>
              <input
                type="number"
                value={editForm.sortOrder ?? 0}
                onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 font-semibold">
                <input
                  type="checkbox"
                  checked={editForm.isActive ?? true}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                />
                <span>Active (visible in public extension)</span>
              </label>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Note: Updating plan terms will apply to all future purchases. Pending orders and existing issued licenses will safely retain their snapshot terms.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditingPlan(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE / ARCHIVE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingPlan}
        onClose={() => setDeletingPlan(null)}
        title="Confirm Plan Removal"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white block">
                Remove Plan: {deletingPlan?.name} ({deletingPlan?.code})
              </span>
              <p className="text-slate-300">
                {deletingPlan?._count && deletingPlan._count.paymentRequests > 0 ? (
                  <span>
                    This plan has <strong className="text-white">{deletingPlan._count.paymentRequests} associated payment request(s)</strong>. To preserve historical auditing and financial integrity, this plan will be <strong>safely archived/deactivated</strong> instead of deleted.
                  </span>
                ) : (
                  <span>
                    This plan has no associated payment records. It can be safely and permanently removed from the database.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setDeletingPlan(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deletingPlan && deleteMutation.mutate(deletingPlan.id)}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Processing...' : 'Confirm Remove'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
