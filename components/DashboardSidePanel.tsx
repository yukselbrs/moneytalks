"use client";

import { useState, useEffect } from "react";
import RiskProfilWidget from "@/components/RiskProfilWidget";
import { supabase } from "@/components/lib/supabase";
import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/formatters";

type PortfolioSummary = {
  toplamMaliyet: number;
  toplamGuncel: number;
  toplamPL: number;
  toplamPLYuzde: number;
  gunlukPL: number;
  gunlukPLYuzde: number;
  hisseSayisi: number;
  hisseDagilim?: { ticker: string; deger: number; yuzde: number; renk: string }[];
};

type MarketNews = {
  ticker: string;
  title: string;
  time: string;
};

type RawAlarm = {
  id: string;
  ticker: string;
  tip: string;
  kosul: string;
  hedef_deger: number | null;
  hedef_yuzde: number | null;
  durum: string;
  gosterge_tipi: string | null;
};

type DashboardSidePanelProps = {
  portfoyOzet: PortfolioSummary | null;
  kap: MarketNews[];
};

function PortfolioSummaryCard({ portfoyOzet }: { portfoyOzet: PortfolioSummary | null }) {
  const [mod, setMod] = useState<"total" | "daily">("total");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!portfoyOzet) {
    return (
      <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "24px 16px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 40%, rgba(139,92,246,0.35) 70%, transparent 100%)" }} />
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 4 }}>Portföyünüzü Takip Edin</p>
          <p style={{ fontSize: 11, color: "#334155", lineHeight: 1.5 }}>Hisselerinizi ekleyin, kâr/zarar ve dağılımı anlık görün.</p>
        </div>
        <a href="/portfoy" style={{ display: "inline-block", background: "#3B82F6", color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Portföy Oluştur →</a>
      </div>
    );
  }

  const aktifPL = mod === "daily" ? portfoyOzet.gunlukPL : portfoyOzet.toplamPL;
  const aktifPLYuzde = mod === "daily" ? portfoyOzet.gunlukPLYuzde : portfoyOzet.toplamPLYuzde;
  const aktifLabel = mod === "daily" ? "Günlük Getiri" : "Toplam Getiri";
  const aktifPozitif = aktifPL >= 0;

  return (
    <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 40%, rgba(139,92,246,0.35) 70%, transparent 100%)" }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(96,165,250,0.65)", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Portföy Özeti</p>
          <span className="g-tooltip-wrap" style={{ position: "relative", display: "inline-flex" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 3, padding: "1px 5px", lineHeight: 1.4, cursor: "default" }}>G</span>
            <span className="g-tooltip" style={{ position: "fixed", background: "#1E293B", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", padding: "4px 8px", borderRadius: 5, pointerEvents: "none", opacity: 0, transition: "opacity 0.15s", transform: "translateY(-28px)", zIndex: 9999 }}>15 dk gecikmeli</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: 2 }}>
            {([{ key: "daily" as const, label: "Günlük" }, { key: "total" as const, label: "Total" }]).map(item => (
              <button key={item.key} onClick={() => setMod(item.key)}
                style={{ border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", background: mod === item.key ? "#3B82F6" : "transparent", color: mod === item.key ? "#fff" : "#475569" }}>
                {item.label}
              </button>
            ))}
          </div>
          <a href="/portfoy" style={{ fontSize: 11, color: "#3B82F6", textDecoration: "none", opacity: 0.8 }}>Tümü →</a>
        </div>
      </div>

      {/* Toplam değer */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#2D3F55", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Toplam Değer</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.8px", margin: 0 }}>
          {formatCurrency(portfoyOzet.toplamGuncel)}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
          <span style={{ fontSize: 10, color: "#334155", fontWeight: 600 }}>{aktifLabel}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: aktifPozitif ? "#10B981" : "#EF4444" }}>
            {formatPercent(aktifPLYuzde, { symbolPosition: "prefix" })}
            <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 4, opacity: 0.75 }}>
              ({formatSignedCurrency(aktifPL)})
            </span>
          </span>
        </div>
      </div>

      {/* Donut chart */}
      {portfoyOzet.hisseDagilim && portfoyOzet.hisseDagilim.length > 0 && (() => {
        const R = 36, cx = 46, cy = 46, sw = 10, GAP = 1.5;
        const circ = 2 * Math.PI * R;
        const topDilims = portfoyOzet.hisseDagilim!.slice(0, 3);
        const digerDilims = portfoyOzet.hisseDagilim!.slice(3);
        const digerYuzde = digerDilims.reduce((a, h) => a + h.yuzde, 0);
        const grafikDilims = digerYuzde > 0
          ? [...topDilims, { ticker: "Diğer", deger: digerDilims.reduce((a, h) => a + h.deger, 0), yuzde: digerYuzde, renk: "#2D3F55" }]
          : topDilims;
        let accDl = 0;
        const segs = grafikDilims.map((h) => {
          const dl = (h.yuzde / 100) * circ;
          const dashOff = circ * 0.25 - accDl;
          const visLen = Math.max(0, dl - GAP);
          const startRad = ((accDl / circ) * 360 - 90) * (Math.PI / 180);
          const endRad = (((accDl + dl) / circ) * 360 - 90) * (Math.PI / 180);
          const x1 = (cx + R * Math.cos(startRad)).toFixed(2);
          const y1 = (cy + R * Math.sin(startRad)).toFixed(2);
          const x2 = (cx + R * Math.cos(endRad)).toFixed(2);
          const y2 = (cy + R * Math.sin(endRad)).toFixed(2);
          const hitPath = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${dl / circ > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`;
          accDl += dl;
          return { ...h, dashOff, visLen, hitPath };
        });
        const hov = hoveredIdx !== null ? segs[hoveredIdx] : null;

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <svg width="92" height="92" viewBox="0 0 92 92" style={{ flexShrink: 0 }}>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={sw} />
              {segs.map((seg, i) => (
                <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                  stroke={seg.renk}
                  strokeWidth={hoveredIdx === i ? sw + 4 : sw}
                  strokeDasharray={`${seg.visLen} ${circ - seg.visLen}`}
                  strokeDashoffset={seg.dashOff}
                  strokeLinecap="butt"
                  style={{ transition: "stroke-width 0.15s ease" }}
                />
              ))}
              {segs.map((seg, i) => (
                <path key={`h${i}`} d={seg.hitPath} fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: "pointer" }}
                />
              ))}
              {hov ? (
                <>
                  <text x={cx} y={cy - 4} textAnchor="middle" fontSize="8" fill="#CBD5E1" fontWeight="700" fontFamily="sans-serif">{hov.ticker}</text>
                  <text x={cx} y={cy + 7} textAnchor="middle" fontSize="9" fill={hov.renk} fontWeight="700" fontFamily="sans-serif">{formatPercent(hov.yuzde, { fractionDigits: 1, symbolPosition: "prefix", signDisplay: "never" })}</text>
                </>
              ) : (
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill="#334155" fontWeight="600" fontFamily="sans-serif">{grafikDilims.length} hisse</text>
              )}
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {topDilims.map((h, i) => (
                <div key={`${h.ticker}-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: h.renk, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>{h.ticker}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>{formatPercent(h.yuzde, { fractionDigits: 1, symbolPosition: "prefix", signDisplay: "never" })}</span>
                </div>
              ))}
              {digerDilims.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 3, borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2D3F55" }} />
                    <span style={{ fontSize: 12, color: "#475569" }}>Diğer</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>{formatPercent(digerYuzde, { fractionDigits: 1, symbolPosition: "prefix", signDisplay: "never" })}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Alt grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { label: "Ana Para", value: formatCurrency(portfoyOzet.toplamMaliyet), color: "#94A3B8" },
          { label: mod === "daily" ? "Günlük K/Z" : "Toplam K/Z", value: formatSignedCurrency(aktifPL), color: aktifPozitif ? "#10B981" : "#EF4444" },
          { label: "Hisse Sayısı", value: `${portfoyOzet.hisseSayisi} hisse`, color: "#94A3B8" },
          { label: mod === "daily" ? "Günlük" : "Getiri", value: formatPercent(aktifPLYuzde, { signDisplay: "always" }), color: aktifPozitif ? "#10B981" : "#EF4444" },
        ].map((item) => (
          <div key={item.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 7, padding: "7px 10px" }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#2D3F55", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{item.label}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: item.color, margin: 0 }} suppressHydrationWarning>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const TIP_LABEL: Record<string, string> = {
  fiyat_seviye: "Fiyat",
  fiyat_yuzde: "% Değişim",
  yuzde_degisim: "% Değişim",
  gosterge: "Gösterge",
};

function ActiveAlarmsCard() {
  const [alarmlar, setAlarmlar] = useState<RawAlarm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || !alive) { setLoading(false); return; }
      try {
        const res = await fetch("/api/alarmlar", { headers: { authorization: `Bearer ${session.access_token}` } });
        const data = await res.json();
        if (alive && Array.isArray(data)) setAlarmlar(data.filter((a: RawAlarm) => a.durum === "aktif"));
      } catch { /* ignore */ } finally {
        if (alive) setLoading(false);
      }
    });
    return () => { alive = false; };
  }, []);

  const hedefLabel = (a: RawAlarm) => {
    if (a.tip === "gosterge" && a.gosterge_tipi) return a.gosterge_tipi.toUpperCase();
    if (a.hedef_deger != null) return formatCurrency(a.hedef_deger);
    if (a.hedef_yuzde != null) return `%${a.hedef_yuzde}`;
    return "—";
  };

  return (
    <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 40%, rgba(139,92,246,0.35) 70%, transparent 100%)" }} />
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(96,165,250,0.65)", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Aktif Alarmlar</p>
          {!loading && alarmlar.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 999, padding: "1px 6px" }}>
              {alarmlar.length}
            </span>
          )}
        </div>
        <a href="/alarmlar" style={{ fontSize: 11, color: "#3B82F6", textDecoration: "none", whiteSpace: "nowrap" }}>Tümü →</a>
      </div>

      {loading ? (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[80, 65, 75].map((w, i) => (
            <div key={i} style={{ height: 12, borderRadius: 4, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", width: `${w}%` }} />
          ))}
        </div>
      ) : alarmlar.length === 0 ? (
        <div style={{ padding: "20px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(59,130,246,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
            </svg>
          </div>
          <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.5 }}>Aktif alarm yok.<br />Hisse fiyatlarını takip edin.</p>
          <a href="/alarmlar" style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", textDecoration: "none", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)", padding: "5px 12px", borderRadius: 6 }}>Alarm Ekle →</a>
        </div>
      ) : (
        <>
          {alarmlar.slice(0, 5).map((a) => (
            <a key={a.id} href="/alarmlar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid rgba(59,130,246,0.05)", textDecoration: "none", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ position: "relative", width: 6, height: 6, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: a.kosul === "yukari" ? "#10B981" : "#EF4444", animation: "alarm-ping 1.8s ease-out infinite", opacity: 0 }} />
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.kosul === "yukari" ? "#10B981" : "#EF4444", flexShrink: 0 }} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.2px" }}>{a.ticker}</span>
                <span style={{ fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{TIP_LABEL[a.tip] ?? a.tip}</span>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: a.kosul === "yukari" ? "#10B981" : "#EF4444" }}>
                  {a.kosul === "yukari" ? "▲" : "▼"} {hedefLabel(a)}
                </span>
              </div>
            </a>
          ))}
          <a href="/alarmlar" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", textDecoration: "none", color: "#3B82F6", fontSize: 12, fontWeight: 600, background: "rgba(59,130,246,0.04)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Yeni Alarm Ekle
          </a>
        </>
      )}
    </div>
  );
}

