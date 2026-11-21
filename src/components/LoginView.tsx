import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Building2, ArrowLeft } from 'lucide-react';
import { DEFAULT_ADMIN_ACCOUNTS } from '../data/adminAccounts';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onBackToPortal?: () => void;
}

export function LoginView({ onLogin, onBackToPortal }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState(
    DEFAULT_ADMIN_ACCOUNTS[0].id
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const supabaseEnabled = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid staff email address.');
      return;
    }
    if (!password || password.length < 4) {
      setError('Please enter your password (minimum 4 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = (adminId = selectedAdminId) => {
    const account =
      DEFAULT_ADMIN_ACCOUNTS.find((a) => a.id === adminId) ||
      DEFAULT_ADMIN_ACCOUNTS[0];
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-stretch gap-8 p-6 lg:grid-cols-12 lg:py-12">
        {/* Left Editorial / Agency Context Panel */}
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-7 lg:flex lg:flex-col">
          <div className="relative h-80 w-full overflow-hidden bg-slate-900">
            {!imgError ? (
              <img
                src="/src/assets/images/login_office_hero_1795278966153.jpg"
                alt="Talent Bridge Recruitment Agency desk in Ntinda, Kampala"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-300">
                <Building2 className="h-12 w-12" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/25 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="text-xs font-medium tracking-wide text-teal-300">
                Ntinda, Kampala · Uganda
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold leading-snug text-white">
                Talent Bridge Recruitment Agency
              </h2>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between p-8">
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Digital Application & Placement Tracking
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                Centralize domestic worker registrations, client matching, active
                placements, probation schedules, and UGX fee records in one
                reliable workspace.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-6 border-t border-slate-100 pt-6">
              <div>
                <p className="font-mono text-xs text-slate-500">Registry</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Workers & Clients
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-slate-500">Tracking</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Probation Periods
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-slate-500">Ledger</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  UGX Payments
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sign-In Form */}
        <div className="flex flex-col justify-center lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 font-display text-sm font-bold text-white">
                  TB
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-slate-900">
                    Talent Bridge
                  </h1>
                  <p className="text-xs text-slate-500">
                    Ntinda Office Staff Portal
                  </p>
                </div>
              </div>
              {onBackToPortal && (
                <button
                  type="button"
                  onClick={onBackToPortal}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Public Portal</span>
                </button>
              )}
            </div>

            <h2 className="font-display text-lg font-semibold text-slate-900">
              Sign in to dashboard
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {supabaseEnabled
                ? 'Authenticate with your Supabase staff account.'
                : 'Running in Demo Mode using local browser storage.'}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Staff Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="calvin.kibirige@talentbridge.ug"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
              >
                <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {!supabaseEnabled && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <label
                  htmlFor="demo-admin-select"
                  className="mb-2 block text-xs font-medium text-slate-600"
                >
                  Quick-fill Administrator Account
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="demo-admin-select"
                    value={selectedAdminId}
                    onChange={(e) => {
                      setSelectedAdminId(e.target.value);
                      fillDemoCredentials(e.target.value);
                    }}
                    className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
                  >
                    {DEFAULT_ADMIN_ACCOUNTS.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.fullName} ({admin.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials(selectedAdminId)}
                    className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap"
                  >
                    Fill Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
