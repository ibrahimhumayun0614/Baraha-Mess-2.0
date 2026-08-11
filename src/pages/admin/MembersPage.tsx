// ============================================
// Admin — Members Management Page
// ============================================
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  DollarSign,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  X,
} from 'lucide-react';
import { api, formatCurrency } from '../../lib/api';
import type { Member, MonthMember } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import Dialog from '../../components/ui/Dialog';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function MembersPage() {
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [monthMembers, setMonthMembers] = useState<MonthMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedMonthMember, setSelectedMonthMember] = useState<MonthMember | null>(null);
  const [actionDropdown, setActionDropdown] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    member_id: '',
    phone: '',
    email: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  // Close dropdown on outside click
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
    }
    const mmRes = await api.get<MonthMember[]>('/dashboard/members');
    if (mmRes.success && mmRes.data) {
      setMonthMembers(mmRes.data);
    }
    setLoading(false);
  };

  const getMonthMember = (memberId: number): MonthMember | undefined => {
    return monthMembers.find((mm) => mm.member_id === memberId);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const res = await api.post('/members', form);
    if (res.success) {
      toast.success('Member created successfully');
      setShowCreateDialog(false);
      setForm({ name: '', member_id: '', phone: '', email: '' });
      fetchMembers();
    } else {
      toast.error(res.error || 'Failed to create member');
    }
    setFormLoading(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setFormLoading(true);
    const res = await api.put(`/members/${selectedMember.id}`, form);
    if (res.success) {
      toast.success('Member updated successfully');
      setShowEditDialog(false);
      fetchMembers();
    } else {
      toast.error(res.error || 'Failed to update member');
    }
    setFormLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    setFormLoading(true);
    const res = await api.delete(`/members/${selectedMember.id}`);
    if (res.success) {
      toast.success('Member deactivated');
      setShowDeleteDialog(false);
      fetchMembers();
    } else {
      toast.error(res.error || 'Failed to deactivate member');
    }
    setFormLoading(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMonthMember) return;
    setFormLoading(true);
    const res = await api.post('/payments', {
      month_member_id: selectedMonthMember.id,
      amount: parseFloat(paymentForm.amount),
      payment_date: paymentForm.payment_date,
      notes: paymentForm.notes,
    });
    if (res.success) {
      toast.success('Payment recorded successfully');
      setShowPaymentDialog(false);
      fetchMembers();
    } else {
      toast.error(res.error || 'Failed to record payment');
    }
    setFormLoading(false);
  };

  const openEdit = (member: Member) => {
    setSelectedMember(member);
    setForm({
      name: member.name,
      member_id: member.member_id,
      phone: member.phone,
      email: member.email,
    });
    setShowEditDialog(true);
    setActionDropdown(null);
  };

  const openPayment = (member: Member) => {
    const mm = getMonthMember(member.id);
    if (!mm) {
      toast.warning('No active month or member not in current month');
      return;
    }
    setSelectedMonthMember(mm);
    setPaymentForm({
      amount: String(mm.contribution_amount - mm.amount_paid),
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowPaymentDialog(true);
    setActionDropdown(null);
  };

  const openDelete = (member: Member) => {
    setSelectedMember(member);
    setShowDeleteDialog(true);
    setActionDropdown(null);
  };

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.member_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Members</h1>
          <p className="text-sm text-muted">Manage mess members and their payments</p>
        </div>
        <div className="page-header-right">
          <button
            className="btn btn-primary"
            onClick={() => {
              setForm({ name: '', member_id: '', phone: '', email: '' });
              setShowCreateDialog(true);
            }}
          >
            <UserPlus size={16} />
            Add Member
          </button>
        </div>
      </div>

      <div className="card animate-fade-in">
        {/* Search */}
        <div className="filter-bar">
          <div className="search-bar" style={{ flex: 1, maxWidth: '20rem' }}>
            <Search size={16} className="search-icon" />
            <input
              className="input"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-sm text-muted ml-auto">
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
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
                    {search ? 'No members match your search' : 'No members yet. Create your first member!'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const mm = getMonthMember(member.id);
                  const pending = mm ? mm.contribution_amount - mm.amount_paid : 0;
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar avatar-sm">{member.name.charAt(0)}</div>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            {member.phone && (
                              <div className="text-xs text-muted">{member.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-muted">{member.member_id}</td>
                      <td>
                        <span className={`badge ${member.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                          {member.status}
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
                                <Edit size={14} /> Edit
                              </button>
                              <button className="dropdown-item" onClick={() => openPayment(member)}>
                                <DollarSign size={14} /> Record Payment
                              </button>
                              <div className="dropdown-separator" />
                              <button className="dropdown-item destructive" onClick={() => openDelete(member)}>
                                <UserMinus size={14} /> Deactivate
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

      {/* Create Member Dialog */}
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
            <label className="input-label">Phone</label>
            <input className="input" placeholder="e.g. +971 50 123 4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="e.g. mohamed@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </form>
      </Dialog>

      {/* Edit Member Dialog */}
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
          <div className="input-group">
            <label className="input-label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </form>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        title="Record Payment"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowPaymentDialog(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleRecordPayment} disabled={formLoading || !paymentForm.amount}>
              {formLoading ? 'Recording...' : 'Record Payment'}
            </button>
          </>
        }
      >
        {selectedMonthMember && (
          <form onSubmit={handleRecordPayment} className="flex flex-col gap-4">
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)', marginBottom: '0.5rem' }}>
              <div className="text-sm">
                <strong>Contribution:</strong> {formatCurrency(selectedMonthMember.contribution_amount)}
              </div>
              <div className="text-sm">
                <strong>Already Paid:</strong> {formatCurrency(selectedMonthMember.amount_paid)}
              </div>
              <div className="text-sm">
                <strong>Remaining:</strong> {formatCurrency(selectedMonthMember.contribution_amount - selectedMonthMember.amount_paid)}
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Amount (AED) *</label>
              <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label">Payment Date</label>
              <input className="input" type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Notes</label>
              <textarea className="textarea" placeholder="Optional notes..." value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
            </div>
          </form>
        )}
      </Dialog>

      {/* Delete Confirmation */}
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
    </div>
  );
}
