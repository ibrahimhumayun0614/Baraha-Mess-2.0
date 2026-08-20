// ============================================
// Shared utilities for Cloudflare Pages Functions
// ============================================

interface Env {
  DB: D1Database;
}

// Simple token generation
export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// JSON response helper
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Error response helper
export function errorResponse(message: string, status = 400): Response {
  return json({ success: false, error: message }, status);
}

// Parse authorization token from request
export function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

// Authenticate request — returns session info or null
export async function authenticate(request: Request, db: D1Database): Promise<{
  user_type: 'admin' | 'member';
  user_id: number;
  user_name: string;
} | null> {
  await ensureAuthTables(db);
  const token = getToken(request);
  if (!token) return null;

  const session = await db
    .prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')")
    .bind(token)
    .first<{ user_type: string; user_id: number }>();

  if (!session) return null;

  let userName = 'Admin';
  if (session.user_type === 'member') {
    const member = await db.prepare('SELECT name FROM members WHERE id = ?').bind(session.user_id).first<{ name: string }>();
    userName = member?.name || 'Member';
  }

  return {
    user_type: session.user_type as 'admin' | 'member',
    user_id: session.user_id,
    user_name: userName,
  };
}

// Log an activity
export async function logActivity(
  db: D1Database,
  actorType: string,
  actorId: number,
  action: string,
  actionType: string,
  details = '',
  referenceId: number | null = null,
  referenceType: string | null = null,
  payload: unknown = null
): Promise<void> {
  const payloadJson = payload == null ? null : JSON.stringify(payload);
  try {
    await db
      .prepare(
        'INSERT INTO activity_logs (actor_type, actor_id, action, action_type, details, reference_id, reference_type, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(actorType, actorId, action, actionType, details, referenceId, referenceType, payloadJson)
      .run();
  } catch {
    await db
      .prepare(
        'INSERT INTO activity_logs (actor_type, actor_id, action, action_type, details, reference_id, reference_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(actorType, actorId, action, actionType, details, referenceId, referenceType)
      .run();
  }
}

// Get active month
export async function getActiveMonth(db: D1Database): Promise<{ id: number; month_year: string; contribution_amount: number } | null> {
  return await db
    .prepare("SELECT id, month_year, contribution_amount FROM mess_months WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    .first();
}

// Parse URL search params
export function getSearchParams(request: Request): URLSearchParams {
  const url = new URL(request.url);
  return url.searchParams;
}

/** Recalculate this-month paid totals from actual payment rows. */
export async function syncPaidFromPayments(db: D1Database, monthId?: number): Promise<void> {
  try {
    if (monthId) {
      await db
        .prepare(`
          UPDATE month_members
          SET amount_paid = COALESCE((
            SELECT SUM(p.amount) FROM payments p WHERE p.month_member_id = month_members.id
          ), 0)
          WHERE month_id = ?
        `)
        .bind(monthId)
        .run();

      await db
        .prepare(`
          UPDATE month_members
          SET payment_status = CASE
            WHEN COALESCE(amount_paid, 0) <= 0 THEN 'unpaid'
            WHEN amount_paid >= contribution_amount THEN 'paid'
            ELSE 'partial'
          END
          WHERE month_id = ?
        `)
        .bind(monthId)
        .run();
    } else {
      await db
        .prepare(`
          UPDATE month_members
          SET amount_paid = COALESCE((
            SELECT SUM(p.amount) FROM payments p WHERE p.month_member_id = month_members.id
          ), 0)
        `)
        .run();

      await db.prepare(`
        UPDATE month_members
        SET payment_status = CASE
          WHEN COALESCE(amount_paid, 0) <= 0 THEN 'unpaid'
          WHEN amount_paid >= contribution_amount THEN 'paid'
          ELSE 'partial'
        END
      `).run();
    }
  } catch {
    // Tables may not exist yet
  }
}

/** Paid amount 0 is always unpaid, even if contribution is 0. */
export function paymentStatusFromAmounts(paid: number, contribution: number): 'paid' | 'partial' | 'unpaid' {
  if (!paid || paid <= 0) return 'unpaid';
  if (paid >= contribution) return 'paid';
  return 'partial';
}

/** Shared SELECT for expense rows: Paid By, Added By, Period */
export const EXPENSE_SELECT = `
  SELECT e.*,
    c.name as category_name, c.icon as category_icon,
    m.name as creator_name,
    mm.month_year,
    mm.status as month_status,
    CASE
      WHEN COALESCE(e.added_by_type, 'member') = 'admin' THEN 'Admin'
      ELSE COALESCE(adder.name, m.name)
    END as added_by_name
  FROM expenses e
  LEFT JOIN expense_categories c ON e.category_id = c.id
  LEFT JOIN members m ON e.created_by = m.id
  LEFT JOIN mess_months mm ON e.month_id = mm.id
  LEFT JOIN members adder
    ON COALESCE(e.added_by_type, 'member') = 'member'
    AND COALESCE(e.added_by_id, e.created_by) = adder.id
`;

/** Fallback when added_by columns are not on the database yet */
export const EXPENSE_SELECT_FALLBACK = `
  SELECT e.*,
    c.name as category_name, c.icon as category_icon,
    m.name as creator_name,
    m.name as added_by_name,
    mm.month_year,
    mm.status as month_status
  FROM expenses e
  LEFT JOIN expense_categories c ON e.category_id = c.id
  LEFT JOIN members m ON e.created_by = m.id
  LEFT JOIN mess_months mm ON e.month_id = mm.id
`;

// Password hashing helper using Web Crypto API (Salted SHA-256)
export async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const encoder = new TextEncoder();
  const saltBytes = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));

  const saltHexStr = saltHex || bytesToHex(saltBytes);
  const data = encoder.encode(`${saltHexStr}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = bytesToHex(new Uint8Array(hashBuffer));

  return `${saltHexStr}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [saltHex] = parts;
  const computedHash = await hashPassword(password, saltHex);
  return computedHash === storedHash;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Ensure essential tables exist automatically if schema hasn't been executed
export async function ensureAuthTables(db: D1Database): Promise<void> {
  try {
    const check = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'").first();
    if (check) {
      return;
    }
  } catch {
    // Continue to create tables if check fails
  }

  try {
    await db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          member_id TEXT NOT NULL UNIQUE,
          phone TEXT DEFAULT '',
          email TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS mess_months (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          month_year TEXT NOT NULL UNIQUE,
          contribution_amount REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          closed_at TEXT
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS month_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          month_id INTEGER NOT NULL,
          member_id INTEGER NOT NULL,
          contribution_amount REAL NOT NULL DEFAULT 0,
          payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('paid', 'unpaid', 'partial')),
          amount_paid REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (month_id) REFERENCES mess_months(id) ON DELETE CASCADE,
          FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
          UNIQUE(month_id, member_id)
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          month_member_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          payment_date TEXT NOT NULL DEFAULT (date('now')),
          notes TEXT DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (month_member_id) REFERENCES month_members(id) ON DELETE CASCADE
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS expense_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          icon TEXT DEFAULT 'tag'
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          month_id INTEGER NOT NULL,
          created_by INTEGER NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL DEFAULT (date('now')),
          description TEXT DEFAULT '',
          category_id INTEGER,
          added_by_type TEXT NOT NULL DEFAULT 'member' CHECK(added_by_type IN ('admin', 'member')),
          added_by_id INTEGER,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (month_id) REFERENCES mess_months(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          actor_type TEXT NOT NULL CHECK(actor_type IN ('admin', 'member')),
          actor_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          action_type TEXT NOT NULL,
          details TEXT DEFAULT '',
          reference_id INTEGER,
          reference_type TEXT,
          payload TEXT,
          undone_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT NOT NULL UNIQUE,
          user_type TEXT NOT NULL CHECK(user_type IN ('admin', 'member')),
          user_id INTEGER NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Groceries', 'shopping-cart')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Vegetables', 'carrot')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Meat', 'beef')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Rice', 'wheat')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Gas', 'flame')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Utilities', 'zap')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Fruits', 'apple')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Dairy', 'milk')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Spices', 'pepper')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Cleaning', 'sparkles')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Water', 'droplets')"),
      db.prepare("INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Other', 'tag')"),
    ]);
  } catch (e) {
    // Ignore error if tables already exist
  }

  // Existing DBs created before Paid By / Added By tracking
  try {
    await db.prepare("ALTER TABLE expenses ADD COLUMN added_by_type TEXT DEFAULT 'member'").run();
  } catch {
    // Column already exists
  }
  try {
    await db.prepare('ALTER TABLE expenses ADD COLUMN added_by_id INTEGER').run();
  } catch {
    // Column already exists
  }

  try {
    await db.prepare('ALTER TABLE activity_logs ADD COLUMN payload TEXT').run();
  } catch {
    // Column already exists
  }
  try {
    await db.prepare('ALTER TABLE activity_logs ADD COLUMN undone_at TEXT').run();
  } catch {
    // Column already exists
  }
}
