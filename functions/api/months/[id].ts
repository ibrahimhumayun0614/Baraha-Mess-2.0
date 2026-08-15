// ============================================
// /api/months/[id] — GET, PUT single month
// ============================================
import { json, errorResponse, authenticate, logActivity } from '../_shared';

interface Env {
  DB: D1Database;
}

// GET /api/months/:id
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth) return errorResponse('Unauthorized', 401);

  const month = await db.prepare('SELECT * FROM mess_months WHERE id = ?').bind(params.id).first();
  if (!month) return errorResponse('Month not found', 404);

  return json({ success: true, data: month });
};

// PUT /api/months/:id — Update contribution or close
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const id = params.id;
  const body = await request.json() as { contribution_amount?: number; status?: string };

  const month = await db.prepare('SELECT * FROM mess_months WHERE id = ?').bind(id).first<{ month_year: string; status: string }>();
  if (!month) return errorResponse('Month not found', 404);

  // Update contribution amount
  if (body.contribution_amount !== undefined) {
    await db
      .prepare('UPDATE mess_months SET contribution_amount = ? WHERE id = ?')
      .bind(body.contribution_amount, id)
      .run();

    // Update all month_members contribution amounts and payment status
    await db
      .prepare('UPDATE month_members SET contribution_amount = ? WHERE month_id = ?')
      .bind(body.contribution_amount, id)
      .run();

    await db
      .prepare(`
        UPDATE month_members
        SET payment_status = CASE
          WHEN COALESCE(amount_paid, 0) <= 0 THEN 'unpaid'
          WHEN amount_paid >= contribution_amount THEN 'paid'
          ELSE 'partial'
        END
        WHERE month_id = ?
      `)
      .bind(id)
      .run();

    await logActivity(
      db, 'admin', auth.user_id,
      `Updated contribution to AED ${body.contribution_amount} for ${month.month_year}`,
      'update_contribution', '', Number(id), 'month'
    );
  }

  // Update status: close or reopen
  if (body.status === 'closed') {
    await db
      .prepare("UPDATE mess_months SET status = 'closed', closed_at = datetime('now') WHERE id = ?")
      .bind(id)
      .run();

    await logActivity(
      db, 'admin', auth.user_id,
      `Closed month: ${month.month_year}`,
      'close_month', '', Number(id), 'month'
    );
  } else if (body.status === 'active') {
    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (month.month_year < currentMonthYear) {
      return errorResponse('Cannot reopen a completed past month', 400);
    }

    // Close any other active months
    await db.prepare("UPDATE mess_months SET status = 'closed', closed_at = datetime('now') WHERE status = 'active' AND id != ?").bind(id).run();

    // Reopen this month
    await db.prepare("UPDATE mess_months SET status = 'active', closed_at = NULL WHERE id = ?").bind(id).run();

    // Ensure all active members are enrolled
    const activeMembers = await db.prepare("SELECT id FROM members WHERE status = 'active'").all();
    const contrib = body.contribution_amount ?? (month as any).contribution_amount ?? 0;
    for (const member of activeMembers.results) {
      await db
        .prepare('INSERT OR IGNORE INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)')
        .bind(id, (member as any).id, contrib)
        .run();
    }

    await logActivity(
      db, 'admin', auth.user_id,
      `Reopened month: ${month.month_year}`,
      'reopen_month', '', Number(id), 'month'
    );
  }

  return json({ success: true });
};
