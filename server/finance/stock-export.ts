import type { StockBalance, StockColumn } from './stock';

// ====================================================================================================
// STOCK BALANCE DOWNLOADS — the page's table as a PDF or an Excel file. Copied unchanged from the STEK
// dashboard (src/tools/stock-balance-export.ts) apart from this import path.
//
// A download is what is ON SCREEN: the same company and as-on date, the same column filters, the same sort,
// the same five columns, and a Total of the quantity. The filter and sort rules here are the page's own
// (overview.html: billMatch / billSortRows) ported to TypeScript, and test/stock-balance-export.test.ts pins
// the two to the same cases. Nothing the page does not show (a value, a rate, a warehouse) can be in a file,
// because the data it is built from never carried one.
// ====================================================================================================

export type Row = Record<string, string | number | null>;
export interface ViewState {
  /** Column filter text by fieldname, exactly what was typed in the filter row. */
  filters: Record<string, string>;
  /** Sort column and direction, or null for ERP's order. */
  sort: { field: string; dir: 1 | -1 } | null;
}

const isNum = (c: StockColumn): boolean => c.fieldtype === 'Currency' || c.fieldtype === 'Int' || c.fieldtype === 'Float';

const parseNum = (t: string): number => parseFloat(String(t).replace(/,/g, ''));

