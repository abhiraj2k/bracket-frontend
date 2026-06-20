import * as XLSX from 'xlsx';

export interface ParsedRow {
  date: string;        // yyyy-MM-dd
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  accountName: string;
  note: string;
}

type RawRow = Record<string, unknown>;

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/[\s_\-]+/g, '');
}

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  date: 'date',
  amount: 'amount',
  type: 'type',
  transactiontype: 'type',
  account: 'accountName',
  accountname: 'accountName',
  note: 'note',
  comment: 'note',
  comments: 'note',
  description: 'note',
  memo: 'note',
  remarks: 'note',
};

function parseDate(raw: unknown): string {
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    const parts = s.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (c.length === 4) {
        // DD/MM/YYYY
        return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      }
      if (a.length === 4) {
        // YYYY-MM-DD
        return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      }
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  if (typeof raw === 'number') {
    const info = XLSX.SSF.parse_date_code(raw);
    if (info) {
      return `${info.y}-${String(info.m).padStart(2, '0')}-${String(info.d).padStart(2, '0')}`;
    }
  }
  throw new Error(`Cannot parse date: ${raw}`);
}

function parseType(raw: unknown): 'EXPENSE' | 'INCOME' {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s.startsWith('EXP')) return 'EXPENSE';
  if (s.startsWith('INC')) return 'INCOME';
  throw new Error(`Unknown type "${raw}" — use Expense or Income`);
}

export async function parseExcelFile(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawRows.length === 0) throw new Error('No data rows found in the file.');

  // Map actual header names → ParsedRow field
  const firstRow = rawRows[0];
  const keyMap: Record<string, keyof ParsedRow> = {};
  for (const key of Object.keys(firstRow)) {
    const mapped = HEADER_MAP[normalizeKey(key)];
    if (mapped) keyMap[key] = mapped;
  }

  const mappedFields = new Set(Object.values(keyMap));
  for (const f of ['date', 'amount', 'type', 'accountName'] as const) {
    if (!mappedFields.has(f)) {
      const label = f === 'accountName' ? 'Account' : f.charAt(0).toUpperCase() + f.slice(1);
      throw new Error(`Missing required column: "${label}"`);
    }
  }

  const get = (row: RawRow, field: keyof ParsedRow): unknown => {
    const key = Object.keys(keyMap).find((k) => keyMap[k] === field);
    return key ? row[key] : '';
  };

  const rows: ParsedRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    try {
      const date = parseDate(get(raw, 'date'));
      const amountRaw = String(get(raw, 'amount') ?? '').replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountRaw);
      if (isNaN(amount) || amount <= 0) throw new Error(`Invalid amount: ${get(raw, 'amount')}`);
      const type = parseType(get(raw, 'type'));
      const accountName = String(get(raw, 'accountName') ?? '').trim();
      if (!accountName) throw new Error('Account is empty');
      const note = String(get(raw, 'note') ?? '').trim();
      rows.push({ date, amount, type, accountName, note });
    } catch (e) {
      throw new Error(`Row ${i + 2}: ${(e as Error).message}`);
    }
  }

  return rows;
}

export function generateTemplate(): void {
  const data = [
    ['Date', 'Amount', 'Type', 'Account', 'Comment'],
    ['15/06/2026', 250, 'Expense', 'HDFC Savings', 'Grocery run'],
    ['16/06/2026', 1200, 'Expense', 'HDFC Savings', 'Restaurant dinner'],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, 'expense-tracker-template.xlsx');
}
