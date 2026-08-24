"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AlarmModal from "@/components/AlarmModal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSession } from "@/hooks/useSession";
import StockLogo from "@/components/StockLogo";
import { EnstrumanIkon } from "@/components/EnstrumanIkon";
import { ENSTRUMANLAR } from "@/lib/enstruman-pricing";
import { tickerRenk } from "@/lib/utils";

type AlarmModalTip = "fiyat_seviye" | "fiyat_yuzde" | "gosterge" | "haber" | "bildirim_tercihleri";
type QuickTip = AlarmModalTip;

type Alarm = {
  id: string | number;
  tip: string;
  tipRaw: string;
  hisse: string;
  tur: "hisse" | "doviz" | "maden";
  gorunenAd: string;
  sirket: string;
  kosul: string;
  detay: string;
  hedef: string;
  hedefDeger: number | null;
  guncel: string;
  degisim: string;
  yukselis: boolean;
  tarih: string;
  durum: string;
};

function fiyatParse(value?: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

const HIZLI: { ikon: string; renk: string; baslik: string; aciklama: string; tip: QuickTip }[] = [
  { ikon: "📈", renk: "#10B981", baslik: "Fiyat Alarmı Ekle", aciklama: "Belirlediğiniz fiyat seviyelerine ulaşıldığında bildirim alın.", tip: "fiyat_seviye" },
  { ikon: "📊", renk: "#8B5CF6", baslik: "Gösterge Alarmı Ekle", aciklama: "Teknik göstergelere göre alarm oluşturun.", tip: "gosterge" },
  { ikon: "📰", renk: "#F97316", baslik: "KAP Haber Bildirimleri", aciklama: "İzleme listendeki hisselerin KAP bildirimleri sade özetiyle e-postana gelsin.", tip: "haber" },
  { ikon: "⚙️", renk: "#64748B", baslik: "Alarm Bildirim Tercihleri", aciklama: "Bildirim kanallarınızı yönetin.", tip: "bildirim_tercihleri" },
];

export default function AlarmlarPage() {
  const [sekme, setSekme] = useState("Tüm Alarmlar");
  const [modalAcik, setModalAcik] = useState(false);
  const [modalTip, setModalTip] = useState<AlarmModalTip>("fiyat_seviye");
  const [alarmlar, setAlarmlar] = useState<Alarm[]>([]);
  const [fiyatlar, setFiyatlar] = useState<Record<string, { fiyat: string; degisim: string; yukselis: boolean }>>({});
  const isMobil = useMediaQuery("(max-width: 767px)");
  const { session, sessionHazir } = useSession();
  const girisGerekli = sessionHazir && !session;

  const fetchAlarmlar = useCallback(async () => {
    if (!session) {
      setAlarmlar([]);
      return;
    }
    const res = await fetch("/api/alarmlar", { headers: { authorization: `Bearer ${session.access_token}` } });
    const data = await res.json();
    if (!Array.isArray(data)) return;
    const mapped: Alarm[] = data.map((a: { id: string; ticker: string; tur?: string; tip: string; kosul: string; hedef_deger: number | null; hedef_yuzde: number | null; durum: string; created_at: string }) => {
      const tur = a.tur === "doviz" || a.tur === "maden" ? a.tur : "hisse";
      return {
        id: a.id,
        tip: a.tip === "fiyat_seviye" || a.tip === "fiyat_yuzde" ? "fiyat" : a.tip === "gosterge" ? "gosterge" : "haber",
        tipRaw: a.tip,
        hisse: a.ticker,
        tur,
        gorunenAd: tur === "hisse" ? a.ticker : ENSTRUMANLAR.find(e => e.kod === a.ticker)?.ad ?? a.ticker,
        sirket: "",
        kosul: a.kosul === "yukari" ? "Yükselirse" : "Düşerse",
        detay: a.tip === "fiyat_seviye" ? "Fiyat seviyesi" : a.tip === "fiyat_yuzde" ? "Yüzde değişim" : "",
        hedef: a.hedef_deger !== null && a.hedef_deger !== undefined
          ? `${a.hedef_deger}${tur === "hisse" ? " ₺" : ""}`
          : a.hedef_yuzde !== null && a.hedef_yuzde !== undefined
            ? `%${a.hedef_yuzde}`
            : "-",
        hedefDeger: a.hedef_deger ?? null,
        guncel: "-",
        degisim: "",
        yukselis: true,
        tarih: new Date(a.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "2-digit" }),
        durum: a.durum || "aktif",
      };
    });
    setAlarmlar(mapped);
    const hisseTickers = [...new Set(mapped.filter(a => a.tur === "hisse").map(a => a.hisse))].join(",");
    if (hisseTickers) fetch(`/api/fiyatlar?extra=${hisseTickers}`).then(r => r.json()).then(d => setFiyatlar(prev => ({ ...prev, ...d }))).catch(() => {});
    if (mapped.some(a => a.tur !== "hisse")) {
      fetch("/api/doviz-maden", { cache: "no-store" }).then(r => r.json()).then(d => {
        const ek: Record<string, { fiyat: string; degisim: string; yukselis: boolean }> = {};
        for (const item of d.items || []) {
          if (item.fiyat === null || item.fiyat === undefined) continue;
          const hane = item.tur === "doviz" ? (item.fiyat < 10 ? 4 : item.fiyat < 100 ? 3 : 2) : 2;
          ek[item.kod] = {
            fiyat: item.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: hane, maximumFractionDigits: hane }),
            degisim: String(item.degisim_yuzde ?? 0),
            yukselis: (item.degisim_yuzde ?? 0) >= 0,
          };
        }
        setFiyatlar(prev => ({ ...prev, ...ek }));
      }).catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    void Promise.resolve().then(fetchAlarmlar);
  }, [fetchAlarmlar]);

  const fiyatAlarmlar = alarmlar.filter(a => a.tip === "fiyat");
  const gostergeAlarmlar = alarmlar.filter(a => a.tip === "gosterge");
  const haberAlarmlar = alarmlar.filter(a => a.tip === "haber");
  const aktifSayi = alarmlar.filter(a => a.durum === "aktif").length;
  const beklemeSayi = alarmlar.filter(a => a.durum === "beklemede").length;
  const devreDisiSayi = alarmlar.filter(a => a.durum === "devre_disi").length;

  const [tipSecModalAcik, setTipSecModalAcik] = useState(false);
  const openModal = (tip: AlarmModalTip) => {
    if (!session) return;
    setModalTip(tip);
    setModalAcik(true);
  };
  const openTipSec = () => {
    if (!session) return;
    setTipSecModalAcik(true);
  };

  const toggleDurum = async (id: string | number) => {
    const mevcut = alarmlar.find(a => a.id === id);
    if (!mevcut) return;
    const yeniDurum = mevcut.durum === "aktif" ? "devre_disi" : "aktif";
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
    const guncelFiyat = fiyatlar[a.hisse];
    const parsedDegisim = guncelFiyat ? Number.parseFloat(String(guncelFiyat.degisim).replace(",", ".")) : NaN;
    const degisimText = Number.isFinite(parsedDegisim) ? `${Math.abs(parsedDegisim).toFixed(2).replace(".", ",")}` : "-";

    const guncelDeger = fiyatParse(guncelFiyat?.fiyat);
    const uzaklikYuzde = a.tipRaw === "fiyat_seviye" && a.hedefDeger !== null && guncelDeger !== null && guncelDeger > 0
      ? ((a.hedefDeger - guncelDeger) / guncelDeger) * 100
      : null;
    const uzaklikMutlak = uzaklikYuzde !== null ? Math.abs(uzaklikYuzde) : null;
    const yakinlikOrani = uzaklikMutlak !== null ? Math.max(0, Math.min(1, 1 - uzaklikMutlak / 20)) : null;
    const uzaklikRenk = uzaklikMutlak === null ? "#475569" : uzaklikMutlak < 1 ? "#10B981" : uzaklikMutlak < 5 ? "#F59E0B" : "#64748B";

    return (
      <div className="hover-glow" style={{ padding: "14px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", flexDirection: "column", gap: 10, transition: "background 0.15s ease", borderRadius: 0 }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.04)"}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {a.tur === "hisse" ? (
              <StockLogo ticker={a.hisse} size={36} radius={8} color={tickerRenk(a.hisse)} />
            ) : (
              <EnstrumanIkon
                tur={a.tur}
                kod={a.hisse}
                taban={a.tur === "doviz" ? a.hisse.split("-")[0]?.toUpperCase() : null}
                karsi={a.tur === "doviz" ? a.hisse.split("-")[1]?.toUpperCase() : null}
                boyut={36}
              />
            )}
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", margin: 0 }}>{a.gorunenAd}</p>
              <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>{a.kosul} · {a.detay}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              role="switch"
              aria-checked={a.durum === "aktif"}
              aria-label={`${a.hisse} alarmı ${a.durum === "aktif" ? "aktif, kapatmak için tıkla" : "pasif, açmak için tıkla"}`}
              onClick={() => toggleDurum(a.id)}
              style={{ width: 38, height: 22, borderRadius: 11, background: a.durum === "aktif" ? "#3B82F6" : "#1E293B", border: `1px solid ${a.durum === "aktif" ? "#3B82F6" : "rgba(255,255,255,0.1)"}`, position: "relative", cursor: "pointer", transition: "all 0.2s", flexShrink: 0, padding: 0 }}>
              <div style={{ position: "absolute", top: 3, left: a.durum === "aktif" ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </button>
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
                {guncelFiyat.fiyat}{a.tur === "hisse" ? " ₺" : ""} &nbsp;{guncelFiyat.yukselis ? "+" : "-"}%{degisimText}
              </p>
            ) : (
              <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>{a.tarih}</p>
            )}
          </div>
        </div>
        {uzaklikYuzde !== null && uzaklikMutlak !== null && yakinlikOrani !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }} aria-hidden="true">
              <div style={{ width: `${(yakinlikOrani * 100).toFixed(0)}%`, height: "100%", borderRadius: 2, background: uzaklikRenk, transition: "width 0.3s ease" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: uzaklikRenk, whiteSpace: "nowrap" }}>
              {uzaklikMutlak < 0.05
                ? "Hedef seviyede"
                : `Hedefe ${uzaklikYuzde > 0 ? "↑" : "↓"} %${uzaklikMutlak.toFixed(1).replace(".", ",")} uzakta`}
            </span>
          </div>
        )}
      </div>
    );
  };

  const filtreli =
    sekme === "Tüm Alarmlar" ? alarmlar :
    sekme === "Fiyat Alarmları" ? fiyatAlarmlar :
    sekme === "Gösterge Alarmları" ? gostergeAlarmlar :
    haberAlarmlar;

  const emptyTitle =
    girisGerekli ? "Alarm oluşturmak için giriş yapmalısın" :
    sekme === "Haber & Duyurular" ? "Haber alarmı özelliği yakında" :
    filtreli.length === 0 && alarmlar.length > 0 ? "Bu kategoride alarm yok" :
    "Henüz alarm oluşturmadınız";

  const emptyDesc =
    girisGerekli
      ? "Fiyat, gösterge ve haber alarmlarını hesabına bağlı olarak kaydediyoruz."
      : sekme === "Haber & Duyurular"
      ? "KAP duyuruları ve piyasa haberleri için alarm özelliği yakında aktif olacak."
      : "Fiyat hedeflerinize ulaşıldığında bildirim almak için alarm oluşturun.";

  const ozetPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="card-glass animate-fade-up" style={{ borderRadius: 12, padding: "16px", animationDelay: "0.15s" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>Alarm Özeti</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Toplam Alarm", value: alarmlar.length, renk: "#3B82F6" },
            { label: "Aktif", value: aktifSayi, renk: "#10B981" },
            { label: "Beklemede", value: beklemeSayi, renk: "#F59E0B" },
            { label: "Devre Dışı", value: devreDisiSayi, renk: "#EF4444" },
          ].map(s => (
            <div key={s.label} className="hover-glow" style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px 12px", transition: "all 0.15s", cursor: "default" }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: s.renk, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="card-glass animate-fade-up" style={{ borderRadius: 12, overflow: "hidden", animationDelay: "0.2s" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.07em", textTransform: "uppercase", padding: "14px 16px", borderBottom: "1px solid rgba(59,130,246,0.06)", margin: 0 }}>Hızlı İşlemler</p>
        {HIZLI.map((h, i) => (
          <Link
            key={h.baslik}
            href={girisGerekli ? "/login" : "#"}
            onClick={e => {
              if (girisGerekli) return;
              e.preventDefault();
              openModal(h.tip);
            }}
            style={{ padding: "12px 16px", borderBottom: i < HIZLI.length - 1 ? "1px solid rgba(59,130,246,0.04)" : "none", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textDecoration: "none" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.04)"; }}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: h.renk + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{h.ikon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", margin: 0 }}>{h.baslik}</p>
              <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0", lineHeight: 1.4, overflowWrap: "anywhere" }}>{h.aciklama}</p>
            </div>
            <span style={{ color: "#334155" }}>›</span>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="dot-grid" style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)", width: "100%", maxWidth: "100vw", overflowX: "hidden", boxSizing: "border-box" }}>
        <main style={{ maxWidth: isMobil ? "100%" : 1400, width: "100%", margin: "0 auto", padding: isMobil ? "16px 14px" : "24px 24px", overflowX: "hidden", boxSizing: "border-box" }}>
          <div className="animate-fade-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", margin: 0 }}>Alarmlar</h1>
            {girisGerekli ? (
              <Link
                href="/login"
                style={{ padding: "8px 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", textDecoration: "none" }}>
                Giriş Yap
              </Link>
            ) : (
              <button
                onClick={() => openModal("fiyat_seviye")}
                style={{ padding: "8px 16px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                + Alarm Ekle
              </button>
            )}
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: sekme === s.label ? "#3B82F6" : "#334155", background: sekme === s.label ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.05)", borderRadius: 99, padding: "1px 6px" }}>{s.badge}</span>
                  </button>
                ))}
              </div>

              <div className="card-glass animate-fade-up" style={{ borderRadius: 12, overflow: "hidden", animationDelay: "0.1s" }}>
                {filtreli.length === 0 ? (
                  <div style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 36 }}>{sekme === "Haber & Duyurular" ? "📰" : "🔔"}</div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", margin: 0 }}>{emptyTitle}</p>
                    <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, width: "100%", maxWidth: isMobil ? 280 : 420, margin: 0, overflowWrap: "anywhere" }}>{emptyDesc}</p>
                    {girisGerekli ? (
                      <Link
                        href="/login"
                        style={{ marginTop: 4, padding: "9px 20px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", textDecoration: "none" }}>
                        Giriş Yap
                      </Link>
                    ) : sekme !== "Haber & Duyurular" && (
                      <button
                        onClick={() => sekme === "Gösterge Alarmları" ? openModal("gosterge") : sekme === "Fiyat Alarmları" ? openModal("fiyat_seviye") : openTipSec()}
                        style={{ marginTop: 4, padding: "9px 20px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                        + {sekme === "Gösterge Alarmları" ? "Gösterge Alarmı Ekle" : sekme === "Fiyat Alarmları" ? "Fiyat Alarmı Ekle" : "Alarm Ekle"}
                      </button>
                    )}
                  </div>
                ) : (
                  filtreli.map(a => <AlarmKart key={a.id} a={a} />)
                )}
              </div>

              {isMobil && <div style={{ marginTop: 20 }}>{ozetPanel}</div>}
            </div>

            {!isMobil && ozetPanel}
          </div>
        </main>
      </div>
      {tipSecModalAcik && (
        <div role="dialog" aria-modal="true" aria-label="Alarm türü seç"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setTipSecModalAcik(false)}
          onKeyDown={e => { if (e.key === "Escape") setTipSecModalAcik(false); }}>
          <div style={{ background: "#0F1C2E", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 16, width: "100%", maxWidth: 400, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#F8FAFC" }}>Alarm Türü Seç</span>
              <button onClick={() => setTipSecModalAcik(false)} aria-label="Kapat" style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: "16px" }}>
              {[
                { tip: "fiyat_seviye" as AlarmModalTip, ikon: "📈", renk: "#10B981", baslik: "Fiyat Alarmı", aciklama: "Belirli bir fiyat seviyesine ulaşınca" },
                { tip: "gosterge" as AlarmModalTip, ikon: "📊", renk: "#8B5CF6", baslik: "Gösterge Alarmı", aciklama: "RSI, MACD, MA50 gibi teknik göstergeler" },
              ].map((s, i, arr) => {
                const sec = () => { setTipSecModalAcik(false); openModal(s.tip); };
                return (
                  <button key={s.tip} type="button" onClick={sec}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 12px", borderRadius: 10, cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid rgba(59,130,246,0.06)" : "none", background: "transparent", border: "none", textAlign: "left", color: "inherit" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.06)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: s.renk + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.ikon}</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", margin: 0 }}>{s.baslik}</p>
                      <p style={{ fontSize: 12, color: "#475569", margin: "2px 0 0" }}>{s.aciklama}</p>
                    </div>
                    <span style={{ marginLeft: "auto", color: "#334155" }}>›</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {modalAcik && (
        <AlarmModal
          onKapat={() => setModalAcik(false)}
          onEklendi={() => { setModalAcik(false); fetchAlarmlar(); }}
          varsayilanTip={modalTip}
        />
      )}
    </AppShell>
  );
}
