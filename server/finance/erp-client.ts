import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// ====================================================================================================
// Read-only access to the Just Signs ERPNext (erp.justsigns.co.in) for the Finance pages.
//
// Copied from P91Elite (artifacts/api-server/src/services/finance/erp-client.ts). Differences:
//
//   1. COMPANIES ARE AN ALLOWLIST of ONE: 'Just Signs India Pvt Ltd' on erp.justsigns.co.in (checked
//      live 2026-11-24: it is the only Company on that site). The Plus91 companies and site are gone.
//      The browser names a company by a short key; the ERP company name is looked up here, so a request
//      can never reach a company that is not on the list.
//
//   2. MISSING CREDENTIALS ARE A 503. With JUSTSIGNS_ERPNEXT_BASE_URL / _API_KEY / _API_SECRET unset,
//      FinanceNotConfigured is thrown and the route answers "Finance is not connected to ERP yet".
//
// The service credential authenticates as an administrator — full write access to the site. So the
// client below refuses anything but a GET, and refuses any /api/method/ call that is not on a short
// read-only allowlist: Frappe runs whitelisted methods over GET, and some of them send mail or change
// data. (The one POST this app makes to ERP — the user's own password check — lives in
// server/erp-login.ts, never here.)
// ====================================================================================================

export interface ErpSite {
  key: string;
  baseUrl: string;
  token: string;
  /** A single-brand site (Just Signs): every document on it belongs to this brand. */
  fixedBrand?: string;
}

export const FINANCE_COMPANIES = {
  justsigns: { key: 'justsigns', label: 'Just Signs India Pvt Ltd', erpName: 'Just Signs India Pvt Ltd', site: 'justsigns' },
} as const;

export type FinanceCompanyKey = keyof typeof FINANCE_COMPANIES;

export interface Tenant {
  /** The ERP company name, sent to ERP as the `company` filter. */
  company: string;
  site: ErpSite;
}

/** Thrown when the Just Signs ERP credentials are not set. The route answers 503. */
export class FinanceNotConfigured extends Error {}

