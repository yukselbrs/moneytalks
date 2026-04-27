import AppShell from "@/components/AppShell";

export default function HaberlerPage() {
  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px" }}>
          <p style={{ fontSize: 11, color: "#3B82F6", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>ParaKonuşur · Haberler</p>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.5px", marginBottom: 8 }}>Piyasa Haberleri</h1>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 48 }}>KAP bildirimleri, ekonomi haberleri ve piyasa duyuruları tek ekranda.</p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "48px 0" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📰</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#F1F5F9" }}>Haberler Yakında</p>
            <p style={{ fontSize: 13, color: "#475569", textAlign: "center", maxWidth: 360, lineHeight: 1.7 }}>
              KAP bildirimleri, BIST haberleri ve piyasa duyurularını gerçek zamanlı takip edeceğiniz haberler sayfası hazırlanıyor.
            </p>
            <div style={{ marginTop: 8, padding: "8px 20px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6" }}>Çok Yakında</span>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
