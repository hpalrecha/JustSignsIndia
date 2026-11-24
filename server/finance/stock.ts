import { FINANCE_COMPANIES, erpHttp, num, tenantsFor, type ErpSite, type FinanceCompanyKey, type ReportColumn } from './erp-client';

// ====================================================================================================
// STOCK BALANCE — ERPNext's Stock Balance report, one line per product.
//
// Ported from the STEK dashboard (src/tools/erp-stock-balance.ts). The page picks ONE ERP company at a
// time from a fixed list (never a name taken from the request), and only five columns are ever sent:
// the page is screenshotted and sent to detailers, so nothing about what the stock cost (value, rate,
// warehouse) reaches the browser.
// ====================================================================================================

export interface StockCompany {
  /** The ERPNext Company name, sent as the report's `company` filter. */
  name: string;
  /** The page's Company key for this ERP company (finance-rules.ts scopesFor). */
  key: 'justsigns';
  site: ErpSite;
}

/** The ERP companies this page may show, in dropdown order. The first is the default. */
export function stockCompanies(): StockCompany[] {
  const keys: FinanceCompanyKey[] = ['justsigns'];
  const tenants = tenantsFor(keys);
  return keys.map((k, i) => ({ name: FINANCE_COMPANIES[k].erpName, key: k, site: tenants[i].site }));
}

/** The only columns this page shows, in this order. */
export const STOCK_COLUMNS = ['item_code', 'item_name', 'item_group', 'stock_uom', 'bal_qty'] as const;

/**
 * One line per PRODUCT: ERP lists stock per item per warehouse; quantities are summed across every
 * warehouse. The other columns are the item's own. Order is ERP's, by each item's first appearance.
 */
export function sumByItem(
  rows: Array<Record<string, string | number | null>>,
  qtyField = 'bal_qty',
): Array<Record<string, string | number | null>> {
  const byItem = new Map<string, Record<string, string | number | null>>();
  for (const r of rows) {
    const code = String(r.item_code ?? '');
    if (!code) continue;
    const qty = Number(r[qtyField]) || 0;
    const hit = byItem.get(code);
    if (hit) hit[qtyField] = Number(hit[qtyField]) + qty;
    else byItem.set(code, { ...r, [qtyField]: qty });
  }
  // Summing floats can leave dust (0.1 + 0.2); quantities carry at most 3 decimals in ERP.
  for (const r of byItem.values()) r[qtyField] = Math.round(Number(r[qtyField]) * 1000) / 1000;
  return [...byItem.values()];
}

export interface StockColumn { fieldname: string; label: string; fieldtype: string }

export interface StockBalance {
  company: string;
  asOn: string;
  from: string;
  to: string;
  columns: StockColumn[];
  rows: Array<Record<string, string | number | null>>;
  scopeNote: string | null;
}

const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; value: StockBalance }>();

/** 1 April of the financial year that contains `day` — ERPNext's own default from_date. */
function financialYearStart(day: string): string {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  return `${m >= 4 ? y : y - 1}-04-01`;
}

export async function getStockBalance(opts: { company: StockCompany; asOn: string }): Promise<StockBalance> {
  const to = opts.asOn;
  const from = financialYearStart(to);
  const key = [opts.company.site.key, opts.company.name, from, to].join('|');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  // erpHttp refuses a site with no credentials, so an unconfigured company errors, never shows empty.
  const res = await erpHttp(opts.company.site).get('/api/method/frappe.desk.query_report.run', {
    params: {
      report_name: 'Stock Balance',
      filters: JSON.stringify({ company: opts.company.name, from_date: from, to_date: to }),
      ignore_prepared_report: 1,
    },
  });
  if (typeof res.data === 'string') {
    throw new Error('Stock Balance: expected JSON, got an HTML/text response (auth or edge error)');
  }
  const msg = (res.data as { message?: { result?: unknown; columns?: unknown } })?.message;
  if (!msg || !Array.isArray(msg.result)) throw new Error('Stock Balance: response had no result array');

  const reportCols = (Array.isArray(msg.columns) ? (msg.columns as ReportColumn[]) : []).filter((c) => c.fieldname);
  const cols = STOCK_COLUMNS
    .map((name) => reportCols.find((c) => c.fieldname === name))
    .filter((c): c is ReportColumn => !!c)
    .map((c) => ({ fieldname: String(c.fieldname), label: (c.label ?? c.fieldname ?? '').toString().trim(), fieldtype: c.fieldtype ?? 'Data' }));
  const numeric = new Set(cols.filter((c) => c.fieldtype === 'Currency' || c.fieldtype === 'Float' || c.fieldtype === 'Int').map((c) => c.fieldname));

  // Item rows are objects; the trailing Total is a bare array and is the only thing dropped.
  const perWarehouse = (msg.result as unknown[])
    .filter((r): r is Record<string, unknown> => !!r && !Array.isArray(r) && !!(r as Record<string, unknown>).item_code)
    .map((r) => {
      const out: Record<string, string | number | null> = {};
      for (const c of cols) {
        const v = r[c.fieldname];
        out[c.fieldname] = numeric.has(c.fieldname) ? num(v) : v == null || v === '' ? null : String(v);
      }
      return out;
    });

  const value: StockBalance = { company: opts.company.name, asOn: to, from, to, columns: cols, rows: sumByItem(perWarehouse), scopeNote: null };
  if (cache.size >= 32) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
  return value;
}
