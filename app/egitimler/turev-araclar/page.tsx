import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import { kategoriBul } from "@/lib/egitimler";
import { EgitimKart, EGITIM_STIL } from "@/components/egitim/Kartlar";

const KATEGORI = "turev-araclar";

export const metadata: Metadata = {
  title: "Türev Araçlar Eğitimleri — VİOP ve Forward | ParaKonuşur",
  description:
    "Vadeli işlemler (VİOP) ve forward sözleşmelerini interaktif, animasyonlu eğitimlerle öğren. Kaldıraç, teminat, OTC ve karşı taraf riski. Eğitim amaçlıdır; yatırım tavsiyesi değildir.",
  alternates: { canonical: "/egitimler/turev-araclar" },
};

export default function TurevAraclarPage() {
  const kategori = kategoriBul(KATEGORI);
  if (!kategori) notFound();

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <style>{EGITIM_STIL}</style>
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>
          <a href="/egitimler" style={{ fontSize: 12, color: "#64748B", textDecoration: "none" }}>← Eğitimler</a>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", margin: "10px 0 4px" }}>{kategori.ad}</h1>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: 24 }}>{kategori.aciklama}</p>

          <div style={{ display: "grid", gap: 12 }}>
            {kategori.egitimler.map((e) => <EgitimKart key={e.slug} kategoriSlug={kategori.slug} egitim={e} />)}
          </div>

          <p style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.7, marginTop: 28 }}>
            Bu içerikler eğitim amaçlıdır; yatırım tavsiyesi değildir. Türev araçlar kaldıraçlı ürünlerdir;
            teminatın tamamını kaybetme riski vardır.
          </p>
        </main>
      </div>
    </AppShell>
  );
}
