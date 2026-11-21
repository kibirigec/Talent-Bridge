import React, { useMemo, useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Phone,
  MapPin,
} from 'lucide-react';
import type { AgencyDataset, Client } from '../types';
import {
  formatShortDate,
  formatUgx,
  getTodayIsoDate,
} from '../utils/formatters';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { StatusText } from './ui/StatusText';

interface ClientsViewProps {
  dataset: AgencyDataset;
  onCreateClient: (
    data: Omit<Client, 'id' | 'clientCode' | 'isDemo' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onUpdateClient: (client: Client) => Promise<void>;
  onDeleteClient: (clientId: string) => Promise<void>;
  initialOpenCreate?: boolean;
  onConsumedInitialAction?: () => void;
  inspectClientId?: string | null;
  onClearInspectClient?: () => void;
}

interface ClientFormState {
  fullName: string;
  phoneNumber: string;
  alternativePhoneNumber: string;
  residentialAddress: string;
  preferredWorkerType: string;
  salaryBudget: string;
  specialRequirements: string;
  registrationDate: string;
  additionalNotes: string;
}

function emptyClientForm(): ClientFormState {
  return {
    fullName: '',
    phoneNumber: '+256 ',
    alternativePhoneNumber: '',
    residentialAddress: '',
    preferredWorkerType: 'Live-in Housekeeper & Nanny',
    salaryBudget: '350000',
    specialRequirements: '',
    registrationDate: getTodayIsoDate(),
    additionalNotes: '',
  };
}

const WORKER_TYPE_PRESETS = [
  'Live-in Housekeeper & Nanny',
  'Live-in Nanny & Housekeeper',
  'Cook & Housekeeper',
  'Driver & Compound Caretaker',
  'Elderly Caregiver',
  'Gardener & Security',
  'Daily Househelp',
];

export function ClientsView({
  dataset,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  initialOpenCreate,
  onConsumedInitialAction,
  inspectClientId,
  onClearInspectClient,
}: ClientsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formState, setFormState] = useState<ClientFormState>(emptyClientForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [profileClient, setProfileClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (initialOpenCreate) {
      setEditingClient(null);
      setFormState(emptyClientForm());
      setFormError('');
      setFormOpen(true);
      onConsumedInitialAction?.();
    }
  }, [initialOpenCreate, onConsumedInitialAction]);

