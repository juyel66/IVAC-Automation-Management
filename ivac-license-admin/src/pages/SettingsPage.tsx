import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Check,
  CreditCard,
  Lock,
  Phone,
  HelpCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { paymentService } from '../services/paymentService.js';
import { authService } from '../services/authService.js';
import { PaymentSettings } from '../types/index.js';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<PaymentSettings>({
    bkashNumber: '',
    nagadNumber: '',
    bankInstructions: '',
    whatsappNumber: '',
    instructionText: '',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Query settings
  const { data, isLoading } = useQuery({
    queryKey: ['payment-instructions'],
    queryFn: () => paymentService.getPublicInstructions(),
  });

  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
    }
  }, [data]);

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: () => paymentService.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-instructions'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">System & Gateway Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure payment gateway receiving numbers and administrative credentials.
        </p>
      </div>

      {/* 1. PAYMENT GATEWAY SETTINGS CARD */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <CreditCard className="h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Manual Payment Gateway Receiving Numbers</h3>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>Gateway settings saved! Public extension API updated in real-time.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">bKash Receiving Number</label>
            <input
              type="text"
              value={settings.bkashNumber}
              onChange={(e) => setSettings({ ...settings, bkashNumber: e.target.value })}
              placeholder="017XXXXXXXX"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nagad Receiving Number</label>
            <input
              type="text"
              value={settings.nagadNumber}
              onChange={(e) => setSettings({ ...settings, nagadNumber: e.target.value })}
              placeholder="018XXXXXXXX"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Support WhatsApp Number</label>
            <input
              type="text"
              value={settings.whatsappNumber}
              onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
              placeholder="+8801700000000"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Bank Account Instructions</label>
            <input
              type="text"
              value={settings.bankInstructions || ''}
              onChange={(e) => setSettings({ ...settings, bankInstructions: e.target.value })}
              placeholder="Bank Name, AC Number, AC Name, Branch"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1 text-xs">
            Customer Payment Instructions Text
          </label>
          <textarea
            rows={4}
            value={settings.instructionText || ''}
            onChange={(e) => setSettings({ ...settings, instructionText: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => updateSettingsMutation.mutate()}
            disabled={updateSettingsMutation.isPending}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all transform active:scale-98"
          >
            <Save className="h-4 w-4" />
            <span>{updateSettingsMutation.isPending ? 'Saving...' : 'Save Gateway Settings'}</span>
          </button>
        </div>
      </div>

      {/* 2. ADMIN PASSWORD UPDATE CARD */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Administrator Security & Password</h3>
        </div>

        {passwordError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>Password updated successfully! All other sessions invalidated.</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">New Strong Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Update Admin Password
          </button>
        </form>
      </div>
    </div>
  );
};
