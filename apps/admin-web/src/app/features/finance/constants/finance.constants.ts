export const FINANCE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'outstanding', label: 'Outstanding' },
  { id: 'branches', label: 'Branch P&L' },
  { id: 'consultation', label: 'Consultation Revenue' },
  { id: 'medicine', label: 'Medicine Revenue' },
  { id: 'clinic-expenses', label: 'Clinic Expenses' },
  { id: 'store-expenses', label: 'Store Expenses' }
] as const;

export type FinanceTabId = (typeof FINANCE_TABS)[number]['id'];

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  RENT: 'Rent',
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  INTERNET: 'Internet',
  TELEPHONE: 'Telephone',
  EQUIPMENT: 'Equipment',
  SOFTWARE: 'Software',
  FURNITURE: 'Furniture',
  VEHICLE: 'Vehicle',
  STATIONERY: 'Stationery',
  OFFICE_SUPPLIES: 'Office Supplies',
  PACKAGING: 'Packaging',
  CLEANING_SUPPLIES: 'Cleaning Supplies',
  MEDICAL_SUPPLIES: 'Medical Supplies',
  SALARY: 'Salary',
  TRAINING: 'Training',
  INSURANCE: 'Insurance',
  LEGAL: 'Legal',
  SECURITY: 'Security',
  MARKETING: 'Marketing',
  MAINTENANCE: 'Maintenance',
  LOGISTICS: 'Logistics',
  BANK_CHARGES: 'Bank Charges',
  MISC: 'Misc'
};

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS);

export const EXPENSE_CATEGORY_STYLES: Record<string, string> = {
  RENT: '#0f766e',
  ELECTRICITY: '#2563eb',
  STATIONERY: '#7c3aed',
  EQUIPMENT: '#ea580c',
  MARKETING: '#db2777',
  MISC: '#64748b'
};

export function formatPaise(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function paiseToK(paise: number): string {
  const val = paise / 100;
  if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return String(Math.round(val));
}

export const EMPTY_EXPENSE_FORM = {
  level: 'CLINIC' as 'CLINIC' | 'STORE',
  storeId: '',
  category: 'MISC',
  description: '',
  vendor: '',
  billNo: '',
  amountInPaise: 0,
  expenseDate: new Date().toISOString().slice(0, 10)
};
