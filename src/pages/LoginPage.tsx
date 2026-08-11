// ============================================
// Login Page — Admin login & Member access
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ChevronDown, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { DEMO_MEMBERS } from '../lib/demoData';
import type { Member } from '../types';
import Select from '../components/ui/Select';

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'admin' | 'member'>('admin');
  const [password, setPassword] = useState('');
  const [selectedMember, setSelectedMember] = useState<number>(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate(user.type === 'admin' ? '/admin' : '/member');
    }
  }, [user, authLoading, navigate]);

  // Fetch members for dropdown
  useEffect(() => {
    const fetchMembers = async () => {
      const res = await api.get<Member[]>('/members/active');
      if (res.success && res.data && res.data.length > 0) {
        setMembers(res.data);
      } else {
        setMembers(DEMO_MEMBERS.filter((m) => m.status === 'active'));
      }
    };
    fetchMembers();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login('admin', password);
    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.error || 'Invalid password');
    }
    setLoading(false);
  };

  const handleMemberAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedMember) {
      setError('Please select your name');
      return;
    }

    setLoading(true);
    const result = await login('member', undefined, selectedMember);
    if (result.success) {
      navigate('/member');
    } else {
      setError(result.error || 'Access failed');
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="loader">
          <div className="loader-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Baraha Mess</h1>
            <p className="login-subtitle">Monthly Mess Management System</p>
          </div>

          {/* Tabs */}
          <div className="tabs" style={{ margin: '0 2rem' }}>
            <button
              className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => { setActiveTab('admin'); setError(''); }}
              style={{ flex: 1 }}
            >
              <Lock size={14} style={{ marginRight: '0.375rem', display: 'inline' }} />
              Admin Login
            </button>
            <button
              className={`tab ${activeTab === 'member' ? 'active' : ''}`}
              onClick={() => { setActiveTab('member'); setError(''); }}
              style={{ flex: 1 }}
            >
              <User size={14} style={{ marginRight: '0.375rem', display: 'inline' }} />
              Member Access
            </button>
          </div>

          <div className="login-form" style={{ paddingTop: '1.5rem' }}>
            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {activeTab === 'admin' ? (
              <form onSubmit={handleAdminLogin}>
                <div className="input-group">
                  <label className="input-label" htmlFor="admin-password">
                    Admin Password
                  </label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      id="admin-password"
                      type="password"
                      className="input"
                      placeholder="Enter admin password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={loading || !password}
                  style={{ marginTop: '1rem' }}
                >
                  {loading ? (
                    <div className="loader-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                  ) : (
                    <>
                      <LogIn size={16} />
                      Login as Admin
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMemberAccess}>
                <div className="input-group">
                  <label className="input-label" htmlFor="member-select">
                    Select Your Name
                  </label>
                  <div className="input-with-icon">
                    <User size={16} className="input-icon" />
                    <Select
                      id="member-select"
                      className="ui-select-with-icon"
                      value={selectedMember ? String(selectedMember) : ''}
                      onChange={(value) => setSelectedMember(Number(value) || 0)}
                      placeholder="Choose your name..."
                      options={members.map((m) => ({ value: String(m.id), label: m.name }))}
                    />
                  </div>
                  {members.length === 0 && (
                    <p className="input-helper">
                      No members found. Ask admin to create members first.
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={loading || !selectedMember}
                  style={{ marginTop: '1rem' }}
                >
                  {loading ? (
                    <div className="loader-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Access My Dashboard
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p
          className="text-center text-sm text-muted"
          style={{ marginTop: '1.5rem' }}
        >
          Baraha Mess Management System v2.0
        </p>
      </div>
    </div>
  );
}
