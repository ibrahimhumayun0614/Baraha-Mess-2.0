// ============================================
// /api/members/[id] — GET, PUT, DELETE single member
// ============================================
import { json, errorResponse, authenticate, logActivity } from '../_shared';

interface Env {
  DB: D1Database;
}

// GET /api/members/:id
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth) return errorResponse('Unauthorized', 401);

  const id = params.id;
  const member = await db.prepare('SELECT * FROM members WHERE id = ?').bind(id).first();
  if (!member) return errorResponse('Member not found', 404);

  return json({ success: true, data: member });
};

// PUT /api/members/:id
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const id = params.id;
  const body = await request.json() as { name?: string; member_id?: string; phone?: string; email?: string; status?: string };

  const member = await db.prepare('SELECT * FROM members WHERE id = ?').bind(id).first();
  if (!member) return errorResponse('Member not found', 404);

  try {
    await db
      .prepare("UPDATE members SET name = ?, member_id = ?, phone = ?, email = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(
        body.name || member.name,
        body.member_id || member.member_id,
        body.phone !== undefined ? body.phone : member.phone,
        body.email !== undefined ? body.email : member.email,
        id
      )
      .run();

    await logActivity(db, 'admin', auth.user_id, `Updated member "${body.name || member.name}"`, 'edit_member', '', Number(id), 'member');

    return json({ success: true });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return errorResponse('Member ID already exists');
    }
    return errorResponse('Failed to update member');
  }
};

// DELETE /api/members/:id — Deactivate
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const id = params.id;
  const member = await db.prepare('SELECT name FROM members WHERE id = ?').bind(id).first<{ name: string }>();
  if (!member) return errorResponse('Member not found', 404);

  await db.prepare("UPDATE members SET status = 'inactive', updated_at = datetime('now') WHERE id = ?").bind(id).run();

  await logActivity(db, 'admin', auth.user_id, `Deactivated member "${member.name}"`, 'deactivate_member', '', Number(id), 'member');

  return json({ success: true });
};
