// ============================================
// Member — Add Expense Page
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import { api, formatCurrency } from '../../lib/api';
import type { ExpenseCategory } from '../../types';
import { useToast } from '../../contexts/ToastContext';

export default function AddExpensePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    description: '',
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await api.get<ExpenseCategory[]>('/categories');
      if (res.success && res.data) setCategories(res.data);
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await api.post('/expenses', {
      amount: parseFloat(form.amount),
      date: form.date,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      description: form.description,
    });

    if (res.success) {
      setSubmitted(true);
      toast.success('Expense added successfully');
    } else {
      toast.error(res.error || 'Failed to add expense');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category_id: '',
      description: '',
    });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div>
        <div className="card animate-scale-in" style={{ maxWidth: '32rem', margin: '2rem auto' }}>
          <div className="card-content" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div
              style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '9999px',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <CheckCircle size={28} color="#15803d" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Expense Added!
            </h2>
            <p className="text-sm text-muted" style={{ marginBottom: '0.375rem' }}>
              {formatCurrency(parseFloat(form.amount))} — {form.description || 'No description'}
            </p>
            <p className="text-xs text-muted" style={{ marginBottom: '1.5rem' }}>
              The expense has been recorded and the monthly balance has been updated.
            </p>
            <div className="flex gap-3 justify-center">
              <button className="btn btn-outline" onClick={() => navigate('/member')}>
                Back to Dashboard
              </button>
              <button className="btn btn-primary" onClick={resetForm}>
                <Receipt size={16} />
                Add Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/member')} style={{ marginBottom: '0.5rem' }}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <h1>Add Expense</h1>
          <p className="text-sm text-muted">Record a new expense for the current month</p>
        </div>
      </div>

      <div className="card animate-fade-in" style={{ maxWidth: '32rem' }}>
        <div className="card-content">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                autoFocus
                required
                style={{ fontSize: '1.125rem', height: '3rem', fontWeight: 600 }}
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
              <label className="input-label">Category *</label>
              <select
                className="select"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
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

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading || !form.amount || !form.date}
              style={{ marginTop: '0.5rem' }}
            >
              {loading ? (
                <div className="loader-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
              ) : (
                <>
                  <Receipt size={16} />
                  Submit Expense
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
