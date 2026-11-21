import React, { useMemo, useState, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Eye,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  Upload,
} from 'lucide-react';
import type {
  AgencyDataset,
  Gender,
  Worker,
  WorkerAvailability,
} from '../types';
import {
  calculateAge,
  formatShortDate,
  formatUgx,
  getTodayIsoDate,
} from '../utils/formatters';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { StatusText } from './ui/StatusText';

interface WorkersViewProps {
  dataset: AgencyDataset;
  onCreateWorker: (
    data: Omit<Worker, 'id' | 'workerCode' | 'isDemo' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onUpdateWorker: (worker: Worker) => Promise<void>;
  onDeleteWorker: (workerId: string) => Promise<void>;
  initialOpenCreate?: boolean;
  onConsumedInitialAction?: () => void;
  inspectWorkerId?: string | null;
  onClearInspectWorker?: () => void;
}

const COMMON_SKILLS = [
  'Cooking',
  'Cleaning',
  'Childcare',
  'Laundry',
  'Elderly Care',
  'Gardening',
  'Driving',
  'Security',
];

const UGANDA_DISTRICTS = [
  'Kampala',
  'Wakiso',
  'Mukono',
  'Jinja',
  'Mbale',
  'Mbarara',
  'Entebbe',
  'Masaka',
  'Gulu',
  'Lira',
  'Other',
];

const EDUCATION_LEVELS = [
  'Primary Leaving (PLE)',
  'UCE (O-Level)',
  'UACE (A-Level)',
  'Vocational Certificate',
  'Certificate in Early Childhood',
  'Certificate in Nursing Aid',
  'Diploma / Degree',
  'Informal / On-the-job',
];

interface WorkerFormState {
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  phoneNumber: string;
  alternativePhoneNumber: string;
  residentialAddress: string;
  district: string;
  nextOfKin: string;
  nextOfKinContact: string;
  educationLevel: string;
  previousWorkExperience: string;
  skills: string[];
  customSkill: string;
  expectedSalary: string;
  registrationDate: string;
  photograph: string;
  additionalNotes: string;
  availability: WorkerAvailability;
}

function emptyWorkerForm(): WorkerFormState {
  return {
    fullName: '',
    gender: 'Female',
    dateOfBirth: '1997-01-01',
    phoneNumber: '+256 ',
    alternativePhoneNumber: '',
    residentialAddress: '',
    district: 'Kampala',
    nextOfKin: '',
    nextOfKinContact: '+256 ',
    educationLevel: 'UCE (O-Level)',
    previousWorkExperience: '',
    skills: ['Cleaning'],
    customSkill: '',
    expectedSalary: '300000',
    registrationDate: getTodayIsoDate(),
    photograph: '',
    additionalNotes: '',
    availability: 'Available',
  };
}

export function WorkersView({
  dataset,
  onCreateWorker,
  onUpdateWorker,
  onDeleteWorker,
  initialOpenCreate,
  onConsumedInitialAction,
  inspectWorkerId,
  onClearInspectWorker,
}: WorkersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'All' | WorkerAvailability
  >('All');
  const [skillFilter, setSkillFilter] = useState<string>('All');

  const [formOpen, setFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formState, setFormState] = useState<WorkerFormState>(emptyWorkerForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (initialOpenCreate) {
      setEditingWorker(null);
      setFormState(emptyWorkerForm());
      setFormError('');
      setFormOpen(true);
      onConsumedInitialAction?.();
    }
  }, [initialOpenCreate, onConsumedInitialAction]);

  useEffect(() => {
    if (inspectWorkerId) {
      const found = dataset.workers.find((w) => w.id === inspectWorkerId);
      if (found) setProfileWorker(found);
      onClearInspectWorker?.();
    }
  }, [inspectWorkerId, dataset.workers, onClearInspectWorker]);

