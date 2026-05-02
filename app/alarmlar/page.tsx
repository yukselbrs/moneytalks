"use client";
import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import AlarmModal from "@/components/AlarmModal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { supabase } from "@/components/lib/supabase";

type AlarmModalTip = "fiyat_seviye" | "fiyat_yuzde" | "gosterge" | "bildirim_tercihleri";
type QuickTip = AlarmModalTip | "haber";

type Alarm = {
  id: string | number;
  tip: string;
  hisse: string;
  sirket: string;
  kosul: string;
  detay: string;
  hedef: string;
  guncel: string;
  degisim: string;
  yukselis: boolean;
  tarih: string;
  durum: string;
};

const HIZLI: { ikon: string; renk: string; baslik: string; aciklama: string; tip: QuickTip }[] = [
  { ikon: "📈", renk: "#10B981", baslik: "Fiyat Alarmı Ekle", aciklama: "Belirlediğiniz fiyat seviyelerine ulaşıldığında bildirim alın.", tip: "fiyat_seviye" },
  { ikon: "📊", renk: "#8B5CF6", baslik: "Gösterge Alarmı Ekle", aciklama: "Teknik göstergelere göre alarm oluşturun.", tip: "gosterge" },
  { ikon: "📰", renk: "#F97316", baslik: "Haber Alarmı Ekle", aciklama: "Önemli haber ve duyurularda bildirim alın.", tip: "haber" },
  { ikon: "⚙️", renk: "#64748B", baslik: "Alarm Bildirim Tercihleri", aciklama: "Bildirim kanallarınızı yönetin.", tip: "bildirim_tercihleri" },
];

