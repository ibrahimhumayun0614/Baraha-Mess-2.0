// ============================================
// /api/admin/terminal — Command Line Interface Execution Endpoint
// ============================================
import {
  json,
  errorResponse,
  authenticate,
  getActiveMonth,
  logActivity,
  syncPaidFromPayments,
  EXPENSE_SELECT,
  EXPENSE_SELECT_FALLBACK,
} from '../_shared';
import { undoActivityLog, logCanUndo } from '../_undo';

interface Env {
  DB: D1Database;
}

interface OutputLine {
  text: string;
  type?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'highlight' | 'muted';
}

function tokenize(input: string): string[] {
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1]);
    } else if (match[2] !== undefined) {
      tokens.push(match[2]);
    } else {
      tokens.push(match[0]);
    }
  }
  return tokens;
}

async function findMember(db: D1Database, identifier: string) {
  const clean = identifier.trim();
  const idNum = parseInt(clean, 10);
  if (!isNaN(idNum) && String(idNum) === clean) {
    const byId = await db.prepare('SELECT * FROM members WHERE id = ?').bind(idNum).first<any>();
    if (byId) return byId;
  }

  const byCode = await db.prepare('SELECT * FROM members WHERE member_id = ? COLLATE NOCASE').bind(clean).first<any>();
  if (byCode) return byCode;

  const byName = await db.prepare('SELECT * FROM members WHERE name = ? COLLATE NOCASE').bind(clean).first<any>();
  if (byName) return byName;

  const byLikeName = await db.prepare('SELECT * FROM members WHERE name LIKE ? ORDER BY LENGTH(name) ASC LIMIT 1').bind(`%${clean}%`).first<any>();
  return byLikeName || null;
}

