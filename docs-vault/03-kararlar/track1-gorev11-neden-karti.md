# Track 1 / GÖREV 11 — "Neden Düştü / Neden Çıktı?" kartı v1

**Tarih:** 5 Temmuz 2026
**Durum:** Tamamlandı
**Referans:** brainstorm-2026-07.md Fikir 3; 2026-07-analiz-raporu.md Görev B Boşluk 2

## Ne yapıldı

### 1. `/api/neden` endpoint'i (yeni: `app/api/neden/route.ts`)
- `?tickers=A,B,C` (maks 20) → her ticker için son 24 saatteki KAP eşleşmesi + XU100 günlük değişimi.
- KAP eşleşmesi: `kap_bildirimleri.tickerlar && tickers` (GIN index, GÖREV 9 şeması) + `kap_zamani >= now-24h`; ticker başına en yeni bildirim. Tablo henüz Supabase'de kurulmadıysa sessizce `null` döner (degrade).
- Endeks: Yahoo `XU100.IS` chart meta'sından `(price - chartPreviousClose) / prev` — **ilk taslaktaki `/api/xu` self-fetch bug'ı düzeltildi** (o endpoint `change`'i formatlı string döndürüyor, `degisim` alanı yok; parseFloat virgülde kesiliyordu).
- 60 sn in-memory TTL cache (sorted-tickers anahtarı, 50 girişte temizlik). Anon key + RLS SELECT (kamuya açık veri), service role gerekmez.

### 2. Dashboard chip entegrasyonu (`components/DashboardMarketFocus.tsx`)
- Yükselenler/Düşenler sekmelerindeki mover'lar için tek `/api/neden` çağrısı (dedup, maks 20 ticker; `iptal` flag ile race guard).
- **KAP chip'i (mor):** eşleşme varsa ticker yanında `KAP: <tip etiketi>` — tıklanınca `/kap/<index>` bildirim sayfasına gider (GÖREV 10 SEO sayfası; `stopPropagation` ile satırın hisse navigasyonundan izole).
- **Endeks chip'i (nötr gri):** KAP eşleşmesi yoksa, |XU100| ≥ %1 ve hisse hareketi endeksle aynı yöndeyse "Endeks yönlü".
- Chip'ler yalnız mover sekmelerinde; "Öne Çıkanlar"/"Hacim"de gösterilmez (anormal hareket bağlamı yok).

## Olasılık dili (SPK/yanlış-atıf duruşu)
"Kesin neden" iddiası hiçbir yerde yok:
- KAP chip tooltip: "…zamansal örtüşmesi var; kesin neden göstermez."
- Endeks chip tooltip: "hareket endeksle aynı yönde; hisseye özgü bir gelişme göstermez."
Sadece iki nesnel sinyal (zamansal örtüşme, yön eşleşmesi) sunuluyor; yorum kullanıcıya bırakılıyor.

## Bilinçli sınırlar (v2'ye bırakılan)
- Sektör karşılaştırması yok — `bist-companies.json`'da sektör alanı GÖREV 12'de eklenecek; v1 endeksle yetiniyor.
- Döviz/haber ayrıştırması yok (strateji raporu "atıf motoru v2" kapsamı).
- Chip yalnız dashboard'da; hisse detay sayfasına kart formu ileride.

## Doğrulama
- `tsc --noEmit` temiz.
- Yahoo XU100 endeks hesabı gerçek veriyle doğrulandı (5 Temmuz: -0.26%).
- KAP ayağı tablolar Supabase'e kurulunca canlıda görünür olacak (GÖREV 9 manuel adım 1'e bağlı) — kurulana kadar chip'ler sadece "Endeks yönlü" gösterir, hata üretmez.
