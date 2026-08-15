// ============================================
// Baraha Mess 2.0 — TypeScript Types
// ============================================

// ---- Database Models ----

export interface Admin {
  id: number;
  username: string;
  created_at: string;
}

export interface Member {
  id: number;
  name: string;
  member_id: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface MessMonth {
  id: number;
  month_year: string;
  contribution_amount: number;
  status: 'active' | 'closed';
  created_at: string;
  closed_at: string | null;
}

export interface MonthMember {
  id: number;
  month_id: number;
  member_id: number;
  contribution_amount: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  amount_paid: number;
  created_at: string;
  // Joined fields
  member_name?: string;
  member_member_id?: string;
}

export interface Payment {
  id: number;
  month_member_id: number;
  amount: number;
  payment_date: string;
  notes: string;
  created_at: string;
  // Joined fields
  member_name?: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  icon: string;
}

export interface Expense {
  id: number;
  month_id: number;
  created_by: number;
  amount: number;
  date: string;
  description: string;
  category_id: number | null;
  added_by_type?: 'admin' | 'member' | null;
  added_by_id?: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  category_icon?: string;
  creator_name?: string;
  added_by_name?: string;
  month_year?: string;
  month_status?: 'active' | 'closed';
}

export interface ActivityLog {
  id: number;
  actor_type: 'admin' | 'member';
  actor_id: number;
  action: string;
  action_type: string;
  details: string;
  reference_id: number | null;
  reference_type: string | null;
  created_at: string;
  // Joined fields
  actor_name?: string;
}

export interface Session {
  id: number;
  token: string;
  user_type: 'admin' | 'member';
  user_id: number;
  expires_at: string;
  created_at: string;
}

// ---- API Types ----

export interface AuthUser {
  id: number;
  type: 'admin' | 'member';
  name: string;
  member_id?: string;
}

export interface LoginRequest {
  type: 'admin' | 'member';
  password?: string;
  member_id?: number;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface DashboardStats {
  current_month: string;
  total_collected: number;
  total_spent: number;
  balance: number;
  daily_average: number;
  total_members: number;
  paid_members: number;
  unpaid_members: number;
  recent_expenses: Expense[];
}

export interface MemberDashboardStats extends DashboardStats {
  my_total_expenses: number;
  my_expense_count: number;
}

export interface MonthSummary {
  month: MessMonth;
  total_collected: number;
  total_spent: number;
  balance: number;
  daily_average: number;
  member_count: number;
  paid_count: number;
  unpaid_count: number;
}

export interface CreateMemberRequest {
  name: string;
  member_id: string;
  phone?: string;
  email?: string;
}

export interface CreateMonthRequest {
  month_year: string;
  contribution_amount: number;
}

export interface CreateExpenseRequest {
  month_id?: number;
  amount: number;
  date: string;
  description: string;
  category_id: number | null;
  created_by?: number;
}

export interface RecordPaymentRequest {
  month_member_id: number;
  amount: number;
  payment_date: string;
  notes?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ExpenseFilters extends PaginatedRequest {
  month_id?: number;
  category_id?: number;
  created_by?: number;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
}

export interface ActivityLogFilters extends PaginatedRequest {
  action_type?: string;
  actor_type?: string;
  actor_id?: number;
  date_from?: string;
  date_to?: string;
}
