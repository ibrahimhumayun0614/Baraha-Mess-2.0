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

    // Update all month_members contribution amounts too
    await db
      .prepare('UPDATE month_members SET contribution_amount = ? WHERE month_id = ?')
      .bind(body.contribution_amount, id)
      .run();

    await logActivity(
      db, 'admin', auth.user_id,
      `Updated contribution to AED ${body.contribution_amount} for ${month.month_year}`,
      'update_contribution', '', Number(id), 'month'
    );
  }

  // Close month
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
  }

  return json({ success: true });
};
