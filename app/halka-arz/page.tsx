"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

type ArzOzet = {
  kod: string;
  sirket_adi: string;
  logo_url: string | null;
  durum: "talep_toplaniyor" | "arz_tamamlandi" | "islem_goruyor";
  talep_baslangic: string | null;
  talep_bitis: string | null;
  islem_tarihi: string | null;
  fiyat: number | null;
  fiyat_ust: number | null;
  buyukluk: number | null;
  dagitim_yontemi: string | null;
  pazar: string | null;
  iskonto_orani: number | null;
  araci_kurumlar: string[];
  created_at: string;
};

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function tarihAraligi(bas: string | null, bit: string | null): string {
  if (!bas) return "—";
  const b = new Date(bas + "T00:00:00");
  if (!bit) return `${b.getDate()} ${AYLAR[b.getMonth()]} ${b.getFullYear()}`;
  const e = new Date(bit + "T00:00:00");
  if (b.getMonth() === e.getMonth() && b.getFullYear() === e.getFullYear()) {
    return `${b.getDate()} - ${e.getDate()} ${AYLAR[e.getMonth()]} ${e.getFullYear()}`;
  }
  return `${b.getDate()} ${AYLAR[b.getMonth()]} - ${e.getDate()} ${AYLAR[e.getMonth()]} ${e.getFullYear()}`;
}

function fiyatMetni(fiyat: number | null, ust: number | null): string {
  if (fiyat === null) return "—";
  const tek = (v: number) => v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return ust !== null && ust !== fiyat ? `${tek(fiyat)} - ${tek(ust)} ₺` : `${tek(fiyat)} ₺`;
}

function buyuklukMetni(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} Mlr ₺`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn ₺`;
  return `${v.toLocaleString("tr-TR")} ₺`;
}

const DURUM_ROZET: Record<ArzOzet["durum"], { label: string; renk: string; zemin: string }> = {
  talep_toplaniyor: { label: "Talep Toplanıyor", renk: "#34D399", zemin: "rgba(16,185,129,0.12)" },
  arz_tamamlandi: { label: "Arz Tamamlandı", renk: "#FBBF24", zemin: "rgba(245,158,11,0.12)" },
  islem_goruyor: { label: "İşlem Görüyor", renk: "#60A5FA", zemin: "rgba(59,130,246,0.12)" },
};

function DurumRozet({ durum, yeni }: { durum: ArzOzet["durum"]; yeni: boolean }) {
  const r = DURUM_ROZET[durum];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {yeni && durum === "talep_toplaniyor" && (
        <span style={{ fontSize: 9.5, fontWeight: 800, color: "#F87171", background: "rgba(239,68,68,0.14)", borderRadius: 999, padding: "3px 8px", letterSpacing: "0.4px" }}>YENİ</span>
      )}
      <span style={{ fontSize: 10.5, fontWeight: 700, color: r.renk, background: r.zemin, borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>
        {durum === "talep_toplaniyor" && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: r.renk, marginRight: 6, verticalAlign: "middle" }} />}
        {r.label}
      </span>
    </span>
  );
}

