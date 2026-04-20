"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

export default function HissePage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: tickerParam } = use(params);
  const ticker = tickerParam.toUpperCase();
  const [analiz, setAnaliz] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAnaliz() {
    setLoading(true);
    setAnaliz("");
    const res = await fetch("/api/analiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    const data = await res.json();
    setAnaliz(data.analiz);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <nav className="border-b border-[#1E293B] px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-white font-bold text-lg">ParaKonusur</a>
        <button onClick={handleLogout} className="text-sm text-[#94A3B8] hover:text-white">
          Cikis Yap
        </button>
      </nav>
      <main className="max-w-3xl mx-auto px-8 py-12">
        <div className="mb-8">
          <p className="text-[#3B82F6] text-sm font-medium mb-1">BIST Hisse Analizi</p>
          <h1 className="text-4xl font-bold text-white">{ticker}</h1>
        </div>
        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6 mb-6">
          <button
            onClick={handleAnaliz}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#1E40AF] hover:bg-[#2563EB] text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Yapay zeka analiz ediyor..." : "AI Ozet Uret"}
          </button>
        </div>
        {analiz && (
          <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6">
            <h2 className="text-white font-semibold mb-4">AI Analiz Ozeti</h2>
            <div className="text-[#94A3B8] leading-relaxed whitespace-pre-wrap">{analiz}</div>
            <div className="mt-6 pt-4 border-t border-[#334155]">
              <p className="text-[#475569] text-xs">
                Bu analiz yalnizca bilgilendirme amaclidir ve yatirim tavsiyesi niteligini tasimazSatinalma karari vermeden once lisansli bir yatirim danismanina basvurunuz.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
