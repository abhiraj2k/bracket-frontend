import { useState, useRef } from 'react';
import { useEscKey } from '../../lib/useEscKey';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountsApi, categoriesApi, transactionsApi } from '@et/api';
import type { CategoryResponse } from '@et/api';
import { keys } from '../../lib/queryClient';
import { parseExcelFile, generateTemplate } from '../../lib/excelImport';
import type { ParsedRow } from '../../lib/excelImport';

interface ReviewRow extends ParsedRow {
  id: number;
  accountId: string;
  categoryId: string;
  categoryName: string;
  status: 'pending' | 'success' | 'error';
  errorMsg?: string;
}

let _idSeq = 0;
const nextId = () => ++_idSeq;

export default function ImportTransactions() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [catPickerRowId, setCatPickerRowId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });

  const { data: accounts = [] } = useQuery({ queryKey: keys.accounts, queryFn: accountsApi.list });
  const { data: categories = [] } = useQuery({ queryKey: keys.categories, queryFn: categoriesApi.list });

  const activeAccounts = accounts.filter((a) => a.isActive);

  const handleParsed = (parsed: ParsedRow[]) => {
    const reviewRows: ReviewRow[] = parsed.map((r) => {
      const matched = activeAccounts.find(
        (a) => a.name.trim().toLowerCase() === r.accountName.trim().toLowerCase(),
      );
      return {
        ...r,
        id: nextId(),
        accountId: matched?.id ?? '',
        categoryId: '',
        categoryName: '',
        status: 'pending',
      };
    });
    setRows(reviewRows);
    setStep('review');
  };

  const updateRow = (id: number, patch: Partial<ReviewRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const deleteRow = (id: number) =>
    setRows((rs) => rs.filter((r) => r.id !== id));

  const pendingRows = rows.filter((r) => r.status === 'pending');
  const needsCount = pendingRows.filter((r) => !r.accountId || !r.categoryId).length;
  const allReady = pendingRows.length > 0 && needsCount === 0;

  const handleSubmit = async () => {
    setStep('done');
    const total = pendingRows.length;
    setProgress({ done: 0, total, errors: 0 });
    let errors = 0;
    for (let i = 0; i < pendingRows.length; i++) {
      const row = pendingRows[i];
      try {
        await transactionsApi.create({
          sourceAccountId: row.accountId,
          transactionType: row.type,
          totalAmount: row.amount.toFixed(2),
          transactionDate: new Date(`${row.date}T12:00:00`).toISOString(),
          ...(row.note ? { note: row.note } : {}),
          lineItems: [{ categoryId: row.categoryId, amount: row.amount.toFixed(2) }],
        });
        updateRow(row.id, { status: 'success' });
      } catch {
        errors++;
        updateRow(row.id, { status: 'error', errorMsg: 'Failed' });
      }
      setProgress({ done: i + 1, total, errors });
    }
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: keys.budgetPeriods });
    qc.invalidateQueries({ queryKey: keys.ccBracket });
    qc.invalidateQueries({ queryKey: keys.accounts });
  };

  const pickerRow = catPickerRowId !== null ? rows.find((r) => r.id === catPickerRowId) : null;
  const pickerCategories = categories.filter(
    (c) => !pickerRow || c.categoryType === pickerRow.type,
  );
  const pickerRoots = pickerCategories.filter((c) => !c.parentCategoryId);
  const pickerChildren = (pid: string) =>
    pickerCategories.filter((c) => c.parentCategoryId === pid);

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => (step === 'review' ? setStep('upload') : navigate(-1))}
          className="text-gray-400 text-xl leading-none"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">
          {step === 'upload' ? 'Import Transactions' : step === 'review' ? 'Review' : 'Done'}
        </h1>
        {step === 'review' && (
          <span className="ml-auto text-gray-400 text-sm">{rows.length} rows</span>
        )}
      </div>

      {step === 'upload' && (
        <UploadStep onParsed={handleParsed} />
      )}

      {step === 'review' && (
        <ReviewStep
          rows={rows}
          accounts={activeAccounts}
          needsCount={needsCount}
          allReady={allReady}
          onUpdate={updateRow}
          onDelete={deleteRow}
          onOpenCatPicker={(id) => setCatPickerRowId(id)}
          onSubmit={handleSubmit}
        />
      )}

      {step === 'done' && (
        <DoneStep progress={progress} rows={rows} onViewAll={() => navigate('/transactions')} />
      )}

      {catPickerRowId !== null && (
        <CategoryPicker
          roots={pickerRoots}
          childrenOf={pickerChildren}
          onSelect={(id, name) => {
            updateRow(catPickerRowId, { categoryId: id, categoryName: name });
            setCatPickerRowId(null);
          }}
          onClose={() => setCatPickerRowId(null)}
        />
      )}
    </div>
  );
}

