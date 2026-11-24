// ====================================================================================================
// Who may open Finance, and what a Finance request may ask for.
//
// Copied from P91Elite (services/finance/finance-rules.ts). Pure (no db, no network).
//
// The ONLY change from P91 is the company scope: Just Signs instead of Plus91. The NSM rules
// (pagesFor / canViewFinanceEndpoint / billOnly) are P91's own, unchanged.
//
// INPUT: every parameter is validated to a closed set or a bounded range. Anything else is a 400,
// never passed through to ERP.
// ====================================================================================================

/**
 * ROLE TABLE — the one place that decides who sees what. To widen a role later, edit its row.
 *
 *   pages     — the page's own views, in sidebar order (/api/finance/me -> pages)
 *   endpoints — first path segment under /api/finance this role may call; null = every endpoint.
 *               Anything not listed is a 403 on the server, not just a hidden button.
 *   billOnly  — Accounts Receivable is the bill-wise grid only, and bill-wise is held to
 *               kind=receivable (no payable).
 *   scopes    — the Company choices (keys of SCOPE_COMPANIES below).
 */
export const ROLE_TABLE = {
  admin: {
    label: 'Admin',
    pages: ['profit', 'sales', 'purchase', 'receivable', 'payable', 'stock'],
    endpoints: null,
    billOnly: false,
    scopes: ['justsigns'],
  },
  // Same as P91's NSM: Sales, and Accounts Receivable as the bill-wise grid only.
  nsm: {
    label: 'NSM',
    pages: ['sales', 'receivable'],
    endpoints: ['app', 'me', 'health', 'sales', 'bill-wise', 'bill-wise-parties'],
    billOnly: true,
    scopes: ['justsigns'],
  },
} as const satisfies Record<string, {
  label: string; pages: readonly string[]; endpoints: readonly string[] | null; billOnly: boolean; scopes: readonly string[];
}>;

export type FinanceRole = keyof typeof ROLE_TABLE;
export const FINANCE_ROLES = Object.keys(ROLE_TABLE) as FinanceRole[];

type U = { role?: unknown } | null | undefined;

function rowFor(user: U) {
  const role = String(user?.role ?? '');
  return (FINANCE_ROLES as string[]).includes(role) ? ROLE_TABLE[role as FinanceRole] : null;
}

export function canViewFinance(user: U): boolean {
  return !!user && rowFor(user) !== null;
}

export function roleLabel(user: U): string {
  return rowFor(user)?.label ?? '';
}

/** The page's own views, per role, in sidebar order. */
export function pagesFor(user: U): string[] {
  return [...(rowFor(user)?.pages ?? [])];
}

/** An NSM's Accounts Receivable is the bill-wise grid and nothing else. */
export function billOnly(user: U): boolean {
  return rowFor(user)?.billOnly ?? false;
}

/** canViewFinance, narrowed to one endpoint (the first path segment under /api/finance). */
export function canViewFinanceEndpoint(user: U, endpoint: string): boolean {
  const row = rowFor(user);
  if (!row) return false;
  return row.endpoints === null || (row.endpoints as readonly string[]).includes(endpoint);
}

// ── Company and brand ───────────────────────────────────────────────────────────────────────────

/** The page's Company choices and the ERP company behind each. */
const SCOPE_COMPANIES: Record<string, { companies: string[]; brands: string[] }> = {
  justsigns: { companies: ['justsigns'], brands: ['JustSigns'] },
};

