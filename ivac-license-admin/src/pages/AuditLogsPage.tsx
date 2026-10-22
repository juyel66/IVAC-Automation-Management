import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { auditService } from '../services/auditService.js';

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, entityFilter, debouncedSearch],
    queryFn: () =>
      auditService.listLogs({
        page,
        limit: 15,
        entityType: entityFilter || undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Security Audit Trail</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of administrative logins, license creations, renewals, revocations, and approvals.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          title="Refresh Logs"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by Action, Entity ID, or Details..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['', 'LICENSE', 'INSTALLATION', 'PAYMENT', 'ADMIN', 'SETTINGS'].map((ent) => (
            <button
              key={ent}
              onClick={() => {
                setEntityFilter(ent);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors shrink-0 ${
                entityFilter === ent
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {ent || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">Admin / Actor</th>
                <th className="px-5 py-3.5">Details</th>
                <th className="px-5 py-3.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                data?.items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-mono text-[10px] font-bold text-emerald-400">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="text-slate-300 font-semibold text-[11px]">{log.entityType}</div>
                      {log.entityId && (
                        <div className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]" title={log.entityId}>
                          {log.entityId}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-slate-300">
                      {log.admin?.username ? (
                        <span className="font-semibold text-slate-200">{log.admin.username}</span>
                      ) : (
                        <span className="text-slate-500 italic">System / Client</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px] max-w-xs truncate" title={log.details || ''}>
                      {log.details || '—'}
                    </td>

                    <td className="px-5 py-3.5 text-slate-500 font-mono text-[10px]">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.pagination.totalPages > 1 && (
          <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing page <span className="font-bold text-white">{data.pagination.page}</span> of{' '}
              <span className="font-bold text-white">{data.pagination.totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
