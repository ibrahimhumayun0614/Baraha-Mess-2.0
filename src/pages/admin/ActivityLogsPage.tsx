// ============================================
// Admin — Activity Logs Page
// ============================================
import { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  LogIn,
  UserPlus,
  Receipt,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Activity,
  Download,
} from 'lucide-react';
import { api, formatDateTime, buildQueryString } from '../../lib/api';
import type { ActivityLog } from '../../types';
import Select from '../../components/ui/Select';
import { useToast } from '../../contexts/ToastContext';
import { downloadSpreadsheet } from '../../lib/exportSheet';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const ACTION_ICONS: Record<string, typeof LogIn> = {
  login: LogIn,
  member_access: Eye,
  create_member: UserPlus,
  create_expense: Receipt,
  edit_expense: Edit,
  delete_expense: Trash2,
  record_payment: DollarSign,
  start_month: Calendar,
  close_month: Calendar,
  update_contribution: Edit,
  edit_member: Edit,
  deactivate_member: Trash2,
  delete_member: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  login: 'admin',
  member_access: 'member',
  create_expense: 'expense',
  edit_expense: 'expense',
  delete_expense: 'expense',
  record_payment: 'payment',
  start_month: 'admin',
  close_month: 'admin',
};

export default function ActivityLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');
  const [actorType, setActorType] = useState('');
  const [page, setPage] = useState(1);
  const [undoLog, setUndoLog] = useState<ActivityLog | null>(null);
  const [undoLoading, setUndoLoading] = useState(false);
  const limit = 30;

  useEffect(() => {
    fetchLogs();
  }, [search, actionType, actorType, page]);

  const fetchLogs = async () => {
    setLoading(true);
    const query = buildQueryString({
      search,
      action_type: actionType,
      actor_type: actorType,
      page,
      limit,
    });
    const res = await api.get<ActivityLog[]>(`/activity-logs${query}`);
    if (res.success && res.data) {
      setLogs(res.data);
      setTotal(res.total || 0);
    } else {
      setLogs([]);
      setTotal(0);
    }
    setLoading(false);
  };

  const handleDownloadSheet = async () => {
    setExporting(true);
    const query = buildQueryString({
      search,
      action_type: actionType,
      actor_type: actorType,
      export: '1',
    });
    const res = await api.get<ActivityLog[]>(`/activity-logs${query}`);
    if (!res.success || !res.data) {
      toast.error(res.error || 'Failed to download logs');
      setExporting(false);
      return;
    }
    if (res.data.length === 0) {
      toast.warning('No activity logs to download');
      setExporting(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    downloadSpreadsheet(
      `baraha-activity-logs-${today}.xls`,
      'Activity Logs',
      ['Date', 'User Type', 'User', 'Action', 'Action Type', 'Details', 'Reference Type', 'Reference ID'],
      res.data.map((log) => [
        formatDateTime(log.created_at),
        log.actor_type === 'admin' ? 'Admin' : 'Member',
        log.actor_name || (log.actor_type === 'admin' ? 'Admin' : 'Member'),
        log.action,
        log.action_type.replace(/_/g, ' '),
        log.details || '',
        log.reference_type || '',
        log.reference_id ?? '',
      ])
    );
    toast.success(`Downloaded ${res.data.length} log${res.data.length !== 1 ? 's' : ''}`);
    setExporting(false);
  };

  const handleUndo = async () => {
    if (!undoLog) return;
    setUndoLoading(true);
    const res = await api.post(`/activity-logs/${undoLog.id}/undo`, {});
    if (res.success) {
      toast.success((res as { message?: string }).message || 'Action undone');
      setUndoLog(null);
      await fetchLogs();
    } else {
      toast.error(res.error || 'Failed to undo this action');
    }
    setUndoLoading(false);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Activity Logs</h1>
          <p className="text-sm text-muted">Track all actions performed in the system</p>
        </div>
        <div className="page-header-right">
          <button
            className="btn btn-outline"
            onClick={handleDownloadSheet}
            disabled={exporting || loading || total === 0}
          >
            <Download size={16} />
            {exporting ? 'Downloading...' : 'Download Sheet'}
          </button>
        </div>
      </div>

      <div className="card animate-fade-in">
        {/* Filters */}
        <div className="filter-bar">
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input
              className="input"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select
            value={actorType}
            onChange={(value) => { setActorType(value); setPage(1); }}
            placeholder="All Users"
            options={[
              { value: '', label: 'All Users' },
              { value: 'admin', label: 'Admin' },
              { value: 'member', label: 'Members' },
            ]}
          />
          <Select
            value={actionType}
            onChange={(value) => { setActionType(value); setPage(1); }}
            placeholder="All Actions"
            options={[
              { value: '', label: 'All Actions' },
              { value: 'login', label: 'Login' },
              { value: 'member_access', label: 'Member Access' },
              { value: 'create_member', label: 'Create Member' },
              { value: 'create_expense', label: 'Create Expense' },
              { value: 'edit_expense', label: 'Edit Expense' },
              { value: 'delete_expense', label: 'Delete Expense' },
              { value: 'record_payment', label: 'Record Payment' },
              { value: 'start_month', label: 'Start Month' },
              { value: 'close_month', label: 'Close Month' },
            ]}
          />
          {(search || actionType || actorType) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setActionType(''); setActorType(''); setPage(1); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Activity List */}
        <div className="activity-list">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="activity-item">
                <div className="skeleton" style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', marginTop: '0.5rem' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '30%' }} />
                </div>
              </div>
            ))
          ) : logs.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem' }}>
              <div className="empty-state-icon"><Activity size={24} /></div>
              <h3 className="empty-state-title">No Activity</h3>
              <p className="empty-state-description">No activity logs match your filters.</p>
            </div>
          ) : (
            logs.map((log) => {
              const dotClass = ACTION_COLORS[log.action_type] || '';
              return (
                <div key={log.id} className={`activity-item${log.undone_at ? ' undone' : ''}`}>
                  <div className={`activity-dot ${dotClass}`} />
                  <div className="activity-content">
                    <div className="activity-text">
                      <strong>{log.actor_name || (log.actor_type === 'admin' ? 'Admin' : 'Member')}</strong>
                      {' '}{log.action}
                      {log.details && (
                        <span className="text-muted"> — {log.details}</span>
                      )}
                    </div>
                    <div className="activity-time">
                      <span className={`badge badge-outline`} style={{ fontSize: '0.625rem', padding: '0 0.375rem', marginRight: '0.5rem' }}>
                        {log.action_type.replace(/_/g, ' ')}
                      </span>
                      {formatDateTime(log.created_at)}
                      {log.undone_at && (
                        <span className="badge badge-secondary" style={{ fontSize: '0.625rem', padding: '0 0.375rem', marginLeft: '0.5rem' }}>
                          Undone
                        </span>
                      )}
                    </div>
                  </div>
                  {log.can_undo && !log.undone_at && (
                    <button
                      className="btn btn-outline btn-sm activity-undo-btn"
                      onClick={() => setUndoLog(log)}
                    >
                      Undo
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="pagination-info">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="pagination-controls">
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                <button
                  key={i + 1}
                  className={`pagination-btn ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!undoLog}
        onClose={() => !undoLoading && setUndoLog(null)}
        onConfirm={handleUndo}
        title="Undo this action?"
        message={undoLog ? `This will reverse: ${undoLog.action}` : ''}
        warning="The original process will be undone. This cannot be undone again from the same log."
        confirmText="Undo"
        loading={undoLoading}
      />
    </div>
  );
}
