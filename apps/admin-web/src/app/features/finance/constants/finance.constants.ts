export const FINANCE_TABS = [
  { id: 'period', label: 'Period reports' },
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

export const FINANCE_PERIOD_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'this_quarter', label: 'This quarter' },
  { id: 'this_year', label: 'This year' },
  { id: 'last_2_years', label: 'Last 2 years' },
  { id: 'last_3_years', label: 'Last 3 years' },
  { id: 'custom', label: 'Custom range' }
] as const;

export const FINANCE_GRANULARITY_OPTIONS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' }
] as const;

export type FinancePeriodPresetId = (typeof FINANCE_PERIOD_PRESETS)[number]['id'];
export type FinanceGranularityId = (typeof FINANCE_GRANULARITY_OPTIONS)[number]['id'];

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
