import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar.js';
import { Navbar } from '../components/Navbar.js';
import { authService } from '../services/authService.js';
import { useQuery } from '@tanstack/react-query';
import { licenseService } from '../services/licenseService.js';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => licenseService.getStats(),
    refetchInterval: 15000,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const getPageTitle = (pathname: string): string => {
    if (pathname === '/') return 'Executive Performance Dashboard';
    if (pathname.startsWith('/licenses/')) return 'License Entitlement Details';
    if (pathname.startsWith('/licenses')) return 'License Key Management';
    if (pathname.startsWith('/payments')) return 'Manual Payment Verification Queue';
    if (pathname.startsWith('/audit-logs')) return 'Security Audit Trail';
    if (pathname.startsWith('/settings')) return 'System & Payment Gateway Settings';
    return 'Admin Console';
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar pendingPaymentsCount={stats?.pendingPayments || 0} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar pageTitle={getPageTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
