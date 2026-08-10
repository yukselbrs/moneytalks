import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { EGITIM_KATEGORILERI } from "@/lib/egitimler";
import { KategoriKart, EGITIM_STIL } from "@/components/egitim/Kartlar";

export const metadata: Metadata = {
  title: "Eğitimler — Finansal Kavramları İnteraktif Öğren | ParaKonuşur",
  description:
    "Türev araçlar, vadeli işlemler ve forward sözleşmeleri gibi finansal kavramları animasyonlu, interaktif eğitimlerle sıfırdan öğren. Eğitim amaçlıdır; yatırım tavsiyesi değildir.",
  alternates: { canonical: "/egitimler" },
};

export default function EgitimlerPage() {
  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <style>{EGITIM_STIL}</style>
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", marginBottom: 4 }}>Eğitimler</h1>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: 24 }}>
            Finansal kavramları bildiğin bir örnekten yola çıkarak, adım adım ve interaktif anlatıyoruz.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {EGITIM_KATEGORILERI.map((k) => <KategoriKart key={k.slug} kategori={k} />)}
          </div>

          <p style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.7, marginTop: 28 }}>
            Bu içerikler eğitim amaçlıdır; yatırım tavsiyesi değildir.
          </p>
        </main>
      </div>
    </AppShell>
  );
}
