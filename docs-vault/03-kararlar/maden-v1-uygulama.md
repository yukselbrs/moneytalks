# Kıymetli Madenler v1 — Uygulama Kaydı

**Tarih:** 15 Temmuz 2026 · **Durum:** Uygulandı (plan: [[kiymetli-madenler-plan]], taban: [[hisse-sistemi-mimarisi]])

## Kurulanlar
- **Veri:** `data/madenler.json` (5 enstrüman) + `lib/maden-pricing.ts` — Yahoo GC=F/SI=F/PL=F + USDTRY; gram TL = ons÷31,1035×kur; getiriler (1H/1A/3A/1Y) türetilmiş seriden; `oynaklikProfili` (volatilite/RSI/momentum — `lib/risk-hesaplari` saf fonksiyonları, beta/F-K/hacim bilinçli YOK).
- **Şema:** `maden_snapshots` (migrations.sql — hisse_snapshots RLS deseni) + `portfoy_tur_check` üç değere genişledi (`hisse|fon|maden`).
- **Cron:** `/api/cron/maden-snapshot` + `maden-snapshot-cron.yml` (*/15, 7/24 — COMEX saatleri; BIST'e bağlanmaz) — hata sayaçlı standart desen.
- **API:** `/api/madenler` (statik evren + snapshot birleşimi; tablo yokken de çalışır), `/api/maden/[kod]` (snapshot + canlı grafik + profil; 404 doğrulandı).
- **UI:** `/maden` hub (ISR 300s, 5 kart) + `/maden/[kod]` detay (HisseGrafik reuse — kendi range kontrolüyle; kaynak/kur şeffaflık satırları; SPK disclaimer) + AppShell "Madenler" nav + dashboard Piyasa Özeti'ne **GRAM ALTIN** kartı (grid 4→5).
- **SEO:** `/maden/[kod]/layout.tsx` generateMetadata + Product JSON-LD; sitemap'e 5 maden + **fon URL'leri** (keşifte bulunan eksik bu vesileyle kapandı) + /maden hub.

## Plandan bilinçli sapmalar
1. **`?varlik=maden` sekmesi yerine `/maden` hub'ı:** 5 sabit enstrüman için hisseler sayfasının sıralama/sayfalama/başlık makinesi gereksiz; ayrı hafif hub hem SEO hem bakım açısından üstün. Nav doğrudan hub'a.
2. **Değişim yüzdesi ons bazında** (gram kartında kur etkisi dahil değil — v1 sadeleşmesi, UI'da "türetilmiş" etiketi telafi ediyor). Kur-dahil günlük değişim v2 adayı.

## Bu turda YAPILMAYANLAR (açık iş)
- **AI maden yorumu** (plan adım 6'nın AI kısmı): analiz route'una maden dalı sonraki oturum — detay sayfasında şimdilik deterministik Oynaklık Profili var.
- **Portföy maden UI + karne maden satırı:** plandaki gibi fon UI kalanıyla ORTAK ayrı iş ([[faz4-gorev21-fon-karnesi-hazirlik]]).
- ⛔ Maden alarmları — [[faz4-alarm-cron-donduruldu]] kalkana kadar kapsam dışı.

## Canlıya alma (Barış)
1. migrations.sql'i SQL Editor'de koş (maden_snapshots + portfoy CHECK).
2. Deploy sonrası Actions'ta "Maden Snapshot Cron"u bir kez elle tetikle → `{"saved":5,"hata":0}` bekle; /maden fiyatlarla dolar.

## Doğrulama (canlı, 15 Tem)
tsc + 21 test + build yeşil (5 yeni route derlendi). /maden hub 5 kart + boş-durum notu; /maden/gram-altin grafiği gerçek türetilmiş seriyle çizdi (aylık −%4,61); dashboard gram kartı 6.146,16₺/%-0,11; olmayan kod 404.
