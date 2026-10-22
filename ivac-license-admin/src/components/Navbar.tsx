import React from 'react';
import { LogOut, UserCircle } from 'lucide-react';
import { authService } from '../services/authService.js';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  pageTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ pageTitle = 'Dashboard' }) => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <header className="h-16 px-8 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between z-10 sticky top-0">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* User Card */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
          <UserCircle className="h-5 w-5 text-emerald-400" />
          <div className="text-left">
            <span className="text-xs font-semibold text-slate-200 block leading-tight">
              {user?.username || 'Admin'}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 block leading-tight">
              {user?.role || 'SUPER_ADMIN'}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
