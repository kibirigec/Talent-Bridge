import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Briefcase,
  Banknote,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
} from 'lucide-react';
import type {
  AgencyDataset,
  NavSection,
  RecordScope,
  StaffProfile,
} from '../types';
import { formatUgx } from '../utils/formatters';

interface LayoutShellProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  user: StaffProfile;
  onLogout: () => void;
  dataset: AgencyDataset;
  recordScope: RecordScope;
  onQuickJump: (section: NavSection, recordId?: string) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workers', label: 'Workers', icon: Users },
  { id: 'clients', label: 'Clients', icon: Building2 },
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'placements', label: 'Placements', icon: Briefcase },
  { id: 'payments', label: 'Payments', icon: Banknote },
  { id: 'probation', label: 'Probation', icon: Clock },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function LayoutShell({
  activeSection,
  onSelectSection,
  user,
  onLogout,
  dataset,
  recordScope,
  onQuickJump,
  children,
}: LayoutShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return null;

    const workers = dataset.workers
      .filter(
        (w) =>
          w.fullName.toLowerCase().includes(q) ||
          w.phoneNumber.toLowerCase().includes(q) ||
          w.workerCode.toLowerCase().includes(q) ||
          w.district.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const clients = dataset.clients
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phoneNumber.toLowerCase().includes(q) ||
          c.clientCode.toLowerCase().includes(q) ||
          c.residentialAddress.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const applications = dataset.applications
      .filter((a) => {
        const w = dataset.workers.find((x) => x.id === a.workerId);
        const c = dataset.clients.find((x) => x.id === a.clientId);
        return (
          a.applicationCode.toLowerCase().includes(q) ||
          a.workType.toLowerCase().includes(q) ||
          w?.fullName.toLowerCase().includes(q) ||
          c?.fullName.toLowerCase().includes(q)
        );
      })
      .slice(0, 4);

    const placements = dataset.placements
      .filter((p) => {
        const w = dataset.workers.find((x) => x.id === p.workerId);
        const c = dataset.clients.find((x) => x.id === p.clientId);
        return (
          p.placementCode.toLowerCase().includes(q) ||
          p.jobDescription.toLowerCase().includes(q) ||
          w?.fullName.toLowerCase().includes(q) ||
          c?.fullName.toLowerCase().includes(q)
        );
      })
      .slice(0, 4);

    const payments = dataset.payments
      .filter((pay) => {
        const c = dataset.clients.find((x) => x.id === pay.clientId);
        return (
          pay.paymentReference.toLowerCase().includes(q) ||
          pay.description.toLowerCase().includes(q) ||
          c?.fullName.toLowerCase().includes(q)
        );
      })
      .slice(0, 4);

    const total =
      workers.length +
      clients.length +
      applications.length +
      placements.length +
      payments.length;

    return { workers, clients, applications, placements, payments, total };
  }, [globalQuery, dataset]);

  const activeLabel =
    NAV_ITEMS.find((item) => item.id === activeSection)?.label || 'Dashboard';

  const handleSelectNav = (id: NavSection) => {
    onSelectSection(id);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 font-display text-xs font-bold text-white">
              TB
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold text-slate-900">
                Talent Bridge
              </p>
              <p className="truncate text-xs text-slate-500">Ntinda, Kampala</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-teal-700' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-3">
          <p className="truncate text-sm font-medium text-slate-900">
            {user.fullName}
          </p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4 text-slate-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-50 w-64 max-w-[80vw] border-r border-slate-200 bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="hidden text-slate-400 sm:inline">
                    Talent Bridge
                  </span>
                  <span className="hidden text-slate-300 sm:inline">/</span>
                  <span className="truncate font-display font-semibold text-slate-900">
                    {activeLabel}
                  </span>
                </div>
                {recordScope === 'agency_only' && (
                  <p className="text-xs text-teal-700">
                    Viewing Agency Records Only (Demo hidden)
                  </p>
                )}
              </div>
            </div>

            {/* Global Search */}
            <div
              ref={searchContainerRef}
              className="relative w-full max-w-xs sm:max-w-sm"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={globalQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setGlobalQuery(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="Search workers, clients, IDs..."
                aria-label="Global search across agency records"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
              />

              {searchFocused && searchResults && (
                <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg sm:w-96">
                  {searchResults.total === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">
                      No matching records found for "{globalQuery}".
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.workers.length > 0 && (
                        <div>
                          <p className="px-2.5 py-1 text-xs font-medium text-slate-400">
                            Workers
                          </p>
                          {searchResults.workers.map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                onQuickJump('workers', w.id);
                                setSearchFocused(false);
                                setGlobalQuery('');
                              }}
                              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              <span className="truncate font-medium text-slate-900">
                                {w.fullName}
                              </span>
                              <span className="ml-2 shrink-0 font-mono text-xs text-slate-500">
                                {w.workerCode} · {w.availability}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.clients.length > 0 && (
                        <div>
                          <p className="px-2.5 py-1 text-xs font-medium text-slate-400">
                            Clients
                          </p>
                          {searchResults.clients.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                onQuickJump('clients', c.id);
                                setSearchFocused(false);
                                setGlobalQuery('');
                              }}
                              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              <span className="truncate font-medium text-slate-900">
                                {c.fullName}
                              </span>
                              <span className="ml-2 shrink-0 font-mono text-xs text-slate-500">
                                {c.clientCode}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.applications.length > 0 && (
                        <div>
                          <p className="px-2.5 py-1 text-xs font-medium text-slate-400">
                            Applications
                          </p>
                          {searchResults.applications.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                onQuickJump('applications', a.id);
                                setSearchFocused(false);
                                setGlobalQuery('');
                              }}
                              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              <span className="truncate font-medium text-slate-900">
                                {a.workType}
                              </span>
                              <span className="ml-2 shrink-0 font-mono text-xs text-slate-500">
                                {a.applicationCode} · {a.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.placements.length > 0 && (
                        <div>
                          <p className="px-2.5 py-1 text-xs font-medium text-slate-400">
                            Placements
                          </p>
                          {searchResults.placements.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onQuickJump('placements', p.id);
                                setSearchFocused(false);
                                setGlobalQuery('');
                              }}
                              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              <span className="truncate font-medium text-slate-900">
                                {p.jobDescription}
                              </span>
                              <span className="ml-2 shrink-0 font-mono text-xs text-slate-500">
                                {p.placementCode} · {p.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.payments.length > 0 && (
                        <div>
                          <p className="px-2.5 py-1 text-xs font-medium text-slate-400">
                            Payments
                          </p>
                          {searchResults.payments.map((pay) => (
                            <button
                              key={pay.id}
                              type="button"
                              onClick={() => {
                                onQuickJump('payments', pay.id);
                                setSearchFocused(false);
                                setGlobalQuery('');
                              }}
                              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              <span className="truncate font-mono font-medium text-slate-900">
                                {pay.paymentReference}
                              </span>
                              <span className="ml-2 shrink-0 font-mono text-xs text-slate-500">
                                {formatUgx(pay.amountUgx)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
