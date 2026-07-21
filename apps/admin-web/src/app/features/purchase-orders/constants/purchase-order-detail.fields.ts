import type { DetailFieldDef } from '@hopehub/platform-ui';

export type PurchaseOrderDetail = {
  status: string;
  supplierName?: string;
  storeName?: string;
  notes?: string;
};

export const PURCHASE_ORDER_DETAIL_FIELDS: DetailFieldDef<PurchaseOrderDetail>[] = [
  { label: 'Status', getValue: (o) => o.status },
  { label: 'Supplier', getValue: (o) => o.supplierName, emptyText: 'N/A' },
  { label: 'Store', getValue: (o) => o.storeName, emptyText: 'N/A' },
  { label: 'Notes', getValue: (o) => o.notes, omitWhenEmpty: true }
];
