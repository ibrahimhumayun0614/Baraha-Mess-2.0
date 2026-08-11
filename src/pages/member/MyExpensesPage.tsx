// ============================================
// Member — My Expenses Page
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Receipt,
  ArrowUpDown,
} from 'lucide-react';
import { api, formatCurrency, formatDate, buildQueryString } from '../../lib/api';
import type { Expense, ExpenseCategory } from '../../types';

export default function MyExpensesPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 20;

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await api.get<ExpenseCategory[]>('/categories');
      if (res.success && res.data) setCategories(res.data);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [search, categoryFilter, dateFrom, dateTo, page, sortBy, sortOrder]);

  const fetchExpenses = async () => {
    setLoading(true);
    const query = buildQueryString({
      search,
      category_id: categoryFilter,
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
          <button className="btn btn-primary" onClick={() => navigate('/member/add-expense')}>
            <PlusCircle size={16} />
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
              style={{ maxWidth: '16rem' }}
            />
          </div>
          <select
            className="select"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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
          {(search || categoryFilter || dateFrom || dateTo) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setCategoryFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}
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
                <th className={`sortable ${sortBy === 'date' ? 'sorted' : ''}`} onClick={() => handleSort('date')}>
                  Date <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '0.25rem' }} />
                </th>
                <th className={`sortable ${sortBy === 'amount' ? 'sorted' : ''}`} onClick={() => handleSort('amount')}>
                  Amount <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '0.25rem' }} />
                </th>
                <th>Category</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j}><div className="skeleton skeleton-text" style={{ width: '80%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state" style={{ padding: '3rem' }}>
                      <div className="empty-state-icon"><Receipt size={24} /></div>
                      <h3 className="empty-state-title">No Expenses</h3>
                      <p className="empty-state-description">
                        {search || categoryFilter || dateFrom || dateTo
                          ? 'No expenses match your filters'
                          : "You haven't added any expenses yet"}
                      </p>
                      {!search && !categoryFilter && (
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/member/add-expense')}>
                          <PlusCircle size={14} /> Add Expense
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.date)}</td>
                    <td className="amount">{formatCurrency(expense.amount)}</td>
                    <td>
                      <span className="badge badge-secondary">{expense.category_name || 'Other'}</span>
                    </td>
                    <td className="text-sm">{expense.description || '—'}</td>
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
    </div>
  );
}
