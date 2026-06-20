import { Outlet } from 'react-router';
import BottomTabBar from './BottomTabBar';
import AddTransactionModal from '../modals/AddTransactionModal';
import { useState } from 'react';

export const AddModalContext = { open: (_type?: 'EXPENSE' | 'INCOME' | 'TRANSFER') => {} };

export default function AppShell() {
  const [modal, setModal] = useState<{ open: boolean; type: 'EXPENSE' | 'INCOME' | 'TRANSFER' }>({
    open: false,
    type: 'EXPENSE',
  });

  AddModalContext.open = (type = 'EXPENSE') => setModal({ open: true, type });

  return (
    <div className="min-h-screen bg-[#0F0F13] flex flex-col max-w-lg mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomTabBar onAdd={() => setModal({ open: true, type: 'EXPENSE' })} />
      {modal.open && (
        <AddTransactionModal
          initialType={modal.type}
          onClose={() => setModal((m) => ({ ...m, open: false }))}
        />
      )}
    </div>
  );
}
