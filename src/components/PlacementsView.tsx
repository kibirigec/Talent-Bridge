import React, { useMemo, useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Calendar,
} from 'lucide-react';
import type {
  AgencyDataset,
  JobApplication,
  Placement,
  PlacementStatus,
  WorkerAvailability,
} from '../types';
import {
  addDaysToIsoDate,
  formatShortDate,
  formatUgx,
  getProbationInfo,
  getTodayIsoDate,
} from '../utils/formatters';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { StatusText } from './ui/StatusText';

interface PlacementsViewProps {
  dataset: AgencyDataset;
  onCreatePlacement: (
    data: Omit<
      Placement,
      'id' | 'placementCode' | 'probationEndDate' | 'isDemo' | 'createdAt' | 'updatedAt'
    >,
    sourceApplicationId?: string
  ) => Promise<void>;
  onUpdatePlacement: (
    placement: Placement,
    workerAvailabilityOverride?: WorkerAvailability
  ) => Promise<void>;
  onDeletePlacement: (placementId: string) => Promise<void>;
  initialOpenCreate?: boolean;
  prefillApplication?: JobApplication | null;
  onConsumedInitialAction?: () => void;
}

interface PlacementFormState {
  workerId: string;
  clientId: string;
  jobDescription: string;
  agreedSalary: string;
  placementDate: string;
  probationDurationDays: string;
  status: PlacementStatus;
  additionalNotes: string;
  nextWorkerAvailability: WorkerAvailability;
  sourceApplicationId?: string;
}

