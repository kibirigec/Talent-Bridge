import {
  DEFAULT_ADMIN_ACCOUNTS,
  type AdminAccount,
} from '../data/adminAccounts';
import { buildDemoDataset } from '../data/demoData';
import { getSupabaseClient } from '../lib/supabase';
import type {
  AgencyDataset,
  Client,
  Gender,
  JobApplication,
  Payment,
  Placement,
  PublicOpenJob,
  PublicStatusResult,
  StaffProfile,
  Worker,
  WorkerAvailability,
} from '../types';
import {
  addDaysToIsoDate,
  generateNextCode,
  generateUuid,
  getTodayIsoDate,
} from '../utils/formatters';

const STORAGE_DATASET_KEY = 'talent_bridge_dataset_v1';
const STORAGE_SESSION_KEY = 'talent_bridge_session_v1';
const STORAGE_SCOPE_KEY = 'talent_bridge_record_scope_v1';
const STORAGE_ADMINS_KEY = 'talent_bridge_admin_accounts_v1';

function readLocalAdmins(): AdminAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_ADMINS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminAccount[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fall back to default seeded admins
  }
  localStorage.setItem(STORAGE_ADMINS_KEY, JSON.stringify(DEFAULT_ADMIN_ACCOUNTS));
  return DEFAULT_ADMIN_ACCOUNTS;
}

function readLocalDataset(): AgencyDataset {
  try {
    const raw = localStorage.getItem(STORAGE_DATASET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AgencyDataset;
      if (
        Array.isArray(parsed.workers) &&
        Array.isArray(parsed.clients) &&
        Array.isArray(parsed.applications) &&
        Array.isArray(parsed.placements) &&
        Array.isArray(parsed.payments)
      ) {
        return parsed;
      }
    }
  } catch {
    // Fall back to fresh demo dataset
  }
  const initial = buildDemoDataset();
  localStorage.setItem(STORAGE_DATASET_KEY, JSON.stringify(initial));
  return initial;
}

function writeLocalDataset(dataset: AgencyDataset): void {
  localStorage.setItem(STORAGE_DATASET_KEY, JSON.stringify(dataset));
}

