import {
  erpHttp, failedNote, istDay, makeCache, num, round2, runQueryReport, tenantsFor,
  type FinanceCompanyKey, type ReportColumn, type SourceStatus,
} from './erp-client';

// ====================================================================================================
// ACCOUNTS RECEIVABLE and ACCOUNTS PAYABLE — what is still owed AS ON one date.
//
// Ported from the STEK dashboard (erp-party-ledger.ts, erp-receivable.ts, erp-payable.ts). The
// arithmetic is unchanged; the per-document rows stay on the server.
//
// These are not registers. They take a single report_date and return the open items standing on it,
// including documents raised long before it. Ageing comes from ERP's own range1..range5 so the page and
// the ERP screen cannot disagree about what "61-90 days" means. Rows include Journal Entries and
// unallocated Payment Entries with NEGATIVE outstanding (advances); they are kept, because dropping them
// would overstate the balance.
// ====================================================================================================

export interface LedgerSpec {
  reportName: 'Accounts Receivable' | 'Accounts Payable';
  partyNameField: string;
}

export const RECEIVABLE_SPEC: LedgerSpec = { reportName: 'Accounts Receivable', partyNameField: 'customer_name' };
export const PAYABLE_SPEC: LedgerSpec = { reportName: 'Accounts Payable', partyNameField: 'supplier_name' };

interface LedgerRow {
  party: string;
  invoiced: number;
  paid: number;
  creditNote: number;
  outstanding: number;
  age: number;
  buckets: number[];
}

interface SignTotals { documents: number; parties: number; amount: number }

export interface PartyLedger {
  asOn: string;
  totals: {
    documents: number;
    invoiced: number;
    paid: number;
    creditNote: number;
    outstanding: number;
    overdue: number;
    notDue: number;
    onAccount: number;
    /** Still owed (positive) and credit balances / advances (negative), reported apart. */
    positive: SignTotals;
    negative: SignTotals;
  };
  /** A "Not due" row first, then ERP's own buckets, so the column adds up to outstanding. */
  ageing: Array<{
    label: string;
    documents: number;
    /** Items with an amount OWED in this bucket (positive part only). */
    owedDocuments: number;
    outstanding: number;
    positive: number;
    negative: number;
    bucket: number | null;
  }>;
  byParty: Array<{ party: string; documents: number; outstanding: number; oldestAge: number }>;
  /**
   * One entry per open item, carrying ONLY its ageing buckets: the page counts items per bucket from
   * these. Party, voucher and amounts per item are not sent; the bill-wise grid is where bills are read.
   */
  rows: Array<{ buckets: number[] }>;
  partyCount: number;
  scopeNote: string | null;
  sources: SourceStatus[];
}

export interface LedgerOptions {
  /** Companies to read, already narrowed to what the caller may see. */
  companies: readonly FinanceCompanyKey[];
  /** The as-on date, YYYY-MM-DD (IST). */
  asOn: string;
  partiesLimit: number;
  /** Rank by one ERP bucket (0..4) instead of the whole balance. */
  bucketIndex: number | null;
  sign: 'positive' | 'negative' | 'all';
}

const RANGES = { range1: 30, range2: 60, range3: 90, range4: 120 };
const BUCKET_FIELDS = ['range1', 'range2', 'range3', 'range4', 'range5'];

function labelsFor(columns: ReportColumn[]): string[] {
  const fallback = ['0-30', '31-60', '61-90', '91-120', '120-Above'];
  return BUCKET_FIELDS.map((f, i) => {
    const c = columns.find((x) => x.fieldname === f);
    return (c?.label ?? '').trim() || fallback[i];
  });
}

const cache = makeCache<PartyLedger>();

