// ============================================
// POST /api/auth/change-password — Admin password change
// ============================================
import { json, errorResponse, authenticate, hashPassword, verifyPassword, logActivity } from '../_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = env.DB;
    if (!db) {
      return errorResponse('Database binding (DB) is missing', 500);
    }

    const auth = await authenticate(request, db);

    if (!auth || auth.user_type !== 'admin') {
      return errorResponse('Unauthorized: Admin access required', 401);
    }

    const body = await request.json() as { current_password?: string; new_password?: string };

    if (!body.current_password || !body.new_password) {
      return errorResponse('Current password and new password are required', 400);
    }

    if (body.new_password.length < 4) {
      return errorResponse('New password must be at least 4 characters long', 400);
    }

    const admin = await db
      .prepare('SELECT id, password_hash FROM admins WHERE id = ?')
      .bind(auth.user_id)
      .first<{ id: number; password_hash: string }>();

    if (!admin) {
      return errorResponse('Admin account not found', 404);
    }

    const isValidCurrent = await verifyPassword(body.current_password, admin.password_hash);
    if (!isValidCurrent) {
      return errorResponse('Current password is incorrect', 400);
    }

    const newHash = await hashPassword(body.new_password);

    await db
      .prepare('UPDATE admins SET password_hash = ? WHERE id = ?')
      .bind(newHash, admin.id)
      .run();

    await logActivity(db, 'admin', admin.id, 'Admin changed password', 'password_change');

    return json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Failed to change password', 500);
  }
};

