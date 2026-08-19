// ============================================
// /api/activity-logs — GET logs with filters
// ============================================
import { json, errorResponse, authenticate, getSearchParams } from '../_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const params = getSearchParams(request);
  const search = params.get('search') || '';
  const actionType = params.get('action_type') || '';
  const actorType = params.get('actor_type') || '';
  const exportAll = params.get('export') === '1';
  const page = Math.max(1, parseInt(params.get('page') || '1') || 1);
  const limit = exportAll
    ? 10000
    : Math.min(100, Math.max(1, parseInt(params.get('limit') || '30') || 30));
  const offset = exportAll ? 0 : (page - 1) * limit;

  let where = 'WHERE 1=1';
  const binds: any[] = [];

  if (search) {
    where += ' AND (al.action LIKE ? OR al.details LIKE ?)';
    binds.push(`%${search}%`, `%${search}%`);
  }

  if (actionType) {
    where += ' AND al.action_type = ?';
    binds.push(actionType);
  }

  if (actorType) {
    where += ' AND al.actor_type = ?';
    binds.push(actorType);
  }

  // Count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM activity_logs al ${where}`)
    .bind(...binds)
    .first<{ total: number }>();

  // Fetch with actor names
  const results = await db
    .prepare(`
      SELECT al.*,
        CASE 
          WHEN al.actor_type = 'admin' THEN 'Admin'
          ELSE COALESCE(m.name, 'Unknown')
        END as actor_name
      FROM activity_logs al
      LEFT JOIN members m ON al.actor_type = 'member' AND al.actor_id = m.id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(...binds, limit, offset)
    .all();

  return json({
    success: true,
    data: results.results,
    total: countResult?.total || 0,
  });
};
