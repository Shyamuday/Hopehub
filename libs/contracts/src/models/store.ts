import type { EmployeeStatus, WorkShift } from './platform';

/** Store counter / manager portal session (distinct from HR `StoreStaff` employee record). */
export interface StorePortalStaff {
  id: string;
  name: string;
  role: 'MANAGER' | 'STAFF';
  staffCode?: string;
  email?: string | null;
  storeId: string;
  storeName?: string;
}

export interface StorePortalAuthResponse {
  token: string;
  staff: StorePortalStaff;
}

export interface Medicine {
  id: string;
  name: string;
  shortName?: string;
  alternateName?: string;
  manufacturer?: string;
  potency: string;
  category?: string;
  description?: string;
  minStockLevel: number;
  isActive: boolean;
  qrCode?: string;
  barcode?: string;
  createdAt: string;
}

export interface MedicineWithStock extends Medicine {
  currentQty: number;
  status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  rack?: StoreRack;
  batches?: StockBatch[];
  storeId: string;
  stockId: string;
}

export interface StoreRack {
  id: string;
  rackCode: string;
  shelfCode: string;
  boxCode: string;
  label?: string;
  potencyColor?: string;
  locationString: string;
}

export interface StockBatch {
  id: string;
  batchNumber: string;
  manufacturer?: string;
  purchaseDate: string;
  expiryDate: string;
  purchasePricePerUnit: number;
  sellingPricePerUnit: number;
  qty: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysToExpiry: number;
}

export interface StockMovement {
  id: string;
  medicineName: string;
  potency: string;
  type: 'PURCHASE_IN' | 'SALE_OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'EXPIRED_REMOVAL';
  qty: number;
  note?: string;
  staffName?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalMedicines: number;
  totalStockValue: number;
  lowStockCount: number;
  expiringCount: number;
  recentMovements: StockMovement[];
  topLowStock: MedicineWithStock[];
  topExpiring: StockBatch[];
}

export interface MedicineDetailResponse {
  medicine: MedicineWithStock;
  stocks: StockBatch[];
  batches: StockBatch[];
  location: StoreRack | null;
}

export interface MovementsPageData {
  movements: StockMovement[];
  pagination: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MedicinesResponse {
  medicines: MedicineWithStock[];
  pagination: Pagination;
}

export interface MovementsResponse {
  movements: StockMovement[];
  pagination: Pagination;
}

export interface StockAddRequest {
  medicineId: string;
  qty: number;
  batchNumber: string;
  expiryDate: string;
  purchasePricePerUnit: number;
  sellingPricePerUnit: number;
  rackId?: string;
  note?: string;
}

export interface StockRemoveRequest {
  stockId: string;
  qty: number;
  note?: string;
  type?: 'SALE_OUT' | 'ADJUSTMENT_OUT' | 'EXPIRED_REMOVAL';
  saleAmountInPaise?: number;
}

export interface RackCreateRequest {
  rackCode: string;
  shelfCode: string;
  boxCode: string;
  label?: string;
  potencyColor?: string;
}

export interface MedicineCreateRequest {
  name: string;
  potency: string;
  manufacturer?: string;
  minStockLevel: number;
  shortName?: string;
  alternateName?: string;
  category?: string;
  description?: string;
}

export interface AlertsLowStockResponse {
  medicines: MedicineWithStock[];
}

export interface AlertsExpiringResponse {
  batches: StockBatch[];
}

export interface StaffActivity {
  staffId: string;
  name: string;
  staffCode: string;
  role: 'MANAGER' | 'STAFF';
  totalActions: number;
  totalQtyIn: number;
  totalQtyOut: number;
  breakdown: { type: string; count: number; qty: number }[];
}

export interface StaffActivityResponse {
  period: string;
  since: string;
  staff: StaffActivity[];
}

export interface StaffHrProfile {
  id: string;
  name: string;
  staffCode: string;
  employeeId?: string;
  role: 'MANAGER' | 'STAFF';
  employeeStatus: EmployeeStatus;
  designation?: string;
  department?: string;
  phone?: string;
  email?: string;
  address?: string;
  joiningDate?: string;
  probationEndDate?: string;
  salaryPerMonth?: number;
  workShift: WorkShift;
  shiftStart?: string;
  shiftEnd?: string;
  weeklyOffDays: string[];
  emergencyContact?: string;
  emergencyPhone?: string;
  joiningLetter?: JoiningLetterDoc;
  store?: { id: string; name: string; code: string };
}

export interface JoiningLetterDoc {
  id: string;
  letterNumber: string;
  issuedDate: string;
  content: Record<string, string | null>;
}

export interface StaffDetailResponse {
  staff: { id: string; name: string; staffCode: string; role: string; createdAt: string };
  period: string;
  breakdown: { type: string; count: number; qty: number }[];
  recentMovements: {
    id: string;
    type: string;
    qty: number;
    note?: string;
    medicineName: string;
    potency: string;
    createdAt: string;
  }[];
}
