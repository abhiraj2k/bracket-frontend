import { useParams, useNavigate } from 'react-router';
import { useEscKey } from '../../lib/useEscKey';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi, categoriesApi } from '@et/api';
import type { CategoryMappingResponse } from '@et/api';
import { formatCurrency } from '@et/utils';
import { keys } from '../../lib/queryClient';
import { useState } from 'react';

export default function GoalDetail() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCatPicker, setShowCatPicker] = useState(false);
  useEscKey(() => { if (showCatPicker) setShowCatPicker(false); });

  const { data: periods = [] } = useQuery({ queryKey: keys.budgetPeriods, queryFn: budgetsApi.currentPeriods });
  const { data: goals = [] } = useQuery({ queryKey: keys.budgetGoals, queryFn: budgetsApi.listGoals });
  const { data: mappings = [] } = useQuery({
    queryKey: keys.goalCategories(goalId!),
    queryFn: () => budgetsApi.listCategoryMappings(goalId!),
    enabled: !!goalId,
  });
  const { data: categories = [] } = useQuery({ queryKey: keys.categories, queryFn: categoriesApi.list });

  const period = periods.find((p) => p.budgetGoalId === goalId);
  const goal = goals.find((g) => g.id === goalId);

  const addMapping = useMutation({
    mutationFn: ({ categoryId, isDefault }: { categoryId: string; isDefault: boolean }) =>
      budgetsApi.addCategoryMapping(goalId!, { categoryId, isDefault }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goalCategories(goalId!) }),
  });

  const removeMapping = useMutation({
    mutationFn: (categoryId: string) => budgetsApi.removeCategoryMapping(goalId!, categoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goalCategories(goalId!) }),
  });

  const setDefault = useMutation({
    mutationFn: (categoryId: string) => budgetsApi.addCategoryMapping(goalId!, { categoryId, isDefault: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goalCategories(goalId!) }),
  });

  const deleteGoal = useMutation({
    mutationFn: () => budgetsApi.deleteGoal(goalId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.budgetGoals });
      qc.invalidateQueries({ queryKey: keys.budgetPeriods });
      navigate('/budget');
    },
  });

  if (!goal) return <div className="p-6 text-gray-400">Loading…</div>;

  const pct = period && parseFloat(period.startingBalance) > 0
    ? Math.min((parseFloat(period.spentAmount) / parseFloat(period.startingBalance)) * 100, 100)
    : 0;

  const mappedCatIds = new Set(mappings.map((m) => m.categoryId));
  const availableCats = categories.filter((c) => !mappedCatIds.has(c.id) && !c.parentCategoryId === false);

  const catName = (id: string) => {
    const c = categories.find((c) => c.id === id);
    return c ? (c.customAlias ?? c.name) : id;
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <button onClick={() => navigate('/budget')} className="text-gray-400 text-sm mb-4 flex items-center gap-1">
        ← Budget
      </button>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">{goal.name}</h1>
          <span className="badge-ok mt-1 inline-block">{goal.budgetType}</span>
        </div>
      </div>

      {/* Period stats */}
      {period && (
        <div className="card space-y-3 mb-5">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-gray-500 text-xs">Target</p>
              <p className="text-white font-semibold">{formatCurrency(period.targetAmount)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Spent</p>
              <p className="text-expense font-semibold">{formatCurrency(period.spentAmount)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Left</p>
              <p className={`font-semibold ${parseFloat(period.remainingAmount) < 0 ? 'text-expense' : 'text-income'}`}>
                {formatCurrency(period.remainingAmount)}
              </p>
            </div>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div
              className={`h-2 rounded-full ${period.alertLevel === 'ALERT' ? 'bg-expense' : period.alertLevel === 'WARNING' ? 'bg-warning' : 'bg-brand'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-center text-gray-500">{pct.toFixed(0)}% used</p>
        </div>
      )}

      {/* Category mappings */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Linked Categories</h2>
          <button onClick={() => setShowCatPicker(true)} className="text-brand text-sm">+ Link</button>
        </div>
        {mappings.length === 0 && (
          <p className="text-gray-500 text-sm">No categories linked. Link a category so transactions route here automatically.</p>
        )}
        <div className="space-y-2">
          {mappings.map((m) => (
            <div key={m.categoryId} className="card flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">{catName(m.categoryId)}</span>
                {m.isDefault && <span className="badge-ok">DEFAULT</span>}
              </div>
              <div className="flex gap-3">
                {!m.isDefault && (
                  <button
                    onClick={() => setDefault.mutate(m.categoryId)}
                    className="text-xs text-brand"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => removeMapping.mutate(m.categoryId)}
                  className="text-xs text-expense"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete goal */}
      <button
        onClick={() => {
          if (confirm(`Delete "${goal.name}"? This will affect budget tracking.`)) deleteGoal.mutate();
        }}
        disabled={deleteGoal.isPending}
        className="btn-destructive"
      >
        {deleteGoal.isPending ? 'Deleting…' : 'Delete Goal'}
      </button>

      {/* Category picker */}
      {showCatPicker && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCatPicker(false)} />
          <div className="relative bg-surface-raised rounded-t-3xl max-h-[60vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface-raised px-5 py-4 border-b border-border flex justify-between">
              <span className="text-white font-semibold">Link Category</span>
              <button onClick={() => setShowCatPicker(false)} className="text-gray-400">✕</button>
            </div>
            <div className="p-4 space-y-1">
              {categories.filter((c) => !mappedCatIds.has(c.id)).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { addMapping.mutate({ categoryId: cat.id, isDefault: false }); setShowCatPicker(false); }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-surface text-gray-300 text-sm transition-colors"
                >
                  {cat.customAlias ?? cat.name}
                  {cat.parentCategoryId && <span className="text-gray-600 text-xs ml-2">sub</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