function MarketNewsCard({ kap }: { kap: MarketNews[] }) {
  return (
    <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 40%, rgba(139,92,246,0.4) 70%, transparent 100%)" }} />
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(96,165,250,0.65)", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Piyasa Haberleri</p>
        <a href="/haberler" style={{ fontSize: 11, color: "#3B82F6", textDecoration: "none", opacity: 0.8 }}>Tümü →</a>
      </div>
      {kap.length === 0 ? (
        <div style={{ padding: "14px", color: "#334155", fontSize: 12 }}>Haberler yükleniyor.</div>
      ) : (
        <>
          {kap.map((k, i) => (
            <div key={`${k.ticker}-${k.time}-${i}`} style={{ padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#60A5FA", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 4, padding: "1px 6px", letterSpacing: "0.04em" }}>{k.ticker}</span>
                <span style={{ fontSize: 10, color: "#334155", fontWeight: 500 }}>{k.time}</span>
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.45 }}>{k.title}</div>
            </div>
          ))}
          <a href="/haberler" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 14px", textDecoration: "none", color: "#334155", fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.015)", letterSpacing: "0.02em" }}>
            Tüm haberleri gör →
          </a>
        </>
      )}
    </div>
  );
}

type TakvimEvent = {
  tarih: string;
  saat: string;
  baslik: string;
  onem: string;
  ulke: string;
  gunEtiketi: string;
};

