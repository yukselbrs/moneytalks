"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

const POPULAR = [
  { ticker: "THYAO", name: "Türk Hava Yolları" },
  { ticker: "GARAN", name: "Garanti Bankası" },
  { ticker: "ASELS", name: "Aselsan" },
  { ticker: "EREGL", name: "Ereğli Demir Çelik" },
  { ticker: "SISE", name: "Şişecam" },
  { ticker: "AKBNK", name: "Akbank" },
  { ticker: "KCHOL", name: "Koç Holding" },
  { ticker: "BIMAS", name: "BİM Mağazalar" },
];

const KAP = [
  { ticker: "THYAO", title: "Esas Sözleşme Tadili", time: "15:56" },
  { ticker: "TKNSA", title: "Pay Bazında Devre Kesici Bildirimi", time: "15:56" },
  { ticker: "AKBNK", title: "Yabancı Yatırımcı İşlemleri", time: "15:51" },
];

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState("");
  const [recent, setRecent] = useState<{ ticker: string; time: string }[]>([]);
  const [watchlist, setWatchlist] = useState<{ ticker: string }[]>([]);
  const [fullName, setFullName] = useState("");
  const [piyasa, setPiyasa] = useState({ usd: { value: "-", change: "-" }, eur: { value: "-", change: "-" } });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      setFullName(session.user.user_metadata?.full_name || "");
      const { data } = await supabase
        .from("watchlist")
        .select("ticker")
        .eq("user_id", session.user.id)
        .order("added_at", { ascending: false });
      if (data) setWatchlist(data);
      setLoading(false);
    });
    fetch("/api/piyasa").then(r => r.json()).then(d => setPiyasa(d)).catch(() => {});
    const loadRecent = () => {
      const stored = localStorage.getItem("pk_recent");
      if (stored) setRecent(JSON.parse(stored));
    };
    loadRecent();
    window.addEventListener("focus", loadRecent);
    return () => window.removeEventListener("focus", loadRecent);
  }, [router]);

  async function addToWatchlist(t: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const already = watchlist.find((w) => w.ticker === t);
    if (already) return;
    await supabase.from("watchlist").insert({ user_id: session.user.id, ticker: t });
    setWatchlist((prev) => [{ ticker: t }, ...prev]);
  }

  async function removeFromWatchlist(t: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("ticker", t);
    setWatchlist((prev) => prev.filter((w) => w.ticker !== t));
  }

  function handleAnaliz(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    const t = ticker.trim().toUpperCase();
    const entry = { ticker: t, time: new Date().toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) };
    const updated = [entry, ...recent.filter((r) => r.ticker !== t)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("pk_recent", JSON.stringify(updated));
    router.push(`/hisse/${t}`);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const firstName = user?.email?.split("@")[0] ?? "";
  const nowDate = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "short", weekday: "long" });
  const nowTime = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const now = `${nowDate} · ${nowTime}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1220" }}>
        <p style={{ color: "#475569", fontSize: 14 }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)" }}>
      {/* Navbar */}
      <nav style={{ borderBottom: "1px solid rgba(59,130,246,0.1)", padding: "13px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ fontSize: 15, fontWeight: 500, color: "#F8FAFC", textDecoration: "none" }}>
          para<span style={{ color: "#3B82F6" }}>konusur</span><span style={{ color: "#1E293B" }}>.com</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#475569", letterSpacing: "0.06em" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#1D9E75" }} />
            CANLI
          </div>
          <a href="/profile" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#3B82F6" }}>
              {fullName ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : user?.email?.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "#475569" }}>{user?.email}</span>
          </a>
          <button onClick={handleLogout} style={{ fontSize: 12, color: "#94A3B8", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "5px 13px", background: "transparent", cursor: "pointer" }}>
            Çıkış Yap
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "#F8FAFC" }}>İyi günler, {firstName}</h1>
          <span style={{ fontSize: 11, color: "#334155" }}>{now}</span>
        </div>

        {/* Arama */}
        <form onSubmit={handleAnaliz} style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(59,130,246,0.15)", paddingBottom: 10 }}>
          <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Hisse kodu veya şirket adı girin..."
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#94A3B8", padding: "4px 0" }} />
          <button type="submit" style={{ height: 30, padding: "0 12px", background: "rgba(59,130,246,0.12)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
            Analiz Et
          </button>
        </form>

        {/* Piyasa Özeti */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Piyasa Özeti</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              { label: "XU100", val: "14.543", change: "-0,30%", up: false },
              { label: "XU030", val: "16.663", change: "-0,36%", up: false },
              { label: "USD/TRY", val: piyasa.usd.value, change: piyasa.usd.change, up: !piyasa.usd.change.startsWith("-") },
              { label: "EUR/TRY", val: piyasa.eur.value, change: piyasa.eur.change, up: !piyasa.eur.change.startsWith("-") },
            ].map((e) => (
              <div key={e.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 500, marginBottom: 5 }}>{e.label}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#E2E8F0", marginBottom: 2 }}>{e.val}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: e.up ? "#1D9E75" : "#E24B4A" }}>{e.change}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Popüler Hisseler */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Popüler BIST Hisseleri</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {POPULAR.map((s) => (
              <div key={s.ticker} onClick={() => router.push(`/hisse/${s.ticker}`)}
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8, padding: "10px 12px", cursor: "pointer", position: "relative" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#E2E8F0" }}>{s.ticker}</div>
                <div style={{ fontSize: 10, color: "#334155", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <button onClick={(ev) => { ev.stopPropagation(); addToWatchlist(s.ticker); }}
                  style={{ position: "absolute", top: 8, right: 8, fontSize: 10, color: "#1E40AF", background: "none", border: "none", cursor: "pointer" }}>
                  {watchlist.find((w) => w.ticker === s.ticker) ? "★" : "☆"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Alt 3 kolon */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {/* İzleme Listesi */}
          <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.07em", textTransform: "uppercase" }}>İzleme Listesi</span>
            </div>
            {watchlist.length === 0 ? (
              <div style={{ padding: "20px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <p style={{ fontSize: 12, color: "#334155", textAlign: "center" }}>Henüz hisse eklemediniz</p>
                <p style={{ fontSize: 11, color: "#1E293B", textAlign: "center" }}>Hisse kartlarındaki ☆ ile ekleyin</p>
              </div>
            ) : (
              watchlist.map((w) => (
                <div key={w.ticker} onClick={() => router.push(`/hisse/${w.ticker}`)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid rgba(59,130,246,0.05)", cursor: "pointer" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#E2E8F0" }}>{w.ticker}</div>
                  <button onClick={(e) => { e.stopPropagation(); removeFromWatchlist(w.ticker); }}
                    style={{ fontSize: 11, color: "#334155", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              ))
            )}
          </div>

          {/* Son Analizler */}
          <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.07em", textTransform: "uppercase" }}>Son Analizlerin</span>
            </div>
            {recent.length === 0 ? (
              <div style={{ padding: "20px 14px" }}>
                <p style={{ fontSize: 12, color: "#334155", textAlign: "center" }}>Henüz analiz yapmadınız</p>
              </div>
            ) : (
              recent.map((r, i) => (
                <div key={i} onClick={() => router.push(`/hisse/${r.ticker}`)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid rgba(59,130,246,0.05)", cursor: "pointer" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#E2E8F0" }}>{r.ticker}</div>
                    <div style={{ fontSize: 10, color: "#334155", marginTop: 1 }}>{r.time}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "#1E40AF" }}>→</span>
                </div>
              ))
            )}
          </div>

          {/* KAP Haberleri */}
          <div style={{ border: "1px solid rgba(59,130,246,0.08)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#334155", letterSpacing: "0.07em", textTransform: "uppercase" }}>KAP Haberleri</span>
            </div>
            {KAP.map((k, i) => (
              <div key={i} style={{ padding: "9px 14px", borderBottom: i < KAP.length - 1 ? "1px solid rgba(59,130,246,0.05)" : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: "#3B82F6", marginBottom: 2 }}>{k.ticker}</div>
                <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>{k.title}</div>
                <div style={{ fontSize: 10, color: "#1E293B", marginTop: 2 }}>{k.time}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
