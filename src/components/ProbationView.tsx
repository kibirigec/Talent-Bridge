import { useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import type {
  AgencyDataset,
  Placement,
  ProbationIndicator,
  WorkerAvailability,
} from '../types';
import { formatShortDate, getProbationInfo } from '../utils/formatters';
import { StatusText } from './ui/StatusText';
import { Modal } from './ui/Modal';

interface ProbationViewProps {
  dataset: AgencyDataset;
  onUpdatePlacement: (
    placement: Placement,
    workerAvailabilityOverride?: WorkerAvailability
  ) => Promise<void>;
}

export function ProbationView({
  dataset,
  onUpdatePlacement,
}: ProbationViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [indicatorFilter, setIndicatorFilter] = useState<
    'All' | ProbationIndicator
  >('All');
  const [completingTarget, setCompletingTarget] = useState<Placement | null>(
    null
  );
  const [nextAvailability, setNextAvailability] =
    useState<WorkerAvailability>('Available');
  const [isUpdating, setIsUpdating] = useState(false);

  const probationRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dataset.placements
      .filter((p) => p.status !== 'Terminated')
      .map((pl) => {
        const worker = dataset.workers.find((w) => w.id === pl.workerId);
        const client = dataset.clients.find((c) => c.id === pl.clientId);
        const probation = getProbationInfo(pl.probationEndDate, pl.status);
        return { placement: pl, worker, client, probation };
      })
      .filter(({ placement, worker, client, probation }) => {
        if (
          indicatorFilter !== 'All' &&
          probation.indicator !== indicatorFilter
        ) {
          return false;
        }
        if (!q) return true;
        return (
          placement.placementCode.toLowerCase().includes(q) ||
          (worker?.fullName.toLowerCase().includes(q) ?? false) ||
          (client?.fullName.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) =>
        a.placement.probationEndDate.localeCompare(b.placement.probationEndDate)
      );
  }, [dataset, searchQuery, indicatorFilter]);

  const counts = useMemo(() => {
    const active = dataset.placements.filter((p) => p.status !== 'Terminated');
    let ongoing = 0;
    let endingSoon = 0;
    let completed = 0;
    for (const pl of active) {
      const info = getProbationInfo(pl.probationEndDate, pl.status);
      if (info.indicator === 'Ongoing') ongoing++;
      else if (info.indicator === 'Ending soon') endingSoon++;
      else completed++;
    }
    return { ongoing, endingSoon, completed };
  }, [dataset.placements]);

  const handleCompletePlacement = async () => {
    if (!completingTarget) return;
    setIsUpdating(true);
    try {
      await onUpdatePlacement(
        { ...completingTarget, status: 'Completed' },
        nextAvailability
      );
      setCompletingTarget(null);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Probation Monitoring
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track active probation periods, upcoming completion dates (within 14 days), and post-probation sign-offs.
        </p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Ongoing</p>
          <p className="mt-2 font-display text-2xl font-bold text-teal-700 tabular-nums">
            {counts.ongoing}
          </p>
          <p className="mt-1 text-xs text-slate-400">More than 14 days remaining</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Ending Soon</p>
          <p className="mt-2 font-display text-2xl font-bold text-amber-700 tabular-nums">
            {counts.endingSoon}
          </p>
          <p className="mt-1 text-xs text-slate-400">Completing within 14 days</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Completed</p>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            {counts.completed}
          </p>
          <p className="mt-1 text-xs text-slate-400">Probation term elapsed or closed</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by worker, client, or placement ID..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['All', 'Ongoing', 'Ending soon', 'Completed'] as const).map((ind) => (
            <button
              key={ind}
              type="button"
              onClick={() => setIndicatorFilter(ind)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                indicatorFilter === ind
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Probation Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {probationRows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No probation records match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">Placement</th>
                  <th className="px-5 py-3">Worker</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Placement Date</th>
                  <th className="px-5 py-3">Probation End</th>
                  <th className="px-5 py-3 text-right">Days Remaining</th>
                  <th className="px-5 py-3">Probation Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {probationRows.map(({ placement, worker, client, probation }) => (
                  <tr key={placement.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {placement.placementCode}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {worker?.fullName || 'Removed Worker'}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {client?.fullName || 'Removed Client'}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatShortDate(placement.placementDate)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatShortDate(placement.probationEndDate)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {probation.daysRemaining} days
                    </td>
                    <td className="px-5 py-3">
                      <StatusText status={probation.indicator} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {placement.status === 'Active' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCompletingTarget(placement);
                            setNextAvailability('Available');
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Complete Placement</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {placement.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Placement Modal */}
      <Modal
        isOpen={Boolean(completingTarget)}
        onClose={() => setCompletingTarget(null)}
        title="Complete Placement & Update Worker"
        subtitle={
          completingTarget
            ? `Close placement ${completingTarget.placementCode} and set the worker's updated availability.`
            : undefined
        }
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Worker Availability After Completion
            </label>
            <select
              value={nextAvailability}
              onChange={(e) =>
                setNextAvailability(e.target.value as WorkerAvailability)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="Available">Available (Ready for new placement)</option>
              <option value="Inactive">Inactive (Contract extended privately / unavailable)</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setCompletingTarget(null)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompletePlacement}
              disabled={isUpdating}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {isUpdating ? 'Updating...' : 'Mark Completed'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
