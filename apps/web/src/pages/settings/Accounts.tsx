import { useState } from 'react';
import { useEscKey } from '../../lib/useEscKey';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { accountsApi } from '@et/api';
import type { AccountType, CreateAccountRequest } from '@et/api';
import { formatCurrency } from '@et/utils';
import { keys } from '../../lib/queryClient';

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'BANK', label: 'Bank', icon: '🏦' },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: '💳' },
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'LOAN', label: 'Loan', icon: '📋' },
];

export default function AccountsSettings() {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const { data: accounts = [] } = useQuery({ queryKey: keys.accounts, queryFn: accountsApi.list });

  const activeAccounts = accounts.filter((a) => a.isActive);
  const archivedAccounts = accounts.filter((a) => !a.isActive);

  const typeInfo = (t: AccountType) => ACCOUNT_TYPES.find((x) => x.value === t);

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/settings')} className="text-gray-400">‹</button>
        <h1 className="text-xl font-bold flex-1">Accounts</h1>
        <button onClick={() => setShowAdd(true)} className="text-brand font-semibold text-sm">+ Add</button>
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">💳</p>
          <p>No accounts yet.</p>
          <button onClick={() => setShowAdd(true)} className="text-brand text-sm mt-2">Add your first →</button>
        </div>
      )}

      <div className="space-y-3">
        {activeAccounts.map((a) => (
          <div key={a.id} className="card flex items-center gap-3">
            <span className="text-2xl">{typeInfo(a.accountType)?.icon}</span>
            <div className="flex-1">
              <p className="text-white font-medium">{a.name}</p>
              <p className="text-gray-500 text-xs">{typeInfo(a.accountType)?.label}
                {a.billingStartDay && ` · Cycle: ${a.billingStartDay}th–${a.billingEndDay}th`}
              </p>
            </div>
            <p className={`font-semibold text-sm ${parseFloat(a.balance) < 0 ? 'text-expense' : 'text-white'}`}>
              {formatCurrency(a.balance)}
            </p>
          </div>
        ))}
        {archivedAccounts.length > 0 && (
          <>
            <p className="section-title mt-4">Archived</p>
            {archivedAccounts.map((a) => (
              <div key={a.id} className="card flex items-center gap-3 opacity-50">
                <span className="text-2xl">{typeInfo(a.accountType)?.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{a.name}</p>
                </div>
                <p className="text-gray-500 text-sm">{formatCurrency(a.balance)}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {showAdd && <AddAccountSheet onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function AddAccountSheet({ onClose }: { onClose: () => void }) {
  useEscKey(onClose);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [balance, setBalance] = useState('');
  const [billingStart, setBillingStart] = useState('');
  const [billingEnd, setBillingEnd] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateAccountRequest = {
        name,
        accountType: type,
        openingBalance: parseFloat(balance).toFixed(2),
        ...(type === 'CREDIT_CARD' && billingStart ? { billingStartDay: parseInt(billingStart), billingEndDay: parseInt(billingEnd) } : {}),
      };
      return accountsApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.accounts });
      qc.invalidateQueries({ queryKey: keys.ccBracket });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-raised rounded-t-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Add Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">✕</button>
        </div>

        <div>
          <label className="section-title block">Account Type</label>
          <div className="grid grid-cols-4 gap-2">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`py-3 rounded-xl flex flex-col items-center gap-1 text-xs font-medium transition-all ${
                  type === t.value ? 'bg-brand text-white' : 'bg-surface text-gray-400'
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="section-title block">Account Name</label>
          <input placeholder="e.g. HDFC Savings" value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>

        <div>
          <label className="section-title block">Opening Balance</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
            <input
              type="number"
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="input pl-8"
            />
          </div>
        </div>

        {type === 'CREDIT_CARD' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-title block">Billing Start Day</label>
              <input type="number" min={1} max={31} placeholder="16" value={billingStart} onChange={(e) => setBillingStart(e.target.value)} className="input" />
            </div>
            <div>
              <label className="section-title block">Billing End Day</label>
              <input type="number" min={1} max={31} placeholder="15" value={billingEnd} onChange={(e) => setBillingEnd(e.target.value)} className="input" />
            </div>
          </div>
        )}

        {mutation.isError && <p className="text-expense text-sm">Failed to create account.</p>}

        <button
          onClick={() => mutation.mutate()}
          disabled={!name || !balance || mutation.isPending}
          className="btn-primary disabled:opacity-60"
        >
          {mutation.isPending ? 'Creating…' : 'Add Account'}
        </button>
      </div>
    </div>
  );
}
