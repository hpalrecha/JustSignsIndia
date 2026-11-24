/**
 * Finance — the P91Elite Finance module (STEK dashboard Accounts views), served on the Just Signs site,
 * reading the Just Signs ERPNext. Copied from P91Elite artifacts/api-server/src/routes/finance-routes.ts.
 *
 *   GET /api/finance/app                     the page itself (server/finance/app.html)
 *   GET /api/finance/me                      role, pages, companies, bill-only flag for the page
 *   GET /api/finance/health                  the "updated Nm ago" badge
 *   GET /api/finance/sales|purchase          ?start&end&company&brand&parties&sign
 *   GET /api/finance/profit-loss             ?from&to&company
 *   GET /api/finance/receivable|payable      ?start&end&company&brand&parties&bucket&sign
 *   GET /api/finance/bill-wise               ?kind&start&end&company&partyType&ageing&party
 *   GET /api/finance/bill-wise-parties       ?kind&company&partyType
 *   GET /api/finance/stock-balance           ?start&end&company&erpCompany
 *   GET /api/finance/stock-balance/download  ?format=pdf|xlsx&…&filters&sort
 *
 * Who sees what: ROLE_TABLE in finance-rules.ts (admin: everything; nsm: Sales + bill-wise receivable).
 *
 * Security, in the order a request meets it:
 *   1. isErpAuthenticated — a Finance (/erp) session, else 401.
 *   2. canViewFinanceEndpoint — role and endpoint, else 403. The menu hides the rest, but this check
 *      is the boundary.
 *   3. A per-user rate limit, else 429.
 *   4. Every parameter validated to a closed set or a bounded range, else 400.
 *   5. Responses are Cache-Control: no-store.
 *   6. ERP errors are logged here and answered with a generic message.
 *   7. Each request is written to finance_access_log (who, role, what, when, result).
 *
 * Read-only throughout: the ERP client refuses any request that is not a GET.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { isErpAuthenticated } from '../auth';
import { pool } from '../db';
import { loadAppHtml } from './app-html';
import { FinanceNotConfigured, type FinanceCompanyKey } from './erp-client';
import {
  billOnly, canViewFinanceEndpoint, makeRateLimiter, roleLabel, pagesFor, parseBucket, parseDates, parseParties,
  parsePartyList, parseSign, parseWindow, resolveScope, scopesFor, type Parsed,
} from './finance-rules';
import { getPurchaseRegister, getSalesRegister } from './registers';
import { getPayable, getReceivable } from './ledgers';
import { getProfitLoss } from './profit-loss';
import { PartyTypeRefused, getBillWise, getParties, getPartyTypes, type BillKind } from './bill-wise';
import { STOCK_COLUMNS, getStockBalance, stockCompanies } from './stock';
import { buildPdf, buildXlsx, exportFileName, type ViewState } from './stock-export';

const router = Router();

// A page view fans out (Sales: 10 reads; Receivable: about a dozen) and Sales refreshes itself every
// minute, so 600 per 5 minutes is a long working session — and far below a script pulling the books.
const allowRequest = makeRateLimiter(600, 5 * 60_000);

const QUERY_KEYS = [
  'view', 'company', 'brand', 'start', 'end', 'range', 'from', 'to', 'parties', 'sign', 'bucket',
  'kind', 'partyType', 'ageing', 'erpCompany', 'format',
] as const;

function audit(req: Request, res: Response): void {
  const u = req.erpUser;
  const query: Record<string, string> = {};
  for (const k of QUERY_KEYS) {
    if (req.query[k] !== undefined) query[k] = String(req.query[k]).slice(0, 60);
  }
  if (req.query.party !== undefined) query.party = '(list)';
  const endpoint = req.path.slice(0, 60);
  res.on('finish', () => {
    pool.query(
      `INSERT INTO finance_access_log (username, role, endpoint, query, status, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [u?.username ?? null, u?.role ?? null, endpoint, JSON.stringify(query), res.statusCode, String(req.ip ?? '').slice(0, 64)],
    ).catch((e) => console.error('[finance] access log insert failed:', e?.message ?? e));
  });
}

type U = { role?: unknown } | undefined;

function guard(req: Request, res: Response, next: NextFunction) {
  res.set({ 'Cache-Control': 'no-store, private', Pragma: 'no-cache', Expires: '0' });
  audit(req, res);
  const endpoint = req.path.split('/')[1] ?? '';
  if (!canViewFinanceEndpoint(req.erpUser as U, endpoint)) {
    return res.status(403).json({ error: 'This Finance page is not open to your account.' });
  }
  const who = String(req.erpUser?.username ?? req.ip);
  if (!allowRequest(who)) {
    return res.status(429).json({ error: 'Too many requests. Wait a minute and try again.' });
  }
  return next();
}

router.use(isErpAuthenticated, guard);

/** Turns a validation result into a 400, or returns the value. */
function take<T>(res: Response, parsed: Parsed<T>): T | undefined {
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return undefined;
  }
  return parsed.value;
}

