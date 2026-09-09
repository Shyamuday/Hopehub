import readWorkbook, { type CellValue, type Sheet } from 'read-excel-file/node';
import { normalizeMarketingEmail, type StructuredMarketingContact } from './email-marketing.js';

const MAX_ROWS = 100_000;
const MAX_COLUMNS = 200;
const MAX_CONTACTS = 50_000;

type DataRow = Array<CellValue | null>;
type SourceSheet = { sheet: string; data: DataRow[] };
type ParsedContact = StructuredMarketingContact & {
  sourceSegments: string[];
  tags: string[];
  productNames: string[];
  productSkus: string[];
  paymentMethods: string[];
  orderStatuses: string[];
};

type ContactAccumulator = Omit<ParsedContact, 'orderCount' | 'totalOrderValue'> & {
  latestProfileAt?: Date;
  firstOrderAt?: Date;
  lastOrderAt?: Date;
  sourceSegmentSet: Set<string>;
  tagSet: Set<string>;
  productNameSet: Set<string>;
  productSkuSet: Set<string>;
  paymentMethodSet: Set<string>;
  orderStatusSet: Set<string>;
  orderTotals: Map<string, number>;
};

export type MarketingSpreadsheetPreview = {
  fileName: string;
  format: 'CSV' | 'XLSX';
  sheets: Array<{ name: string; rows: number; columns: string[] }>;
  sourceRows: number;
  validContacts: number;
  skippedRows: number;
  mappedFields: string[];
  contacts: ParsedContact[];
};

const FIELD_ALIASES = {
  email: ['customer email', 'email', 'email address', 'e-mail'],
  name: ['customer name', 'shipping name', 'full name', 'customer'],
  fallbackName: ['name'],
  mobile: ['customer mobile', 'shipping phone', 'mobile', 'mobile no', 'phone', 'phone number'],
  alternatePhone: ['customer alternate phone', 'alternate phone', 'alternate mobile'],
  addressLine1: ['address line 1', 'shipping address1', 'shipping address 1', 'address1'],
  addressLine2: ['address line 2', 'shipping address2', 'shipping address 2', 'address2'],
  landmark: ['landmark'],
  city: ['address city', 'shipping city', 'city'],
  state: ['address state', 'shipping province name', 'shipping state', 'state', 'province'],
  postalCode: ['address pincode', 'shipping zip', 'postal code', 'pincode', 'pin code', 'zip'],
  country: ['country', 'shipping country'],
  sourceChannel: ['channel', 'source channel', 'sales channel'],
  tags: ['order tags', 'tags', 'customer tags'],
  productName: ['product name', 'lineitem name', 'line item name', 'item name'],
  productSku: ['channel sku', 'lineitem sku', 'line item sku', 'sku'],
  paymentMethod: ['payment method', 'payment mode'],
  orderStatus: ['status', 'order status'],
  orderDate: ['channel created at', 'created at', 'order date', 'created date'],
  orderTotal: ['order total', 'total', 'total amount', 'amount'],
  orderId: ['order id', 'order number', 'order no', 'invoice number']
} as const;

type FieldName = keyof typeof FIELD_ALIASES;

const clean = (value: CellValue | null | undefined) => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

const normalizedHeader = (value: CellValue | null) =>
  clean(value)?.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

function headerMap(headers: DataRow) {
  const normalized = headers.map(normalizedHeader);
  const indexes = {} as Partial<Record<FieldName, number>>;
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<
    [FieldName, readonly string[]]
  >) {
    const index = normalized.findIndex((header) => Boolean(header && aliases.includes(header)));
    if (index >= 0) indexes[field] = index;
  }
  return indexes;
}

