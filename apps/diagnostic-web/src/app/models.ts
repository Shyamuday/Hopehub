export interface ReceptionUser {
  id: string;
  name: string;
  email?: string | null;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: ReceptionUser;
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
