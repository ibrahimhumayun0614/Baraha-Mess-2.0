// ============================================
// /api/dashboard/members — GET month members with payment info
// ============================================
import { json, errorResponse, authenticate, getActiveMonth, paymentStatusFromAmounts, syncPaidFromPayments } from '../_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth) return errorResponse('Unauthorized', 401);

  const activeMonth = await getActiveMonth(db);
  if (!activeMonth) {
    return json({ success: true, data: [] });
  }

  await syncPaidFromPayments(db, activeMonth.id);

  const members = await db
    .prepare(`
      SELECT mm.*, m.name as member_name, m.member_id as member_member_id
      FROM month_members mm
      JOIN members m ON mm.member_id = m.id
      WHERE mm.month_id = ?
      ORDER BY m.name ASC
    `)
    .bind(activeMonth.id)
    .all();

  const data = (members.results || []).map((row: any) => ({
    ...row,
    payment_status: paymentStatusFromAmounts(Number(row.amount_paid) || 0, Number(row.contribution_amount) || 0),
  }));

  return json({ success: true, data });
};