function parseDelimited(text: string): DataRow[] {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || '';
  const candidates = [',', '\t', ';'];
  const delimiter = candidates.sort(
    (a, b) => firstLine.split(b).length - firstLine.split(a).length
  )[0];
  const rows: DataRow[] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index++;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index++;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = '';
    } else value += character;
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function parseDate(value: CellValue | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = clean(value);
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseAmount(value: CellValue | null | undefined) {
  if (typeof value === 'number') return Math.max(0, value);
  const number = Number((clean(value) || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function addValues(target: Set<string>, value: CellValue | null | undefined) {
  for (const item of (clean(value) || '').split(/[,;|]/)) {
    const normalized = item.trim();
    if (normalized) target.add(normalized);
  }
}

function newAccumulator(email: string): ContactAccumulator {
  return {
    email,
    sourceSegments: [],
    tags: [],
    productNames: [],
    productSkus: [],
    paymentMethods: [],
    orderStatuses: [],
    sourceSegmentSet: new Set(),
    tagSet: new Set(),
    productNameSet: new Set(),
    productSkuSet: new Set(),
    paymentMethodSet: new Set(),
    orderStatusSet: new Set(),
    orderTotals: new Map()
  };
}

function rowValue(row: DataRow, indexes: Partial<Record<FieldName, number>>, field: FieldName) {
  const index = indexes[field];
  return index === undefined ? undefined : row[index];
}

function applyRow(
  contacts: Map<string, ContactAccumulator>,
  row: DataRow,
  indexes: Partial<Record<FieldName, number>>,
  segment: string,
  defaultChannel: string,
  rowNumber: number
) {
  const emailValue = clean(rowValue(row, indexes, 'email'));
  if (!emailValue) return false;
  const email = normalizeMarketingEmail(emailValue);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  let contact = contacts.get(email);
  if (!contact) {
    if (contacts.size >= MAX_CONTACTS)
      throw new Error(`A file may contain at most ${MAX_CONTACTS} contacts.`);
    contact = newAccumulator(email);
    contacts.set(email, contact);
  }
  const orderDate = parseDate(rowValue(row, indexes, 'orderDate'));
  if (orderDate) {
    if (!contact.firstOrderAt || orderDate < contact.firstOrderAt) contact.firstOrderAt = orderDate;
    if (!contact.lastOrderAt || orderDate > contact.lastOrderAt) contact.lastOrderAt = orderDate;
  }
  if (!contact.latestProfileAt || !orderDate || orderDate >= contact.latestProfileAt) {
    const preferredName = clean(rowValue(row, indexes, 'name'));
    const fallbackName = clean(rowValue(row, indexes, 'fallbackName'));
    const fields: Array<[keyof StructuredMarketingContact, FieldName]> = [
      ['mobile', 'mobile'],
      ['alternatePhone', 'alternatePhone'],
      ['addressLine1', 'addressLine1'],
      ['addressLine2', 'addressLine2'],
      ['landmark', 'landmark'],
      ['city', 'city'],
      ['state', 'state'],
      ['postalCode', 'postalCode'],
      ['country', 'country']
    ];
    if (preferredName || (!contact.name && fallbackName))
      contact.name = preferredName || fallbackName;
    for (const [target, source] of fields) {
      const value = clean(rowValue(row, indexes, source));
      if (value) (contact as Record<string, unknown>)[target] = value;
    }
    contact.sourceChannel =
      clean(rowValue(row, indexes, 'sourceChannel')) || contact.sourceChannel || defaultChannel;
    if (orderDate) contact.latestProfileAt = orderDate;
  }
  contact.sourceSegmentSet.add(segment);
  addValues(contact.tagSet, rowValue(row, indexes, 'tags'));
  addValues(contact.productNameSet, rowValue(row, indexes, 'productName'));
  addValues(contact.productSkuSet, rowValue(row, indexes, 'productSku'));
  addValues(contact.paymentMethodSet, rowValue(row, indexes, 'paymentMethod'));
  addValues(contact.orderStatusSet, rowValue(row, indexes, 'orderStatus'));
  const hasOrderData = ['orderId', 'orderDate', 'orderTotal', 'productName', 'productSku'].some(
    (field) => clean(rowValue(row, indexes, field as FieldName))
  );
  if (hasOrderData) {
    const orderId = clean(rowValue(row, indexes, 'orderId'));
    const shopifyName = clean(rowValue(row, indexes, 'fallbackName'));
    const orderKey =
      orderId ||
      (indexes.name !== undefined ? shopifyName : undefined) ||
      `${segment}:${rowNumber}`;
    const amount = parseAmount(rowValue(row, indexes, 'orderTotal'));
    if (orderKey)
      contact.orderTotals.set(orderKey, Math.max(amount, contact.orderTotals.get(orderKey) || 0));
  }
  return true;
}

export async function parseMarketingSpreadsheet(input: {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
}): Promise<MarketingSpreadsheetPreview> {
  const extension = input.fileName.toLowerCase().split('.').pop();
  if (!['csv', 'xlsx'].includes(extension || '')) {
    throw new Error(
      'Only .csv and .xlsx files are supported. Save legacy .xls files as .xlsx first.'
    );
  }
  const format = extension === 'xlsx' ? 'XLSX' : 'CSV';
  let sources: SourceSheet[];
  if (format === 'XLSX') {
    const sheets = (await readWorkbook(input.buffer)) as Sheet[];
    sources = sheets.map((sheet) => ({ sheet: sheet.sheet, data: sheet.data }));
  } else {
    sources = [
      {
        sheet: input.fileName.replace(/\.csv$/i, ''),
        data: parseDelimited(input.buffer.toString('utf8'))
      }
    ];
  }
  const contacts = new Map<string, ContactAccumulator>();
  const sheets: MarketingSpreadsheetPreview['sheets'] = [];
  const mappedFields = new Set<string>();
  let sourceRows = 0;
  let validRows = 0;
  for (const source of sources) {
    const data = source.data.filter((row) => row.some((cell) => clean(cell)));
    if (!data.length) continue;
    if (data[0].length > MAX_COLUMNS)
      throw new Error(`A worksheet may contain at most ${MAX_COLUMNS} columns.`);
    sourceRows += Math.max(0, data.length - 1);
    if (sourceRows > MAX_ROWS) throw new Error(`A file may contain at most ${MAX_ROWS} data rows.`);
    const indexes = headerMap(data[0]);
    if (indexes.email === undefined) continue;
    for (const field of Object.keys(indexes)) mappedFields.add(field);
    const columns = data[0]
      .map((value) => clean(value))
      .filter((value): value is string => Boolean(value));
    sheets.push({ name: source.sheet, rows: Math.max(0, data.length - 1), columns });
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      if (
        applyRow(
          contacts,
          data[rowIndex],
          indexes,
          source.sheet,
          format === 'XLSX' ? 'XLSX_UPLOAD' : 'CSV_UPLOAD',
          rowIndex + 1
        )
      )
        validRows++;
    }
  }
  if (!sheets.length) throw new Error('No worksheet contains a recognizable Email column.');
  const parsedContacts: ParsedContact[] = [...contacts.values()].map((contact) => ({
    email: contact.email,
    name: contact.name,
    mobile: contact.mobile,
    alternatePhone: contact.alternatePhone,
    addressLine1: contact.addressLine1,
    addressLine2: contact.addressLine2,
    landmark: contact.landmark,
    city: contact.city,
    state: contact.state,
    postalCode: contact.postalCode,
    country: contact.country,
    sourceChannel: contact.sourceChannel,
    sourceSegments: [...contact.sourceSegmentSet],
    tags: [...contact.tagSet],
    productNames: [...contact.productNameSet],
    productSkus: [...contact.productSkuSet],
    paymentMethods: [...contact.paymentMethodSet],
    orderStatuses: [...contact.orderStatusSet],
    firstOrderAt: contact.firstOrderAt,
    lastOrderAt: contact.lastOrderAt,
    orderCount: contact.orderTotals.size,
    totalOrderValue: [...contact.orderTotals.values()].reduce((sum, value) => sum + value, 0),
    currency: 'INR'
  }));
  return {
    fileName: input.fileName,
    format,
    sheets,
    sourceRows,
    validContacts: parsedContacts.length,
    skippedRows: Math.max(0, sourceRows - validRows),
    mappedFields: [...mappedFields].sort(),
    contacts: parsedContacts
  };
}

export function publicMarketingSpreadsheetPreview(preview: MarketingSpreadsheetPreview) {
  const { contacts: _contacts, ...safePreview } = preview;
  return safePreview;
}
