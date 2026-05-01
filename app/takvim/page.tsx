"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import useMediaQuery from "@/hooks/useMediaQuery";

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const GUNLER = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

const ETKINLIKLER: Record<string, {saat:string; baslik:string; onem:"Yüksek"|"Orta"|"Düşük"|"Şirket"; ulke?:string; beklenti?:string; onceki?:string}[]> = {
  "2026-04-28": [
    { saat:"10:00", baslik:"Durable Goods Orders (Mar)", onem:"Yüksek", ulke:"🇺🇸", beklenti:"%2,5", onceki:"%1,8" },
    { saat:"15:30", baslik:"Dallas Fed Manufacturing", onem:"Orta", ulke:"🇺🇸", beklenti:"-10", onceki:"-8,3" },
  ],
  "2026-04-29": [
    { saat:"10:00", baslik:"CB Consumer Confidence", onem:"Yüksek", ulke:"🇺🇸", beklenti:"95,0", onceki:"92,9" },
    { saat:"11:00", baslik:"Euro Bölgesi GSYH (1Ç)", onem:"Yüksek", ulke:"🇪🇺", beklenti:"%0,2", onceki:"%0,1" },
    { saat:"16:00", baslik:"JOLTS İş İlanları", onem:"Orta", ulke:"🇺🇸", beklenti:"7,5M", onceki:"7,6M" },
  ],
  "2026-04-30": [
    { saat:"09:00", baslik:"TCMB Faiz Kararı", onem:"Yüksek", ulke:"🇹🇷", beklenti:"%42,5", onceki:"%42,5" },
    { saat:"10:00", baslik:"ADP İstihdam Değişimi", onem:"Yüksek", ulke:"🇺🇸", beklenti:"120K", onceki:"155K" },
    { saat:"15:30", baslik:"Çekirdek PCE Fiyat Endeksi", onem:"Yüksek", ulke:"🇺🇸", beklenti:"%0,3", onceki:"%0,4" },
    { saat:"17:00", baslik:"FED Faiz Kararı", onem:"Yüksek", ulke:"🇺🇸", beklenti:"%4,25-%4,50", onceki:"%4,25-%4,50" },
  ],
  "2026-05-01": [
    { saat:"00:00", baslik:"İşçi Bayramı — Piyasalar Kapalı", onem:"Şirket", ulke:"🇹🇷" },
    { saat:"10:00", baslik:"Tarım Dışı İstihdam (Nis)", onem:"Yüksek", ulke:"🇺🇸", beklenti:"180K", onceki:"228K" },
    { saat:"10:00", baslik:"İşsizlik Oranı (Nis)", onem:"Yüksek", ulke:"🇺🇸", beklenti:"%4,2", onceki:"%4,2" },
  ],
  "2026-05-02": [
    { saat:"10:30", baslik:"ISM İmalat PMI (Nis)", onem:"Orta", ulke:"🇺🇸", beklenti:"48,5", onceki:"49,0" },
  ],
  "2026-05-05": [
    { saat:"11:00", baslik:"Euro Bölgesi Perakende Satışlar", onem:"Orta", ulke:"🇪🇺", beklenti:"%0,4", onceki:"-%0,1" },
    { saat:"14:00", baslik:"THYAO — 1Ç 2026 Bilanço", onem:"Şirket", ulke:"🇹🇷" },
  ],
  "2026-05-06": [
    { saat:"10:00", baslik:"ISM Hizmetler PMI", onem:"Orta", ulke:"🇺🇸", beklenti:"51,0", onceki:"50,8" },
    { saat:"14:00", baslik:"GARAN — 1Ç 2026 Bilanço", onem:"Şirket", ulke:"🇹🇷" },
  ],
  "2026-05-07": [
    { saat:"14:30", baslik:"BoE Faiz Kararı", onem:"Yüksek", ulke:"🇬🇧", beklenti:"%4,25", onceki:"%4,50" },
    { saat:"14:00", baslik:"AKBNK — 1Ç 2026 Bilanço", onem:"Şirket", ulke:"🇹🇷" },
  ],
  "2026-04-26": [
    { saat:"10:00", baslik:"Michigan Tüketici Güveni (Nis)", onem:"Orta", ulke:"🇺🇸", beklenti:"50,8", onceki:"57,0" },
    { saat:"14:00", baslik:"EREGL — 1Ç 2026 Bilanço", onem:"Şirket", ulke:"🇹🇷" },
  ],
};

const ONEM_RENK: Record<string, string> = {
  "Yüksek": "#EF4444",
  "Orta": "#F59E0B",
  "Düşük": "#10B981",
  "Şirket": "#3B82F6",
};

