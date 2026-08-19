// ============================================
// POST /api/members/restore-history — rebuild expenses from logs
// ============================================
import { json, errorResponse, authenticate, logActivity } from '../_shared';
import { rebuildHistoryFromLogs } from '../_undo';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  let memberId: number | undefined;
  try {
    const body = await request.json() as { member_id?: number };
    memberId = body?.member_id ? Number(body.member_id) : undefined;
  } catch {
    memberId = undefined;
  }

  const members = memberId
    ? await db.prepare('SELECT id, name FROM members WHERE id = ?').bind(memberId).all<{ id: number; name: string }>()
    : await db.prepare('SELECT id, name FROM members').all<{ id: number; name: string }>();

  if (!members.results?.length) return errorResponse('Member not found', 404);

  let expenses = 0;
  for (const member of members.results) {
    const history = await rebuildHistoryFromLogs(db, member.id, member.name);
    expenses += history.expenses;
  }

  if (expenses > 0) {
    await logActivity(
      db, 'admin', auth.user_id,
      `Restored ${expenses} expense(s) from activity logs`,
      'restore_history',
      memberId ? `member #${memberId}` : 'all members'
    );
  }

  return json({ success: true, data: { restored_expenses: expenses } });
};
