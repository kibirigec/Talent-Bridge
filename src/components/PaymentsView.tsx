import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import type {
  AgencyDataset,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../types';
import {
  formatShortDate,
  formatUgx,
  generateNextCode,
  getTodayIsoDate,
} from '../utils/formatters';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { StatusText } from './ui/StatusText';

interface PaymentsViewProps {
  dataset: AgencyDataset;
  onCreatePayment: (
    data: Omit<Payment, 'id' | 'isDemo' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onUpdatePayment: (payment: Payment) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
}

interface PaymentFormState {
  paymentReference: string;
  clientId: string;
  workerId: string;
  placementId: string;
  amountUgx: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  description: string;
  status: PaymentStatus;
}

export function PaymentsView({
  dataset,
  onCreatePayment,
  onUpdatePayment,
  onDeletePayment,
}: PaymentsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');
  const [methodFilter, setMethodFilter] = useState<'All' | PaymentMethod>('All');

  const [formOpen, setFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formState, setFormState] = useState<PaymentFormState>({
    paymentReference: '',
    clientId: '',
    workerId: '',
    placementId: '',
    amountUgx: '200000',
    paymentDate: getTodayIsoDate(),
    paymentMethod: 'Mobile Money',
    description: '',
    status: 'Paid',
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalReceived = useMemo(
    () =>
      dataset.payments
        .filter((p) => p.status === 'Paid')
        .reduce((sum, p) => sum + p.amountUgx, 0),
    [dataset.payments]
  );

  const totalPending = useMemo(
    () =>
      dataset.payments
        .filter((p) => p.status === 'Pending')
        .reduce((sum, p) => sum + p.amountUgx, 0),
    [dataset.payments]
  );

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dataset.payments.filter((pay) => {
      if (statusFilter !== 'All' && pay.status !== statusFilter) return false;
      if (methodFilter !== 'All' && pay.paymentMethod !== methodFilter) return false;
      if (!q) return true;
      const client = dataset.clients.find((c) => c.id === pay.clientId);
      const worker = dataset.workers.find((w) => w.id === pay.workerId);
      return (
        pay.paymentReference.toLowerCase().includes(q) ||
        pay.description.toLowerCase().includes(q) ||
        (client?.fullName.toLowerCase().includes(q) ?? false) ||
        (worker?.fullName.toLowerCase().includes(q) ?? false)
      );
    });
  }, [dataset, searchQuery, statusFilter, methodFilter]);

  const openCreateModal = () => {
    const nextRef = generateNextCode(
      'TB-PAY',
      dataset.payments.map((p) => p.paymentReference)
    );
    setEditingPayment(null);
    setFormState({
      paymentReference: nextRef,
      clientId: dataset.clients[0]?.id || '',
      workerId: '',
      placementId: '',
      amountUgx: '200000',
      paymentDate: getTodayIsoDate(),
      paymentMethod: 'Mobile Money',
      description: 'Agency placement fee',
      status: 'Paid',
    });
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (pay: Payment) => {
    setEditingPayment(pay);
    setFormState({
      paymentReference: pay.paymentReference,
      clientId: pay.clientId,
      workerId: pay.workerId || '',
      placementId: pay.placementId || '',
      amountUgx: String(pay.amountUgx),
      paymentDate: pay.paymentDate,
      paymentMethod: pay.paymentMethod,
      description: pay.description,
      status: pay.status,
    });
    setFormError('');
    setFormOpen(true);
  };

  const handlePlacementChange = (placementId: string) => {
    const pl = dataset.placements.find((p) => p.id === placementId);
    if (pl) {
      setFormState((prev) => ({
        ...prev,
        placementId,
        clientId: pl.clientId,
        workerId: pl.workerId,
      }));
    } else {
      setFormState((prev) => ({ ...prev, placementId: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formState.paymentReference.trim()) {
      setFormError('Payment reference is required.');
      return;
    }
    if (!formState.clientId) {
      setFormError('Please select a client.');
      return;
    }
    const amount = Number(formState.amountUgx);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount in UGX must be greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        paymentReference: formState.paymentReference.trim(),
        clientId: formState.clientId,
        workerId: formState.workerId || undefined,
        placementId: formState.placementId || undefined,
        amountUgx: Math.round(amount),
        paymentDate: formState.paymentDate,
        paymentMethod: formState.paymentMethod,
        description: formState.description.trim(),
        status: formState.status,
      };
      if (editingPayment) {
        await onUpdatePayment({ ...editingPayment, ...payload });
      } else {
        await onCreatePayment(payload);
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to record payment.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaid = async (pay: Payment) => {
    await onUpdatePayment({ ...pay, status: 'Paid' });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeletePayment(deleteTarget.id);
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
            Payments Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Record and track agency placement fees, client deposits, and pending balances in UGX.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={dataset.clients.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Total Payments Received
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            {formatUgx(totalReceived)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {dataset.payments.filter((p) => p.status === 'Paid').length} settled entries
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Pending Payments</p>
          <p className="mt-2 font-display text-2xl font-bold text-amber-700 tabular-nums">
            {formatUgx(totalPending)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {dataset.payments.filter((p) => p.status === 'Pending').length} awaiting settlement
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Total Recorded Value
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {formatUgx(totalReceived + totalPending)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {dataset.payments.length} total transactions
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reference, client, worker, or description..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['All', 'Paid', 'Pending'] as const).map((st) => (
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

          <select
            aria-label="Filter by payment method"
            value={methodFilter}
            onChange={(e) =>
              setMethodFilter(e.target.value as 'All' | PaymentMethod)
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="All">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="Mobile Money">Mobile Money</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filteredPayments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              No payment records found.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Record a client payment using Cash, Mobile Money, or Bank Transfer.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Worker / Placement</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((pay) => {
                  const client = dataset.clients.find((c) => c.id === pay.clientId);
                  const worker = dataset.workers.find((w) => w.id === pay.workerId);
                  const placement = dataset.placements.find(
                    (p) => p.id === pay.placementId
                  );
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                        {pay.paymentReference}
                        {pay.isDemo && (
                          <span className="ml-1.5 text-[11px] text-slate-400">
                            · Demo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {client?.fullName || 'Unknown Client'}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {worker ? worker.fullName : '—'}
                        {placement ? ` · ${placement.placementCode}` : ''}
                      </td>
                      <td className="px-5 py-3 max-w-xs truncate text-slate-600">
                        {pay.description || '—'}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-700 whitespace-nowrap">
                        {pay.paymentMethod}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatShortDate(pay.paymentDate)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatUgx(pay.amountUgx)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusText status={pay.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {pay.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(pay)}
                              title="Mark as Paid"
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 whitespace-nowrap"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Mark Paid</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(pay)}
                            title="Edit payment"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(pay)}
                            title="Delete payment"
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

      {/* Record / Edit Payment Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          editingPayment
            ? `Edit Payment · ${editingPayment.paymentReference}`
            : 'Record Payment'
        }
        subtitle="Manual office ledger entry in Ugandan Shillings (UGX)."
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
                Payment Reference *
              </label>
              <input
                type="text"
                required
                value={formState.paymentReference}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    paymentReference: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Related Placement (Optional)
              </label>
              <select
                value={formState.placementId}
                onChange={(e) => handlePlacementChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="">-- Not tied to a placement --</option>
                {dataset.placements.map((pl) => {
                  const w = dataset.workers.find((x) => x.id === pl.workerId);
                  const c = dataset.clients.find((x) => x.id === pl.clientId);
                  return (
                    <option key={pl.id} value={pl.id}>
                      {pl.placementCode}: {w?.fullName} → {c?.fullName}
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
                onChange={(e) =>
                  setFormState({ ...formState, clientId: e.target.value })
                }
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

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Worker (Optional)
              </label>
              <select
                value={formState.workerId}
                onChange={(e) =>
                  setFormState({ ...formState, workerId: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="">-- None selected --</option>
                {dataset.workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.fullName} ({w.workerCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Amount (UGX) *
              </label>
              <input
                type="number"
                min={1000}
                step={5000}
                required
                value={formState.amountUgx}
                onChange={(e) =>
                  setFormState({ ...formState, amountUgx: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={formState.paymentDate}
                onChange={(e) =>
                  setFormState({ ...formState, paymentDate: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Payment Method *
              </label>
              <select
                value={formState.paymentMethod}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    paymentMethod: e.target.value as PaymentMethod,
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Payment Status *
              </label>
              <select
                value={formState.status}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    status: e.target.value as PaymentStatus,
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Payment Description
              </label>
              <input
                type="text"
                value={formState.description}
                onChange={(e) =>
                  setFormState({ ...formState, description: e.target.value })
                }
                placeholder="e.g. Agency placement fee (MTN Mobile Money)"
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
                : editingPayment
                ? 'Update Payment'
                : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Payment Record"
        message={
          deleteTarget
            ? `Are you sure you want to delete payment ${deleteTarget.paymentReference} (${formatUgx(
                deleteTarget.amountUgx
              )})?`
            : ''
        }
        confirmLabel="Delete Payment"
        isLoading={isDeleting}
      />
    </div>
  );
}
