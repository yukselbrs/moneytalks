import { expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reserveChatMessage } from "@/lib/chat-quota";

it("allows only three simultaneous reservations, including the first-row race", async () => {
  let count: number | null = null;
  const db = {
    from() {
      let update: number | undefined;
      let expected: number | undefined;
      const query = {
        select() { return query; },
        eq(column: string, value: unknown) { if (column === "mesaj_sayisi") expected = Number(value); return query; },
        update(value: { mesaj_sayisi: number }) { update = value.mesaj_sayisi; return query; },
        async insert() {
          await Promise.resolve();
          if (count !== null) return { error: { code: "23505" } };
          count = 1;
          return { error: null };
        },
        async maybeSingle() {
          await Promise.resolve();
          if (update !== undefined) {
            if (count !== expected) return { data: null, error: null };
            count = update;
          }
          return { data: count === null ? null : { mesaj_sayisi: count }, error: null };
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
  const results = await Promise.all(Array.from({ length: 12 }, () => reserveChatMessage(db, "user", "2026-09-05", 3)));
  expect(results.filter(n => n !== null).sort()).toEqual([1, 2, 3]);
  expect(count).toBe(3);
});
