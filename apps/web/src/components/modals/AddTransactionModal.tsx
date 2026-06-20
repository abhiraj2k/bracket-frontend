import { useState, useEffect } from 'react';
import { useEscKey } from '../../lib/useEscKey';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, categoriesApi, tagsApi, transactionsApi, budgetsApi } from '@et/api';
import type { TransactionType, CategoryResponse, AccountResponse, LineItemRequest } from '@et/api';
import { formatCurrency } from '@et/utils';
import { format } from 'date-fns';
import { keys } from '../../lib/queryClient';

interface Props {
  initialType: TransactionType;
  onClose: () => void;
}

interface LineItem {
  categoryId: string;
  amount: string;
  tagIds: string[];
  budgetGoalId: string;
  note: string;
}

const emptyLine = (): LineItem => ({ categoryId: '', amount: '', tagIds: [], budgetGoalId: '', note: '' });

export default function AddTransactionModal({ initialType, onClose }: Props) {
  useEscKey(onClose);
  const [type, setType] = useState<TransactionType>(initialType);
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [note, setNote] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [showCatPicker, setShowCatPicker] = useState<number | null>(null);

  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: keys.accounts, queryFn: accountsApi.list });
  const { data: categories = [] } = useQuery({ queryKey: keys.categories, queryFn: categoriesApi.list });
  const { data: tags = [] } = useQuery({ queryKey: keys.tags, queryFn: tagsApi.list });
  const { data: goals = [] } = useQuery({ queryKey: keys.budgetGoals, queryFn: budgetsApi.listGoals });

  const activeAccounts = accounts.filter((a) => a.isActive);

  // Auto-select first account
  useEffect(() => {
    if (activeAccounts.length > 0 && !sourceAccountId) {
      setSourceAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, sourceAccountId]);

  // When single line item, auto-sync its amount to totalAmount
  useEffect(() => {
    if (lineItems.length === 1) {
      setLineItems((items) => [{ ...items[0], amount: totalAmount }]);
    }
  }, [totalAmount, lineItems.length]);

  const total = parseFloat(totalAmount) || 0;
  const lineSum = lineItems.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const remaining = total - lineSum;
  const balanced = Math.abs(remaining) < 0.001 && total > 0;
  const allCategorised = type === 'TRANSFER' || lineItems.every((li) => li.categoryId);

  const mutation = useMutation({
    mutationFn: () => {
      const trimmedNote = note.trim();
      const items: LineItemRequest[] = lineItems.map((li) => ({
        ...(type !== 'TRANSFER' && li.categoryId ? { categoryId: li.categoryId } : {}),
        amount: parseFloat(li.amount).toFixed(2),
        ...(li.tagIds.length ? { tagIds: li.tagIds } : {}),
        ...(li.budgetGoalId ? { budgetGoalId: li.budgetGoalId } : {}),
        ...(li.note ? { note: li.note } : {}),
      }));
      return transactionsApi.create({
        sourceAccountId,
        ...(destAccountId ? { destAccountId } : {}),
        transactionType: type,
        totalAmount: parseFloat(totalAmount).toFixed(2),
        transactionDate: new Date(`${date}T12:00:00`).toISOString(),
        ...(trimmedNote ? { note: trimmedNote } : {}),
        lineItems: items,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: keys.budgetPeriods });
      qc.invalidateQueries({ queryKey: keys.ccBracket });
      qc.invalidateQueries({ queryKey: keys.accounts });
      onClose();
    },
  });

  const updateLine = (i: number, patch: Partial<LineItem>) =>
    setLineItems((items) => items.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const addLine = () => setLineItems((items) => [...items, emptyLine()]);
  const removeLine = (i: number) =>
    setLineItems((items) =>
      items.length === 1 ? [emptyLine()] : items.filter((_, idx) => idx !== i),
    );

  // Category tree helpers
  const roots = categories.filter((c) => !c.parentCategoryId);
  const children = (parentId: string) => categories.filter((c) => c.parentCategoryId === parentId);
  const catName = (id: string) => {
    const c = categories.find((c) => c.id === id);
    return c ? (c.customAlias ?? c.name) : 'Select category';
  };

  const destAccount = activeAccounts.find((a) => a.id === destAccountId);
  const isCCPayment = type === 'TRANSFER' && destAccount?.accountType === 'CREDIT_CARD';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-raised rounded-t-3xl flex flex-col max-h-[95vh]">
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">✕</button>
          <div className="flex bg-surface rounded-xl p-1 gap-1">
            {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  type === t ? (t === 'EXPENSE' ? 'bg-expense text-white' : t === 'INCOME' ? 'bg-income text-black' : 'bg-brand text-white') : 'text-gray-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={!balanced || mutation.isPending || !sourceAccountId || !allCategorised}
            className="text-brand font-semibold disabled:text-gray-600 text-sm"
          >
            {mutation.isPending ? '…' : 'Save'}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-10 space-y-4">
          {/* Amount */}
          <div className="text-center py-4">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-3xl text-gray-400 font-light">₹</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="text-5xl font-bold bg-transparent text-white text-center outline-none w-48 placeholder-gray-700"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="section-title block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>

          {/* Source account */}
          <div>
            <label className="section-title block">{type === 'INCOME' ? 'To Account' : 'From Account'}</label>
            <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className="input">
              <option value="">Select account</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>
              ))}
            </select>
          </div>

          {/* Dest account (transfer only) */}
          {type === 'TRANSFER' && (
            <div>
              <label className="section-title block">To Account</label>
              <select value={destAccountId} onChange={(e) => setDestAccountId(e.target.value)} className="input">
                <option value="">Select account</option>
                {activeAccounts.filter((a) => a.id !== sourceAccountId).map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>
                ))}
              </select>
              {isCCPayment && (
                <p className="text-xs text-warning mt-1">
                  ℹ️ Paying a credit card — transfers don't affect budgets.
                </p>
              )}
            </div>
          )}

          {/* Comment — collapsible */}
          {note === '' ? (
            <button
              onClick={() => setNote(' ')}
              className="text-brand text-sm font-medium text-left"
            >
              + Add comment
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="section-title">Comment</label>
                <button onClick={() => setNote('')} className="text-gray-500 text-xs">Remove</button>
              </div>
              <textarea
                placeholder="Add a comment…"
                value={note.trim() === '' ? '' : note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                autoFocus
                className="input resize-none"
              />
            </div>
          )}

          {/* Line items (expense / income only) */}
          {type !== 'TRANSFER' && (
            <div>
              <label className="section-title block">Line Items</label>
              <div className="space-y-3">
                {lineItems.map((li, i) => (
                  <div key={i} className="card space-y-3">
                    {/* Category + delete */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCatPicker(i)}
                        className="input text-left text-gray-300 flex-1"
                      >
                        {catName(li.categoryId)}
                      </button>
                      <button
                        onClick={() => removeLine(i)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-expense/20 text-expense text-sm flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Amount */}
                    {lineItems.length > 1 && (
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Amount"
                        value={li.amount}
                        onChange={(e) => updateLine(i, { amount: e.target.value })}
                        className="input"
                      />
                    )}

                    {/* Budget goal override */}
                    {goals.length > 0 && (
                      <select
                        value={li.budgetGoalId}
                        onChange={(e) => updateLine(i, { budgetGoalId: e.target.value })}
                        className="input text-gray-400"
                      >
                        <option value="">Auto (from category mapping)</option>
                        {goals.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const selected = li.tagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => updateLine(i, {
                                tagIds: selected ? li.tagIds.filter((id) => id !== tag.id) : [...li.tagIds, tag.id],
                              })}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                selected ? 'bg-brand text-white' : 'bg-surface text-gray-400 border border-border'
                              }`}
                            >
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {lineItems.length > 0 && (
                <button onClick={addLine} className="mt-2 text-brand text-sm font-medium">+ Add split</button>
              )}

              {/* Balance tracker */}
              {lineItems.length > 1 && (
                <div className={`mt-3 p-3 rounded-xl text-sm ${balanced ? 'bg-income/10 text-income' : remaining > 0 ? 'bg-warning/10 text-warning' : 'bg-expense/10 text-expense'}`}>
                  {balanced
                    ? '✓ Balanced'
                    : remaining > 0
                    ? `₹${remaining.toFixed(2)} unallocated`
                    : `₹${Math.abs(remaining).toFixed(2)} over-allocated`}
                </div>
              )}

              {!allCategorised && (
                <p className="text-warning text-xs mt-1">Select a category for each line item to save.</p>
              )}
            </div>
          )}

          {mutation.isError && (
            <p className="text-expense text-sm text-center">
              {(mutation.error as Error)?.message?.includes('422') ? 'Line items don\'t balance.' : 'Failed to save. Try again.'}
            </p>
          )}
        </div>
      </div>

      {/* Category picker overlay */}
      {showCatPicker !== null && (
        <CategoryPicker
          categories={categories}
          roots={roots}
          childrenOf={children}
          onSelect={(id) => { updateLine(showCatPicker, { categoryId: id }); setShowCatPicker(null); }}
          onClose={() => setShowCatPicker(null)}
        />
      )}
    </div>
  );
}

function CategoryPicker({ categories, roots, childrenOf, onSelect, onClose }: {
  categories: CategoryResponse[];
  roots: CategoryResponse[];
  childrenOf: (id: string) => CategoryResponse[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  useEscKey(onClose);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
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
                    onClick={() => onSelect(root.id)}
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
                {expanded === root.id && kids.map((kid) => (
                  <button
                    key={kid.id}
                    onClick={() => onSelect(kid.id)}
                    className="w-full flex items-center px-8 py-2.5 rounded-xl hover:bg-surface transition-colors text-left"
                  >
                    <span className="text-gray-300 text-sm">{kid.customAlias ?? kid.name}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
