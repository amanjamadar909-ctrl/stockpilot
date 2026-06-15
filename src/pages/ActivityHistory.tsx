import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AuditLog } from '../types';
import { Search, History, Package, Building2, PackagePlus, ShoppingCart, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export function ActivityHistory() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setLogs(data as AuditLog[] || []);
    setLoading(false);
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'product':
        return <Package className="w-4 h-4" />;
      case 'supplier':
        return <Building2 className="w-4 h-4" />;
      case 'purchase':
        return <PackagePlus className="w-4 h-4" />;
      case 'sale':
        return <ShoppingCart className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Plus className="w-4 h-4 text-emerald-500" />;
      case 'UPDATE':
        return <Edit2 className="w-4 h-4 text-amber-500" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      INSERT: 'bg-emerald-100 text-emerald-700',
      UPDATE: 'bg-amber-100 text-amber-700',
      DELETE: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      INSERT: 'Created',
      UPDATE: 'Updated',
      DELETE: 'Deleted',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${styles[action]}`}>
        {getActionIcon(action)}
        {labels[action]}
      </span>
    );
  };

  const getEntityBadge = (entityType: string) => {
    const styles: Record<string, string> = {
      product: 'bg-blue-100 text-blue-700',
      supplier: 'bg-purple-100 text-purple-700',
      purchase: 'bg-teal-100 text-teal-700',
      sale: 'bg-orange-100 text-orange-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium capitalize ${styles[entityType]}`}>
        {getEntityIcon(entityType)}
        {entityType}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getEntityName = (log: AuditLog) => {
    const values = log.new_values || log.old_values;
    if (!values) return 'Unknown';
    if (log.entity_type === 'product') return values.name || 'Unknown Product';
    if (log.entity_type === 'supplier') return values.name || 'Unknown Supplier';
    if (log.entity_type === 'purchase' || log.entity_type === 'sale') {
      return `${values.quantity || 0} units`;
    }
    return 'Unknown';
  };

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    const matchesSearch = search === '' ||
      getEntityName(log).toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(search.toLowerCase());
    return matchesAction && matchesEntity && matchesSearch;
  });

  const formatDiff = (diff: Record<string, { old: unknown; new: unknown }> | null) => {
    if (!diff) return null;
    return Object.entries(diff).map(([key, value]) => (
      <div key={key} className="flex items-center gap-2 py-1">
        <span className="text-slate-600 font-medium min-w-[100px]">{key}:</span>
        <span className="text-red-500 line-through">{String(value.old)}</span>
        <span className="text-slate-400">→</span>
        <span className="text-emerald-600 font-medium">{String(value.new)}</span>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity History</h1>
        <p className="text-slate-500">Track all changes to your inventory data</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600"
        >
          <option value="all">All Actions</option>
          <option value="INSERT">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="DELETE">Deleted</option>
        </select>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600"
        >
          <option value="all">All Types</option>
          <option value="product">Products</option>
          <option value="supplier">Suppliers</option>
          <option value="purchase">Purchases</option>
          <option value="sale">Sales</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            No activity records found
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const { date, time } = formatTimestamp(log.created_at);
              const isExpanded = expandedLog === log.id;

              return (
                <div key={log.id} className="hover:bg-slate-50 transition-colors">
                  <div
                    className="flex items-center gap-4 px-6 py-4 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionBadge(log.action)}
                        {getEntityBadge(log.entity_type)}
                      </div>
                      <p className="text-slate-900 font-medium truncate">
                        {getEntityName(log)}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <div>{date}</div>
                      <div>{time}</div>
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-4 pt-2 bg-slate-50 border-t border-slate-100">
                      <div className="rounded-xl bg-white border border-slate-200 p-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                          {log.action === 'INSERT' && 'Created with values:'}
                          {log.action === 'UPDATE' && 'Changes made:'}
                          {log.action === 'DELETE' && 'Deleted record:'}
                        </h4>
                        {log.action === 'INSERT' && log.new_values && (
                          <div className="space-y-1 text-sm">
                            {Object.entries(log.new_values).map(([key, value]) => (
                              <div key={key} className="flex items-start gap-2">
                                <span className="text-slate-500 min-w-[120px]">{key}:</span>
                                <span className="text-slate-900 font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {log.action === 'UPDATE' && formatDiff(log.diff)}
                        {log.action === 'DELETE' && log.old_values && (
                          <div className="space-y-1 text-sm">
                            {Object.entries(log.old_values).map(([key, value]) => (
                              <div key={key} className="flex items-start gap-2">
                                <span className="text-slate-500 min-w-[120px]">{key}:</span>
                                <span className="text-slate-900 font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filteredLogs.length > 0 && (
        <div className="text-center text-sm text-slate-500">
          Showing {filteredLogs.length} of {logs.length} activities
        </div>
      )}
    </div>
  );
}
