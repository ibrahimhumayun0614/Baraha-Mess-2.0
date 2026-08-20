// ============================================
// App — Root component with routing
// ============================================
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/admin/DashboardPage';
import MembersPage from './pages/admin/MembersPage';
import MonthsPage from './pages/admin/MonthsPage';
import ExpensesPage from './pages/admin/ExpensesPage';
import ActivityLogsPage from './pages/admin/ActivityLogsPage';
import AdminTerminalPage from './pages/admin/AdminTerminalPage';
import MemberDashboardPage from './pages/member/DashboardPage';
import MyExpensesPage from './pages/member/MyExpensesPage';

function ProtectedRoute({ children, requiredType }: { children: React.ReactNode; requiredType?: 'admin' | 'member' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loader-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredType && user.type !== requiredType) {
    return <Navigate to={user.type === 'admin' ? '/admin' : '/member'} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredType="admin">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="months" element={<MonthsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="activity" element={<ActivityLogsPage />} />
        <Route path="terminal" element={<AdminTerminalPage />} />
      </Route>

      {/* Member Routes */}
      <Route
        path="/member"
        element={
          <ProtectedRoute requiredType="member">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MemberDashboardPage />} />
        <Route path="add-expense" element={<Navigate to="/member" replace />} />
        <Route path="expenses" element={<MyExpensesPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
