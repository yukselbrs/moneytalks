"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ textAlign: "center", padding: "0 24px" }}>
        <p style={{ fontSize: 80, fontWeight: 800, color: "#1E293B", letterSpacing: "-4px", margin: 0, lineHeight: 1 }}>500</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9", marginTop: 16, marginBottom: 8 }}>Bir şeyler ters gitti</p>
        <p style={{ fontSize: 14, color: "#475569", marginBottom: 32 }}>Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => reset()} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(59,130,246,0.2)", background: "transparent", color: "#64748B", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Tekrar Dene
          </button>
          <button onClick={() => router.push("/dashboard")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#3B82F6", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Dashboard'a Git
          </button>
        </div>
      </div>
    </div>
  );
}
