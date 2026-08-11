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
  referenceType: string | null = null
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO activity_logs (actor_type, actor_id, action, action_type, details, reference_id, reference_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(actorType, actorId, action, actionType, details, referenceId, referenceType)
    .run();
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
