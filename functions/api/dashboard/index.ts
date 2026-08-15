// ============================================
// /api/dashboard — GET dashboard stats
// ============================================
import { json, errorResponse, authenticate, getActiveMonth, EXPENSE_SELECT, EXPENSE_SELECT_FALLBACK } from '../_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth) return errorResponse('Unauthorized', 401);

  const activeMonth = await getActiveMonth(db);
  if (!activeMonth) {
    return json({
      success: true,
      data: {
        current_month: null,
        total_collected: 0,
        total_spent: 0,
        balance: 0,
        daily_average: 0,
        total_members: 0,
        paid_members: 0,
        unpaid_members: 0,
        recent_expenses: [],
      },
    });
  }

  const monthId = activeMonth.id;

  // Totals
  const collected = await db
    .prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM month_members WHERE month_id = ?')
    .bind(monthId).first<{ total: number }>();

  const spent = await db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE month_id = ?')
    .bind(monthId).first<{ total: number }>();

  // Member counts
  const totalMembers = await db
    .prepare('SELECT COUNT(*) as total FROM month_members WHERE month_id = ?')
    .bind(monthId).first<{ total: number }>();

  const paidMembers = await db
    .prepare("SELECT COUNT(*) as total FROM month_members WHERE month_id = ? AND payment_status = 'paid'")
    .bind(monthId).first<{ total: number }>();

  // Daily average
  const totalSpent = spent?.total || 0;
  const [year, m] = activeMonth.month_year.split('-');
  const today = new Date();
  const daysInMonth = new Date(parseInt(year), parseInt(m), 0).getDate();
  const currentDay = today.getFullYear() === parseInt(year) && (today.getMonth() + 1) === parseInt(m)
    ? today.getDate() : daysInMonth;
  const dailyAverage = currentDay > 0 ? totalSpent / currentDay : 0;

  // Recent expenses
  let recentExpenses;
  try {
    recentExpenses = await db
      .prepare(`
        ${EXPENSE_SELECT}
        WHERE e.month_id = ?
        ORDER BY e.created_at DESC
        LIMIT 10
      `)
      .bind(monthId).all();
  } catch {
    recentExpenses = await db
      .prepare(`
        ${EXPENSE_SELECT_FALLBACK}
        WHERE e.month_id = ?
        ORDER BY e.created_at DESC
        LIMIT 10
      `)
      .bind(monthId).all();
  }

  return json({
    success: true,
    data: {
      current_month: activeMonth.month_year,
      total_collected: collected?.total || 0,
      total_spent: totalSpent,
      balance: (collected?.total || 0) - totalSpent,
      daily_average: Math.round(dailyAverage * 100) / 100,
      total_members: totalMembers?.total || 0,
      paid_members: paidMembers?.total || 0,
      unpaid_members: (totalMembers?.total || 0) - (paidMembers?.total || 0),
      recent_expenses: recentExpenses.results,
    },
  });
};
