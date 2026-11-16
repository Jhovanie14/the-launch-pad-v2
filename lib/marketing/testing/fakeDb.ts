import { vi } from "vitest";

/* A tiny in-memory stand-in for the Supabase query builder: enough of
   select / eq / neq / gt / gte / lte / lt / in to run the real queries
   against rows. Comparisons are on strings, like ISO dates. */
export type Row = Record<string, unknown>;

export function fakeDb(tables: Record<string, Row[]>) {
  const from = vi.fn((table: string) => {
    const preds: ((r: Row) => boolean)[] = [];
    const chain = {
      select: () => chain,
      eq: (c: string, v: unknown) => (preds.push((r) => r[c] === v), chain),
      neq: (c: string, v: unknown) => (preds.push((r) => r[c] !== v), chain),
      gt: (c: string, v: string) => (preds.push((r) => String(r[c]) > v), chain),
      gte: (c: string, v: string) => (preds.push((r) => String(r[c]) >= v), chain),
      lte: (c: string, v: string) => (preds.push((r) => String(r[c]) <= v), chain),
      lt: (c: string, v: string) => (preds.push((r) => String(r[c]) < v), chain),
      in: (c: string, vs: unknown[]) => (preds.push((r) => vs.includes(r[c])), chain),
      then: (resolve: (v: { data: Row[]; error: null }) => void) =>
        resolve({ data: (tables[table] ?? []).filter((r) => preds.every((p) => p(r))), error: null }),
    };
    return chain;
  });
  return { from } as any;
}
