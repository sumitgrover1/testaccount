'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { roleLabel } from '@/lib/utils/format';

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500">{roleLabel(user.role)}</p>
          </div>
        )}
        <button
          onClick={() => void logout()}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