export function PlacementsView({
  dataset,
  onCreatePlacement,
  onUpdatePlacement,
  onDeletePlacement,
  initialOpenCreate,
  prefillApplication,
  onConsumedInitialAction,
}: PlacementsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PlacementStatus>('All');

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null);
  const [formState, setFormState] = useState<PlacementFormState>({
    workerId: '',
    clientId: '',
    jobDescription: '',
    agreedSalary: '350000',
    placementDate: getTodayIsoDate(),
    probationDurationDays: '30',
    status: 'Active',
    additionalNotes: '',
    nextWorkerAvailability: 'Available',
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Placement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeWorkerIds = useMemo(() => {
    return new Set(
      dataset.placements
        .filter((p) => p.status === 'Active')
        .map((p) => p.workerId)
    );
  }, [dataset.placements]);

  const openCreateModal = (fromApp?: JobApplication | null) => {
    setEditingPlacement(null);
    const defaultWorker = fromApp
      ? dataset.workers.find((w) => w.id === fromApp.workerId)
      : dataset.workers.find(
          (w) => w.availability === 'Available' && !activeWorkerIds.has(w.id)
        ) || dataset.workers[0];

    const defaultClient = fromApp
      ? dataset.clients.find((c) => c.id === fromApp.clientId)
      : dataset.clients[0];

    setFormState({
      workerId: defaultWorker?.id || '',
      clientId: defaultClient?.id || '',
      jobDescription: fromApp
        ? fromApp.workType
        : defaultClient?.preferredWorkerType || '',
      agreedSalary: String(
        defaultClient?.salaryBudget || defaultWorker?.expectedSalary || 350000
      ),
      placementDate: getTodayIsoDate(),
      probationDurationDays: '30',
      status: 'Active',
      additionalNotes: fromApp?.notes || '',
      nextWorkerAvailability: 'Available',
      sourceApplicationId: fromApp?.id,
    });
    setFormError('');
    setFormOpen(true);
  };

  useEffect(() => {
    if (prefillApplication) {
      openCreateModal(prefillApplication);
      onConsumedInitialAction?.();
    } else if (initialOpenCreate) {
      openCreateModal(null);
      onConsumedInitialAction?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenCreate, prefillApplication]);

  const openEditModal = (placement: Placement) => {
    setEditingPlacement(placement);
    setFormState({
      workerId: placement.workerId,
      clientId: placement.clientId,
      jobDescription: placement.jobDescription,
      agreedSalary: String(placement.agreedSalary),
      placementDate: placement.placementDate,
      probationDurationDays: String(placement.probationDurationDays),
      status: placement.status,
      additionalNotes: placement.additionalNotes,
      nextWorkerAvailability: 'Available',
    });
    setFormError('');
    setFormOpen(true);
  };

  const calculatedProbationEnd = useMemo(() => {
    const days = Number(formState.probationDurationDays);
    if (!formState.placementDate || !Number.isFinite(days) || days < 0) {
      return '';
    }
    return addDaysToIsoDate(formState.placementDate, days);
  }, [formState.placementDate, formState.probationDurationDays]);

  const filteredPlacements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dataset.placements.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (!q) return true;
      const w = dataset.workers.find((x) => x.id === p.workerId);
      const c = dataset.clients.find((x) => x.id === p.clientId);
      return (
        p.placementCode.toLowerCase().includes(q) ||
        p.jobDescription.toLowerCase().includes(q) ||
        (w?.fullName.toLowerCase().includes(q) ?? false) ||
        (c?.fullName.toLowerCase().includes(q) ?? false)
      );
    });
  }, [dataset, searchQuery, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formState.workerId) {
      setFormError('Please select a registered worker.');
      return;
    }
    if (!formState.clientId) {
      setFormError('Please select a registered client.');
      return;
    }
    if (!formState.jobDescription.trim()) {
      setFormError('Job description is required.');
      return;
    }
    const salary = Number(formState.agreedSalary);
    if (!Number.isFinite(salary) || salary <= 0) {
      setFormError('Agreed salary must be a positive UGX amount.');
      return;
    }
    const probationDays = Number(formState.probationDurationDays);
    if (!Number.isFinite(probationDays) || probationDays < 0) {
      setFormError('Probation duration must be 0 or more days.');
      return;
    }

    if (formState.status === 'Active') {
      const conflict = dataset.placements.find(
        (p) =>
          p.workerId === formState.workerId &&
          p.status === 'Active' &&
          p.id !== editingPlacement?.id
      );
      if (conflict) {
        setFormError(
          `This worker already has an active placement (${conflict.placementCode}). Complete or terminate that placement before creating another active one.`
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        workerId: formState.workerId,
        clientId: formState.clientId,
        jobDescription: formState.jobDescription.trim(),
        agreedSalary: Math.round(salary),
        placementDate: formState.placementDate,
        probationDurationDays: Math.round(probationDays),
        status: formState.status,
        additionalNotes: formState.additionalNotes.trim(),
      };

      if (editingPlacement) {
        const transitioningOutOfActive =
          editingPlacement.status === 'Active' &&
          (formState.status === 'Completed' || formState.status === 'Terminated');
        await onUpdatePlacement(
          {
            ...editingPlacement,
            ...payload,
            probationEndDate: calculatedProbationEnd,
          },
          transitioningOutOfActive ? formState.nextWorkerAvailability : undefined
        );
      } else {
        await onCreatePlacement(payload, formState.sourceApplicationId);
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save placement.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeletePlacement(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const showWorkerAvailabilitySelector =
    editingPlacement &&
    editingPlacement.status === 'Active' &&
    (formState.status === 'Completed' || formState.status === 'Terminated');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Placements
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign domestic workers to client households, manage active contracts, and compute probation dates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateModal(null)}
          disabled={dataset.workers.length === 0 || dataset.clients.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Create Placement</span>
        </button>
      </div>

      {/* Search & Status Tabs */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search placements by worker, client, job, or ID..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['All', 'Active', 'Completed', 'Terminated'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Placements Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filteredPlacements.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              No placements found.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Create a placement to connect an available worker to a client.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">Placement ID</th>
                  <th className="px-5 py-3">Worker</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Job Description</th>
                  <th className="px-5 py-3 text-right">Agreed Salary</th>
                  <th className="px-5 py-3">Placement / Probation</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlacements.map((pl) => {
                  const worker = dataset.workers.find((w) => w.id === pl.workerId);
                  const client = dataset.clients.find((c) => c.id === pl.clientId);
                  const prob = getProbationInfo(pl.probationEndDate, pl.status);
                  return (
                    <tr key={pl.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {pl.placementCode}
                        {pl.isDemo && (
                          <span className="ml-1.5 text-[11px] text-slate-400">
                            · Demo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {worker?.fullName || 'Removed Worker'}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {client?.fullName || 'Removed Client'}
                      </td>
                      <td className="px-5 py-3 max-w-xs truncate text-slate-600">
                        {pl.jobDescription}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatUgx(pl.agreedSalary)}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600 whitespace-nowrap">
                        <p className="font-mono tabular-nums">
                          {formatShortDate(pl.placementDate)} →{' '}
                          {formatShortDate(pl.probationEndDate)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {pl.probationDurationDays} days ({prob.indicator})
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <StatusText status={pl.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(pl)}
                            title="Edit or update placement status"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(pl)}
                            title="Delete placement"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Placement Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          editingPlacement
            ? `Update Placement · ${editingPlacement.placementCode}`
            : 'Create New Placement'
        }
        subtitle="Workers assigned to an Active placement are automatically marked Placed."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Worker *
              </label>
              <select
                required
                disabled={Boolean(editingPlacement)}
                value={formState.workerId}
                onChange={(e) =>
                  setFormState({ ...formState, workerId: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50 focus:border-teal-600 focus:outline-none"
              >
                <option value="">-- Select worker --</option>
                {dataset.workers.map((w) => {
                  const hasActive =
                    activeWorkerIds.has(w.id) &&
                    w.id !== editingPlacement?.workerId;
                  return (
                    <option key={w.id} value={w.id}>
                      {w.fullName} ({w.workerCode} · {w.availability}
                      {hasActive ? ' — Active Placement' : ''})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Client *
              </label>
              <select
                required
                value={formState.clientId}
                onChange={(e) => {
                  const client = dataset.clients.find(
                    (c) => c.id === e.target.value
                  );
                  setFormState({
                    ...formState,
                    clientId: e.target.value,
                    agreedSalary:
                      !editingPlacement && client
                        ? String(client.salaryBudget)
                        : formState.agreedSalary,
                  });
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="">-- Select client --</option>
                {dataset.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.clientCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Job Description *
              </label>
              <input
                type="text"
                required
                value={formState.jobDescription}
                onChange={(e) =>
                  setFormState({ ...formState, jobDescription: e.target.value })
                }
                placeholder="e.g. Live-in nanny for 2 children and general housekeeping"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Agreed Monthly Salary (UGX) *
              </label>
              <input
                type="number"
                min={50000}
                step={10000}
                required
                value={formState.agreedSalary}
                onChange={(e) =>
                  setFormState({ ...formState, agreedSalary: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Placement Status *
              </label>
              <select
                value={formState.status}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    status: e.target.value as PlacementStatus,
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Placement Date *
              </label>
              <input
                type="date"
                required
                value={formState.placementDate}
                onChange={(e) =>
                  setFormState({ ...formState, placementDate: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Probation Duration (Days) *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  max={365}
                  required
                  value={formState.probationDurationDays}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      probationDurationDays: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-600 focus:outline-none"
                />
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setFormState({
                        ...formState,
                        probationDurationDays: String(d),
                      })
                    }
                    className={`rounded-lg border px-2.5 text-xs font-mono ${
                      formState.probationDurationDays === String(d)
                        ? 'border-teal-700 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Auto-calculated Probation End Date Banner */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="h-4 w-4 text-teal-700" />
              <span>Calculated Probation End Date:</span>
            </div>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {calculatedProbationEnd
                ? formatShortDate(calculatedProbationEnd)
                : '—'}
            </span>
          </div>

          {/* Prompt to update worker availability when completing/terminating */}
          {showWorkerAvailabilitySelector && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
              <label className="mb-1.5 block text-xs font-semibold text-amber-900">
                Update Worker Availability ({formState.status} Placement)
              </label>
              <p className="mb-2 text-xs text-amber-800">
                Choose the new availability status for this worker now that the placement is {formState.status.toLowerCase()}.
              </p>
              <select
                value={formState.nextWorkerAvailability}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    nextWorkerAvailability: e.target.value as WorkerAvailability,
                  })
                }
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              >
                <option value="Available">Available (Ready for new placement)</option>
                <option value="Inactive">Inactive (Not currently seeking work)</option>
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Additional Notes
            </label>
            <textarea
              rows={2}
              value={formState.additionalNotes}
              onChange={(e) =>
                setFormState({ ...formState, additionalNotes: e.target.value })
              }
              placeholder="Contract terms, check-in schedule, or special conditions..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {isSaving
                ? 'Saving...'
                : editingPlacement
                ? 'Save Placement'
                : 'Confirm Placement'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Placement Record"
        message={
          deleteTarget
            ? `Are you sure you want to delete placement ${deleteTarget.placementCode}? If it is Active, the worker's availability will revert to Available.`
            : ''
        }
        confirmLabel="Delete Placement"
        isLoading={isDeleting}
      />
    </div>
  );
}