export const agencyService = {
  // --- Auth & Session ---
  getDemoAdmins(): StaffProfile[] {
    return readLocalAdmins().map(({ id, email, fullName, roleTitle, agencyName, agencyLocation }) => ({
      id,
      email,
      fullName,
      roleTitle,
      agencyName,
      agencyLocation,
    }));
  },

  async getCurrentSession(): Promise<StaffProfile | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      return {
        id: user.id,
        email: user.email || '',
        fullName: profile?.full_name || user.email?.split('@')[0] || 'Agency Staff',
        roleTitle: profile?.role_title || 'Agency Administrator',
        agencyName: profile?.agency_name || 'Talent Bridge Recruitment Agency',
        agencyLocation: profile?.agency_location || 'Ntinda, Kampala, Uganda',
      };
    }

    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      return raw ? (JSON.parse(raw) as StaffProfile) : null;
    } catch {
      return null;
    }
  },

  async signIn(email: string, password: string): Promise<StaffProfile> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error || !data.user) {
        throw new Error(error?.message || 'Invalid email or password.');
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      return {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        fullName: profile?.full_name || cleanEmail.split('@')[0],
        roleTitle: profile?.role_title || 'Agency Administrator',
        agencyName: profile?.agency_name || 'Talent Bridge Recruitment Agency',
        agencyLocation: profile?.agency_location || 'Ntinda, Kampala, Uganda',
      };
    }

    const admins = readLocalAdmins();
    const matched = admins.find(
      (admin) => admin.email.toLowerCase() === cleanEmail
    );

    if (!matched || matched.password !== password) {
      throw new Error('Invalid admin email or password.');
    }

    const sessionProfile: StaffProfile = {
      id: matched.id,
      email: matched.email,
      fullName: matched.fullName,
      roleTitle: matched.roleTitle,
      agencyName: matched.agencyName,
      agencyLocation: matched.agencyLocation,
    };
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionProfile));
    return sessionProfile;
  },

  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(STORAGE_SESSION_KEY);
  },

  getRecordScope(): 'all' | 'agency_only' {
    const saved = localStorage.getItem(STORAGE_SCOPE_KEY);
    return saved === 'agency_only' ? 'agency_only' : 'all';
  },

  setRecordScope(scope: 'all' | 'agency_only'): void {
    localStorage.setItem(STORAGE_SCOPE_KEY, scope);
  },

  // --- Dataset Loading ---
  async loadDataset(): Promise<AgencyDataset> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const [wRes, cRes, aRes, plRes, payRes] = await Promise.all([
        supabase.from('workers').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('applications').select('*').order('created_at', { ascending: false }),
        supabase.from('placements').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
      ]);

      if (wRes.error) throw new Error(wRes.error.message);
      if (cRes.error) throw new Error(cRes.error.message);
      if (aRes.error) throw new Error(aRes.error.message);
      if (plRes.error) throw new Error(plRes.error.message);
      if (payRes.error) throw new Error(payRes.error.message);

      return {
        workers: (wRes.data || []).map((r) => ({
          id: r.id,
          workerCode: r.worker_code,
          fullName: r.full_name,
          gender: r.gender,
          dateOfBirth: r.date_of_birth,
          phoneNumber: r.phone_number,
          alternativePhoneNumber: r.alternative_phone_number || '',
          residentialAddress: r.residential_address,
          district: r.district,
          nextOfKin: r.next_of_kin,
          nextOfKinContact: r.next_of_kin_contact,
          educationLevel: r.education_level,
          previousWorkExperience: r.previous_work_experience || '',
          skills: r.skills || [],
          expectedSalary: Number(r.expected_salary),
          registrationDate: r.registration_date,
          photograph: r.photograph_url || undefined,
          additionalNotes: r.additional_notes || '',
          availability: r.availability,
          isDemo: Boolean(r.is_demo),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
        clients: (cRes.data || []).map((r) => ({
          id: r.id,
          clientCode: r.client_code,
          fullName: r.full_name,
          phoneNumber: r.phone_number,
          alternativePhoneNumber: r.alternative_phone_number || '',
          residentialAddress: r.residential_address,
          preferredWorkerType: r.preferred_worker_type,
          salaryBudget: Number(r.salary_budget),
          specialRequirements: r.special_requirements || '',
          registrationDate: r.registration_date,
          additionalNotes: r.additional_notes || '',
          isDemo: Boolean(r.is_demo),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
        applications: (aRes.data || []).map((r) => ({
          id: r.id,
          applicationCode: r.application_code,
          workerId: r.worker_id,
          clientId: r.client_id || undefined,
          workType: r.work_type,
          applicationDate: r.application_date,
          status: r.status,
          notes: r.notes || '',
          isDemo: Boolean(r.is_demo),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
        placements: (plRes.data || []).map((r) => ({
          id: r.id,
          placementCode: r.placement_code,
          workerId: r.worker_id,
          clientId: r.client_id,
          jobDescription: r.job_description,
          agreedSalary: Number(r.agreed_salary),
          placementDate: r.placement_date,
          probationDurationDays: Number(r.probation_duration_days),
          probationEndDate: r.probation_end_date,
          status: r.status,
          additionalNotes: r.additional_notes || '',
          isDemo: Boolean(r.is_demo),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
        payments: (payRes.data || []).map((r) => ({
          id: r.id,
          paymentReference: r.payment_reference,
          clientId: r.client_id,
          workerId: r.worker_id || undefined,
          placementId: r.placement_id || undefined,
          amountUgx: Number(r.amount_ugx),
          paymentDate: r.payment_date,
          paymentMethod: r.payment_method,
          description: r.description || '',
          status: r.status,
          isDemo: Boolean(r.is_demo),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      };
    }

    return readLocalDataset();
  },

  // --- Workers CRUD ---
  async createWorker(
    input: Omit<Worker, 'id' | 'workerCode' | 'isDemo' | 'createdAt' | 'updatedAt'>,
    currentWorkers: Worker[]
  ): Promise<Worker> {
    const now = new Date().toISOString();
    const workerCode = generateNextCode(
      'TB-W',
      currentWorkers.map((w) => w.workerCode)
    );
    const record: Worker = {
      ...input,
      id: generateUuid(),
      workerCode,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('workers').insert({
        id: record.id,
        worker_code: record.workerCode,
        full_name: record.fullName,
        gender: record.gender,
        date_of_birth: record.dateOfBirth,
        phone_number: record.phoneNumber,
        alternative_phone_number: record.alternativePhoneNumber,
        residential_address: record.residentialAddress,
        district: record.district,
        next_of_kin: record.nextOfKin,
        next_of_kin_contact: record.nextOfKinContact,
        education_level: record.educationLevel,
        previous_work_experience: record.previousWorkExperience,
        skills: record.skills,
        expected_salary: record.expectedSalary,
        registration_date: record.registrationDate,
        photograph_url: record.photograph || null,
        additional_notes: record.additionalNotes,
        availability: record.availability,
        is_demo: false,
      });
      if (error) throw new Error(error.message);
      return record;
    }

    const ds = readLocalDataset();
    ds.workers = [record, ...ds.workers];
    writeLocalDataset(ds);
    return record;
  },

  async updateWorker(worker: Worker): Promise<Worker> {
    const updated: Worker = { ...worker, updatedAt: new Date().toISOString() };
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('workers')
        .update({
          full_name: updated.fullName,
          gender: updated.gender,
          date_of_birth: updated.dateOfBirth,
          phone_number: updated.phoneNumber,
          alternative_phone_number: updated.alternativePhoneNumber,
          residential_address: updated.residentialAddress,
          district: updated.district,
          next_of_kin: updated.nextOfKin,
          next_of_kin_contact: updated.nextOfKinContact,
          education_level: updated.educationLevel,
          previous_work_experience: updated.previousWorkExperience,
          skills: updated.skills,
          expected_salary: updated.expectedSalary,
          registration_date: updated.registrationDate,
          photograph_url: updated.photograph || null,
          additional_notes: updated.additionalNotes,
          availability: updated.availability,
        })
        .eq('id', updated.id);
      if (error) throw new Error(error.message);
      return updated;
    }

    const ds = readLocalDataset();
    ds.workers = ds.workers.map((w) => (w.id === updated.id ? updated : w));
    writeLocalDataset(ds);
    return updated;
  },

  async deleteWorker(workerId: string, placements: Placement[]): Promise<void> {
    const activePlacement = placements.find(
      (p) => p.workerId === workerId && p.status === 'Active'
    );
    if (activePlacement) {
      throw new Error(
        `Cannot delete worker while placement ${activePlacement.placementCode} is Active. Complete or terminate the placement first.`
      );
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('workers').delete().eq('id', workerId);
      if (error) throw new Error(error.message);
      return;
    }

    const ds = readLocalDataset();
    ds.workers = ds.workers.filter((w) => w.id !== workerId);
    ds.applications = ds.applications.filter((a) => a.workerId !== workerId);
    ds.placements = ds.placements.filter((p) => p.workerId !== workerId);
    ds.payments = ds.payments.map((pay) =>
      pay.workerId === workerId ? { ...pay, workerId: undefined } : pay
    );
    writeLocalDataset(ds);
  },

  // --- Clients CRUD ---
  async createClient(
    input: Omit<Client, 'id' | 'clientCode' | 'isDemo' | 'createdAt' | 'updatedAt'>,
    currentClients: Client[]
  ): Promise<Client> {
    const now = new Date().toISOString();
    const clientCode = generateNextCode(
      'TB-C',
      currentClients.map((c) => c.clientCode)
    );
    const record: Client = {
      ...input,
      id: generateUuid(),
      clientCode,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('clients').insert({
        id: record.id,
        client_code: record.clientCode,
        full_name: record.fullName,
        phone_number: record.phoneNumber,
        alternative_phone_number: record.alternativePhoneNumber,
        residential_address: record.residentialAddress,
        preferred_worker_type: record.preferredWorkerType,
        salary_budget: record.salaryBudget,
        special_requirements: record.specialRequirements,
        registration_date: record.registrationDate,
        additional_notes: record.additionalNotes,
        is_demo: false,
      });
      if (error) throw new Error(error.message);
      return record;
    }

    const ds = readLocalDataset();
    ds.clients = [record, ...ds.clients];
    writeLocalDataset(ds);
    return record;
  },

  async updateClient(client: Client): Promise<Client> {
    const updated: Client = { ...client, updatedAt: new Date().toISOString() };
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: updated.fullName,
          phone_number: updated.phoneNumber,
          alternative_phone_number: updated.alternativePhoneNumber,
          residential_address: updated.residentialAddress,
          preferred_worker_type: updated.preferredWorkerType,
          salary_budget: updated.salaryBudget,
          special_requirements: updated.specialRequirements,
          registration_date: updated.registrationDate,
          additional_notes: updated.additionalNotes,
        })
        .eq('id', updated.id);
      if (error) throw new Error(error.message);
      return updated;
    }

    const ds = readLocalDataset();
    ds.clients = ds.clients.map((c) => (c.id === updated.id ? updated : c));
    writeLocalDataset(ds);
    return updated;
  },

  async deleteClient(clientId: string, placements: Placement[]): Promise<void> {
    const activePlacement = placements.find(
      (p) => p.clientId === clientId && p.status === 'Active'
    );
    if (activePlacement) {
      throw new Error(
        `Cannot delete client while placement ${activePlacement.placementCode} is Active.`
      );
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) throw new Error(error.message);
      return;
    }

    const ds = readLocalDataset();
    ds.clients = ds.clients.filter((c) => c.id !== clientId);
    ds.applications = ds.applications.filter((a) => a.clientId !== clientId);
    ds.placements = ds.placements.filter((p) => p.clientId !== clientId);
    ds.payments = ds.payments.filter((pay) => pay.clientId !== clientId);
    writeLocalDataset(ds);
  },

  // --- Applications CRUD ---
  async createApplication(
    input: Omit<JobApplication, 'id' | 'applicationCode' | 'isDemo' | 'createdAt' | 'updatedAt'>,
    currentApplications: JobApplication[]
  ): Promise<JobApplication> {
    const now = new Date().toISOString();
    const applicationCode = generateNextCode(
      'TB-APP',
      currentApplications.map((a) => a.applicationCode)
    );
    const record: JobApplication = {
      ...input,
      id: generateUuid(),
      applicationCode,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('applications').insert({
        id: record.id,
        application_code: record.applicationCode,
        worker_id: record.workerId,
        client_id: record.clientId || null,
        work_type: record.workType,
        application_date: record.applicationDate,
        status: record.status,
        notes: record.notes,
        is_demo: false,
      });
      if (error) throw new Error(error.message);
      return record;
    }

    const ds = readLocalDataset();
    ds.applications = [record, ...ds.applications];
    writeLocalDataset(ds);
    return record;
  },

  async updateApplication(app: JobApplication): Promise<JobApplication> {
    const updated: JobApplication = { ...app, updatedAt: new Date().toISOString() };
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('applications')
        .update({
          worker_id: updated.workerId,
          client_id: updated.clientId || null,
          work_type: updated.workType,
          application_date: updated.applicationDate,
          status: updated.status,
          notes: updated.notes,
        })
        .eq('id', updated.id);
      if (error) throw new Error(error.message);
      return updated;
    }

    const ds = readLocalDataset();
    ds.applications = ds.applications.map((a) => (a.id === updated.id ? updated : a));
    writeLocalDataset(ds);
    return updated;
  },

  async deleteApplication(applicationId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('applications').delete().eq('id', applicationId);
      if (error) throw new Error(error.message);
      return;
    }

    const ds = readLocalDataset();
    ds.applications = ds.applications.filter((a) => a.id !== applicationId);
    writeLocalDataset(ds);
  },

  // --- Placements CRUD (with worker availability sync & active constraint) ---
  async createPlacement(
    input: Omit<
      Placement,
      'id' | 'placementCode' | 'probationEndDate' | 'isDemo' | 'createdAt' | 'updatedAt'
    >,
    currentPlacements: Placement[],
    sourceApplicationId?: string
  ): Promise<{ placement: Placement; updatedWorkerAvailability?: WorkerAvailability }> {
    if (input.status === 'Active') {
      const existingActive = currentPlacements.find(
        (p) => p.workerId === input.workerId && p.status === 'Active'
      );
      if (existingActive) {
        throw new Error(
          `This worker already has an active placement (${existingActive.placementCode}). Complete or terminate the existing placement first.`
        );
      }
    }

    const now = new Date().toISOString();
    const placementCode = generateNextCode(
      'TB-PL',
      currentPlacements.map((p) => p.placementCode)
    );
    const probationEndDate = addDaysToIsoDate(input.placementDate, input.probationDurationDays);
    const record: Placement = {
      ...input,
      id: generateUuid(),
      placementCode,
      probationEndDate,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('placements').insert({
        id: record.id,
        placement_code: record.placementCode,
        worker_id: record.workerId,
        client_id: record.clientId,
        job_description: record.jobDescription,
        agreed_salary: record.agreedSalary,
        placement_date: record.placementDate,
        probation_duration_days: record.probationDurationDays,
        probation_end_date: record.probationEndDate,
        status: record.status,
        additional_notes: record.additionalNotes,
        is_demo: false,
      });
      if (error) throw new Error(error.message);

      if (record.status === 'Active') {
        await supabase
          .from('workers')
          .update({ availability: 'Placed' })
          .eq('id', record.workerId);
      }
      if (sourceApplicationId) {
        await supabase
          .from('applications')
          .update({ status: 'Placed' })
          .eq('id', sourceApplicationId);
      }

      return {
        placement: record,
        updatedWorkerAvailability: record.status === 'Active' ? 'Placed' : undefined,
      };
    }

    const ds = readLocalDataset();
    ds.placements = [record, ...ds.placements];
    if (record.status === 'Active') {
      ds.workers = ds.workers.map((w) =>
        w.id === record.workerId ? { ...w, availability: 'Placed', updatedAt: now } : w
      );
    }
    if (sourceApplicationId) {
      ds.applications = ds.applications.map((a) =>
        a.id === sourceApplicationId ? { ...a, status: 'Placed', updatedAt: now } : a
      );
    }
    writeLocalDataset(ds);

    return {
      placement: record,
      updatedWorkerAvailability: record.status === 'Active' ? 'Placed' : undefined,
    };
  },

  async updatePlacement(
    placement: Placement,
    currentPlacements: Placement[],
    workerAvailabilityOverride?: WorkerAvailability
  ): Promise<Placement> {
    if (placement.status === 'Active') {
      const conflict = currentPlacements.find(
        (p) =>
          p.id !== placement.id &&
          p.workerId === placement.workerId &&
          p.status === 'Active'
      );
      if (conflict) {
        throw new Error(
          `Worker already has another active placement (${conflict.placementCode}).`
        );
      }
    }

    const now = new Date().toISOString();
    const updated: Placement = {
      ...placement,
      probationEndDate: addDaysToIsoDate(
        placement.placementDate,
        placement.probationDurationDays
      ),
      updatedAt: now,
    };

    const nextAvailability: WorkerAvailability | undefined =
      updated.status === 'Active' ? 'Placed' : workerAvailabilityOverride;

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('placements')
        .update({
          worker_id: updated.workerId,
          client_id: updated.clientId,
          job_description: updated.jobDescription,
          agreed_salary: updated.agreedSalary,
          placement_date: updated.placementDate,
          probation_duration_days: updated.probationDurationDays,
          probation_end_date: updated.probationEndDate,
          status: updated.status,
          additional_notes: updated.additionalNotes,
        })
        .eq('id', updated.id);
      if (error) throw new Error(error.message);

      if (nextAvailability) {
        await supabase
          .from('workers')
          .update({ availability: nextAvailability })
          .eq('id', updated.workerId);
      }
      return updated;
    }

    const ds = readLocalDataset();
    ds.placements = ds.placements.map((p) => (p.id === updated.id ? updated : p));
    if (nextAvailability) {
      ds.workers = ds.workers.map((w) =>
        w.id === updated.workerId ? { ...w, availability: nextAvailability, updatedAt: now } : w
      );
    }
    writeLocalDataset(ds);
    return updated;
  },

  async deletePlacement(placementId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('placements').delete().eq('id', placementId);
      if (error) throw new Error(error.message);
      return;
    }

    const ds = readLocalDataset();
    const target = ds.placements.find((p) => p.id === placementId);
    ds.placements = ds.placements.filter((p) => p.id !== placementId);
    if (target && target.status === 'Active') {
      ds.workers = ds.workers.map((w) =>
        w.id === target.workerId
          ? { ...w, availability: 'Available', updatedAt: new Date().toISOString() }
          : w
      );
    }
    ds.payments = ds.payments.map((pay) =>
      pay.placementId === placementId ? { ...pay, placementId: undefined } : pay
    );
    writeLocalDataset(ds);
  },

  // --- Payments CRUD ---
  async createPayment(
    input: Omit<Payment, 'id' | 'isDemo' | 'createdAt' | 'updatedAt'>
  ): Promise<Payment> {
    const now = new Date().toISOString();
    const record: Payment = {
      ...input,
      id: generateUuid(),
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('payments').insert({
        id: record.id,
        payment_reference: record.paymentReference,
        client_id: record.clientId,
        worker_id: record.workerId || null,
        placement_id: record.placementId || null,
        amount_ugx: record.amountUgx,
        payment_date: record.paymentDate,
        payment_method: record.paymentMethod,
        description: record.description,
        status: record.status,
        is_demo: false,
      });
      if (error) throw new Error(error.message);
      return record;
    }

    const ds = readLocalDataset();
    ds.payments = [record, ...ds.payments];
    writeLocalDataset(ds);
    return record;
  },

  async updatePayment(payment: Payment): Promise<Payment> {
    const updated: Payment = { ...payment, updatedAt: new Date().toISOString() };
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('payments')
        .update({
          payment_reference: updated.paymentReference,
          client_id: updated.clientId,
          worker_id: updated.workerId || null,
          placement_id: updated.placementId || null,
          amount_ugx: updated.amountUgx,
          payment_date: updated.paymentDate,
          payment_method: updated.paymentMethod,
          description: updated.description,
          status: updated.status,
        })
        .eq('id', updated.id);
      if (error) throw new Error(error.message);
      return updated;
    }

    const ds = readLocalDataset();
    ds.payments = ds.payments.map((p) => (p.id === updated.id ? updated : p));
    writeLocalDataset(ds);
    return updated;
  },

  async deletePayment(paymentId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('payments').delete().eq('id', paymentId);
      if (error) throw new Error(error.message);
      return;
    }

    const ds = readLocalDataset();
    ds.payments = ds.payments.filter((p) => p.id !== paymentId);
    writeLocalDataset(ds);
  },

  // --- Demo Data Management (clearly separated from agency records) ---
  async clearDemoData(): Promise<AgencyDataset> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const r1 = await supabase.from('payments').delete().eq('is_demo', true);
      if (r1.error) throw new Error(r1.error.message);
      const r2 = await supabase.from('placements').delete().eq('is_demo', true);
      if (r2.error) throw new Error(r2.error.message);
      const r3 = await supabase.from('applications').delete().eq('is_demo', true);
      if (r3.error) throw new Error(r3.error.message);
      const r4 = await supabase.from('clients').delete().eq('is_demo', true);
      if (r4.error) throw new Error(r4.error.message);
      const r5 = await supabase.from('workers').delete().eq('is_demo', true);
      if (r5.error) throw new Error(r5.error.message);
      return this.loadDataset();
    }

    const ds = readLocalDataset();
    const cleaned: AgencyDataset = {
      workers: ds.workers.filter((w) => !w.isDemo),
      clients: ds.clients.filter((c) => !c.isDemo),
      applications: ds.applications.filter((a) => !a.isDemo),
      placements: ds.placements.filter((p) => !p.isDemo),
      payments: ds.payments.filter((pay) => !pay.isDemo),
    };
    writeLocalDataset(cleaned);
    return cleaned;
  },

  async restoreDemoData(): Promise<AgencyDataset> {
    const demo = buildDemoDataset();
    const supabase = getSupabaseClient();
    if (supabase) {
      const wUp = await supabase.from('workers').upsert(
        demo.workers.map((w) => ({
          id: w.id,
          worker_code: w.workerCode,
          full_name: w.fullName,
          gender: w.gender,
          date_of_birth: w.dateOfBirth,
          phone_number: w.phoneNumber,
          alternative_phone_number: w.alternativePhoneNumber,
          residential_address: w.residentialAddress,
          district: w.district,
          next_of_kin: w.nextOfKin,
          next_of_kin_contact: w.nextOfKinContact,
          education_level: w.educationLevel,
          previous_work_experience: w.previousWorkExperience,
          skills: w.skills,
          expected_salary: w.expectedSalary,
          registration_date: w.registrationDate,
          additional_notes: w.additionalNotes,
          availability: w.availability,
          is_demo: true,
        }))
      );
      if (wUp.error) throw new Error(wUp.error.message);

      const cUp = await supabase.from('clients').upsert(
        demo.clients.map((c) => ({
          id: c.id,
          client_code: c.clientCode,
          full_name: c.fullName,
          phone_number: c.phoneNumber,
          alternative_phone_number: c.alternativePhoneNumber,
          residential_address: c.residentialAddress,
          preferred_worker_type: c.preferredWorkerType,
          salary_budget: c.salaryBudget,
          special_requirements: c.specialRequirements,
          registration_date: c.registrationDate,
          additional_notes: c.additionalNotes,
          is_demo: true,
        }))
      );
      if (cUp.error) throw new Error(cUp.error.message);

      const aUp = await supabase.from('applications').upsert(
        demo.applications.map((a) => ({
          id: a.id,
          application_code: a.applicationCode,
          worker_id: a.workerId,
          client_id: a.clientId,
          work_type: a.workType,
          application_date: a.applicationDate,
          status: a.status,
          notes: a.notes,
          is_demo: true,
        }))
      );
      if (aUp.error) throw new Error(aUp.error.message);

      const plUp = await supabase.from('placements').upsert(
        demo.placements.map((p) => ({
          id: p.id,
          placement_code: p.placementCode,
          worker_id: p.workerId,
          client_id: p.clientId,
          job_description: p.jobDescription,
          agreed_salary: p.agreedSalary,
          placement_date: p.placementDate,
          probation_duration_days: p.probationDurationDays,
          probation_end_date: p.probationEndDate,
          status: p.status,
          additional_notes: p.additionalNotes,
          is_demo: true,
        }))
      );
      if (plUp.error) throw new Error(plUp.error.message);

      const payUp = await supabase.from('payments').upsert(
        demo.payments.map((pay) => ({
          id: pay.id,
          payment_reference: pay.paymentReference,
          client_id: pay.clientId,
          worker_id: pay.workerId || null,
          placement_id: pay.placementId || null,
          amount_ugx: pay.amountUgx,
          payment_date: pay.paymentDate,
          payment_method: pay.paymentMethod,
          description: pay.description,
          status: pay.status,
          is_demo: true,
        }))
      );
      if (payUp.error) throw new Error(payUp.error.message);

      return this.loadDataset();
    }

    const ds = readLocalDataset();
    const mergeUnique = <T extends { id: string; isDemo: boolean }>(
      existing: T[],
      incoming: T[]
    ): T[] => {
      const realOnly = existing.filter((item) => !item.isDemo);
      const existingIds = new Set(realOnly.map((item) => item.id));
      return [...realOnly, ...incoming.filter((item) => !existingIds.has(item.id))];
    };

    const merged: AgencyDataset = {
      workers: mergeUnique(ds.workers, demo.workers),
      clients: mergeUnique(ds.clients, demo.clients),
      applications: mergeUnique(ds.applications, demo.applications),
      placements: mergeUnique(ds.placements, demo.placements),
      payments: mergeUnique(ds.payments, demo.payments),
    };
    writeLocalDataset(merged);
    return merged;
  },

  // --- Public Customer & Applicant Portal Methods ---
  async getPublicOpenJobs(): Promise<PublicOpenJob[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('get_public_open_requests');
      if (error) {
        // Gracefully return empty if public_portal_migration.sql hasn't been applied yet
        return [];
      }
      return (data || []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        clientCode: String(row.client_code),
        preferredWorkerType: String(row.preferred_worker_type),
        areaSummary: String(row.area_summary || 'Kampala / Wakiso'),
        salaryBudget: Number(row.salary_budget || 0),
        specialRequirements: String(row.special_requirements || ''),
        registrationDate: String(row.registration_date || ''),
      }));
    }

    const ds = readLocalDataset();
    return ds.clients.slice(0, 12).map((c) => {
      const parts = c.residentialAddress.split(',');
      const areaSummary =
        parts.length > 1 ? parts[parts.length - 1].trim() : c.residentialAddress;
      return {
        id: c.id,
        clientCode: c.clientCode,
        preferredWorkerType: c.preferredWorkerType,
        areaSummary: areaSummary || 'Kampala',
        salaryBudget: c.salaryBudget,
        specialRequirements: c.specialRequirements,
        registrationDate: c.registrationDate,
      };
    });
  },

  async submitPublicWorkerApplication(input: {
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
    expectedSalary: number;
    workType: string;
    clientId?: string;
    notes: string;
  }): Promise<{ workerCode: string; applicationCode: string }> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.rpc(
        'submit_public_worker_application',
        {
          p_full_name: input.fullName,
          p_gender: input.gender,
          p_date_of_birth: input.dateOfBirth,
          p_phone_number: input.phoneNumber,
          p_alternative_phone: input.alternativePhoneNumber || '',
          p_residential_address: input.residentialAddress,
          p_district: input.district,
          p_next_of_kin: input.nextOfKin,
          p_next_of_kin_contact: input.nextOfKinContact,
          p_education_level: input.educationLevel,
          p_previous_experience: input.previousWorkExperience || '',
          p_skills: input.skills,
          p_expected_salary: input.expectedSalary,
          p_work_type: input.workType,
          p_client_id: input.clientId || null,
          p_notes: input.notes || '',
        }
      );

      if (error) {
        if (error.message.includes('Could not find the function')) {
          throw new Error(
            'Public portal database functions are not yet installed in Supabase. An administrator should run supabase/public_portal_migration.sql in the Supabase SQL Editor.'
          );
        }
        throw new Error(error.message);
      }

      const row = Array.isArray(data) ? data[0] : data;
      return {
        workerCode: String(row?.worker_code || ''),
        applicationCode: String(row?.application_code || ''),
      };
    }

    const ds = readLocalDataset();
    const now = new Date().toISOString();
    const today = getTodayIsoDate();
    const workerCode = generateNextCode(
      'TB-W',
      ds.workers.map((w) => w.workerCode)
    );
    const applicationCode = generateNextCode(
      'TB-APP',
      ds.applications.map((a) => a.applicationCode)
    );
    const workerId = generateUuid();

    const worker: Worker = {
      id: workerId,
      workerCode,
      fullName: input.fullName,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      phoneNumber: input.phoneNumber,
      alternativePhoneNumber: input.alternativePhoneNumber,
      residentialAddress: input.residentialAddress,
      district: input.district,
      nextOfKin: input.nextOfKin,
      nextOfKinContact: input.nextOfKinContact,
      educationLevel: input.educationLevel,
      previousWorkExperience: input.previousWorkExperience,
      skills: input.skills,
      expectedSalary: input.expectedSalary,
      registrationDate: today,
      additionalNotes: input.notes
        ? `[Public Portal] ${input.notes}`
        : 'Submitted via public online portal.',
      availability: 'Available',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    const application: JobApplication = {
      id: generateUuid(),
      applicationCode,
      workerId,
      clientId: input.clientId || undefined,
      workType: input.workType,
      applicationDate: today,
      status: 'Pending',
      notes: input.notes || 'Submitted via public online portal.',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    ds.workers = [worker, ...ds.workers];
    ds.applications = [application, ...ds.applications];
    writeLocalDataset(ds);

    return { workerCode, applicationCode };
  },

  async submitPublicClientRequest(input: {
    fullName: string;
    phoneNumber: string;
    alternativePhoneNumber: string;
    residentialAddress: string;
    preferredWorkerType: string;
    salaryBudget: number;
    specialRequirements: string;
    additionalNotes: string;
  }): Promise<{ clientCode: string }> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('submit_public_client_request', {
        p_full_name: input.fullName,
        p_phone_number: input.phoneNumber,
        p_alternative_phone: input.alternativePhoneNumber || '',
        p_residential_address: input.residentialAddress,
        p_preferred_worker_type: input.preferredWorkerType,
        p_salary_budget: input.salaryBudget,
        p_special_requirements: input.specialRequirements || '',
        p_additional_notes: input.additionalNotes || '',
      });

      if (error) {
        if (error.message.includes('Could not find the function')) {
          throw new Error(
            'Public portal database functions are not yet installed in Supabase. An administrator should run supabase/public_portal_migration.sql in the Supabase SQL Editor.'
          );
        }
        throw new Error(error.message);
      }

      const row = Array.isArray(data) ? data[0] : data;
      return { clientCode: String(row?.client_code || '') };
    }

    const ds = readLocalDataset();
    const now = new Date().toISOString();
    const clientCode = generateNextCode(
      'TB-C',
      ds.clients.map((c) => c.clientCode)
    );

    const client: Client = {
      id: generateUuid(),
      clientCode,
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      alternativePhoneNumber: input.alternativePhoneNumber,
      residentialAddress: input.residentialAddress,
      preferredWorkerType: input.preferredWorkerType,
      salaryBudget: input.salaryBudget,
      specialRequirements: input.specialRequirements,
      registrationDate: getTodayIsoDate(),
      additionalNotes: input.additionalNotes
        ? `[Public Request] ${input.additionalNotes}`
        : 'Submitted via public client request form.',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    ds.clients = [client, ...ds.clients];
    writeLocalDataset(ds);

    return { clientCode };
  },

  async checkPublicApplicationStatus(
    applicationCode: string,
    phoneNumber: string
  ): Promise<PublicStatusResult | null> {
    const cleanCode = applicationCode.trim().toUpperCase();
    const digits = phoneNumber.replace(/\D/g, '');
    if (!cleanCode || digits.length < 9) {
      throw new Error(
        'Enter your Application ID (e.g. TB-APP-005) and full phone number.'
      );
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.rpc(
        'check_public_application_status',
        {
          p_application_code: cleanCode,
          p_phone_number: phoneNumber.trim(),
        }
      );

      if (error) {
        if (error.message.includes('Could not find the function')) {
          throw new Error(
            'Status lookup function is not yet installed in Supabase. Run supabase/public_portal_migration.sql first.'
          );
        }
        throw new Error(error.message);
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        applicationCode: String(row.application_code),
        workerName: String(row.worker_name),
        workType: String(row.work_type),
        applicationDate: String(row.application_date),
        status: row.status,
      };
    }

    const ds = readLocalDataset();
    const app = ds.applications.find(
      (a) => a.applicationCode.toUpperCase() === cleanCode
    );
    if (!app) return null;
    const worker = ds.workers.find((w) => w.id === app.workerId);
    if (!worker) return null;
    const workerDigits = worker.phoneNumber.replace(/\D/g, '');
    if (!workerDigits.endsWith(digits.slice(-9))) return null;

    return {
      applicationCode: app.applicationCode,
      workerName: worker.fullName,
      workType: app.workType,
      applicationDate: app.applicationDate,
      status: app.status,
    };
  },
};