async function getNextMemberCode(db: D1Database): Promise<string> {
  const existing = await db.prepare('SELECT member_id FROM members').all<{ member_id: string }>();
  let max = 0;
  let width = 3;
  for (const row of existing.results || []) {
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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const auth = await authenticate(request, db);
  if (!auth || auth.user_type !== 'admin') {
    return errorResponse('Admin access required for terminal execution', 403);
  }

  const body = (await request.json()) as { command?: string };
  const rawCommand = (body.command || '').trim();

  if (!rawCommand) {
    return json({
      success: true,
      data: {
        lines: [{ text: 'Empty command. Type "help" for a list of available commands.', type: 'muted' }],
      },
    });
  }

  const tokens = tokenize(rawCommand);
  const primary = (tokens[0] || '').toLowerCase();
  const secondary = (tokens[1] || '').toLowerCase();

  const lines: OutputLine[] = [];
  let backupData: any = null;

  try {
    // ----------------------------------------------------
    // HELP COMMAND
    // ----------------------------------------------------
    if (primary === 'help') {
      lines.push({ text: '=== BARAHA MESS ADMIN CLI COMMANDS ===', type: 'highlight' });
      lines.push({ text: '  expense <member> <amount> [note] [date]', type: 'info' });
      lines.push({ text: '    -> Rapidly add an expense (e.g. expense Mohamed 45.50 Groceries)', type: 'muted' });
      lines.push({ text: '  pay <member> <amount> [date] [note]', type: 'info' });
      lines.push({ text: '    -> Record contribution payment (e.g. pay Rashid 500)', type: 'muted' });
      lines.push({ text: '  edit last expense [member] <amount>', type: 'info' });
      lines.push({ text: '    -> Adjust the last logged expense (e.g. edit last expense Mohamed 60)', type: 'muted' });
      lines.push({ text: '  add member <name> [monthly_target] [code]', type: 'info' });
      lines.push({ text: '    -> Create new member (e.g. add member "Ali Hassan" 500)', type: 'muted' });
      lines.push({ text: '  delete member <name_or_code>', type: 'info' });
      lines.push({ text: '    -> Remove member and their records (e.g. delete member 003)', type: 'muted' });
      lines.push({ text: '  undo / undo last', type: 'info' });
      lines.push({ text: '    -> Reverse the most recent action or payment', type: 'muted' });
      lines.push({ text: '  stats / status', type: 'info' });
      lines.push({ text: '    -> View current month financial balance sheet', type: 'muted' });
      lines.push({ text: '  members', type: 'info' });
      lines.push({ text: '    -> List all members and payment statuses', type: 'muted' });
      lines.push({ text: '  expenses [limit]', type: 'info' });
      lines.push({ text: '    -> View latest expenses list', type: 'muted' });
      lines.push({ text: '  backup [month_year]', type: 'info' });
      lines.push({ text: '    -> Export full monthly Excel backup (e.g. backup or backup 2026-08)', type: 'muted' });
      lines.push({ text: '  start month <YYYY-MM> [amount]', type: 'info' });
      lines.push({ text: '    -> Start or reactivate a monthly cycle', type: 'muted' });
      lines.push({ text: '  close month', type: 'info' });
      lines.push({ text: '    -> Close and lock the current month cycle', type: 'muted' });
      lines.push({ text: '  clear', type: 'info' });
      lines.push({ text: '    -> Clear terminal screen', type: 'muted' });
      return json({ success: true, data: { lines } });
    }

    // ----------------------------------------------------
    // STATS / STATUS
    // ----------------------------------------------------
    if (primary === 'stats' || primary === 'status') {
      const activeMonth = await getActiveMonth(db);
      if (!activeMonth) {
        lines.push({ text: 'No active month cycle currently running.', type: 'warning' });
        lines.push({ text: 'Type "start month <YYYY-MM> [amount]" to begin a new month.', type: 'muted' });
        return json({ success: true, data: { lines } });
      }

      await syncPaidFromPayments(db, activeMonth.id);

      const collected = await db
        .prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM month_members WHERE month_id = ?')
        .bind(activeMonth.id)
        .first<{ total: number }>();

      const spent = await db
        .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE month_id = ?')
        .bind(activeMonth.id)
        .first<{ total: number }>();

      const totalMembers = await db
        .prepare('SELECT COUNT(*) as total FROM month_members WHERE month_id = ?')
        .bind(activeMonth.id)
        .first<{ total: number }>();

      const paidMembers = await db
        .prepare('SELECT COUNT(*) as total FROM month_members WHERE month_id = ? AND COALESCE(amount_paid, 0) > 0 AND amount_paid >= contribution_amount')
        .bind(activeMonth.id)
        .first<{ total: number }>();

      const totalSpentVal = spent?.total || 0;
      const totalColVal = collected?.total || 0;
      const balance = totalColVal - totalSpentVal;
      const totalM = totalMembers?.total || 0;
      const paidM = paidMembers?.total || 0;
      const unpaidM = totalM - paidM;

      lines.push({ text: `=== MONTHLY STATS: ${activeMonth.month_year} ===`, type: 'highlight' });
      lines.push({ text: `Target Fee:      AED ${activeMonth.contribution_amount} / person`, type: 'info' });
      lines.push({ text: `Total Members:   ${totalM} (${paidM} Paid | ${unpaidM} Pending)`, type: 'info' });
      lines.push({ text: `Total Collected: AED ${totalColVal.toFixed(2)}`, type: 'success' });
      lines.push({ text: `Total Spent:     AED ${totalSpentVal.toFixed(2)}`, type: 'warning' });
      lines.push({
        text: `Net Balance:     AED ${balance.toFixed(2)} (${balance >= 0 ? 'Surplus' : 'Deficit'})`,
        type: balance >= 0 ? 'success' : 'error',
      });
      return json({ success: true, data: { lines } });
    }

    // ----------------------------------------------------
    // MEMBERS LIST
    // ----------------------------------------------------
    if (primary === 'members') {
      const activeMonth = await getActiveMonth(db);
      if (activeMonth) {
        await syncPaidFromPayments(db, activeMonth.id);
      }

      const rows = await db
        .prepare(`
          SELECT m.id, m.name, m.member_id, m.phone, m.status,
            COALESCE(mm.contribution_amount, ?) as target,
            COALESCE(mm.amount_paid, 0) as paid,
            COALESCE(mm.payment_status, 'unpaid') as pay_status
          FROM members m
          LEFT JOIN month_members mm ON m.id = mm.member_id AND mm.month_id = ?
          WHERE m.status = 'active'
          ORDER BY m.name ASC
        `)
        .bind(activeMonth?.contribution_amount ?? 500, activeMonth?.id ?? -1)
        .all<any>();

      lines.push({ text: `=== ACTIVE MEMBERS (${rows.results?.length || 0}) ===`, type: 'highlight' });
      for (const m of rows.results || []) {
        const statusTag = `[${(m.pay_status || 'unpaid').toUpperCase()}]`;
        const pending = Math.max(0, m.target - m.paid);
        lines.push({
          text: `#${m.member_id || m.id} ${m.name.padEnd(20, ' ')} | Target: AED ${m.target} | Paid: AED ${m.paid.toFixed(2)} | Due: AED ${pending.toFixed(2)} ${statusTag}`,
          type: m.pay_status === 'paid' ? 'success' : m.pay_status === 'partial' ? 'warning' : 'error',
        });
      }
      return json({ success: true, data: { lines } });
    }

    // ----------------------------------------------------
    // EXPENSES LIST
    // ----------------------------------------------------
    if (primary === 'expenses' || (primary === 'list' && secondary === 'expenses')) {
      const countArg = parseInt(primary === 'expenses' ? tokens[1] : tokens[2], 10);
      const limit = !isNaN(countArg) && countArg > 0 ? Math.min(countArg, 50) : 10;

      let results;
      try {
        results = await db.prepare(`${EXPENSE_SELECT} ORDER BY e.date DESC, e.id DESC LIMIT ?`).bind(limit).all<any>();
      } catch {
        results = await db.prepare(`${EXPENSE_SELECT_FALLBACK} ORDER BY e.date DESC, e.id DESC LIMIT ?`).bind(limit).all<any>();
      }

      lines.push({ text: `=== LATEST EXPENSES (Showing ${results.results?.length || 0}) ===`, type: 'highlight' });
      for (const e of results.results || []) {
        const who = e.creator_name || 'Member';
        const note = e.description ? ` - "${e.description}"` : '';
        lines.push({
          text: `[ID #${e.id}] ${e.date} | AED ${Number(e.amount).toFixed(2).padStart(7, ' ')} paid by ${who}${note}`,
          type: 'info',
        });
      }
      return json({ success: true, data: { lines } });
    }

    // ----------------------------------------------------
    // ADD EXPENSE (expense / add expense)
    // syntax: expense <member> <amount> [note] [date]
    // ----------------------------------------------------
    if (primary === 'expense' || (primary === 'add' && secondary === 'expense')) {
      const offset = primary === 'add' ? 2 : 1;
      const memberIdent = tokens[offset];
      const amountStr = tokens[offset + 1];

      if (!memberIdent || !amountStr) {
        lines.push({ text: 'Error: Missing parameters.', type: 'error' });
        lines.push({ text: 'Syntax: expense <member_name_or_id> <amount> [note] [YYYY-MM-DD]', type: 'warning' });
        lines.push({ text: 'Example: expense Mohamed 45.50 "Groceries & Milk"', type: 'muted' });
        return json({ success: false, data: { lines } });
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        lines.push({ text: `Error: Invalid amount "${amountStr}". Must be positive number.`, type: 'error' });
        return json({ success: false, data: { lines } });
      }

      const activeMonth = await getActiveMonth(db);
      if (!activeMonth) {
        lines.push({ text: 'Error: No active month cycle. Start a month cycle first.', type: 'error' });
        return json({ success: false, data: { lines } });
      }

      const member = await findMember(db, memberIdent);
      if (!member) {
        lines.push({ text: `Error: Member "${memberIdent}" not found.`, type: 'error' });
        return json({ success: false, data: { lines } });
      }

      let note = '';
      let date = new Date().toISOString().split('T')[0];

      if (tokens.length > offset + 2) {
        const rem1 = tokens[offset + 2];
        if (/^\d{4}-\d{2}-\d{2}$/.test(rem1)) {
          date = rem1;
          note = tokens.slice(offset + 3).join(' ');
        } else {
          note = rem1;
          const rem2 = tokens[offset + 3];
          if (rem2 && /^\d{4}-\d{2}-\d{2}$/.test(rem2)) {
            date = rem2;
          } else if (tokens.length > offset + 3) {
            note = tokens.slice(offset + 2).join(' ');
          }
        }
      }

      const result = await db
        .prepare('INSERT INTO expenses (month_id, created_by, amount, date, description, category_id, added_by_type, added_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(activeMonth.id, member.id, amount, date, note, null, 'admin', auth.user_id)
        .run();

      const newExpId = result.meta.last_row_id as number;

      await logActivity(
        db,
        'admin',
        auth.user_id,
        `Admin logged expense: AED ${amount} for ${member.name}`,
        'create_expense',
        note || '',
        newExpId,
        'expense',
        {
          id: newExpId,
          month_id: activeMonth.id,
          created_by: member.id,
          amount,
          date,
          description: note,
          category_id: null,
        }
      );

      lines.push({
        text: `✓ Successfully added expense #${newExpId}: AED ${amount.toFixed(2)} for ${member.name} (${date})`,
        type: 'success',
      });
      if (note) lines.push({ text: `  Note: "${note}"`, type: 'muted' });
      return json({ success: true, data: { lines } });
    }

    // ----------------------------------------------------
    // EDIT LAST EXPENSE
    // syntax: edit last expense [member] <amount>
    // syntax: edit expense <id> <amount>
    // ----------------------------------------------------
    if (primary === 'edit' && (secondary === 'expense' || secondary === 'last')) {
      let targetExpenseId: number | null = null;
      let newAmount: number | null = null;

      if (tokens.slice(1, 3).join(' ').toLowerCase() === 'last expense') {
        const memberOrAmount = tokens[3];
        const amountOnly = tokens[4];

        if (amountOnly) {
          const member = await findMember(db, memberOrAmount);
          if (!member) {
            lines.push({ text: `Member "${memberOrAmount}" not found.`, type: 'error' });
            return json({ success: false, data: { lines } });
          }
          const exp = await db
            .prepare('SELECT * FROM expenses WHERE created_by = ? ORDER BY date DESC, id DESC LIMIT 1')
            .bind(member.id)
            .first<any>();
          if (!exp) {
            lines.push({ text: `No expenses found for member "${member.name}".`, type: 'error' });
            return json({ success: false, data: { lines } });
          }
          targetExpenseId = exp.id;
          newAmount = parseFloat(amountOnly);
        } else if (memberOrAmount) {
          const exp = await db.prepare('SELECT * FROM expenses ORDER BY id DESC LIMIT 1').first<any>();
          if (!exp) {
            lines.push({ text: 'No expenses found in database.', type: 'error' });
            return json({ success: false, data: { lines } });
          }
          targetExpenseId = exp.id;
          newAmount = parseFloat(memberOrAmount);
        }
      } else if (secondary === 'expense' && tokens[2]) {
        const idOrMember = tokens[2].replace('#', '');
        const maybeId = parseInt(idOrMember, 10);
        if (!isNaN(maybeId) && tokens[3]) {
          targetExpenseId = maybeId;
          newAmount = parseFloat(tokens[3]);
        }
      }

      if (!targetExpenseId || !newAmount || isNaN(newAmount) || newAmount <= 0) {
        lines.push({ text: 'Error: Invalid edit expense syntax.', type: 'error' });
        lines.push({ text: 'Syntax: edit last expense [member_name] <new_amount>', type: 'warning' });
        lines.push({ text: 'Syntax: edit expense <expense_id> <new_amount>', type: 'warning' });
        lines.push({ text: 'Example: edit last expense Mohamed 65.00', type: 'muted' });
        return json({ success: false, data: { lines } });
      }

      const existingExp = await db.prepare('SELECT * FROM expenses WHERE id = ?').bind(targetExpenseId).first<any>();
      if (!existingExp) {
        lines.push({ text: `Expense #${targetExpenseId} not found.`, type: 'error' });
        return json({ success: false, data: { lines } });
      }

      const prevAmount = existingExp.amount;
      await db
        .prepare("UPDATE expenses SET amount = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(newAmount, targetExpenseId)
        .run();

      await logActivity(
        db,
        'admin',
        auth.user_id,
        `Updated expense #${targetExpenseId} from AED ${prevAmount} to AED ${newAmount}`,
        'edit_expense',
        `Adjusted via Terminal`,
        targetExpenseId,
        'expense',
        { before: existingExp, after: { ...existingExp, amount: newAmount } }
      );

      lines.push({
        text: `✓ Updated expense #${targetExpenseId} amount from AED ${Number(prevAmount).toFixed(2)} -> AED ${newAmount.toFixed(2)}`,
        type: 'success',
      });
      return json({ success: true, data: { lines } });
    }

    // ----------------------------------------------------
    // RECORD PAYMENT
    // syntax: pay <member> <amount> [date] [note]
    // ----------------------------------------------------
    if (primary === 'pay' || (primary === 'add' && secondary === 'payment')) {
      const offset = primary === 'add' ? 2 : 1;
      const memberIdent = tokens[offset];
      const amountStr = tokens[offset + 1];

      if (!memberIdent || !amountStr) {
        lines.push({ text: 'Error: Missing parameters.', type: 'error' });
        lines.push({ text: 'Syntax: pay <member_name_or_id> <amount> [date] [note]', type: 'warning' });
        lines.push({ text: 'Example: pay Mohamed 500', type: 'muted' });
        return json({ success: false, data: { lines } });
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        lines.push({ text: `Error: Invalid payment amount "${amountStr}".`, type: 'error' });
        return json({ success: false, data: { lines } });
      }

      const activeMonth = await getActiveMonth(db);
      if (!activeMonth) {
        lines.push({ text: 'Error: No active month cycle found.', type: 'error' });
        return json({ success: false, data: { lines } });
      }

      const member = await findMember(db, memberIdent);
      if (!member) {
        lines.push({ text: `Member "${memberIdent}" not found.`, type: 'error' });
        return json({ success: false, data: { lines } });
      }

      let mm = await db
        .prepare('SELECT * FROM month_members WHERE month_id = ? AND member_id = ?')
        .bind(activeMonth.id, member.id)
        .first<any>();

      if (!mm) {
        await db
          .prepare('INSERT INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)')
          .bind(activeMonth.id, member.id, activeMonth.contribution_amount)
          .run();
        mm = await db
          .prepare('SELECT * FROM month_members WHERE month_id = ? AND member_id = ?')
          .bind(activeMonth.id, member.id)
          .first<any>();
      }

      const date = tokens[offset + 2] && /^\d{4}-\d{2}-\d{2}$/.test(tokens[offset + 2])
        ? tokens[offset + 2]
        : new Date().toISOString().split('T')[0];
      const note = tokens.slice(offset + (tokens[offset + 2] && /^\d{4}-\d{2}-\d{2}$/.test(tokens[offset + 2]) ? 3 : 2)).join(' ');

      const payRes = await db
        .prepare('INSERT INTO payments (month_member_id, amount, payment_date, notes) VALUES (?, ?, ?, ?)')
        .bind(mm.id, amount, date, note || '')
        .run();

      await syncPaidFromPayments(db, activeMonth.id);

      const updatedMm = await db
        .prepare('SELECT amount_paid, contribution_amount, payment_status FROM month_members WHERE id = ?')
        .bind(mm.id)
        .first<any>();

      await logActivity(
        db,
        'admin',
        auth.user_id,
        `Recorded payment of AED ${amount} from ${member.name}`,
        'record_payment',
        `Terminal command`,
        mm.id,
        'payment',
        {
          payment_id: payRes.meta.last_row_id,
          month_member_id: mm.id,
          amount,
          previous_paid: mm.amount_paid,
          previous_status: mm.payment_status,
        }
      );

      lines.push({
        text: `✓ Recorded payment of AED ${amount.toFixed(2)} from ${member.name} (${date})`,
        type: 'success',
      });
      lines.push({
        text: `  Member Total Paid: AED ${Number(updatedMm?.amount_paid || 0).toFixed(2)} / AED ${updatedMm?.contribution_amount} [${(updatedMm?.payment_status || 'unpaid').toUpperCase()}]`,
        type: 'info',
      });
      return json({ success: true, data: { lines } });
    }

    // ----------------------------------------------------
    // ADD MEMBER
    // syntax: add member <name> [amount] [code]
    // ----------------------------------------------------
    if (primary === 'add' && secondary === 'member') {
      const name = tokens[2];
      if (!name) {
        lines.push({ text: 'Error: Member name required.', type: 'error' });
        lines.push({ text: 'Syntax: add member <name> [monthly_target] [code]', type: 'warning' });
        lines.push({ text: 'Example: add member "Rashid Khan" 500', type: 'muted' });
        return json({ success: false, data: { lines } });
      }

      const activeMonth = await getActiveMonth(db);
      const targetAmount = tokens[3] && !isNaN(parseFloat(tokens[3])) ? parseFloat(tokens[3]) : activeMonth?.contribution_amount ?? 500;
      const code = tokens[4] ? tokens[4].trim() : await getNextMemberCode(db);

      const res = await db
        .prepare('INSERT INTO members (name, member_id, phone, email) VALUES (?, ?, ?, ?)')
        .bind(name, code, '', '')
        .run();

      const newId = res.meta.last_row_id as number;

      if (activeMonth) {
        await db
          .prepare('INSERT OR IGNORE INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)')
          .bind(activeMonth.id, newId, targetAmount)
          .run();
      }

      await logActivity(
        db,
        'admin',
        auth.user_id,
        `Created member "${name}" (ID: ${code}) with target AED ${targetAmount}`,
        'create_member',
        code,
        newId,
        'member',
        { id: newId, name, member_id: code, contribution_amount: targetAmount }
      );

      lines.push({
        text: `✓ Created member #${code} "${name}" with target AED ${targetAmount.toFixed(2)}`,
        type: 'success',
      });
      return json({ success: true, data: { lines } });
    }

    // ----------------------------------------------------
    // DELETE MEMBER
    // syntax: delete member <name_or_code>
    // ----------------------------------------------------
    if ((primary === 'delete' || primary === 'rm') && secondary === 'member') {
      const identifier = tokens[2];
      if (!identifier) {
        lines.push({ text: 'Error: Member identifier required.', type: 'error' });
        lines.push({ text: 'Syntax: delete member <name_or_code>', type: 'warning' });
        return json({ success: false, data: { lines } });
      }

      const member = await findMember(db, identifier);
      if (!member) {
        lines.push({ text: `Member "${identifier}" not found.`, type: 'error' });
        return json({ success: false, data: { lines } });
      }

      const monthMembers = await db.prepare('SELECT * FROM month_members WHERE member_id = ?').bind(member.id).all<any>();
      const mmRows = monthMembers.results || [];
      let payments: any[] = [];
      if (mmRows.length > 0) {
        const placeholders = mmRows.map(() => '?').join(',');
        const payRes = await db.prepare(`SELECT * FROM payments WHERE month_member_id IN (${placeholders})`).bind(...mmRows.map((m) => m.id)).all();
        payments = payRes.results || [];
      }
      const expenseRes = await db.prepare('SELECT * FROM expenses WHERE created_by = ?').bind(member.id).all();

      const snapshot = {
        member,
        month_members: mmRows,
        payments,
        expenses: expenseRes.results || [],
      };

      for (const mm of mmRows) {
        await db.prepare('DELETE FROM payments WHERE month_member_id = ?').bind(mm.id).run();
      }
      await db.prepare('DELETE FROM month_members WHERE member_id = ?').bind(member.id).run();
      await db.prepare('DELETE FROM expenses WHERE created_by = ?').bind(member.id).run();
      await db.prepare("DELETE FROM sessions WHERE user_type = 'member' AND user_id = ?").bind(member.id).run();
      await db.prepare('DELETE FROM members WHERE id = ?').bind(member.id).run();

      await logActivity(
        db,
        'admin',
        auth.user_id,
        `Deleted member "${member.name}"`,
        'delete_member',
        `Terminal command`,
        member.id,
        'member',
        snapshot
      );

      lines.push({ text: `✓ Successfully deleted member "${member.name}" (ID #${member.member_id || member.id}).`, type: 'warning' });
      lines.push({ text: '  All historical payments and expenses backed up in Activity Log (type "undo" to reverse).', type: 'muted' });
      return json({ success: true, data: { lines } });
    }

    // ----------------------------------------------------
    // UNDO / UNDO LAST
    // ----------------------------------------------------
    if (primary === 'undo') {
      const latestLog = await db
        .prepare("SELECT * FROM activity_logs WHERE undone_at IS NULL AND action_type NOT IN ('login', 'member_access', 'undo') ORDER BY id DESC LIMIT 1")
        .first<any>();

      if (!latestLog || !logCanUndo(latestLog)) {
        lines.push({ text: 'No undoable recent actions found in activity log.', type: 'warning' });
        return json({ success: true, data: { lines } });
      }

      const undoRes = await undoActivityLog(db, latestLog, auth.user_id);
      if (undoRes.success) {
        lines.push({ text: `✓ Undone: ${latestLog.action}`, type: 'success' });
        lines.push({ text: `  ${undoRes.message}`, type: 'info' });
      } else {
        lines.push({ text: `Undo failed: ${undoRes.error}`, type: 'error' });
      }
      return json({ success: undoRes.success, data: { lines } });
    }

    // ----------------------------------------------------
    // BACKUP
    // syntax: backup [month_year]
    // ----------------------------------------------------
    if (primary === 'backup' || (primary === 'download' && secondary === 'backup')) {
      const monthParam = primary === 'backup' ? tokens[1] : tokens[2];
      let monthRow: any = null;

      if (monthParam) {
        monthRow = await db.prepare('SELECT * FROM mess_months WHERE month_year = ?').bind(monthParam).first();
      } else {
        monthRow = await getActiveMonth(db);
        if (!monthRow) {
          monthRow = await db.prepare('SELECT * FROM mess_months ORDER BY id DESC LIMIT 1').first();
        }
      }

      if (!monthRow) {
        lines.push({ text: 'No month data available to backup.', type: 'error' });
        return json({ success: false, data: { lines } });
      }

      await syncPaidFromPayments(db, monthRow.id);

      const collected = await db
        .prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM month_members WHERE month_id = ?')
        .bind(monthRow.id)
        .first<{ total: number }>();

      const spent = await db
        .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE month_id = ?')
        .bind(monthRow.id)
        .first<{ total: number }>();

      const memberCount = await db
        .prepare('SELECT COUNT(*) as total FROM month_members WHERE month_id = ?')
        .bind(monthRow.id)
        .first<{ total: number }>();

      const paidCount = await db
        .prepare('SELECT COUNT(*) as total FROM month_members WHERE month_id = ? AND COALESCE(amount_paid, 0) > 0 AND amount_paid >= contribution_amount')
        .bind(monthRow.id)
        .first<{ total: number }>();

      const totalSpentVal = spent?.total || 0;
      const totalColVal = collected?.total || 0;
      const mCount = memberCount?.total || 0;
      const pCount = paidCount?.total || 0;
      const uCount = mCount - pCount;

      let expenses: any[] = [];
      try {
        const expenseRows = await db
          .prepare(`${EXPENSE_SELECT} WHERE e.month_id = ? ORDER BY e.date DESC, e.created_at DESC`)
          .bind(monthRow.id)
          .all();
        expenses = expenseRows.results || [];
      } catch {
        const fallback = await db
          .prepare(`${EXPENSE_SELECT_FALLBACK} WHERE e.month_id = ? ORDER BY e.date DESC, e.created_at DESC`)
          .bind(monthRow.id)
          .all();
        expenses = fallback.results || [];
      }

      const membersRes = await db
        .prepare(`
          SELECT mm.*, m.name as member_name, m.member_id as member_member_id, m.phone as member_phone
          FROM month_members mm
          JOIN members m ON mm.member_id = m.id
          WHERE mm.month_id = ?
          ORDER BY m.name ASC
        `)
        .bind(monthRow.id)
        .all();

      backupData = {
        month: monthRow,
        total_collected: totalColVal,
        total_spent: totalSpentVal,
        balance: totalColVal - totalSpentVal,
        daily_average: 0,
        member_count: mCount,
        paid_count: pCount,
        unpaid_count: uCount,
        members: membersRes.results || [],
        expenses,
      };

      lines.push({ text: `✓ Generated full backup for cycle ${monthRow.month_year} (${expenses.length} expenses, ${membersRes.results?.length || 0} members)`, type: 'success' });
      lines.push({ text: '  Triggering Excel spreadsheet download...', type: 'info' });

      return json({
        success: true,
        data: {
          action: 'download_backup',
          backup_data: backupData,
          lines,
        },
      });
    }

    // ----------------------------------------------------
    // START / CLOSE MONTH
    // ----------------------------------------------------
    if (primary === 'start' && secondary === 'month') {
      const monthYear = tokens[2];
      const amount = tokens[3] ? parseFloat(tokens[3]) : 500;
      if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
        lines.push({ text: 'Error: Invalid month format. Expected YYYY-MM.', type: 'error' });
        lines.push({ text: 'Example: start month 2026-09 500', type: 'muted' });
        return json({ success: false, data: { lines } });
      }

      await db.prepare("UPDATE mess_months SET status = 'closed', closed_at = datetime('now') WHERE status = 'active'").run();

      const existingMonth = await db.prepare('SELECT id FROM mess_months WHERE month_year = ?').bind(monthYear).first<any>();
      let monthId: number;
      if (existingMonth) {
        monthId = existingMonth.id;
        await db.prepare("UPDATE mess_months SET status = 'active', closed_at = NULL, contribution_amount = ? WHERE id = ?").bind(amount, monthId).run();
      } else {
        const res = await db.prepare("INSERT INTO mess_months (month_year, contribution_amount, status) VALUES (?, ?, 'active')").bind(monthYear, amount).run();
        monthId = res.meta.last_row_id as number;
      }

      const activeMembers = await db.prepare("SELECT id FROM members WHERE status = 'active'").all<any>();
      for (const mem of activeMembers.results || []) {
        await db.prepare('INSERT OR IGNORE INTO month_members (month_id, member_id, contribution_amount) VALUES (?, ?, ?)').bind(monthId, mem.id, amount).run();
      }

      await logActivity(db, 'admin', auth.user_id, `Started month: ${monthYear} via Terminal`, 'start_month', '', monthId, 'month');

      lines.push({ text: `✓ Started month cycle ${monthYear} with AED ${amount}/person (${activeMembers.results?.length || 0} members enrolled)`, type: 'success' });
      return json({ success: true, data: { lines } });
    }

    if (primary === 'close' && secondary === 'month') {
      const activeMonth = await getActiveMonth(db);
      if (!activeMonth) {
        lines.push({ text: 'No active month currently open to close.', type: 'warning' });
        return json({ success: true, data: { lines } });
      }

      await db.prepare("UPDATE mess_months SET status = 'closed', closed_at = datetime('now') WHERE id = ?").bind(activeMonth.id).run();
      await logActivity(db, 'admin', auth.user_id, `Closed month: ${activeMonth.month_year} via Terminal`, 'close_month', '', activeMonth.id, 'month');

      lines.push({ text: `✓ Closed month cycle ${activeMonth.month_year}.`, type: 'success' });
      lines.push({ text: '  Type "backup" anytime to download its archived Excel spreadsheet.', type: 'info' });
      return json({ success: true, data: { lines } });
    }

    // ----------------------------------------------------
    // UNRECOGNIZED COMMAND
    // ----------------------------------------------------
    lines.push({ text: `Command not recognized: "${rawCommand}"`, type: 'error' });
    lines.push({ text: 'Type "help" to see available terminal commands and examples.', type: 'muted' });
    return json({ success: false, data: { lines } });
  } catch (err: any) {
    lines.push({ text: `Terminal Execution Error: ${err?.message || 'Unknown error'}`, type: 'error' });
    return json({ success: false, data: { lines } }, 500);
  }
};
