// ============================================
// Admin — Members Management Page
// ============================================
import { useState, useEffect, useMemo } from 'react';
import { Search, MoreHorizontal } from 'lucide-react';
import { api, formatCurrency } from '../../lib/api';
import type { Member, MonthMember } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import Dialog from '../../components/ui/Dialog';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Select from '../../components/ui/Select';
import AddExpenseDialog from '../../components/expenses/AddExpenseDialog';

export default function MembersPage() {
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [monthMembers, setMonthMembers] = useState<MonthMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseMemberId, setExpenseMemberId] = useState<number | undefined>(undefined);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedMonthMember, setSelectedMonthMember] = useState<MonthMember | null>(null);
  const [actionDropdown, setActionDropdown] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    member_id: '',
    monthly_amount: '',
    amount_paid: '',
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    const handleClick = () => setActionDropdown(null);
    if (actionDropdown !== null) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [actionDropdown]);

  const fetchMembers = async () => {
    setLoading(true);
    const res = await api.get<Member[]>('/members');
    if (res.success && res.data) {
      setMembers(res.data);
    } else {
      setMembers([]);
    }
    const mmRes = await api.get<MonthMember[]>('/dashboard/members');
    if (mmRes.success && mmRes.data) {
      setMonthMembers(mmRes.data);
    } else {
      setMonthMembers([]);
    }
    setLoading(false);
  };

  const getMonthMember = (memberId: number): MonthMember | undefined => {
    return monthMembers.find((mm) => mm.member_id === memberId);
  };

  const defaultMonthlyAmount = () => {
    const fromMonth = monthMembers[0]?.contribution_amount;
    return String(fromMonth ?? 500);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const res = await api.post<{ id: number }>('/members', {
      name: form.name,
      member_id: form.member_id,
      phone: '',
      email: '',
    });

    if (res.success) {
      const paid = parseFloat(form.amount_paid || '0') || 0;
      const memberId = res.data?.id;

      if (memberId && paid > 0) {
        const mmRes = await api.get<MonthMember[]>('/dashboard/members');
        const mm = mmRes.data?.find((m) => m.member_id === memberId);
        if (mm) {
          await api.post('/payments', {
            month_member_id: mm.id,
            amount: paid,
            payment_date: new Date().toISOString().split('T')[0],
            notes: '',
          });
        }
      }
      await fetchMembers();
      toast.success('Member created successfully');
      setShowCreateDialog(false);
      setForm({ name: '', member_id: '', monthly_amount: '', amount_paid: '' });
    } else {
      toast.error(res.error || 'Failed to create member');
    }
    setFormLoading(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setFormLoading(true);

    const res = await api.put(`/members/${selectedMember.id}`, {
      name: form.name,
      member_id: form.member_id,
      phone: '',
      email: '',
    });

    if (!res.success) {
      toast.error(res.error || 'Failed to update member');
      setFormLoading(false);
      return;
    }

    const payAmount = parseFloat(form.amount_paid || '0') || 0;

    if (selectedMonthMember && payAmount > 0) {
      const payRes = await api.post('/payments', {
        month_member_id: selectedMonthMember.id,
        amount: payAmount,
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      if (!payRes.success) {
        toast.error(payRes.error || 'Member updated, but payment failed');
        setFormLoading(false);
        fetchMembers();
        return;
      }
    }
    await fetchMembers();

    toast.success(payAmount > 0 ? 'Member and payment updated' : 'Member updated successfully');
    setShowEditDialog(false);
    setFormLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    setFormLoading(true);
    const res = await api.delete(`/members/${selectedMember.id}`);
    if (res.success) {
      await fetchMembers();
      toast.success('Member deactivated');
      setShowDeleteDialog(false);
    } else {
      toast.error(res.error || 'Failed to deactivate member');
    }
    setFormLoading(false);
  };

  const openEdit = (member: Member) => {
    const mm = getMonthMember(member.id);
    setSelectedMember(member);
    setSelectedMonthMember(mm || null);
    setForm({
      name: member.name,
      member_id: member.member_id,
      monthly_amount: mm ? String(mm.contribution_amount) : defaultMonthlyAmount(),
      amount_paid: '',
    });
    setShowEditDialog(true);
    setActionDropdown(null);
  };

  const openDelete = (member: Member) => {
    setSelectedMember(member);
    setShowDeleteDialog(true);
    setActionDropdown(null);
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.member_id.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || m.status === statusFilter;
      const mm = getMonthMember(m.id);
      const matchesPayment =
        !paymentFilter ||
        (paymentFilter === 'none' ? !mm : mm?.payment_status === paymentFilter);
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [members, monthMembers, search, statusFilter, paymentFilter]);

  const hasFilters = !!(search || statusFilter || paymentFilter);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Members</h1>
          <p className="text-sm text-muted">
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
            {hasFilters ? ' found' : ''}
          </p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-outline" onClick={() => { setExpenseMemberId(undefined); setShowAddExpense(true); }}>
            Add Expense
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setForm({
                name: '',
                member_id: '',
                monthly_amount: defaultMonthlyAmount(),
                amount_paid: '',
              });
              setShowCreateDialog(true);
            }}
          >
            Add Member
          </button>
        </div>
      </div>

      <div className="card animate-fade-in">
        <div className="filter-bar">
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input
              className="input"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <Select
            value={paymentFilter}
            onChange={setPaymentFilter}
            placeholder="Payment Status"
            options={[
              { value: '', label: 'All Payments' },
              { value: 'paid', label: 'Paid' },
              { value: 'partial', label: 'Partial' },
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'none', label: 'Not in month' },
            ]}
          />
          {hasFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setPaymentFilter('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Member ID</th>
                <th>Status</th>
                <th>Monthly Amount</th>
                <th>Paid</th>
                <th>Pending</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton skeleton-text" style={{ width: '80%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty">
                    {hasFilters
                      ? 'No members match your filters'
                      : 'No members yet. Create your first member!'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const mm = getMonthMember(member.id);
                  const pending = mm ? mm.contribution_amount - mm.amount_paid : 0;
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="font-medium">{member.name}</div>
                      </td>
                      <td className="text-muted">{member.member_id}</td>
                      <td>
                        <span className={`badge ${member.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </span>
                      </td>
                      <td className="amount">{mm ? formatCurrency(mm.contribution_amount) : '—'}</td>
                      <td className="amount">{mm ? formatCurrency(mm.amount_paid) : '—'}</td>
                      <td className="amount">{mm ? formatCurrency(pending) : '—'}</td>
                      <td>
                        {mm ? (
                          <span className={`badge ${
                            mm.payment_status === 'paid' ? 'badge-success' :
                            mm.payment_status === 'partial' ? 'badge-warning' :
                            'badge-destructive'
                          }`}>
                            {mm.payment_status.charAt(0).toUpperCase() + mm.payment_status.slice(1)}
                          </span>
                        ) : (
                          <span className="text-muted text-sm">—</span>
                        )}
                      </td>
                      <td>
                        <div className="dropdown">
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionDropdown(actionDropdown === member.id ? null : member.id);
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {actionDropdown === member.id && (
                            <div className="dropdown-menu">
                              <button className="dropdown-item" onClick={() => openEdit(member)}>
                                Edit
                              </button>
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setExpenseMemberId(member.id);
                                  setShowAddExpense(true);
                                  setActionDropdown(null);
                                }}
                              >
                                Add Expense
                              </button>
                              <div className="dropdown-separator" />
                              <button className="dropdown-item destructive" onClick={() => openDelete(member)}>
                                Deactivate
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Add New Member"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowCreateDialog(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={formLoading || !form.name || !form.member_id}>
              {formLoading ? 'Creating...' : 'Create Member'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">Full Name *</label>
            <input className="input" placeholder="e.g. Mohamed Ibrahim" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label">Member ID *</label>
            <input className="input" placeholder="e.g. MEM-001" value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label">Monthly Amount (AED)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder="500.00"
              value={form.monthly_amount}
              onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Amount Paid (AED)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount_paid}
              onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
            />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        title="Edit Member"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowEditDialog(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={formLoading || !form.name}>
              {formLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">Full Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label">Member ID *</label>
            <input className="input" value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} required />
          </div>

          {selectedMonthMember ? (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)' }}>
              <div className="text-sm"><strong>Monthly Amount:</strong> {formatCurrency(selectedMonthMember.contribution_amount)}</div>
              <div className="text-sm"><strong>Already Paid:</strong> {formatCurrency(selectedMonthMember.amount_paid)}</div>
              <div className="text-sm"><strong>Pending:</strong> {formatCurrency(selectedMonthMember.contribution_amount - selectedMonthMember.amount_paid)}</div>
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Monthly Amount (AED)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.monthly_amount}
                onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Record Payment (AED)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount_paid}
              onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
            />
            <p className="text-xs text-muted" style={{ marginTop: '0.375rem' }}>
              Enter an amount to record a new payment for the current month. Leave blank to skip.
            </p>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Deactivate Member"
        message={`Are you sure you want to deactivate "${selectedMember?.name}"?`}
        warning="The member will be marked as inactive and won't be added to new monthly cycles."
        confirmText="Deactivate"
        loading={formLoading}
        destructive
      />

      <AddExpenseDialog
        open={showAddExpense}
        onClose={() => { setShowAddExpense(false); setExpenseMemberId(undefined); }}
        onSuccess={fetchMembers}
        mode="admin"
        defaultMemberId={expenseMemberId}
      />
    </div>
  );
}
