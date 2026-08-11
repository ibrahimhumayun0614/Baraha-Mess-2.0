// ============================================
// POST /api/auth/logout — Clear session
// ============================================
import { json, getToken } from '../_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getToken(request);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  return json({ success: true });
};
