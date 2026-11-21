import {
  UserPlus,
  Building2,
  Briefcase,
  ArrowRight,
  Clock,
} from 'lucide-react';
import type { AgencyDataset, NavSection } from '../types';
import {
  formatShortDate,
  formatUgx,
  getProbationInfo,
} from '../utils/formatters';
import { StatusText } from './ui/StatusText';

interface DashboardViewProps {
  dataset: AgencyDataset;
  onNavigate: (section: NavSection) => void;
  onQuickAction: (action: 'register_worker' | 'add_client' | 'create_placement') => void;
  onInspectWorker: (workerId: string) => void;
}

export function DashboardView({
  dataset,
  onNavigate,
  onQuickAction,
  onInspectWorker,
}: DashboardViewProps) {
  const { workers, clients, applications, placements, payments } = dataset;

  const totalWorkers = workers.length;
  const availableWorkers = workers.filter((w) => w.availability === 'Available').length;
  const placedWorkers = workers.filter((w) => w.availability === 'Placed').length;
  const totalClients = clients.length;
  const activePlacements = placements.filter((p) => p.status === 'Active');
  const pendingApplications = applications.filter((a) => a.status === 'Pending').length;

  const underProbationPlacements = activePlacements.filter((p) => {
    const info = getProbationInfo(p.probationEndDate, p.status);
    return info.indicator === 'Ongoing' || info.indicator === 'Ending soon';
  });

  const totalPaymentsRecorded = payments.reduce((sum, p) => sum + p.amountUgx, 0);

  const recentWorkers = [...workers]
    .sort((a, b) => b.registrationDate.localeCompare(a.registrationDate))
    .slice(0, 5);

  const recentPlacements = [...placements]
    .sort((a, b) => b.placementDate.localeCompare(a.placementDate))
    .slice(0, 5);

  const upcomingProbations = [...activePlacements]
    .map((p) => ({
      placement: p,
      worker: workers.find((w) => w.id === p.workerId),
      client: clients.find((c) => c.id === p.clientId),
      probation: getProbationInfo(p.probationEndDate, p.status),
    }))
    .sort((a, b) => a.placement.probationEndDate.localeCompare(b.placement.probationEndDate))
    .slice(0, 5);

  const stats = [
    { label: 'Total Registered Workers', value: String(totalWorkers), sub: `${availableWorkers} available · ${placedWorkers} placed` },
    { label: 'Available Workers', value: String(availableWorkers), sub: 'Ready for placement' },
    { label: 'Currently Placed Workers', value: String(placedWorkers), sub: 'Active household assignments' },
    { label: 'Total Registered Clients', value: String(totalClients), sub: 'Employers on file' },
    { label: 'Active Placements', value: String(activePlacements.length), sub: 'Current contracts' },
    { label: 'Pending Applications', value: String(pendingApplications), sub: 'Awaiting review' },
    { label: 'Under Probation', value: String(underProbationPlacements.length), sub: 'Monitored active placements' },
    { label: 'Total Payments Recorded', value: formatUgx(totalPaymentsRecorded), sub: `${payments.length} ledger entries` },
  ];

  return (
    <div className="space-y-8">
      {/* Header + Quick Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Agency Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live operational summary for Talent Bridge Recruitment Agency, Ntinda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onQuickAction('register_worker')}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register Worker</span>
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('add_client')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            <span>Add Client</span>
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('create_placement')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Briefcase className="h-4 w-4 text-slate-500" />
            <span>Create Placement</span>
          </button>
        </div>
      </div>

      {/* 8 Live KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-xs font-medium text-slate-500">{stat.label}</p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Probation Completions */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-teal-700" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Upcoming Probation Completion Dates
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('probation')}
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
          >
            <span>View Probation Monitor</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {upcomingProbations.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            No active placements currently under probation monitoring.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">Placement</th>
                  <th className="px-6 py-3">Worker</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Placement Date</th>
                  <th className="px-6 py-3">Probation End</th>
                  <th className="px-6 py-3 text-right">Days Left</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingProbations.map(({ placement, worker, client, probation }) => (
                  <tr key={placement.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">
                      {placement.placementCode}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {worker?.fullName || 'Unknown Worker'}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {client?.fullName || 'Unknown Client'}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {formatShortDate(placement.placementDate)}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {formatShortDate(placement.probationEndDate)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                      {probation.daysRemaining}d
                    </td>
                    <td className="px-6 py-3">
                      <StatusText status={probation.indicator} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Worker Registrations & Recent Placements */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Recent Worker Registrations
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('workers')}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
            >
              <span>All Workers</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {recentWorkers.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              No workers registered yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentWorkers.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onInspectWorker(w.id)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-3.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {w.fullName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      <span className="font-mono">{w.workerCode}</span> · {w.district} ·{' '}
                      {w.skills.slice(0, 2).join(', ')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusText status={w.availability} />
                    <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                      {formatShortDate(w.registrationDate)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Recent Placements
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('placements')}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
            >
              <span>All Placements</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {recentPlacements.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              No placements recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPlacements.map((p) => {
                const worker = workers.find((w) => w.id === p.workerId);
                const client = clients.find((c) => c.id === p.clientId);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-4 px-6 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {worker?.fullName || 'Unknown'} → {client?.fullName || 'Unknown'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        <span className="font-mono">{p.placementCode}</span> ·{' '}
                        <span className="font-mono tabular-nums">
                          {formatUgx(p.agreedSalary)}/mo
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusText status={p.status} />
                      <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                        {formatShortDate(p.placementDate)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
