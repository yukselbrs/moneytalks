"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatCurrency } from "@/lib/formatters";

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const GUNLER = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

const SEKMELER = [
  { id: "ekonomik", label: "Ekonomik Takvim" },
  { id: "bilanco", label: "Bilanço Takvimi" },
  { id: "temettu", label: "Temettü Takvimi" },
  { id: "halka-arz", label: "Halka Arz Takvimi" },
] as const;
type SekmeId = (typeof SEKMELER)[number]["id"];

const ONEM_RENK: Record<string, string> = { "Yüksek": "#EF4444", "Orta": "#F59E0B", "Düşük": "#10B981" };
// Sekme basina nokta rengi — takvim izgarasindaki gunun hangi takvime ait oldugunu ayirir.
const SEKME_RENK: Record<SekmeId, string> = {
  ekonomik: "#EF4444", bilanco: "#8B5CF6", temettu: "#10B981", "halka-arz": "#F59E0B",
};

const HA_DURUM: Record<string, { label: string; renk: string }> = {
  talep_toplaniyor: { label: "Talep Toplanıyor", renk: "#34D399" },
  arz_tamamlandi: { label: "Arz Tamamlandı", renk: "#60A5FA" },
  islem_goruyor: { label: "İşlem Görüyor", renk: "#94A3B8" },
};

type EkonomikOlay = {
  tip: "ekonomik"; tarih: string; saat: string; baslik: string;
  onem: "Yüksek" | "Orta" | "Düşük"; ulke: string; ulkeKod: string;
  beklenti: string | null; onceki: string | null; gerceklesen: string | null; link: string | null;
};
type SirketOlayTemel = {
  tarih: string; ticker: string; tarihKesin: boolean; durum: string;
  donem: string | null; donemBitis: string | null; brutTutar: number | null; netTutar: number | null;
  stopajOrani: number | null; paraBirimi: string | null; odemeSekli: string | null;
  genelKurulTarihi: string | null; kapLink: string | null; link: string;
};
type BilancoOlay = SirketOlayTemel & { tip: "bilanco" };
type TemettuOlay = SirketOlayTemel & { tip: "temettu" };
type HalkaArzOlay = {
  tip: "halka-arz"; tarih: string; kod: string; sirketAdi: string; logoUrl: string | null;
  durum: string; asama: string; asamaAlan: string; fiyat: number | null; fiyatUst: number | null;
  buyukluk: string | null; dagitimYontemi: string | null; pazar: string | null; link: string;
};
type Olay = EkonomikOlay | BilancoOlay | TemettuOlay | HalkaArzOlay;

function tarihKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function aydakiGunler(y: number, m: number) {
  const ilkGun = new Date(y, m, 1).getDay();
  return { offset: ilkGun === 0 ? 6 : ilkGun - 1, toplamGun: new Date(y, m + 1, 0).getDate() };
}
function ayinIlkVeSon(y: number, m: number) {
  return {
    ilk: `${y}-${String(m + 1).padStart(2, "0")}-01`,
    son: `${y}-${String(m + 1).padStart(2, "0")}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, "0")}`,
  };
}
function kisaTarih(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${AYLAR[d.getMonth()].slice(0, 3)}`;
}
const KART = { border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, background: "rgba(255,255,255,0.01)" };
const TH = { padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#334155", letterSpacing: "0.06em", textTransform: "uppercase" as const };

function TakvimIcerik() {
  const router = useRouter();
  const params = useSearchParams();
  const bugun = new Date();
  const urlSekme = params.get("sekme");
  const sekme: SekmeId = SEKMELER.some((s) => s.id === urlSekme) ? (urlSekme as SekmeId) : "ekonomik";

  const [yil, setYil] = useState(bugun.getFullYear());
  const [ay, setAy] = useState(bugun.getMonth());
  const [seciliGun, setSeciliGun] = useState(tarihKey(bugun.getFullYear(), bugun.getMonth(), bugun.getDate()));
  const [olaylar, setOlaylar] = useState<Record<string, Olay[]>>({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const isMobil = useMediaQuery("(max-width: 767px)");

  const sekmeSec = useCallback((id: SekmeId) => {
    router.replace(id === "ekonomik" ? "/takvim" : `/takvim?sekme=${id}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    const { ilk, son } = ayinIlkVeSon(yil, ay);
    let iptal = false;
    setYukleniyor(true);
    setOlaylar({});          // sekme/ay degisiminde onceki tipin verisi ekranda kalmasin
    (async () => {
      try {
        const r = await fetch(`/api/takvim?tip=${sekme}&from=${ilk}&to=${son}`);
        const d: { events?: Omit<Olay, "tip">[] } = await r.json();
        if (iptal) return;
        const map: Record<string, Olay[]> = {};
        for (const e of d.events ?? []) {
          const o = { ...e, tip: sekme } as Olay;
          (map[o.tarih] ||= []).push(o);
        }
        setOlaylar(map);
      } catch {
        if (!iptal) setOlaylar({});
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    return () => { iptal = true; };
  }, [yil, ay, sekme]);

  const { offset, toplamGun } = aydakiGunler(yil, ay);

  // Ay degistiginde secili gun de o aya tasinir; aksi halde detay paneli baska bir ayin
  // gununde asili kaliyordu (Mart'a gecince "04 Agustos" basligi gorunuyordu).
  const ayaGit = useCallback((y: number, m: number) => {
    setYil(y); setAy(m);
    const buAyMi = y === bugun.getFullYear() && m === bugun.getMonth();
    setSeciliGun(tarihKey(y, m, buAyMi ? bugun.getDate() : 1));
  }, [bugun]);
  const oncekiAy = () => (ay === 0 ? ayaGit(yil - 1, 11) : ayaGit(yil, ay - 1));
  const sonrakiAy = () => (ay === 11 ? ayaGit(yil + 1, 0) : ayaGit(yil, ay + 1));

  const seciliOlaylar = olaylar[seciliGun] ?? [];
  const seciliTarih = new Date(seciliGun + "T00:00:00");
  const bugunStr = tarihKey(bugun.getFullYear(), bugun.getMonth(), bugun.getDate());
  const tumOlaylar = Object.values(olaylar).flat();

  const yaklasan = Object.entries(olaylar)
    .filter(([k]) => k >= bugunStr)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, evler]) => (sekme === "ekonomik" ? evler.filter((e) => e.tip === "ekonomik" && e.onem === "Yüksek") : evler))
    .slice(0, 6);

  const git = (link: string | null) => { if (link) router.push(link); };

  // Gun hucresindeki noktalar — ekonomik takvimde onem rengi, digerlerinde sekme rengi.
  function gunNoktalari(gunOlaylar: Olay[]) {
    if (sekme === "ekonomik") {
      const onemler = [...new Set(gunOlaylar.map((e) => (e.tip === "ekonomik" ? e.onem : "")))].filter(Boolean).slice(0, 3);
      return onemler.map((o) => ONEM_RENK[o] ?? "#64748B");
    }
    return gunOlaylar.slice(0, 3).map(() => SEKME_RENK[sekme]);
  }

  const istatistik: { label: string; value: number; color: string }[] =
    sekme === "ekonomik"
      ? (["Yüksek", "Orta", "Düşük"] as const).map((o) => ({
          label: o, color: ONEM_RENK[o],
          value: tumOlaylar.filter((e) => e.tip === "ekonomik" && e.onem === o).length,
        }))
      : sekme === "halka-arz"
        ? [
            { label: "Talep", color: "#34D399", value: tumOlaylar.filter((e) => e.tip === "halka-arz" && e.asamaAlan === "talep_baslangic").length },
            { label: "Son Gün", color: "#F59E0B", value: tumOlaylar.filter((e) => e.tip === "halka-arz" && e.asamaAlan === "talep_bitis").length },
            { label: "İşleme Açılış", color: "#60A5FA", value: tumOlaylar.filter((e) => e.tip === "halka-arz" && e.asamaAlan === "islem_tarihi").length },
          ]
        : sekme === "bilanco"
          ? [
              { label: "Toplam", color: SEKME_RENK.bilanco, value: tumOlaylar.length },
              { label: "Açıklandı", color: "#10B981", value: tumOlaylar.filter((e) => e.tip === "bilanco" && e.durum === "aciklandi").length },
              { label: "Bekleniyor", color: "#F59E0B", value: tumOlaylar.filter((e) => e.tip === "bilanco" && e.durum === "bekleniyor").length },
            ]
          : [
              { label: "Ödeme", color: SEKME_RENK.temettu, value: tumOlaylar.length },
              { label: "Şirket", color: "#60A5FA", value: new Set(tumOlaylar.flatMap((e) => (e.tip === "temettu" ? [e.ticker] : []))).size },
              { label: "Peşin", color: "#F59E0B", value: tumOlaylar.filter((e) => e.tip === "temettu" && /peşin/i.test(e.odemeSekli ?? "")).length },
            ];

  const bosMesaj = yukleniyor
    ? "Yükleniyor..."
    : sekme === "ekonomik" ? "Bu gün için ekonomik etkinlik bulunmuyor."
    : sekme === "bilanco" ? "Bu gün için bilanço açıklaması bulunmuyor."
    : sekme === "temettu" ? "Bu gün için temettü ödemesi bulunmuyor."
    : "Bu gün için halka arz etkinliği bulunmuyor.";

  return (
    <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <style>{`
        .takvim-table-scroll { width: 100%; overflow-x: auto; }
        .takvim-event-title { min-width: 0; overflow-wrap: anywhere; }
        .takvim-satir { cursor: pointer; transition: background 0.12s; }
        .takvim-satir:hover { background: rgba(59,130,246,0.05); }
        @media (max-width: 767px) {
          .takvim-page-main { padding: 14px 12px !important; }
          .takvim-calendar-cell { min-height: 48px !important; }
          .takvim-legend { flex-wrap: wrap; gap: 8px !important; }
        }
      `}</style>
      <main className="takvim-page-main" style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", marginBottom: 4 }}>Takvim</h1>
        <p style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>
          Ekonomik veri açıklamaları, bilanço tarihleri, temettü ödemeleri ve halka arzlar tek takvimde.
        </p>

        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(59,130,246,0.08)", overflowX: "auto" }}>
          {SEKMELER.map((s) => (
            <button key={s.id} onClick={() => sekmeSec(s.id)}
              style={{ fontSize: 13, fontWeight: 500, padding: "8px 16px", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
                color: sekme === s.id ? "#3B82F6" : "#475569", borderBottom: sekme === s.id ? "2px solid #3B82F6" : "2px solid transparent", marginBottom: -1 }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobil ? "1fr" : "1fr 320px", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...KART, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                <button onClick={() => ayaGit(bugun.getFullYear(), bugun.getMonth())}
                  style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>Bugün</button>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={oncekiAy} aria-label="Önceki ay" style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 18 }}>‹</button>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", minWidth: 120, textAlign: "center" }}>{AYLAR[ay]} {yil}</span>
                  <button onClick={sonrakiAy} aria-label="Sonraki ay" style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 18 }}>›</button>
                </div>
                <div style={{ width: 80, textAlign: "right" }}>
                  {yukleniyor && <span style={{ fontSize: 11, color: "#475569" }}>Yükleniyor...</span>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                {GUNLER.map((g) => (
                  <div key={g} style={{ textAlign: "center", padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#334155" }}>{g}</div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {Array.from({ length: offset }).map((_, i) => <div key={"e" + i} style={{ padding: "10px 4px", minHeight: 56 }} />)}
                {Array.from({ length: toplamGun }).map((_, i) => {
                  const gun = i + 1;
                  const key = tarihKey(yil, ay, gun);
                  const gunOlaylar = olaylar[key] ?? [];
                  const bugunMu = key === bugunStr;
                  const seciliMi = key === seciliGun;
                  return (
                    <div key={gun} className="takvim-calendar-cell" onClick={() => setSeciliGun(key)}
                      style={{ padding: "8px 4px", minHeight: 56, cursor: "pointer", borderRadius: 8, margin: 2, transition: "all 0.1s",
                        background: seciliMi ? "rgba(59,130,246,0.15)" : bugunMu ? "rgba(59,130,246,0.08)" : "transparent",
                        border: seciliMi ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent" }}>
                      <div style={{ textAlign: "center", fontSize: 13, fontWeight: bugunMu ? 800 : 400, color: bugunMu ? "#3B82F6" : "#94A3B8", width: 26, height: 26, borderRadius: "50%", background: bugunMu ? "rgba(59,130,246,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px" }}>
                        {gun}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
                        {gunNoktalari(gunOlaylar).map((renk, idx) => (
                          <div key={idx} style={{ width: 6, height: 6, borderRadius: "50%", background: renk }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="takvim-legend" style={{ display: "flex", gap: 16, padding: "10px 16px", borderTop: "1px solid rgba(59,130,246,0.06)" }}>
                {sekme === "ekonomik"
                  ? Object.entries(ONEM_RENK).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: v }} />
                        <span style={{ fontSize: 11, color: "#475569" }}>{k} Önem</span>
                      </div>
                    ))
                  : (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEKME_RENK[sekme] }} />
                      <span style={{ fontSize: 11, color: "#475569" }}>
                        {sekme === "bilanco" ? "Bilanço açıklaması" : sekme === "temettu" ? "Temettü ödemesi" : "Halka arz etkinliği"}
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <div style={{ ...KART, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>
                  {seciliTarih.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" })}
                </span>
                {seciliOlaylar.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,0.1)", borderRadius: 20, padding: "2px 8px" }}>{seciliOlaylar.length} etkinlik</span>
                )}
              </div>

              {seciliOlaylar.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#334155", fontSize: 13 }}>{bosMesaj}</div>
              ) : (
                <GunDetay olaylar={seciliOlaylar} sekme={sekme} isMobil={isMobil} git={git} />
              )}
              {sekme === "halka-arz" && (
                // Takvim ay-kapsamli; arzlarin tam listesi (aktif + gecmis) ayri sayfada durur.
                <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(59,130,246,0.06)", textAlign: "center" }}>
                  <a href="/halka-arz" style={{ fontSize: 12, color: "#60A5FA", textDecoration: "none", fontWeight: 600 }}>
                    Tüm halka arzları listele →
                  </a>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...KART, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  {sekme === "ekonomik" ? "Yaklaşan Yüksek Önem" : "Yaklaşan"}
                </span>
              </div>
              {yaklasan.length === 0 ? (
                <div style={{ padding: 16, color: "#334155", fontSize: 12, textAlign: "center" }}>
                  {yukleniyor ? "Yükleniyor..." : "Bu ay yaklaşan etkinlik yok."}
                </div>
              ) : yaklasan.map((e, i) => {
                const t = new Date(e.tarih + "T00:00:00");
                const baslik = e.tip === "ekonomik" ? e.baslik
                  : e.tip === "halka-arz" ? `${e.kod} · ${e.asama}`
                  : e.tip === "bilanco" ? `${e.ticker} · ${e.donem ?? "bilanço"} bilançosu`
                  : `${e.ticker} · temettü ödemesi`;
                const altBilgi = e.tip === "ekonomik" ? (e.beklenti ? `Beklenti: ${e.beklenti}` : null)
                  : e.tip === "temettu" ? (e.netTutar !== null ? `Net ${formatCurrency(e.netTutar)}` : null)
                  : e.tip === "halka-arz" ? e.sirketAdi : null;
                return (
                  <div key={i} onClick={() => setSeciliGun(e.tarih)} className="takvim-satir"
                    style={{ padding: "10px 16px", borderBottom: i < yaklasan.length - 1 ? "1px solid rgba(59,130,246,0.04)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", minWidth: 32, textAlign: "center", background: SEKME_RENK[sekme] + "1F", borderRadius: 6, padding: "2px 6px" }}>{t.getDate()}</div>
                      <span style={{ fontSize: 11, color: "#64748B" }}>
                        {AYLAR[t.getMonth()]}{e.tip === "ekonomik" ? ` · ${e.saat}` : ""}
                      </span>
                      {e.tip === "ekonomik" && <span style={{ marginLeft: "auto", fontSize: 14 }}>{e.ulke}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: "#94A3B8", marginLeft: 40 }}>{baslik}</p>
                    {altBilgi && <p style={{ fontSize: 11, color: "#475569", marginLeft: 40, marginTop: 2 }}>{altBilgi}</p>}
                  </div>
                );
              })}
            </div>

            <div style={{ ...KART, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>Bu Ay</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {istatistik.map((s) => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ fontSize: 11, color: "#334155", lineHeight: 1.6 }}>
              Kaynaklar: KAP (bilanço/temettü), TCMB &amp; TÜİK &amp; Fed resmi takvimleri, ForexFactory.
              Şirket beyanlı bilanço tarihleri değişebilir. Bu sayfa yatırım tavsiyesi değildir.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function GunDetay({ olaylar, sekme, isMobil, git }: {
  olaylar: Olay[]; sekme: SekmeId; isMobil: boolean; git: (link: string | null) => void;
}) {
  const cizgi = (i: number, n: number) => (i < n - 1 ? "1px solid rgba(59,130,246,0.04)" : "none");

  if (isMobil) {
    return (
      <div>
        {olaylar.map((e, i) => (
          <div key={i} className="takvim-satir" onClick={() => git(e.tip === "ekonomik" ? e.link : e.link)}
            style={{ padding: "12px 16px", borderBottom: cizgi(i, olaylar.length) }}>
            {e.tip === "ekonomik" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{e.ulke}</span>
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{e.saat}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: ONEM_RENK[e.onem], background: ONEM_RENK[e.onem] + "22", borderRadius: 20, padding: "2px 8px" }}>{e.onem}</span>
                </div>
                <p className="takvim-event-title" style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 500, marginBottom: 4 }}>{e.baslik}</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {e.beklenti && <span style={{ fontSize: 11, color: "#475569" }}>Beklenti: <span style={{ color: "#94A3B8" }}>{e.beklenti}</span></span>}
                  {e.onceki && <span style={{ fontSize: 11, color: "#475569" }}>Önceki: <span style={{ color: "#64748B" }}>{e.onceki}</span></span>}
                  {e.gerceklesen && <span style={{ fontSize: 11, color: "#475569" }}>Gerçekleşen: <span style={{ color: "#10B981" }}>{e.gerceklesen}</span></span>}
                </div>
              </>
            ) : e.tip === "halka-arz" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.logoUrl && <img src={e.logoUrl} alt={e.kod} width={32} height={32} style={{ objectFit: "contain", borderRadius: 6 }} />}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, color: "#3B82F6", fontWeight: 800 }}>{e.kod}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, overflowWrap: "anywhere" }}>{e.asama}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: HA_DURUM[e.durum]?.renk ?? "#94A3B8", whiteSpace: "nowrap" }}>{HA_DURUM[e.durum]?.label ?? e.durum}</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 13, color: "#3B82F6", fontWeight: 800 }}>{e.ticker}</p>
                  <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                    {e.tip === "bilanco" ? `${e.donem ?? "—"} dönemi${e.tarihKesin ? "" : " · tahmini"}` : e.odemeSekli ?? "Nakit temettü"}
                  </p>
                </div>
                {e.tip === "temettu"
                  ? <span style={{ fontSize: 13, color: "#10B981", fontWeight: 700, whiteSpace: "nowrap" }}>{e.netTutar !== null ? formatCurrency(e.netTutar) : "—"}</span>
                  : <span style={{ fontSize: 11, fontWeight: 700, color: e.durum === "aciklandi" ? "#10B981" : "#F59E0B", whiteSpace: "nowrap" }}>{e.durum === "aciklandi" ? "Açıklandı" : "Bekleniyor"}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  const basliklar =
    sekme === "ekonomik" ? ["Saat", "Ülke", "Etkinlik", "Önem", "Beklenti", "Önceki", "Gerçekleşen"]
    : sekme === "bilanco" ? ["Hisse", "Dönem", "Açıklama Tarihi", "Durum", "KAP"]
    : sekme === "temettu" ? ["Hisse", "Brüt (TL)", "Net (TL)", "Stopaj", "Ödeme Şekli", "Genel Kurul"]
    : ["Kod", "Şirket", "Aşama", "Fiyat", "Büyüklük", "Durum"];

  return (
    <div className="takvim-table-scroll">
      <table style={{ width: "100%", minWidth: sekme === "ekonomik" ? 760 : 700, fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
            {basliklar.map((h, i) => (
              <th key={h} style={{ ...TH, textAlign: i === (sekme === "ekonomik" ? 2 : 1) ? "left" : i === 0 ? "left" : "center" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {olaylar.map((e, i) => (
            <tr key={i} className="takvim-satir" onClick={() => git(e.link)} style={{ borderBottom: cizgi(i, olaylar.length) }}>
              {e.tip === "ekonomik" ? (
                <>
                  <td style={{ padding: "10px 12px", color: "#64748B", fontWeight: 500 }}>{e.saat}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 16 }}>{e.ulke}</td>
                  <td className="takvim-event-title" style={{ padding: "10px 12px", color: e.onem === "Yüksek" ? "#F1F5F9" : "#CBD5E1", fontWeight: e.onem === "Yüksek" ? 700 : 500, borderLeft: e.onem === "Yüksek" ? `2px solid ${ONEM_RENK.Yüksek}` : "2px solid transparent" }}>{e.baslik}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ONEM_RENK[e.onem], background: ONEM_RENK[e.onem] + "22", borderRadius: 20, padding: "2px 8px" }}>{e.onem}</span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#94A3B8" }}>{e.beklenti || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748B" }}>{e.onceki || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: e.gerceklesen ? "#10B981" : "#334155" }}>{e.gerceklesen || "—"}</td>
                </>
              ) : e.tip === "bilanco" ? (
                <>
                  <td style={{ padding: "10px 12px", color: "#3B82F6", fontWeight: 700 }}>{e.ticker}</td>
                  <td style={{ padding: "10px 12px", color: "#CBD5E1" }}>{e.donem ?? "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#94A3B8" }}>
                    {kisaTarih(e.tarih)}{!e.tarihKesin && <span style={{ fontSize: 10, color: "#475569" }}> (tahmini)</span>}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: e.durum === "aciklandi" ? "#10B981" : "#F59E0B" }}>{e.durum === "aciklandi" ? "Açıklandı" : "Bekleniyor"}</span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    {e.kapLink ? <a href={e.kapLink} target="_blank" rel="noopener noreferrer" onClick={(ev) => ev.stopPropagation()} style={{ fontSize: 12, color: "#60A5FA", textDecoration: "none" }}>Bildirim ↗</a> : "—"}
                  </td>
                </>
              ) : e.tip === "temettu" ? (
                <>
                  <td style={{ padding: "10px 12px", color: "#3B82F6", fontWeight: 700 }}>{e.ticker}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#94A3B8" }}>{e.brutTutar !== null ? formatCurrency(e.brutTutar) : "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#10B981", fontWeight: 600 }}>{e.netTutar !== null ? formatCurrency(e.netTutar) : "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748B" }}>{e.stopajOrani !== null ? `%${e.stopajOrani}` : "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#94A3B8" }}>{e.odemeSekli ?? "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748B" }}>{kisaTarih(e.genelKurulTarihi)}</td>
                </>
              ) : (
                <>
                  <td style={{ padding: "10px 12px", color: "#3B82F6", fontWeight: 700 }}>{e.kod}</td>
                  <td className="takvim-event-title" style={{ padding: "10px 12px", color: "#CBD5E1" }}>{e.sirketAdi}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#94A3B8" }}>{e.asama}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#94A3B8" }}>
                    {e.fiyat !== null ? (e.fiyatUst && e.fiyatUst !== e.fiyat ? `${e.fiyat}–${e.fiyatUst} ₺` : formatCurrency(e.fiyat)) : "—"}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748B" }}>{e.buyukluk ?? "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: HA_DURUM[e.durum]?.renk ?? "#94A3B8" }}>{HA_DURUM[e.durum]?.label ?? e.durum}</span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TakvimPage() {
  return (
    <AppShell>
      <Suspense fallback={<div style={{ background: "#0B1220", minHeight: "100vh" }} />}>
        <TakvimIcerik />
      </Suspense>
    </AppShell>
  );
}
