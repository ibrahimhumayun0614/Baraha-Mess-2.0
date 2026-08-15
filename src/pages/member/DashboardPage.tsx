// ============================================
// Member Dashboard Page
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, ArrowRight } from 'lucide-react';
import { api, formatCurrency, formatDate, formatMonthYear, formatNote, formatPaidBy, formatAddedBy } from '../../lib/api';
import type { MemberDashboardStats, Expense } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import AddExpenseDialog from '../../components/expenses/AddExpenseDialog';

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<MemberDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    const res = await api.get<MemberDashboardStats>('/dashboard/member');
    if (res.success && res.data) {
      setStats(res.data);
    } else {
      setStats(null);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Welcome back!</h1>
            <p className="text-sm text-muted">Loading your dashboard...</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: '8rem' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome, {user?.name}!</h1>
          <p className="text-sm text-muted">
            {stats?.current_month
              ? `${formatMonthYear(stats.current_month)} — Your mess dashboard`
              : 'No active month'}
          </p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
            Add Expense
          </button>
        </div>
      </div>

      {!stats?.current_month ? (
        <div className="card animate-fade-in">
          <div className="empty-state" style={{ padding: '4rem 2rem' }}>
            <div className="empty-state-icon"><Wallet size={24} /></div>
            <h3 className="empty-state-title">No Active Month</h3>
            <p className="empty-state-description">
              The admin hasn't started a new monthly cycle yet. Check back soon!
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="stat-card animate-fade-in delay-1">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Collected</span>
              </div>
              <div className="stat-card-value">{formatCurrency(stats.total_collected)}</div>
              <div className="stat-card-change text-muted">{stats.total_members} members</div>
            </div>

            <div className="stat-card animate-fade-in delay-2">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Spent</span>
              </div>
              <div className="stat-card-value">{formatCurrency(stats.total_spent)}</div>
            </div>

            <div className="stat-card animate-fade-in delay-3">
              <div className="stat-card-header">
                <span className="stat-card-label">Balance</span>
              </div>
              <div className="stat-card-value">
                <span className={stats.balance >= 0 ? '' : 'amount-negative'}>
                  {formatCurrency(stats.balance)}
                </span>
              </div>
            </div>

            <div className="stat-card animate-fade-in delay-4">
              <div className="stat-card-header">
                <span className="stat-card-label">Daily Average</span>
              </div>
              <div className="stat-card-value">{formatCurrency(stats.daily_average)}</div>
            </div>
          </div>

          <div className="card animate-fade-in">
            <div className="card-header">
              <div>
                <h3 className="card-title">My Recent Expenses</h3>
                <p className="card-description">Your latest expense entries</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/member/expenses')}>
                View All <ArrowRight size={14} />
              </button>
            </div>
            <div style={{ padding: '0.5rem 1rem' }}>
              {(!stats.recent_expenses || stats.recent_expenses.length === 0) ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <p className="text-sm text-muted">You haven't added any expenses yet</p>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.75rem' }}
                    onClick={() => setShowAddExpense(true)}
                  >
                    Add Your First Expense
                  </button>
                </div>
              ) : (
                stats.recent_expenses.slice(0, 10).map((expense: Expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between"
                    style={{ padding: '0.625rem 0.5rem', borderBottom: '1px solid var(--border)' }}
                  >
                    <div>
                      <div className="text-sm font-medium">{formatNote(expense.description)}</div>
                      <div className="text-xs text-muted">
                        Paid by {formatPaidBy(expense)} · Added by {formatAddedBy(expense)} · {formatDate(expense.date)}
                      </div>
                    </div>
                    <span className="amount">{formatCurrency(expense.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <AddExpenseDialog
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSuccess={fetchDashboard}
        mode="member"
        defaultMemberId={user?.id}
      />
    </div>
  );
}
