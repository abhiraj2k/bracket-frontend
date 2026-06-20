import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { accountsApi, reportsApi, transactionsApi } from '@et/api';
import type { AccountResponse, BudgetPeriodResponse, TransactionResponse } from '@et/api';
import { formatCurrency, formatRelativeDate, currentMonthYear } from '@et/utils';
import { useAuthStore } from '@et/store';
import { keys } from '../../lib/queryClient';
import { budgetsApi } from '@et/api';
import { AddModalContext } from '../../components/layout/AppShell';

const ALERT_ORDER = { ALERT: 0, WARNING: 1, MILESTONE: 2, OK: 3 };

export default function Dashboard() {
  const name = useAuthStore((s) => s.name);
  const navigate = useNavigate();
  const { month, year } = currentMonthYear();
  const qc = useQueryClient();

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: accounts = [] } = useQuery({ queryKey: keys.accounts, queryFn: accountsApi.list });
  const { data: periods = [] } = useQuery({ queryKey: keys.budgetPeriods, queryFn: budgetsApi.currentPeriods });
  const { data: txPage, refetch: refetchTx } = useQuery({
    queryKey: keys.transactions({ month, year, page: 0, size: 5 }),
    queryFn: () => transactionsApi.list({ month, year, page: 0, size: 5 }),
  });
  const { data: bracket } = useQuery({ queryKey: keys.ccBracket, queryFn: reportsApi.creditCardBracket });

  const invalidateAfterDelete = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: keys.accounts });
    qc.invalidateQueries({ queryKey: keys.budgetPeriods });
    qc.invalidateQueries({ queryKey: keys.ccBracket });
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: invalidateAfterDelete,
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

  const netBalance = accounts
    .filter((a) => a.isActive && a.accountType !== 'CREDIT_CARD')
    .reduce((sum, a) => sum + parseFloat(a.balance), 0);

  const sortedPeriods = [...periods].sort(
    (a, b) => (ALERT_ORDER[a.alertLevel] ?? 3) - (ALERT_ORDER[b.alertLevel] ?? 3)
  );

  const txList = txPage?.content ?? [];

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Good {greeting()}, {name?.split(' ')[0]}</p>
          <p className="text-gray-500 text-xs">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <Link to="/settings" className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <SettingsIcon />
        </Link>
      </div>

      {/* Net Balance Hero */}
      <div
        className="card bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20 cursor-pointer"
        onClick={() => navigate('/settings/accounts')}
      >
        <p className="text-gray-400 text-sm mb-1">Net Balance</p>
        <p className="text-4xl font-bold text-white">{formatCurrency(netBalance)}</p>
        <p className="text-gray-500 text-xs mt-1">Across {accounts.filter((a) => a.isActive && a.accountType !== 'CREDIT_CARD').length} accounts</p>
      </div>

      {/* 2-col widgets */}
      <div className="grid grid-cols-2 gap-3">
        {bracket && parseFloat(bracket.totalCreditCardLiability) > 0 && (
          <div className="card border border-expense/20">
            <p className="text-gray-400 text-xs mb-1">CC Bracket</p>
            <p className="text-expense font-bold text-lg">{formatCurrency(bracket.totalCreditCardLiability)}</p>
            <p className="text-gray-500 text-xs">{bracket.accountCount} card{bracket.accountCount !== 1 ? 's' : ''}</p>
            <button onClick={() => AddModalContext.open('TRANSFER')} className="mt-2 text-[11px] text-brand font-medium">
              Pay Bill →
            </button>
          </div>
        )}
        <MonthSummary transactions={txList} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map((type) => (
          <button
            key={type}
            onClick={() => AddModalContext.open(type)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              type === 'EXPENSE' ? 'bg-expense/10 text-expense' :
              type === 'INCOME' ? 'bg-income/10 text-income' :
              'bg-surface text-gray-400'
            }`}
          >
            {type === 'EXPENSE' ? '− Expense' : type === 'INCOME' ? '+ Income' : '↔ Transfer'}
          </button>
        ))}
      </div>

      {/* Budget Goals */}
      {sortedPeriods.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Budget Goals</h2>
            <Link to="/budget" className="text-brand text-sm">View all →</Link>
          </div>
          <div className="space-y-3">
            {sortedPeriods.slice(0, 3).map((p) => (
              <BudgetCard key={p.id} period={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Recent</h2>
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
                {txList.length > 0 && (
                  <button onClick={() => setBulkMode(true)} className="text-gray-400 hover:text-white transition-colors p-1">
                    <SelectIcon />
                  </button>
                )}
                <Link to="/transactions" className="text-brand text-sm">View all →</Link>
              </>
            )}
          </div>
        </div>

        {txList.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500 text-sm">No transactions yet.</p>
            <button onClick={() => AddModalContext.open('EXPENSE')} className="text-brand text-sm mt-2">Add your first →</button>
          </div>
        ) : (
          <div className="space-y-2">
            {txList.map((tx) => (
              <TxRow
                key={tx.id}
                tx={tx}
                bulkMode={bulkMode}
                isSelected={selectedIds.has(tx.id)}
                onToggle={() => toggleSelect(tx.id)}
                onDelete={() => handleSingleDelete(tx.id)}
                isDeleting={deletingId === tx.id}
              />
            ))}
          </div>
        )}
      </section>

      <div className="h-4" />
    </div>
  );
}

function MonthSummary({ transactions }: { transactions: TransactionResponse[] }) {
  const income = transactions.filter((t) => t.transactionType === 'INCOME').reduce((s, t) => s + parseFloat(t.totalAmount), 0);
  const expense = transactions.filter((t) => t.transactionType === 'EXPENSE').reduce((s, t) => s + parseFloat(t.totalAmount), 0);
  return (
    <div className="card col-span-1">
      <p className="text-gray-400 text-xs mb-2">This Month</p>
      <p className="text-income text-sm font-semibold">+{formatCurrency(income)}</p>
      <p className="text-expense text-sm font-semibold">-{formatCurrency(expense)}</p>
    </div>
  );
}

function BudgetCard({ period }: { period: BudgetPeriodResponse }) {
  const navigate = useNavigate();
  const pct = parseFloat(period.startingBalance) > 0
    ? Math.min((parseFloat(period.spentAmount) / parseFloat(period.startingBalance)) * 100, 100)
    : 0;

  const barColor =
    period.alertLevel === 'ALERT' ? 'bg-expense' :
    period.alertLevel === 'WARNING' ? 'bg-warning' :
    period.alertLevel === 'MILESTONE' ? 'bg-income' : 'bg-brand';

  const badgeClass =
    period.alertLevel === 'ALERT' ? 'badge-alert' :
    period.alertLevel === 'WARNING' ? 'badge-warning' :
    period.alertLevel === 'MILESTONE' ? 'badge-milestone' : '';

  return (
    <div
      className="card cursor-pointer hover:bg-surface/80 transition-colors"
      onClick={() => navigate(`/budget/goals/${period.budgetGoalId}`)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-sm font-medium">{period.budgetGoalName}</span>
        {badgeClass && <span className={badgeClass}>{period.alertLevel}</span>}
      </div>
      <div className="w-full bg-border rounded-full h-1.5 mb-2">
        <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatCurrency(period.spentAmount)} spent</span>
        <span>{formatCurrency(period.remainingAmount)} left</span>
      </div>
    </div>
  );
}

function TxRow({
  tx, bulkMode, isSelected, onToggle, onDelete, isDeleting,
}: {
  tx: TransactionResponse;
  bulkMode: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const isExpense = tx.transactionType === 'EXPENSE';
  const isIncome = tx.transactionType === 'INCOME';
  const primaryCategory = tx.lineItems[0]?.categoryName ?? tx.transactionType;

  return (
    <div
      className={`card flex items-center gap-3 ${bulkMode ? 'cursor-pointer' : ''}`}
      onClick={bulkMode ? onToggle : undefined}
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
        <p className="text-white text-sm font-medium truncate">{tx.note ?? primaryCategory}</p>
        <p className="text-gray-500 text-xs">{tx.sourceAccountName} · {formatRelativeDate(tx.transactionDate)}</p>
      </div>
      <span className={isExpense ? 'amount-expense' : isIncome ? 'amount-income' : 'amount-transfer'}>
        {isExpense ? '-' : isIncome ? '+' : ''}{formatCurrency(tx.totalAmount)}
      </span>
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

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
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
