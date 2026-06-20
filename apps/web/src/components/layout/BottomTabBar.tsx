import { NavLink } from 'react-router';

interface Props {
  onAdd: () => void;
}

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon, exact: true },
  { to: '/transactions', label: 'Ledger', icon: ListIcon },
  { to: '/budget', label: 'Budget', icon: TargetIcon },
  { to: '/reports', label: 'Reports', icon: ChartIcon },
];

export default function BottomTabBar({ onAdd }: Props) {
  return (
    <nav className="tab-bar">
      {tabs.slice(0, 2).map((t) => (
        <TabItem key={t.to} {...t} />
      ))}

      {/* FAB */}
      <button
        onClick={onAdd}
        className="relative -top-4 w-14 h-14 bg-brand hover:bg-brand-dark rounded-full flex items-center justify-center shadow-lg shadow-brand/30 transition-all active:scale-95"
        aria-label="Add transaction"
      >
        <PlusIcon />
      </button>

      {tabs.slice(2).map((t) => (
        <TabItem key={t.to} {...t} />
      ))}
    </nav>
  );
}

function TabItem({ to, label, icon: Icon, exact }: { to: string; label: string; icon: React.FC; exact?: boolean }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-3 py-1 transition-colors ${isActive ? 'text-brand' : 'text-gray-500'}`
      }
    >
      <Icon />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
