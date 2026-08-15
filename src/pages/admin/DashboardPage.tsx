// ============================================
// Admin Dashboard Page
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingDown,
  Wallet,
  Users,
  UserCheck,
  UserX,
  BarChart3,
  Plus,
  ArrowRight,
  Calendar,
  Receipt,
} from 'lucide-react';
import { api, formatCurrency, formatDate, formatMonthYear, formatNote, formatPaidBy, formatAddedBy } from '../../lib/api';
import type { DashboardStats, Expense, MonthMember } from '../../types';
import AddExpenseDialog from '../../components/expenses/AddExpenseDialog';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [members, setMembers] = useState<MonthMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    const res = await api.get<DashboardStats>('/dashboard');
    if (res.success && res.data) {
      setStats(res.data);
    } else {
      setStats(null);
    }

    const membersRes = await api.get<MonthMember[]>('/dashboard/members');
    if (membersRes.success && membersRes.data) {
      setMembers(membersRes.data);
    } else {
      setMembers([]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Dashboard</h1>
            <p className="text-sm text-muted">Overview of your mess finances</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: '8rem' }} />
          ))}
        </div>
        <div className="skeleton skeleton-card" style={{ height: '20rem' }} />
      </div>
    );
  }

  const noActiveMonth = !stats || !stats.current_month;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p className="text-sm text-muted">
            {stats?.current_month
              ? formatMonthYear(stats.current_month)
              : 'No active month'}
            {' — '}Overview of your mess finances
          </p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-outline" onClick={() => navigate('/admin/months')}>
            Manage Months
          </button>
          <button className="btn btn-outline" onClick={() => setShowAddExpense(true)}>
            Add Expense
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/members')}>
            Add Member
          </button>
        </div>
      </div>

      {noActiveMonth ? (
        <div className="card animate-fade-in">
          <div className="empty-state" style={{ padding: '4rem 2rem' }}>
            <div className="empty-state-icon">
              <Calendar size={24} />
            </div>
            <h3 className="empty-state-title">No Active Month</h3>
            <p className="empty-state-description">
              Start a new monthly mess cycle to begin tracking contributions and expenses.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/admin/months')}
            >
              <Plus size={16} />
              Start New Month
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="stat-card animate-fade-in delay-1">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Collected</span>
                <div className="stat-card-icon">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="stat-card-value">{formatCurrency(stats!.total_collected)}</div>
              <div className="stat-card-change">
                <Users size={12} />
                {stats!.paid_members}/{stats!.total_members} members paid
              </div>
            </div>

            <div className="stat-card animate-fade-in delay-2">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Spent</span>
                <div className="stat-card-icon">
                  <TrendingDown size={16} />
                </div>
              </div>
              <div className="stat-card-value">{formatCurrency(stats!.total_spent)}</div>
              <div className="stat-card-change">
                <Receipt size={12} />
                {stats!.recent_expenses?.length || 0} expenses this month
              </div>
            </div>

            <div className="stat-card animate-fade-in delay-3">
              <div className="stat-card-header">
                <span className="stat-card-label">Balance</span>
                <div className="stat-card-icon">
                  <Wallet size={16} />
                </div>
              </div>
              <div className="stat-card-value">
                <span className={stats!.balance >= 0 ? '' : 'amount-negative'}>
                  {formatCurrency(stats!.balance)}
                </span>
              </div>
              <div className={`stat-card-change ${stats!.balance >= 0 ? 'positive' : 'negative'}`}>
                {stats!.balance >= 0 ? 'In surplus' : 'In deficit'}
              </div>
            </div>

            <div className="stat-card animate-fade-in delay-4">
              <div className="stat-card-header">
                <span className="stat-card-label">Daily Average</span>
                <div className="stat-card-icon">
                  <BarChart3 size={16} />
                </div>
              </div>
              <div className="stat-card-value">{formatCurrency(stats!.daily_average)}</div>
              <div className="stat-card-change text-muted">Per day expense</div>
            </div>
          </div>

          {/* Second row stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="stat-card animate-fade-in delay-5">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Members</span>
                <div className="stat-card-icon">
                  <Users size={16} />
                </div>
              </div>
              <div className="stat-card-value">{stats!.total_members}</div>
            </div>

            <div className="stat-card animate-fade-in delay-5">
              <div className="stat-card-header">
                <span className="stat-card-label">Paid Members</span>
                <div className="stat-card-icon" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
                  <UserCheck size={16} />
                </div>
              </div>
              <div className="stat-card-value" style={{ color: '#15803d' }}>{stats!.paid_members}</div>
            </div>

            <div className="stat-card animate-fade-in delay-6">
              <div className="stat-card-header">
                <span className="stat-card-label">Unpaid Members</span>
                <div className="stat-card-icon" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                  <UserX size={16} />
                </div>
              </div>
              <div className="stat-card-value" style={{ color: '#b91c1c' }}>{stats!.unpaid_members}</div>
            </div>
          </div>

          {/* Members Payment Status & Recent Expenses */}
          <div className="flex flex-col gap-4">
            {/* Members Table */}
            <div className="card animate-fade-in">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Members Payment Status</h3>
                  <p className="card-description">Current month contribution tracking</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/members')}>
                  View All <ArrowRight size={14} />
                </button>
              </div>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="table-empty">No members this month</td>
                      </tr>
                    ) : (
                      members.slice(0, 8).map((mm) => (
                        <tr key={mm.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="avatar avatar-sm">
                                {mm.member_name?.charAt(0) || '?'}
                              </div>
                              <span className="font-medium">{mm.member_name}</span>
                            </div>
                          </td>
                          <td className="amount">{formatCurrency(mm.contribution_amount)}</td>
                          <td className="amount">{formatCurrency(mm.amount_paid)}</td>
                          <td>
                            <span className={`badge ${
                              mm.payment_status === 'paid' ? 'badge-success' :
                              mm.payment_status === 'partial' ? 'badge-warning' :
                              'badge-destructive'
                            }`}>
                              {mm.payment_status.charAt(0).toUpperCase() + mm.payment_status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Expenses */}
            <div className="card animate-fade-in">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Recent Expenses</h3>
                  <p className="card-description">Latest expense entries</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/expenses')}>
                  View All <ArrowRight size={14} />
                </button>
              </div>
              <div style={{ padding: '0.5rem 1rem' }}>
                {(!stats!.recent_expenses || stats!.recent_expenses.length === 0) ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    <p className="text-sm text-muted">No expenses recorded yet</p>
                  </div>
                ) : (
                  stats!.recent_expenses.slice(0, 8).map((expense: Expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between"
                      style={{ padding: '0.625rem 0', borderBottom: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                          {expense.creator_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{formatNote(expense.description)}</div>
                          <div className="text-xs text-muted">
                            Paid by {formatPaidBy(expense)} · Added by {formatAddedBy(expense)} · {formatDate(expense.date)}
                          </div>
                        </div>
                      </div>
                      <span className="amount">{formatCurrency(expense.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <AddExpenseDialog
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSuccess={fetchDashboard}
      />
    </div>
  );
}
