"use client";
import Link from "next/link";

export default function ProPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0B1220",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      fontFamily: "inherit",
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", marginBottom: 48 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.5px" }}>
          para<span style={{ color: "#3B82F6" }}>konusur</span>
          <span style={{ color: "#475569" }}>.com</span>
        </span>
      </Link>

      {/* Kart */}
      <div style={{
        background: "#0F1C2E",
        border: "1px solid rgba(59,130,246,0.12)",
        borderRadius: 20,
        padding: "52px 48px",
        maxWidth: 480,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 0 60px rgba(59,130,246,0.06)",
      }}>
        {/* İkon */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))",
          border: "1px solid rgba(59,130,246,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          margin: "0 auto 24px",
        }}>
          ⚡
        </div>

        <div style={{
          display: "inline-block",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#3B82F6",
          background: "rgba(59,130,246,0.1)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 20,
          padding: "4px 14px",
          marginBottom: 20,
        }}>
          YAKINDA
        </div>

        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          color: "#F1F5F9",
          letterSpacing: "-0.8px",
          marginBottom: 16,
          lineHeight: 1.2,
        }}>
          Pro Plan<br />
          <span style={{ color: "#3B82F6" }}>geliyor</span>
        </h1>

        <p style={{
          fontSize: 15,
          color: "#94A3B8",
          lineHeight: 1.7,
          marginBottom: 36,
        }}>
          Sınırsız AI analizi, gerçek zamanlı veriler,
          gelişmiş portföy araçları ve çok daha fazlası
          yakında burada olacak.
        </p>

        {/* Özellikler */}
        {[
          "Sınırsız hisse analizi",
          "Gerçek zamanlı fiyat akışı",
          "Gelişmiş risk skorlama",
          "Öncelikli destek",
        ].map((f) => (
          <div key={f} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 0",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            textAlign: "left",
          }}>
            <span style={{ color: "#10B981", fontSize: 14 }}>✓</span>
            <span style={{ fontSize: 14, color: "#CBD5E1" }}>{f}</span>
          </div>
        ))}

        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/dashboard" style={{
            display: "block",
            padding: "13px 24px",
            background: "linear-gradient(135deg, #1E40AF, #3B82F6)",
            color: "#fff",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
          }}>
            Dashboard'a Dön
          </Link>
          <a href="mailto:destek@parakonusur.com" style={{
            display: "block",
            padding: "13px 24px",
            background: "transparent",
            color: "#64748B",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 14,
            textAlign: "center",
          }}>
            Bildirim al → destek@parakonusur.com
          </a>
        </div>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: "#334155" }}>
        © 2026 ParaKonusur.com
      </p>
    </div>
  );
}
