// ============================================
// /api/expenses — GET all (with filters), POST create
// ============================================
import { json, errorResponse, authenticate, logActivity, getActiveMonth, getSearchParams, EXPENSE_SELECT, EXPENSE_SELECT_FALLBACK } from '../_shared';

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
  const monthId = params.get('month_id') || '';
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

  // Filter by selected month, otherwise default to active month
  if (monthId === 'all') {
    // no month filter
  } else if (monthId) {
    where += ' AND e.month_id = ?';
    binds.push(parseInt(monthId));
  } else {
    const activeMonth = await getActiveMonth(db);
    if (activeMonth) {
      where += ' AND e.month_id = ?';
      binds.push(activeMonth.id);
    }
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

  const fetchRows = async (selectSql: string) =>
    db.prepare(`
      ${selectSql}
      ${where}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?
    `).bind(...binds, limit, offset).all();

  let results;
  try {
    results = await fetchRows(EXPENSE_SELECT);
  } catch {
    results = await fetchRows(EXPENSE_SELECT_FALLBACK);
  }

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
    created_by?: number;
  };

  if (!body.amount || !body.date) {
    return errorResponse('Amount and date are required');
  }

  // Get active month
  const activeMonth = await getActiveMonth(db);
  if (!activeMonth) {
    return errorResponse('No active month. Ask admin to start a new month.');
  }

  // Members always create as themselves; admin can assign to any member
  let createdBy = auth.user_id;
  if (auth.user_type === 'admin') {
    if (!body.created_by) {
      return errorResponse('Please select a member for this expense');
    }
    const member = await db
      .prepare("SELECT id, name FROM members WHERE id = ? AND status = 'active'")
      .bind(body.created_by)
      .first<{ id: number; name: string }>();
    if (!member) {
      return errorResponse('Selected member not found or inactive');
    }
    createdBy = member.id;
  } else {
    createdBy = auth.user_id;
  }

  try {
    let result;
    try {
      result = await db
        .prepare(
          'INSERT INTO expenses (month_id, created_by, amount, date, description, category_id, added_by_type, added_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          activeMonth.id,
          createdBy,
          body.amount,
          body.date,
          body.description || '',
          body.category_id,
          auth.user_type,
          auth.user_id
        )
        .run();
    } catch {
      result = await db
        .prepare(
          'INSERT INTO expenses (month_id, created_by, amount, date, description, category_id) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(activeMonth.id, createdBy, body.amount, body.date, body.description || '', body.category_id)
        .run();
    }

    const forMember =
      auth.user_type === 'admin' && body.created_by
        ? ` for member #${body.created_by}`
        : '';

    await logActivity(
      db, auth.user_type, auth.user_id,
      `${auth.user_name} added expense: AED ${body.amount}${forMember}`,
      'create_expense',
      body.description || '',
      result.meta.last_row_id as number,
      'expense',
      {
        id: result.meta.last_row_id,
        month_id: activeMonth.id,
        created_by: createdBy,
        amount: body.amount,
        date: body.date,
        description: body.description || '',
        category_id: body.category_id ?? null,
      }
    );

    return json({ success: true, data: { id: result.meta.last_row_id } }, 201);
  } catch {
    return errorResponse('Failed to create expense');
  }
};
