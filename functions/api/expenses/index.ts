// ============================================
// /api/expenses — GET all (with filters), POST create
// ============================================
import { json, errorResponse, authenticate, logActivity, getActiveMonth, getSearchParams } from '../_shared';

interface Env {
  DB: D1Database;
}

// GET /api/expenses — List with filters
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth) return errorResponse('Unauthorized', 401);

  const params = getSearchParams(request);
  const search = params.get('search') || '';
  const categoryId = params.get('category_id') || '';
  const createdBy = params.get('created_by') || '';
  const dateFrom = params.get('date_from') || '';
  const dateTo = params.get('date_to') || '';
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '20');
  const sortBy = params.get('sort_by') || 'date';
  const sortOrder = params.get('sort_order') || 'desc';
  const mine = params.get('mine') === 'true';
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const binds: any[] = [];

  // If member, only show their expenses (or if mine=true)
  if (auth.user_type === 'member' || mine) {
    where += ' AND e.created_by = ?';
    binds.push(auth.user_id);
  } else if (createdBy) {
    where += ' AND e.created_by = ?';
    binds.push(parseInt(createdBy));
  }

  if (search) {
    where += ' AND (e.description LIKE ? OR m.name LIKE ?)';
    binds.push(`%${search}%`, `%${search}%`);
  }

  if (categoryId) {
    where += ' AND e.category_id = ?';
    binds.push(parseInt(categoryId));
  }

  if (dateFrom) {
    where += ' AND e.date >= ?';
    binds.push(dateFrom);
  }

  if (dateTo) {
    where += ' AND e.date <= ?';
    binds.push(dateTo);
  }

  // Get active month expenses by default
  const activeMonth = await getActiveMonth(db);
  if (activeMonth) {
    where += ' AND e.month_id = ?';
    binds.push(activeMonth.id);
  }

  // Validate sort column
  const validSortColumns: Record<string, string> = {
    date: 'e.date',
    amount: 'e.amount',
    created_at: 'e.created_at',
  };
  const sortColumn = validSortColumns[sortBy] || 'e.date';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Count total
  const countQuery = `
    SELECT COUNT(*) as total
    FROM expenses e
    LEFT JOIN members m ON e.created_by = m.id
    ${where}
  `;
  const countResult = await db.prepare(countQuery).bind(...binds).first<{ total: number }>();

  // Fetch data
  const dataQuery = `
    SELECT e.*, 
      c.name as category_name, c.icon as category_icon,
      m.name as creator_name
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    LEFT JOIN members m ON e.created_by = m.id
    ${where}
    ORDER BY ${sortColumn} ${order}
    LIMIT ? OFFSET ?
  `;
  const results = await db.prepare(dataQuery).bind(...binds, limit, offset).all();

  return json({
    success: true,
    data: results.results,
    total: countResult?.total || 0,
  });
};

// POST /api/expenses — Create expense
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth) return errorResponse('Unauthorized', 401);

  const body = await request.json() as {
    amount: number;
    date: string;
    description: string;
    category_id: number | null;
  };

  if (!body.amount || !body.date) {
    return errorResponse('Amount and date are required');
  }

  // Get active month
  const activeMonth = await getActiveMonth(db);
  if (!activeMonth) {
    return errorResponse('No active month. Ask admin to start a new month.');
  }

  // For members, created_by is themselves. Admin can also create expenses.
  const createdBy = auth.user_type === 'member' ? auth.user_id : auth.user_id;

  // If admin, we need to figure out which member — for now, admin creates as system
  // But for this app, let's use auth.user_id for both

  try {
    const result = await db
      .prepare(
        'INSERT INTO expenses (month_id, created_by, amount, date, description, category_id) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(activeMonth.id, createdBy, body.amount, body.date, body.description || '', body.category_id)
      .run();

    await logActivity(
      db, auth.user_type, auth.user_id,
      `${auth.user_name} added expense: AED ${body.amount}`,
      'create_expense',
      body.description || '',
      result.meta.last_row_id as number,
      'expense'
    );

    return json({ success: true, data: { id: result.meta.last_row_id } }, 201);
  } catch {
    return errorResponse('Failed to create expense');
  }
};
