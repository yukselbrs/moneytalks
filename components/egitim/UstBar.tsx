"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EGITIM_KOK, egitimYolu, kategoriBul } from "@/lib/egitimler";

// Egitim sayfalarinin ortak sticky ust bari: logo + kategori alt sekmeleri.
// Sekmeler lib/egitimler.ts config'inden gelir — yeni egitim eklemek icin burasi
// degistirilmez. Egitim sayfalari AppShell KULLANMAZ (tam ekran scroll deneyimi),
// bu yuzden gezinme bu bardan saglanir.
export default function EgitimUstBar({ kategoriSlug }: { kategoriSlug: string }) {
  const pathname = usePathname();
  const kategori = kategoriBul(kategoriSlug);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(11,18,32,0.85)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(59,130,246,0.12)" }}>
      <div style={{ padding: "12px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <Link href="/" style={{ fontSize: 14, fontWeight: 800, color: "#F1F5F9", textDecoration: "none" }}>
          para<span style={{ color: "#3B82F6" }}>konusur</span>
        </Link>
        <span style={{ fontSize: 11, color: "#64748B" }}>Eğitim içeriği · yatırım tavsiyesi değildir</span>
      </div>

      {kategori && (
        <nav aria-label={`${kategori.ad} eğitimleri`} className="eg-sekme-serit"
          style={{ display: "flex", gap: 4, padding: "8px 20px 0", overflowX: "auto" }}>
          <Link href={`${EGITIM_KOK}/${kategori.slug}`}
            style={{ fontSize: 12, color: "#64748B", textDecoration: "none", padding: "6px 10px 8px", whiteSpace: "nowrap" }}>
            ← {kategori.ad}
          </Link>
          {kategori.egitimler.filter((e) => e.hazir).map((e) => {
            const yol = egitimYolu(kategori.slug, e.slug);
            const aktif = pathname === yol;
            return (
              <Link key={e.slug} href={yol}
                style={{
                  fontSize: 13, fontWeight: 500, padding: "6px 14px 8px", textDecoration: "none", whiteSpace: "nowrap",
                  color: aktif ? "#3B82F6" : "#94A3B8",
                  borderBottom: aktif ? "2px solid #3B82F6" : "2px solid transparent",
                  marginBottom: -1,
                }}>
                {e.ad}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