export async function getPartyLedger(spec: LedgerSpec, opts: LedgerOptions): Promise<PartyLedger> {
  const asOn = opts.asOn || istDay(new Date().toISOString());
  const key = [spec.reportName, opts.companies.join(','), asOn, opts.partiesLimit, opts.bucketIndex ?? 'x', opts.sign].join('|');
  const hit = cache.get(key);
  if (hit) return hit;

  const tenants = tenantsFor(opts.companies);
  let ageingLabels: string[] = [];

  const settled = await Promise.allSettled(tenants.map(async (t): Promise<LedgerRow[]> => {
    const { rows: raw, columns } = await runQueryReport(erpHttp(t.site), spec.reportName, {
      company: t.company,
      report_date: asOn,
      ageing_based_on: 'Posting Date',
      calculate_ageing_with: 'Report Date',
      ...RANGES,
    });
    if (!ageingLabels.length) ageingLabels = labelsFor(columns);
    return raw.map((r) => ({
      party: String(r[spec.partyNameField] ?? r.party ?? '—'),
      invoiced: num(r.invoiced),
      paid: num(r.paid),
      creditNote: num(r.credit_note),
      outstanding: num(r.outstanding),
      age: num(r.age),
      buckets: BUCKET_FIELDS.map((f) => num(r[f])),
    }));
  }));

  const sources: SourceStatus[] = [];
  let rows: LedgerRow[] = [];
  settled.forEach((r, idx) => {
    const t = tenants[idx];
    if (r.status === 'fulfilled') {
      sources.push({ company: t.company, ok: true });
      rows = rows.concat(r.value);
    } else {
      // An outage must never read as "nothing is owed".
      console.error(`[finance] ${spec.reportName} (${t.company}) failed:`, (r.reason as Error)?.message ?? r.reason);
      sources.push({ company: t.company, ok: false });
    }
  });
  if (!ageingLabels.length) ageingLabels = labelsFor([]);

  const sum = (pick: (r: LedgerRow) => number): number => round2(rows.reduce((a, r) => a + pick(r), 0));
  const overdueRows = rows.filter((r) => r.age > 0 && r.outstanding > 0);
  const positiveRows = rows.filter((r) => r.outstanding > 0);
  const negativeRows = rows.filter((r) => r.outstanding < 0);
  const outstanding = sum((r) => r.outstanding);
  const overdue = round2(overdueRows.reduce((a, r) => a + r.outstanding, 0));
  const onAccount = round2(negativeRows.reduce((a, r) => a + r.outstanding, 0));
  const totals: PartyLedger['totals'] = {
    documents: rows.length,
    invoiced: sum((r) => r.invoiced),
    paid: sum((r) => r.paid),
    creditNote: sum((r) => r.creditNote),
    outstanding,
    overdue,
    onAccount,
    // The residual, so the three cards add up to Outstanding exactly.
    notDue: round2(outstanding - overdue - onAccount),
    positive: {
      documents: positiveRows.length,
      parties: new Set(positiveRows.map((r) => r.party)).size,
      amount: round2(positiveRows.reduce((a, r) => a + r.outstanding, 0)),
    },
    negative: {
      documents: negativeRows.length,
      parties: new Set(negativeRows.map((r) => r.party)).size,
      amount: onAccount,
    },
  };

  const erpBuckets = ageingLabels.map((label, i) => {
    const inBucket = rows.filter((r) => (r.buckets[i] ?? 0) !== 0);
    const amt = (f: (n: number) => boolean) => inBucket.reduce((a, r) => a + (f(r.buckets[i]) ? r.buckets[i] : 0), 0);
    return {
      label,
      documents: inBucket.length,
      owedDocuments: inBucket.filter((r) => r.buckets[i] > 0).length,
      outstanding: round2(inBucket.reduce((a, r) => a + (r.buckets[i] ?? 0), 0)),
      positive: round2(amt((n) => n > 0)),
      negative: round2(amt((n) => n < 0)),
      bucket: i as number | null,
    };
  });
  // ERP's buckets cover only what is past due, so they add up to less than outstanding. The gap is the
  // not-yet-due balance, taken PER ROW so an item in credit is not counted as owed.
  const notDuePerRow = rows
    .map((r) => r.outstanding - r.buckets.reduce((a, b) => a + (b ?? 0), 0))
    .filter((residual) => residual !== 0);
  const ageing: PartyLedger['ageing'] = [
    {
      label: 'Not due',
      documents: notDuePerRow.length,
      owedDocuments: 0,
      outstanding: round2(notDuePerRow.reduce((a, x) => a + x, 0)),
      positive: round2(notDuePerRow.reduce((a, x) => a + (x > 0 ? x : 0), 0)),
      negative: round2(notDuePerRow.reduce((a, x) => a + (x < 0 ? x : 0), 0)),
      bucket: null,
    },
    ...erpBuckets,
  ];

  const bi = opts.bucketIndex;
  const rankValue = (r: LedgerRow): number => (bi == null ? r.outstanding : (r.buckets[bi] ?? 0));
  const partyAcc = new Map<string, { documents: number; outstanding: number; oldestAge: number }>();
  for (const r of rows) {
    const v = rankValue(r);
    if (v === 0) continue;
    if (opts.sign === 'positive' && v <= 0) continue;
    if (opts.sign === 'negative' && v >= 0) continue;
    const c = partyAcc.get(r.party) ?? { documents: 0, outstanding: 0, oldestAge: 0 };
    c.documents++;
    c.outstanding += v;
    c.oldestAge = Math.max(c.oldestAge, r.age);
    partyAcc.set(r.party, c);
  }
  const ranked = [...partyAcc.entries()]
    .map(([party, v]) => ({ party, documents: v.documents, outstanding: v.outstanding, oldestAge: v.oldestAge }))
    .sort((a, b) => (opts.sign === 'negative' ? a.outstanding - b.outstanding : b.outstanding - a.outstanding));

  const value: PartyLedger = {
    asOn,
    totals,
    ageing,
    byParty: opts.partiesLimit > 0 ? ranked.slice(0, opts.partiesLimit) : ranked,
    rows: rows.map((r) => ({ buckets: r.buckets })),
    partyCount: ranked.length,
    scopeNote: failedNote(sources),
    sources,
  };
  if (sources.every((s) => s.ok)) cache.set(key, value);
  return value;
}

export const getReceivable = (opts: LedgerOptions) => getPartyLedger(RECEIVABLE_SPEC, opts);
export const getPayable = (opts: LedgerOptions) => getPartyLedger(PAYABLE_SPEC, opts);

