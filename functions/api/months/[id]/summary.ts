// ============================================
// /api/months/[id]/summary — GET financial summary
// ============================================
import { json, errorResponse, authenticate, syncPaidFromPayments, EXPENSE_SELECT, EXPENSE_SELECT_FALLBACK } from '../../_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth) return errorResponse('Unauthorized', 401);

  const monthId = params.id;

  const month = await db.prepare('SELECT * FROM mess_months WHERE id = ?').bind(monthId).first();
  if (!month) return errorResponse('Month not found', 404);

  // Sync payments for this month before calculating summary
  await syncPaidFromPayments(db, Number(monthId));

  // Total collected (sum of amount_paid from month_members)
  const collected = await db
    .prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM month_members WHERE month_id = ?')
    .bind(monthId)
    .first<{ total: number }>();

  // Total spent (sum of expenses)
  const spent = await db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE month_id = ?')
    .bind(monthId)
    .first<{ total: number }>();

  // Member counts
  const memberCount = await db
    .prepare('SELECT COUNT(*) as total FROM month_members WHERE month_id = ?')
    .bind(monthId)
    .first<{ total: number }>();

  const paidCount = await db
    .prepare("SELECT COUNT(*) as total FROM month_members WHERE month_id = ? AND COALESCE(amount_paid, 0) > 0 AND amount_paid >= contribution_amount")
    .bind(monthId)
    .first<{ total: number }>();

  const unpaidCount = (memberCount?.total || 0) - (paidCount?.total || 0);

  // Calculate daily average
  const totalSpent = spent?.total || 0;
  const monthYear = (month as any).month_year as string;
  const [year, m] = monthYear.split('-');
  const daysInMonth = new Date(parseInt(year), parseInt(m), 0).getDate();
  const today = new Date();
  const currentDay = today.getFullYear() === parseInt(year) && (today.getMonth() + 1) === parseInt(m)
    ? today.getDate()
    : daysInMonth;
  const dailyAverage = currentDay > 0 ? totalSpent / currentDay : 0;

  let expenses: unknown[] = [];
  try {
    const expenseRows = await db
      .prepare(`
        ${EXPENSE_SELECT}
        WHERE e.month_id = ?
        ORDER BY e.date DESC, e.created_at DESC
      `)
      .bind(monthId)
      .all();
    expenses = expenseRows.results || [];
  } catch {
    const fallback = await db
      .prepare(`
        ${EXPENSE_SELECT_FALLBACK}
        WHERE e.month_id = ?
        ORDER BY e.date DESC, e.created_at DESC
      `)
      .bind(monthId)
      .all();
    expenses = fallback.results || [];
  }

  const membersRes = await db
    .prepare(`
      SELECT mm.*, m.name as member_name, m.member_id as member_member_id, m.phone as member_phone
      FROM month_members mm
      JOIN members m ON mm.member_id = m.id
      WHERE mm.month_id = ?
      ORDER BY m.name ASC
    `)
    .bind(monthId)
    .all();

  return json({
    success: true,
    data: {
      month,
      total_collected: collected?.total || 0,
      total_spent: totalSpent,
      balance: (collected?.total || 0) - totalSpent,
      daily_average: Math.round(dailyAverage * 100) / 100,
      member_count: memberCount?.total || 0,
      paid_count: paidCount?.total || 0,
      unpaid_count: unpaidCount || 0,
      members: membersRes.results || [],
      expenses,
    },
  });
};
