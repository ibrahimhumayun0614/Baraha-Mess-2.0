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

  const body = await request.json() as {
    name: string;
    member_id?: string;
    phone?: string;
    email?: string;
    contribution_amount?: number;
    monthly_amount?: number;
  };

  if (!body.name) {
    return errorResponse('Name is required');
  }

  const existingIds = await db.prepare('SELECT member_id FROM members').all<{ member_id: string }>();
  let max = 0;
  let width = 3;
  for (const row of existingIds.results || []) {
    const digits = (row.member_id || '').replace(/\D/g, '');
    if (!digits) continue;
    const n = parseInt(digits, 10);
    if (!Number.isNaN(n) && n > max) {
      max = n;
      width = Math.max(width, digits.length);
    }
  }
  const memberCode = (body.member_id && body.member_id.trim())
    ? body.member_id.trim()
    : String(max + 1).padStart(width, '0');

  try {
    const result = await db
      .prepare('INSERT INTO members (name, member_id, phone, email) VALUES (?, ?, ?, ?)')
      .bind(body.name, memberCode, body.phone || '', body.email || '')
      .run();

    // Auto-add to active month if exists with custom or default contribution amount
    const activeMonth = await db
      .prepare("SELECT id, contribution_amount FROM mess_months WHERE status = 'active' ORDER BY id DESC LIMIT 1")
      .first<{ id: number; contribution_amount: number }>();

    const memberContribution = (body.contribution_amount !== undefined && !isNaN(Number(body.contribution_amount)))
      ? Number(body.contribution_amount)
      : ((body.monthly_amount !== undefined && !isNaN(Number(body.monthly_amount)))
        ? Number(body.monthly_amount)
        : (activeMonth?.contribution_amount ?? 500));

    if (activeMonth && result.meta.last_row_id) {
      await db
        .prepare('INSERT OR IGNORE INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)')
        .bind(activeMonth.id, result.meta.last_row_id, memberContribution)
        .run();
    }

    const newId = result.meta.last_row_id as number;

    await logActivity(db, 'admin', auth.user_id, `Created member "${body.name}" with contribution AED ${memberContribution}`, 'create_member', memberCode, newId, 'member', {
      id: newId,
      name: body.name,
      member_id: memberCode,
      contribution_amount: memberContribution,
    });

    return json({ success: true, data: { id: newId } }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return errorResponse('Member ID already exists');
    }
    return errorResponse('Failed to create member');
  }
};
