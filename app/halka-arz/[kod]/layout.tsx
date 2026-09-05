import type { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { ertelenenHalkaArzMi } from "@/lib/halka-arz-ertelenen";

const getOffering = cache(async (kod: string) => {
  if (!/^[A-Z0-9]{2,12}$/.test(kod) || ertelenenHalkaArzMi(kod)) notFound();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await db.from("halka_arzlar").select("kod, sirket_adi, fiyat, talep_baslangic, talep_bitis").eq("kod", kod).maybeSingle();
  if (error) throw new Error("Halka arz bilgileri alınamadı");
  if (!data) notFound();
  return data;
});
export async function generateMetadata({ params }: { params: Promise<{ kod: string }> }): Promise<Metadata> {
  const { kod } = await params;
  const arz = await getOffering(kod.toUpperCase());
  const title = `${arz.kod} Halka Arz — ${arz.sirket_adi} | ParaKonuşur`;
  const description = `${arz.sirket_adi} halka arz fiyatı, talep tarihleri, bireysel tahsisat ve tahmini lot hesabı. Kaynaklı arz ve şirket bilgileri.`;
  const url = `https://www.parakonusur.com/halka-arz/${arz.kod}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" }, twitter: { title, description } };
}
export default async function OfferingLayout({ children, params }: { children: React.ReactNode; params: Promise<{ kod: string }> }) {
  await getOffering((await params).kod.toUpperCase());
  return children;
}
