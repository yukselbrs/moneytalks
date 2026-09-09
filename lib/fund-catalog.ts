import { supabase } from "@/components/lib/supabase";

export type FundCatalogItem = { kod: string; unvan: string };
const PAGE_SIZE = 1000;
let pending: Promise<FundCatalogItem[]> | null = null;

export async function loadFundCatalog(): Promise<FundCatalogItem[]> {
  if (pending) return pending;
  pending = (async () => {
    const funds: FundCatalogItem[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from("fon_snapshots")
        .select("kod, unvan").order("kod").range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error("Fon listesi yüklenemedi. Lütfen tekrar deneyin.");
      funds.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) return funds;
    }
  })();
  try {
    return await pending;
  } catch (error) {
    pending = null;
    throw error;
  }
}