function tarihKey(y:number, m:number, d:number) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function aydakiGunler(y:number, m:number) {
  const ilkGun = new Date(y, m, 1).getDay();
  const offset = ilkGun === 0 ? 6 : ilkGun - 1;
  const toplamGun = new Date(y, m+1, 0).getDate();
  return { offset, toplamGun };
}

export default function TakvimPage() {
  const bugun = new Date();
  const [yil, setYil] = useState(bugun.getFullYear());
  const [ay, setAy] = useState(bugun.getMonth());
  const [seciliGun, setSeciliGun] = useState(tarihKey(bugun.getFullYear(), bugun.getMonth(), bugun.getDate()));
  const [sekme, setSekme] = useState("Ekonomik Takvim");

  const { offset, toplamGun } = aydakiGunler(yil, ay);

  const oncekiAy = () => { if (ay === 0) { setAy(11); setYil(y => y-1); } else setAy(a => a-1); };
  const sonrakiAy = () => { if (ay === 11) { setAy(0); setYil(y => y+1); } else setAy(a => a+1); };

  const isMobil = useMediaQuery("(max-width: 767px)");
  const seciliEtkinlikler = ETKINLIKLER[seciliGun] || [];
  const seciliTarih = new Date(seciliGun + "T00:00:00");

  // Yaklasan etkinlikler
  const bugunStr = tarihKey(bugun.getFullYear(), bugun.getMonth(), bugun.getDate());
  const yaklasan = Object.entries(ETKINLIKLER)
    .filter(([k]) => k >= bugunStr)
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(0, 5)
    .flatMap(([tarih, evler]) => evler.filter(e => e.onem === "Yüksek").slice(0,1).map(e => ({ tarih, ...e })));

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 24px" }}>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", marginBottom: 4 }}>Takvim</h1>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>Finansal takvimdeki tüm önemli ekonomik ve şirket etkinliklerini takip edin.</p>

          {/* Sekmeler */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(59,130,246,0.08)", overflowX: "auto" }}>
            {["Ekonomik Takvim","Şirket Takvimi","Temettü Takvimi","Halka Arz Takvimi"].map(s => (
              <button key={s} onClick={() => setSekme(s)} style={{ fontSize: 13, fontWeight: 500, padding: "8px 16px", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", color: sekme===s ? "#3B82F6" : "#475569", borderBottom: sekme===s ? "2px solid #3B82F6" : "2px solid transparent", marginBottom: -1 }}>
                {s}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobil ? "1fr" : "1fr 320px", gap: 20, alignItems: "start" }}>

            {/* Sol: Takvim + Etkinlik Listesi */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Takvim header */}
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <button onClick={() => { setSeciliGun(bugunStr); setYil(bugun.getFullYear()); setAy(bugun.getMonth()); }}
                    style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>Bugün</button>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={oncekiAy} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 18 }}>‹</button>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", minWidth: 120, textAlign: "center" }}>{AYLAR[ay]} {yil}</span>
                    <button onClick={sonrakiAy} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 18 }}>›</button>
                  </div>
                  <div style={{ width: 80 }}/>
                </div>

                {/* Gün başlıkları */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  {GUNLER.map(g => (
                    <div key={g} style={{ textAlign: "center", padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#334155" }}>{g}</div>
                  ))}
                </div>

                {/* Günler */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                  {Array.from({ length: offset }).map((_, i) => <div key={"e"+i} style={{ padding: "10px 4px", minHeight: 56 }}/>)}
                  {Array.from({ length: toplamGun }).map((_, i) => {
                    const gun = i + 1;
                    const key = tarihKey(yil, ay, gun);
                    const etkinlikler = ETKINLIKLER[key] || [];
                    const bugunMu = key === bugunStr;
                    const seciliMi = key === seciliGun;
                    const onemler = [...new Set(etkinlikler.map(e => e.onem))].slice(0, 3);
                    return (
                      <div key={gun} onClick={() => setSeciliGun(key)}
                        style={{ padding: "8px 4px", minHeight: 56, cursor: "pointer", borderRadius: 8, margin: 2, background: seciliMi ? "rgba(59,130,246,0.15)" : bugunMu ? "rgba(59,130,246,0.08)" : "transparent", border: seciliMi ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent", transition: "all 0.1s" }}>
                        <div style={{ textAlign: "center", fontSize: 13, fontWeight: bugunMu ? 800 : 400, color: bugunMu ? "#3B82F6" : "#94A3B8", width: 26, height: 26, borderRadius: "50%", background: bugunMu ? "rgba(59,130,246,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px" }}>
                          {gun}
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
                          {onemler.map((o, idx) => (
                            <div key={idx} style={{ width: 6, height: 6, borderRadius: "50%", background: ONEM_RENK[o] }}/>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Lejant */}
                <div style={{ display: "flex", gap: 16, padding: "10px 16px", borderTop: "1px solid rgba(59,130,246,0.06)" }}>
                  {Object.entries(ONEM_RENK).map(([k,v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: v }}/>
                      <span style={{ fontSize: 11, color: "#475569" }}>{k} Önem</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seçili gün etkinlikleri */}
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>
                    {seciliTarih.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" })}
                  </span>
                  {seciliEtkinlikler.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,0.1)", borderRadius: 20, padding: "2px 8px" }}>{seciliEtkinlikler.length} etkinlik</span>
                  )}
                </div>
                {seciliEtkinlikler.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "#334155", fontSize: 13 }}>Bu gün için etkinlik bulunmuyor.</div>
                ) : isMobil ? (
                  <div>
                    {seciliEtkinlikler.map((e, i) => (
                      <div key={i} style={{ padding: "12px 16px", borderBottom: i < seciliEtkinlikler.length-1 ? "1px solid rgba(59,130,246,0.04)" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14 }}>{e.ulke || "🌍"}</span>
                            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{e.saat}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: ONEM_RENK[e.onem], background: ONEM_RENK[e.onem]+"22", borderRadius: 20, padding: "2px 8px" }}>{e.onem}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 500, marginBottom: 4 }}>{e.baslik}</p>
                        {(e.beklenti || e.onceki) && (
                          <div style={{ display: "flex", gap: 12 }}>
                            {e.beklenti && <span style={{ fontSize: 11, color: "#475569" }}>Beklenti: <span style={{ color: "#94A3B8" }}>{e.beklenti}</span></span>}
                            {e.onceki && <span style={{ fontSize: 11, color: "#475569" }}>Önceki: <span style={{ color: "#64748B" }}>{e.onceki}</span></span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                        {["Saat","Ülke","Etkinlik","Önem","Beklenti","Önceki"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: h==="Etkinlik" ? "left" : "center", fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {seciliEtkinlikler.map((e, i) => (
                        <tr key={i} style={{ borderBottom: i < seciliEtkinlikler.length-1 ? "1px solid rgba(59,130,246,0.04)" : "none" }}>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748B", fontWeight: 500 }}>{e.saat}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 16 }}>{e.ulke || "🌍"}</td>
                          <td style={{ padding: "10px 12px", color: "#E2E8F0", fontWeight: 500 }}>{e.baslik}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: ONEM_RENK[e.onem], background: ONEM_RENK[e.onem]+"22", borderRadius: 20, padding: "2px 8px" }}>{e.onem}</span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#94A3B8" }}>{e.beklenti || "—"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748B" }}>{e.onceki || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Sağ panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Yaklaşan yüksek önem */}
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Yaklaşan Yüksek Önem</span>
                </div>
                {yaklasan.length === 0 ? (
                  <div style={{ padding: "16px", color: "#334155", fontSize: 12, textAlign: "center" }}>Yaklaşan etkinlik yok.</div>
                ) : yaklasan.map((e, i) => {
                  const t = new Date(e.tarih + "T00:00:00");
                  return (
                    <div key={i} onClick={() => setSeciliGun(e.tarih)} style={{ padding: "10px 16px", borderBottom: i < yaklasan.length-1 ? "1px solid rgba(59,130,246,0.04)" : "none", cursor: "pointer" }}
                      onMouseEnter={el => (el.currentTarget.style.background = "rgba(59,130,246,0.04)")}
                      onMouseLeave={el => (el.currentTarget.style.background = "transparent")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", minWidth: 32, textAlign: "center", background: "rgba(239,68,68,0.1)", borderRadius: 6, padding: "2px 6px" }}>
                          {t.getDate()}
                        </div>
                        <span style={{ fontSize: 11, color: "#64748B" }}>{AYLAR[t.getMonth()]} · {e.saat}</span>
                        <span style={{ marginLeft: "auto", fontSize: 14 }}>{e.ulke}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#94A3B8", marginLeft: 40 }}>{e.baslik}</p>
                      {e.beklenti && <p style={{ fontSize: 11, color: "#475569", marginLeft: 40, marginTop: 2 }}>Beklenti: {e.beklenti}</p>}
                    </div>
                  );
                })}
              </div>

              {/* Bu haftanın özeti */}
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, padding: "14px 16px", background: "rgba(255,255,255,0.01)" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>Bu Hafta</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Yüksek", value: Object.values(ETKINLIKLER).flat().filter(e=>e.onem==="Yüksek").length, color: "#EF4444" },
                    { label: "Orta", value: Object.values(ETKINLIKLER).flat().filter(e=>e.onem==="Orta").length, color: "#F59E0B" },
                    { label: "Şirket", value: Object.values(ETKINLIKLER).flat().filter(e=>e.onem==="Şirket").length, color: "#3B82F6" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px", textAlign: "center" }}>
                      <p style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
                      <p style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </AppShell>
  );
}