function qtyText(v: number): string {
  return (Number(v) + 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

/** The page's filter rule. Text: case-insensitive "contains". Numbers also take > < >= <= = != and a range a:b. */
export function matchesFilter(c: StockColumn, v: string | number | null, q: string): boolean {
  q = String(q ?? '').trim();
  if (!q) return true;
  if (isNum(c)) {
    const n = Number(v) || 0;
    const r = q.match(/^(-?[\d.,]+)\s*:\s*(-?[\d.,]+)$/);
    const m = q.match(/^(>=|<=|!=|>|<|=)?\s*(-?[\d.,]+)$/);
    if (r) return n >= Math.min(parseNum(r[1]), parseNum(r[2])) - 0.005 && n <= Math.max(parseNum(r[1]), parseNum(r[2])) + 0.005;
    if (m) {
      const x = parseNum(m[2]);
      const op = m[1] || '=';
      if (op === '>') return n > x;
      if (op === '<') return n < x;
      if (op === '>=') return n >= x - 0.005;
      if (op === '<=') return n <= x + 0.005;
      if (op === '!=') return Math.abs(n - x) >= 0.005;
      return Math.abs(n - x) < 0.005;
    }
    return qtyText(n).indexOf(q) >= 0 || String(n).indexOf(q) >= 0;
  }
  return String(v ?? '').toLowerCase().indexOf(q.toLowerCase()) >= 0;
}

/** The page's sort rule: blanks last whichever way it sorts, numbers numerically, text naturally and case-blind. */
export function sortRows(rows: Row[], c: StockColumn, dir: 1 | -1): Row[] {
  const keyed = rows.map((r, i) => ({ r, i, v: r[c.fieldname] }));
  keyed.sort((a, b) => {
    const an = a.v == null || a.v === '';
    const bn = b.v == null || b.v === '';
    if (an || bn) return an && bn ? a.i - b.i : an ? 1 : -1;
    const d = isNum(c)
      ? Number(a.v) - Number(b.v)
      : String(a.v).localeCompare(String(b.v), undefined, { numeric: true, sensitivity: 'base' });
    return d ? d * dir : a.i - b.i;
  });
  return keyed.map((k) => k.r);
}

/** The rows as the page shows them: filtered, then sorted. */
export function applyView(sb: StockBalance, view: ViewState): Row[] {
  let rows = sb.rows;
  for (const c of sb.columns) {
    const q = view.filters[c.fieldname];
    if (q && q.trim()) rows = rows.filter((r) => matchesFilter(c, r[c.fieldname], q));
  }
  const sc = view.sort && sb.columns.find((c) => c.fieldname === view.sort!.field);
  return sc && view.sort ? sortRows(rows, sc, view.sort.dir) : rows;
}

/** The Total: quantities only. Floating-point dust is rounded away (ERP quantities carry at most 3 decimals). */
export function totalQty(rows: Row[], field = 'bal_qty'): number {
  return Math.round(rows.reduce((a, r) => a + (Number(r[field]) || 0), 0) * 1000) / 1000;
}

function dateText(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : iso;
}

function titleLines(sb: StockBalance, shown: number, filtered: boolean): string[] {
  return [
    sb.company,
    `As on ${dateText(sb.asOn)}`,
    filtered ? `${shown} items (filtered)` : `${shown} items`,
  ];
}

export function exportFileName(sb: StockBalance, ext: 'xlsx' | 'pdf'): string {
  const company = sb.company.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'Company';
  return `Stock-Balance-${company}-${sb.asOn}.${ext}`;
}

const TEAL = 'FF0F766E';

export async function buildXlsx(sb: StockBalance, view: ViewState): Promise<Buffer> {
  const { default: ExcelJS } = await import('exceljs');
  const rows = applyView(sb, view);
  const filtered = rows.length !== sb.rows.length;
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet('Stock Balance', { views: [{ state: 'frozen', ySplit: 5 }] });
  const cols = sb.columns;
  // Printed or saved as PDF from Excel: one page wide, as many pages tall as the list needs, header repeated.
  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '5:5' };
  ws.columns = cols.map((c) => ({ width: c.fieldname === 'item_name' || c.fieldname === 'item_group' ? 36 : c.fieldname === 'item_code' ? 26 : 16 }));

  const [t1, t2, t3] = titleLines(sb, rows.length, filtered);
  ws.getCell('A1').value = 'Stock Balance';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A2').value = t1;
  ws.getCell('A3').value = `${t2} · ${t3}`;
  ws.getCell('A3').font = { color: { argb: 'FF68727F' } };

  const head = ws.getRow(5);
  cols.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    cell.alignment = { horizontal: isNum(c) ? 'right' : 'left' };
  });
  head.commit();

  rows.forEach((r, ri) => {
    const row = ws.getRow(6 + ri);
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      if (isNum(c)) {
        cell.value = Number(r[c.fieldname]) || 0;
        cell.numFmt = '#,##0.###';
        cell.alignment = { horizontal: 'right' };
      } else {
        cell.value = r[c.fieldname] == null ? '' : String(r[c.fieldname]);
      }
    });
    if (ri % 2 === 1) row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; });
    row.commit();
  });

  const tot = ws.getRow(6 + rows.length);
  cols.forEach((c, i) => {
    const cell = tot.getCell(i + 1);
    if (i === 0) cell.value = 'Total';
    if (c.fieldname === 'bal_qty') { cell.value = totalQty(rows); cell.numFmt = '#,##0.###'; cell.alignment = { horizontal: 'right' }; }
    cell.font = { bold: true };
    cell.border = { top: { style: 'medium', color: { argb: TEAL } } };
  });
  tot.commit();
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + Math.max(rows.length, 1), column: cols.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildPdf(sb: StockBalance, view: ViewState): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit');
  const rows = applyView(sb, view);
  const filtered = rows.length !== sb.rows.length;
  const cols = sb.columns;
  const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 36, bufferPages: true, info: { Title: 'Stock Balance' } });
  const chunks: Buffer[] = [];
  doc.on('data', (d: Buffer) => chunks.push(d));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  // Column widths in proportion: names get the room, quantity stays narrow.
  const weight: Record<string, number> = { item_code: 3, item_name: 3.4, item_group: 3.4, stock_uom: 1.2, bal_qty: 1.8 };
  const sumW = cols.reduce((a, c) => a + (weight[c.fieldname] ?? 2), 0);
  const w = cols.map((c) => ((weight[c.fieldname] ?? 2) / sumW) * width);
  const rowH = 15;
  // Last y a row may start at, leaving room for the footer line. No extra reserve: a short list stays on ONE page.
  const bottom = () => doc.page.height - doc.page.margins.bottom - 8;

  const [t1, t2, t3] = titleLines(sb, rows.length, filtered);
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#101720').text('Stock Balance', left, 36);
  doc.font('Helvetica').fontSize(10).fillColor('#3d4753').text(t1, left, 58);
  doc.fontSize(9).fillColor('#68727f').text(`${t2}  ·  ${t3}`, left, 72);

  const cell = (text: string, x: number, y: number, cw: number, align: 'left' | 'right', bold = false, color = '#101720') => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(color)
      .text(text, x + 5, y + 4, { width: cw - 10, height: rowH - 5, align, lineBreak: false, ellipsis: true });
  };
  const header = (y: number) => {
    doc.rect(left, y, width, rowH).fill('#0f766e');
    let x = left;
    cols.forEach((c, i) => { cell(c.label, x, y, w[i], isNum(c) ? 'right' : 'left', true, '#ffffff'); x += w[i]; });
    return y + rowH;
  };

  let y = header(94);
  rows.forEach((r, ri) => {
    // One row of room is kept for the Total, so it is never alone on a page with nothing above it but the header.
    if (y + rowH > bottom() - rowH) { doc.addPage(); y = header(doc.page.margins.top); }
    if (ri % 2 === 1) doc.rect(left, y, width, rowH).fill('#f1f5f9');
    let x = left;
    cols.forEach((c, i) => {
      const v = r[c.fieldname];
      cell(isNum(c) ? qtyText(Number(v) || 0) : v == null ? '' : String(v), x, y, w[i], isNum(c) ? 'right' : 'left');
      x += w[i];
    });
    y += rowH;
  });
  if (y + rowH > bottom()) { doc.addPage(); y = doc.page.margins.top; }
  doc.moveTo(left, y).lineTo(left + width, y).lineWidth(1.2).strokeColor('#0f766e').stroke();
  let x = left;
  cols.forEach((c, i) => {
    if (i === 0) cell('Total', x, y, w[i], 'left', true);
    if (c.fieldname === 'bal_qty') cell(qtyText(totalQty(rows)), x, y, w[i], 'right', true);
    x += w[i];
  });

  // Page numbers, once the page count is known.
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    // The footer sits inside the bottom margin. PDFKit starts a NEW PAGE for any text written below its margin, so
    // the margin is lifted for this one line; otherwise every page grew a blank twin.
    const margins = doc.page.margins;
    const keep = margins.bottom;
    margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor('#68727f')
      .text(`Page ${i + 1} of ${range.count}`, left, doc.page.height - 30, { width, align: 'right', lineBreak: false });
    margins.bottom = keep;
  }
  doc.end();
  return done;
}