function justSignsSite(): ErpSite {
  const baseUrl = (process.env.JUSTSIGNS_ERPNEXT_BASE_URL ?? '').trim().replace(//+$/, '');
  const key = process.env.JUSTSIGNS_ERPNEXT_API_KEY;
  const secret = process.env.JUSTSIGNS_ERPNEXT_API_SECRET;
  if (!baseUrl || !key || !secret) {
    throw new FinanceNotConfigured('JUSTSIGNS_ERPNEXT_BASE_URL / _API_KEY / _API_SECRET are not set');
  }
  return { key: 'justsigns', baseUrl, token: `token ${key}:${secret}`, fixedBrand: 'JustSigns' };
}

/**
 * The companies to read. The route resolves the request's company choice against the caller's own
 * list first (finance-rules.ts), so this only ever sees companies the user may read.
 */
export function tenantsFor(keys: readonly FinanceCompanyKey[]): Tenant[] {
  if (!keys.length) return [];
  const site = justSignsSite();
  return keys.map((k) => ({ company: FINANCE_COMPANIES[k].erpName, site }));
}

/** Side-effect-free /api/method/ endpoints. Everything else under /api/method/ is refused. */
const ALLOWED_METHODS = new Set(['frappe.desk.query_report.run']);

export function erpHttp(site: ErpSite): AxiosInstance {
  const inst = axios.create({
    baseURL: site.baseUrl,
    headers: { Authorization: site.token, Accept: 'application/json' },
    // Wide windows ask for thousands of rows; a shorter ceiling cut off reads that would have finished.
    timeout: 45_000,
  });

  inst.interceptors.request.use((cfg) => {
    const method = String(cfg.method ?? 'get').toLowerCase();
    const url = String(cfg.url ?? '');
    if (method !== 'get') {
      throw new Error(`[finance-erp] refused a ${method.toUpperCase()} — Finance reads ERP, it never writes`);
    }
    const path = url.split('?')[0].replace(/^\/+/, '');
    if (path.startsWith('api/method/')) {
      const target = path.slice('api/method/'.length);
      if (!ALLOWED_METHODS.has(target)) {
        throw new Error(`[finance-erp] refused GET /api/method/${target} — not on the read-only allowlist`);
      }
      return cfg;
    }
    if (path.startsWith('api/resource/')) return cfg;
    throw new Error(`[finance-erp] refused GET ${path} — only /api/resource/ reads and allowlisted methods`);
  });

  // Retry transient failures only. Safe because every request above is a GET.
  const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
  const RETRYABLE_CODE = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND', 'EPIPE']);
  const MAX_ATTEMPTS = 3;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  inst.interceptors.response.use(undefined, async (err: unknown) => {
    const e = err as { config?: InternalAxiosRequestConfig & { __erpAttempt?: number }; response?: { status?: number }; code?: string };
    const cfg = e?.config;
    if (!cfg) throw err;
    const status = e.response?.status;
    const transient = (status != null && RETRYABLE_STATUS.has(status)) || (status == null && RETRYABLE_CODE.has(String(e.code)));
    const attempt = (cfg.__erpAttempt ?? 1) + 1;
    if (!transient || attempt > MAX_ATTEMPTS) throw err;
    cfg.__erpAttempt = attempt;
    await sleep(attempt === 2 ? 500 : 1500);
    return inst.request(cfg);
  });
  return inst;
}

// ── Shared number and date helpers ──────────────────────────────────────────────────────────────

export const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

// `+ 0` turns -0 into 0. Ties round away from zero, as Intl does in the browser.
export const round2 = (n: number): number => (n < 0 ? -1 : 1) * Math.round(Math.abs(n) * 100) / 100 + 0;

export const str = (v: unknown): string | null => {
  const s = String(v ?? '').trim();
  return s && s !== 'null' ? s : null;
};

/** Calendar date (YYYY-MM-DD) in IST for an ISO instant. ERP posting dates are IST calendar days. */
export function istDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

/** One failed company, as the browser sees it. The ERP's own error text stays in the server log. */
export interface SourceStatus {
  company: string;
  ok: boolean;
}

export function failedNote(sources: SourceStatus[]): string | null {
  const failed = sources.filter((s) => !s.ok);
  return failed.length
    ? `Not included: ${failed.map((f) => f.company).join(', ')} could not be read from ERP. Figures are incomplete.`
    : null;
}

/**
 * Run a saved ERPNext query report and return its rows and column definitions.
 *
 * `keepRow` decides which rows are real: the registers and ledgers keep rows with a voucher (dropping
 * ERP's trailing Total row), the P&L keeps every object row.
 */
export async function runQueryReport(
  api: AxiosInstance,
  reportName: string,
  filters: Record<string, string | number>,
  keepRow: (r: Record<string, unknown>) => boolean = (r) => !!r.voucher_no,
): Promise<{ rows: Array<Record<string, unknown>>; columns: ReportColumn[] }> {
  const res = await api.get('/api/method/frappe.desk.query_report.run', {
    params: {
      report_name: reportName,
      filters: JSON.stringify(filters),
      // Without this a site with background jobs can return a prepared-report handle instead of rows.
      ignore_prepared_report: 1,
    },
  });
  if (typeof res.data === 'string') {
    throw new Error(`${reportName}: expected JSON, got an HTML/text response (auth or edge error)`);
  }
  const msg = (res.data as { message?: { result?: unknown; columns?: unknown } })?.message;
  if (!msg || !Array.isArray(msg.result)) throw new Error(`${reportName}: response had no result array`);
  const rows = (msg.result as unknown[])
    .filter((r): r is Record<string, unknown> => !!r && !Array.isArray(r) && keepRow(r as Record<string, unknown>));
  return { rows, columns: Array.isArray(msg.columns) ? (msg.columns as ReportColumn[]) : [] };
}

export interface ReportColumn { label?: string; fieldname?: string; fieldtype?: string }

/** Small time-boxed cache shared by the finance modules. Every page re-reads on each filter change. */
export function makeCache<T>(ttlMs = 60_000, max = 32) {
  const store = new Map<string, { at: number; value: T }>();
  return {
    get(key: string): T | undefined {
      const hit = store.get(key);
      return hit && Date.now() - hit.at < ttlMs ? hit.value : undefined;
    },
    set(key: string, value: T): void {
      if (store.size >= max) store.delete(store.keys().next().value as string);
      store.set(key, { at: Date.now(), value });
    },
  };
}
