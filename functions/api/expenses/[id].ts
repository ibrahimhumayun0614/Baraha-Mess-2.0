// ============================================
// /api/expenses/[id] — GET, PUT, DELETE single expense
// ============================================
import { json, errorResponse, authenticate, logActivity } from '../_shared';

interface Env {
  DB: D1Database;
}

// GET /api/expenses/:id
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth) return errorResponse('Unauthorized', 401);

  const expense = await db
    .prepare(`
      SELECT e.*, c.name as category_name, m.name as creator_name
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      LEFT JOIN members m ON e.created_by = m.id
      WHERE e.id = ?
    `)
    .bind(params.id)
    .first();

  if (!expense) return errorResponse('Expense not found', 404);

  // Members can only view their own
  if (auth.user_type === 'member' && (expense as any).created_by !== auth.user_id) {
    return errorResponse('Access denied', 403);
  }

  return json({ success: true, data: expense });
};

// PUT /api/expenses/:id — Update (admin only)
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const id = params.id;
  const body = await request.json() as {
    amount?: number;
    date?: string;
    description?: string;
    category_id?: number | null;
  };

  const expense = await db.prepare('SELECT * FROM expenses WHERE id = ?').bind(id).first();
  if (!expense) return errorResponse('Expense not found', 404);

  await db
    .prepare("UPDATE expenses SET amount = ?, date = ?, description = ?, category_id = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(
      body.amount ?? (expense as any).amount,
      body.date ?? (expense as any).date,
      body.description ?? (expense as any).description,
      body.category_id !== undefined ? body.category_id : (expense as any).category_id,
      id
    )
    .run();

  await logActivity(
    db, 'admin', auth.user_id,
    `Updated expense #${id}`,
    'edit_expense', `Amount: AED ${body.amount ?? (expense as any).amount}`,
    Number(id), 'expense'
  );

  return json({ success: true });
};

// DELETE /api/expenses/:id — Delete (admin only)
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') return errorResponse('Admin access required', 403);

  const id = params.id;
  const expense = await db.prepare('SELECT amount FROM expenses WHERE id = ?').bind(id).first<{ amount: number }>();
  if (!expense) return errorResponse('Expense not found', 404);

  await db.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();

  await logActivity(
    db, 'admin', auth.user_id,
    `Deleted expense #${id} (AED ${expense.amount})`,
    'delete_expense', '',
    Number(id), 'expense'
  );

  return json({ success: true });
};
