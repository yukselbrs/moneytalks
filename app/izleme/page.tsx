"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import AppShell from "@/components/AppShell";
import StockLogo from "@/components/StockLogo";
const BIST_HISSELER = [
  { ticker: "THYAO", name: "Türk Hava Yolları", kisalt: "THY", domain: "turkishairlines.com" },
  { ticker: "GARAN", name: "Garanti Bankası", kisalt: "GARANTİ", domain: "garanti.com.tr" },
  { ticker: "ASELS", name: "Aselsan", kisalt: "ASELS" },
  { ticker: "EREGL", name: "Ereğli Demir Çelik", kisalt: "EREĞLİ" },
  { ticker: "SISE", name: "Şişecam", kisalt: "ŞİŞECAM" },
  { ticker: "AKBNK", name: "Akbank", kisalt: "AKBANK", domain: "akbank.com" },
  { ticker: "KCHOL", name: "Koç Holding", kisalt: "KOÇ" },
  { ticker: "BIMAS", name: "BİM Mağazalar", kisalt: "BİM", domain: "bim.com.tr" },
  { ticker: "TUPRS", name: "Tüpraş", domain: "tupras.com.tr" },
  { ticker: "SAHOL", name: "Sabancı Holding", domain: "sabanci.com" },
  { ticker: "YKBNK", name: "Yapı Kredi Bankası", domain: "yapikredi.com.tr" },
  { ticker: "TCELL", name: "Turkcell", domain: "turkcell.com.tr" },
  { ticker: "FROTO", name: "Ford Otosan", domain: "fordotosan.com.tr" },
  { ticker: "TOASO", name: "Tofaş Otomobil", domain: "tofas.com.tr" },
  { ticker: "PETKM", name: "Petkim", domain: "petkim.com.tr" },
  { ticker: "ARCLK", name: "Arçelik", domain: "arcelik.com" },
  { ticker: "KOZAL", name: "Koza Altın" },
  { ticker: "KOZAA", name: "Koza Anadolu Metal" },
  { ticker: "EKGYO", name: "Emlak Konut GYO" },
  { ticker: "ISGYO", name: "İş GYO" },
  { ticker: "HALKB", name: "Halkbank", domain: "halkbank.com.tr" },
  { ticker: "VAKBN", name: "Vakıfbank", domain: "vakifbank.com.tr" },
  { ticker: "ISCTR", name: "İş Bankası", domain: "isbank.com.tr" },
  { ticker: "ENKAI", name: "Enka İnşaat", domain: "enka.com" },
  { ticker: "DOHOL", name: "Doğan Holding" },
  { ticker: "TAVHL", name: "TAV Havalimanları", domain: "tav.aero" },
  { ticker: "PGSUS", name: "Pegasus Hava Yolları", domain: "flypgs.com" },
  { ticker: "LOGO", name: "Logo Yazılım" },
  { ticker: "NETAS", name: "Netaş Telekom" },
  { ticker: "VESBE", name: "Vestel Beyaz Eşya" },
  { ticker: "VESTL", name: "Vestel" },
  { ticker: "MGROS", name: "Migros", domain: "migros.com.tr" },
  { ticker: "SOKM", name: "Şok Marketler", domain: "sokmarket.com.tr" },
  { ticker: "ULKER", name: "Ülker Bisküvi", domain: "ulker.com.tr" },
  { ticker: "AEFES", name: "Anadolu Efes" },
  { ticker: "TTKOM", name: "Türk Telekom", domain: "turktelekom.com.tr" },
  { ticker: "TTRAK", name: "Türk Traktör" },
  { ticker: "OTKAR", name: "Otokar" },
  { ticker: "GUBRF", name: "Gübre Fabrikaları" },
  { ticker: "CIMSA", name: "Çimsa" },
  { ticker: "AKCNS", name: "Akçansa" },
  { ticker: "ALARK", name: "Alarko Holding" },
  { ticker: "GOLTS", name: "Göltaş Çimento" },
  { ticker: "KRDMD", name: "Kardemir" },
  { ticker: "ISDMR", name: "İskenderun Demir Çelik" },
  { ticker: "SASA", name: "Sasa Polyester", domain: "sasa.com.tr" },
  { ticker: "BRYAT", name: "Borusan Yatırım" },
  { ticker: "BRISA", name: "Brisa", domain: "brisa.com.tr" },
  { ticker: "DOAS", name: "Doğuş Otomotiv", domain: "dogusotomotiv.com.tr" },
];


const PER_PAGE = 10;

