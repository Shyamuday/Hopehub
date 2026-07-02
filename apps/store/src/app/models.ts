export interface StoreStaff {
  id: string;
  name: string;
  role: 'MANAGER' | 'STAFF';
  storeId: string;
  storeName?: string;
}

export interface AuthResponse {
  token: string;
  staff: StoreStaff;
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
