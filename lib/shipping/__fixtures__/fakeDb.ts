// A tiny in-memory stand-in for the Supabase client, enough for the shipping
// code: select().eq()/.in()/.is().maybeSingle()/await, and guarded updates
// that only change rows matching every filter. Test-only.

type Row = Record<string, any>;

export function fakeDb(tables: Record<string, Row[]>) {
  const updates: { table: string; values: Row; filters: [string, string, unknown][] }[] = [];

  function query(table: string) {
    const filters: [string, string, unknown][] = [];
    const rows = () =>
      (tables[table] ?? []).filter((r) =>
        filters.every(([op, col, val]) =>
          op === "eq" ? r[col] === val : op === "is" ? (r[col] ?? null) === val : op === "in" ? (val as unknown[]).includes(r[col]) : op === "neq" ? r[col] !== val : true,
        ),
      );
    const chain: any = {
      select: () => chain,
      eq: (c: string, v: unknown) => (filters.push(["eq", c, v]), chain),
      neq: (c: string, v: unknown) => (filters.push(["neq", c, v]), chain),
      is: (c: string, v: unknown) => (filters.push(["is", c, v]), chain),
      in: (c: string, v: unknown[]) => (filters.push(["in", c, v]), chain),
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      then: (resolve: any) => resolve({ data: rows(), error: null }),
    };
    return chain;
  }

  const db = {
    from(table: string) {
      const q = query(table);
      return {
        ...q,
        update(values: Row) {
          const rec = { table, values, filters: [] as [string, string, unknown][] };
          updates.push(rec);
          const apply = () => {
            const hit = (tables[table] ?? []).filter((r) =>
              rec.filters.every(([op, col, val]) => (op === "eq" ? r[col] === val : op === "is" ? (r[col] ?? null) === val : true)),
            );
            hit.forEach((r) => Object.assign(r, values));
            return hit;
          };
          const u: any = {
            eq: (c: string, v: unknown) => (rec.filters.push(["eq", c, v]), u),
            is: (c: string, v: unknown) => (rec.filters.push(["is", c, v]), u),
            select: async () => ({ data: apply().map((r) => ({ id: r.id })), error: null }),
            then: (resolve: any) => (apply(), resolve({ error: null })),
          };
          return u;
        },
      };
    },
  } as any;

  return { db, tables, updates };
}
