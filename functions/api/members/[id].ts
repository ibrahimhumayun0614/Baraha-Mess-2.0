// ============================================
// /api/members/[id] — GET, PUT, DELETE single member
// ============================================
import { json, errorResponse, authenticate, logActivity, paymentStatusFromAmounts } from '../_shared';

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
  const body = await request.json() as {
    name?: string;
    member_id?: string;
    phone?: string;
    email?: string;
    status?: string;
    contribution_amount?: number;
    monthly_amount?: number;
  };

  const member = await db.prepare('SELECT * FROM members WHERE id = ?').bind(id).first();
  if (!member) return errorResponse('Member not found', 404);

  try {
    await db
      .prepare("UPDATE members SET name = ?, member_id = ?, phone = ?, email = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(
        body.name || (member as any).name,
        body.member_id || (member as any).member_id,
        body.phone !== undefined ? body.phone : (member as any).phone,
        body.email !== undefined ? body.email : (member as any).email,
        id
      )
      .run();

    // Update contribution amount in active month if provided
    const newContribution = body.contribution_amount !== undefined
      ? Number(body.contribution_amount)
      : (body.monthly_amount !== undefined ? Number(body.monthly_amount) : undefined);

    if (newContribution !== undefined && !isNaN(newContribution)) {
      const activeMonth = await db
        .prepare("SELECT id FROM mess_months WHERE status = 'active' ORDER BY id DESC LIMIT 1")
        .first<{ id: number }>();

      if (activeMonth) {
        const mm = await db
          .prepare("SELECT id, amount_paid FROM month_members WHERE month_id = ? AND member_id = ?")
          .bind(activeMonth.id, id)
          .first<{ id: number; amount_paid: number }>();

        if (mm) {
          const paid = mm.amount_paid || 0;
          const newStatus = paymentStatusFromAmounts(paid, newContribution);
          await db
            .prepare("UPDATE month_members SET contribution_amount = ?, payment_status = ? WHERE id = ?")
            .bind(newContribution, newStatus, mm.id)
            .run();
        } else {
          await db
            .prepare("INSERT INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)")
            .bind(activeMonth.id, id, newContribution)
            .run();
        }
      }
    }

    await logActivity(db, 'admin', auth.user_id, `Updated member "${body.name || (member as any).name}"`, 'edit_member', '', Number(id), 'member');

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
