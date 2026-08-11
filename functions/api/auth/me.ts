// ============================================
// GET /api/auth/me — Get current session user
// ============================================
import { json, errorResponse, authenticate } from '../_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await authenticate(request, env.DB);
  if (!auth) {
    return errorResponse('Unauthorized', 401);
  }

  return json({
    success: true,
    data: {
      id: auth.user_id,
      type: auth.user_type,
      name: auth.user_name,
    },
  });
};
