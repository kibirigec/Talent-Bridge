import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowRightCircle,
} from 'lucide-react';
import type {
  AgencyDataset,
  ApplicationStatus,
  JobApplication,
} from '../types';
import { formatShortDate, getTodayIsoDate } from '../utils/formatters';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { StatusText } from './ui/StatusText';

interface ApplicationsViewProps {
  dataset: AgencyDataset;
  onCreateApplication: (
    data: Omit<
      JobApplication,
      'id' | 'applicationCode' | 'isDemo' | 'createdAt' | 'updatedAt'
    >
  ) => Promise<void>;
  onUpdateApplication: (app: JobApplication) => Promise<void>;
  onDeleteApplication: (applicationId: string) => Promise<void>;
  onConvertToPlacement: (app: JobApplication) => void;
}

const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Pending',
  'Under Review',
  'Approved',
  'Rejected',
  'Placed',
];

interface AppFormState {
  workerId: string;
  clientId: string;
  workType: string;
  applicationDate: string;
  status: ApplicationStatus;
  notes: string;
}

export function ApplicationsView({
  dataset,
  onCreateApplication,
  onUpdateApplication,
  onDeleteApplication,
  onConvertToPlacement,
}: ApplicationsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ApplicationStatus>('All');

  const [formOpen, setFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [formState, setFormState] = useState<AppFormState>({
    workerId: '',
    clientId: '',
    workType: '',
    applicationDate: getTodayIsoDate(),
    status: 'Pending',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dataset.applications.filter((a) => {
      if (statusFilter !== 'All' && a.status !== statusFilter) return false;
      if (!q) return true;
      const w = dataset.workers.find((x) => x.id === a.workerId);
      const c = dataset.clients.find((x) => x.id === a.clientId);
      return (
        a.applicationCode.toLowerCase().includes(q) ||
        a.workType.toLowerCase().includes(q) ||
        a.notes.toLowerCase().includes(q) ||
        (w?.fullName.toLowerCase().includes(q) ?? false) ||
        (c?.fullName.toLowerCase().includes(q) ?? false)
      );
    });
  }, [dataset, searchQuery, statusFilter]);

  const openCreateModal = () => {
    const firstWorker =
      dataset.workers.find((w) => w.availability === 'Available') ||
      dataset.workers[0];
    const firstClient = dataset.clients[0];
    setEditingApp(null);
    setFormState({
      workerId: firstWorker?.id || '',
      clientId: firstClient?.id || '',
      workType: firstClient?.preferredWorkerType || 'Housekeeper & Nanny',
      applicationDate: getTodayIsoDate(),
      status: 'Pending',
      notes: '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (app: JobApplication) => {
    setEditingApp(app);
    setFormState({
      workerId: app.workerId,
      clientId: app.clientId || '',
      workType: app.workType,
      applicationDate: app.applicationDate,
      status: app.status,
      notes: app.notes,
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formState.workerId) {
      setFormError('Please select a registered worker.');
      return;
    }
    if (!formState.workType.trim()) {
      setFormError('Please specify the type of work required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        workerId: formState.workerId,
        clientId: formState.clientId || undefined,
        workType: formState.workType.trim(),
        applicationDate: formState.applicationDate,
        status: formState.status,
        notes: formState.notes.trim(),
      };
      if (editingApp) {
        await onUpdateApplication({ ...editingApp, ...payload });
      } else {
        await onCreateApplication(payload);
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save application.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleInlineStatusChange = async (
    app: JobApplication,
    nextStatus: ApplicationStatus
  ) => {
    await onUpdateApplication({ ...app, status: nextStatus });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteApplication(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Job Applications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track candidate applications, screening reviews, approvals, and placement conversions.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={dataset.workers.length === 0 || dataset.clients.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Application</span>
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
            placeholder="Search by worker, client, work type, or ID..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['All', ...APPLICATION_STATUSES] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filteredApplications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              No job applications found.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Create an application linking a registered worker to a client request.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">App ID</th>
                  <th className="px-5 py-3">Worker</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Work Required</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => {
                  const worker = dataset.workers.find((w) => w.id === app.workerId);
                  const client = dataset.clients.find((c) => c.id === app.clientId);
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {app.applicationCode}
                        {app.isDemo && (
                          <span className="ml-1.5 text-[11px] text-slate-400">
                            · Demo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">
                          {worker?.fullName || 'Removed Worker'}
                        </p>
                        <p className="font-mono text-xs text-slate-400">
                          {worker?.workerCode || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-slate-800">
                          {app.clientId
                            ? client?.fullName || 'Removed Client'
                            : 'General Application'}
                        </p>
                        <p className="font-mono text-xs text-slate-400">
                          {app.clientId ? client?.clientCode || '—' : 'Unassigned'}
                        </p>
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <p className="truncate text-slate-800">{app.workType}</p>
                        {app.notes && (
                          <p className="truncate text-xs text-slate-400">
                            {app.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatShortDate(app.applicationDate)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <StatusText status={app.status} />
                          <select
                            aria-label={`Change status for ${app.applicationCode}`}
                            value={app.status}
                            onChange={(e) =>
                              handleInlineStatusChange(
                                app,
                                e.target.value as ApplicationStatus
                              )
                            }
                            className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 focus:border-teal-600 focus:outline-none"
                          >
                            {APPLICATION_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {app.status === 'Approved' && (
                            <button
                              type="button"
                              onClick={() => onConvertToPlacement(app)}
                              title="Convert approved application to placement"
                              className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100 whitespace-nowrap"
                            >
                              <ArrowRightCircle className="h-3.5 w-3.5" />
                              <span>Place</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(app)}
                            title="Edit application"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(app)}
                            title="Delete application"
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          editingApp
            ? `Edit Application · ${editingApp.applicationCode}`
            : 'Create Job Application'
        }
        subtitle="Match a registered domestic worker with a client opening."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Select Worker *
            </label>
            <select
              required
              value={formState.workerId}
              onChange={(e) =>
                setFormState({ ...formState, workerId: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="">-- Choose registered worker --</option>
              {dataset.workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.fullName} ({w.workerCode} · {w.availability})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Select Client (Optional for general applications)
            </label>
            <select
              value={formState.clientId}
              onChange={(e) => {
                const c = dataset.clients.find((x) => x.id === e.target.value);
                setFormState({
                  ...formState,
                  clientId: e.target.value,
                  workType:
                    !editingApp && c ? c.preferredWorkerType : formState.workType,
                });
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="">-- General Application (Unassigned) --</option>
              {dataset.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.clientCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Type of Work Required *
            </label>
            <input
              type="text"
              required
              value={formState.workType}
              onChange={(e) =>
                setFormState({ ...formState, workType: e.target.value })
              }
              placeholder="e.g. Live-in Nanny & Housekeeper"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Application Date *
              </label>
              <input
                type="date"
                required
                value={formState.applicationDate}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    applicationDate: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Status *
              </label>
              <select
                value={formState.status}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    status: e.target.value as ApplicationStatus,
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                {APPLICATION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Application Notes
            </label>
            <textarea
              rows={3}
              value={formState.notes}
              onChange={(e) =>
                setFormState({ ...formState, notes: e.target.value })
              }
              placeholder="Interview outcome, reference check status, or client feedback..."
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
                : editingApp
                ? 'Update Application'
                : 'Create Application'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Application"
        message={
          deleteTarget
            ? `Are you sure you want to delete application ${deleteTarget.applicationCode}?`
            : ''
        }
        confirmLabel="Delete Application"
        isLoading={isDeleting}
      />
    </div>
  );
}
