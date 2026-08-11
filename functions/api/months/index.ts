// ============================================
// /api/months — GET all, POST create
// ============================================
import { json, errorResponse, authenticate, logActivity } from '../_shared';

interface Env {
  DB: D1Database;
}

// GET /api/months — List all months
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth) return errorResponse('Unauthorized', 401);

  const months = await db.prepare('SELECT * FROM mess_months ORDER BY month_year DESC').all();
  return json({ success: true, data: months.results });
};

// POST /api/months — Start new month
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const body = await request.json() as { month_year: string; contribution_amount: number };

  if (!body.month_year || !body.contribution_amount) {
    return errorResponse('Month and contribution amount are required');
  }

  try {
    // Close any existing active months
    await db.prepare("UPDATE mess_months SET status = 'closed', closed_at = datetime('now') WHERE status = 'active'").run();

    // Create new month
    const result = await db
      .prepare("INSERT INTO mess_months (month_year, contribution_amount, status) VALUES (?, ?, 'active')")
      .bind(body.month_year, body.contribution_amount)
      .run();

    const monthId = result.meta.last_row_id;

    // Add all active members to this month
    const activeMembers = await db.prepare("SELECT id FROM members WHERE status = 'active'").all();
    
    for (const member of activeMembers.results) {
      await db
        .prepare('INSERT INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)')
        .bind(monthId, (member as any).id, body.contribution_amount)
        .run();
    }

    await logActivity(
      db, 'admin', auth.user_id,
      `Started new month: ${body.month_year} with AED ${body.contribution_amount}/person`,
      'start_month', `${activeMembers.results.length} members added`,
      monthId as number, 'month'
    );

    return json({ success: true, data: { id: monthId } }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return errorResponse('Month already exists');
    }
    return errorResponse('Failed to create month');
  }
};
