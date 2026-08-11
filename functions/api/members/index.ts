// ============================================
// /api/members — GET all, POST create
// ============================================
import { json, errorResponse, authenticate, logActivity } from '../_shared';

interface Env {
  DB: D1Database;
}

// GET /api/members — List all members
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth) return errorResponse('Unauthorized', 401);

  const members = await db.prepare('SELECT * FROM members ORDER BY name ASC').all();
  return json({ success: true, data: members.results });
};

// POST /api/members — Create new member
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const body = await request.json() as { name: string; member_id: string; phone?: string; email?: string };

  if (!body.name || !body.member_id) {
    return errorResponse('Name and Member ID are required');
  }

  try {
    const result = await db
      .prepare('INSERT INTO members (name, member_id, phone, email) VALUES (?, ?, ?, ?)')
      .bind(body.name, body.member_id, body.phone || '', body.email || '')
      .run();

    // Auto-add to active month if exists
    const activeMonth = await db
      .prepare("SELECT id, contribution_amount FROM mess_months WHERE status = 'active' ORDER BY id DESC LIMIT 1")
      .first<{ id: number; contribution_amount: number }>();

    if (activeMonth && result.meta.last_row_id) {
      await db
        .prepare('INSERT OR IGNORE INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)')
        .bind(activeMonth.id, result.meta.last_row_id, activeMonth.contribution_amount)
        .run();
    }

    await logActivity(db, 'admin', auth.user_id, `Created member "${body.name}"`, 'create_member', body.member_id, result.meta.last_row_id as number, 'member');

    return json({ success: true, data: { id: result.meta.last_row_id } }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return errorResponse('Member ID already exists');
    }
    return errorResponse('Failed to create member');
  }
};