function ArzKart({ arz }: { arz: ArzOzet }) {
  const yeni = Date.now() - new Date(arz.created_at).getTime() < 3 * 86400_000;
  return (
    <Link href={`/halka-arz/${arz.kod}`} className="card-glass" style={{ display: "block", borderRadius: 14, padding: "16px 18px", textDecoration: "none", transition: "border-color 0.15s" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#93C5FD", flexShrink: 0, overflow: "hidden" }}>
            {arz.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={arz.logo_url} alt={arz.kod} width={38} height={38} style={{ objectFit: "contain" }} />
              : arz.kod.slice(0, 3)}
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.2px" }}>{arz.kod}</p>
            <p className="truncate" style={{ margin: 0, fontSize: 11.5, color: "#64748B", maxWidth: 280 }}>{arz.sirket_adi}</p>
          </div>
        </div>
        <DurumRozet durum={arz.durum} yeni={yeni} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        {[
          { l: "Halka Arz Fiyatı", v: fiyatMetni(arz.fiyat, arz.fiyat_ust), vurgu: true },
          { l: "Talep Tarihleri", v: tarihAraligi(arz.talep_baslangic, arz.talep_bitis) },
          { l: "Büyüklük", v: buyuklukMetni(arz.buyukluk) },
          { l: "Dağıtım", v: arz.dagitim_yontemi || "—" },
        ].map((c) => (
          <div key={c.l}>
            <p style={{ margin: 0, fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase" }}>{c.l}</p>
            <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: c.vurgu ? 800 : 600, color: c.vurgu ? "#F8FAFC" : "#CBD5E1", fontVariantNumeric: "tabular-nums" }}>{c.v}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default function HalkaArzPage() {
  const [aktif, setAktif] = useState<ArzOzet[]>([]);
  const [gecmis, setGecmis] = useState<ArzOzet[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    fetch("/api/halka-arz")
      .then((r) => r.json())
      .then((d) => { setAktif(d.aktif || []); setGecmis(d.gecmis || []); })
      .finally(() => setYukleniyor(false));
  }, []);

  // Metadata stream'i hydration'da root title'i yazar; yukleme bitince bizimki kalici olur.
  useEffect(() => {
    if (!yukleniyor) document.title = "Halka Arz Takvimi | ParaKonuşur";
  }, [yukleniyor]);

  return (
    <AppShell>
      <div style={{ minHeight: "100vh" }}>
        <main style={{ width: "100%", maxWidth: 980, margin: "0 auto", padding: "28px 24px 60px", boxSizing: "border-box" }}>
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, color: "#3B82F6", letterSpacing: "1.2px" }}>BORSA İSTANBUL</p>
          <h1 style={{ margin: "6px 0 4px", fontSize: 24, fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.4px" }}>Halka Arz Takvimi</h1>
          <p style={{ margin: "0 0 22px", fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
            Talep toplama sürecindeki ve yaklaşan halka arzlar. İşlem görmeye başlayan şirketler otomatik olarak Hisseler bölümüne taşınır.
          </p>

          {yukleniyor ? (
            <div className="card-glass" style={{ borderRadius: 14, padding: 40, textAlign: "center", color: "#64748B", fontSize: 13 }}>Yükleniyor…</div>
          ) : aktif.length === 0 ? (
            <div className="card-glass" style={{ borderRadius: 14, padding: 40, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#CBD5E1" }}>Şu anda aktif halka arz bulunmuyor</p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748B" }}>Yeni bir halka arz duyurulduğunda burada listelenir.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {aktif.map((a) => <ArzKart key={a.kod} arz={a} />)}
            </div>
          )}

          {gecmis.length > 0 && (
            <section style={{ marginTop: 34 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "#E2E8F0" }}>İşlem Görmeye Başlayanlar</h2>
              <div className="card-glass" style={{ borderRadius: 14, overflow: "hidden" }}>
                {gecmis.map((a, i) => (
                  <Link key={a.kod} href={`/hisse/${a.kod}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 16px", textDecoration: "none", borderTop: i ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: "#F1F5F9" }}>{a.kod}</span>
                      <span className="truncate" style={{ fontSize: 11.5, color: "#64748B", maxWidth: 300 }}>{a.sirket_adi}</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {a.islem_tarihi && <span style={{ fontSize: 11, color: "#64748B" }}>{tarihAraligi(a.islem_tarihi, null)}</span>}
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#60A5FA" }}>Hisseye git →</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <p style={{ fontSize: 11, color: "#475569", marginTop: 26, lineHeight: 1.6 }}>
            Veriler KAP bildirimleri ve konsorsiyum üyesi aracı kurum duyurularından derlenir; talep tarihleri ve fiyatlar değişebilir. Bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.
          </p>
        </main>
      </div>
    </AppShell>
  );
}