/** The Company choices a user may make. */
export function scopesFor(user: U): string[] {
  return [...(rowFor(user)?.scopes ?? [])];
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * company ('all' | 'justsigns') and brand ('all' | one brand of those companies),
 * resolved against what this user may see. 'all' means all of THEIR companies, never more.
 */
export function resolveScope(
  companyValue: unknown,
  brandValue: unknown,
  allowed: readonly string[],
): Parsed<{ companies: string[]; brand: string }> {
  const c = String(companyValue ?? 'all').trim().toLowerCase() || 'all';
  const chosen = c === 'all' ? [...allowed] : allowed.includes(c) ? [c] : null;
  if (!chosen) return { ok: false, error: 'That company is not open to your account.' };
  const companies = chosen.flatMap((k) => SCOPE_COMPANIES[k].companies);
  const brands = [...new Set(chosen.flatMap((k) => SCOPE_COMPANIES[k].brands))];
  const b = String(brandValue ?? 'all').trim() || 'all';
  if (b !== 'all' && !brands.includes(b)) return { ok: false, error: `brand must be all or one of ${brands.join(', ')}` };
  // A single-brand choice (Just Signs alone) is that brand.
  return { ok: true, value: { companies, brand: b === 'all' && brands.length === 1 ? brands[0] : b } };
}

// ── Dates ───────────────────────────────────────────────────────────────────────────────────────

const YMD = /^\d{4}-\d{2}-\d{2}$/;
/** Nothing in any company's books is older than this. */
const EARLIEST = '2015-01-01';
/** Wide enough for two financial years side by side; anything longer is refused. */
export const MAX_WINDOW_DAYS = 731;
export const MAX_PARTIES = 1000;
const IST_MS = 5.5 * 3600e3;

export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_MS).toISOString().slice(0, 10);
}

/** Calendar date (YYYY-MM-DD) in IST for an instant. */
export function istDayOf(ms: number): string {
  return new Date(ms + IST_MS).toISOString().slice(0, 10);
}

/** A real calendar date between EARLIEST and `latest` (default today, IST), or null. */
export function parseDay(value: unknown, now: Date = new Date(), latest: string = istToday(now)): string | null {
  const v = String(value ?? '').trim();
  if (!YMD.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  // Rejects 2026-02-31 and the like: Date rolls them over, so the round trip no longer matches.
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  if (v < EARLIEST || v > latest) return null;
  return v;
}

/** 31 March closing the financial year `day` falls in. */
export function financialYearEnd(day: string): string {
  const start = financialYearStart(day);
  return `${Number(start.slice(0, 4)) + 1}-03-31`;
}

/**
 * One bound of the page's window: a bare YYYY-MM-DD (an IST calendar day) or a full ISO instant such
 * as 2026-11-16T00:00:00+05:30, which is what the page sends. Returns epoch ms, or null if unusable.
 * `edge` picks the start or end of a bare day.
 */
function parseBound(value: unknown, edge: 'start' | 'end', now: Date): number | null {
  const v = String(value ?? '').trim();
  if (!v) return null;
  if (YMD.test(v)) {
    if (!parseDay(v, now)) return null;
    return Date.parse(`${v}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}+05:30`);
  }
  // Only an ISO date-time with an explicit offset or Z; nothing free-form reaches Date.parse.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(v)) return null;
  const ms = Date.parse(v);
  return Number.isNaN(ms) ? null : ms;
}

/** Fallback windows when the page sends no bounds (mirrors the STEK dashboard's RANGE_MS). */
const RANGE_MS: Record<string, number> = {
  '1h': 3600e3, '24h': 86400e3, '7d': 7 * 86400e3, '30d': 30 * 86400e3, '3m': 92 * 86400e3,
};

/**
 * The page's window as IST calendar days. start/end win; otherwise `range` (default 3m) ending today.
 * The end may be today at the latest; the window may span at most MAX_WINDOW_DAYS.
 */
export function parseWindow(
  query: { start?: unknown; end?: unknown; range?: unknown },
  now: Date = new Date(),
): Parsed<{ from: string; to: string }> {
  const hasStart = query.start !== undefined && query.start !== '';
  const hasEnd = query.end !== undefined && query.end !== '';
  let since: number | null;
  let until: number | null;
  if (hasStart || hasEnd) {
    since = hasStart ? parseBound(query.start, 'start', now) : null;
    until = hasEnd ? parseBound(query.end, 'end', now) : null;
    if (hasStart && since === null) return { ok: false, error: 'start must be a date (YYYY-MM-DD) or an ISO date-time' };
    if (hasEnd && until === null) return { ok: false, error: 'end must be a date (YYYY-MM-DD) or an ISO date-time' };
    if (since === null) since = (until as number) - RANGE_MS['3m'];
    // A start with no end covers that one day, as on the STEK dashboard.
    if (until === null) until = Date.parse(`${istDayOf(since)}T23:59:59.999+05:30`);
  } else {
    const r = String(query.range ?? '3m');
    until = now.getTime();
    since = until - (RANGE_MS[r] ?? RANGE_MS['3m']);
  }
  const from = istDayOf(since);
  let to = istDayOf(until);
  const today = istToday(now);
  if (to > today) to = today;
  if (from < EARLIEST) return { ok: false, error: 'start is too early' };
  if (from > to) return { ok: false, error: 'start is after end' };
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (days > MAX_WINDOW_DAYS) return { ok: false, error: `The window can be at most ${MAX_WINDOW_DAYS} days` };
  return { ok: true, value: { from, to } };
}

/**
 * Profit & Loss takes plain from/to dates; `to` defaults to today, `from` to the financial year start.
 * The page always asks for the WHOLE financial year (1 April to 31 March), so `to` may run to the end of
 * the current financial year — ERP answers the months still to come with zeros, as the STEK dashboard
 * showed them. Nothing beyond that year's 31 March is accepted.
 */
export function parseDates(query: { from?: unknown; to?: unknown }, now: Date = new Date()): Parsed<{ from: string; to: string }> {
  const latest = financialYearEnd(istToday(now));
  const to = query.to === undefined || query.to === '' ? istToday(now) : parseDay(query.to, now, latest);
  if (!to) return { ok: false, error: `to must be a date (YYYY-MM-DD) no later than ${latest}` };
  const from = query.from === undefined || query.from === '' ? financialYearStart(to) : parseDay(query.from, now, latest);
  if (!from) return { ok: false, error: `from must be a date (YYYY-MM-DD) no later than ${latest}` };
  if (from > to) return { ok: false, error: 'from is after to' };
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > MAX_WINDOW_DAYS) {
    return { ok: false, error: `The window can be at most ${MAX_WINDOW_DAYS} days` };
  }
  return { ok: true, value: { from, to } };
}

