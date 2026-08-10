import Link from "next/link";
import { egitimYolu, type EgitimKategori } from "@/lib/egitimler";

// Egitim/kategori kart listeleri — /egitimler ve /egitimler/[kategori] ortak kullanir.
// Site kart dili: card-glass + ayni radius/padding/renk skalasi.

const KART: React.CSSProperties = {
  borderRadius: 14,
  padding: "20px 22px",
  display: "block",
  textDecoration: "none",
  transition: "border-color 0.15s, transform 0.15s",
};

export function EgitimKart({ kategoriSlug, egitim }: { kategoriSlug: string; egitim: EgitimKategori["egitimler"][number] }) {
  const icerik = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(96,165,250,0.75)" }}>
          İnteraktif
        </span>
        <span style={{ fontSize: 11, color: "#475569" }}>· {egitim.sure}</span>
        {!egitim.hazir && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#FCD34D", background: "rgba(245,158,11,0.12)", borderRadius: 20, padding: "2px 8px" }}>Yakında</span>
        )}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: "#F1F5F9", margin: "0 0 6px", letterSpacing: "-0.3px" }}>{egitim.baslik}</h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#94A3B8", margin: 0 }}>{egitim.ozet}</p>
    </>
  );

  if (!egitim.hazir) {
    return <div className="card-glass" style={{ ...KART, opacity: 0.55, cursor: "default" }}>{icerik}</div>;
  }
  return (
    <Link href={egitimYolu(kategoriSlug, egitim.slug)} className="card-glass eg-kart" style={KART}>
      {icerik}
    </Link>
  );
}

export function KategoriKart({ kategori }: { kategori: EgitimKategori }) {
  const hazirSayi = kategori.egitimler.filter((e) => e.hazir).length;
  return (
    <Link href={`/egitimler/${kategori.slug}`} className="card-glass eg-kart" style={KART}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F1F5F9", margin: "0 0 6px", letterSpacing: "-0.3px" }}>{kategori.ad}</h2>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#94A3B8", margin: "0 0 10px" }}>{kategori.aciklama}</p>
      <span style={{ fontSize: 12, color: "#60A5FA", fontWeight: 600 }}>
        {hazirSayi} eğitim →
      </span>
    </Link>
  );
}

// Kart hover'i (site genelindeki kart dilinin aynisi)
export const EGITIM_STIL = `
  .eg-kart:hover { border-color: rgba(59,130,246,0.35) !important; transform: translateY(-2px); }
  .eg-sekme-serit::-webkit-scrollbar { display: none; }
`;
