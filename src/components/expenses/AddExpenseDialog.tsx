// ============================================
// Add Expense Dialog — admin or member
// ============================================
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { DEMO_MEMBERS, isDemoToken } from '../../lib/demoData';
import type { Member } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import Dialog from '../ui/Dialog';
import Select from '../ui/Select';

interface AddExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Preselect member (admin) or force creator (member) */
  defaultMemberId?: number;
  /** Admin can pick any member; member only adds for self */
  mode?: 'admin' | 'member';
}

export default function AddExpenseDialog({
  open,
  onClose,
  onSuccess,
  defaultMemberId,
  mode = 'admin',
}: AddExpenseDialogProps) {
  const toast = useToast();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    member_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const isMemberMode = mode === 'member';

  useEffect(() => {
    if (!open) return;

    const memberId = isMemberMode
      ? String(user?.id || defaultMemberId || '')
      : defaultMemberId
        ? String(defaultMemberId)
        : '';

    setForm({
      member_id: memberId,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });

    if (isMemberMode) return;

    const load = async () => {
      const memRes = await api.get<Member[]>('/members');
      if (memRes.success && memRes.data) {
        setMembers(memRes.data.filter((m) => m.status === 'active'));
      } else {
        setMembers(DEMO_MEMBERS.filter((m) => m.status === 'active'));
      }
    };
    load();
  }, [open, defaultMemberId, isMemberMode, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const createdBy = isMemberMode
      ? user?.id
      : form.member_id
        ? parseInt(form.member_id)
        : undefined;

    if (!createdBy) {
      toast.error(isMemberMode ? 'Not logged in as a member' : 'Please select who this expense is for');
      return;
    }

    setLoading(true);
    const payload: Record<string, unknown> = {
      amount: parseFloat(form.amount),
      date: form.date,
      category_id: null,
      description: form.description,
    };

    if (!isMemberMode) {
      payload.created_by = createdBy;
    }

    const res = await api.post('/expenses', payload);

    if (res.success || isDemoToken(localStorage.getItem('baraha_token'))) {
      toast.success('Expense added successfully');
      onClose();
      onSuccess?.();
    } else {
      toast.error(res.error || 'Failed to add expense');
    }
    setLoading(false);
  };

  const canSubmit =
    !!form.amount &&
    !!form.date &&
    (isMemberMode || !!form.member_id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add Expense"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-expense-form"
            className="btn btn-primary"
            disabled={loading || !canSubmit}
          >
            {loading ? (
              <div className="loader-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
            ) : (
              'Submit Expense'
            )}
          </button>
        </>
      }
    >
      <form id="add-expense-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isMemberMode && (
          <div className="input-group">
            <label className="input-label">Expense for (Member) *</label>
            <Select
              value={form.member_id}
              onChange={(value) => setForm({ ...form, member_id: value })}
              placeholder="Select member"
              options={[
                { value: '', label: 'Select member' },
                ...members.map((m) => ({
                  value: String(m.id),
                  label: `${m.name} (${m.member_id})`,
                })),
              ]}
            />
            <p className="text-xs text-muted" style={{ marginTop: '0.375rem' }}>
              Choose yourself or any member this purchase belongs to.
            </p>
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Amount (AED) *</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
            autoFocus
            style={{ fontSize: '1.125rem', height: '2.75rem', fontWeight: 600 }}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Date *</label>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label">Description</label>
          <textarea
            className="textarea"
            placeholder="e.g. Vegetables and groceries from the market"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </div>
      </form>
    </Dialog>
  );
}
