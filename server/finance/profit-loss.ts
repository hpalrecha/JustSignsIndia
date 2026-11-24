import {
  erpHttp, failedNote, makeCache, num, round2, runQueryReport, tenantsFor,
  type FinanceCompanyKey, type SourceStatus,
} from './erp-client';

// ====================================================================================================
// PROFIT AND LOSS — ERPNext's own "Profit and Loss Statement", flattened to the leaf accounts.
//
// Ported from the STEK dashboard (erp-profit-loss.ts). The report is a tree returned as a flat list
// with `indent` and `is_group`. Only `is_group: 0` rows are money actually posted; group rows are
// subtotals, so listing both would double (and on the expense side triple) every figure. The side a
// leaf belongs to is found by walking the list and remembering the last indent-0 group, never by
// matching account names, which carry a per-company suffix.
//
// With both companies selected, accounts are added together by account_name, month by month.
// ====================================================================================================

export interface PlAccount {
  name: string;
  /** One figure per month, aligned with `months`. */
  amounts: number[];
  total: number;
}

export interface PlSide { accounts: PlAccount[]; totals: number[]; total: number }

export interface ProfitLoss {
  from: string;
  to: string;
  /** ERP's own month columns, e.g. { key: 'apr_2026', label: 'Apr 2026' }. */
  months: Array<{ key: string; label: string }>;
  income: PlSide;
  expense: PlSide;
  profit: number[];
  profitTotal: number;
  scopeNote: string | null;
  sources: SourceStatus[];
}

export interface ProfitLossOptions {
  /** Companies to read, already narrowed to what the caller may see. */
  companies: readonly FinanceCompanyKey[];
  /** Inclusive dates, YYYY-MM-DD. */
  from: string;
  to: string;
}

const MONTH_KEY = /^[a-z]{3}_\d{4}$/;
/** A total row has no indent; ERP wraps its label in quotes, e.g. "'Total Income (Credit)'". */
const isTotalRow = (r: Record<string, unknown>): boolean => r.indent === undefined && Boolean(r.account_name);
const totalLabel = (r: Record<string, unknown>): string => String(r.account_name ?? '').replace(/^'|'$/g, '').toLowerCase();

const cache = makeCache<ProfitLoss>();

export async function getProfitLoss(opts: ProfitLossOptions): Promise<ProfitLoss> {
  const key = [opts.companies.join(','), opts.from, opts.to].join('|');
  const hit = cache.get(key);
  if (hit) return hit;

  const tenants = tenantsFor(opts.companies);
  const incomeAcc = new Map<string, Map<string, number>>();
  const expenseAcc = new Map<string, Map<string, number>>();
  const incomeTotals = new Map<string, number>();
  const expenseTotals = new Map<string, number>();
  let months: Array<{ key: string; label: string }> = [];
  const addTo = (acc: Map<string, Map<string, number>>, name: string, k: string, v: number): void => {
    const row = acc.get(name) ?? new Map<string, number>();
    row.set(k, (row.get(k) ?? 0) + v);
    acc.set(name, row);
  };

  // Each company is read in full before anything is added, so a company that fails half way through
  // contributes nothing rather than half a statement.
  const settled = await Promise.allSettled(tenants.map(async (t) => {
    const { rows, columns } = await runQueryReport(erpHttp(t.site), 'Profit and Loss Statement', {
      company: t.company,
      // With 'Fiscal Year' the report ignores the dates and answers for the whole year.
      filter_based_on: 'Date Range',
      period_start_date: opts.from,
      period_end_date: opts.to,
      periodicity: 'Monthly',
      // Each column stands alone; accumulated values would make every month a running total.
      accumulated_values: 0,
    }, () => true);
    const cols = columns
      .filter((c) => MONTH_KEY.test(String(c.fieldname ?? '')))
      .map((c) => ({ key: String(c.fieldname), label: String(c.label ?? c.fieldname) }));
    return { rows, cols };
  }));

  const sources: SourceStatus[] = [];
  settled.forEach((s, i) => {
    const t = tenants[i];
    if (s.status !== 'fulfilled') {
      console.error(`[finance] Profit and Loss (${t.company}) failed:`, (s.reason as Error)?.message ?? s.reason);
      sources.push({ company: t.company, ok: false });
      return;
    }
    sources.push({ company: t.company, ok: true });
    const { rows, cols } = s.value;
    if (cols.length > months.length) months = cols;
    let side: 'income' | 'expense' | null = null;
    for (const r of rows) {
      if (isTotalRow(r)) {
        const label = totalLabel(r);
        // ERP's own totals, so the page matches the ERP screen even with an unexpected account.
        const into = label.startsWith('total income') ? incomeTotals
          : label.startsWith('total expense') ? expenseTotals : null;
        if (into) for (const c of cols) into.set(c.key, (into.get(c.key) ?? 0) + num(r[c.key]));
        continue;
      }
      if (r.indent === 0) {
        const name = String(r.account_name ?? '').toLowerCase();
        side = name.includes('income') ? 'income' : name.includes('expense') ? 'expense' : null;
        continue;
      }
      if (side === null || Number(r.is_group ?? 0) === 1) continue;
      const name = String(r.account_name ?? '').trim();
      if (!name) continue;
      for (const c of cols) addTo(side === 'income' ? incomeAcc : expenseAcc, name, c.key, num(r[c.key]));
    }
  });

  // Biggest first. Full precision kept; the page rounds for display.
  const listOf = (m: Map<string, Map<string, number>>): PlAccount[] =>
    [...m.entries()]
      .map(([name, row]) => {
        const amounts = months.map((c) => row.get(c.key) ?? 0);
        return { name, amounts, total: amounts.reduce((a, v) => a + v, 0) };
      })
      .filter((a) => a.amounts.some((v) => v !== 0))
      .sort((a, b) => b.total - a.total);
  const seriesOf = (m: Map<string, number>): number[] => months.map((c) => round2(m.get(c.key) ?? 0));
  const grandOf = (m: Map<string, number>): number => round2(months.reduce((a, c) => a + (m.get(c.key) ?? 0), 0));

  const value: ProfitLoss = {
    from: opts.from,
    to: opts.to,
    months,
    income: { accounts: listOf(incomeAcc), totals: seriesOf(incomeTotals), total: grandOf(incomeTotals) },
    expense: { accounts: listOf(expenseAcc), totals: seriesOf(expenseTotals), total: grandOf(expenseTotals) },
    profit: months.map((c) => round2((incomeTotals.get(c.key) ?? 0) - (expenseTotals.get(c.key) ?? 0))),
    profitTotal: round2(grandOf(incomeTotals) - grandOf(expenseTotals)),
    scopeNote: failedNote(sources),
    sources,
  };
  if (sources.every((s) => s.ok)) cache.set(key, value);
  return value;
}
