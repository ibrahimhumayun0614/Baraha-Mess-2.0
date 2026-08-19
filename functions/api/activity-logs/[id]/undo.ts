// ============================================
// POST /api/activity-logs/:id/undo
// ============================================
import { json, errorResponse, authenticate } from '../../_shared';
import { undoActivityLog } from '../../_undo';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const id = Number(params.id);
  if (!id) return errorResponse('Invalid log id', 400);

  let log: {
    id: number;
    action: string;
    action_type: string;
    details: string | null;
    reference_id: number | null;
    payload: string | null;
    undone_at: string | null;
  } | null = null;

  try {
    log = await db
      .prepare('SELECT id, action, action_type, details, reference_id, payload, undone_at FROM activity_logs WHERE id = ?')
      .bind(id)
      .first();
  } catch {
    log = await db
      .prepare('SELECT id, action, action_type, details, reference_id FROM activity_logs WHERE id = ?')
      .bind(id)
      .first();
    if (log) {
      log.payload = null;
      log.undone_at = null;
    }
  }

  if (!log) return errorResponse('Activity log not found', 404);

  const result = await undoActivityLog(db, log, auth.user_id);
  if (!result.success) {
    return errorResponse(result.error, result.status || 400);
  }

  return json({ success: true, message: result.message });
};
