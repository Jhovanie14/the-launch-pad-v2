import { vi } from "vitest";

/* A tiny in-memory stand-in for the Supabase query builder: enough of
   select / eq / neq / gt / gte / lte / lt / in / order / range to run the
   real queries against rows. Comparisons are on strings, like ISO dates
   (gt against a number compares numerically, as JS does). */
export type Row = Record<string, unknown>;

export function fakeDb(tables: Record<string, Row[]>) {
  const from = vi.fn((table: string) => {
    const preds: ((r: Row) => boolean)[] = [];
    let orderBy: string | null = null;
    let slice: [number, number] | null = null;
    const rows = () => {
      let out = (tables[table] ?? []).filter((r) => preds.every((p) => p(r)));
      if (orderBy) {
        const col = orderBy;
        out = [...out].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0));
      }
      // Like Supabase: without a range, a request returns at most 1,000 rows.
      return slice ? out.slice(slice[0], slice[1] + 1) : out.slice(0, 1000);
    };
    const chain = {
      order: (c: string) => ((orderBy = c), chain),
      range: (from: number, to: number) => ((slice = [from, to]), chain),
      select: () => chain,
      eq: (c: string, v: unknown) => (preds.push((r) => r[c] === v), chain),
      neq: (c: string, v: unknown) => (preds.push((r) => r[c] !== v), chain),
      gt: (c: string, v: string) => (preds.push((r) => String(r[c]) > v), chain),
      gte: (c: string, v: string) => (preds.push((r) => String(r[c]) >= v), chain),
      lte: (c: string, v: string) => (preds.push((r) => String(r[c]) <= v), chain),
      lt: (c: string, v: string) => (preds.push((r) => String(r[c]) < v), chain),
      in: (c: string, vs: unknown[]) => (preds.push((r) => vs.includes(r[c])), chain),
      then: (resolve: (v: { data: Row[]; error: null }) => void) => resolve({ data: rows(), error: null }),
    };
    return chain;
  });
  return { from } as any;
}
