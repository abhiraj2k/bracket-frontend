import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '@et/store';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@et/api';
import { keys, queryClient } from '../../lib/queryClient';

export default function Settings() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { data: me } = useQuery({ queryKey: keys.me, queryFn: usersApi.me });

  function logout() {
    queryClient.clear();
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      {/* Profile card */}
      <div className="card flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center text-white font-bold text-lg">
          {me?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="text-white font-semibold">{me?.name}</p>
          <p className="text-gray-500 text-sm">{me?.email}</p>
        </div>
      </div>

      <p className="section-title">Finance</p>
      <div className="card space-y-0 divide-y divide-border mb-5">
        <SettingsRow to="/settings/accounts" label="Accounts" icon="💳" />
        <SettingsRow to="/settings/categories" label="Categories" icon="📂" />
        <SettingsRow to="/settings/tags" label="Tags" icon="🏷️" />
        <SettingsRow to="/settings/recurring" label="Recurring Transactions" icon="🔁" />
      </div>

      <button onClick={logout} className="btn-destructive">Log Out</button>
    </div>
  );
}

function SettingsRow({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <Link to={to} className="flex items-center justify-between py-4 px-1 hover:opacity-80 transition-opacity">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-white text-sm font-medium">{label}</span>
      </div>
      <span className="text-gray-500">›</span>
    </Link>
  );
}
