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

export interface Employee {
  id: string;
  empType: EmpType;
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  specialty?: string;
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
  emergencyContact?: string;
}

export interface Doctor extends Employee {
  empType: 'DOCTOR';
  specialty?: string;
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
  content?: string;
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
