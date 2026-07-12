export default function FonLoading() {
  return (
    <div style={{ background: "#0B1220", minHeight: "100vh", padding: "28px 30px" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .sk { background: linear-gradient(90deg,#0F1C2E 25%,#162436 50%,#0F1C2E 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:12px; }
      `}</style>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div className="sk" style={{ height: 210, marginBottom: 18 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 0.75fr", gap: 18 }}>
          <div className="sk" style={{ height: 400 }} />
          <div style={{ display: "grid", gap: 18 }}>
            <div className="sk" style={{ height: 260 }} />
            <div className="sk" style={{ height: 260 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
