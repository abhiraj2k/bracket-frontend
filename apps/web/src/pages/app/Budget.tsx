import { useState } from 'react';
import { useEscKey } from '../../lib/useEscKey';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { budgetsApi } from '@et/api';
import type { BudgetPeriodResponse, CreateBudgetGoalRequest, BudgetType } from '@et/api';
import { formatCurrency } from '@et/utils';
import { keys } from '../../lib/queryClient';

const ALERT_ORDER = { ALERT: 0, WARNING: 1, MILESTONE: 2, OK: 3 };

const BUDGET_TYPES: { value: BudgetType; label: string; desc: string }[] = [
  { value: 'NEEDS', label: 'Needs', desc: 'Essentials — warning at 80%, alert at 100%' },
  { value: 'WANTS', label: 'Wants', desc: 'Lifestyle — warning at 80%, alert at 100%' },
  { value: 'INVESTMENTS', label: 'Invest', desc: 'Savings — milestone at 50%, alert at 100%' },
  { value: 'CUSTOM', label: 'Custom', desc: 'Alert at 100% only' },
];

export default function Budget() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const { data: periods = [], isLoading } = useQuery({
    queryKey: keys.budgetPeriods,
    queryFn: budgetsApi.currentPeriods,
  });

  const sorted = [...periods].sort(
    (a, b) => (ALERT_ORDER[a.alertLevel] ?? 3) - (ALERT_ORDER[b.alertLevel] ?? 3)
  );

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Budget</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="text-brand font-semibold text-sm"
        >
          + New Goal
        </button>
      </div>

      {isLoading && <SkeletonList />}

      {!isLoading && periods.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">🎯</p>
          <p className="mb-4">No budget goals yet.</p>
          <button onClick={() => setShowCreate(true)} className="text-brand font-medium">Create your first goal →</button>
        </div>
      )}

      <div className="space-y-3 pb-24">
        {sorted.map((p) => (
          <PeriodCard key={p.id} period={p} onClick={() => navigate(`/budget/goals/${p.budgetGoalId}`)} />
        ))}
      </div>

      {showCreate && <CreateGoalSheet onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function PeriodCard({ period, onClick }: { period: BudgetPeriodResponse; onClick: () => void }) {
  const pct = parseFloat(period.startingBalance) > 0
    ? Math.min((parseFloat(period.spentAmount) / parseFloat(period.startingBalance)) * 100, 100)
    : 0;

  const barColor =
    period.alertLevel === 'ALERT' ? 'bg-expense' :
    period.alertLevel === 'WARNING' ? 'bg-warning' :
    period.alertLevel === 'MILESTONE' ? 'bg-income' : 'bg-brand';

  const alertBg =
    period.alertLevel === 'ALERT' ? 'border-expense/30 bg-expense/5' :
    period.alertLevel === 'WARNING' ? 'border-warning/30 bg-warning/5' :
    period.alertLevel === 'MILESTONE' ? 'border-income/30 bg-income/5' : '';

  const badge =
    period.alertLevel === 'ALERT' ? <span className="badge-alert">🚨 ALERT</span> :
    period.alertLevel === 'WARNING' ? <span className="badge-warning">⚠️ WARNING</span> :
    period.alertLevel === 'MILESTONE' ? <span className="badge-milestone">🎯 MILESTONE</span> : null;

  return (
    <button
      onClick={onClick}
      className={`card w-full text-left transition-all border ${alertBg || 'border-transparent'} hover:border-brand/30`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-white font-semibold">{period.budgetGoalName}</p>
          <p className="text-gray-500 text-xs">{period.budgetType}</p>
        </div>
        {badge}
      </div>

      <div className="w-full bg-border rounded-full h-2 mb-3">
        <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between text-sm">
        <div>
          <p className="text-gray-500 text-xs">Spent</p>
          <p className="text-white font-medium">{formatCurrency(period.spentAmount)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs">Target</p>
          <p className="text-white font-medium">{formatCurrency(period.startingBalance)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs">Left</p>
          <p className={`font-medium ${parseFloat(period.remainingAmount) < 0 ? 'text-expense' : 'text-income'}`}>
            {formatCurrency(period.remainingAmount)}
          </p>
        </div>
      </div>
    </button>
  );
}

function CreateGoalSheet({ onClose }: { onClose: () => void }) {
  useEscKey(onClose);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [budgetType, setBudgetType] = useState<BudgetType>('CUSTOM');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => budgetsApi.createGoal({ name, targetAmount: parseFloat(amount).toFixed(2), budgetType }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.budgetGoals });
      qc.invalidateQueries({ queryKey: keys.budgetPeriods });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-raised rounded-t-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">New Budget Goal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">✕</button>
        </div>

        <div>
          <label className="section-title block">Type</label>
          <div className="grid grid-cols-4 gap-2">
            {BUDGET_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setBudgetType(t.value)}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  budgetType === t.value ? 'bg-brand text-white' : 'bg-surface text-gray-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-2">
            {BUDGET_TYPES.find((t) => t.value === budgetType)?.desc}
          </p>
        </div>

        <div>
          <label className="section-title block">Goal Name</label>
          <input placeholder="e.g. Monthly Wants" value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>

        <div>
          <label className="section-title block">Monthly Target</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
            <input
              type="number"
              placeholder="10,000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input pl-8"
            />
          </div>
        </div>

        {mutation.isError && <p className="text-expense text-sm">Failed to create goal.</p>}

        <button
          onClick={() => mutation.mutate()}
          disabled={!name || !amount || mutation.isPending}
          className="btn-primary disabled:opacity-60"
        >
          {mutation.isPending ? 'Creating…' : 'Create Goal'}
        </button>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse space-y-3">
          <div className="flex justify-between">
            <div className="h-4 bg-border rounded w-32" />
            <div className="h-4 bg-border rounded w-16" />
          </div>
          <div className="h-2 bg-border rounded-full" />
          <div className="flex justify-between">
            <div className="h-3 bg-border rounded w-20" />
            <div className="h-3 bg-border rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
