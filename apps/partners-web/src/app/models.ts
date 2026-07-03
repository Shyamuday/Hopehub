export type WorkShift = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'FULL_DAY' | 'CUSTOM';
export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID' | 'MATERNITY' | 'PATERNITY';

export interface PartnerUser {
  id: string;
  name: string;
  email?: string | null;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: PartnerUser;
}

export interface SessionResponse {
  user: PartnerUser;
  capabilities: string[];
  portal: string;
  defaultRoute: string;
}