function UploadStep({ onParsed }: { onParsed: (rows: ParsedRow[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const rows = await parseExcelFile(file);
      onParsed(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <p className="text-sm text-gray-400">
          Download the template, fill in your transactions (no category needed), then upload.
        </p>
        <button onClick={generateTemplate} className="btn-ghost text-sm w-full">
          ↓ Download Template (.xlsx)
        </button>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
          dragging ? 'border-brand bg-brand/5' : 'border-border hover:border-gray-500'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handle(f);
        }}
        onClick={() => fileRef.current?.click()}
      >
        <span className="text-5xl">📄</span>
        <p className="text-gray-400 text-sm text-center">
          {loading ? 'Parsing file…' : 'Drag & drop your .xlsx or tap to browse'}
        </p>
        {error && (
          <p className="text-expense text-xs text-center bg-expense/10 rounded-xl px-4 py-2">
            {error}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
        />
      </div>

      <div className="card text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-400">Template columns</p>
        <p>Date (DD/MM/YYYY) · Amount · Type (Expense/Income) · Account · Comment</p>
        <p>Category is assigned in the next step.</p>
      </div>
    </div>
  );
}

function ReviewStep({
  rows,
  accounts,
  needsCount,
  allReady,
  onUpdate,
  onDelete,
  onOpenCatPicker,
  onSubmit,
}: {
  rows: ReviewRow[];
  accounts: { id: string; name: string }[];
  needsCount: number;
  allReady: boolean;
  onUpdate: (id: number, patch: Partial<ReviewRow>) => void;
  onDelete: (id: number) => void;
  onOpenCatPicker: (id: number) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      {needsCount > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 text-warning text-sm">
          {needsCount} row{needsCount !== 1 ? 's' : ''} still need{needsCount === 1 ? 's' : ''} a category or account.
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="card space-y-3">
            {/* Row header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    row.type === 'EXPENSE' ? 'bg-expense/20 text-expense' : 'bg-income/20 text-income'
                  }`}
                >
                  {row.type}
                </span>
                <span className="text-white font-semibold">₹{row.amount.toFixed(2)}</span>
                <span className="text-gray-500 text-xs">{formatDisplayDate(row.date)}</span>
              </div>
              <button onClick={() => onDelete(row.id)} className="text-gray-600 hover:text-expense text-sm px-1">
                ✕
              </button>
            </div>

            {/* Comment */}
            <div>
              <label className="section-title block">Comment</label>
              <input
                type="text"
                value={row.note}
                onChange={(e) => onUpdate(row.id, { note: e.target.value })}
                placeholder="Add a comment…"
                className="input text-sm"
              />
            </div>

            {/* Account */}
            <div>
              <label className="section-title block">Account</label>
              <select
                value={row.accountId}
                onChange={(e) => onUpdate(row.id, { accountId: e.target.value })}
                className={`input ${!row.accountId ? 'border-warning/50' : ''}`}
              >
                <option value="">Select account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="section-title block">Category</label>
              <button
                onClick={() => onOpenCatPicker(row.id)}
                className={`input text-left w-full ${
                  row.categoryId ? 'text-white' : 'text-warning border-warning/50'
                }`}
              >
                {row.categoryId ? row.categoryName : 'Tap to select category…'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onSubmit}
        disabled={!allReady}
        className="btn-primary w-full disabled:opacity-40"
      >
        Import {rows.length} Transaction{rows.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
}

function DoneStep({
  progress,
  rows,
  onViewAll,
}: {
  progress: { done: number; total: number; errors: number };
  rows: ReviewRow[];
  onViewAll: () => void;
}) {
  const inProgress = progress.done < progress.total;
  const successful = progress.done - progress.errors;

  return (
    <div className="space-y-6">
      {inProgress ? (
        <div className="card space-y-3">
          <p className="text-white font-semibold">Importing…</p>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm">{progress.done} / {progress.total}</p>
        </div>
      ) : (
        <div className={`card space-y-2 ${progress.errors === 0 ? 'border-income/30' : 'border-warning/30'}`}>
          <p className="text-2xl">{progress.errors === 0 ? '✅' : '⚠️'}</p>
          <p className="text-white font-bold text-lg">
            {successful} imported{progress.errors > 0 ? `, ${progress.errors} failed` : ''}
          </p>
          <p className="text-gray-400 text-sm">
            {progress.errors === 0
              ? 'All transactions created successfully.'
              : 'Some transactions failed — check details below.'}
          </p>
        </div>
      )}

      {rows.some((r) => r.status === 'error') && (
        <div className="space-y-2">
          <p className="section-title">Failed rows</p>
          {rows.filter((r) => r.status === 'error').map((r) => (
            <div key={r.id} className="card border-expense/30 text-sm">
              <p className="text-white">{formatDisplayDate(r.date)} · ₹{r.amount.toFixed(2)}</p>
              <p className="text-expense text-xs">{r.errorMsg}</p>
            </div>
          ))}
        </div>
      )}

      {!inProgress && (
        <button onClick={onViewAll} className="btn-primary w-full">
          View Transactions
        </button>
      )}
    </div>
  );
}

function CategoryPicker({
  roots,
  childrenOf,
  onSelect,
  onClose,
}: {
  roots: CategoryResponse[];
  childrenOf: (id: string) => CategoryResponse[];
  onSelect: (id: string, name: string) => void;
  onClose: () => void;
}) {
  useEscKey(onClose);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-raised rounded-t-3xl max-h-[70vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface-raised px-5 py-4 border-b border-border flex justify-between">
          <span className="text-white font-semibold">Select Category</span>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <div className="p-4 space-y-1">
          {roots.map((root) => {
            const kids = childrenOf(root.id);
            const displayName = root.customAlias ?? root.name;
            return (
              <div key={root.id}>
                <div className="flex items-center px-3 rounded-xl hover:bg-surface transition-colors">
                  <button
                    onClick={() => onSelect(root.id, displayName)}
                    className="flex-1 py-3 text-white text-sm text-left"
                  >
                    {displayName}
                  </button>
                  {kids.length > 0 && (
                    <button
                      onClick={() => setExpanded(expanded === root.id ? null : root.id)}
                      className="text-gray-500 text-xs pl-3 py-3"
                    >
                      {expanded === root.id ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                {expanded === root.id &&
                  kids.map((kid) => {
                    const kidName = kid.customAlias ?? kid.name;
                    return (
                      <button
                        key={kid.id}
                        onClick={() => onSelect(kid.id, kidName)}
                        className="w-full flex items-center px-8 py-2.5 rounded-xl hover:bg-surface transition-colors text-left"
                      >
                        <span className="text-gray-300 text-sm">{kidName}</span>
                      </button>
                    );
                  })}
              </div>
            );
          })}
          {roots.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-6">No categories found for this type.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDisplayDate(yyyy_mm_dd: string): string {
  const [y, m, d] = yyyy_mm_dd.split('-');
  return `${d}/${m}/${y}`;
}
