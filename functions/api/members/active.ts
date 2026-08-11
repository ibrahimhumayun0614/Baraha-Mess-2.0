// ============================================
// /api/members/active — GET active members (public for login dropdown)
// ============================================
import { json } from '../_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const members = await env.DB
    .prepare("SELECT id, name, member_id FROM members WHERE status = 'active' ORDER BY name ASC")
    .all();
  return json({ success: true, data: members.results });
};