/** company + brand, inside what this user may read. */
function scope(req: Request, res: Response) {
  const v = take(res, resolveScope(req.query.company, req.query.brand, scopesFor(req.erpUser as U)));
  return v ? { companies: v.companies as FinanceCompanyKey[], brand: v.brand } : undefined;
}

/** When the last ERP read succeeded, for the health badge. */
let lastOkAt: number | null = null;

/** Runs a read and answers with its result; ERP failures become a generic 502/503. */
async function respond(res: Response, label: string, read: () => Promise<unknown>) {
  try {
    const body = await read();
    lastOkAt = Date.now();
    return res.json(body);
  } catch (err) {
    if (err instanceof FinanceNotConfigured) {
      console.error(`[finance] ${label}: ERP is not configured —`, err.message);
      return res.status(503).json({ error: 'Finance is not connected to ERP yet.' });
    }
    if (err instanceof PartyTypeRefused) return res.status(400).json({ error: err.message });
    console.error(`[finance] ${label} failed:`, (err as Error)?.message ?? err);
    return res.status(502).json({ error: 'Could not read ERP just now. Try again in a minute.' });
  }
}

// ── The page ──────────────────────────────────────────────────────────────────────────────────

// Its own Content-Security-Policy: the page loads its fonts (Fontshare, Google Fonts) and its date
// picker (flatpickr, jsDelivr), and runs its script inline. It may only be framed by this site itself
// (the /erp pages), and may only call back to this origin.
const APP_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com https://cdn.jsdelivr.net",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

router.get('/app', async (_req, res) => {
  try {
    const html = await loadAppHtml();
    res.set({ 'Content-Security-Policy': APP_CSP, 'X-Frame-Options': 'SAMEORIGIN' });
    res.type('html').send(html);
  } catch (err) {
    console.error('[finance] app.html could not be loaded:', (err as Error)?.message ?? err);
    res.status(500).json({ error: 'The Finance page is unavailable.' });
  }
});

router.get('/me', (req, res) => {
  const u = req.erpUser as U;
  res.json({
    // The page's light accounts theme and its Accounts sidebar both key off this role.
    role: 'accounts',
    roleLabel: roleLabel(u),
    pages: pagesFor(u),
    companies: scopesFor(u),
    billOnly: billOnly(u),
  });
});

router.get('/health', (_req, res) => {
  res.json({ lastEventAgeMs: lastOkAt === null ? null : Date.now() - lastOkAt, supabaseOk: true });
});

// ── Registers ─────────────────────────────────────────────────────────────────────────────────

