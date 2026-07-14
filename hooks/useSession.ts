"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/components/lib/supabase";

// Tek seferlik getSession() hard-load'da null donebiliyor (auth-js init yarisi).
// Bu hook ilk degeri getSession'dan alir, sonrasini onAuthStateChange'e abone olarak izler;
// INITIAL_SESSION event'i gec gelse bile state kendini duzeltir.
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionHazir, setSessionHazir] = useState(false);

  useEffect(() => {
    let aktif = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!aktif) return;
      setSession(data.session);
      setSessionHazir(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, yeni) => {
      if (!aktif) return;
      setSession(yeni);
      setSessionHazir(true);
    });
    return () => {
      aktif = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, sessionHazir };
}
