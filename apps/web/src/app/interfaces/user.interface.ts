export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export type StaffProfileSummary = {
  isSuperAdmin: boolean;
  permissionCodes: string[];
};

export type User = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  role: Role;
  /** Present for ADMIN from `/me`. `null` = no profile yet (legacy full access). */
  staffProfile?: StaffProfileSummary | null;
};