const ONEM_RENK: Record<string, string> = {
  "Yüksek": "#EF4444",
  "Orta": "#F59E0B",
  "Düşük": "#475569",
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function eventDayLabel(tarih: string, baseDate: Date) {
  const bugun = isoDate(baseDate);
  const yarin = isoDate(addDays(baseDate, 1));
  if (tarih === bugun) return "Bugün";
  if (tarih === yarin) return "Yarın";
  return new Date(tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function UpcomingEventsCard() {
  const [events, setEvents] = useState<TakvimEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const from = isoDate(today);
    const to = isoDate(addDays(today, 7));
    fetch(`/api/takvim?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.events)) {
          setEvents(d.events.slice(0, 4).map((event: Omit<TakvimEvent, "gunEtiketi">) => ({
            ...event,
            gunEtiketi: eventDayLabel(event.tarih, today),
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ONEM_BG: Record<string, string> = {
    "Yüksek": "rgba(239,68,68,0.1)",
    "Orta": "rgba(245,158,11,0.1)",
    "Düşük": "rgba(71,85,105,0.15)",
  };
  const ONEM_BORDER: Record<string, string> = {
    "Yüksek": "rgba(239,68,68,0.25)",
    "Orta": "rgba(245,158,11,0.25)",
    "Düşük": "rgba(71,85,105,0.2)",
  };

  return (
    <div className="dash-surface" style={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.5) 40%, rgba(59,130,246,0.4) 70%, transparent 100%)" }} />
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,139,250,0.7)", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Ekonomik Takvim</p>
        <a href="/takvim" style={{ fontSize: 11, color: "#A78BFA", textDecoration: "none", opacity: 0.8 }}>Tümü →</a>
      </div>

      {loading ? (
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[80, 65, 75].map((w, i) => (
            <div key={i} style={{ height: 11, borderRadius: 4, background: "linear-gradient(90deg,#1E293B 25%,#2D3F55 50%,#1E293B 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", width: `${w}%` }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div style={{ padding: "12px 14px", fontSize: 12, color: "#334155" }}>Yaklaşan önemli olay yok.</div>
      ) : (
        events.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <div style={{ flexShrink: 0, width: 44, textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: ONEM_RENK[e.onem] ?? "#475569", background: ONEM_BG[e.onem] ?? "transparent", border: `1px solid ${ONEM_BORDER[e.onem] ?? "transparent"}`, borderRadius: 4, padding: "2px 4px", lineHeight: 1.4 }}>
                {e.gunEtiketi}
              </div>
              <div style={{ fontSize: 10, color: "#334155", marginTop: 2, fontWeight: 500 }}>{e.saat}</div>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: "#CBD5E1", fontWeight: 600, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.ulke} {e.baslik}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: ONEM_RENK[e.onem] ?? "#475569", marginTop: 2, letterSpacing: "0.04em" }}>
                {e.onem} önem
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function DashboardSidePanel({ portfoyOzet, kap }: DashboardSidePanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PortfolioSummaryCard portfoyOzet={portfoyOzet} />
      <ActiveAlarmsCard />
      <RiskProfilWidget />
      <MarketNewsCard kap={kap} />
      <UpcomingEventsCard />
    </div>
  );
}
