import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/cron-auth";
import { hataYakala } from "@/lib/hata-yakala";
import { enstrumanSnapshotlariUret } from "@/lib/enstruman-pricing";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const GECMIS_SAKLAMA_GUN = 400;

function bugunTR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const start = Date.now();
  const { satirlar, hata: fetchHata } = await enstrumanSnapshotlariUret();
  let hata = fetchHata;
  if (fetchHata) hataYakala("enstruman-cron:fetch", new Error(`${fetchHata} enstruman cekilemedi`));
  if (!satirlar.length) {
    return NextResponse.json({ error: "Hicbir enstruman cekilemedi", hata }, { status: 500 });
  }

  const simdi = new Date().toISOString();
  let saved = 0;
  let legacySaved = 0;

  // Yazimlar bagimsiz: migration henuz calismadiysa enstruman_snapshots hata verir
  // ama maden_snapshots cift-yazimi maden tarafini canli tutar (gecis koprusu, FAZ 8'de kalkar).
  const { error: yeniHata } = await supabase.from("enstruman_snapshots").upsert(
    satirlar.map(s => ({ ...s, updated_at: simdi }))
  );
  if (yeniHata) {
    hata++;
    hataYakala("enstruman-cron:upsert", yeniHata);
  } else {
    saved = satirlar.length;
  }

  const madenSatirlar = satirlar.filter(s => s.tur === "maden");
  if (madenSatirlar.length) {
    const { error: legacyHata } = await supabase.from("maden_snapshots").upsert(
      madenSatirlar.map(s => ({
        kod: s.kod,
        ad: s.ad,
        birim: s.birim,
        para_birimi: s.para_birimi,
        fiyat: s.fiyat,
        degisim_yuzde: s.degisim_yuzde,
        gunluk_yuksek: s.gunluk_yuksek,
        gunluk_dusuk: s.gunluk_dusuk,
        getiri_1h: s.getiri_1h,
        getiri_1a: s.getiri_1a,
        getiri_3a: s.getiri_3a,
        getiri_1y: s.getiri_1y,
        kaynak: s.kaynak,
        usdtry_kur: s.usdtry_kur,
        updated_at: simdi,
      }))
    );
    if (legacyHata) {
      hata++;
      hataYakala("enstruman-cron:legacy-upsert", legacyHata);
    } else {
      legacySaved = madenSatirlar.length;
    }
  }

  if (!saved && !legacySaved) {
    return NextResponse.json({ error: "Hicbir tabloya yazilamadi", hata }, { status: 500 });
  }

  // Gunluk kapanis arsivi: saglayici-bagimsiz historical yedek (K6).
  const tarih = bugunTR();
  const gecmisSatirlar = satirlar
    .filter(s => s.fiyat !== null)
    .map(s => ({ kod: s.kod, tarih, fiyat: s.fiyat }));
  if (gecmisSatirlar.length) {
    const { error: gecmisHata } = await supabase.from("enstruman_fiyat_gecmisi").upsert(gecmisSatirlar);
    if (gecmisHata) {
      hataYakala("enstruman-cron:gecmis-upsert", gecmisHata);
    } else {
      const sinir = new Date(Date.now() - GECMIS_SAKLAMA_GUN * 24 * 3600 * 1000).toISOString().slice(0, 10);
      await supabase.from("enstruman_fiyat_gecmisi").delete().lt("tarih", sinir);
    }
  }

  return NextResponse.json({ saved, legacySaved, duration_ms: Date.now() - start, hata });
}
