"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <p className="text-[#94A3B8]">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <nav className="border-b border-[#1E293B] px-8 py-4 flex items-center justify-between">
        <span className="text-white font-bold text-lg">ParaKonusur</span>
        <div className="flex items-center gap-4">
          <span className="text-[#94A3B8] text-sm">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-[#94A3B8] hover:text-white transition-colors"
          >
            Çıkış Yap
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-[#94A3B8] mb-8">Hisse analizi yapmak için arama kutusunu kullan.</p>

        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6">
          <h2 className="text-white font-semibold mb-4">Hisse Ara</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="THYAO, GARAN, ASELS..."
              className="flex-1 px-4 py-3 rounded-lg bg-[#0F172A] border border-[#334155] text-white focus:outline-none focus:border-[#3B82F6]"
            />
            <button className="px-6 py-3 rounded-lg bg-[#1E40AF] hover:bg-[#2563EB] text-white font-medium transition-colors">
              Analiz Et
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}