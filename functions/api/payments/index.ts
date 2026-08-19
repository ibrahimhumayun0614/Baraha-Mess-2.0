// ============================================
// /api/payments — POST record payment
// ============================================
import { json, errorResponse, authenticate, logActivity, paymentStatusFromAmounts, syncPaidFromPayments } from '../_shared';

interface Env {
  DB: D1Database;
}

// POST /api/payments — Record payment
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const body = await request.json() as {
    month_member_id: number;
    amount: number;
    payment_date: string;
    notes?: string;
  };

  if (!body.month_member_id || !body.amount) {
    return errorResponse('Month member ID and amount are required');
  }

  // Verify month_member exists
  const mm = await db
    .prepare(`
      SELECT mm.*, m.name as member_name 
      FROM month_members mm 
      JOIN members m ON mm.member_id = m.id 
      WHERE mm.id = ?
    `)
    .bind(body.month_member_id)
    .first<{
      id: number;
      contribution_amount: number;
      amount_paid: number;
      payment_status: string;
      member_name: string;
      member_id: number;
    }>();

  if (!mm) return errorResponse('Month member record not found', 404);

  // Record payment
  const payResult = await db
    .prepare('INSERT INTO payments (month_member_id, amount, payment_date, notes) VALUES (?, ?, ?, ?)')
    .bind(body.month_member_id, body.amount, body.payment_date || new Date().toISOString().split('T')[0], body.notes || '')
    .run();

  await syncPaidFromPayments(db);
  const updated = await db
    .prepare('SELECT amount_paid, payment_status FROM month_members WHERE id = ?')
    .bind(body.month_member_id)
    .first<{ amount_paid: number; payment_status: string }>();
  const status = updated?.payment_status || paymentStatusFromAmounts((mm.amount_paid || 0) + body.amount, mm.contribution_amount);

  await logActivity(
    db, 'admin', auth.user_id,
    `Recorded payment of AED ${body.amount} from ${mm.member_name}`,
    'record_payment',
    `Status: ${status}`,
    body.month_member_id,
    'payment',
    {
      payment_id: payResult.meta.last_row_id,
      month_member_id: body.month_member_id,
      amount: body.amount,
      previous_paid: mm.amount_paid,
      previous_status: mm.payment_status,
    }
  );

  return json({ success: true });
};
