// ============================================
// Demo / preview data when the API is offline
// ============================================
import type {
  ActivityLog,
  DashboardStats,
  Expense,
  Member,
  MemberDashboardStats,
  MessMonth,
  MonthMember,
  MonthSummary,
} from '../types';

export const DEMO_ADMIN_TOKEN = 'demo-admin-token';
export const DEMO_MEMBER_TOKEN_PREFIX = 'demo-member-token';

export const DEMO_MEMBERS: Member[] = [
  { id: 1, name: 'Mohamed Ibrahim', member_id: 'MEM-001', phone: '+971 50 123 4567', email: 'mohamed@example.com', status: 'active', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
  { id: 2, name: 'Humayun Kabir', member_id: 'MEM-002', phone: '+971 50 234 5678', email: 'humayun@example.com', status: 'active', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
  { id: 3, name: 'Rashid Ali', member_id: 'MEM-003', phone: '+971 50 345 6789', email: 'rashid@example.com', status: 'active', created_at: '2026-01-06T10:00:00Z', updated_at: '2026-01-06T10:00:00Z' },
  { id: 4, name: 'Farhan Ahmed', member_id: 'MEM-004', phone: '+971 50 456 7890', email: 'farhan@example.com', status: 'active', created_at: '2026-01-07T10:00:00Z', updated_at: '2026-01-07T10:00:00Z' },
  { id: 5, name: 'Sajid Khan', member_id: 'MEM-005', phone: '+971 50 567 8901', email: 'sajid@example.com', status: 'active', created_at: '2026-01-08T10:00:00Z', updated_at: '2026-01-08T10:00:00Z' },
  { id: 6, name: 'Imran Hussain', member_id: 'MEM-006', phone: '+971 50 678 9012', email: 'imran@example.com', status: 'active', created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
  { id: 7, name: 'Naveed Sheikh', member_id: 'MEM-007', phone: '+971 50 789 0123', email: 'naveed@example.com', status: 'active', created_at: '2026-02-02T10:00:00Z', updated_at: '2026-02-02T10:00:00Z' },
  { id: 8, name: 'Adil Rahman', member_id: 'MEM-008', phone: '+971 50 890 1234', email: 'adil@example.com', status: 'active', created_at: '2026-02-03T10:00:00Z', updated_at: '2026-02-03T10:00:00Z' },
  { id: 9, name: 'Yousuf Malik', member_id: 'MEM-009', phone: '+971 50 901 2345', email: 'yousuf@example.com', status: 'inactive', created_at: '2026-01-10T10:00:00Z', updated_at: '2026-07-01T10:00:00Z' },
  { id: 10, name: 'Tariq Ansari', member_id: 'MEM-010', phone: '+971 50 012 3456', email: 'tariq@example.com', status: 'active', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-01T10:00:00Z' },
];

export const DEMO_MONTHS: MessMonth[] = [
  { id: 3, month_year: '2026-08', contribution_amount: 500, status: 'active', created_at: '2026-08-01T08:00:00Z', closed_at: null },
  { id: 2, month_year: '2026-07', contribution_amount: 500, status: 'closed', created_at: '2026-07-01T08:00:00Z', closed_at: '2026-07-31T22:00:00Z' },
  { id: 1, month_year: '2026-06', contribution_amount: 450, status: 'closed', created_at: '2026-06-01T08:00:00Z', closed_at: '2026-06-30T22:00:00Z' },
];

export const DEMO_MONTH_MEMBERS: MonthMember[] = [
  { id: 1, month_id: 3, member_id: 1, contribution_amount: 500, payment_status: 'paid', amount_paid: 500, created_at: '2026-08-01T08:00:00Z', member_name: 'Mohamed Ibrahim', member_member_id: 'MEM-001' },
  { id: 2, month_id: 3, member_id: 2, contribution_amount: 500, payment_status: 'paid', amount_paid: 500, created_at: '2026-08-01T08:00:00Z', member_name: 'Humayun Kabir', member_member_id: 'MEM-002' },
  { id: 3, month_id: 3, member_id: 3, contribution_amount: 500, payment_status: 'unpaid', amount_paid: 0, created_at: '2026-08-01T08:00:00Z', member_name: 'Rashid Ali', member_member_id: 'MEM-003' },
  { id: 4, month_id: 3, member_id: 4, contribution_amount: 500, payment_status: 'paid', amount_paid: 500, created_at: '2026-08-01T08:00:00Z', member_name: 'Farhan Ahmed', member_member_id: 'MEM-004' },
  { id: 5, month_id: 3, member_id: 5, contribution_amount: 500, payment_status: 'partial', amount_paid: 250, created_at: '2026-08-01T08:00:00Z', member_name: 'Sajid Khan', member_member_id: 'MEM-005' },
  { id: 6, month_id: 3, member_id: 6, contribution_amount: 500, payment_status: 'paid', amount_paid: 500, created_at: '2026-08-01T08:00:00Z', member_name: 'Imran Hussain', member_member_id: 'MEM-006' },
  { id: 7, month_id: 3, member_id: 7, contribution_amount: 500, payment_status: 'paid', amount_paid: 500, created_at: '2026-08-01T08:00:00Z', member_name: 'Naveed Sheikh', member_member_id: 'MEM-007' },
  { id: 8, month_id: 3, member_id: 8, contribution_amount: 500, payment_status: 'unpaid', amount_paid: 0, created_at: '2026-08-01T08:00:00Z', member_name: 'Adil Rahman', member_member_id: 'MEM-008' },
  { id: 9, month_id: 3, member_id: 10, contribution_amount: 500, payment_status: 'paid', amount_paid: 500, created_at: '2026-08-01T08:00:00Z', member_name: 'Tariq Ansari', member_member_id: 'MEM-010' },
];

export const DEMO_EXPENSES: Expense[] = [
  { id: 1, month_id: 3, created_by: 1, amount: 120, date: '2026-08-11', description: 'Vegetables & Groceries', category_id: null, creator_name: 'Mohamed Ibrahim', created_at: '2026-08-11T09:15:00Z', updated_at: '2026-08-11T09:15:00Z' },
  { id: 2, month_id: 3, created_by: 2, amount: 350, date: '2026-08-10', description: 'Fresh Meat & Chicken', category_id: null, creator_name: 'Humayun Kabir', created_at: '2026-08-10T18:30:00Z', updated_at: '2026-08-10T18:30:00Z' },
  { id: 3, month_id: 3, created_by: 3, amount: 80, date: '2026-08-09', description: 'Cooking Gas Cylinder', category_id: null, creator_name: 'Rashid Ali', created_at: '2026-08-09T14:00:00Z', updated_at: '2026-08-09T14:00:00Z' },
  { id: 4, month_id: 3, created_by: 1, amount: 250, date: '2026-08-08', description: 'Supermarket weekly supplies', category_id: null, creator_name: 'Mohamed Ibrahim', created_at: '2026-08-08T11:20:00Z', updated_at: '2026-08-08T11:20:00Z' },
  { id: 5, month_id: 3, created_by: 4, amount: 95, date: '2026-08-07', description: 'Fresh fruits for breakfast', category_id: null, creator_name: 'Farhan Ahmed', created_at: '2026-08-07T08:45:00Z', updated_at: '2026-08-07T08:45:00Z' },
  { id: 6, month_id: 3, created_by: 5, amount: 180, date: '2026-08-06', description: 'Basmati rice 25kg', category_id: null, creator_name: 'Sajid Khan', created_at: '2026-08-06T16:10:00Z', updated_at: '2026-08-06T16:10:00Z' },
  { id: 7, month_id: 3, created_by: 6, amount: 65, date: '2026-08-05', description: 'Milk, yogurt and eggs', category_id: null, creator_name: 'Imran Hussain', created_at: '2026-08-05T07:30:00Z', updated_at: '2026-08-05T07:30:00Z' },
  { id: 8, month_id: 3, created_by: 7, amount: 45, date: '2026-08-04', description: 'Cleaning supplies', category_id: null, creator_name: 'Naveed Sheikh', created_at: '2026-08-04T19:00:00Z', updated_at: '2026-08-04T19:00:00Z' },
  { id: 9, month_id: 3, created_by: 1, amount: 100, date: '2026-08-03', description: 'Rice and cooking oil', category_id: null, creator_name: 'Mohamed Ibrahim', created_at: '2026-08-03T12:00:00Z', updated_at: '2026-08-03T12:00:00Z' },
  { id: 10, month_id: 3, created_by: 10, amount: 40, date: '2026-08-02', description: 'Drinking water bottles', category_id: null, creator_name: 'Tariq Ansari', created_at: '2026-08-02T10:00:00Z', updated_at: '2026-08-02T10:00:00Z' },
  { id: 11, month_id: 3, created_by: 2, amount: 55, date: '2026-08-02', description: 'Onions, tomatoes, greens', category_id: null, creator_name: 'Humayun Kabir', created_at: '2026-08-02T17:20:00Z', updated_at: '2026-08-02T17:20:00Z' },
  { id: 12, month_id: 3, created_by: 8, amount: 30, date: '2026-08-01', description: 'Spices restock', category_id: null, creator_name: 'Adil Rahman', created_at: '2026-08-01T15:00:00Z', updated_at: '2026-08-01T15:00:00Z' },
  { id: 13, month_id: 2, created_by: 1, amount: 200, date: '2026-07-28', description: 'Month-end groceries', category_id: null, creator_name: 'Mohamed Ibrahim', created_at: '2026-07-28T11:00:00Z', updated_at: '2026-07-28T11:00:00Z' },
  { id: 14, month_id: 2, created_by: 3, amount: 280, date: '2026-07-20', description: 'Chicken and mutton', category_id: null, creator_name: 'Rashid Ali', created_at: '2026-07-20T18:00:00Z', updated_at: '2026-07-20T18:00:00Z' },
];

export const DEMO_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 1, actor_type: 'admin', actor_id: 1, action: 'Admin logged in', action_type: 'login', details: 'Successful admin login', reference_id: null, reference_type: null, created_at: '2026-08-11T08:00:00Z', actor_name: 'Admin' },
  { id: 2, actor_type: 'member', actor_id: 1, action: 'Added expense AED 120', action_type: 'create_expense', details: 'Vegetables & Groceries', reference_id: 1, reference_type: 'expense', created_at: '2026-08-11T09:15:00Z', actor_name: 'Mohamed Ibrahim' },
  { id: 3, actor_type: 'member', actor_id: 2, action: 'Added expense AED 350', action_type: 'create_expense', details: 'Fresh Meat & Chicken', reference_id: 2, reference_type: 'expense', created_at: '2026-08-10T18:30:00Z', actor_name: 'Humayun Kabir' },
  { id: 4, actor_type: 'admin', actor_id: 1, action: 'Recorded payment AED 500', action_type: 'record_payment', details: 'Payment from Farhan Ahmed', reference_id: 4, reference_type: 'payment', created_at: '2026-08-09T12:00:00Z', actor_name: 'Admin' },
  { id: 5, actor_type: 'member', actor_id: 3, action: 'Added expense AED 80', action_type: 'create_expense', details: 'Cooking Gas Cylinder', reference_id: 3, reference_type: 'expense', created_at: '2026-08-09T14:00:00Z', actor_name: 'Rashid Ali' },
  { id: 6, actor_type: 'admin', actor_id: 1, action: 'Started month 2026-08', action_type: 'start_month', details: 'Contribution AED 500', reference_id: 3, reference_type: 'month', created_at: '2026-08-01T08:00:00Z', actor_name: 'Admin' },
  { id: 7, actor_type: 'admin', actor_id: 1, action: 'Closed month 2026-07', action_type: 'close_month', details: 'July cycle closed', reference_id: 2, reference_type: 'month', created_at: '2026-07-31T22:00:00Z', actor_name: 'Admin' },
  { id: 8, actor_type: 'admin', actor_id: 1, action: 'Created member Tariq Ansari', action_type: 'create_member', details: 'MEM-010', reference_id: 10, reference_type: 'member', created_at: '2026-03-01T10:00:00Z', actor_name: 'Admin' },
  { id: 9, actor_type: 'member', actor_id: 5, action: 'Member accessed portal', action_type: 'member_access', details: '', reference_id: null, reference_type: null, created_at: '2026-08-06T16:05:00Z', actor_name: 'Sajid Khan' },
  { id: 10, actor_type: 'admin', actor_id: 1, action: 'Recorded payment AED 250', action_type: 'record_payment', details: 'Partial payment from Sajid Khan', reference_id: 5, reference_type: 'payment', created_at: '2026-08-05T10:30:00Z', actor_name: 'Admin' },
];

const DEMO_TOTAL_COLLECTED = DEMO_MONTH_MEMBERS.reduce((sum, m) => sum + m.amount_paid, 0);
const DEMO_TOTAL_SPENT = DEMO_EXPENSES.filter((e) => e.month_id === 3).reduce((sum, e) => sum + e.amount, 0);
const DEMO_PAID = DEMO_MONTH_MEMBERS.filter((m) => m.payment_status === 'paid').length;
const DEMO_UNPAID = DEMO_MONTH_MEMBERS.filter((m) => m.payment_status !== 'paid').length;

export const DEMO_DASHBOARD: DashboardStats = {
  current_month: '2026-08',
  total_collected: DEMO_TOTAL_COLLECTED,
  total_spent: DEMO_TOTAL_SPENT,
  balance: DEMO_TOTAL_COLLECTED - DEMO_TOTAL_SPENT,
  daily_average: Math.round((DEMO_TOTAL_SPENT / 11) * 100) / 100,
  total_members: DEMO_MONTH_MEMBERS.length,
  paid_members: DEMO_PAID,
  unpaid_members: DEMO_UNPAID,
  recent_expenses: DEMO_EXPENSES.filter((e) => e.month_id === 3).slice(0, 5),
};

export function getDemoMemberDashboard(memberId = 1, memberName = 'Mohamed Ibrahim'): MemberDashboardStats {
  const myExpenses = DEMO_EXPENSES.filter((e) => e.created_by === memberId && e.month_id === 3);
  return {
    ...DEMO_DASHBOARD,
    my_total_expenses: myExpenses.reduce((sum, e) => sum + e.amount, 0),
    my_expense_count: myExpenses.length,
    recent_expenses: myExpenses.slice(0, 5).map((e) => ({
      ...e,
      creator_name: memberName,
    })),
  };
}

export function getDemoMonthSummary(monthId: number): MonthSummary | null {
  const month = DEMO_MONTHS.find((m) => m.id === monthId);
  if (!month) return null;

  if (monthId === 3) {
    return {
      month,
      total_collected: DEMO_TOTAL_COLLECTED,
      total_spent: DEMO_TOTAL_SPENT,
      balance: DEMO_TOTAL_COLLECTED - DEMO_TOTAL_SPENT,
      daily_average: DEMO_DASHBOARD.daily_average,
      member_count: DEMO_MONTH_MEMBERS.length,
      paid_count: DEMO_PAID,
      unpaid_count: DEMO_UNPAID,
    };
  }

  if (monthId === 2) {
    return {
      month,
      total_collected: 4500,
      total_spent: 4100,
      balance: 400,
      daily_average: 132.26,
      member_count: 9,
      paid_count: 9,
      unpaid_count: 0,
    };
  }

  return {
    month,
    total_collected: 4050,
    total_spent: 3890,
    balance: 160,
    daily_average: 129.67,
    member_count: 9,
    paid_count: 9,
    unpaid_count: 0,
  };
}

export function filterDemoExpenses(options: {
  search?: string;
  created_by?: string | number;
  month_id?: string | number;
  date_from?: string;
  date_to?: string;
  mine?: boolean;
  memberId?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}): { data: Expense[]; total: number } {
  let rows = [...DEMO_EXPENSES];

  if (options.mine && options.memberId) {
    rows = rows.filter((e) => e.created_by === options.memberId);
  }
  if (options.created_by) {
    rows = rows.filter((e) => e.created_by === Number(options.created_by));
  }
  if (options.month_id && options.month_id !== 'all') {
    rows = rows.filter((e) => e.month_id === Number(options.month_id));
  } else if (!options.month_id) {
    // Default to active demo month
    const active = DEMO_MONTHS.find((m) => m.status === 'active') || DEMO_MONTHS[0];
    if (active) rows = rows.filter((e) => e.month_id === active.id);
  }
  if (options.date_from) {
    rows = rows.filter((e) => e.date >= options.date_from!);
  }
  if (options.date_to) {
    rows = rows.filter((e) => e.date <= options.date_to!);
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    rows = rows.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        (e.creator_name || '').toLowerCase().includes(q)
    );
  }

  const sortBy = options.sort_by || 'date';
  const sortOrder = options.sort_order || 'desc';
  rows.sort((a, b) => {
    const av = a[sortBy as keyof Expense];
    const bv = b[sortBy as keyof Expense];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : 1;
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const total = rows.length;
  const page = options.page || 1;
  const limit = options.limit || 20;
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), total };
}

export function filterDemoActivityLogs(options: {
  search?: string;
  action_type?: string;
  actor_type?: string;
  page?: number;
  limit?: number;
}): { data: ActivityLog[]; total: number } {
  let rows = [...DEMO_ACTIVITY_LOGS];

  if (options.action_type) {
    rows = rows.filter((l) => l.action_type === options.action_type);
  }
  if (options.actor_type) {
    rows = rows.filter((l) => l.actor_type === options.actor_type);
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    rows = rows.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q) ||
        (l.actor_name || '').toLowerCase().includes(q)
    );
  }

  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const total = rows.length;
  const page = options.page || 1;
  const limit = options.limit || 30;
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), total };
}

export function getDemoMemberName(memberId: number): string {
  return DEMO_MEMBERS.find((m) => m.id === memberId)?.name || 'Member';
}

export function isDemoToken(token: string | null): boolean {
  return !!token && (token === DEMO_ADMIN_TOKEN || token.startsWith(DEMO_MEMBER_TOKEN_PREFIX));
}
