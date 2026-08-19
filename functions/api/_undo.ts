// ============================================
// Undo an activity log — reverse the original process
// ============================================
import { logActivity, paymentStatusFromAmounts } from './_shared';

type ActivityRow = {
  id: number;
  action: string;
  action_type: string;
  details: string | null;
  reference_id: number | null;
  payload: string | null;
  undone_at: string | null;
};

const NOT_UNDOABLE = new Set(['login', 'member_access', 'password_change', 'undo']);

export function parsePayload(raw: string | null | undefined): Record<string, any> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function logCanUndo(log: {
  action_type: string;
  undone_at?: string | null;
  payload?: string | null;
  has_payload?: number | boolean;
}): boolean {
  if (log.undone_at) return false;
  if (NOT_UNDOABLE.has(log.action_type)) return false;
  const hasPayload = log.has_payload === 1 || log.has_payload === true || !!parsePayload(log.payload || null);
  const needsPayload = new Set(['edit_expense', 'edit_member', 'delete_expense', 'update_contribution']);
  if (needsPayload.has(log.action_type)) return hasPayload;
  return [
    'create_expense',
    'create_member',
    'delete_member',
    'record_payment',
    'close_month',
    'start_month',
    'reopen_month',
  ].includes(log.action_type);
}

async function markUndone(db: D1Database, log: ActivityRow, authUserId: number, summary: string): Promise<void> {
  try {
    await db.prepare("UPDATE activity_logs SET undone_at = datetime('now') WHERE id = ?").bind(log.id).run();
  } catch {
    // Column may be missing on very old DBs
  }
  await logActivity(db, 'admin', authUserId, `Undid: ${summary}`, 'undo', log.action, log.id, 'activity_log');
}

