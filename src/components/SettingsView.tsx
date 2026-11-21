import React, { useState } from 'react';
import { Database, RotateCcw, Trash2, CheckCircle2, Users } from 'lucide-react';
import type { AgencyDataset, RecordScope, StaffProfile } from '../types';
import { agencyService } from '../services/agencyService';
import {
  getSavedSupabaseConfig,
  isSupabaseConfigured,
  normalizeSupabaseUrl,
  saveSupabaseConfig,
} from '../lib/supabase';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface SettingsViewProps {
  user: StaffProfile;
  fullDataset: AgencyDataset;
  recordScope: RecordScope;
  onChangeRecordScope: (scope: RecordScope) => void;
  onClearDemoData: () => Promise<void>;
  onRestoreDemoData: () => Promise<void>;
  onReconnectSupabase: () => Promise<void>;
  onNotify: (msg: string) => void;
}

export function SettingsView({
  user,
  fullDataset,
  recordScope,
  onChangeRecordScope,
  onClearDemoData,
  onRestoreDemoData,
  onReconnectSupabase,
  onNotify,
}: SettingsViewProps) {
  const savedCfg = getSavedSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(savedCfg?.url || '');
  const [supabaseKey, setSupabaseKey] = useState(savedCfg?.anonKey || '');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const adminUsers = agencyService.getDemoAdmins();

  const demoCounts = {
    workers: fullDataset.workers.filter((w) => w.isDemo).length,
    clients: fullDataset.clients.filter((c) => c.isDemo).length,
    applications: fullDataset.applications.filter((a) => a.isDemo).length,
    placements: fullDataset.placements.filter((p) => p.isDemo).length,
    payments: fullDataset.payments.filter((pay) => pay.isDemo).length,
  };

  const realCounts = {
    workers: fullDataset.workers.length - demoCounts.workers,
    clients: fullDataset.clients.length - demoCounts.clients,
    applications: fullDataset.applications.length - demoCounts.applications,
    placements: fullDataset.placements.length - demoCounts.placements,
    payments: fullDataset.payments.length - demoCounts.payments,
  };

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = normalizeSupabaseUrl(supabaseUrl);
    if (!cleanUrl.startsWith('http') || !supabaseKey.trim()) {
      onNotify('Please enter a valid Supabase URL and Publishable/Anon Key.');
      return;
    }
    setSupabaseUrl(cleanUrl);
    saveSupabaseConfig({ url: cleanUrl, anonKey: supabaseKey.trim() });
    await onReconnectSupabase();
    onNotify('Supabase credentials saved. Sign in with your Supabase staff account.');
  };

  const handleDisconnectSupabase = async () => {
    saveSupabaseConfig(null);
    setSupabaseUrl('');
    setSupabaseKey('');
    await onReconnectSupabase();
    onNotify('Switched back to Local Storage Demo Mode.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Settings & Data Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage agency details, administrator accounts, demo data separation, or Supabase connectivity.
        </p>
      </div>

      {/* Agency & Staff Profile */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Agency & Signed-In Staff
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Agency Name</p>
            <p className="mt-0.5 font-medium text-slate-900">
              {user.agencyName}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Location</p>
            <p className="mt-0.5 font-medium text-slate-900">
              {user.agencyLocation}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Staff Member</p>
            <p className="mt-0.5 font-medium text-slate-900">{user.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Account Email</p>
            <p className="mt-0.5 font-mono text-xs text-slate-700">
              {user.email}
            </p>
          </div>
        </div>
      </section>

      {/* Authorized Admin Users Directory */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Administrator Accounts ({adminUsers.length})
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Registered agency administrators authorized to access the Talent Bridge dashboard.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-4 py-2.5">Full Name</th>
                <th className="px-4 py-2.5">Login Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adminUsers.map((admin) => (
                <tr key={admin.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {admin.fullName}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                    {admin.email}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {admin.roleTitle}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium text-emerald-700">
                    {admin.email === user.email ? 'Signed In' : 'Active'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Demo Data Separation */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Demo Data & Agency Records Separation
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sample Ugandan records are tagged separately from newly entered agency records so you can test safely or clear demo data before live deployment.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 shrink-0">
            <button
              type="button"
              onClick={() => onChangeRecordScope('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                recordScope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records
            </button>
            <button
              type="button"
              onClick={() => onChangeRecordScope('agency_only')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                recordScope === 'agency_only'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agency Only
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-medium text-slate-500">
              Live Agency Records
            </p>
            <p className="mt-2 font-mono text-sm text-slate-900 tabular-nums">
              {realCounts.workers} workers · {realCounts.clients} clients ·{' '}
              {realCounts.placements} placements · {realCounts.payments} payments
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-medium text-slate-500">
              Tagged Demo Records
            </p>
            <p className="mt-2 font-mono text-sm text-slate-900 tabular-nums">
              {demoCounts.workers} workers · {demoCounts.clients} clients ·{' '}
              {demoCounts.placements} placements · {demoCounts.payments} payments
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Demo Data</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmRestoreOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4 text-slate-500" />
            <span>Restore Demo Data</span>
          </button>
        </div>
      </section>

      {/* Supabase Connection */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Supabase Backend Configuration
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Current mode:{' '}
                <span className="font-medium text-slate-900">
                  {isSupabaseConfigured()
                    ? 'Connected to Supabase'
                    : 'Local Storage Demo Mode (no Supabase credentials configured)'}
                </span>
              </p>
            </div>
          </div>

          {isSupabaseConfigured() && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>Supabase Active</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSupabase} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Supabase Anon Public Key
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              Save & Connect Supabase
            </button>
            {isSupabaseConfigured() && (
              <button
                type="button"
                onClick={handleDisconnectSupabase}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Switch to Local Demo Mode
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Run <span className="font-mono text-slate-700">supabase/schema.sql</span>,{' '}
            <span className="font-mono text-slate-700">supabase/seed_admins.sql</span>, and{' '}
            <span className="font-mono text-slate-700">supabase/public_portal_migration.sql</span> in your Supabase SQL Editor to enable all tables, admin accounts, and public online applications.
          </p>
        </form>
      </section>

      <ConfirmDialog
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={async () => {
          setIsBusy(true);
          try {
            await onClearDemoData();
            setConfirmClearOpen(false);
          } finally {
            setIsBusy(false);
          }
        }}
        title="Clear Demo Data"
        message="This will remove all sample demo records while keeping every real agency record you have created. Continue?"
        confirmLabel="Clear Demo Data"
        isLoading={isBusy}
      />

      <ConfirmDialog
        isOpen={confirmRestoreOpen}
        onClose={() => setConfirmRestoreOpen(false)}
        onConfirm={async () => {
          setIsBusy(true);
          try {
            await onRestoreDemoData();
            setConfirmRestoreOpen(false);
          } finally {
            setIsBusy(false);
          }
        }}
        title="Restore Demo Data"
        message="This will restore the 10 sample workers, 5 clients, 5 applications, 3 placements, and 6 payment entries alongside your existing agency records."
        confirmLabel="Restore Demo Data"
        variant="primary"
        isLoading={isBusy}
      />
    </div>
  );
}
