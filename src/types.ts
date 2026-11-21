export type NavSection =
  | 'dashboard'
  | 'workers'
  | 'clients'
  | 'applications'
  | 'placements'
  | 'payments'
  | 'probation'
  | 'reports'
  | 'settings';

export type WorkerAvailability = 'Available' | 'Placed' | 'Inactive';
export type Gender = 'Female' | 'Male' | 'Other';

export type ApplicationStatus =
  | 'Pending'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Placed';

export type PlacementStatus = 'Active' | 'Completed' | 'Terminated';
export type ProbationIndicator = 'Ongoing' | 'Ending soon' | 'Completed';

export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank Transfer';
export type PaymentStatus = 'Paid' | 'Pending';

export interface StaffProfile {
  id: string;
  email: string;
  fullName: string;
  roleTitle: string;
  agencyName: string;
  agencyLocation: string;
}

export interface Worker {
  id: string;
  workerCode: string;
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
  registrationDate: string;
  photograph?: string;
  additionalNotes: string;
  availability: WorkerAvailability;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  clientCode: string;
  fullName: string;
  phoneNumber: string;
  alternativePhoneNumber: string;
  residentialAddress: string;
  preferredWorkerType: string;
  salaryBudget: number;
  specialRequirements: string;
  registrationDate: string;
  additionalNotes: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  applicationCode: string;
  workerId: string;
  clientId?: string;
  workType: string;
  applicationDate: string;
  status: ApplicationStatus;
  notes: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicOpenJob {
  id: string;
  clientCode: string;
  preferredWorkerType: string;
  areaSummary: string;
  salaryBudget: number;
  specialRequirements: string;
  registrationDate: string;
}

export interface PublicStatusResult {
  applicationCode: string;
  workerName: string;
  workType: string;
  applicationDate: string;
  status: ApplicationStatus;
}

export interface Placement {
  id: string;
  placementCode: string;
  workerId: string;
  clientId: string;
  jobDescription: string;
  agreedSalary: number;
  placementDate: string;
  probationDurationDays: number;
  probationEndDate: string;
  status: PlacementStatus;
  additionalNotes: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentReference: string;
  clientId: string;
  workerId?: string;
  placementId?: string;
  amountUgx: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  description: string;
  status: PaymentStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyDataset {
  workers: Worker[];
  clients: Client[];
  applications: JobApplication[];
  placements: Placement[];
  payments: Payment[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type RecordScope = 'all' | 'agency_only';
