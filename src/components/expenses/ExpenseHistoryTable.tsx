// ============================================
// Shared expense history table (Paid By / Added By / Period)
// ============================================
import { formatCurrency, formatDate, formatNote, formatPaidBy, formatAddedBy, formatPeriod } from '../../lib/api';
import type { Expense } from '../../types';

interface ExpenseHistoryTableProps {
  expenses: Expense[];
  emptyMessage?: string;
}

export default function ExpenseHistoryTable({
  expenses,
  emptyMessage = 'No expenses recorded yet',
}: ExpenseHistoryTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem' }}>
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Paid By</th>
            <th>Added By</th>
            <th>Date</th>
            <th>Period</th>
            <th>Note</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td className="font-medium">{formatPaidBy(expense)}</td>
              <td>{formatAddedBy(expense)}</td>
              <td>{formatDate(expense.date)}</td>
              <td>
                <span className={`badge ${expense.month_status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                  {formatPeriod(expense)}
                </span>
              </td>
              <td>
                <span className="text-sm">{formatNote(expense.description)}</span>
              </td>
              <td className="amount">{formatCurrency(expense.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
