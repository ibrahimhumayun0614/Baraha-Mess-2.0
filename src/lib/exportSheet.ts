// ============================================
// Spreadsheet export (Excel / Google Sheets)
// ============================================

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cell(value: string | number | null | undefined, header = false): string {
  const style = header ? ' ss:StyleID="header"' : '';
  if (value === null || value === undefined || value === '') {
    return `<Cell${style}><Data ss:Type="String"></Data></Cell>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell${style}><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell${style}><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

export function downloadSpreadsheet(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): void {
  const headerRow = `<Row>${headers.map((h) => cell(h, true)).join('')}</Row>`;
  const dataRows = rows.map((row) => `<Row>${row.map((v) => cell(v)).join('')}</Row>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(sheetName.slice(0, 31))}">
    <Table>
      ${headerRow}
      ${dataRows}
    </Table>
  </Worksheet>
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