function tickerRenk(ticker: string) {
  const renkler = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316","#EC4899"];
  let h = 0; for (const c of ticker) h = (h * 31 + c.charCodeAt(0)) % renkler.length;
  return renkler[h];
}

function SparklineSVG({ ticker, yukselis }: { ticker: string; yukselis: boolean }) {
  const [pts, setPts] = useState<number[]>([]);
  useEffect(() => {
    fetch(`/api/grafik?ticker=${ticker}.IS&range=1d`)
      .then(r => r.json())
      .then(d => {
        const arr = Array.isArray(d) ? d : (d?.points || []);
        if (arr.length > 0) setPts(arr.map((x: any) => x.fiyat));
      }).catch(() => {});
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
  const [watchlist, setWatchlist] = useState<{ ticker: string; added_at: string }[]>([]);
  const [fiyatlar, setFiyatlar] = useState<Record<string, { fiyat: string; degisim: string; yukselis: boolean } | null>>({});
  const [loading, setLoading] = useState(true);
  const [aramaInput, setAramaInput] = useState("");
  const [aramaAcik, setAramaAcik] = useState(false);
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [sayfa, setSayfa] = useState(1);
  const router = useRouter();

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { data } = await supabase.from("watchlist").select("ticker, added_at")
      .eq("user_id", session.user.id).order("added_at", { ascending: false });
    if (data) {
      setWatchlist(data);
      const tickers = data.map((w: { ticker: string }) => w.ticker).join(",");
      if (tickers) {
        fetch(`/api/fiyatlar?extra=${tickers}`).then(r => r.json()).then(d => setFiyatlar(d));
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function addToWatchlist(ticker: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const clean = ticker.replace(/\0/g, "").trim().toUpperCase();
    if (!clean || watchlist.find(w => w.ticker === clean)) return;
    const { error } = await supabase.from("watchlist").insert({ user_id: session.user.id, ticker: clean });
    if (error) { console.error("Watchlist ekleme hatasi:", error.message); return; }
    setWatchlist(prev => [{ ticker: clean, added_at: new Date().toISOString() }, ...prev]);
    setAramaInput(""); setAramaAcik(false);
    if (clean) {
      fetch(`/api/fiyatlar?extra=${clean}`).then(r => r.json()).then(d => setFiyatlar(prev => ({...prev, ...d})));
    }
  }

  async function removeFromWatchlist(ticker: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("ticker", ticker);
    if (error) { console.error("Watchlist silme hatasi:", error.message); return; }
    setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
  }

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

  const filteredBIST = aramaInput.length > 0
    ? BIST_HISSELER.filter(h => h.ticker.startsWith(aramaInput.toUpperCase()) || h.name.toUpperCase().includes(aramaInput.toUpperCase())).slice(0,6)
    : [];

  if (loading) return <AppShell><div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0B1220"}}><p style={{color:"#475569",fontSize:13}}>Yükleniyor...</p></div></AppShell>;

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <style>{`
          .izleme-main { max-width: 1280px; margin: 0 auto; padding: 28px 28px; }
          .izleme-baslik { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
          .izleme-baslik-aksiyonlar { display: flex; gap: 8px; align-items: center; }
          .izleme-ozet-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .izleme-icerik-grid { display: grid; grid-template-columns: 1fr 300px; gap: 16px; }
          .izleme-tablo-header { display: grid; grid-template-columns: 2fr 1fr 1fr 120px 100px; padding: 10px 18px; border-bottom: 1px solid rgba(59,130,246,0.06); gap: 8px; }
          .izleme-tablo-satir { display: grid; grid-template-columns: 2fr 1fr 1fr 120px 100px; padding: 12px 18px; border-bottom: 1px solid rgba(59,130,246,0.04); gap: 8px; align-items: center; }
          .izleme-sag-panel { display: flex; flex-direction: column; gap: 12px; }
          @media (max-width: 768px) {
            .izleme-main { padding: 14px 12px; }
            .izleme-baslik { flex-direction: column; gap: 12px; }
            .izleme-baslik-aksiyonlar { width: 100%; flex-wrap: wrap; }
            .izleme-ozet-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
            .izleme-icerik-grid { grid-template-columns: 1fr; }
            .izleme-sag-panel { display: none; }
            .izleme-tablo-header { grid-template-columns: 1fr 80px 90px; }
            .izleme-tablo-header span:nth-child(4), .izleme-tablo-header span:nth-child(5) { display: none; }
            .izleme-tablo-satir { grid-template-columns: 1fr 80px 90px; }
            .izleme-tablo-satir > div:nth-child(4), .izleme-tablo-satir > div:nth-child(5) { display: none; }
          }
        `}</style>
        <main className="izleme-main">

          {/* Baslik */}
          <div className="izleme-baslik">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>&#9733;</span>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC" }}>İzleme Listem</h1>
              </div>
              <p style={{ fontSize: 12, color: "#475569" }}>Piyasayı takip ettiğin hisseleri buradan yönet ve anlık gelişmeleri kaçırma.</p>
            </div>
            <div className="izleme-baslik-aksiyonlar">
              {/* Arama */}
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "7px 14px" }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>&#128269;</span>
                  <input
                    value={aramaInput}
                    onChange={e => { setAramaInput(e.target.value); setAramaAcik(true); }}
                    onFocus={() => setAramaAcik(true)}
                    onBlur={() => setTimeout(() => setAramaAcik(false), 150)}
                    placeholder="Hisse ara..."
                    style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "#E2E8F0", width: 140 }}
                  />
                  <span style={{ fontSize: 11, color: "#334155", background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "2px 6px" }}>&#8984;K</span>
                </div>
                {aramaAcik && filteredBIST.length > 0 && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, zIndex: 100, overflow: "hidden", minWidth: 220 }}>
                    {filteredBIST.map(h => (
                      <div key={h.ticker} onMouseDown={() => addToWatchlist(h.ticker)}
                        style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(59,130,246,0.06)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.08)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{h.ticker}</span>
                        <span style={{ fontSize: 11, color: "#475569" }}>{h.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setAramaAcik(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#1E40AF", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                + Hisse Ekle
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
              { label: "Toplam Hisse", icon: "&#9993;", value: watchlist.length, sub: "İzleme listenizde", color: "#3B82F6" },
              { label: "Yükselenler", icon: "&#8599;", value: yukselenler.length, sub: `%${watchlist.length ? ((yukselenler.length/watchlist.length)*100).toFixed(0) : 0}`, color: "#10B981" },
              { label: "Düşenler", icon: "&#8600;", value: dusenler.length, sub: `%${watchlist.length ? ((dusenler.length/watchlist.length)*100).toFixed(0) : 0}`, color: "#EF4444" },
              { label: "Ort. Günlük Değişim", icon: "&#8786;", value: `%${Math.abs(ortDegisim).toFixed(2).replace(".",",")}`, sub: "İzleme listeniz ortalaması", color: ortDegisim >= 0 ? "#10B981" : "#EF4444" },
            ].map((k, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${k.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}
                  dangerouslySetInnerHTML={{__html: k.icon}}/>
                <div>
                  <p style={{ fontSize: 10, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</p>
                  <p style={{ fontSize: 10, color: "#334155", marginTop: 3 }}>{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ana Icerik */}
          <div className="izleme-icerik-grid">

            {/* Tablo */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden" }}>
              {/* Tablo Baslik */}
              <div className="izleme-tablo-header">
                {["HİSSE","SON FİYAT","GÜNLÜK DEĞİŞİM","GRAFİK","İŞLEM"].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.07em" }}>{h}</span>
                ))}
              </div>

              {watchlist.length === 0 ? (
                <div style={{ padding: "40px 18px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "#475569" }}>Izleme listeniz bos.</p>
                </div>
              ) : (
                paginated.map((w, i) => {
                  const f = fiyatlar[w.ticker];
                  const hisseInfo = BIST_HISSELER.find(b => b.ticker === w.ticker);
                  const degisim = f ? parseFloat(String(f.degisim).replace(",",".")) : 0;
                  const trend = !f ? "Yatay" : degisim > 0.5 ? "Yukselis" : degisim < -0.5 ? "Dusus" : "Yatay";
                  const trendRenk = trend === "Yukselis" ? "#10B981" : trend === "Dusus" ? "#EF4444" : "#64748B";
                  const addedDate = new Date(w.added_at).toLocaleDateString("tr-TR", { day:"2-digit", month:"short" });
                  return (
                    <div key={w.ticker} className="izleme-tablo-satir" style={{ borderBottom: "1px solid rgba(59,130,246,0.04)", alignItems: "center",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.005)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.04)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.005)"}>

                      {/* Hisse */}
                      <div onClick={() => router.push(`/hisse/${w.ticker}`)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <StockLogo ticker={w.ticker} domain={(hisseInfo as any)?.domain} size={28} imageSize={18} radius={6} color={tickerRenk(w.ticker)} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{w.ticker}</div>
                          <div style={{ fontSize: 10, color: "#475569" }}>{(hisseInfo as any)?.name || ""}</div>
                        </div>
                      </div>

                      {/* Fiyat */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{f ? `${f.fiyat} ₺` : "-"}</div>
                        <div style={{ fontSize: 10, color: "#334155" }}>{addedDate}</div>
                      </div>

                      {/* Degisim */}
                      <div>
                        {f ? (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 600, color: f.yukselis ? "#10B981" : "#EF4444" }}>
                              {f.yukselis ? "+" : "-"}%{Math.abs(degisim).toFixed(2).replace(".",",")}
                            </div>
                            <div style={{ fontSize: 10, color: "#334155" }}>0,00 ₺</div>
                          </>
                        ) : <span style={{ fontSize: 12, color: "#334155" }}>-</span>}
                      </div>



                      {/* Grafik */}
                      <SparklineSVG ticker={w.ticker} yukselis={f?.yukselis ?? true} />



                      {/* Islem */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => router.push(`/hisse/${w.ticker}`)}
                          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, cursor: "pointer", color: "#3B82F6", fontSize: 11, padding: "4px 10px", fontWeight: 600 }}>Incele</button>
                        {duzenleModu && (
                          <button onClick={() => removeFromWatchlist(w.ticker)}
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
                  <span style={{ fontSize: 11, color: "#475569" }}>{watchlist.length} hisseden {(sayfa-1)*PER_PAGE+1}-{Math.min(sayfa*PER_PAGE, watchlist.length)} arasi gosteriliyor</span>
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
                            strokeDasharray={`${dl} ${circ-dl}`} strokeDashoffset={circ*0.25 - acc} strokeLinecap="butt"/>;
                          acc += dl; return el;
                        })}
                      </svg>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {segments.map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }}/>
                            <span style={{ fontSize: 11, color: "#94A3B8" }}>{s.label}</span>
                            <span style={{ fontSize: 11, color: "#64748B", marginLeft: "auto" }}>{s.count} (%{watchlist.length ? ((s.count/watchlist.length)*100).toFixed(0) : 0})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* En Cok Yükselen */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>En Cok Yükselen</span>
                </div>
                {topYükselen.length === 0 ? <div style={{ padding: "20px 16px", textAlign: "center" }}><span style={{ fontSize: 12, color: "#475569" }}>Veri yükleniyor...</span></div> :
                  topYükselen.map((w, i) => (
                    <div key={i} onClick={() => router.push(`/hisse/${w.ticker}`)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < topYükselen.length-1 ? "1px solid rgba(59,130,246,0.04)" : "none", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.04)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StockLogo ticker={w.ticker} size={24} imageSize={15} radius={6} color="#10B981" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{w.ticker}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>+%{Math.abs(parseFloat(String(fiyatlar[w.ticker]?.degisim||"0").replace(",","."))).toFixed(2).replace(".",",")}</span>
                    </div>
                  ))
                }
              </div>

              {/* En Cok Düşen */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>En Cok Düşen</span>
                </div>
                {topDüşen.length === 0 ? <div style={{ padding: "20px 16px", textAlign: "center" }}><span style={{ fontSize: 12, color: "#475569" }}>Veri yükleniyor...</span></div> :
                  topDüşen.map((w, i) => (
                    <div key={i} onClick={() => router.push(`/hisse/${w.ticker}`)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < topDüşen.length-1 ? "1px solid rgba(59,130,246,0.04)" : "none", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.04)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StockLogo ticker={w.ticker} size={24} imageSize={15} radius={6} color="#EF4444" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{w.ticker}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}>-%{Math.abs(parseFloat(String(fiyatlar[w.ticker]?.degisim||"0").replace(",","."))).toFixed(2).replace(".",",")}</span>
                    </div>
                  ))
                }
              </div>

              {/* Son Haberler */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Son Haberler</span>
                  <span style={{ fontSize: 11, color: "#3B82F6", cursor: "pointer" }}>Tumunu Gor</span>
                </div>
                {watchlist.slice(0,3).map((w, i) => (
                  <div key={i} style={{ padding: "10px 16px", borderBottom: i < 2 ? "1px solid rgba(59,130,246,0.04)" : "none", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <StockLogo ticker={w.ticker} size={28} imageSize={17} radius={6} color={tickerRenk(w.ticker)} />
                    <div>
                      <div style={{ fontSize: 11, color: "#E2E8F0", lineHeight: 1.4 }}>{w.ticker} guncel gelisme takipte</div>
                      <div style={{ fontSize: 10, color: "#334155", marginTop: 3 }}>{new Date(w.added_at).toLocaleDateString("tr-TR", {day:"2-digit",month:"short",year:"numeric"})}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
