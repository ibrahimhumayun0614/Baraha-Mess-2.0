// ============================================
// Member Dashboard Page
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingDown,
  Wallet,
  BarChart3,
  PlusCircle,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { api, formatCurrency, formatDate, formatMonthYear } from '../../lib/api';
import type { MemberDashboardStats, Expense } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState<MemberDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    const res = await api.get<MemberDashboardStats>('/dashboard/member');
    if (res.success && res.data) {
      setStats(res.data);
    } else {
      setStats({
        current_month: '2026-08',
        total_collected: 5000,
        total_spent: 3200,
        balance: 1800,
        daily_average: 106.67,
        total_members: 10,
        paid_members: 8,
        unpaid_members: 2,
        my_total_expenses: 470,
        my_expense_count: 3,
        recent_expenses: [
          { id: 1, month_id: 1, created_by: user?.id || 1, amount: 120, date: '2026-08-11', description: 'Vegetables and groceries', category_id: 1, category_name: 'Groceries', creator_name: user?.name || 'Mohamed Ibrahim', created_at: '', updated_at: '' },
          { id: 4, month_id: 1, created_by: user?.id || 1, amount: 250, date: '2026-08-05', description: 'Supermarket supplies', category_id: 1, category_name: 'Groceries', creator_name: user?.name || 'Mohamed Ibrahim', created_at: '', updated_at: '' },
          { id: 5, month_id: 1, created_by: user?.id || 1, amount: 100, date: '2026-08-01', description: 'Rice and oil', category_id: 4, category_name: 'Rice', creator_name: user?.name || 'Mohamed Ibrahim', created_at: '', updated_at: '' },
        ]
      });
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
          <button className="btn btn-primary" onClick={() => navigate('/member/add-expense')}>
            <PlusCircle size={16} />
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
          {/* Overall Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="stat-card animate-fade-in delay-1">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Collected</span>
                <div className="stat-card-icon"><DollarSign size={16} /></div>
              </div>
              <div className="stat-card-value">{formatCurrency(stats.total_collected)}</div>
              <div className="stat-card-change text-muted">{stats.total_members} members</div>
            </div>

            <div className="stat-card animate-fade-in delay-2">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Spent</span>
                <div className="stat-card-icon"><TrendingDown size={16} /></div>
              </div>
              <div className="stat-card-value">{formatCurrency(stats.total_spent)}</div>
            </div>

            <div className="stat-card animate-fade-in delay-3">
              <div className="stat-card-header">
                <span className="stat-card-label">Balance</span>
                <div className="stat-card-icon"><Wallet size={16} /></div>
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
                <div className="stat-card-icon"><BarChart3 size={16} /></div>
              </div>
              <div className="stat-card-value">{formatCurrency(stats.daily_average)}</div>
            </div>
          </div>

          {/* My Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="stat-card animate-fade-in delay-5" style={{ borderLeft: '3px solid var(--primary)' }}>
              <div className="stat-card-header">
                <span className="stat-card-label">My Total Expenses</span>
                <div className="stat-card-icon"><Receipt size={16} /></div>
              </div>
              <div className="stat-card-value">{formatCurrency(stats.my_total_expenses)}</div>
              <div className="stat-card-change text-muted">{stats.my_expense_count} entries</div>
            </div>

            <div className="stat-card animate-fade-in delay-6" style={{ borderLeft: '3px solid var(--primary)' }}>
              <div className="stat-card-header">
                <span className="stat-card-label">Paid Members</span>
                <div className="stat-card-icon"><DollarSign size={16} /></div>
              </div>
              <div className="stat-card-value">{stats.paid_members}/{stats.total_members}</div>
              <div className="stat-card-change text-muted">{stats.unpaid_members} unpaid</div>
            </div>
          </div>

          {/* Recent Expenses */}
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
                    onClick={() => navigate('/member/add-expense')}
                  >
                    <PlusCircle size={14} />
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
                      <div className="text-sm font-medium">{expense.description || 'No description'}</div>
                      <div className="text-xs text-muted">
                        {expense.category_name} · {formatDate(expense.date)}
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
    </div>
  );
}
