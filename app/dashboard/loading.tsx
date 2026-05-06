export default function DashboardLoading() {
  return (
    <div style={{ background: "#0B1220", minHeight: "100vh", padding: "24px 32px" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .sk { background: linear-gradient(90deg,#0F1C2E 25%,#162436 50%,#0F1C2E 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }
      `}</style>
      <div className="sk" style={{ width: 200, height: 28, marginBottom: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {[1,2,3,4].map(i => <div key={i} className="sk" style={{ height: 80 }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12 }}>
        <div className="sk" style={{ height: 340 }} />
        <div className="sk" style={{ height: 340 }} />
      </div>
    </div>
  );
}