export default function AlarmlarPage() {
  const [sekme, setSekme] = useState("Tüm Alarmlar");
  const [modalAcik, setModalAcik] = useState(false);
  const [modalTip, setModalTip] = useState<AlarmModalTip>("fiyat_seviye");
  const [alarmlar, setAlarmlar] = useState<Alarm[]>([]);
  const [fiyatlar, setFiyatlar] = useState<Record<string, { fiyat: string; degisim: string; yukselis: boolean }>>({});
  const isMobil = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    async function fetchAlarmlar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/alarmlar", { headers: { authorization: `Bearer ${session.access_token}` } });
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const mapped: Alarm[] = data.map((a: { id: string; ticker: string; tip: string; kosul: string; hedef_deger: number | null; hedef_yuzde: number | null; durum: string; created_at: string }) => ({
        id: a.id,
        tip: a.tip === "fiyat_seviye" || a.tip === "fiyat_yuzde" ? "fiyat" : a.tip === "gosterge" ? "gosterge" : "haber",
        hisse: a.ticker,
        sirket: "",
        kosul: a.kosul === "yukari" ? "Yükselirse" : "Düşerse",
        detay: a.tip === "fiyat_seviye" ? "Fiyat seviyesi" : a.tip === "fiyat_yuzde" ? "Yüzde değişim" : "",
        hedef: a.hedef_deger !== null && a.hedef_deger !== undefined
          ? `${a.hedef_deger} ₺`
          : a.hedef_yuzde !== null && a.hedef_yuzde !== undefined
            ? `%${a.hedef_yuzde}`
            : "-",
        guncel: "-",
        degisim: "",
        yukselis: true,
        tarih: new Date(a.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "2-digit" }),
        durum: a.durum || "aktif",
      }));
      setAlarmlar(mapped);
      const tickers = [...new Set(mapped.map(a => a.hisse))].join(",");
      if (tickers) fetch(`/api/fiyatlar?extra=${tickers}`).then(r => r.json()).then(d => setFiyatlar(d)).catch(() => {});
    }
    fetchAlarmlar();
  }, []);

  const fiyatAlarmlar = alarmlar.filter(a => a.tip === "fiyat");
  const gostergeAlarmlar = alarmlar.filter(a => a.tip === "gosterge");
  const haberAlarmlar = alarmlar.filter(a => a.tip === "haber");
  const aktifSayi = alarmlar.filter(a => a.durum === "aktif").length;
  const beklemeSayi = alarmlar.filter(a => a.durum === "beklemede").length;
  const devreDisiSayi = alarmlar.filter(a => a.durum === "devre_disi").length;

  const tipRenk = (tip: string) =>
    tip === "fiyat" ? { bg: "rgba(59,130,246,0.15)", fg: "#3B82F6" } :
    tip === "gosterge" ? { bg: "rgba(139,92,246,0.15)", fg: "#8B5CF6" } :
    { bg: "rgba(249,115,22,0.15)", fg: "#F97316" };

  const [tipSecModalAcik, setTipSecModalAcik] = useState(false);
  const openModal = (tip: AlarmModalTip) => { setModalTip(tip); setModalAcik(true); };
  const openTipSec = () => setTipSecModalAcik(true);

  const toggleDurum = async (id: string | number) => {
    const mevcut = alarmlar.find(a => a.id === id);
    if (!mevcut) return;
    const yeniDurum = mevcut.durum === "aktif" ? "devre_disi" : "aktif";
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/alarmlar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id, durum: yeniDurum }),
    });
    if (!res.ok) return;
    setAlarmlar(prev => prev.map(a => a.id === id ? { ...a, durum: yeniDurum } : a));
  };

  const silAlarm = async (id: string | number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/alarmlar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    setAlarmlar(prev => prev.filter(x => x.id !== id));
  };

  const AlarmKart = ({ a }: { a: Alarm }) => {
    const renk = tipRenk(a.tip);
    const guncelFiyat = fiyatlar[a.hisse];
    const parsedDegisim = guncelFiyat ? Number.parseFloat(String(guncelFiyat.degisim).replace(",", ".")) : NaN;
    const degisimText = Number.isFinite(parsedDegisim) ? `${Math.abs(parsedDegisim).toFixed(2).replace(".", ",")}` : "-";

    return (
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: renk.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: renk.fg, flexShrink: 0 }}>
              {a.hisse.slice(0, 2)}
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", margin: 0 }}>{a.hisse}</p>
              <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>{a.kosul} · {a.detay}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              onClick={() => toggleDurum(a.id)}
              style={{ width: 38, height: 22, borderRadius: 11, background: a.durum === "aktif" ? "#3B82F6" : "#1E293B", border: `1px solid ${a.durum === "aktif" ? "#3B82F6" : "rgba(255,255,255,0.1)"}`, position: "relative", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, left: a.durum === "aktif" ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <button onClick={() => silAlarm(a.id)} style={{ background: "none", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6 }}>Sil</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#64748B" }}>
            Hedef: <span style={{ color: "#F1F5F9", fontWeight: 600 }}>{a.hedef}</span>
          </div>
          <div style={{ textAlign: "right" }}>
            {guncelFiyat ? (
              <p style={{ fontSize: 13, fontWeight: 600, color: guncelFiyat.yukselis ? "#10B981" : "#EF4444", margin: 0 }}>
                {guncelFiyat.fiyat} ₺ &nbsp;{guncelFiyat.yukselis ? "+" : "-"}%{degisimText}
              </p>
            ) : (
              <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>{a.tarih}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const filtreli =
    sekme === "Tüm Alarmlar" ? alarmlar :
    sekme === "Fiyat Alarmları" ? fiyatAlarmlar :
    sekme === "Gösterge Alarmları" ? gostergeAlarmlar :
    haberAlarmlar;

  const emptyTitle =
    sekme === "Haber & Duyurular" ? "Haber alarmı özelliği yakında" :
    filtreli.length === 0 && alarmlar.length > 0 ? "Bu kategoride alarm yok" :
    "Henüz alarm oluşturmadınız";

  const emptyDesc =
    sekme === "Haber & Duyurular"
      ? "KAP duyuruları ve piyasa haberleri için alarm özelliği yakında aktif olacak."
      : "Fiyat hedeflerinize ulaşıldığında bildirim almak için alarm oluşturun.";

  const OzetPanel = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, padding: "16px", background: "rgba(255,255,255,0.01)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>Alarm Özeti</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Toplam Alarm", value: alarmlar.length, renk: "#3B82F6" },
            { label: "Aktif", value: aktifSayi, renk: "#10B981" },
            { label: "Beklemede", value: beklemeSayi, renk: "#F59E0B" },
            { label: "Devre Dışı", value: devreDisiSayi, renk: "#EF4444" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px 12px" }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: s.renk, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", padding: "14px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)", margin: 0 }}>Hızlı İşlemler</p>
        {HIZLI.map((h, i) => (
          <div
            key={h.baslik}
            onClick={() => { if (h.tip === "haber") return; openModal(h.tip as AlarmModalTip); }}
            style={{ padding: "12px 16px", borderBottom: i < HIZLI.length - 1 ? "1px solid rgba(59,130,246,0.04)" : "none", display: "flex", alignItems: "center", gap: 12, cursor: h.tip === "haber" ? "default" : "pointer" }}
            onMouseEnter={e => { if (h.tip !== "haber") e.currentTarget.style.background = "rgba(59,130,246,0.04)"; }}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: h.renk + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{h.ikon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: h.tip === "haber" ? "#475569" : "#E2E8F0", margin: 0 }}>
                {h.baslik}
                {h.tip === "haber" && (
                  <span style={{ fontSize: 10, marginLeft: 6, color: "#F97316", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 4, padding: "1px 6px" }}>Yakında</span>
                )}
              </p>
              <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0" }}>{h.aciklama}</p>
            </div>
            {h.tip !== "haber" && <span style={{ color: "#334155" }}>›</span>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)", width: "100%", maxWidth: "100vw", overflowX: "hidden", boxSizing: "border-box" }}>
        <main style={{ maxWidth: isMobil ? "100%" : 1400, width: "100%", margin: "0 auto", padding: isMobil ? "16px 14px" : "24px 24px", overflowX: "hidden", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", margin: 0 }}>Alarmlar</h1>
            <button
              onClick={() => openModal("fiyat_seviye")}
              style={{ padding: "8px 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
              + Alarm Ekle
            </button>
          </div>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>Fiyat, gösterge ve haber alarmlarınızı yönetin.</p>

          <div style={{ display: "grid", gridTemplateColumns: isMobil ? "1fr" : "1fr 280px", gap: 20, alignItems: "start" }}>
            <div style={{ minWidth: 0, width: "100%" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid rgba(59,130,246,0.08)", overflowX: "auto" }}>
                {[
                  { label: "Tüm Alarmlar", badge: alarmlar.length },
                  { label: "Fiyat Alarmları", badge: fiyatAlarmlar.length },
                  { label: "Gösterge Alarmları", badge: gostergeAlarmlar.length },
                  { label: "Haber & Duyurular", badge: haberAlarmlar.length },
                ].map(s => (
                  <button
                    key={s.label}
                    onClick={() => setSekme(s.label)}
                    style={{ fontSize: isMobil ? 12 : 13, fontWeight: 500, padding: isMobil ? "7px 10px" : "8px 14px", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", color: sekme === s.label ? "#3B82F6" : "#475569", borderBottom: sekme === s.label ? "2px solid #3B82F6" : "2px solid transparent", marginBottom: -1, display: "flex", alignItems: "center", gap: 5 }}>
                    {s.label}
                    <span style={{ fontSize: 10, fontWeight: 700, color: sekme === s.label ? "#3B82F6" : "#334155", background: sekme === s.label ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.05)", borderRadius: 99, padding: "1px 6px" }}>{s.badge}</span>
                  </button>
                ))}
              </div>

              <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
                {filtreli.length === 0 ? (
                  <div style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 36 }}>{sekme === "Haber & Duyurular" ? "📰" : "🔔"}</div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", margin: 0 }}>{emptyTitle}</p>
                    <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{emptyDesc}</p>
                    {sekme !== "Haber & Duyurular" && (
                      <button
                        onClick={() => sekme === "Gösterge Alarmları" ? openModal("gosterge") : openTipSec()}
                        style={{ marginTop: 4, padding: "9px 20px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                        + {sekme === "Gösterge Alarmları" ? "Gösterge Alarmı Ekle" : "Alarm Ekle"}
                      </button>
                    )}
                  </div>
                ) : (
                  filtreli.map(a => <AlarmKart key={a.id} a={a} />)
                )}
              </div>

              {isMobil && <div style={{ marginTop: 20 }}><OzetPanel /></div>}
            </div>

            {!isMobil && <OzetPanel />}
          </div>
        </main>
      </div>
      {tipSecModalAcik && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setTipSecModalAcik(false)}>
          <div style={{ background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 16, width: "100%", maxWidth: 400, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#F8FAFC" }}>Alarm Türü Seç</span>
              <button onClick={() => setTipSecModalAcik(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: "16px" }}>
              {[
                { tip: "fiyat_seviye" as AlarmModalTip, ikon: "📈", renk: "#10B981", baslik: "Fiyat Alarmı", aciklama: "Belirli bir fiyat seviyesine ulaşınca" },
                { tip: "fiyat_yuzde" as AlarmModalTip, ikon: "📉", renk: "#3B82F6", baslik: "Yüzde Değişim Alarmı", aciklama: "Belirli bir yüzde değişiminde" },
                { tip: "gosterge" as AlarmModalTip, ikon: "📊", renk: "#8B5CF6", baslik: "Gösterge Alarmı", aciklama: "RSI, MACD, MA50 gibi teknik göstergeler" },
              ].map((s, i, arr) => (
                <div key={s.tip} onClick={() => { setTipSecModalAcik(false); openModal(s.tip); }}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 12px", borderRadius: 10, cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid rgba(59,130,246,0.06)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: s.renk + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.ikon}</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", margin: 0 }}>{s.baslik}</p>
                    <p style={{ fontSize: 12, color: "#475569", margin: "2px 0 0" }}>{s.aciklama}</p>
                  </div>
                  <span style={{ marginLeft: "auto", color: "#334155" }}>›</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {modalAcik && (
        <AlarmModal
          onKapat={() => setModalAcik(false)}
          onEklendi={() => { setModalAcik(false); window.location.reload(); }}
          varsayilanTip={modalTip}
        />
      )}
    </AppShell>
  );
}
