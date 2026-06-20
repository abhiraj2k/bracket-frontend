import { useState } from 'react';
import { useEscKey } from '../../lib/useEscKey';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@et/api';
import type { TransactionResponse } from '@et/api';
import { formatCurrency, formatDateTime, formatMonthYear } from '@et/utils';
import { keys } from '../../lib/queryClient';
import { format, parseISO } from 'date-fns';

export default function Transactions() {
  const navigate = useNavigate();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<TransactionResponse | null>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: keys.transactions({ month, year, page, size: 30 }),
    queryFn: () => transactionsApi.list({ month, year, page, size: 30 }),
  });

  const qc = useQueryClient();

  const invalidateAfterDelete = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: keys.accounts });
    qc.invalidateQueries({ queryKey: keys.budgetPeriods });
    qc.invalidateQueries({ queryKey: keys.ccBracket });
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      invalidateAfterDelete();
      setSelected(null);
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => transactionsApi.delete(id))),
    onSuccess: () => {
      invalidateAfterDelete();
      setBulkMode(false);
      setSelectedIds(new Set());
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSingleDelete = (id: string) => {
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    setDeletingId(id);
    deleteMut.mutate(id, { onSettled: () => setDeletingId(null) });
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} transaction${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    bulkDeleteMut.mutate(ids);
  };

  const exitBulk = () => { setBulkMode(false); setSelectedIds(new Set()); };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setPage(0);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setPage(0);
  };

  const grouped = groupByDate(data?.content ?? []);
  const hasTransactions = (data?.content.length ?? 0) > 0;

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Transactions</h1>
        <div className="flex items-center gap-3">
          {bulkMode ? (
            <>
              <button onClick={exitBulk} className="text-gray-400 text-sm">Cancel</button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMut.isPending}
                  className="text-expense text-sm font-medium"
                >
                  {bulkDeleteMut.isPending ? 'Deleting…' : `Delete (${selectedIds.size})`}
                </button>
              )}
            </>
          ) : (
            <>
              {hasTransactions && (
                <button onClick={() => setBulkMode(true)} className="text-gray-400 hover:text-white transition-colors p-1">
                  <SelectIcon />
                </button>
              )}
              <button onClick={() => navigate('/import')} className="btn-ghost text-sm">
                Import
              </button>
            </>
          )}
        </div>
      </div>

      {/* Month picker */}
      <div className="flex items-center justify-between card mb-4">
        <button onClick={prevMonth} className="p-2 text-gray-400 hover:text-white">‹</button>
        <span className="text-white font-semibold">{formatMonthYear(month, year)}</span>
        <button onClick={nextMonth} className="p-2 text-gray-400 hover:text-white">›</button>
      </div>

      {isLoading && <SkeletonList />}

      {isError && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-gray-400 mb-4">Could not load transactions.</p>
          <button onClick={() => refetch()} className="btn-ghost text-sm">Retry</button>
        </div>
      )}

      {!isLoading && !isError && data?.content.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">📭</p>
          <p>No transactions in {formatMonthYear(month, year)}.</p>
        </div>
      )}

      {/* Grouped list */}
      <div className="space-y-4 pb-24">
        {Object.entries(grouped).map(([date, txs]) => (
          <div key={date}>
            <p className="text-xs text-gray-500 font-medium mb-2">
              {format(parseISO(date), 'EEE, MMM d')}
            </p>
            <div className="space-y-2">
              {txs.map((tx) => (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  bulkMode={bulkMode}
                  isSelected={selectedIds.has(tx.id)}
                  onToggle={() => toggleSelect(tx.id)}
                  onClick={() => { if (!bulkMode) setSelected(tx); }}
                  onDelete={() => handleSingleDelete(tx.id)}
                  isDeleting={deletingId === tx.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-3 py-4">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="text-brand disabled:text-gray-600 text-sm">← Prev</button>
          <span className="text-gray-500 text-sm">{page + 1} / {data.totalPages}</span>
          <button disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)} className="text-brand disabled:text-gray-600 text-sm">Next →</button>
        </div>
      )}

      {/* Detail sheet */}
      {selected && (
        <TxDetailSheet
          tx={selected}
          onClose={() => setSelected(null)}
          onDelete={() => {
            if (confirm('Delete this transaction? This cannot be undone.')) {
              deleteMut.mutate(selected.id);
            }
          }}
          isDeleting={deleteMut.isPending}
        />
      )}
    </div>
  );
}

function TxRow({
  tx, bulkMode, isSelected, onToggle, onClick, onDelete, isDeleting,
}: {
  tx: TransactionResponse;
  bulkMode: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const isExpense = tx.transactionType === 'EXPENSE';
  const isIncome = tx.transactionType === 'INCOME';
  const cat = tx.lineItems[0]?.categoryName ?? tx.transactionType;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={bulkMode ? onToggle : onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { bulkMode ? onToggle() : onClick(); } }}
      className="card w-full flex items-center gap-3 text-left hover:bg-surface/80 transition-colors cursor-pointer"
    >
      {bulkMode && (
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isSelected ? 'border-brand bg-brand' : 'border-gray-600'
        }`}>
          {isSelected && <span className="text-white text-[10px] leading-none">✓</span>}
        </div>
      )}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
        isExpense ? 'bg-expense/10' : isIncome ? 'bg-income/10' : 'bg-border'
      }`}>
        {isIncome ? '💰' : isExpense ? '💸' : '↔'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{tx.note ?? cat}</p>
        <p className="text-gray-500 text-xs truncate">{tx.sourceAccountName}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${isExpense ? 'text-expense' : isIncome ? 'text-income' : 'text-transfer'}`}>
          {isExpense ? '-' : isIncome ? '+' : ''}{formatCurrency(tx.totalAmount)}
        </p>
        {tx.lineItems.length > 1 && (
          <span className="text-[10px] text-gray-500">split</span>
        )}
      </div>
      {!bulkMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={isDeleting}
          className="text-gray-600 hover:text-expense transition-colors p-1 flex-shrink-0 disabled:opacity-40"
          aria-label="Delete transaction"
        >
          {isDeleting ? <span className="text-xs">…</span> : <TrashIcon />}
        </button>
      )}
    </div>
  );
}

function TxDetailSheet({ tx, onClose, onDelete, isDeleting }: {
  tx: TransactionResponse; onClose: () => void; onDelete: () => void; isDeleting: boolean;
}) {
  useEscKey(onClose);
  const isExpense = tx.transactionType === 'EXPENSE';
  const isIncome = tx.transactionType === 'INCOME';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-raised rounded-t-3xl p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        <div className="relative mb-2">
          <div className="w-10 h-1 bg-border rounded-full mx-auto" />
          <button onClick={onClose} className="absolute top-0 right-0 text-gray-400 hover:text-white p-1">✕</button>
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-sm capitalize">{tx.transactionType.toLowerCase()}</p>
          <p className={`text-4xl font-bold mt-1 ${isExpense ? 'text-expense' : isIncome ? 'text-income' : 'text-transfer'}`}>
            {isExpense ? '-' : isIncome ? '+' : ''}{formatCurrency(tx.totalAmount)}
          </p>
          <p className="text-gray-500 text-sm mt-1">{formatDateTime(tx.transactionDate)}</p>
        </div>

        <div className="space-y-2 text-sm">
          <Row label="From" value={tx.sourceAccountName} />
          {tx.destAccountName && <Row label="To" value={tx.destAccountName} />}
        </div>

        {tx.note && (
          <div>
            <p className="section-title mb-1">Comment</p>
            <p className="text-gray-300 text-sm bg-surface rounded-xl px-4 py-3 whitespace-pre-wrap">{tx.note}</p>
          </div>
        )}

        {tx.lineItems.length > 0 && (
          <div>
            <p className="section-title">Line Items</p>
            <div className="space-y-2">
              {tx.lineItems.map((li) => (
                <div key={li.id} className="flex justify-between text-sm">
                  <span className="text-gray-300">{li.categoryName ?? '—'}</span>
                  <span className="text-white">{formatCurrency(li.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onDelete} disabled={isDeleting} className="btn-destructive">
          {isDeleting ? 'Deleting…' : 'Delete Transaction'}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function groupByDate(txs: TransactionResponse[]) {
  return txs.reduce<Record<string, TransactionResponse[]>>((acc, tx) => {
    const d = tx.transactionDate.split('T')[0];
    (acc[d] ??= []).push(tx);
    return acc;
  }, {});
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card flex gap-3 animate-pulse">
          <div className="w-10 h-10 bg-border rounded-full" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 bg-border rounded w-3/4" />
            <div className="h-2 bg-border rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function SelectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M17 14l-3 3 1.5 1.5L17 17l4-4" />
    </svg>
  );
}