for (const kind of ['sales', 'purchase'] as const) {
  router.get(`/${kind}`, async (req, res) => {
    const sc = scope(req, res); if (!sc) return;
    const win = take(res, parseWindow(req.query)); if (!win) return;
    const parties = take(res, parseParties(req.query.parties ?? req.query.customers, 10)); if (parties === undefined) return;
    const sign = take(res, parseSign(req.query.sign, ['positive', 'negative'] as const, 'positive')); if (!sign) return;
    const read = kind === 'sales' ? getSalesRegister : getPurchaseRegister;
    return respond(res, kind, async () => ({
      range: { since: win.from, until: win.to }, company: String(req.query.company ?? 'all'), brand: sc.brand,
      ...(await read({ companies: sc.companies, brand: sc.brand, from: win.from, to: win.to, partiesLimit: parties, sign })),
    }));
  });
}

router.get('/profit-loss', async (req, res) => {
  const sc = scope(req, res); if (!sc) return;
  const dates = take(res, parseDates(req.query)); if (!dates) return;
  return respond(res, 'profit-loss', async () => ({
    company: String(req.query.company ?? 'all'),
    ...(await getProfitLoss({ companies: sc.companies, from: dates.from, to: dates.to })),
  }));
});

// ── Ledgers (as on the window's end date) ─────────────────────────────────────────────────────

for (const kind of ['receivable', 'payable'] as const) {
  router.get(`/${kind}`, async (req, res) => {
    const sc = scope(req, res); if (!sc) return;
    const win = take(res, parseWindow(req.query)); if (!win) return;
    const parties = take(res, parseParties(req.query.parties, 10)); if (parties === undefined) return;
    const bucket = take(res, parseBucket(req.query.bucket)); if (bucket === undefined) return;
    const sign = take(res, parseSign(req.query.sign, ['positive', 'negative', 'all'] as const, 'all')); if (!sign) return;
    const read = kind === 'receivable' ? getReceivable : getPayable;
    return respond(res, kind, async () => ({
      company: String(req.query.company ?? 'all'), brand: sc.brand,
      ...(await read({ companies: sc.companies, asOn: win.to, partiesLimit: parties, bucketIndex: bucket, sign })),
    }));
  });
}

// ── Bill-wise grid ────────────────────────────────────────────────────────────────────────────

/** kind=receivable|payable; an NSM is held to receivable. */
function billKind(req: Request, res: Response): BillKind | undefined {
  const k = String(req.query.kind ?? '');
  if (k !== 'receivable' && k !== 'payable') {
    res.status(400).json({ error: 'kind must be receivable or payable' });
    return undefined;
  }
  if (k === 'payable' && billOnly(req.erpUser as U)) {
    res.status(403).json({ error: 'This Finance page is not open to your account.' });
    return undefined;
  }
  return k;
}

/** A party type name from the request. Checked against ERP's own list before it is used. */
function partyTypeParam(value: unknown): string | undefined {
  const v = String(value ?? '').trim();
  return v && v.length <= 60 && /^[A-Za-z][A-Za-z ]*$/.test(v) ? v : undefined;
}

router.get('/bill-wise', async (req, res) => {
  const kind = billKind(req, res); if (!kind) return;
  const sc = scope(req, res); if (!sc) return;
  const win = take(res, parseWindow(req.query)); if (!win) return;
  const parties = take(res, parsePartyList(req.query.party)); if (!parties) return;
  if (req.query.partyType !== undefined && req.query.partyType !== '' && !partyTypeParam(req.query.partyType)) {
    return res.status(400).json({ error: 'partyType is not valid' });
  }
  const ageing = req.query.ageing === 'Due Date' ? 'Due Date' : 'Posting Date';
  return respond(res, 'bill-wise', async () => ({
    company: String(req.query.company ?? 'all'), brand: sc.brand,
    ...(await getBillWise({
      kind, companies: sc.companies, asOn: win.to, partyType: partyTypeParam(req.query.partyType), parties, ageingBasedOn: ageing,
    })),
  }));
});

