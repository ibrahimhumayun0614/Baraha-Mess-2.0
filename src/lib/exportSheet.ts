// ============================================
// Spreadsheet export (Excel / Google Sheets)
// ============================================
import type { MonthSummary } from '../types';
import { formatDate, formatDateTime, formatMonthYear, formatPaidBy, formatAddedBy } from './api';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cell(value: string | number | null | undefined, header = false, styleId?: string): string {
  const finalStyle = styleId ? ` ss:StyleID="${styleId}"` : (header ? ' ss:StyleID="header"' : '');
  if (value === null || value === undefined || value === '') {
    return `<Cell${finalStyle}><Data ss:Type="String"></Data></Cell>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell${finalStyle}><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell${finalStyle}><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

export function downloadSpreadsheet(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): void {
  downloadMultiSheetWorkbook(filename, [
    {
      name: sheetName,
      headers,
      rows,
    },
  ]);
}

export interface SheetData {
  name: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
}

export function downloadMultiSheetWorkbook(
  filename: string,
  sheets: SheetData[]
): void {
  const worksheetsXml = sheets
    .map((sheet) => {
      const headerRow = `<Row>${sheet.headers.map((h) => cell(h, true)).join('')}</Row>`;
      const dataRows = sheet.rows
        .map((row) => `<Row>${row.map((v) => cell(v)).join('')}</Row>`)
        .join('');

      return `
  <Worksheet ss:Name="${escapeXml(sheet.name.slice(0, 31))}">
    <Table>
      ${headerRow}
      ${dataRows}
    </Table>
  </Worksheet>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="title">
      <Font ss:Bold="1" ss:Size="13"/>
    </Style>
  </Styles>
  ${worksheetsXml}
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Generate a complete 3-sheet Excel backup for a monthly cycle */
export function exportMonthBackup(summary: MonthSummary): void {
  const monthName = formatMonthYear(summary.month.month_year);
  const safeMonth = summary.month.month_year;
  const filename = `baraha-mess-backup-${safeMonth}.xls`;

  // Sheet 1: Financial Overview
  const overviewHeaders = ['Financial Metric', 'Value'];
  const overviewRows = [
    ['Month Cycle', monthName],
    ['Cycle Status', summary.month.status.toUpperCase()],
    ['Default Contribution (AED)', summary.month.contribution_amount],
    ['Total Members Enrolled', summary.member_count],
    ['Paid Members', summary.paid_count],
    ['Unpaid / Partial Members', summary.unpaid_count],
    ['Total Collected (AED)', summary.total_collected],
    ['Total Expenses Spent (AED)', summary.total_spent],
    ['Final Balance (AED)', summary.balance],
    ['Balance Status', summary.balance >= 0 ? 'Surplus' : 'Deficit'],
    ['Daily Average (AED)', summary.daily_average],
    ['Expected Full Collection (AED)', summary.member_count * summary.month.contribution_amount],
    ['Report Generated At', formatDateTime(new Date().toISOString())],
  ];

  // Sheet 2: Member Payment Statuses
  const memberHeaders = [
    'Member Code',
    'Member Name',
    'Monthly Target (AED)',
    'Amount Paid (AED)',
    'Pending Amount (AED)',
    'Payment Status',
  ];
  const memberRows = (summary.members || []).map((mm: any) => {
    const target = Number(mm.contribution_amount) || summary.month.contribution_amount;
    const paid = Number(mm.amount_paid) || 0;
    const pending = Math.max(0, target - paid);
    return [
      mm.member_member_id || '',
      mm.member_name || '',
      target,
      paid,
      pending,
      (mm.payment_status || 'unpaid').toUpperCase(),
    ];
  });

  // Sheet 3: Expense Records
  const expenseHeaders = [
    'Date',
    'Paid By',
    'Added By',
    'Note / Description',
    'Amount (AED)',
  ];
  const expenseRows = (summary.expenses || []).map((e) => [
    formatDate(e.date),
    formatPaidBy(e),
    formatAddedBy(e),
    e.description || '',
    e.amount,
  ]);

  downloadMultiSheetWorkbook(filename, [
    { name: 'Financial Summary', headers: overviewHeaders, rows: overviewRows },
    { name: 'Member Contributions', headers: memberHeaders, rows: memberRows },
    { name: 'Expenses Detail', headers: expenseHeaders, rows: expenseRows },
  ]);
}