  const allSkills = useMemo(() => {
    const set = new Set<string>(COMMON_SKILLS);
    dataset.workers.forEach((w) => w.skills.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [dataset.workers]);

  const filteredWorkers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dataset.workers.filter((w) => {
      if (availabilityFilter !== 'All' && w.availability !== availabilityFilter) {
        return false;
      }
      if (skillFilter !== 'All' && !w.skills.includes(skillFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        w.fullName.toLowerCase().includes(q) ||
        w.phoneNumber.toLowerCase().includes(q) ||
        w.alternativePhoneNumber.toLowerCase().includes(q) ||
        w.workerCode.toLowerCase().includes(q) ||
        w.district.toLowerCase().includes(q)
      );
    });
  }, [dataset.workers, searchQuery, availabilityFilter, skillFilter]);

  const openCreateModal = () => {
    setEditingWorker(null);
    setFormState(emptyWorkerForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (worker: Worker) => {
    setEditingWorker(worker);
    setFormState({
      fullName: worker.fullName,
      gender: worker.gender,
      dateOfBirth: worker.dateOfBirth,
      phoneNumber: worker.phoneNumber,
      alternativePhoneNumber: worker.alternativePhoneNumber,
      residentialAddress: worker.residentialAddress,
      district: worker.district,
      nextOfKin: worker.nextOfKin,
      nextOfKinContact: worker.nextOfKinContact,
      educationLevel: worker.educationLevel,
      previousWorkExperience: worker.previousWorkExperience,
      skills: [...worker.skills],
      customSkill: '',
      expectedSalary: String(worker.expectedSalary),
      registrationDate: worker.registrationDate,
      photograph: worker.photograph || '',
      additionalNotes: worker.additionalNotes,
      availability: worker.availability,
    });
    setFormError('');
    setFormOpen(true);
  };

  const toggleSkill = (skill: string) => {
    setFormState((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const addCustomSkill = () => {
    const trimmed = formState.customSkill.trim();
    if (!trimmed) return;
    if (!formState.skills.includes(trimmed)) {
      setFormState((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
        customSkill: '',
      }));
    } else {
      setFormState((prev) => ({ ...prev, customSkill: '' }));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setFormError('Photograph file must be under 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormState((prev) => ({ ...prev, photograph: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formState.fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!formState.phoneNumber.trim() || formState.phoneNumber.trim().length < 9) {
      setFormError('Please enter a valid Ugandan phone number.');
      return;
    }
    if (!formState.residentialAddress.trim()) {
      setFormError('Residential address is required.');
      return;
    }
    if (!formState.nextOfKin.trim() || !formState.nextOfKinContact.trim()) {
      setFormError('Next of kin name and contact are required.');
      return;
    }
    if (formState.skills.length === 0) {
      setFormError('Select at least one skill.');
      return;
    }
    const salaryNum = Number(formState.expectedSalary);
    if (!Number.isFinite(salaryNum) || salaryNum <= 0) {
      setFormError('Expected salary must be a positive amount in UGX.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        fullName: formState.fullName.trim(),
        gender: formState.gender,
        dateOfBirth: formState.dateOfBirth,
        phoneNumber: formState.phoneNumber.trim(),
        alternativePhoneNumber: formState.alternativePhoneNumber.trim(),
        residentialAddress: formState.residentialAddress.trim(),
        district: formState.district,
        nextOfKin: formState.nextOfKin.trim(),
        nextOfKinContact: formState.nextOfKinContact.trim(),
        educationLevel: formState.educationLevel,
        previousWorkExperience: formState.previousWorkExperience.trim(),
        skills: formState.skills,
        expectedSalary: Math.round(salaryNum),
        registrationDate: formState.registrationDate,
        photograph: formState.photograph || undefined,
        additionalNotes: formState.additionalNotes.trim(),
        availability: formState.availability,
      };

      if (editingWorker) {
        await onUpdateWorker({ ...editingWorker, ...payload });
      } else {
        await onCreateWorker(payload);
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save worker.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteWorker(deleteTarget.id);
      setDeleteTarget(null);
      if (profileWorker?.id === deleteTarget.id) {
        setProfileWorker(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Domestic Workers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Register, search, and maintain verified domestic worker profiles.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>Register Worker</span>
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone number, ID, or district..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['All', 'Available', 'Placed', 'Inactive'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setAvailabilityFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  availabilityFilter === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by skill"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="All">All Skills</option>
            {allSkills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Workers Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filteredWorkers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              No workers match your current filters.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Try clearing your search or register a new domestic worker.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register Worker</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">Worker ID</th>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">District</th>
                  <th className="px-5 py-3">Skills</th>
                  <th className="px-5 py-3 text-right">Expected Salary</th>
                  <th className="px-5 py-3">Availability</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {w.workerCode}
                      {w.isDemo && (
                        <span className="ml-1.5 text-[11px] text-slate-400">
                          · Demo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {w.photograph ? (
                          <img
                            src={w.photograph}
                            alt={w.fullName}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 shrink-0 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-display text-xs font-semibold text-slate-600">
                            {w.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                        )}
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setProfileWorker(w)}
                            className="truncate font-medium text-slate-900 hover:text-teal-700"
                          >
                            {w.fullName}
                          </button>
                          <p className="text-xs text-slate-400">
                            {w.gender}
                            {calculateAge(w.dateOfBirth) !== null
                              ? ` · ${calculateAge(w.dateOfBirth)} yrs`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {w.phoneNumber}
                    </td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {w.district}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600 max-w-xs truncate">
                      {w.skills.join(', ')}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {formatUgx(w.expectedSalary)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusText status={w.availability} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setProfileWorker(w)}
                          title="View worker profile"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(w)}
                          title="Edit worker"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(w)}
                          title="Delete worker"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register / Edit Worker Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          editingWorker
            ? `Edit Worker · ${editingWorker.workerCode}`
            : 'Register New Domestic Worker'
        }
        subtitle="Complete all required personal, contact, and skill fields."
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
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
                placeholder="e.g. Nakato Grace"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Gender *
              </label>
              <select
                value={formState.gender}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    gender: e.target.value as Gender,
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={formState.dateOfBirth}
                onChange={(e) =>
                  setFormState({ ...formState, dateOfBirth: e.target.value })
                }
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
                placeholder="+256 701 000 000"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                District *
              </label>
              <select
                value={formState.district}
                onChange={(e) =>
                  setFormState({ ...formState, district: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                {UGANDA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
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
                placeholder="e.g. Kireka Zone B, Wakiso"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Availability Status
              </label>
              <select
                value={formState.availability}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    availability: e.target.value as WorkerAvailability,
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="Available">Available</option>
                <option value="Placed">Placed</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Next of Kin *
              </label>
              <input
                type="text"
                required
                value={formState.nextOfKin}
                onChange={(e) =>
                  setFormState({ ...formState, nextOfKin: e.target.value })
                }
                placeholder="Full name of next of kin"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Next of Kin Contact *
              </label>
              <input
                type="tel"
                required
                value={formState.nextOfKinContact}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    nextOfKinContact: e.target.value,
                  })
                }
                placeholder="+256 772 000 000"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Education Level *
              </label>
              <select
                value={formState.educationLevel}
                onChange={(e) =>
                  setFormState({ ...formState, educationLevel: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                {EDUCATION_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Expected Monthly Salary (UGX) *
              </label>
              <input
                type="number"
                min={50000}
                step={10000}
                required
                value={formState.expectedSalary}
                onChange={(e) =>
                  setFormState({ ...formState, expectedSalary: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-600 focus:outline-none"
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

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Photograph (Optional)
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100">
                <Upload className="h-3.5 w-3.5" />
                <span>{formState.photograph ? 'Replace Photo' : 'Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Skills Selector */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-700">
              Skills *
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SKILLS.map((skill) => {
                const selected = formState.skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? 'border-teal-700 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 flex max-w-sm gap-2">
              <input
                type="text"
                value={formState.customSkill}
                onChange={(e) =>
                  setFormState({ ...formState, customSkill: e.target.value })
                }
                placeholder="Add another skill..."
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Previous Work Experience
              </label>
              <textarea
                rows={3}
                value={formState.previousWorkExperience}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    previousWorkExperience: e.target.value,
                  })
                }
                placeholder="Summary of prior employers, years of experience, and duties..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Additional Notes
              </label>
              <textarea
                rows={3}
                value={formState.additionalNotes}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    additionalNotes: e.target.value,
                  })
                }
                placeholder="ID verification, LC1 reference letter, languages spoken..."
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
                : editingWorker
                ? 'Save Changes'
                : 'Register Worker'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Worker Profile Inspection Modal */}
      <Modal
        isOpen={Boolean(profileWorker)}
        onClose={() => setProfileWorker(null)}
        title={profileWorker ? profileWorker.fullName : ''}
        subtitle={
          profileWorker
            ? `${profileWorker.workerCode} · Registered ${formatShortDate(
                profileWorker.registrationDate
              )}`
            : undefined
        }
        size="lg"
      >
        {profileWorker && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {profileWorker.photograph ? (
                  <img
                    src={profileWorker.photograph}
                    alt={profileWorker.fullName}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 rounded-xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 font-display text-lg font-bold text-slate-600">
                    {profileWorker.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3">
                    <StatusText status={profileWorker.availability} />
                    <span className="text-xs text-slate-400">·</span>
                    <span className="font-mono text-xs font-medium text-slate-700">
                      {formatUgx(profileWorker.expectedSalary)}/month
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {profileWorker.phoneNumber}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {profileWorker.residentialAddress}, {profileWorker.district}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const target = profileWorker;
                  setProfileWorker(null);
                  openEditModal(target);
                }}
                className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Gender & Date of Birth</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {profileWorker.gender} · {formatShortDate(profileWorker.dateOfBirth)}
                  {calculateAge(profileWorker.dateOfBirth) !== null
                    ? ` (${calculateAge(profileWorker.dateOfBirth)} yrs)`
                    : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Alternative Phone</p>
                <p className="mt-0.5 font-mono text-slate-900">
                  {profileWorker.alternativePhoneNumber || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Next of Kin</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {profileWorker.nextOfKin} ({profileWorker.nextOfKinContact})
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Education Level</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {profileWorker.educationLevel}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-400">Skills</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {profileWorker.skills.join(' · ')}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-400">Previous Work Experience</p>
                <p className="mt-0.5 text-slate-700">
                  {profileWorker.previousWorkExperience || 'No experience recorded.'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-400">Additional Notes</p>
                <p className="mt-0.5 text-slate-700">
                  {profileWorker.additionalNotes || 'None'}
                </p>
              </div>
            </div>

            {/* Placement History for Worker */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Placement History
              </h3>
              {(() => {
                const history = dataset.placements.filter(
                  (p) => p.workerId === profileWorker.id
                );
                if (history.length === 0) {
                  return (
                    <p className="mt-2 text-sm text-slate-500">
                      No placements recorded for this worker yet.
                    </p>
                  );
                }
                return (
                  <div className="mt-2 divide-y divide-slate-100">
                    {history.map((pl) => {
                      const client = dataset.clients.find(
                        (c) => c.id === pl.clientId
                      );
                      return (
                        <div
                          key={pl.id}
                          className="flex items-center justify-between py-2.5 text-sm"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {client?.fullName || 'Unknown Client'} ·{' '}
                              <span className="font-mono text-xs text-slate-500">
                                {pl.placementCode}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatShortDate(pl.placementDate)} ·{' '}
                              {formatUgx(pl.agreedSalary)}/mo
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Worker Record"
        message={
          deleteTarget
            ? `Are you sure you want to permanently remove ${deleteTarget.fullName} (${deleteTarget.workerCode})? Related applications and historical records for this worker will also be removed.`
            : ''
        }
        confirmLabel="Delete Worker"
        isLoading={isDeleting}
      />
    </div>
  );
}
