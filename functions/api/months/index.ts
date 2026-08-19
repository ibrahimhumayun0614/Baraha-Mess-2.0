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

// POST /api/months — Start or reactivate month
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const body = await request.json() as { month_year: string; contribution_amount: number };

  if (!body.month_year || body.contribution_amount === undefined || body.contribution_amount === null || isNaN(Number(body.contribution_amount))) {
    return errorResponse('Month and a valid contribution amount are required');
  }

  const contributionAmount = Number(body.contribution_amount);
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // If trying to create a past month that is already completed
  if (body.month_year < currentMonthYear) {
    const existingPast = await db
      .prepare('SELECT id, status FROM mess_months WHERE month_year = ?')
      .bind(body.month_year)
      .first<{ id: number; status: string }>();

    if (existingPast) {
      return errorResponse('Cannot create or restart a completed past month', 400);
    }
  }

  try {
    const previousActive = await db
      .prepare("SELECT id FROM mess_months WHERE status = 'active' ORDER BY id DESC LIMIT 1")
      .first<{ id: number }>();

    // Check if this month already exists
    const existingMonth = await db
      .prepare('SELECT id, month_year, status FROM mess_months WHERE month_year = ?')
      .bind(body.month_year)
      .first<{ id: number; month_year: string; status: string }>();

    // Close any other active months
    await db.prepare("UPDATE mess_months SET status = 'closed', closed_at = datetime('now') WHERE status = 'active'").run();

    let monthId: number;

    if (existingMonth) {
      // Ongoing or future month already exists -> Reactivate and update
      monthId = existingMonth.id;
      await db
        .prepare("UPDATE mess_months SET status = 'active', closed_at = NULL, contribution_amount = ? WHERE id = ?")
        .bind(contributionAmount, monthId)
        .run();
    } else {
      // Create new month
      const result = await db
        .prepare("INSERT INTO mess_months (month_year, contribution_amount, status) VALUES (?, ?, 'active')")
        .bind(body.month_year, contributionAmount)
        .run();

      monthId = result.meta.last_row_id as number;
    }

    // Add all active members to this month if they aren't already enrolled
    const activeMembers = await db.prepare("SELECT id FROM members WHERE status = 'active'").all();
    
    for (const member of activeMembers.results) {
      await db
        .prepare('INSERT OR IGNORE INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)')
        .bind(monthId, (member as any).id, contributionAmount)
        .run();
    }

    // Update contribution amount for members who haven't paid yet
    await db
      .prepare('UPDATE month_members SET contribution_amount = ? WHERE month_id = ? AND amount_paid = 0')
      .bind(contributionAmount, monthId)
      .run();

    await logActivity(
      db, 'admin', auth.user_id,
      `Started/Reactivated month: ${body.month_year} with AED ${contributionAmount}/person`,
      'start_month', `${activeMembers.results.length} members enrolled`,
      monthId, 'month',
      {
        month_id: monthId,
        previous_active_id: previousActive && previousActive.id !== monthId ? previousActive.id : null,
        created: !existingMonth,
        month_year: body.month_year,
        contribution_amount: contributionAmount,
      }
    );

    return json({ success: true, data: { id: monthId } }, 201);
  } catch (err: any) {
    return errorResponse(err?.message || 'Failed to create month', 500);
  }
};