function extractQuotedName(action: string): string | null {
  const match = action.match(/Deleted member ['"](.+)['"]/i);
  return match?.[1]?.trim() || null;
}

function extractAmount(text: string): number | null {
  const match = text.match(/AED\s+([\d.]+)/i);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

async function nextMemberCode(db: D1Database): Promise<string> {
  const existingIds = await db.prepare('SELECT member_id FROM members').all<{ member_id: string }>();
  let max = 0;
  let width = 3;
  for (const row of existingIds.results || []) {
    const digits = (row.member_id || '').replace(/\D/g, '');
    if (!digits) continue;
    const n = parseInt(digits, 10);
    if (!Number.isNaN(n) && n > max) {
      max = n;
      width = Math.max(width, digits.length);
    }
  }
  return String(max + 1).padStart(width, '0');
}

async function insertExpense(db: D1Database, expense: Record<string, any>): Promise<void> {
  const cols = ['id', 'month_id', 'created_by', 'amount', 'date', 'description', 'category_id', 'added_by_type', 'added_by_id', 'created_at'];
  const present = cols.filter((c) => expense[c] !== undefined);
  try {
    await db
      .prepare(`INSERT INTO expenses (${present.join(', ')}) VALUES (${present.map(() => '?').join(', ')})`)
      .bind(...present.map((c) => expense[c]))
      .run();
  } catch {
    const fallback = ['month_id', 'created_by', 'amount', 'date', 'description', 'category_id'].filter((c) => expense[c] !== undefined);
    await db
      .prepare(`INSERT INTO expenses (${fallback.join(', ')}) VALUES (${fallback.map(() => '?').join(', ')})`)
      .bind(...fallback.map((c) => expense[c]))
      .run();
  }
}

function logDate(createdAt: string | null | undefined): string {
  return (createdAt || '').replace('T', ' ').slice(0, 10);
}

async function loadHistoryLogs(db: D1Database): Promise<Array<Record<string, any>>> {
  try {
    const res = await db
      .prepare(`
        SELECT id, action, action_type, details, actor_type, actor_id, reference_id, payload, created_at, undone_at
        FROM activity_logs
        WHERE action_type IN ('create_expense', 'record_payment', 'delete_member', 'create_member', 'edit_member')
        ORDER BY datetime(created_at) ASC, id ASC
      `)
      .all();
    return (res.results || []) as Array<Record<string, any>>;
  } catch {
    const res = await db
      .prepare(`
        SELECT id, action, action_type, details, actor_type, actor_id, reference_id, payload, created_at
        FROM activity_logs
        WHERE action_type IN ('create_expense', 'record_payment', 'delete_member', 'create_member', 'edit_member')
        ORDER BY id ASC
      `)
      .all();
    return (res.results || []) as Array<Record<string, any>>;
  }
}

function nameMatchesLog(action: string, name: string): boolean {
  const quoted = new RegExp(`['"]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'i');
  return quoted.test(action) || action.toLowerCase().includes(`from ${name.toLowerCase()}`);
}

export async function rebuildHistoryFromLogs(
  db: D1Database,
  memberId: number,
  memberName: string,
  oldMemberId?: number | null
): Promise<{ expenses: number; payments: number }> {
  const logs = await loadHistoryLogs(db);
  const name = memberName.trim();
  let previousId = oldMemberId || null;

  if (!previousId) {
    const identityLog = [...logs].reverse().find((log) =>
      ['delete_member', 'create_member', 'edit_member'].includes(log.action_type)
      && nameMatchesLog(log.action || '', name)
      && log.reference_id
    );
    previousId = identityLog?.reference_id ? Number(identityLog.reference_id) : null;
  }

  const expenseLogs = logs.filter((log) => {
    if (log.action_type !== 'create_expense' || log.undone_at) return false;
    const payload = parsePayload(log.payload);
    if (payload?.created_by && previousId && Number(payload.created_by) === previousId) return true;
    if (previousId && String(log.action || '').includes(`for member #${previousId}`)) return true;
    if (previousId && log.actor_type === 'member' && Number(log.actor_id) === previousId) return true;
    return false;
  });

  const paymentLogs = logs.filter((log) => {
    if (log.action_type !== 'record_payment' || log.undone_at) return false;
    return nameMatchesLog(log.action || '', name);
  });

  let expensesRestored = 0;
  let paymentsRestored = 0;

  const activeMonth = await db
    .prepare("SELECT id, contribution_amount FROM mess_months WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    .first<{ id: number; contribution_amount: number }>();

  for (const log of expenseLogs) {
    const payload = parsePayload(log.payload);
    const amount = Number(payload?.amount ?? extractAmount(log.action || ''));
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const date = payload?.date || logDate(log.created_at);
    const description = (payload?.description ?? log.details ?? '').toString().trim();
    const monthYear = date.slice(0, 7);
    const month = monthYear
      ? await db.prepare('SELECT id FROM mess_months WHERE month_year = ?').bind(monthYear).first<{ id: number }>()
      : null;
    const monthId = payload?.month_id || month?.id || activeMonth?.id;
    if (!monthId) continue;

    const duplicate = await db
      .prepare('SELECT id FROM expenses WHERE created_by = ? AND amount = ? AND date = ? AND IFNULL(description, \'\') = ? LIMIT 1')
      .bind(memberId, amount, date, description)
      .first();
    if (duplicate) continue;

    await insertExpense(db, {
      month_id: monthId,
      created_by: memberId,
      amount,
      date,
      description,
      category_id: payload?.category_id ?? null,
      added_by_type: log.actor_type === 'admin' ? 'admin' : 'member',
      added_by_id: log.actor_id,
    });
    expensesRestored += 1;
  }

  for (const log of paymentLogs) {
    const payload = parsePayload(log.payload);
    const amount = Number(payload?.amount ?? extractAmount(log.action || ''));
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const paymentDate = payload?.payment_date || logDate(log.created_at);
    const monthYear = paymentDate.slice(0, 7);
    const month = monthYear
      ? await db.prepare('SELECT id, contribution_amount FROM mess_months WHERE month_year = ?').bind(monthYear).first<{ id: number; contribution_amount: number }>()
      : activeMonth;
    if (!month) continue;

    let mm = await db
      .prepare('SELECT id, amount_paid, contribution_amount FROM month_members WHERE month_id = ? AND member_id = ?')
      .bind(month.id, memberId)
      .first<{ id: number; amount_paid: number; contribution_amount: number }>();

    if (!mm) {
      const contribution = month.contribution_amount ?? activeMonth?.contribution_amount ?? 0;
      await db
        .prepare('INSERT OR IGNORE INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)')
        .bind(month.id, memberId, contribution)
        .run();
      mm = await db
        .prepare('SELECT id, amount_paid, contribution_amount FROM month_members WHERE month_id = ? AND member_id = ?')
        .bind(month.id, memberId)
        .first();
    }
    if (!mm) continue;

    const duplicate = await db
      .prepare('SELECT id FROM payments WHERE month_member_id = ? AND amount = ? AND payment_date = ? LIMIT 1')
      .bind(mm.id, amount, paymentDate)
      .first();
    if (duplicate) continue;

    await db
      .prepare('INSERT INTO payments (month_member_id, amount, payment_date, notes) VALUES (?, ?, ?, ?)')
      .bind(mm.id, amount, paymentDate, `Restored from activity log #${log.id}`)
      .run();

    const newPaid = (mm.amount_paid || 0) + amount;
    const status = paymentStatusFromAmounts(newPaid, mm.contribution_amount);
    await db
      .prepare('UPDATE month_members SET amount_paid = ?, payment_status = ? WHERE id = ?')
      .bind(newPaid, status, mm.id)
      .run();
    paymentsRestored += 1;
  }

  return { expenses: expensesRestored, payments: paymentsRestored };
}

async function restoreDeletedMember(db: D1Database, payload: Record<string, any> | null, action: string): Promise<string> {
  if (payload?.member) {
    const m = payload.member;
    try {
      await db
        .prepare(
          'INSERT INTO members (id, name, member_id, phone, email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
        )
        .bind(m.id, m.name, m.member_id, m.phone || '', m.email || '', m.status || 'active', m.created_at || new Date().toISOString())
        .run();
    } catch {
      const code = await nextMemberCode(db);
      await db
        .prepare('INSERT INTO members (name, member_id, phone, email, status) VALUES (?, ?, ?, ?, ?)')
        .bind(m.name, code, m.phone || '', m.email || '', m.status || 'active')
        .run();
    }

    for (const mm of payload.month_members || []) {
      try {
        await db
          .prepare(
            'INSERT INTO month_members (id, month_id, member_id, contribution_amount, payment_status, amount_paid) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(mm.id, mm.month_id, mm.member_id, mm.contribution_amount, mm.payment_status || 'unpaid', mm.amount_paid || 0)
          .run();
      } catch {
        await db
          .prepare('INSERT OR IGNORE INTO month_members (month_id, member_id, contribution_amount, payment_status, amount_paid) VALUES (?, ?, ?, ?, ?)')
          .bind(mm.month_id, mm.member_id, mm.contribution_amount, mm.payment_status || 'unpaid', mm.amount_paid || 0)
          .run();
      }
    }

    for (const pay of payload.payments || []) {
      try {
        await db
          .prepare('INSERT INTO payments (id, month_member_id, amount, payment_date, notes) VALUES (?, ?, ?, ?, ?)')
          .bind(pay.id, pay.month_member_id, pay.amount, pay.payment_date, pay.notes || '')
          .run();
      } catch {
        await db
          .prepare('INSERT INTO payments (month_member_id, amount, payment_date, notes) VALUES (?, ?, ?, ?)')
          .bind(pay.month_member_id, pay.amount, pay.payment_date, pay.notes || '')
          .run();
      }
    }

    for (const expense of payload.expenses || []) {
      await insertExpense(db, expense);
    }

    const restoredRow = await db.prepare('SELECT id FROM members WHERE name = ? COLLATE NOCASE ORDER BY id DESC LIMIT 1').bind(m.name).first<{ id: number }>();
    if (restoredRow) {
      const history = await rebuildHistoryFromLogs(db, restoredRow.id, m.name, m.id);
      const extra = history.expenses || history.payments
        ? ` Restored ${history.expenses} expense(s) and ${history.payments} payment(s) from logs.`
        : '';
      return `Restored member "${m.name}".${extra}`;
    }

    return `Restored member "${m.name}"`;
  }

  const name = extractQuotedName(action);
  if (!name) {
    throw new Error('This deleted member cannot be restored. The original data was not saved.');
  }

  const existing = await db.prepare('SELECT id FROM members WHERE name = ? COLLATE NOCASE').bind(name).first<{ id: number }>();
  if (existing) {
    const history = await rebuildHistoryFromLogs(db, existing.id, name);
    if (history.expenses || history.payments) {
      return `Member "${name}" already exists. Restored ${history.expenses} expense(s) and ${history.payments} payment(s) from logs.`;
    }
    throw new Error(`Member "${name}" already exists`);
  }

  const code = await nextMemberCode(db);
  const result = await db.prepare('INSERT INTO members (name, member_id) VALUES (?, ?)').bind(name, code).run();
  const newId = result.meta.last_row_id as number;
  const activeMonth = await db
    .prepare("SELECT id, contribution_amount FROM mess_months WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    .first<{ id: number; contribution_amount: number }>();
  if (activeMonth && newId) {
    await db
      .prepare('INSERT OR IGNORE INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)')
      .bind(activeMonth.id, newId, activeMonth.contribution_amount)
      .run();
  }
  const history = await rebuildHistoryFromLogs(db, newId, name);
  return `Restored member "${name}" with ${history.expenses} expense(s) and ${history.payments} payment(s) from logs`;
}

async function deleteMemberById(db: D1Database, id: number): Promise<void> {
  const monthMembers = await db.prepare('SELECT id FROM month_members WHERE member_id = ?').bind(id).all<{ id: number }>();
  for (const mm of monthMembers.results || []) {
    await db.prepare('DELETE FROM payments WHERE month_member_id = ?').bind(mm.id).run();
  }
  await db.prepare('DELETE FROM month_members WHERE member_id = ?').bind(id).run();
  await db.prepare('DELETE FROM expenses WHERE created_by = ?').bind(id).run();
  await db.prepare("DELETE FROM sessions WHERE user_type = 'member' AND user_id = ?").bind(id).run();
  await db.prepare('DELETE FROM members WHERE id = ?').bind(id).run();
}

export async function undoActivityLog(
  db: D1Database,
  log: ActivityRow,
  authUserId: number
): Promise<{ success: true; message: string } | { success: false; error: string; status?: number }> {
  if (log.undone_at) {
    return { success: false, error: 'This log was already undone', status: 400 };
  }
  if (!logCanUndo(log)) {
    return { success: false, error: 'This action cannot be undone', status: 400 };
  }

  const payload = parsePayload(log.payload);
  const refId = log.reference_id;

  try {
    switch (log.action_type) {
      case 'create_expense': {
        if (!refId) return { success: false, error: 'Expense reference is missing', status: 400 };
        const expense = await db.prepare('SELECT id FROM expenses WHERE id = ?').bind(refId).first();
        if (!expense) return { success: false, error: 'Expense was already removed', status: 400 };
        await db.prepare('DELETE FROM expenses WHERE id = ?').bind(refId).run();
        await markUndone(db, log, authUserId, log.action);
        return { success: true, message: 'Expense removed' };
      }

      case 'delete_expense': {
        const expense = payload?.expense;
        if (!expense) return { success: false, error: 'This deleted expense cannot be restored', status: 400 };
        await insertExpense(db, expense);
        await markUndone(db, log, authUserId, log.action);
        return { success: true, message: 'Expense restored' };
      }

      case 'edit_expense': {
        const before = payload?.before;
        if (!before || !refId) return { success: false, error: 'Original expense data is missing', status: 400 };
        await db
          .prepare("UPDATE expenses SET amount = ?, date = ?, description = ?, category_id = ?, created_by = ?, updated_at = datetime('now') WHERE id = ?")
          .bind(before.amount, before.date, before.description || '', before.category_id ?? null, before.created_by, refId)
          .run();
        await markUndone(db, log, authUserId, log.action);
        return { success: true, message: 'Expense changes reversed' };
      }

      case 'record_payment': {
        const monthMemberId = payload?.month_member_id || refId;
        if (!monthMemberId) return { success: false, error: 'Payment reference is missing', status: 400 };
        const mm = await db
          .prepare('SELECT id, amount_paid, contribution_amount FROM month_members WHERE id = ?')
          .bind(monthMemberId)
          .first<{ id: number; amount_paid: number; contribution_amount: number }>();
        if (!mm) return { success: false, error: 'Payment record no longer exists', status: 400 };

        let paymentId = payload?.payment_id as number | undefined;
        let amount = Number(payload?.amount);
        if (!paymentId) {
          amount = extractAmount(log.action) ?? amount;
          const latest = await db
            .prepare('SELECT id, amount FROM payments WHERE month_member_id = ? ORDER BY id DESC LIMIT 1')
            .bind(monthMemberId)
            .first<{ id: number; amount: number }>();
          if (!latest || (Number.isFinite(amount) && latest.amount !== amount)) {
            return { success: false, error: 'Could not find the payment to reverse', status: 400 };
          }
          paymentId = latest.id;
          amount = latest.amount;
        }

        await db.prepare('DELETE FROM payments WHERE id = ?').bind(paymentId).run();
        const previousPaid = payload?.previous_paid != null
          ? Number(payload.previous_paid)
          : Math.max(0, (mm.amount_paid || 0) - (amount || 0));
        const status = payload?.previous_status || paymentStatusFromAmounts(previousPaid, mm.contribution_amount);
        await db
          .prepare('UPDATE month_members SET amount_paid = ?, payment_status = ? WHERE id = ?')
          .bind(previousPaid, status, monthMemberId)
          .run();
        await markUndone(db, log, authUserId, log.action);
        return { success: true, message: 'Payment reversed' };
      }

      case 'create_member': {
        if (!refId) return { success: false, error: 'Member reference is missing', status: 400 };
        const member = await db.prepare('SELECT id FROM members WHERE id = ?').bind(refId).first();
        if (!member) return { success: false, error: 'Member was already removed', status: 400 };
        await deleteMemberById(db, refId);
        await markUndone(db, log, authUserId, log.action);
        return { success: true, message: 'Member removed' };
      }

      case 'delete_member': {
        const message = await restoreDeletedMember(db, payload, log.action);
        await markUndone(db, log, authUserId, log.action);
        return { success: true, message };
      }

      case 'edit_member': {
        const before = payload?.before;
        if (!before || !refId) return { success: false, error: 'Original member data is missing', status: 400 };
        await db
          .prepare("UPDATE members SET name = ?, member_id = ?, phone = ?, email = ?, updated_at = datetime('now') WHERE id = ?")
          .bind(before.name, before.member_id, before.phone || '', before.email || '', refId)
          .run();
        const beforeMm = payload?.before_month_member;
        if (beforeMm?.id) {
          const status = paymentStatusFromAmounts(beforeMm.amount_paid || 0, beforeMm.contribution_amount || 0);
          await db
            .prepare('UPDATE month_members SET contribution_amount = ?, amount_paid = ?, payment_status = ? WHERE id = ?')
            .bind(beforeMm.contribution_amount, beforeMm.amount_paid || 0, beforeMm.payment_status || status, beforeMm.id)
            .run();
        }
        await markUndone(db, log, authUserId, log.action);
        return { success: true, message: 'Member changes reversed' };
      }

      case 'update_contribution': {
        const previous = payload?.previous_amount;
        const monthId = payload?.month_id || refId;
        if (previous == null || !monthId) return { success: false, error: 'Original contribution amount is missing', status: 400 };
        await db.prepare('UPDATE mess_months SET contribution_amount = ? WHERE id = ?').bind(previous, monthId).run();
        await db.prepare('UPDATE month_members SET contribution_amount = ? WHERE month_id = ?').bind(previous, monthId).run();
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
        await markUndone(db, log, authUserId, log.action);
        return { success: true, message: 'Contribution amount restored' };
      }

      case 'close_month': {
        if (!refId) return { success: false, error: 'Month reference is missing', status: 400 };
        const month = await db.prepare('SELECT month_year, status FROM mess_months WHERE id = ?').bind(refId).first<{ month_year: string; status: string }>();
        if (!month) return { success: false, error: 'Month no longer exists', status: 400 };
        const now = new Date();
        const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (month.month_year < currentMonthYear) {
          return { success: false, error: 'Cannot reopen a completed past month', status: 400 };
        }
        await db.prepare("UPDATE mess_months SET status = 'closed', closed_at = datetime('now') WHERE status = 'active' AND id != ?").bind(refId).run();
        await db.prepare("UPDATE mess_months SET status = 'active', closed_at = NULL WHERE id = ?").bind(refId).run();
        await markUndone(db, log, authUserId, log.action);
        return { success: true, message: 'Month reopened' };
      }

      case 'reopen_month':
      case 'start_month': {
        if (!refId) return { success: false, error: 'Month reference is missing', status: 400 };
        await db.prepare("UPDATE mess_months SET status = 'closed', closed_at = datetime('now') WHERE id = ?").bind(refId).run();
        const previousId = payload?.previous_active_id;
        if (previousId) {
          await db.prepare("UPDATE mess_months SET status = 'active', closed_at = NULL WHERE id = ?").bind(previousId).run();
        }
        await markUndone(db, log, authUserId, log.action);
        return { success: true, message: log.action_type === 'start_month' ? 'Month start reversed' : 'Month closed again' };
      }

      default:
        return { success: false, error: 'This action cannot be undone', status: 400 };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to undo this action', status: 400 };
  }
}
