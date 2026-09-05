import type { SupabaseClient } from "@supabase/supabase-js";

export async function reserveChatMessage(db: SupabaseClient, userId: string, day: string, limit: number): Promise<number | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await db.from("chatbot_usage").select("mesaj_sayisi").eq("user_id", userId).eq("gun", day).maybeSingle();
    if (error) throw new Error("Mesaj kotası okunamadı");
    if (!data) {
      const inserted = await db.from("chatbot_usage").insert({ user_id: userId, gun: day, mesaj_sayisi: 1 });
      if (!inserted.error) return 1;
      if (inserted.error.code === "23505") continue;
      throw new Error("Mesaj hakkı ayrılamadı");
    }
    const count = data.mesaj_sayisi;
    if (!Number.isInteger(count) || count < 0) throw new Error("Geçersiz kota kaydı");
    if (count >= limit) return null;
    const updated = await db.from("chatbot_usage").update({ mesaj_sayisi: count + 1, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("gun", day).eq("mesaj_sayisi", count).select("mesaj_sayisi").maybeSingle();
    if (updated.error) throw new Error("Mesaj hakkı ayrılamadı");
    if (updated.data) return updated.data.mesaj_sayisi;
  }
  throw new Error("Kota yoğunluğu; yeniden deneyin");
}
