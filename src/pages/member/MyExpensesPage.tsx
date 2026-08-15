// ============================================
// Member — My Expenses Page
// ============================================
import { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Receipt,
  ArrowUpDown,
} from 'lucide-react';
import { api, formatCurrency, formatDate, formatNote, formatPaidBy, formatAddedBy, formatPeriod, buildQueryString } from '../../lib/api';
import type { Expense } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import AddExpenseDialog from '../../components/expenses/AddExpenseDialog';

export default function MyExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 20;

  useEffect(() => {
    fetchExpenses();
  }, [search, dateFrom, dateTo, page, sortBy, sortOrder, user?.id]);

  const fetchExpenses = async () => {
    setLoading(true);
    const query = buildQueryString({
      search,
      date_from: dateFrom,
      date_to: dateTo,
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
      mine: true,
    });
    const res = await api.get<Expense[]>(`/expenses${query}`);
    if (res.success && res.data) {
      setExpenses(res.data);
      setTotal(res.total || 0);
    } else {
      setExpenses([]);
      setTotal(0);
    }
    setLoading(false);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Expenses</h1>
          <p className="text-sm text-muted">
            {total} expense{total !== 1 ? 's' : ''}
            {totalAmount > 0 && ` · Total: ${formatCurrency(totalAmount)}`}
          </p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
            Add Expense
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
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <input
            className="input"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            title="From date"
          />
          <input
            className="input"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            title="To date"
          />
          {(search || dateFrom || dateTo) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Paid By</th>
                <th>Added By</th>
                <th className={`sortable ${sortBy === 'date' ? 'sorted' : ''}`} onClick={() => handleSort('date')}>
                  Date <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '0.25rem' }} />
                </th>
                <th>Period</th>
                <th>Note</th>
                <th className={`sortable ${sortBy === 'amount' ? 'sorted' : ''}`} onClick={() => handleSort('amount')}>
                  Amount <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '0.25rem' }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="skeleton skeleton-text" style={{ width: '80%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state" style={{ padding: '3rem' }}>
                      <div className="empty-state-icon"><Receipt size={24} /></div>
                      <h3 className="empty-state-title">No Expenses</h3>
                      <p className="empty-state-description">
                        {search || dateFrom || dateTo
                          ? 'No expenses match your filters'
                          : "You haven't added any expenses yet"}
                      </p>
                      {!search && !dateFrom && !dateTo && (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddExpense(true)}>
                          Add Expense
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="font-medium">{formatPaidBy(expense)}</td>
                    <td>{formatAddedBy(expense)}</td>
                    <td>{formatDate(expense.date)}</td>
                    <td>
                      <span className={`badge ${expense.month_status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                        {formatPeriod(expense)}
                      </span>
                    </td>
                    <td className="text-sm">{formatNote(expense.description)}</td>
                    <td className="amount">{formatCurrency(expense.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
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

      <AddExpenseDialog
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSuccess={fetchExpenses}
        mode="member"
        defaultMemberId={user?.id}
      />
    </div>
  );
}
