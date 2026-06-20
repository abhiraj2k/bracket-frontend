import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { recurringApi } from '@et/api';
import type { RecurrenceFrequency } from '@et/api';
import { formatDate } from '@et/utils';
import { formatCurrency } from '@et/utils';
import { keys } from '../../lib/queryClient';

const FREQ_LABEL: Record<RecurrenceFrequency, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly',
};

export default function RecurringSettings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: keys.recurring, queryFn: recurringApi.list });

  const cancel = useMutation({
    mutationFn: (id: string) => recurringApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.recurring }),
  });

  const active = items.filter((r) => r.isActive);
  const inactive = items.filter((r) => !r.isActive);

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/settings')} className="text-gray-400">‹</button>
        <h1 className="text-xl font-bold flex-1">Recurring</h1>
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}

      {!isLoading && active.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🔁</p>
          <p>No recurring transactions set up.</p>
          <p className="text-xs mt-2">Add one from the Add Transaction modal.</p>
        </div>
      )}

      <div className="space-y-3">
        {active.map((r) => {
          const header = r.headerTemplate as Record<string, string>;
          return (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{r.name}</p>
                <p className="text-gray-500 text-xs">{FREQ_LABEL[r.frequency]} · Next: {formatDate(r.nextExecutionDate)}</p>
                {header.totalAmount && (
                  <p className="text-gray-400 text-xs">{formatCurrency(header.totalAmount)}</p>
                )}
              </div>
              <button
                onClick={() => {
                  if (confirm(`Cancel "${r.name}"? Past transactions are unaffected.`)) cancel.mutate(r.id);
                }}
                className="text-expense text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          );
        })}
      </div>

      {inactive.length > 0 && (
        <>
          <p className="section-title mt-6">Cancelled</p>
          <div className="space-y-2 opacity-50">
            {inactive.map((r) => (
              <div key={r.id} className="card">
                <p className="text-white text-sm">{r.name}</p>
                <p className="text-gray-500 text-xs">{FREQ_LABEL[r.frequency]} · Cancelled</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
