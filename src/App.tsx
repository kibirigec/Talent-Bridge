/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import type {
  AgencyDataset,
  Client,
  JobApplication,
  NavSection,
  Payment,
  Placement,
  RecordScope,
  StaffProfile,
  ToastMessage,
  Worker,
  WorkerAvailability,
} from './types';
import { agencyService } from './services/agencyService';
import { generateUuid } from './utils/formatters';
import { PublicPortalView } from './components/PublicPortalView';
import { LoginView } from './components/LoginView';
import { LayoutShell } from './components/LayoutShell';
import { DashboardView } from './components/DashboardView';
import { WorkersView } from './components/WorkersView';
import { ClientsView } from './components/ClientsView';
import { ApplicationsView } from './components/ApplicationsView';
import { PlacementsView } from './components/PlacementsView';
import { PaymentsView } from './components/PaymentsView';
import { ProbationView } from './components/ProbationView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<StaffProfile | null>(null);
  const [showStaffLogin, setShowStaffLogin] = useState(false);

  const [dataset, setDataset] = useState<AgencyDataset>({
    workers: [],
    clients: [],
    applications: [],
    placements: [],
    payments: [],
  });
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [recordScope, setRecordScope] = useState<RecordScope>(() =>
    agencyService.getRecordScope()
  );

  // Cross-module quick actions & inspection triggers
  const [openCreateWorker, setOpenCreateWorker] = useState(false);
  const [openCreateClient, setOpenCreateClient] = useState(false);
  const [openCreatePlacement, setOpenCreatePlacement] = useState(false);
  const [prefillPlacementApp, setPrefillPlacementApp] =
    useState<JobApplication | null>(null);
  const [inspectWorkerId, setInspectWorkerId] = useState<string | null>(null);
  const [inspectClientId, setInspectClientId] = useState<string | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (type: ToastMessage['type'], message: string) => {
      const id = generateUuid();
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const refreshDataset = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const data = await agencyService.loadDataset();
      setDataset(data);
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Failed to load agency records.'
      );
    } finally {
      setIsLoadingData(false);
    }
  }, [pushToast]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await agencyService.getCurrentSession();
        if (!mounted) return;
        setUser(session);
        if (session) {
          await refreshDataset();
        }
      } finally {
        if (mounted) setAuthChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshDataset]);

  const visibleDataset = useMemo<AgencyDataset>(() => {
    if (recordScope === 'all') return dataset;
    return {
      workers: dataset.workers.filter((w) => !w.isDemo),
      clients: dataset.clients.filter((c) => !c.isDemo),
      applications: dataset.applications.filter((a) => !a.isDemo),
      placements: dataset.placements.filter((p) => !p.isDemo),
      payments: dataset.payments.filter((pay) => !pay.isDemo),
    };
  }, [dataset, recordScope]);

  const handleLogin = async (email: string, password: string) => {
    const profile = await agencyService.signIn(email, password);
    setUser(profile);
    await refreshDataset();
    pushToast('success', `Welcome back, ${profile.fullName}.`);
  };

  const handleLogout = async () => {
    await agencyService.signOut();
    setUser(null);
    setActiveSection('dashboard');
  };

  // --- CRUD Handlers ---
  const handleCreateWorker = async (
    input: Omit<Worker, 'id' | 'workerCode' | 'isDemo' | 'createdAt' | 'updatedAt'>
  ) => {
    const created = await agencyService.createWorker(input, dataset.workers);
    await refreshDataset();
    pushToast('success', `Registered ${created.fullName} (${created.workerCode}).`);
  };

  const handleUpdateWorker = async (worker: Worker) => {
    const updated = await agencyService.updateWorker(worker);
    await refreshDataset();
    pushToast('success', `Updated worker ${updated.fullName}.`);
  };

  const handleDeleteWorker = async (workerId: string) => {
    try {
      await agencyService.deleteWorker(workerId, dataset.placements);
      await refreshDataset();
      pushToast('success', 'Worker record deleted.');
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Unable to delete worker.'
      );
      throw err;
    }
  };

  const handleCreateClient = async (
    input: Omit<Client, 'id' | 'clientCode' | 'isDemo' | 'createdAt' | 'updatedAt'>
  ) => {
    const created = await agencyService.createClient(input, dataset.clients);
    await refreshDataset();
    pushToast('success', `Registered client ${created.fullName} (${created.clientCode}).`);
  };

  const handleUpdateClient = async (client: Client) => {
    const updated = await agencyService.updateClient(client);
    await refreshDataset();
    pushToast('success', `Updated client ${updated.fullName}.`);
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      await agencyService.deleteClient(clientId, dataset.placements);
      await refreshDataset();
      pushToast('success', 'Client record deleted.');
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Unable to delete client.'
      );
      throw err;
    }
  };

  const handleCreateApplication = async (
    input: Omit<
      JobApplication,
      'id' | 'applicationCode' | 'isDemo' | 'createdAt' | 'updatedAt'
    >
  ) => {
    const created = await agencyService.createApplication(
      input,
      dataset.applications
    );
    await refreshDataset();
    pushToast('success', `Created application ${created.applicationCode}.`);
  };

  const handleUpdateApplication = async (app: JobApplication) => {
    const updated = await agencyService.updateApplication(app);
    await refreshDataset();
    pushToast('success', `Updated ${updated.applicationCode} (${updated.status}).`);
  };

  const handleDeleteApplication = async (applicationId: string) => {
    await agencyService.deleteApplication(applicationId);
    await refreshDataset();
    pushToast('success', 'Application deleted.');
  };

  const handleCreatePlacement = async (
    input: Omit<
      Placement,
      'id' | 'placementCode' | 'probationEndDate' | 'isDemo' | 'createdAt' | 'updatedAt'
    >,
    sourceApplicationId?: string
  ) => {
    const res = await agencyService.createPlacement(
      input,
      dataset.placements,
      sourceApplicationId
    );
    await refreshDataset();
    pushToast(
      'success',
      `Placement ${res.placement.placementCode} created.${
        res.updatedWorkerAvailability ? ' Worker status updated to Placed.' : ''
      }`
    );
  };

  const handleUpdatePlacement = async (
    placement: Placement,
    workerAvailabilityOverride?: WorkerAvailability
  ) => {
    const updated = await agencyService.updatePlacement(
      placement,
      dataset.placements,
      workerAvailabilityOverride
    );
    await refreshDataset();
    pushToast('success', `Updated placement ${updated.placementCode}.`);
  };

  const handleDeletePlacement = async (placementId: string) => {
    await agencyService.deletePlacement(placementId);
    await refreshDataset();
    pushToast('success', 'Placement deleted.');
  };

  const handleCreatePayment = async (
    input: Omit<Payment, 'id' | 'isDemo' | 'createdAt' | 'updatedAt'>
  ) => {
    const created = await agencyService.createPayment(input);
    await refreshDataset();
    pushToast('success', `Recorded payment ${created.paymentReference}.`);
  };

  const handleUpdatePayment = async (payment: Payment) => {
    const updated = await agencyService.updatePayment(payment);
    await refreshDataset();
    pushToast('success', `Updated payment ${updated.paymentReference}.`);
  };

  const handleDeletePayment = async (paymentId: string) => {
    await agencyService.deletePayment(paymentId);
    await refreshDataset();
    pushToast('success', 'Payment record deleted.');
  };

  const handleChangeRecordScope = (scope: RecordScope) => {
    setRecordScope(scope);
    agencyService.setRecordScope(scope);
    pushToast(
      'info',
      scope === 'agency_only'
        ? 'Showing agency records only.'
        : 'Showing all records including demo data.'
    );
  };

  const handleClearDemoData = async () => {
    const next = await agencyService.clearDemoData();
    setDataset(next);
    pushToast('success', 'Demo data cleared. Agency records preserved.');
  };

  const handleRestoreDemoData = async () => {
    const next = await agencyService.restoreDemoData();
    setDataset(next);
    pushToast('success', 'Demo dataset restored.');
  };

  const handleReconnectSupabase = async () => {
    const session = await agencyService.getCurrentSession();
    setUser(session);
    if (session) {
      await refreshDataset();
    }
  };

  const handleQuickAction = (
    action: 'register_worker' | 'add_client' | 'create_placement'
  ) => {
    if (action === 'register_worker') {
      setOpenCreateWorker(true);
      setActiveSection('workers');
    } else if (action === 'add_client') {
      setOpenCreateClient(true);
      setActiveSection('clients');
    } else {
      setOpenCreatePlacement(true);
      setActiveSection('placements');
    }
  };

  const handleQuickJump = (section: NavSection, recordId?: string) => {
    setActiveSection(section);
    if (section === 'workers' && recordId) setInspectWorkerId(recordId);
    if (section === 'clients' && recordId) setInspectClientId(recordId);
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-700" />
          <p className="mt-3 text-sm text-slate-500">Loading Talent Bridge...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {showStaffLogin ? (
          <LoginView
            onLogin={handleLogin}
            onBackToPortal={() => setShowStaffLogin(false)}
          />
        ) : (
          <PublicPortalView onGoToStaffLogin={() => setShowStaffLogin(true)} />
        )}
        <ToastStack toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </>
    );
  }

  return (
    <>
      <LayoutShell
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        user={user}
        onLogout={handleLogout}
        dataset={visibleDataset}
        recordScope={recordScope}
        onQuickJump={handleQuickJump}
      >
        {isLoadingData && dataset.workers.length === 0 ? (
          <div className="space-y-4">
            <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeSection === 'dashboard' && (
              <DashboardView
                dataset={visibleDataset}
                onNavigate={setActiveSection}
                onQuickAction={handleQuickAction}
                onInspectWorker={(workerId) => {
                  setInspectWorkerId(workerId);
                  setActiveSection('workers');
                }}
              />
            )}

            {activeSection === 'workers' && (
              <WorkersView
                dataset={visibleDataset}
                onCreateWorker={handleCreateWorker}
                onUpdateWorker={handleUpdateWorker}
                onDeleteWorker={handleDeleteWorker}
                initialOpenCreate={openCreateWorker}
                onConsumedInitialAction={() => setOpenCreateWorker(false)}
                inspectWorkerId={inspectWorkerId}
                onClearInspectWorker={() => setInspectWorkerId(null)}
              />
            )}

            {activeSection === 'clients' && (
              <ClientsView
                dataset={visibleDataset}
                onCreateClient={handleCreateClient}
                onUpdateClient={handleUpdateClient}
                onDeleteClient={handleDeleteClient}
                initialOpenCreate={openCreateClient}
                onConsumedInitialAction={() => setOpenCreateClient(false)}
                inspectClientId={inspectClientId}
                onClearInspectClient={() => setInspectClientId(null)}
              />
            )}

            {activeSection === 'applications' && (
              <ApplicationsView
                dataset={visibleDataset}
                onCreateApplication={handleCreateApplication}
                onUpdateApplication={handleUpdateApplication}
                onDeleteApplication={handleDeleteApplication}
                onConvertToPlacement={(app) => {
                  setPrefillPlacementApp(app);
                  setActiveSection('placements');
                }}
              />
            )}

            {activeSection === 'placements' && (
              <PlacementsView
                dataset={visibleDataset}
                onCreatePlacement={handleCreatePlacement}
                onUpdatePlacement={handleUpdatePlacement}
                onDeletePlacement={handleDeletePlacement}
                initialOpenCreate={openCreatePlacement}
                prefillApplication={prefillPlacementApp}
                onConsumedInitialAction={() => {
                  setOpenCreatePlacement(false);
                  setPrefillPlacementApp(null);
                }}
              />
            )}

            {activeSection === 'payments' && (
              <PaymentsView
                dataset={visibleDataset}
                onCreatePayment={handleCreatePayment}
                onUpdatePayment={handleUpdatePayment}
                onDeletePayment={handleDeletePayment}
              />
            )}

            {activeSection === 'probation' && (
              <ProbationView
                dataset={visibleDataset}
                onUpdatePlacement={handleUpdatePlacement}
              />
            )}

            {activeSection === 'reports' && (
              <ReportsView
                dataset={visibleDataset}
                onNotify={(msg) => pushToast('success', msg)}
              />
            )}

            {activeSection === 'settings' && (
              <SettingsView
                user={user}
                fullDataset={dataset}
                recordScope={recordScope}
                onChangeRecordScope={handleChangeRecordScope}
                onClearDemoData={handleClearDemoData}
                onRestoreDemoData={handleRestoreDemoData}
                onReconnectSupabase={handleReconnectSupabase}
                onNotify={(msg) => pushToast('info', msg)}
              />
            )}
          </>
        )}
      </LayoutShell>

      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
      />
    </>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : toast.type === 'success'
              ? 'border-emerald-200 bg-white text-slate-900'
              : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss message"
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