/** 1 April of the financial year `day` falls in. */
export function financialYearStart(day: string): string {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  return `${m >= 4 ? y : y - 1}-04-01`;
}

/** parties: 1..1000, or 'all' / 0 for every party. */
export function parseParties(value: unknown, fallback: number): Parsed<number> {
  if (value === undefined || value === '') return { ok: true, value: fallback };
  const v = String(value).trim().toLowerCase();
  if (v === 'all' || v === '0') return { ok: true, value: 0 };
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PARTIES) {
    return { ok: false, error: `parties must be all or a whole number from 1 to ${MAX_PARTIES}` };
  }
  return { ok: true, value: n };
}

export function parseSign<T extends string>(value: unknown, allowed: readonly T[], fallback: T): Parsed<T> {
  if (value === undefined || value === '') return { ok: true, value: fallback };
  const v = String(value);
  return (allowed as readonly string[]).includes(v)
    ? { ok: true, value: v as T }
    : { ok: false, error: `sign must be one of ${allowed.join(', ')}` };
}

export function parseBucket(value: unknown): Parsed<number | null> {
  if (value === undefined || value === '') return { ok: true, value: null };
  const v = String(value);
  return /^[0-4]$/.test(v) ? { ok: true, value: Number(v) } : { ok: false, error: 'bucket must be 0 to 4' };
}

/**
 * Bill-wise party filter: a JSON array of ERP party names (at most 200, each a plain string of at
 * most 140 characters). Absent or empty means every party.
 */
export function parsePartyList(value: unknown): Parsed<string[]> {
  if (value === undefined || value === '') return { ok: true, value: [] };
  let list: unknown;
  try { list = JSON.parse(String(value)); } catch { return { ok: false, error: 'party must be a JSON array' }; }
  if (!Array.isArray(list) || list.length > 200 || !list.every((p) => typeof p === 'string' && p.length <= 140)) {
    return { ok: false, error: 'party must be a JSON array of at most 200 names' };
  }
  return { ok: true, value: list as string[] };
}

/**
 * Fixed-window request counter, per user. In memory: the site runs as one process, and a restart
 * resetting the counters is harmless for a limit whose job is to stop a runaway script or a scraper.
 */
export function makeRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { start: number; count: number }>();
  return (key: string, now: number = Date.now()): boolean => {
    const cur = hits.get(key);
    if (!cur || now - cur.start >= windowMs) {
      if (hits.size > 5000) hits.clear();
      hits.set(key, { start: now, count: 1 });
      return true;
    }
    cur.count++;
    return cur.count <= limit;
  };
}
