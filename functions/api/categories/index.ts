// ============================================
// /api/categories — GET all expense categories
// ============================================
import { json } from '../_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const categories = await env.DB.prepare('SELECT * FROM expense_categories ORDER BY name ASC').all();
  return json({ success: true, data: categories.results });
};