router.get('/bill-wise-parties', async (req, res) => {
  const kind = billKind(req, res); if (!kind) return;
  const sc = scope(req, res); if (!sc) return;
  return respond(res, 'bill-wise-parties', async () => {
    const partyTypes = await getPartyTypes(kind, sc.companies);
    const partyType = partyTypeParam(req.query.partyType) ?? partyTypes[0];
    return { partyTypes, partyType, parties: await getParties(kind, sc.companies, partyType) };
  });
});

// ── Stock balance ─────────────────────────────────────────────────────────────────────────────

/** The ERP company to show: ?erpCompany (one of the fixed list), else the first in the chosen scope. */
function stockChoice(req: Request, res: Response) {
  const allowed = scopesFor(req.erpUser as U);
  let all;
  try {
    all = stockCompanies();
  } catch (err) {
    if (!(err instanceof FinanceNotConfigured)) throw err;
    console.error('[finance] stock-balance: ERP is not configured —', err.message);
    res.status(503).json({ error: 'Finance is not connected to ERP yet.' });
    return undefined;
  }
  const entitled = all.filter((c) => allowed.includes(c.key));
  const wanted = String(req.query.erpCompany ?? '').trim();
  const requestedScope = String(req.query.company ?? '').trim().toLowerCase();
  const chosen = wanted
    ? entitled.find((c) => c.name === wanted)
    : entitled.find((c) => c.key === requestedScope) ?? entitled[0];
  if (!chosen) {
    res.status(400).json({ error: 'That company is not open to your account.' });
    return undefined;
  }
  const win = take(res, parseWindow(req.query)); if (!win) return undefined;
  return { chosen, entitled, asOn: win.to };
}

router.get('/stock-balance', async (req, res) => {
  const pick = stockChoice(req, res); if (!pick) return;
  return respond(res, 'stock-balance', async () => ({
    ...(await getStockBalance({ company: pick.chosen, asOn: pick.asOn })),
    companies: pick.entitled.map((c) => ({ name: c.name, key: c.key })),
  }));
});

router.get('/stock-balance/download', async (req, res) => {
  const format = String(req.query.format ?? '');
  if (format !== 'pdf' && format !== 'xlsx') return res.status(400).json({ error: 'format must be pdf or xlsx' });
  const pick = stockChoice(req, res); if (!pick) return;
  // The download is what is on screen: the same column filters and sort, on the same five columns only.
  const known = new Set<string>(STOCK_COLUMNS);
  const view: ViewState = { filters: {}, sort: null };
  const rawFilters = String(req.query.filters ?? '').trim();
  if (rawFilters) {
    let parsed: unknown;
    try { parsed = JSON.parse(rawFilters); } catch { return res.status(400).json({ error: 'filters must be a JSON object' }); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).length > 10) {
      return res.status(400).json({ error: 'filters must be a JSON object of at most 10 columns' });
    }
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!known.has(k) || typeof v !== 'string' || v.length > 200) {
        return res.status(400).json({ error: 'filters may only name shown columns, with text up to 200 characters' });
      }
      view.filters[k] = v;
    }
  }
  const rawSort = String(req.query.sort ?? '').trim();
  if (rawSort) {
    const m = rawSort.match(/^([a-z_]+):(asc|desc)$/);
    if (!m || !known.has(m[1])) return res.status(400).json({ error: 'sort must be <column>:<asc|desc> on a shown column' });
    view.sort = { field: m[1], dir: m[2] === 'desc' ? -1 : 1 };
  }
  try {
    const data = await getStockBalance({ company: pick.chosen, asOn: pick.asOn });
    const buf = format === 'pdf' ? await buildPdf(data, view) : await buildXlsx(data, view);
    lastOkAt = Date.now();
    res.set({
      'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${exportFileName(data, format)}"`,
    });
    return res.send(buf);
  } catch (err) {
    if (err instanceof FinanceNotConfigured) return res.status(503).json({ error: 'Finance is not connected to ERP yet.' });
    console.error('[finance] stock-balance download failed:', (err as Error)?.message ?? err);
    return res.status(502).json({ error: 'The file could not be built right now. Try again in a minute.' });
  }
});

export default router;
