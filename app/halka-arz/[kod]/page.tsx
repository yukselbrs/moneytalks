"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

type Arz = {
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
  pay_miktari: number | null;
  dagitim_yontemi: string | null;
  pazar: string | null;
  arz_sekli: string | null;
  iskonto_orani: number | null;
  halka_aciklik_orani: number | null;
  araci_kurumlar: string[];
  fon_kullanim_yeri: string | null;
  tahsisat_gruplari: { grup: string; oran: number | string }[] | null;
  dagitim_tahminleri: { katilim: string; tahmin: string }[] | null;
  finansal_ozet: IzahnameFinansal | null;
  fk: number | null;
  pddd: number | null;
  piyasa_degeri: number | null;
  fiyat_istikrari: string | null;
  satmama_taahhudu: string | null;
  basvuru_yerleri: string | null;
  sirket_aciklama: string | null;
  kaynak_linkleri: Record<string, string> | null;
};

type IzahnameFinansal = {
  donem: string | null;
  donen_varlik: number | null;
  duran_varlik: number | null;
  kv_yukumluluk: number | null;
  uv_yukumluluk: number | null;
  ozkaynak: number | null;
  net_kar: number | null;
  odenmis_sermaye: number | null;
  nakit: number | null;
  stoklar: number | null;
  ticari_borclar: number | null;
  cari_oran: number | null;
};

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// Ham TL -> "8,86 Mr ₺" / "175,82 Mn ₺" / "1.234 ₺"
function tlKisa(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} Mr ₺`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} Mn ₺`;
  return `${v.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;
}

function oran(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

function sayiMetni(v: number | null, sonek = ""): string {
  if (v === null || !Number.isFinite(v)) return "—";
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} Mlr${sonek}`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn${sonek}`;
  return `${v.toLocaleString("tr-TR")}${sonek}`;
}

const DURUM_META: Record<Arz["durum"], { label: string; renk: string; zemin: string }> = {
  talep_toplaniyor: { label: "Talep Toplanıyor", renk: "#34D399", zemin: "rgba(16,185,129,0.12)" },
  arz_tamamlandi: { label: "Arz Tamamlandı", renk: "#FBBF24", zemin: "rgba(245,158,11,0.12)" },
  islem_goruyor: { label: "İşlem Görüyor", renk: "#60A5FA", zemin: "rgba(59,130,246,0.12)" },
};

function BilgiBlok({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <div className="card-glass" style={{ borderRadius: 14, padding: "16px 18px" }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "#93C5FD", letterSpacing: "0.2px" }}>{baslik}</h3>
      {children}
    </div>
  );
}

export default function HalkaArzDetayPage({ params }: { params: Promise<{ kod: string }> }) {
  const { kod } = use(params);
  const [arz, setArz] = useState<Arz | null>(null);
  const [yuklendi, setYuklendi] = useState(false);
  const [sekme, setSekme] = useState<"bilgi" | "forum">("bilgi");

  useEffect(() => {
    fetch(`/api/halka-arz/${kod}`)
      .then((r) => r.json())
      .then((d) => { setArz(d.arz); if (d.arz) document.title = `${d.arz.kod} Halka Arz | ParaKonuşur`; })
      .finally(() => setYuklendi(true));
  }, [kod]);

  if (yuklendi && !arz) {
    return (
      <AppShell>
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#CBD5E1" }}>Halka arz kaydı bulunamadı</p>
          <Link href="/halka-arz" style={{ fontSize: 13, color: "#60A5FA", textDecoration: "none" }}>← Halka Arz Takvimi&apos;ne dön</Link>
        </main>
      </AppShell>
    );
  }
  if (!arz) {
    return (
      <AppShell>
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", textAlign: "center", color: "#64748B", fontSize: 13 }}>Yükleniyor…</main>
      </AppShell>
    );
  }

  const d = DURUM_META[arz.durum];
  const temel: { l: string; v: string }[] = [
    { l: "Halka Arz Fiyatı", v: fiyatMetni(arz.fiyat, arz.fiyat_ust) },
    { l: "Talep Tarihleri", v: tarihAraligi(arz.talep_baslangic, arz.talep_bitis) },
    { l: "Dağıtım Yöntemi", v: arz.dagitim_yontemi || "—" },
    { l: "Pay Miktarı", v: sayiMetni(arz.pay_miktari, " adet") },
    { l: "Halka Arz Büyüklüğü", v: sayiMetni(arz.buyukluk, " ₺") },
    { l: "BIST Kodu", v: arz.kod },
    { l: "Pazar", v: arz.pazar || "—" },
    { l: "Arz Şekli", v: arz.arz_sekli || "—" },
    { l: "Halka Arz İskontosu", v: arz.iskonto_orani !== null ? `%${arz.iskonto_orani.toLocaleString("tr-TR")}` : "—" },
    { l: "Halka Açıklık Oranı", v: arz.halka_aciklik_orani !== null ? `%${arz.halka_aciklik_orani.toLocaleString("tr-TR")}` : "—" },
  ];
  if (arz.islem_tarihi) temel.push({ l: "İlk İşlem Tarihi", v: tarihAraligi(arz.islem_tarihi, null) });

  const linkler = arz.kaynak_linkleri || {};
  const LINK_ETIKET: Record<string, string> = { izahname: "İzahname", fiyat_tespit: "Fiyat Tespit Raporu", araci_sayfa: "Aracı Kurum Duyurusu", kap: "KAP Bildirimi" };

  return (
    <AppShell>
      <div style={{ minHeight: "100vh" }}>
        <main style={{ width: "100%", maxWidth: 900, margin: "0 auto", padding: "28px 24px 60px", boxSizing: "border-box" }}>
          <Link href="/halka-arz" style={{ fontSize: 12, color: "#64748B", textDecoration: "none" }}>← Halka Arz Takvimi</Link>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "14px 0 4px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
              <span style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#93C5FD", flexShrink: 0, overflow: "hidden" }}>
                {arz.logo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={arz.logo_url} alt={arz.kod} width={46} height={46} style={{ objectFit: "contain" }} />
                  : arz.kod.slice(0, 3)}
              </span>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.4px" }}>{arz.kod}</h1>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#64748B" }}>{arz.sirket_adi}</p>
              </div>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: d.renk, background: d.zemin, borderRadius: 999, padding: "6px 13px", whiteSpace: "nowrap" }}>{d.label}</span>
          </div>

          {arz.durum === "islem_goruyor" && (
            <Link href={`/hisse/${arz.kod}`} style={{ display: "inline-block", margin: "8px 0 0", fontSize: 12.5, fontWeight: 700, color: "#60A5FA", textDecoration: "none" }}>
              Hisse sayfasına git →
            </Link>
          )}

          <div style={{ display: "flex", gap: 6, margin: "20px 0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {([["bilgi", "Halka Arz Bilgileri"], ["forum", "Forum"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setSekme(k)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "9px 14px", fontSize: 13, fontWeight: 700, color: sekme === k ? "#F8FAFC" : "#64748B", borderBottom: sekme === k ? "2px solid #3B82F6" : "2px solid transparent", marginBottom: -1 }}>
                {l}
              </button>
            ))}
          </div>

          {sekme === "forum" ? (
            <div className="card-glass" style={{ borderRadius: 14, padding: 40, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#CBD5E1" }}>Forum yakında</p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748B" }}>Halka arz tartışmaları için topluluk alanı üzerinde çalışıyoruz.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="card-glass" style={{ borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 13 }}>
                  {temel.map((c) => (
                    <div key={c.l}>
                      <p style={{ margin: 0, fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase" }}>{c.l}</p>
                      <p style={{ margin: "3px 0 0", fontSize: 13.5, fontWeight: 700, color: "#E2E8F0", fontVariantNumeric: "tabular-nums" }}>{c.v}</p>
                    </div>
                  ))}
                </div>
                {arz.araci_kurumlar.length > 0 && (
                  <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ margin: 0, fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase" }}>Aracı Kurum{arz.araci_kurumlar.length > 1 ? "lar (Konsorsiyum)" : ""}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#CBD5E1", lineHeight: 1.6 }}>{arz.araci_kurumlar.join(" · ")}</p>
                  </div>
                )}
              </div>

              {arz.sirket_aciklama && (
                <BilgiBlok baslik="Şirket Hakkında">
                  <p style={{ margin: 0, fontSize: 13, color: "#CBD5E1", lineHeight: 1.7 }}>{arz.sirket_aciklama}</p>
                </BilgiBlok>
              )}

              {arz.fon_kullanim_yeri && (
                <BilgiBlok baslik="Halka Arz Gelirinin Kullanım Yeri">
                  <p style={{ margin: 0, fontSize: 13, color: "#CBD5E1", lineHeight: 1.7, whiteSpace: "pre-line" }}>{arz.fon_kullanim_yeri}</p>
                </BilgiBlok>
              )}

              {Array.isArray(arz.tahsisat_gruplari) && arz.tahsisat_gruplari.length > 0 && (
                <BilgiBlok baslik="Tahsisat Grupları">
                  {arz.tahsisat_gruplari.map((t, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: i ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <span style={{ fontSize: 12.5, color: "#CBD5E1" }}>{t.grup}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: "#E2E8F0", fontVariantNumeric: "tabular-nums" }}>{typeof t.oran === "number" ? `%${t.oran.toLocaleString("tr-TR")}` : t.oran}</span>
                    </div>
                  ))}
                </BilgiBlok>
              )}

              {Array.isArray(arz.dagitim_tahminleri) && arz.dagitim_tahminleri.length > 0 && (
                <BilgiBlok baslik="Katılıma Göre Olası Dağıtım Tahminleri">
                  {arz.dagitim_tahminleri.map((t, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: i ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <span style={{ fontSize: 12.5, color: "#CBD5E1" }}>{t.katilim}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: "#E2E8F0", fontVariantNumeric: "tabular-nums" }}>{t.tahmin}</span>
                    </div>
                  ))}
                  <p style={{ margin: "9px 0 0", fontSize: 10.5, color: "#475569" }}>Tahminler katılım büyüklüğüne bağlı varsayımlardır; kesin dağıtım arz sonuçlarıyla açıklanır.</p>
                </BilgiBlok>
              )}

              {(arz.fk !== null || arz.pddd !== null) && (
                <div className="card-glass" style={{ borderRadius: 14, padding: "16px 18px" }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#93C5FD", letterSpacing: "0.2px" }}>Değerleme Çarpanları</h3>
                  <p style={{ margin: "0 0 12px", fontSize: 11, color: "#64748B" }}>Güncel piyasa değeri ve izahname finansallarına göre hesaplanmıştır.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 13 }}>
                    {[
                      { l: "F/K Oranı", v: oran(arz.fk) },
                      { l: "PD/DD Oranı", v: oran(arz.pddd) },
                      { l: "Piyasa Değeri", v: tlKisa(arz.piyasa_degeri) },
                    ].map((c) => (
                      <div key={c.l}>
                        <p style={{ margin: 0, fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase" }}>{c.l}</p>
                        <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 800, color: "#F8FAFC", fontVariantNumeric: "tabular-nums" }}>{c.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {arz.finansal_ozet && (() => {
                const f = arz.finansal_ozet;
                const satirlar: { l: string; v: string }[] = [
                  { l: "Dönen Varlıklar", v: tlKisa(f.donen_varlik) },
                  { l: "Duran Varlıklar", v: tlKisa(f.duran_varlik) },
                  { l: "Kısa Vadeli Yükümlülük", v: tlKisa(f.kv_yukumluluk) },
                  { l: "Uzun Vadeli Yükümlülük", v: tlKisa(f.uv_yukumluluk) },
                  { l: "Özkaynaklar", v: tlKisa(f.ozkaynak) },
                  { l: "Net Dönem Kârı", v: tlKisa(f.net_kar) },
                  { l: "Ödenmiş Sermaye", v: tlKisa(f.odenmis_sermaye) },
                  { l: "Nakit", v: tlKisa(f.nakit) },
                  { l: "Stoklar", v: tlKisa(f.stoklar) },
                  { l: "Ticari Borçlar", v: tlKisa(f.ticari_borclar) },
                  { l: "Cari Oran", v: oran(f.cari_oran) },
                ].filter((s) => s.v !== "—");
                if (!satirlar.length) return null;
                return (
                  <BilgiBlok baslik={`Bilanço Özeti${f.donem ? ` (${f.donem})` : ""}`}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                      {satirlar.map((s) => (
                        <div key={s.l} style={{ display: "flex", justifyContent: "space-between", gap: 8, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <span style={{ fontSize: 12, color: "#94A3B8" }}>{s.l}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#E2E8F0", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: "10px 0 0", fontSize: 10.5, color: "#475569" }}>Kaynak: izahname finansal tabloları (yıllık). Bilgilendirme amaçlıdır.</p>
                  </BilgiBlok>
                );
              })()}

              {(arz.fiyat_istikrari || arz.satmama_taahhudu) && (
                <BilgiBlok baslik="Taahhütler">
                  {arz.fiyat_istikrari && <p style={{ margin: 0, fontSize: 13, color: "#CBD5E1", lineHeight: 1.7 }}><strong style={{ color: "#E2E8F0" }}>Fiyat istikrarı:</strong> {arz.fiyat_istikrari}</p>}
                  {arz.satmama_taahhudu && <p style={{ margin: arz.fiyat_istikrari ? "8px 0 0" : 0, fontSize: 13, color: "#CBD5E1", lineHeight: 1.7 }}><strong style={{ color: "#E2E8F0" }}>Satmama taahhüdü (lock-up):</strong> {arz.satmama_taahhudu}</p>}
                </BilgiBlok>
              )}

              {arz.basvuru_yerleri && (
                <BilgiBlok baslik="Başvuru Yerleri">
                  <p style={{ margin: 0, fontSize: 13, color: "#CBD5E1", lineHeight: 1.7 }}>{arz.basvuru_yerleri}</p>
                </BilgiBlok>
              )}

              {Object.keys(linkler).length > 0 && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569", lineHeight: 1.8 }}>
                  Kaynaklar:{" "}
                  {Object.entries(linkler).filter(([, u]) => typeof u === "string" && u).map(([k, u], i, arr) => (
                    <span key={k}>
                      <a href={u} target="_blank" rel="noopener noreferrer" style={{ color: "#60A5FA", textDecoration: "none" }}>{LINK_ETIKET[k] || k}</a>
                      {i < arr.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </p>
              )}

              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#475569", lineHeight: 1.6 }}>
                Bilgiler KAP bildirimleri ve aracı kurum duyurularından derlenmiştir; nihai bilgi için izahnameyi inceleyin. Bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.
              </p>
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
