import { Download } from 'lucide-react';
import type { AgencyDataset } from '../types';
import {
  exportToCsv,
  formatUgx,
  getProbationInfo,
  getTodayIsoDate,
} from '../utils/formatters';

interface ReportsViewProps {
  dataset: AgencyDataset;
  onNotify: (msg: string) => void;
}

export function ReportsView({ dataset, onNotify }: ReportsViewProps) {
  const { workers, clients, applications, placements, payments } = dataset;

  const totalWorkers = workers.length;
  const availableWorkers = workers.filter((w) => w.availability === 'Available').length;
  const placedWorkers = workers.filter((w) => w.availability === 'Placed').length;
  const inactiveWorkers = workers.filter((w) => w.availability === 'Inactive').length;

  const totalClients = clients.length;
  const activePlacements = placements.filter((p) => p.status === 'Active').length;
  const completedPlacements = placements.filter((p) => p.status === 'Completed').length;
  const terminatedPlacements = placements.filter((p) => p.status === 'Terminated').length;

  const paidPaymentsTotal = payments
    .filter((p) => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amountUgx, 0);
  const pendingPaymentsTotal = payments
    .filter((p) => p.status === 'Pending')
    .reduce((sum, p) => sum + p.amountUgx, 0);

  const availPct = totalWorkers > 0 ? Math.round((availableWorkers / totalWorkers) * 100) : 0;
  const placedPct = totalWorkers > 0 ? Math.round((placedWorkers / totalWorkers) * 100) : 0;
  const inactivePct = Math.max(0, 100 - availPct - placedPct);

  // Payment methods breakdown
  const methodTotals = (['Mobile Money', 'Cash', 'Bank Transfer'] as const).map(
    (method) => {
      const matching = payments.filter((p) => p.paymentMethod === method && p.status === 'Paid');
      return {
        method,
        count: matching.length,
        total: matching.reduce((sum, p) => sum + p.amountUgx, 0),
      };
    }
  );

  // District distribution
  const districtBreakdown = Object.entries(
    workers.reduce<Record<string, number>>((acc, w) => {
      acc[w.district] = (acc[w.district] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const handleExportSummary = () => {
    const today = getTodayIsoDate();
    exportToCsv(
      `talent-bridge-summary-${today}.csv`,
      ['Metric', 'Value'],
      [
        ['Report Date', today],
        ['Total Registered Workers', totalWorkers],
        ['Available Workers', availableWorkers],
        ['Placed Workers', placedWorkers],
        ['Inactive Workers', inactiveWorkers],
        ['Total Registered Clients', totalClients],
        ['Total Job Applications', applications.length],
        ['Active Placements', activePlacements],
        ['Completed Placements', completedPlacements],
        ['Terminated Placements', terminatedPlacements],
        ['Total Payments Received (UGX)', paidPaymentsTotal],
        ['Pending Payments (UGX)', pendingPaymentsTotal],
      ]
    );
    onNotify('Summary report exported to CSV.');
  };

  const handleExportWorkers = () => {
    exportToCsv(
      `talent-bridge-workers-${getTodayIsoDate()}.csv`,
      [
        'Worker ID',
        'Full Name',
        'Gender',
        'DOB',
        'Phone',
        'District',
        'Address',
        'Skills',
        'Expected Salary (UGX)',
        'Availability',
        'Registration Date',
        'Record Type',
      ],
      workers.map((w) => [
        w.workerCode,
        w.fullName,
        w.gender,
        w.dateOfBirth,
        w.phoneNumber,
        w.district,
        w.residentialAddress,
        w.skills.join('; '),
        w.expectedSalary,
        w.availability,
        w.registrationDate,
        w.isDemo ? 'Demo' : 'Agency',
      ])
    );
    onNotify('Workers registry exported to CSV.');
  };

  const handleExportClients = () => {
    exportToCsv(
      `talent-bridge-clients-${getTodayIsoDate()}.csv`,
      [
        'Client ID',
        'Full Name',
        'Phone',
        'Address',
        'Preferred Worker Type',
        'Salary Budget (UGX)',
        'Registration Date',
        'Record Type',
      ],
      clients.map((c) => [
        c.clientCode,
        c.fullName,
        c.phoneNumber,
        c.residentialAddress,
        c.preferredWorkerType,
        c.salaryBudget,
        c.registrationDate,
        c.isDemo ? 'Demo' : 'Agency',
      ])
    );
    onNotify('Clients list exported to CSV.');
  };

  const handleExportPlacements = () => {
    exportToCsv(
      `talent-bridge-placements-${getTodayIsoDate()}.csv`,
      [
        'Placement ID',
        'Worker',
        'Client',
        'Job Description',
        'Agreed Salary (UGX)',
        'Placement Date',
        'Probation Days',
        'Probation End Date',
        'Probation Indicator',
        'Status',
      ],
      placements.map((pl) => {
        const w = workers.find((x) => x.id === pl.workerId);
        const c = clients.find((x) => x.id === pl.clientId);
        const prob = getProbationInfo(pl.probationEndDate, pl.status);
        return [
          pl.placementCode,
          w?.fullName || '',
          c?.fullName || '',
          pl.jobDescription,
          pl.agreedSalary,
          pl.placementDate,
          pl.probationDurationDays,
          pl.probationEndDate,
          prob.indicator,
          pl.status,
        ];
      })
    );
    onNotify('Placements report exported to CSV.');
  };

  const handleExportPayments = () => {
    exportToCsv(
      `talent-bridge-payments-${getTodayIsoDate()}.csv`,
      [
        'Reference',
        'Client',
        'Worker',
        'Amount (UGX)',
        'Date',
        'Method',
        'Description',
        'Status',
      ],
      payments.map((pay) => {
        const c = clients.find((x) => x.id === pay.clientId);
        const w = workers.find((x) => x.id === pay.workerId);
        return [
          pay.paymentReference,
          c?.fullName || '',
          w?.fullName || '',
          pay.amountUgx,
          pay.paymentDate,
          pay.paymentMethod,
          pay.description,
          pay.status,
        ];
      })
    );
    onNotify('Payments ledger exported to CSV.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Agency Reports & CSV Exports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Summary metrics computed from live agency records with one-click CSV downloads.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportSummary}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>Export Summary CSV</span>
        </button>
      </div>

      {/* Core Report Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Total Registered Workers
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {totalWorkers}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {availableWorkers} available · {placedWorkers} placed · {inactiveWorkers} inactive
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Total Registered Clients
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {totalClients}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {applications.length} total job applications logged
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Active vs Completed Placements
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {activePlacements} active · {completedPlacements} completed
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {terminatedPlacements} terminated placements
          </p>
        </div>
      </div>

      {/* Available vs Placed Workers Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Available vs Placed Workers
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Workforce readiness distribution across registered candidates.
          </p>

          <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {availPct > 0 && (
              <div
                style={{ width: `${availPct}%` }}
                className="bg-emerald-600"
                title={`Available: ${availableWorkers}`}
              />
            )}
            {placedPct > 0 && (
              <div
                style={{ width: `${placedPct}%` }}
                className="bg-teal-700"
                title={`Placed: ${placedWorkers}`}
              />
            )}
            {inactivePct > 0 && (
              <div
                style={{ width: `${inactivePct}%` }}
                className="bg-slate-400"
                title={`Inactive: ${inactiveWorkers}`}
              />
            )}
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Available</span>
              <span className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                {availableWorkers} ({availPct}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Currently Placed</span>
              <span className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                {placedWorkers} ({placedPct}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Inactive</span>
              <span className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                {inactiveWorkers} ({inactivePct}%)
              </span>
            </div>
          </div>
        </section>

        {/* Financial Revenue Breakdown */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Total Payments Received (UGX)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Collected fees grouped by payment method, plus outstanding pending amounts.
          </p>

          <div className="mt-4 flex items-baseline justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs text-slate-500">Total Received</p>
              <p className="font-display text-2xl font-bold text-emerald-700 tabular-nums">
                {formatUgx(paidPaymentsTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="font-mono text-base font-semibold text-amber-700 tabular-nums">
                {formatUgx(pendingPaymentsTotal)}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 text-sm">
            {methodTotals.map((row) => (
              <div key={row.method} className="flex items-center justify-between">
                <span className="text-slate-600">
                  {row.method}{' '}
                  <span className="text-xs text-slate-400">({row.count})</span>
                </span>
                <span className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                  {formatUgx(row.total)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* District Breakdown & CSV Export Buttons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Workers by District
          </h2>
          {districtBreakdown.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No worker records yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 text-sm">
              {districtBreakdown.map(([district, count]) => (
                <div
                  key={district}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="text-slate-700">{district}</span>
                  <span className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Download Module CSV Exports
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Export individual tables for offline spreadsheets, audits, or backup.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleExportWorkers}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <span>Workers CSV</span>
              <Download className="h-4 w-4 text-slate-500" />
            </button>
            <button
              type="button"
              onClick={handleExportClients}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <span>Clients CSV</span>
              <Download className="h-4 w-4 text-slate-500" />
            </button>
            <button
              type="button"
              onClick={handleExportPlacements}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <span>Placements CSV</span>
              <Download className="h-4 w-4 text-slate-500" />
            </button>
            <button
              type="button"
              onClick={handleExportPayments}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <span>Payments CSV</span>
              <Download className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
