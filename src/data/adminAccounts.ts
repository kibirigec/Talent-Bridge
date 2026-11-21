export interface AdminAccount {
  id: string;
  fullName: string;
  email: string;
  password: string;
  roleTitle: string;
  agencyName: string;
  agencyLocation: string;
}

export const DEFAULT_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: 'admin-001',
    fullName: 'Calvin Kibirige',
    email: 'calvin.kibirige@talentbridge.ug',
    password: 'Trojans@2026',
    roleTitle: 'Agency Administrator',
    agencyName: 'Talent Bridge Recruitment Agency',
    agencyLocation: 'Ntinda, Kampala, Uganda',
  },
  {
    id: 'admin-002',
    fullName: 'Lynn Kageye',
    email: 'lynn.kageye@talentbridge.ug',
    password: 'Trojans@2026',
    roleTitle: 'Agency Administrator',
    agencyName: 'Talent Bridge Recruitment Agency',
    agencyLocation: 'Ntinda, Kampala, Uganda',
  },
  {
    id: 'admin-003',
    fullName: 'Ngabo Mark',
    email: 'ngabo.mark@talentbridge.ug',
    password: 'Trojans@2026',
    roleTitle: 'Agency Administrator',
    agencyName: 'Talent Bridge Recruitment Agency',
    agencyLocation: 'Ntinda, Kampala, Uganda',
  },
  {
    id: 'admin-004',
    fullName: 'Donnan Kemigisa',
    email: 'donnan.kemigisa@talentbridge.ug',
    password: 'Trojans@2026',
    roleTitle: 'Agency Administrator',
    agencyName: 'Talent Bridge Recruitment Agency',
    agencyLocation: 'Ntinda, Kampala, Uganda',
  },
  {
    id: 'admin-005',
    fullName: 'Louis Kimera',
    email: 'louis.kimera@talentbridge.ug',
    password: 'Trojans@2026',
    roleTitle: 'Agency Administrator',
    agencyName: 'Talent Bridge Recruitment Agency',
    agencyLocation: 'Ntinda, Kampala, Uganda',
  },
];