  useEffect(() => {
    if (inspectClientId) {
      const found = dataset.clients.find((c) => c.id === inspectClientId);
      if (found) setProfileClient(found);
      onClearInspectClient?.();
    }
  }, [inspectClientId, dataset.clients, onClearInspectClient]);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dataset.clients;
    return dataset.clients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q) ||
        c.clientCode.toLowerCase().includes(q) ||
        c.residentialAddress.toLowerCase().includes(q) ||
        c.preferredWorkerType.toLowerCase().includes(q)
    );
  }, [dataset.clients, searchQuery]);

  const openCreateModal = () => {
    setEditingClient(null);
    setFormState(emptyClientForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormState({
      fullName: client.fullName,
      phoneNumber: client.phoneNumber,
      alternativePhoneNumber: client.alternativePhoneNumber,
      residentialAddress: client.residentialAddress,
      preferredWorkerType: client.preferredWorkerType,
      salaryBudget: String(client.salaryBudget),
      specialRequirements: client.specialRequirements,
      registrationDate: client.registrationDate,
      additionalNotes: client.additionalNotes,
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formState.fullName.trim()) {
      setFormError('Client full name is required.');
      return;
    }
    if (!formState.phoneNumber.trim() || formState.phoneNumber.trim().length < 9) {
      setFormError('Valid phone number is required.');
      return;
    }
    if (!formState.residentialAddress.trim()) {
      setFormError('Residential address is required.');
      return;
    }
    const budget = Number(formState.salaryBudget);
    if (!Number.isFinite(budget) || budget <= 0) {
      setFormError('Salary budget must be a positive amount in UGX.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        fullName: formState.fullName.trim(),
        phoneNumber: formState.phoneNumber.trim(),
        alternativePhoneNumber: formState.alternativePhoneNumber.trim(),
        residentialAddress: formState.residentialAddress.trim(),
        preferredWorkerType: formState.preferredWorkerType.trim(),
        salaryBudget: Math.round(budget),
        specialRequirements: formState.specialRequirements.trim(),
        registrationDate: formState.registrationDate,
        additionalNotes: formState.additionalNotes.trim(),
      };
      if (editingClient) {
        await onUpdateClient({ ...editingClient, ...payload });
      } else {
        await onCreateClient(payload);
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save client.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteClient(deleteTarget.id);
      setDeleteTarget(null);
      if (profileClient?.id === deleteTarget.id) setProfileClient(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Clients & Employers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage households and employers, preferred worker criteria, and placement history.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Register Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by name, phone, address, or ID..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filteredClients.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              No clients found.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Register a household or corporate client to begin tracking placements.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              <Plus className="h-4 w-4" />
              <span>Register Client</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">Client ID</th>
                  <th className="px-5 py-3">Client Name</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Preferred Worker</th>
                  <th className="px-5 py-3 text-right">Salary Budget</th>
                  <th className="px-5 py-3 text-right">Placements</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((c) => {
                  const placementCount = dataset.placements.filter(
                    (p) => p.clientId === c.id
                  ).length;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {c.clientCode}
                        {c.isDemo && (
                          <span className="ml-1.5 text-[11px] text-slate-400">
                            · Demo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setProfileClient(c)}
                          className="font-medium text-slate-900 hover:text-teal-700 text-left"
                        >
                          {c.fullName}
                        </button>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {c.phoneNumber}
                      </td>
                      <td className="px-5 py-3 text-slate-600 max-w-xs truncate">
                        {c.residentialAddress}
                      </td>
                      <td className="px-5 py-3 text-slate-600 max-w-xs truncate">
                        {c.preferredWorkerType}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatUgx(c.salaryBudget)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {placementCount}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setProfileClient(c)}
                            title="View client profile"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            title="Edit client"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
                            title="Delete client"
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

      {/* Register / Edit Client Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          editingClient
            ? `Edit Client · ${editingClient.clientCode}`
            : 'Register New Client'
        }
        subtitle="Record household/employer details and hiring requirements."
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
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formState.fullName}
                onChange={(e) =>
                  setFormState({ ...formState, fullName: e.target.value })
                }
                placeholder="e.g. Dr. Kiggundu Ronald"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formState.phoneNumber}
                onChange={(e) =>
                  setFormState({ ...formState, phoneNumber: e.target.value })
                }
                placeholder="+256 772 000 000"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Alternative Phone Number
              </label>
              <input
                type="tel"
                value={formState.alternativePhoneNumber}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    alternativePhoneNumber: e.target.value,
                  })
                }
                placeholder="+256 702 000 000"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Registration Date *
              </label>
              <input
                type="date"
                required
                value={formState.registrationDate}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    registrationDate: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Residential Address *
              </label>
              <input
                type="text"
                required
                value={formState.residentialAddress}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    residentialAddress: e.target.value,
                  })
                }
                placeholder="e.g. Plot 14 Ministers Village, Ntinda"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Preferred Worker Type *
              </label>
              <select
                value={
                  WORKER_TYPE_PRESETS.includes(formState.preferredWorkerType)
                    ? formState.preferredWorkerType
                    : 'Custom'
                }
                onChange={(e) => {
                  if (e.target.value !== 'Custom') {
                    setFormState({
                      ...formState,
                      preferredWorkerType: e.target.value,
                    });
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                {WORKER_TYPE_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Monthly Salary Budget (UGX) *
              </label>
              <input
                type="number"
                min={50000}
                step={10000}
                required
                value={formState.salaryBudget}
                onChange={(e) =>
                  setFormState({ ...formState, salaryBudget: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Special Requirements
              </label>
              <textarea
                rows={2}
                value={formState.specialRequirements}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    specialRequirements: e.target.value,
                  })
                }
                placeholder="Languages, childcare age group, driving permit, live-in/commute..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Additional Notes
              </label>
              <textarea
                rows={2}
                value={formState.additionalNotes}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    additionalNotes: e.target.value,
                  })
                }
                placeholder="Household size, schedule notes, directions..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
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
                : editingClient
                ? 'Save Changes'
                : 'Register Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Profile Modal showing placed workers history */}
      <Modal
        isOpen={Boolean(profileClient)}
        onClose={() => setProfileClient(null)}
        title={profileClient ? profileClient.fullName : ''}
        subtitle={
          profileClient
            ? `${profileClient.clientCode} · Registered ${formatShortDate(
                profileClient.registrationDate
              )}`
            : undefined
        }
        size="lg"
      >
        {profileClient && (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
              <div className="space-y-1 text-sm text-slate-600">
                <p className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">{profileClient.phoneNumber}</span>
                  {profileClient.alternativePhoneNumber && (
                    <span className="font-mono text-slate-400">
                      · {profileClient.alternativePhoneNumber}
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{profileClient.residentialAddress}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = profileClient;
                  setProfileClient(null);
                  openEditModal(target);
                }}
                className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Client</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Preferred Worker Type</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {profileClient.preferredWorkerType}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Salary Budget</p>
                <p className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums">
                  {formatUgx(profileClient.salaryBudget)}/month
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-400">Special Requirements</p>
                <p className="mt-0.5 text-slate-700">
                  {profileClient.specialRequirements || 'None specified'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-400">Additional Notes</p>
                <p className="mt-0.5 text-slate-700">
                  {profileClient.additionalNotes || 'None'}
                </p>
              </div>
            </div>

            {/* Workers Placed With This Client */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Workers Placed With This Client
              </h3>
              {(() => {
                const clientPlacements = dataset.placements.filter(
                  (p) => p.clientId === profileClient.id
                );
                if (clientPlacements.length === 0) {
                  return (
                    <p className="mt-2 text-sm text-slate-500">
                      No workers have been placed with this client yet.
                    </p>
                  );
                }
                return (
                  <div className="mt-2 divide-y divide-slate-100">
                    {clientPlacements.map((pl) => {
                      const worker = dataset.workers.find(
                        (w) => w.id === pl.workerId
                      );
                      return (
                        <div
                          key={pl.id}
                          className="flex items-center justify-between gap-4 py-2.5 text-sm"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {worker?.fullName || 'Unknown Worker'}{' '}
                              <span className="font-mono text-xs text-slate-400">
                                ({worker?.workerCode || '—'})
                              </span>
                            </p>
                            <p className="text-xs text-slate-500">
                              {pl.jobDescription} · Started{' '}
                              {formatShortDate(pl.placementDate)} ·{' '}
                              <span className="font-mono">
                                {formatUgx(pl.agreedSalary)}/mo
                              </span>
                            </p>
                          </div>
                          <StatusText status={pl.status} />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Client Record"
        message={
          deleteTarget
            ? `Are you sure you want to remove ${deleteTarget.fullName} (${deleteTarget.clientCode})? Associated applications and payment records for this client will also be removed.`
            : ''
        }
        confirmLabel="Delete Client"
        isLoading={isDeleting}
      />
    </div>
  );
}
