"use client";

import { useEffect, useState } from "react";

type Haber = { id: string; baslik: string; kaynakUrl: string; tarih: string };

export default function HisseKapHaberleri({ ticker }: { ticker: string }) {
  const [haberler, setHaberler] = useState<Haber[]>([]);
  const [yuklendi, setYuklendi] = useState(false);
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    let iptal = false;
    fetch(`/api/haberler?ticker=${ticker}`)
      .then(r => r.json())
      .then(j => { if (!iptal) { setHaberler(Array.isArray(j.haberler) ? j.haberler : []); setYuklendi(true); } })
      .catch(() => { if (!iptal) setYuklendi(true); });
    return () => { iptal = true; };
  }, [ticker]);

  if (yuklendi && haberler.length === 0) return null;

  const gosterilen = haberler.slice(0, limit);

  return (
    <section style={{ marginTop: 26 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#F1F5F9", margin: 0, letterSpacing: "-0.3px" }}>{ticker} KAP Bildirimleri</h2>
        <span style={{ fontSize: 11, color: "#64748B" }}>Kamuyu Aydınlatma Platformu</span>
      </div>

      <div className="card-glass" style={{ borderRadius: 12, overflow: "hidden" }}>
        {!yuklendi && <p style={{ fontSize: 12.5, color: "#64748B", padding: "16px 16px", margin: 0 }}>Yükleniyor...</p>}
        {gosterilen.map((h) => {
          const tarih = new Date(h.tarih);
          const tarihStr = Number.isNaN(tarih.getTime())
            ? ""
            : tarih.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "2-digit" });
          return (
            <a key={h.id} href={h.kaynakUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.1)", borderRadius: 6, padding: "3px 7px", flexShrink: 0 }}>KAP</span>
              <span style={{ fontSize: 13, color: "#CBD5E1", flex: 1, lineHeight: 1.4, minWidth: 0 }}>{h.baslik}</span>
              <span style={{ fontSize: 11, color: "#64748B", whiteSpace: "nowrap", flexShrink: 0 }}>{tarihStr}</span>
              <span style={{ fontSize: 13, color: "#475569", flexShrink: 0 }}>↗</span>
            </a>
          );
        })}
      </div>

      {haberler.length > limit && (
        <button onClick={() => setLimit(l => l + 10)} style={{ marginTop: 10, width: "100%", padding: "10px 14px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.16)", borderRadius: 10, color: "#93C5FD", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Daha fazla göster ({haberler.length - limit})
        </button>
      )}

      <p style={{ fontSize: 11, color: "#475569", marginTop: 10, lineHeight: 1.6 }}>
        Kaynak: KAP (kap.org.tr). Bildirimler kronolojik sırayla listelenir; başlığa tıklayınca KAP&apos;taki aslına gidersiniz.
      </p>
    </section>
  );
}
