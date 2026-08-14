// ============================================
// Admin — Monthly Cycles Management Page
// ============================================
import { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  DollarSign,
  Users,
  Wallet,
  TrendingDown,
  BarChart3,
  Edit,
  CheckCircle,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { api, formatCurrency, formatMonthYear } from '../../lib/api';
import type { MessMonth, MonthSummary } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import Dialog from '../../components/ui/Dialog';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function MonthsPage() {
  const toast = useToast();
  const [months, setMonths] = useState<MessMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MessMonth | null>(null);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    month_year: '',
    contribution_amount: '',
  });

  const [editAmount, setEditAmount] = useState('');

  useEffect(() => {
    fetchMonths();
  }, []);

  const fetchMonths = async () => {
    setLoading(true);
    const res = await api.get<MessMonth[]>('/months');
    if (res.success && res.data && res.data.length > 0) {
      setMonths(res.data);
      const active = res.data.find((m) => m.status === 'active') || res.data[0];
      if (active) {
        selectMonth(active);
      }
    } else {
      setMonths([]);
      setSelectedMonth(null);
      setSummary(null);
    }
    setLoading(false);
  };

  const selectMonth = async (month: MessMonth) => {
    setSelectedMonth(month);
    const res = await api.get<MonthSummary>(`/months/${month.id}/summary`);
    if (res.success && res.data) {
      setSummary(res.data);
    } else {
      setSummary(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const res = await api.post('/months', {
      month_year: createForm.month_year,
      contribution_amount: parseFloat(createForm.contribution_amount),
    });
    if (res.success) {
      toast.success('New month started successfully');
      setShowCreateDialog(false);
      setCreateForm({ month_year: '', contribution_amount: '' });
      fetchMonths();
    } else {
      toast.error(res.error || 'Failed to start new month');
    }
    setFormLoading(false);
  };

  const handleUpdateContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMonth) return;
    setFormLoading(true);
    const res = await api.put(`/months/${selectedMonth.id}`, {
      contribution_amount: parseFloat(editAmount),
    });
    if (res.success) {
      toast.success('Contribution amount updated');
      setShowEditDialog(false);
      fetchMonths();
    } else {
      toast.error(res.error || 'Failed to update');
    }
    setFormLoading(false);
  };

  const handleCloseMonth = async () => {
    if (!selectedMonth) return;
    setFormLoading(true);
    const res = await api.put(`/months/${selectedMonth.id}`, { status: 'closed' });
    if (res.success) {
      toast.success('Month closed successfully');
      setShowCloseDialog(false);
      fetchMonths();
    } else {
      toast.error(res.error || 'Failed to close month');
    }
    setFormLoading(false);
  };

  const handleReopenMonth = async () => {
    if (!selectedMonth) return;
    setFormLoading(true);
    const res = await api.put(`/months/${selectedMonth.id}`, { status: 'active' });
    if (res.success) {
      toast.success('Month cycle reactivated successfully');
      setShowReopenDialog(false);
      fetchMonths();
    } else {
      toast.error(res.error || 'Failed to reactivate month');
    }
    setFormLoading(false);
  };

  // Generate current month value for the date input
  const getCurrentMonthInput = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Monthly Cycles</h1>
          <p className="text-sm text-muted">Manage monthly mess cycles and contributions</p>
        </div>
        <div className="page-header-right">
          <button
            className="btn btn-primary"
            onClick={() => {
              setCreateForm({ month_year: getCurrentMonthInput(), contribution_amount: '500' });
              setShowCreateDialog(true);
            }}
          >
            <Plus size={16} />
            Start New Month
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '280px 1fr', gap: '1rem' }}>
        {/* Months List */}
        <div className="flex flex-col gap-2 animate-fade-in">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '4.5rem', borderRadius: 'var(--radius-lg)' }} />
            ))
          ) : months.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Calendar size={20} className="text-muted" style={{ marginBottom: '0.5rem' }} />
                <p className="text-sm text-muted">No months yet</p>
              </div>
            </div>
          ) : (
            months.map((month) => (
              <div
                key={month.id}
                className={`month-card ${selectedMonth?.id === month.id ? 'active' : ''}`}
                onClick={() => selectMonth(month)}
              >
                <div className="month-card-info">
                  <div className="month-card-name">{formatMonthYear(month.month_year)}</div>
                  <div className="month-card-meta">
                    {formatCurrency(month.contribution_amount)}/person
                  </div>
                </div>
                <span className={`badge ${month.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                  {month.status === 'active' ? 'Active' : 'Closed'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Month Details */}
        <div className="animate-fade-in">
          {!selectedMonth ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '4rem 2rem' }}>
                <div className="empty-state-icon"><Calendar size={24} /></div>
                <h3 className="empty-state-title">Select a Month</h3>
                <p className="empty-state-description">Choose a month from the list or start a new cycle.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Month Header */}
              <div className="card mb-4">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">{formatMonthYear(selectedMonth.month_year)}</h2>
                    <p className="card-description">
                      Contribution: {formatCurrency(selectedMonth.contribution_amount)} per person
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedMonth.status === 'active' ? (
                      <>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setEditAmount(String(selectedMonth.contribution_amount));
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit size={14} /> Edit Amount
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setShowCloseDialog(true)}
                        >
                          <Lock size={14} /> Close Month
                        </button>
                      </>
                    ) : selectedMonth.month_year >= getCurrentMonthInput() ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowReopenDialog(true)}
                      >
                        <RotateCcw size={14} /> Reopen Month
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              {summary && (
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="stat-card">
                    <div className="stat-card-header">
                      <span className="stat-card-label">Total Collected</span>
                      <div className="stat-card-icon"><DollarSign size={16} /></div>
                    </div>
                    <div className="stat-card-value">{formatCurrency(summary.total_collected)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-header">
                      <span className="stat-card-label">Total Spent</span>
                      <div className="stat-card-icon"><TrendingDown size={16} /></div>
                    </div>
                    <div className="stat-card-value">{formatCurrency(summary.total_spent)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-header">
                      <span className="stat-card-label">Balance</span>
                      <div className="stat-card-icon"><Wallet size={16} /></div>
                    </div>
                    <div className="stat-card-value">
                      <span className={summary.balance >= 0 ? '' : 'amount-negative'}>
                        {formatCurrency(summary.balance)}
                      </span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-header">
                      <span className="stat-card-label">Daily Average</span>
                      <div className="stat-card-icon"><BarChart3 size={16} /></div>
                    </div>
                    <div className="stat-card-value">{formatCurrency(summary.daily_average)}</div>
                  </div>
                </div>
              )}

              {/* Members in this month */}
              {summary && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="stat-card">
                    <div className="stat-card-header">
                      <span className="stat-card-label">Members</span>
                      <div className="stat-card-icon"><Users size={16} /></div>
                    </div>
                    <div className="stat-card-value">{summary.member_count}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-header">
                      <span className="stat-card-label">Paid</span>
                      <div className="stat-card-icon" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
                        <CheckCircle size={16} />
                      </div>
                    </div>
                    <div className="stat-card-value" style={{ color: '#15803d' }}>{summary.paid_count}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-header">
                      <span className="stat-card-label">Unpaid</span>
                      <div className="stat-card-icon" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                        <Users size={16} />
                      </div>
                    </div>
                    <div className="stat-card-value" style={{ color: '#b91c1c' }}>{summary.unpaid_count}</div>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Expected Collection</h3>
                </div>
                <div className="card-content">
                  <p className="text-sm text-muted">
                    {summary?.member_count || 0} members × {formatCurrency(selectedMonth.contribution_amount)} = <strong>{formatCurrency((summary?.member_count || 0) * selectedMonth.contribution_amount)}</strong>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Month Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Start New Month"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowCreateDialog(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={formLoading || !createForm.month_year || !createForm.contribution_amount}>
              {formLoading ? 'Starting...' : 'Start Month'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">Month *</label>
            <input
              className="input"
              type="month"
              min={getCurrentMonthInput()}
              value={createForm.month_year}
              onChange={(e) => setCreateForm({ ...createForm, month_year: e.target.value })}
              required
            />
            <p className="input-helper">You can start or reactivate the current ongoing month or upcoming cycles.</p>
          </div>
          <div className="input-group">
            <label className="input-label">Contribution per Person (AED) *</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder="500"
              value={createForm.contribution_amount}
              onChange={(e) => setCreateForm({ ...createForm, contribution_amount: e.target.value })}
              required
            />
            <p className="input-helper">This amount will be set for all active members</p>
          </div>
        </form>
      </Dialog>

      {/* Edit Contribution Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        title="Update Contribution Amount"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowEditDialog(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpdateContribution} disabled={formLoading || !editAmount}>
              {formLoading ? 'Updating...' : 'Update'}
            </button>
          </>
        }
      >
        <form onSubmit={handleUpdateContribution} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">New Contribution per Person (AED)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              required
            />
          </div>
        </form>
      </Dialog>

      {/* Close Month Confirmation */}
      <ConfirmDialog
        open={showCloseDialog}
        onClose={() => setShowCloseDialog(false)}
        onConfirm={handleCloseMonth}
        title="Close Month"
        message={`Are you sure you want to close ${selectedMonth ? formatMonthYear(selectedMonth.month_year) : ''}?`}
        warning="Once closed, no new expenses or payments can be added to this month."
        confirmText="Close Month"
        loading={formLoading}
      />

      {/* Reopen Month Confirmation */}
      <ConfirmDialog
        open={showReopenDialog}
        onClose={() => setShowReopenDialog(false)}
        onConfirm={handleReopenMonth}
        title="Reopen Month Cycle"
        message={`Are you sure you want to reactivate the cycle for ${selectedMonth ? formatMonthYear(selectedMonth.month_year) : ''}?`}
        warning="This will make this month active and allow logging expenses and payments."
        confirmText="Reopen Month"
        loading={formLoading}
      />
    </div>
  );
}
