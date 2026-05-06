export default function HisseLoading() {
  return (
    <div style={{ background: "#0B1220", minHeight: "100vh", padding: "34px 24px" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .sk { background: linear-gradient(90deg,#0F1C2E 25%,#162436 50%,#0F1C2E 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }
      `}</style>
      <div style={{ maxWidth: 940, margin: "0 auto" }}>
        <div className="sk" style={{ height: 140, borderRadius: 14, marginBottom: 18 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 26 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="sk" style={{ height: 68 }} />)}
        </div>
        <div className="sk" style={{ height: 310, borderRadius: 12 }} />
      </div>
    </div>
  );
}
