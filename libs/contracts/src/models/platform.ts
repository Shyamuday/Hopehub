export type EmpType = 'DOCTOR' | 'STORE_STAFF';
export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID' | 'MATERNITY' | 'PATERNITY';
export type WorkShift = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'FULL_DAY' | 'CUSTOM';

export interface HrUser {
  id: string;
  name: string;
  email: string;
  role: string;
  hrProfile?: {
    designation?: string;
    department?: string;
  };
}

export interface AuthResponse {
  token: string;
  user: HrUser;
}

export interface SessionResponse {
  user: HrUser;
  capabilities: string[];
  portal: string;
  defaultRoute: string;
}

export interface QueueConsultation {
  id: string;
  status: string;
  createdAt: string;
  patient?: { id: string; name: string; mobile?: string | null; patientCode?: string | null };
  assignedDoctor?: { id: string; name: string } | null;
  disease?: { id: string; name: string; feeInPaise: number };
  payment?: { status: string; amountInPaise: number } | null;
}

export interface QueueSummary {
  total: number;
  awaitingPayment: number;
  awaitingDoctor: number;
  inProgress: number;
}

export interface QueueData {
  consultations: QueueConsultation[];
  summary: QueueSummary;
}

export interface RosterRow {
  id: string;
  name: string;
  shift: string;
  employeeStatus: string;
  attendance: string;
}

export interface RosterData {
  summary: { total: number; onLeave: number; expected: number };
  doctors: RosterRow[];
  storeStaff: RosterRow[];
}

export interface CallCenterConsultation {
  id: string;
  status: string;
  createdAt: string;
  patient?: { id: string; name: string; mobile?: string; patientCode?: string };
  disease?: { name: string };
  assignedDoctor?: { name: string };
  clinicStore?: { name: string; code?: string };
}

export interface RecentConsultationsData {
  consultations: CallCenterConsultation[];
}

export interface Employee {
  id: string;
  empType: EmpType;
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  specialty?: string;
  doctorType?: string;
  doctorTypeLabel?: string;
  specialtyFocus?: string | null;
  storeName?: string;
  joiningDate?: string;
  employeeStatus: EmployeeStatus;
  workShift?: WorkShift;
  shiftStart?: string;
  shiftEnd?: string;
  weeklyOffDays?: string[];
  employeeId?: string;
  hasLetter?: boolean;
  probationEndDate?: string;
  salary?: number;
  consultationFee?: number;
  emergencyContact?: string;
}

export interface Doctor extends Employee {
  empType: 'DOCTOR';
  specialty?: string;
  doctorType?: string;
  doctorTypeLabel?: string;
  specialtyFocus?: string | null;
}

export interface StoreStaff extends Employee {
  empType: 'STORE_STAFF';
  storeName?: string;
}

export interface Leave {
  id: string;
  employeeType: EmpType;
  doctorId?: string;
  storeStaffId?: string;
  employeeName?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  totalDays?: number;
  reason?: string;
  status: LeaveStatus;
  hrNote?: string;
  createdAt?: string;
}

export interface DashboardData {
  totalDoctors: number;
  activeDoctors: number;
  totalStoreStaff: number;
  activeStoreStaff: number;
  totalEmployees: number;
  pendingLeaves: number;
  leaveStats: {
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
  };
  recentJoins: Employee[];
}

export interface Letter {
  id?: string;
  letterNumber?: string;
  issuedDate?: string;
  content?: Record<string, unknown>;
  generatedAt?: string;
  clinicName?: string;
  clinicAddress?: string;
  employeeName?: string;
  designation?: string;
  joiningDate?: string;
  employeeId?: string;
  letterType?: string;
}

export interface EmployeesResponse {
  employees: Employee[];
  total: number;
}

export interface LeavesResponse {
  leaves: Leave[];
  total: number;
}

export interface StoreInfo {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  _count?: { staff: number };
  staff?: Array<{ id: string; name: string; email?: string; isActive: boolean; employeeStatus: EmployeeStatus }>;
}
