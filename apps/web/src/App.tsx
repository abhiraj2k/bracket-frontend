import { Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from '@et/store';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/app/Dashboard';
import Transactions from './pages/app/Transactions';
import Budget from './pages/app/Budget';
import GoalDetail from './pages/app/GoalDetail';
import Reports from './pages/app/Reports';
import Settings from './pages/settings/Settings';
import AccountsSettings from './pages/settings/Accounts';
import CategoriesSettings from './pages/settings/Categories';
import TagsSettings from './pages/settings/Tags';
import RecurringSettings from './pages/settings/Recurring';
import ImportTransactions from './pages/app/ImportTransactions';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="budget" element={<Budget />} />
        <Route path="budget/goals/:goalId" element={<GoalDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/accounts" element={<AccountsSettings />} />
        <Route path="settings/categories" element={<CategoriesSettings />} />
        <Route path="settings/tags" element={<TagsSettings />} />
        <Route path="settings/recurring" element={<RecurringSettings />} />
        <Route path="import" element={<ImportTransactions />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
