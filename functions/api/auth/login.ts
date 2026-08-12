// ============================================
// POST /api/auth/login — Admin or Member login
// ============================================
import { json, errorResponse, generateToken, logActivity } from '../_shared';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const body = await request.json() as { type: string; password?: string; member_id?: number };

  if (body.type === 'admin') {
    if (!body.password) {
      return errorResponse('Password is required');
    }

    if (!env.ADMIN_PASSWORD) {
      return errorResponse('Admin password is not configured on the server', 500);
    }

    if (body.password !== env.ADMIN_PASSWORD) {
      return errorResponse('Invalid password', 401);
    }

    // Ensure admin row exists for sessions / activity logs
    let admin = await db
      .prepare('SELECT id, username FROM admins WHERE username = ?')
      .bind('admin')
      .first<{ id: number; username: string }>();

    if (!admin) {
      await db
        .prepare("INSERT INTO admins (username, password_hash) VALUES ('admin', 'env')")
        .run();
      admin = await db
        .prepare('SELECT id, username FROM admins WHERE username = ?')
        .bind('admin')
        .first<{ id: number; username: string }>();
    }

    if (!admin) {
      return errorResponse('Failed to initialize admin account', 500);
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    await db
      .prepare('INSERT INTO sessions (token, user_type, user_id, expires_at) VALUES (?, ?, ?, ?)')
      .bind(token, 'admin', admin.id, expiresAt)
      .run();

    await logActivity(db, 'admin', admin.id, 'Admin logged in', 'login');

    return json({
      success: true,
      data: {
        user: { id: admin.id, type: 'admin', name: 'Admin' },
        token,
      },
    });
  } else if (body.type === 'member') {
    // Member access by ID
    if (!body.member_id) {
      return errorResponse('Please select a member');
    }

    const member = await db
      .prepare("SELECT * FROM members WHERE id = ? AND status = 'active'")
      .bind(body.member_id)
      .first<{ id: number; name: string; member_id: string }>();

    if (!member) {
      return errorResponse('Member not found', 404);
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12 hours

    await db
      .prepare('INSERT INTO sessions (token, user_type, user_id, expires_at) VALUES (?, ?, ?, ?)')
      .bind(token, 'member', member.id, expiresAt)
      .run();

    await logActivity(db, 'member', member.id, `${member.name} accessed their dashboard`, 'member_access');

    return json({
      success: true,
      data: {
        user: { id: member.id, type: 'member', name: member.name, member_id: member.member_id },
        token,
      },
    });
  }

  return errorResponse('Invalid login type');
};
