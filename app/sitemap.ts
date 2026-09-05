import { ertelenenHalkaArzMi } from "@/lib/halka-arz-ertelenen";
import { BLOG_AKTIF } from "@/lib/ozellik-bayraklari";
import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import bistHisseler from "@/data/bist-companies.json";
import { ENSTRUMANLAR } from "@/lib/enstruman-pricing";
import { EGITIM_KATEGORILERI, tumEgitimler } from "@/lib/egitimler";

export const revalidate = 3600;

type BistEntry = { ticker: string };

async function fonUrls(base: string): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.from("fon_snapshots").select("kod").limit(2000);
    if (error || !data) return [];
    return data.map(f => ({
      url: `${base}/fon/${f.kod}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch {
    return [];
  }
}

async function kapBildirimUrls(base: string): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await supabase
      .from("kap_bildirimleri")
      .select("disclosure_index, kap_zamani")
      .not("ozet_tek_cumle", "is", null)
      .order("kap_zamani", { ascending: false })
      .limit(500);
    if (error || !data) return [];
    return data.map(b => ({
      url: `${base}/kap/${b.disclosure_index}`,
      lastModified: b.kap_zamani ? new Date(b.kap_zamani) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.parakonusur.com";
  const statikSayfalar = [
    { url: base, priority: 1.0 },
    { url: `${base}/veri-kaynaklari`, priority: 0.6 },
    { url: `${base}/dashboard`, priority: 0.9 },
    { url: `${base}/hisseler`, priority: 0.9 },
    { url: `${base}/doviz-maden`, priority: 0.9 },
    { url: `${base}/halka-arz`, priority: 0.9 },
    { url: `${base}/hisseler?varlik=fon`, priority: 0.8 },
    // Egitimler — config'ten uretilir (lib/egitimler.ts). /viop-nedir 301 ile buraya gelir.
    { url: `${base}/egitimler`, priority: 0.8 },
    ...EGITIM_KATEGORILERI.map((k) => ({ url: `${base}/egitimler/${k.slug}`, priority: 0.7 })),
    ...tumEgitimler().map((e) => ({ url: `${base}${e.yol}`, priority: 0.8 })),
    { url: `${base}/kap`, priority: 0.9 },
    { url: `${base}/haberler`, priority: 0.7 },
    ...(BLOG_AKTIF ? [{ url: `${base}/blog`, priority: 0.7 }] : []),   // gizli: lib/ozellik-bayraklari
    // Takvim artik dort alt takvimin ana sayfasi — oncelik yukseltildi, sekmeler ayri URL.
    { url: `${base}/takvim`, priority: 0.9 },
    { url: `${base}/takvim?sekme=bilanco`, priority: 0.7 },
    { url: `${base}/takvim?sekme=temettu`, priority: 0.7 },
    { url: `${base}/takvim?sekme=halka-arz`, priority: 0.7 },
    { url: `${base}/pro`, priority: 0.8 },
    { url: `${base}/gizlilik`, priority: 0.3 },
    { url: `${base}/kvkk`, priority: 0.3 },
    { url: `${base}/kullanim-sartlari`, priority: 0.3 },
    { url: `${base}/risk-uyarisi`, priority: 0.3 },
  ];

  const statik: MetadataRoute.Sitemap = statikSayfalar.map(s => ({
    url: s.url,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: s.priority,
  }));

  const hisseler: MetadataRoute.Sitemap = (bistHisseler as BistEntry[]).map(h => ({
    url: `${base}/hisse/${h.ticker}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  const enstrumanlar: MetadataRoute.Sitemap = ENSTRUMANLAR.map(e => ({
    url: `${base}/doviz-maden/${e.kod}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const [kap, fonlar] = await Promise.all([kapBildirimUrls(base), fonUrls(base)]);

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: offerings } = await db.from("halka_arzlar").select("kod, updated_at");
  const arzlar = (offerings ?? []).filter(a => !ertelenenHalkaArzMi(a.kod)).map(a => ({ url: `${base}/halka-arz/${a.kod}`, lastModified: new Date(a.updated_at), changeFrequency: "daily" as const, priority: 0.8 }));
  return [...statik, ...hisseler, ...enstrumanlar, ...fonlar, ...kap, ...arzlar];
}
