"use client";
import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import AlarmModal from "@/components/AlarmModal";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const ALARMLAR: {id:number;tip:string;hisse:string;sirket:string;kosul:string;detay:string;hedef:string;guncel:string;degisim:string;yukselis:boolean;tarih:string;durum:string}[] = [];

const HIZLI = [
  { ikon:"📈", renk:"#10B981", baslik:"Fiyat Alarmı Ekle", aciklama:"Belirlediğiniz fiyat seviyelerine ulaşıldığında bildirim alın." },
  { ikon:"📊", renk:"#8B5CF6", baslik:"Gösterge Alarmı Ekle", aciklama:"Teknik göstergelere göre alarm oluşturun." },
  { ikon:"📰", renk:"#F97316", baslik:"Haber Alarmı Ekle", aciklama:"Önemli haber ve duyurularda bildirim alın." },
  { ikon:"⚙️", renk:"#64748B", baslik:"Alarm Bildirim Tercihleri", aciklama:"Bildirim kanallarınızı yönetin." },
];

export default function AlarmlarPage() {
  const [sekme, setSekme] = useState("Tümü");
  const [modalAcik, setModalAcik] = useState(false);
  const [modalTip, setModalTip] = useState<"fiyat_seviye" | "fiyat_yuzde" | "gosterge" | "haber" | "bildirim_tercihleri">("fiyat_seviye");
  const [alarmlar, setAlarmlar] = useState(ALARMLAR);
  const [fiyatlar, setFiyatlar] = useState<Record<string, {fiyat: string; degisim: string; yukselis: boolean}>>({});

  useEffect(() => {
    const tickers = [...new Set(ALARMLAR.filter(a => a.tip === "fiyat" || a.tip === "gosterge").map(a => a.hisse))].join(",");
    fetch(`/api/fiyatlar?extra=${tickers}`)
      .then(r => r.json())
      .then(d => setFiyatlar(d))
      .catch(() => {});
  }, []);

  const fiyatAlarmlar = alarmlar.filter(a => a.tip === "fiyat");
  const gostergeAlarmlar = alarmlar.filter(a => a.tip === "gosterge");
  const haberAlarmlar = alarmlar.filter(a => a.tip === "haber");

  const toggleDurum = (id: number) => {
    setAlarmlar(prev => prev.map(a => a.id === id ? { ...a, durum: a.durum === "aktif" ? "devre_disi" : "aktif" } : a));
  };

  const isMobil = useMediaQuery("(max-width: 767px)");
  const aktifSayi = alarmlar.filter(a => a.durum === "aktif").length;
  const beklemeSayi = alarmlar.filter(a => a.durum === "beklemede").length;

  const tipRenk = (tip: string) => tip === "fiyat" ? { bg: "rgba(59,130,246,0.15)", fg: "#3B82F6" } : tip === "gosterge" ? { bg: "rgba(139,92,246,0.15)", fg: "#8B5CF6" } : { bg: "rgba(249,115,22,0.15)", fg: "#F97316" };

  const AlarmSatir = ({ a, onSil, fiyatlar }: { a: typeof ALARMLAR[0]; onSil: (id: number) => void; fiyatlar: Record<string, {fiyat: string; degisim: string; yukselis: boolean}> }) => {
    const renk = tipRenk(a.tip);
    const guncelFiyat = fiyatlar[a.hisse];

    if (isMobil) {
      return (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.04)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: renk.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: renk.fg, flexShrink: 0 }}>
                {a.hisse.slice(0,2)}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{a.hisse}</p>
                <p style={{ fontSize: 11, color: "#475569" }}>{a.sirket}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div onClick={() => toggleDurum(a.id)} style={{ width: 36, height: 20, borderRadius: 10, background: a.durum==="aktif" ? "#3B82F6" : "#1E293B", border: `1px solid ${a.durum==="aktif" ? "#3B82F6" : "rgba(255,255,255,0.1)"}`, position: "relative", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ position: "absolute", top: 2, left: a.durum==="aktif" ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }}/>
              </div>
              <button onClick={() => onSil(a.id)} style={{ background: "none", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6 }}>Sil</button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <p style={{ fontSize: 12, color: "#94A3B8" }}>{a.kosul}</p>
              <p style={{ fontSize: 11, color: "#475569" }}>{a.detay}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 12, color: "#64748B" }}>Hedef: <span style={{ color: "#F1F5F9", fontWeight: 600 }}>{a.hedef}</span></p>
              {guncelFiyat ? (
                <p style={{ fontSize: 12, fontWeight: 600, color: guncelFiyat.yukselis ? "#10B981" : "#EF4444" }}>
                  {guncelFiyat.yukselis ? "+" : "-"}%{Math.abs(parseFloat(guncelFiyat.degisim.replace(",","."))).toFixed(2).replace(".",",")}
                </p>
              ) : a.degisim ? (
                <p style={{ fontSize: 12, fontWeight: 600, color: a.yukselis ? "#10B981" : "#EF4444" }}>{a.degisim}</p>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1.5fr 80px 40px", gap: 8, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(59,130,246,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: renk.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: renk.fg, flexShrink: 0 }}>
            {a.hisse.slice(0,2)}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{a.hisse}</p>
            <p style={{ fontSize: 11, color: "#475569" }}>{a.sirket}</p>
          </div>
        </div>
        <div>
          <p style={{ fontSize: 12, color: "#94A3B8" }}>{a.kosul}</p>
          <p style={{ fontSize: 11, color: "#475569" }}>{a.detay}</p>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9", textAlign: "right" }}>{a.hedef}</div>
        <div style={{ textAlign: "right" }}>
          {guncelFiyat ? (
            <>
              <p style={{ fontSize: 13, color: "#E2E8F0" }}>{guncelFiyat.fiyat} ₺</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: guncelFiyat.yukselis ? "#10B981" : "#EF4444" }}>
                {guncelFiyat.yukselis ? "+" : "-"}%{Math.abs(parseFloat(guncelFiyat.degisim.replace(",","."))).toFixed(2).replace(".",",")}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#E2E8F0" }}>{a.guncel}</p>
              {a.degisim && <p style={{ fontSize: 11, fontWeight: 600, color: a.yukselis ? "#10B981" : "#EF4444" }}>{a.degisim}</p>}
            </>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#334155" }}>{a.tarih}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => toggleDurum(a.id)} style={{ width: 36, height: 20, borderRadius: 10, background: a.durum==="aktif" ? "#3B82F6" : "#1E293B", border: `1px solid ${a.durum==="aktif" ? "#3B82F6" : "rgba(255,255,255,0.1)"}`, position: "relative", cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ position: "absolute", top: 2, left: a.durum==="aktif" ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }}/>
          </div>
        </div>
        <button onClick={() => onSil(a.id)} style={{ background: "none", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, transition: "all 0.15s" }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>Sil</button>
      </div>
    );
  }

  const Grup = ({ baslik, liste, badge }: { baslik: string; liste: typeof ALARMLAR; badge: number }) => {
    const [acik, setAcik] = useState(true);
    return (
      <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)", marginBottom: 16 }}>
        <div onClick={() => setAcik(v => !v)} style={{ padding: "12px 16px", borderBottom: acik ? "1px solid rgba(59,130,246,0.06)" : "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>{baslik}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6", background: "rgba(59,130,246,0.1)", borderRadius: 20, padding: "2px 8px" }}>{badge}</span>
          <span style={{ marginLeft: "auto", color: "#475569" }}>{acik ? "▲" : "▼"}</span>
        </div>
        {acik && (
          <>
            {!isMobil && (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1.5fr 80px 40px", gap: 8, padding: "8px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                {["HİSSE","KOŞUL","HEDEF","GÜNCEL","OLUŞTURULMA","DURUM",""].map(h => (
                  <p key={h} style={{ fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.06em", textAlign: h==="HEDEF"||h==="GÜNCEL"||h==="DURUM" ? "right" : "left" }}>{h}</p>
                ))}
              </div>
            )}
            {liste.map(a => <AlarmSatir key={a.id} a={a} onSil={(id) => setAlarmlar(prev => prev.filter(x => x.id !== id))} fiyatlar={fiyatlar} />)}
            <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(59,130,246,0.04)" }}>
              <button style={{ fontSize: 12, color: "#3B82F6", background: "none", border: "none", cursor: "pointer" }}>Tüm {baslik}nı Gör →</button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 24px", overflowX: "hidden" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", marginBottom: 4 }}>Alarmlar</h1>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>Fiyat, gösterge ve haber alarmlarınızı yönetin.</p>

          <div style={{ display: "grid", gridTemplateColumns: isMobil ? "1fr" : "1fr 280px", gap: 20, alignItems: "start" }}>
            {/* Sol */}
            <div>
              {/* Sekmeler */}
              <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(59,130,246,0.08)", overflowX: "auto" }}>
                {[
                  { label: "Tüm Alarmlar", badge: alarmlar.length },
                  { label: "Fiyat Alarmları", badge: fiyatAlarmlar.length },
                  { label: "Gösterge Alarmları", badge: gostergeAlarmlar.length },
                  { label: "Haber & Duyurular", badge: haberAlarmlar.length },
                ].map(s => (
                  <button key={s.label} onClick={() => setSekme(s.label)} style={{ fontSize: 13, fontWeight: 500, padding: "8px 14px", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", color: sekme===s.label ? "#3B82F6" : "#475569", borderBottom: sekme===s.label ? "2px solid #3B82F6" : "2px solid transparent", marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }}>
                    {s.label}
                    <span style={{ fontSize: 10, fontWeight: 700, color: sekme===s.label ? "#3B82F6" : "#334155", background: sekme===s.label ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.05)", borderRadius: 99, padding: "1px 6px" }}>{s.badge}</span>
                  </button>
                ))}
              </div>

              {(sekme === "Tümü" || sekme === "Tüm Alarmlar" || sekme === "Fiyat Alarmları") && fiyatAlarmlar.length > 0 && <Grup baslik="Fiyat Alarmları" liste={fiyatAlarmlar} badge={fiyatAlarmlar.length} />}
              {(sekme === "Tümü" || sekme === "Tüm Alarmlar" || sekme === "Gösterge Alarmları") && gostergeAlarmlar.length > 0 && <Grup baslik="Gösterge Alarmları" liste={gostergeAlarmlar} badge={gostergeAlarmlar.length} />}
              {(sekme === "Tümü" || sekme === "Tüm Alarmlar" || sekme === "Haber & Duyurular") && haberAlarmlar.length > 0 && <Grup baslik="Haber & Duyuru Alarmları" liste={haberAlarmlar} badge={haberAlarmlar.length} />}
              {alarmlar.length === 0 && (
                <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, padding: "40px 24px", background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 24 }}>🔔</div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>Henüz alarm oluşturmadınız</p>
                  <button onClick={() => { setModalTip("fiyat_seviye"); setModalAcik(true); }} style={{ padding: "8px 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                    + Fiyat Alarmı Ekle
                  </button>
                </div>
              )}
            </div>

            {/* Sağ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, overflow: "hidden" }}>
              {/* Özet */}
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, padding: "12px 16px", background: "rgba(255,255,255,0.01)" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>Alarm Özeti</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {[
                    { label: "Toplam", value: alarmlar.length, renk: "#3B82F6" },
                    { label: "Aktif", value: aktifSayi, renk: "#10B981" },
                    { label: "Beklemede", value: beklemeSayi, renk: "#F59E0B" },
                    { label: "Devre Dışı", value: alarmlar.filter(a=>a.durum==="devre_disi").length, renk: "#EF4444" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                      <p style={{ fontSize: 20, fontWeight: 800, color: s.renk }}>{s.value}</p>
                      <p style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hızlı İşlemler */}
              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase" }}>Hızlı İşlemler</p>
                </div>
                {HIZLI.map((h, i) => (
                  <div key={h.baslik} onClick={() => { if (i === 0) { setModalTip("fiyat_seviye"); setModalAcik(true); } else if (i === 1) { setModalTip("gosterge"); setModalAcik(true); } else if (i === 2) { setModalTip("haber"); setModalAcik(true); } else if (i === 3) { setModalTip("bildirim_tercihleri"); setModalAcik(true); } }} style={{ padding: "12px 16px", borderBottom: i < HIZLI.length-1 ? "1px solid rgba(59,130,246,0.04)" : "none", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: h.renk + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{h.ikon}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", marginBottom: 2 }}>{h.baslik}</p>
                      <p style={{ fontSize: 11, color: "#475569" }}>{h.aciklama}</p>
                    </div>
                    <span style={{ color: "#334155" }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      {modalAcik && <AlarmModal onKapat={() => setModalAcik(false)} onEklendi={() => {}} varsayilanTip={modalTip as "fiyat_seviye" | "fiyat_yuzde" | "gosterge" | "bildirim_tercihleri"} />}
    </AppShell>
  );
}
