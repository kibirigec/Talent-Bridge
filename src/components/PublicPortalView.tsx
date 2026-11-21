import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Search,
  UserCheck,
  MapPin,
  Phone,
  ArrowRight,
} from 'lucide-react';
import type { Gender, PublicOpenJob, PublicStatusResult } from '../types';
import { agencyService } from '../services/agencyService';
import { formatShortDate, formatUgx } from '../utils/formatters';
import { StatusText } from './ui/StatusText';

interface PublicPortalViewProps {
  onGoToStaffLogin: () => void;
}

type PortalTab = 'apply' | 'request' | 'status';

const SKILLS_LIST = [
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

const WORKER_TYPE_PRESETS = [
  'Live-in Housekeeper & Nanny',
  'Live-in Nanny & Housekeeper',
  'Cook & Housekeeper',
  'Driver & Compound Caretaker',
  'Elderly Caregiver',
  'Gardener & Security',
  'Daily Househelp',
];

export function PublicPortalView({ onGoToStaffLogin }: PublicPortalViewProps) {
  const [activeTab, setActiveTab] = useState<PortalTab>('apply');
  const [openJobs, setOpenJobs] = useState<PublicOpenJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [heroImgError, setHeroImgError] = useState(false);

  // Worker application state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [wFullName, setWFullName] = useState('');
  const [wGender, setWGender] = useState<Gender>('Female');
  const [wDob, setWDob] = useState('1998-01-01');
  const [wPhone, setWPhone] = useState('+256 ');
  const [wAltPhone, setWAltPhone] = useState('');
  const [wAddress, setWAddress] = useState('');
  const [wDistrict, setWDistrict] = useState('Kampala');
  const [wNextOfKin, setWNextOfKin] = useState('');
  const [wNextOfKinContact, setWNextOfKinContact] = useState('+256 ');
  const [wEducation, setWEducation] = useState('UCE (O-Level)');
  const [wExperience, setWExperience] = useState('');
  const [wSkills, setWSkills] = useState<string[]>(['Cleaning', 'Cooking']);
  const [wExpectedSalary, setWExpectedSalary] = useState('350000');
  const [wWorkType, setWWorkType] = useState('Live-in Housekeeper & Nanny');
  const [wNotes, setWNotes] = useState('');
  const [wSubmitting, setWSubmitting] = useState(false);
  const [wError, setWError] = useState('');
  const [wSuccess, setWSuccess] = useState<{
    workerCode: string;
    applicationCode: string;
  } | null>(null);

  // Client request state
  const [cFullName, setCFullName] = useState('');
  const [cPhone, setCPhone] = useState('+256 ');
  const [cAltPhone, setCAltPhone] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cWorkerType, setCWorkerType] = useState('Live-in Housekeeper & Nanny');
  const [cBudget, setCBudget] = useState('380000');
  const [cRequirements, setCRequirements] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [cSubmitting, setCSubmitting] = useState(false);
  const [cError, setCError] = useState('');
  const [cSuccessCode, setCSuccessCode] = useState<string | null>(null);

  // Status lookup state
  const [sAppCode, setSAppCode] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sLoading, setSLoading] = useState(false);
  const [sError, setSError] = useState('');
  const [sResult, setSResult] = useState<PublicStatusResult | null>(null);
  const [sSearched, setSSearched] = useState(false);

  const loadJobs = async () => {
    setLoadingJobs(true);
    try {
      const jobs = await agencyService.getPublicOpenJobs();
      setOpenJobs(jobs);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const toggleSkill = (skill: string) => {
    setWSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleApplyToOpenJob = (job: PublicOpenJob) => {
    setSelectedClientId(job.id);
    setWWorkType(job.preferredWorkerType);
    setWSuccess(null);
    setActiveTab('apply');
    document.getElementById('portal-workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWError('');
    setWSuccess(null);

    if (!wFullName.trim()) {
      setWError('Please enter your full name.');
      return;
    }
    if (wPhone.replace(/\D/g, '').length < 9) {
      setWError('Please enter a valid Ugandan phone number.');
      return;
    }
    if (!wAddress.trim()) {
      setWError('Please enter your residential address.');
      return;
    }
    if (!wNextOfKin.trim() || wNextOfKinContact.replace(/\D/g, '').length < 9) {
      setWError('Please provide a valid next of kin name and phone contact.');
      return;
    }
    if (wSkills.length === 0) {
      setWError('Please select at least one skill.');
      return;
    }
    const salary = Number(wExpectedSalary);
    if (!Number.isFinite(salary) || salary < 50000) {
      setWError('Please enter a valid expected monthly salary in UGX.');
      return;
    }

    setWSubmitting(true);
    try {
      const res = await agencyService.submitPublicWorkerApplication({
        fullName: wFullName.trim(),
        gender: wGender,
        dateOfBirth: wDob,
        phoneNumber: wPhone.trim(),
        alternativePhoneNumber: wAltPhone.trim(),
        residentialAddress: wAddress.trim(),
        district: wDistrict,
        nextOfKin: wNextOfKin.trim(),
        nextOfKinContact: wNextOfKinContact.trim(),
        educationLevel: wEducation,
        previousWorkExperience: wExperience.trim(),
        skills: wSkills,
        expectedSalary: Math.round(salary),
        workType: wWorkType.trim(),
        clientId: selectedClientId || undefined,
        notes: wNotes.trim(),
      });
      setWSuccess(res);
      setWFullName('');
      setWPhone('+256 ');
      setWAltPhone('');
      setWAddress('');
      setWNextOfKin('');
      setWNextOfKinContact('+256 ');
      setWExperience('');
      setWNotes('');
      setSelectedClientId('');
    } catch (err) {
      setWError(
        err instanceof Error
          ? err.message
          : 'Could not submit your application. Please try again.'
      );
    } finally {
      setWSubmitting(false);
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCError('');
    setCSuccessCode(null);

    if (!cFullName.trim()) {
      setCError('Please enter your full name.');
      return;
    }
    if (cPhone.replace(/\D/g, '').length < 9) {
      setCError('Please enter a valid phone number.');
      return;
    }
    if (!cAddress.trim()) {
      setCError('Please enter your residential address or area.');
      return;
    }
    const budget = Number(cBudget);
    if (!Number.isFinite(budget) || budget < 50000) {
      setCError('Please enter a valid monthly salary budget in UGX.');
      return;
    }

    setCSubmitting(true);
    try {
      const res = await agencyService.submitPublicClientRequest({
        fullName: cFullName.trim(),
        phoneNumber: cPhone.trim(),
        alternativePhoneNumber: cAltPhone.trim(),
        residentialAddress: cAddress.trim(),
        preferredWorkerType: cWorkerType.trim(),
        salaryBudget: Math.round(budget),
        specialRequirements: cRequirements.trim(),
        additionalNotes: cNotes.trim(),
      });
      setCSuccessCode(res.clientCode);
      setCFullName('');
      setCPhone('+256 ');
      setCAltPhone('');
      setCAddress('');
      setCRequirements('');
      setCNotes('');
      await loadJobs();
    } catch (err) {
      setCError(
        err instanceof Error
          ? err.message
          : 'Could not submit your request. Please try again.'
      );
    } finally {
      setCSubmitting(false);
    }
  };

  const handleStatusSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSError('');
    setSResult(null);
    setSSearched(false);

    setSLoading(true);
    try {
      const res = await agencyService.checkPublicApplicationStatus(
        sAppCode,
        sPhone
      );
      setSResult(res);
      setSSearched(true);
    } catch (err) {
      setSError(
        err instanceof Error ? err.message : 'Unable to check status right now.'
      );
    } finally {
      setSLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Talent Bridge
          </a>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <button
              type="button"
              onClick={() => {
                setActiveTab('apply');
                document
                  .getElementById('open-roles')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Open Roles
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('apply');
                document
                  .getElementById('portal-workspace')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Apply for Work
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('request');
                document
                  .getElementById('portal-workspace')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Request a Worker
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('status');
                document
                  .getElementById('portal-workspace')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Check Status
            </button>
          </nav>

          <button
            type="button"
            onClick={onGoToStaffLogin}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Staff Login
          </button>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero Split Section */}
        <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 sm:p-10 lg:col-span-7">
            <div>
              <p className="text-xs font-medium text-teal-700">
                Ntinda, Kampala · Domestic Staffing & Placement
              </p>
              <h1
                className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                style={{ textWrap: 'balance' }}
              >
                Reliable domestic worker placement and online applications
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                Apply directly for vetted household roles across Kampala and Wakiso,
                or submit a family staffing request to our Ntinda placement team.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('apply');
                  document
                    .getElementById('portal-workspace')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 whitespace-nowrap"
              >
                <UserCheck className="h-4 w-4" />
                <span>Apply for a Job</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('request');
                  document
                    .getElementById('portal-workspace')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
              >
                <Building2 className="h-4 w-4 text-slate-500" />
                <span>Hire a Worker</span>
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 lg:col-span-5">
            {!heroImgError ? (
              <img
                src="/src/assets/images/login_office_hero_1795278966153.jpg"
                alt="Talent Bridge Recruitment Agency office in Ntinda, Kampala"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgError(true)}
                className="h-64 w-full object-cover lg:h-full"
              />
            ) : (
              <div className="flex h-64 w-full items-center justify-center bg-slate-800 text-slate-300 lg:h-full">
                <Briefcase className="h-10 w-10" />
              </div>
            )}
          </div>
        </section>

        {/* Open Household Roles (Anonymized) */}
        <section id="open-roles" className="space-y-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Open Household Requests
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Active client requests managed by our Ntinda office. Select any role to apply directly.
              </p>
            </div>
          </div>

          {loadingJobs ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : openJobs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Submit a general application below and our placement team will match
              you with upcoming household openings in Kampala and Wakiso.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {openJobs.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
                >
                  <div>
                    <p className="text-xs font-mono text-slate-400">
                      {job.clientCode} · {job.areaSummary}
                    </p>
                    <h3 className="mt-1.5 font-display text-base font-semibold text-slate-900">
                      {job.preferredWorkerType}
                    </h3>
                    <p className="mt-1 font-mono text-sm font-semibold text-teal-700 tabular-nums">
                      {formatUgx(job.salaryBudget)}/month
                    </p>
                    {job.specialRequirements && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                        {job.specialRequirements}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleApplyToOpenJob(job)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
                    >
                      <span>Apply for this role</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Interactive Customer / Applicant Workspace */}
        <section
          id="portal-workspace"
          className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        >
          {/* Segmented Portal Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 sm:inline-flex">
            <button
              type="button"
              onClick={() => setActiveTab('apply')}
              className={`rounded-md px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'apply'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Worker Job Application
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('request')}
              className={`rounded-md px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'request'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Client Worker Request
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={`rounded-md px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'status'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Check Application Status
            </button>
          </div>

          {/* TAB 1: Worker Application Form */}
          {activeTab === 'apply' && (
            <div className="mt-6">
              <div className="mb-6">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Apply for Domestic Work
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Submit your details and skills. Our Ntinda staff will review your application and contact you for vetting.
                </p>
              </div>

              {wSuccess && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div>
                      <h3 className="font-display text-base font-semibold text-emerald-950">
                        Application Received
                      </h3>
                      <p className="mt-1 text-sm text-emerald-900">
                        Save your reference numbers below to check your status anytime:
                      </p>
                      <p className="mt-2 font-mono text-sm font-semibold text-emerald-950">
                        Application ID: {wSuccess.applicationCode} · Worker ID:{' '}
                        {wSuccess.workerCode}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {wError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {wError}
                </div>
              )}

              <form onSubmit={handleWorkerSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Applying For Opening
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedClientId(val);
                        const match = openJobs.find((j) => j.id === val);
                        if (match) setWWorkType(match.preferredWorkerType);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    >
                      <option value="">
                        General Application (Any Suitable Household)
                      </option>
                      {openJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.clientCode} — {j.preferredWorkerType} ({j.areaSummary})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Preferred Role / Work Type *
                    </label>
                    <input
                      type="text"
                      required
                      value={wWorkType}
                      onChange={(e) => setWWorkType(e.target.value)}
                      placeholder="e.g. Live-in Nanny & Housekeeper"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
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
                      value={wExpectedSalary}
                      onChange={(e) => setWExpectedSalary(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={wFullName}
                      onChange={(e) => setWFullName(e.target.value)}
                      placeholder="e.g. Namukasa Grace"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Gender *
                    </label>
                    <select
                      value={wGender}
                      onChange={(e) => setWGender(e.target.value as Gender)}
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
                      value={wDob}
                      onChange={(e) => setWDob(e.target.value)}
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
                      value={wPhone}
                      onChange={(e) => setWPhone(e.target.value)}
                      placeholder="+256 772 000 000"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Alternative Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={wAltPhone}
                      onChange={(e) => setWAltPhone(e.target.value)}
                      placeholder="+256 701 000 000"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      District *
                    </label>
                    <select
                      value={wDistrict}
                      onChange={(e) => setWDistrict(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    >
                      {UGANDA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Current Residential Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={wAddress}
                      onChange={(e) => setWAddress(e.target.value)}
                      placeholder="e.g. Kireka Zone B"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Next of Kin Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={wNextOfKin}
                      onChange={(e) => setWNextOfKin(e.target.value)}
                      placeholder="Full name"
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
                      value={wNextOfKinContact}
                      onChange={(e) => setWNextOfKinContact(e.target.value)}
                      placeholder="+256 772 000 000"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Education Level *
                    </label>
                    <select
                      value={wEducation}
                      onChange={(e) => setWEducation(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    >
                      {EDUCATION_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-700">
                    Your Skills *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS_LIST.map((skill) => {
                      const active = wSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            active
                              ? 'border-teal-700 bg-teal-50 text-teal-800'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Previous Work Experience
                    </label>
                    <textarea
                      rows={2}
                      value={wExperience}
                      onChange={(e) => setWExperience(e.target.value)}
                      placeholder="Years of experience, past duties, references..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Additional Notes
                    </label>
                    <textarea
                      rows={2}
                      value={wNotes}
                      onChange={(e) => setWNotes(e.target.value)}
                      placeholder="Languages spoken, live-in preference, availability date..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={wSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
                >
                  <span>
                    {wSubmitting ? 'Submitting Application...' : 'Submit Application'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Client Worker Request Form */}
          {activeTab === 'request' && (
            <div className="mt-6">
              <div className="mb-6">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Request a Domestic Worker
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tell us your household requirements and monthly budget. Our placement officers will shortlist vetted candidates for you.
                </p>
              </div>

              {cSuccessCode && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div>
                      <h3 className="font-display text-base font-semibold text-emerald-950">
                        Client Request Submitted
                      </h3>
                      <p className="mt-1 text-sm text-emerald-900">
                        Thank you. Your inquiry reference is{' '}
                        <span className="font-mono font-semibold">
                          {cSuccessCode}
                        </span>
                        . Our Ntinda office will call you shortly to schedule candidate interviews.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {cError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {cError}
                </div>
              )}

              <form onSubmit={handleClientSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={cFullName}
                      onChange={(e) => setCFullName(e.target.value)}
                      placeholder="e.g. Mrs. Namono Esther"
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
                      value={cPhone}
                      onChange={(e) => setCPhone(e.target.value)}
                      placeholder="+256 772 000 000"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Alternative Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={cAltPhone}
                      onChange={(e) => setCAltPhone(e.target.value)}
                      placeholder="+256 701 000 000"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Residential Address / Area *
                    </label>
                    <input
                      type="text"
                      required
                      value={cAddress}
                      onChange={(e) => setCAddress(e.target.value)}
                      placeholder="e.g. Ministers Village, Ntinda"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Worker Type Needed *
                    </label>
                    <select
                      value={cWorkerType}
                      onChange={(e) => setCWorkerType(e.target.value)}
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
                      value={cBudget}
                      onChange={(e) => setCBudget(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Special Requirements
                    </label>
                    <textarea
                      rows={2}
                      value={cRequirements}
                      onChange={(e) => setCRequirements(e.target.value)}
                      placeholder="e.g. Experience with infants, fluent English, live-in or day worker..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Additional Notes
                    </label>
                    <textarea
                      rows={2}
                      value={cNotes}
                      onChange={(e) => setCNotes(e.target.value)}
                      placeholder="Preferred start date, household size, or best time to call..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
                >
                  <span>
                    {cSubmitting ? 'Submitting Request...' : 'Submit Worker Request'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Check Application Status */}
          {activeTab === 'status' && (
            <div className="mt-6 max-w-xl">
              <div className="mb-6">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Check Your Application Status
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your Application ID (e.g. <span className="font-mono">TB-APP-005</span>) and the phone number you registered with.
                </p>
              </div>

              {sError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {sError}
                </div>
              )}

              <form onSubmit={handleStatusSearch} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Application ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={sAppCode}
                      onChange={(e) => setSAppCode(e.target.value)}
                      placeholder="TB-APP-005"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Registered Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={sPhone}
                      onChange={(e) => setSPhone(e.target.value)}
                      placeholder="+256 784 319 502"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  <span>{sLoading ? 'Checking...' : 'Check Status'}</span>
                </button>
              </form>

              {sSearched && !sResult && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  No matching application found for that Application ID and phone
                  number. Please double-check your reference code or contact our Ntinda office.
                </div>
              )}

              {sResult && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                    <div>
                      <p className="font-mono text-xs text-slate-500">
                        {sResult.applicationCode}
                      </p>
                      <p className="font-display text-base font-semibold text-slate-900">
                        {sResult.workerName}
                      </p>
                    </div>
                    <StatusText status={sResult.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Role Applied For</p>
                      <p className="mt-0.5 font-medium text-slate-800">
                        {sResult.workType}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Date Submitted</p>
                      <p className="mt-0.5 font-mono text-slate-800">
                        {formatShortDate(sResult.applicationDate)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Quiet Footer */}
        <footer className="flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium text-slate-700">
              Talent Bridge Recruitment Agency
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Ntinda, Kampala, Uganda
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              Office Desk · Mon–Sat
            </span>
          </div>
          <button
            type="button"
            onClick={onGoToStaffLogin}
            className="font-medium text-teal-700 hover:text-teal-800"
          >
            Agency Staff Sign In →
          </button>
        </footer>
      </main>
    </div>
  );
}
