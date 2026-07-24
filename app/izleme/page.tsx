"use client";

import { useEffect, useState, useCallback, useId } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import AppShell from "@/components/AppShell";
import StockLogo from "@/components/StockLogo";
import { EnstrumanIkon } from "@/components/EnstrumanIkon";
import { BIST_HISSELER } from "@/lib/bist-hisseler";
import { ENSTRUMANLAR } from "@/lib/enstruman-pricing";
import { tickerRenk } from "@/lib/utils";
import { formatPercent } from "@/lib/formatters";

type VarlikTur = "hisse" | "fon" | "doviz" | "maden";
type Oneri = { kod: string; ad: string; tur: VarlikTur };
const PARA_SEMBOL: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€", JPY: "¥" };

// Varlik meta: ad + detay linki + fiyat sembolu (izleme satiri per-tur render'i icin).
function varlikLink(kod: string, tur: VarlikTur): string {
  if (tur === "hisse") return `/hisse/${kod}`;
  if (tur === "fon") return `/fon/${kod}`;
  return `/doviz-maden/${kod}`;
}

type GrafikPoint = {
  fiyat: number;
};

const PER_PAGE = 10;

function SparklineSVG({ ticker, yukselis }: { ticker: string; yukselis: boolean }) {
  const [pts, setPts] = useState<number[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/grafik?ticker=${ticker}.IS&range=1d`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        const arr = Array.isArray(d) ? d : (d?.points || []);
        if (arr.length > 0) setPts((arr as GrafikPoint[]).map((x) => x.fiyat));
      }).catch(() => {});
    return () => { alive = false; };
  }, [ticker]);
  if (pts.length < 2) return <div style={{width:100,height:50,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,color:"#334155"}}>...</span></div>;
  const max = Math.max(...pts), min = Math.min(...pts);
  const norm = pts.map(p => 45 - ((p - min) / (max - min || 1)) * 40);
  const w = 100 / (pts.length - 1);
  const path = norm.map((y, i) => `${i === 0 ? "M" : "L"}${i * w},${y}`).join(" ");
  return (
    <svg width="100" height="50" viewBox={`0 0 100 50`} style={{overflow:"hidden"}}>
      <path d={path} fill="none" stroke={yukselis ? "#10B981" : "#EF4444"} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

export default function IzlemePage() {
  const [watchlist, setWatchlist] = useState<{ ticker: string; added_at: string; tur: VarlikTur }[]>([]);
  const [fiyatlar, setFiyatlar] = useState<Record<string, { fiyat: string; degisim: string; yukselis: boolean } | null>>({});
  const [fonListesi, setFonListesi] = useState<{ kod: string; unvan: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [aramaInput, setAramaInput] = useState("");
  const [aramaAcik, setAramaAcik] = useState(false);
  const [aktifOneriIndex, setAktifOneriIndex] = useState(0);
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [sayfa, setSayfa] = useState(1);
  const router = useRouter();
  const searchListboxId = useId();

  // Cok-kaynak fiyat: hisse -> /api/fiyatlar, doviz/maden -> /api/doviz-maden, fon -> fon_snapshots.
  // Gosterime hazir (sembollu) fiyat string'i doner; hepsi ayni { fiyat, degisim, yukselis } sekline mapped.
  const fiyatlariGetir = useCallback(async (items: { ticker: string; tur: VarlikTur }[]) => {
    const hisseKodlar = items.filter(i => i.tur === "hisse").map(i => i.ticker);
    const fonKodlar = items.filter(i => i.tur === "fon").map(i => i.ticker);
    const enstrumanVar = items.some(i => i.tur === "doviz" || i.tur === "maden");
    const [hisseJson, dmJson, fonRes] = await Promise.all([
      hisseKodlar.length ? fetch(`/api/fiyatlar?extra=${hisseKodlar.join(",")}`).then(r => r.json()).catch(() => ({})) : Promise.resolve({}),
      enstrumanVar ? fetch("/api/doviz-maden", { cache: "no-store" }).then(r => r.json()).catch(() => null) : Promise.resolve(null),
      fonKodlar.length ? supabase.from("fon_snapshots").select("kod, fiyat, gunluk_getiri").in("kod", fonKodlar) : Promise.resolve({ data: [] }),
    ]);
    const map: Record<string, { fiyat: string; degisim: string; yukselis: boolean }> = {};
    for (const [k, v] of Object.entries(hisseJson as Record<string, { fiyat?: string; degisim?: string; yukselis?: boolean }>)) {
      if (v?.fiyat) map[k] = { fiyat: `${v.fiyat} ₺`, degisim: String(v.degisim ?? "0"), yukselis: !!v.yukselis };
    }
    for (const it of (dmJson?.items ?? []) as { kod: string; tur: string; fiyat: number | null; degisim_yuzde: number | null; para_birimi: string }[]) {
      if (it.fiyat == null) continue;
      const hane = it.tur === "doviz" ? (it.fiyat < 10 ? 4 : it.fiyat < 100 ? 3 : 2) : 2;
      const s = it.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: hane, maximumFractionDigits: hane });
      map[it.kod] = { fiyat: `${s} ${PARA_SEMBOL[it.para_birimi] || it.para_birimi}`, degisim: String(it.degisim_yuzde ?? 0), yukselis: (it.degisim_yuzde ?? 0) >= 0 };
    }
    for (const f of ((fonRes as { data?: { kod: string; fiyat: number | null; gunluk_getiri: number | null }[] })?.data ?? [])) {
      if (f.fiyat == null) continue;
      const s = f.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
      map[f.kod] = { fiyat: `${s} ₺`, degisim: String(f.gunluk_getiri ?? 0), yukselis: (f.gunluk_getiri ?? 0) >= 0 };
    }
    setFiyatlar(prev => ({ ...prev, ...map }));
  }, []);

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    // tur kolonu migration oncesi olmayabilir -> hata olursa tur'suz oku (mevcut hisse izlemeleri kirilmasin).
    let rows = null as { ticker: string; added_at: string; tur?: string }[] | null;
    const ilk = await supabase.from("watchlist").select("ticker, added_at, tur").eq("user_id", session.user.id).order("added_at", { ascending: false });
    if (ilk.error) {
      const yedek = await supabase.from("watchlist").select("ticker, added_at").eq("user_id", session.user.id).order("added_at", { ascending: false });
      rows = yedek.data;
    } else {
      rows = ilk.data;
    }
    if (rows) {
      const items = rows.map((w) => ({ ticker: w.ticker, added_at: w.added_at, tur: (w.tur ?? "hisse") as VarlikTur }));
      setWatchlist(items);
      void fiyatlariGetir(items);
    }
    setLoading(false);
  }, [router, fiyatlariGetir]);

  useEffect(() => { queueMicrotask(() => void loadData()); }, [loadData]);

  // Fon arama listesi (kod+unvan) — bir kez cekilir.
  useEffect(() => {
    supabase.from("fon_snapshots").select("kod, unvan").then(({ data }) => { if (data) setFonListesi(data); });
  }, []);

  async function addToWatchlist(kodRaw: string, tur: VarlikTur) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const kod = tur === "hisse" || tur === "fon" ? kodRaw.replace(/\0/g, "").trim().toUpperCase() : kodRaw.replace(/\0/g, "").trim().toLowerCase();
    if (!kod || watchlist.find(w => w.ticker === kod && w.tur === tur)) return;
    const { error } = await supabase.from("watchlist").insert({ user_id: session.user.id, ticker: kod, tur });
    if (error) { console.error("Watchlist ekleme hatasi:", error.message); return; }
    const yeni = { ticker: kod, added_at: new Date().toISOString(), tur };
    setWatchlist(prev => [yeni, ...prev]);
    setAramaInput(""); setAramaAcik(false); setAktifOneriIndex(0);
    void fiyatlariGetir([yeni]);
  }

  async function removeFromWatchlist(ticker: string, tur: VarlikTur) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("ticker", ticker).eq("tur", tur);
    if (error) { console.error("Watchlist silme hatasi:", error.message); return; }
    setWatchlist(prev => prev.filter(w => !(w.ticker === ticker && w.tur === tur)));
  }

  // Varlik adi cozumu (satir + arama gosterimi).
  const varlikAd = useCallback((kod: string, tur: VarlikTur): string => {
    if (tur === "hisse") return BIST_HISSELER.find(h => h.ticker === kod)?.ad ?? "";
    if (tur === "fon") return fonListesi.find(f => f.kod === kod)?.unvan ?? "";
    return ENSTRUMANLAR.find(e => e.kod === kod)?.ad ?? kod.toUpperCase();
  }, [fonListesi]);

  const yukselenler = watchlist.filter(w => fiyatlar[w.ticker]?.yukselis);
  const dusenler = watchlist.filter(w => fiyatlar[w.ticker] && !fiyatlar[w.ticker]?.yukselis);
  const degisimler = watchlist.map(w => parseFloat(String(fiyatlar[w.ticker]?.degisim || "0").replace(",","."))).filter(d => !isNaN(d));
  const ortDegisim = degisimler.length ? degisimler.reduce((a,b) => a+b, 0) / degisimler.length : 0;

  const topYükselen = [...watchlist].filter(w => fiyatlar[w.ticker]?.yukselis)
    .sort((a,b) => parseFloat(String(fiyatlar[b.ticker]?.degisim||"0").replace(",",".")) - parseFloat(String(fiyatlar[a.ticker]?.degisim||"0").replace(",","."))).slice(0,3);
  const topDüşen = [...watchlist].filter(w => fiyatlar[w.ticker] && !fiyatlar[w.ticker]?.yukselis)
    .sort((a,b) => parseFloat(String(fiyatlar[a.ticker]?.degisim||"0").replace(",",".")) - parseFloat(String(fiyatlar[b.ticker]?.degisim||"0").replace(",","."))).slice(0,3);

  const totalPages = Math.ceil(watchlist.length / PER_PAGE);
  const paginated = watchlist.slice((sayfa-1)*PER_PAGE, sayfa*PER_PAGE);

  // Unified arama: hisse + doviz/maden + fon.
  const oneriler: Oneri[] = (() => {
    const q = aramaInput.trim();
    if (!q) return [];
    const Q = q.toUpperCase();
    const hisse: Oneri[] = BIST_HISSELER.filter(h => h.ticker.startsWith(Q) || h.ad.toUpperCase().includes(Q))
      .slice(0, 4).map(h => ({ kod: h.ticker, ad: h.ad, tur: "hisse" as VarlikTur }));
    const enstruman: Oneri[] = ENSTRUMANLAR.filter(e => e.kod.toUpperCase().includes(Q) || e.ad.toUpperCase().includes(Q))
      .slice(0, 3).map(e => ({ kod: e.kod, ad: e.ad, tur: e.tur as VarlikTur }));
    const fon: Oneri[] = fonListesi.filter(f => f.kod.startsWith(Q) || f.unvan.toUpperCase().includes(Q))
      .slice(0, 3).map(f => ({ kod: f.kod, ad: f.unvan, tur: "fon" as VarlikTur }));
    return [...hisse, ...enstruman, ...fon].slice(0, 8);
  })();
  const aktifOneri = oneriler[aktifOneriIndex];

  function handleAramaKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!oneriler.length) {
      if (e.key === "Escape") setAramaAcik(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAramaAcik(true);
      setAktifOneriIndex((i) => (i + 1) % oneriler.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAramaAcik(true);
      setAktifOneriIndex((i) => (i - 1 + oneriler.length) % oneriler.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sec = aktifOneri ?? oneriler[0];
      void addToWatchlist(sec.kod, sec.tur);
    } else if (e.key === "Escape") {
      setAramaAcik(false);
    }
  }

  if (loading) return (
    <AppShell>
      <div className="dot-grid" style={{ background: "#0B1220", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 28px" }}>
          <div className="skl" style={{ width: 180, height: 26, marginBottom: 8 }} />
          <div className="skl" style={{ width: 280, height: 13, marginBottom: 24, opacity: 0.6 }} />
          <div className="card-glass" style={{ borderRadius: 14, overflow: "hidden" }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(59,130,246,0.04)" }}>
                <div className="skl" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
                <div className="skl" style={{ width: "22%", height: 13 }} />
                <div className="skl" style={{ width: "14%", height: 13, marginLeft: "auto" }} />
                <div className="skl" style={{ width: 90, height: 13 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="dot-grid" style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <style>{`
          .izleme-main { max-width: 1280px; margin: 0 auto; padding: 28px 28px; }
          .izleme-baslik { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
          .izleme-baslik-aksiyonlar { display: flex; gap: 8px; align-items: center; }
          .izleme-ozet-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .izleme-icerik-grid { display: grid; grid-template-columns: 1fr 300px; gap: 16px; }
          .izleme-tablo-header { display: grid; grid-template-columns: 2fr 1fr 1fr 120px 100px; padding: 10px 18px; border-bottom: 1px solid rgba(59,130,246,0.06); gap: 8px; }
          .izleme-tablo-satir { display: grid; grid-template-columns: 2fr 1fr 1fr 120px 100px; padding: 12px 18px; border-bottom: 1px solid rgba(59,130,246,0.04); gap: 8px; align-items: center; transition: background 0.15s ease, transform 0.15s ease; }
          .izleme-search-wrap { position: relative; }
          .izleme-search-panel { position: absolute; top: calc(100% + 4px); left: 0; right: 0; min-width: 220px; background: #0F1C2E; border: 1px solid rgba(59,130,246,0.2); border-radius: 8px; z-index: 100; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.36); }
          .izleme-text-clip { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          @keyframes donut-draw { from { stroke-dashoffset: 314; } }
          .donut-segment { animation: donut-draw 1s cubic-bezier(0.4,0,0.2,1) forwards; }
          .izleme-sag-panel { display: flex; flex-direction: column; gap: 12px; }
          @media (max-width: 768px) {
            .izleme-main { padding: 14px 12px; }
            .izleme-baslik { flex-direction: column; gap: 12px; }
            .izleme-baslik-aksiyonlar { width: 100%; flex-wrap: wrap; }
            .izleme-search-wrap { width: 100%; }
            .izleme-search-wrap > div:first-child { width: 100%; box-sizing: border-box; }
            .izleme-search-panel { position: fixed; left: 12px; right: 12px; top: 96px; max-height: min(420px, calc(100vh - 150px)); overflow-y: auto; border-radius: 12px; }
            .izleme-ozet-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
            .izleme-icerik-grid { grid-template-columns: 1fr; }
            .izleme-sag-panel { display: none; }
            .izleme-tablo-header { display: none; }
            .izleme-tablo-satir { grid-template-columns: minmax(0, 1fr) auto; row-gap: 10px; padding: 14px; }
            .izleme-tablo-satir > div:nth-child(1) { min-width: 0; }
            .izleme-tablo-satir > div:nth-child(2) { text-align: right; }
            .izleme-tablo-satir > div:nth-child(3) { grid-column: 1 / 2; }
            .izleme-tablo-satir > svg, .izleme-tablo-satir > div:nth-child(4) { grid-column: 1 / 2; width: 100%; max-width: 150px; }
            .izleme-tablo-satir > div:nth-child(5) { grid-column: 2 / 3; grid-row: 2 / 4; justify-content: flex-end; align-self: end; }
          }
        `}</style>
        <main className="izleme-main">

          {/* Baslik */}
          <div className="izleme-baslik animate-fade-up">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>&#9733;</span>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC" }}>İzleme Listem</h1>
                <span className="delay-pill">15 dk gecikmeli</span>
              </div>
              <p style={{ fontSize: 12, color: "#475569" }}>Takip ettiğin hisse, fon, döviz ve kıymetli madenleri buradan yönet, anlık gelişmeleri kaçırma.</p>
            </div>
            <div className="izleme-baslik-aksiyonlar">
              {/* Arama */}
              <div className="izleme-search-wrap">
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "7px 14px" }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>&#128269;</span>
                  <input
                    value={aramaInput}
                    onChange={e => { setAramaInput(e.target.value); setAramaAcik(true); setAktifOneriIndex(0); }}
                    onFocus={() => setAramaAcik(true)}
                    onBlur={() => setTimeout(() => setAramaAcik(false), 150)}
                    onKeyDown={handleAramaKeyDown}
                    role="combobox"
                    aria-label="İzleme listesine varlık ara"
                    aria-autocomplete="list"
                    aria-expanded={aramaAcik && oneriler.length > 0}
                    aria-controls={searchListboxId}
                    placeholder="Hisse, fon, döviz, maden ara..."
                    style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "#E2E8F0", width: 140, minWidth: 0, flex: 1 }}
                  />
                  <span style={{ fontSize: 11, color: "#334155", background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "2px 6px" }}>&#8984;K</span>
                </div>
                {aramaAcik && oneriler.length > 0 && (
                  <div id={searchListboxId} className="izleme-search-panel" role="listbox" aria-label="İzleme varlık önerileri">
                    {oneriler.map((o, index) => {
                      const etiket = o.tur === "hisse" ? "Hisse" : o.tur === "fon" ? "Fon" : o.tur === "doviz" ? "Döviz" : "Maden";
                      const etiketRenk = o.tur === "hisse" ? "#60A5FA" : o.tur === "fon" ? "#2DD4BF" : o.tur === "doviz" ? "#818CF8" : "#FBBF24";
                      return (
                        <div
                          key={`${o.tur}:${o.kod}`}
                          role="option"
                          aria-selected={index === aktifOneriIndex}
                          tabIndex={0}
                          onMouseDown={() => addToWatchlist(o.kod, o.tur)}
                          onFocus={() => setAktifOneriIndex(index)}
                          style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(59,130,246,0.06)", background: index === aktifOneriIndex ? "rgba(59,130,246,0.08)" : "transparent" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.08)")}
                          onMouseLeave={e => (e.currentTarget.style.background = index === aktifOneriIndex ? "rgba(59,130,246,0.08)" : "transparent")}>
                          <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: etiketRenk, background: `${etiketRenk}1a`, borderRadius: 4, padding: "2px 5px", flexShrink: 0 }}>{etiket}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{o.tur === "doviz" || o.tur === "maden" ? o.ad : o.kod}</span>
                          </span>
                          <span className="izleme-text-clip" style={{ fontSize: 11, color: "#475569", maxWidth: 150, textAlign: "right" }}>{o.tur === "doviz" || o.tur === "maden" ? "" : o.ad}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <button onClick={() => setAramaAcik(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#1E40AF", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                + Varlık Ekle
              </button>
              <button onClick={() => setDuzenleModu(!duzenleModu)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#94A3B8", cursor: "pointer" }}>
                &#9998; {duzenleModu ? "Tamam" : "Düzenle"}
              </button>
            </div>
          </div>

          {/* Ozet Kartlar */}
          <div className="izleme-ozet-grid">
            {[
              { label: "Toplam Varlık", icon: "📋", value: watchlist.length, sub: "İzleme listenizde", color: "#3B82F6" },
              { label: "Yükselenler", icon: "↗", value: yukselenler.length, sub: formatPercent(watchlist.length ? (yukselenler.length/watchlist.length)*100 : 0, { fractionDigits: 0, signDisplay: "never" }), color: "#10B981" },
              { label: "Düşenler", icon: "↘", value: dusenler.length, sub: formatPercent(watchlist.length ? (dusenler.length/watchlist.length)*100 : 0, { fractionDigits: 0, signDisplay: "never" }), color: "#EF4444" },
              { label: "Ort. Günlük Değişim", icon: "≒", value: formatPercent(Math.abs(ortDegisim), { signDisplay: "never" }), sub: "İzleme listeniz ortalaması", color: ortDegisim >= 0 ? "#10B981" : "#EF4444" },
            ].map((k, i) => (
              <div key={i} className="card-glass hover-glow" style={{ borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${k.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {k.icon}
                </div>
                <div>
                  <p style={{ fontSize: 12, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</p>
                  <p style={{ fontSize: 12, color: "#334155", marginTop: 3 }}>{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ana Icerik */}
          <div className="izleme-icerik-grid">

            {/* Tablo */}
            <div className="card-glass" style={{ borderRadius: 12, overflow: "hidden" }}>
              {/* Tablo Baslik */}
              <div className="izleme-tablo-header">
                {["VARLIK","SON FİYAT","GÜNLÜK DEĞİŞİM","GRAFİK","İŞLEM"].map(h => (
                  <span key={h} style={{ fontSize: 12, fontWeight: 600, color: "#334155", letterSpacing: "0.07em" }}>{h}</span>
                ))}
              </div>

              {watchlist.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12 }}>☆</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 6px" }}>İzleme listen henüz boş</p>
                  <p style={{ fontSize: 12.5, color: "#475569", margin: 0, lineHeight: 1.6, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
                    Yukarıdaki arama kutusundan hisse ekle. İzlemeye aldığın hisselerin KAP bildirimleri sade Türkçe özetiyle e-postana gelir.
                  </p>
                </div>
              ) : (
                paginated.map((w, i) => {
                  const f = fiyatlar[w.ticker];
                  const hisseInfo = w.tur === "hisse" ? BIST_HISSELER.find(b => b.ticker === w.ticker) : undefined;
                  const ad = varlikAd(w.ticker, w.tur);
                  const gorunenKod = w.tur === "doviz" || w.tur === "maden" ? (ENSTRUMANLAR.find(e => e.kod === w.ticker)?.ad ?? w.ticker.toUpperCase()) : w.ticker;
                  const link = varlikLink(w.ticker, w.tur);
                  const degisim = f ? parseFloat(String(f.degisim).replace(",",".")) : 0;
                  const addedDate = new Date(w.added_at).toLocaleDateString("tr-TR", { day:"2-digit", month:"short" });
                  return (
                    <div key={`${w.tur}:${w.ticker}`} className="izleme-tablo-satir" style={{ borderBottom: "1px solid rgba(59,130,246,0.04)", alignItems: "center",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.005)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "translateX(2px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.005)"; (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)"; }}>

                      {/* Varlik */}
                      <div onClick={() => router.push(link)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minWidth: 0 }}>
                        {w.tur === "hisse" ? (
                          <StockLogo ticker={w.ticker} domain={hisseInfo?.domain} size={28} radius={6} color={tickerRenk(w.ticker)} />
                        ) : w.tur === "fon" ? (
                          <span style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(45,212,191,0.14)", color: "#2DD4BF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{w.ticker.slice(0,3)}</span>
                        ) : (
                          <EnstrumanIkon tur={w.tur} kod={w.ticker} taban={w.tur === "doviz" ? w.ticker.split("-")[0]?.toUpperCase() : null} karsi={w.tur === "doviz" ? w.ticker.split("-")[1]?.toUpperCase() : null} boyut={28} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{gorunenKod}</div>
                          <div className="izleme-text-clip" style={{ fontSize: 12, color: "#475569", maxWidth: 260 }}>{w.tur === "doviz" || w.tur === "maden" ? "" : ad}</div>
                        </div>
                      </div>

                      {/* Fiyat */}
                      <div>
                        <div className="tabular" style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{f ? f.fiyat : "-"}</div>
                        <div style={{ fontSize: 12, color: "#334155" }}>{addedDate}</div>
                      </div>

                      {/* Degisim */}
                      <div>
                        {f ? (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 600, color: f.yukselis ? "#10B981" : "#EF4444" }}>
                              {f.yukselis ? "+" : "-"}{formatPercent(Math.abs(degisim), { signDisplay: "never" })}
                            </div>
                            <div style={{ fontSize: 12, color: "#334155" }}>0,00 ₺</div>
                          </>
                        ) : <span style={{ fontSize: 12, color: "#334155" }}>-</span>}
                      </div>



                      {/* Grafik — yalniz hisse (grafik endpoint'i fon/enstrumani desteklemez) */}
                      {w.tur === "hisse" ? <SparklineSVG ticker={w.ticker} yukselis={f?.yukselis ?? true} /> : <div style={{ width: 100, height: 50 }} />}



                      {/* Islem */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => router.push(link)}
                          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, cursor: "pointer", color: "#3B82F6", fontSize: 11, padding: "4px 10px", fontWeight: 600 }}>İncele</button>
                        {duzenleModu && (
                          <button onClick={() => removeFromWatchlist(w.ticker, w.tur)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 12, padding: 4 }}>&#10005;</button>
                        )}
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 14, padding: 4 }}>&#8942;</button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid rgba(59,130,246,0.06)" }}>
                  <span style={{ fontSize: 11, color: "#475569" }}>{watchlist.length} varlıktan {(sayfa-1)*PER_PAGE+1}-{Math.min(sayfa*PER_PAGE, watchlist.length)} arası gösteriliyor</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setSayfa(p => Math.max(1, p-1))} disabled={sayfa===1}
                      style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.1)", color: "#94A3B8", cursor: "pointer", fontSize: 12 }}>&#8249;</button>
                    {Array.from({length: totalPages}, (_, i) => (
                      <button key={i} onClick={() => setSayfa(i+1)}
                        style={{ width: 28, height: 28, borderRadius: 6, background: sayfa===i+1 ? "#1E40AF" : "rgba(255,255,255,0.04)", border: `1px solid ${sayfa===i+1 ? "#1E40AF" : "rgba(59,130,246,0.1)"}`, color: sayfa===i+1 ? "#fff" : "#94A3B8", cursor: "pointer", fontSize: 12 }}>
                        {i+1}
                      </button>
                    ))}
                    <button onClick={() => setSayfa(p => Math.min(totalPages, p+1))} disabled={sayfa===totalPages}
                      style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.1)", color: "#94A3B8", cursor: "pointer", fontSize: 12 }}>&#8250;</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sag Panel */}
            <div className="izleme-sag-panel">

              {/* Ozet Donut */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Izleme Listem Ozeti</span>
                  <span style={{ fontSize: 11, color: "#3B82F6", cursor: "pointer" }}>&#8599;</span>
                </div>
                {(() => {
                  const R = 40, cx = 50, cy = 50, sw = 12;
                  const circ = 2 * Math.PI * R;
                  const yPct = watchlist.length ? yukselenler.length / watchlist.length : 0;
                  const dPct = watchlist.length ? dusenler.length / watchlist.length : 0;
                  const yPct2 = watchlist.length ? (watchlist.length - yukselenler.length - dusenler.length) / watchlist.length : 1;
                  const segments = [
                    { pct: yPct, color: "#10B981", label: "Yükselen", count: yukselenler.length },
                    { pct: dPct, color: "#EF4444", label: "Düşen", count: dusenler.length },
                    { pct: yPct2, color: "#3B82F6", label: "Yatay", count: watchlist.length - yukselenler.length - dusenler.length },
                  ];
                  let acc = 0;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <svg width="100" height="100" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw}/>
                        {segments.map((s, i) => {
                          const dl = s.pct * circ;
                          const el = <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={s.color} strokeWidth={sw}
                            strokeDasharray={`${dl} ${circ-dl}`} strokeDashoffset={circ*0.25 - acc} strokeLinecap="butt" className="donut-segment" style={{ animationDelay: `${i * 0.15}s` }}/>;
                          acc += dl; return el;
                        })}
                      </svg>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {segments.map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }}/>
                            <span style={{ fontSize: 11, color: "#94A3B8" }}>{s.label}</span>
                            <span style={{ fontSize: 11, color: "#64748B", marginLeft: "auto" }}>{s.count} ({formatPercent(watchlist.length ? (s.count/watchlist.length)*100 : 0, { fractionDigits: 0, signDisplay: "never" })})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* En Cok Yükselen */}
              <div className="card-glass" style={{ borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>En Cok Yükselen</span>
                </div>
                {topYükselen.length === 0 ? <div style={{ padding: "20px 16px", textAlign: "center" }}><span style={{ fontSize: 12, color: "#475569" }}>Veri yükleniyor...</span></div> :
                  topYükselen.map((w, i) => (
                    <div key={i} onClick={() => router.push(varlikLink(w.ticker, w.tur))}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < topYükselen.length-1 ? "1px solid rgba(59,130,246,0.04)" : "none", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.04)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StockLogo ticker={w.ticker} size={24} radius={6} color="#10B981" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{w.ticker}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>+{formatPercent(Math.abs(parseFloat(String(fiyatlar[w.ticker]?.degisim||"0").replace(",","."))), { signDisplay: "never" })}</span>
                    </div>
                  ))
                }
              </div>

              {/* En Cok Düşen */}
              <div className="card-glass" style={{ borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>En Cok Düşen</span>
                </div>
                {topDüşen.length === 0 ? <div style={{ padding: "20px 16px", textAlign: "center" }}><span style={{ fontSize: 12, color: "#475569" }}>Veri yükleniyor...</span></div> :
                  topDüşen.map((w, i) => (
                    <div key={i} onClick={() => router.push(varlikLink(w.ticker, w.tur))}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < topDüşen.length-1 ? "1px solid rgba(59,130,246,0.04)" : "none", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.04)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StockLogo ticker={w.ticker} size={24} radius={6} color="#EF4444" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{w.ticker}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}>-{formatPercent(Math.abs(parseFloat(String(fiyatlar[w.ticker]?.degisim||"0").replace(",","."))), { signDisplay: "never" })}</span>
                    </div>
                  ))
                }
              </div>

              {/* Son Haberler */}
              <div className="card-glass" style={{ borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Son Haberler</span>
                  <Link href="/haberler" style={{ fontSize: 11, color: "#3B82F6", textDecoration: "none" }}>Tümünü Gör →</Link>
                </div>
                <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 22 }}>📰</div>
                  <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.5 }}>Takip ettiğiniz hisselere ait<br/>haberleri Haberler sayfasından takip edin</p>
                  <Link href="/haberler" style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: "#3B82F6", textDecoration: "none", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", padding: "6px 14px", borderRadius: 6 }}>Haberlere Git →</Link>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
