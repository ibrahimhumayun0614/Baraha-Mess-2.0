// ============================================
// Admin — Expense History Page
// ============================================
import { useState, useEffect } from 'react';
import {
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { api, formatCurrency, formatDate, formatMonthYear, formatNote, formatPaidBy, formatAddedBy, formatPeriod, buildQueryString } from '../../lib/api';
import type { Expense, Member, MessMonth } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import Dialog from '../../components/ui/Dialog';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import AddExpenseDialog from '../../components/expenses/AddExpenseDialog';
import Select from '../../components/ui/Select';
import { useSearchParams } from 'react-router-dom';

export default function ExpensesPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [months, setMonths] = useState<MessMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDropdown, setActionDropdown] = useState<number | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 20;

  // Edit state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    member_id: '',
    amount: '',
    date: '',
    description: '',
  });

  useEffect(() => {
    fetchMembers();
    fetchMonths();
  }, []);

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setShowAddExpense(true);
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchExpenses();
  }, [search, memberFilter, monthFilter, dateFrom, dateTo, page, sortBy, sortOrder]);

  useEffect(() => {
    const handleClick = () => setActionDropdown(null);
    if (actionDropdown !== null) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [actionDropdown]);

  const fetchExpenses = async () => {
    setLoading(true);
    const query = buildQueryString({
      search,
      created_by: memberFilter,
      month_id: monthFilter || undefined,
      date_from: dateFrom,
      date_to: dateTo,
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
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

  const fetchMembers = async () => {
    const res = await api.get<Member[]>('/members');
    if (res.success && res.data) setMembers(res.data);
    else setMembers([]);
  };

  const fetchMonths = async () => {
    const res = await api.get<MessMonth[]>('/months');
    if (res.success && res.data && res.data.length > 0) {
      setMonths(res.data);
    } else {
      setMonths([]);
    }
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

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setFormLoading(true);
    const res = await api.put(`/expenses/${selectedExpense.id}`, {
      amount: parseFloat(editForm.amount),
      date: editForm.date,
      description: editForm.description,
      category_id: null,
      created_by: editForm.member_id ? parseInt(editForm.member_id) : selectedExpense.created_by,
    });
    if (res.success) {
      toast.success('Expense updated');
      setShowEditDialog(false);
      fetchExpenses();
    } else {
      toast.error(res.error || 'Failed to update');
    }
    setFormLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;
    setFormLoading(true);
    const res = await api.delete(`/expenses/${selectedExpense.id}`);
    if (res.success) {
      toast.success('Expense deleted');
      setShowDeleteDialog(false);
      fetchExpenses();
    } else {
      toast.error(res.error || 'Failed to delete');
    }
    setFormLoading(false);
  };

  const openEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditForm({
      member_id: String(expense.created_by || ''),
      amount: String(expense.amount),
      date: expense.date,
      description: expense.description,
    });
    setShowEditDialog(true);
    setActionDropdown(null);
  };

  const openDelete = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDeleteDialog(true);
    setActionDropdown(null);
  };

  const totalPages = Math.ceil(total / limit);
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Expense History</h1>
          <p className="text-sm text-muted">
            {total} expense{total !== 1 ? 's' : ''} found
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
          <Select
            value={monthFilter}
            onChange={(value) => { setMonthFilter(value); setPage(1); }}
            placeholder="Select month"
            options={[
              { value: 'all', label: 'All Months' },
              ...months.map((m) => ({
                value: String(m.id),
                label: `${formatMonthYear(m.month_year)}${m.status === 'active' ? ' (Active)' : ''}`,
              })),
            ]}
          />
          <Select
            value={memberFilter}
            onChange={(value) => { setMemberFilter(value); setPage(1); }}
            placeholder="All Members"
            options={[
              { value: '', label: 'All Members' },
              ...members.map((m) => ({ value: String(m.id), label: m.name })),
            ]}
          />
          <input
            className="input"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            title="Date from"
          />
          <input
            className="input"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            title="Date to"
          />
          {(search || memberFilter || dateFrom || dateTo || monthFilter !== 'all') && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setMemberFilter('');
                setDateFrom('');
                setDateTo('');
                setMonthFilter('all');
                setPage(1);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table table-mobile-cards">
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton skeleton-text" style={{ width: '80%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty">No expenses found</td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="font-medium" data-label="Paid By">{formatPaidBy(expense)}</td>
                    <td data-label="Added By">{formatAddedBy(expense)}</td>
                    <td data-label="Date">{formatDate(expense.date)}</td>
                    <td data-label="Period">
                      <span className={`badge ${expense.month_status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                        {formatPeriod(expense)}
                      </span>
                    </td>
                    <td data-label="Note">
                      <span className="text-sm">{formatNote(expense.description)}</span>
                    </td>
                    <td className="amount" data-label="Amount">{formatCurrency(expense.amount)}</td>
                    <td className="table-actions-cell" data-label="Actions">
                      <div className="dropdown">
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionDropdown(actionDropdown === expense.id ? null : expense.id);
                          }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {actionDropdown === expense.id && (
                          <div className="dropdown-menu">
                            <button className="dropdown-item" onClick={() => openEdit(expense)}>
                              <Edit size={14} /> Edit
                            </button>
                            <div className="dropdown-separator" />
                            <button className="dropdown-item destructive" onClick={() => openDelete(expense)}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
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
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        title="Edit Expense"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowEditDialog(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={formLoading || !editForm.amount || !editForm.member_id}>
              {formLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">Paid By *</label>
            <Select
              value={editForm.member_id}
              onChange={(value) => setEditForm({ ...editForm, member_id: value })}
              placeholder="Select member"
              options={members
                .filter((m) => m.status === 'active' || m.id === selectedExpense?.created_by)
                .map((m) => ({ value: String(m.id), label: m.name }))}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Amount (AED) *</label>
            <input className="input" type="number" step="0.01" min="0" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label">Date *</label>
            <input className="input" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label">Note</label>
            <textarea className="textarea" placeholder="e.g. Groceries, Dinner" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
        </form>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Delete this expense of ${selectedExpense ? formatCurrency(selectedExpense.amount) : ''} paid by ${selectedExpense ? formatPaidBy(selectedExpense) : ''}?`}
        warning="This action cannot be undone. The monthly balance will be recalculated."
        confirmText="Delete"
        loading={formLoading}
        destructive
      />

      <AddExpenseDialog
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSuccess={fetchExpenses}
      />
    </div>
  );
}
