# Kıymetli Madenler Modülü — Uygulama Planı

**Tarih:** 15 Temmuz 2026 · **Durum:** PLAN — onay bekliyor, hiçbir şey uygulanmadı
**Temel:** [[hisse-sistemi-mimarisi]] (hisse sisteminin envanteri) · Emsal: Kaan'ın fon modülü (ikinci varlık sınıfı entegrasyonunun kanıtlanmış deseni)

> ⛔ **Alarm kısıtı:** [[faz4-alarm-cron-donduruldu]] gereği bu plandaki "Alert" bölümü, dondurma kalkana kadar UYGULANMAZ — plan bütünlüğü için yazıldı, implementasyon sırasına dahil edilmedi.

---

## 0. Yaklaşım özeti

Fon modülü deseni birebir izlenir: `maden_snapshots` tablosu + günlük/15dk cron + `/api/madenler` (liste) + `/api/maden/[kod]` (detay) + `/maden/[kod]` sayfası + `/hisseler?varlik=maden` sekmesi + `portfoy.tur='maden'`. Evren küçük ve statik: **v1 = 5 enstrüman** (gram altın TL, ons altın USD, gram gümüş TL, ons gümüş USD, platin ons USD) — genişleme (çeyrek/yarım/tam sarrafiye, paladyum) v2.

## 1. Şema planı (supabase-schema subagent'ına danışılarak kesinleşir)

`fon_snapshots` emsalinden `maden_snapshots`:

```sql
CREATE TABLE IF NOT EXISTS public.maden_snapshots (
  kod TEXT PRIMARY KEY,              -- 'GRAM-ALTIN', 'ONS-ALTIN', 'GRAM-GUMUS', 'ONS-GUMUS', 'ONS-PLATIN'
  ad TEXT NOT NULL,                  -- 'Gram Altın'
  birim TEXT NOT NULL,               -- 'gram' | 'ons'      ← hisseden farklı
  para_birimi TEXT NOT NULL,         -- 'TRY' | 'USD'       ← hisseden farklı
  fiyat NUMERIC,
  degisim_yuzde NUMERIC,
  gunluk_yuksek NUMERIC,
  gunluk_dusuk NUMERIC,
  getiri_1h NUMERIC, getiri_1a NUMERIC, getiri_3a NUMERIC, getiri_1y NUMERIC,
  kaynak TEXT,                       -- 'yahoo-turetilmis' | 'truncgil' (şeffaflık)
  usdtry_kur NUMERIC,                -- TL türetmede kullanılan kur (denetlenebilirlik)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- RLS: hisse_snapshots deseni — herkes SELECT, yazma yalnız service role.
```

Farklılaşan alanlar: `birim`, `para_birimi`, `kaynak`, `usdtry_kur` (hisse_snapshots'ta yok); `hacim`/`piyasa_degeri` YOK (emtiada temsilsiz). Saflık/ayar bilgisi v1'de gereksiz (spot enstrümanlar); sarrafiye (çeyrek/yarım) v2'ye kalırsa `ayar`/`iscilik_farki` alanları o zaman eklenir. `portfoy` değişikliği: yalnız CHECK genişletmesi `tur IN ('hisse','fon','maden')` (idempotent DROP/ADD deseni). Evren dosyası: `data/madenler.json` (statik 5 kayıt: kod, ad, birim, yahoo sembolü, tür).

## 2. Veri kaynağı önerisi (araştırıldı, 15 Temmuz 2026)

| Seçenek | Kapsam | Maliyet | Artı | Eksi |
|---|---|---|---|---|
| **A. Yahoo futures türetme** — `GC=F`, `SI=F`, `PL=F` (canlı doğrulandı: 4069.6/58.69/1657.9 USD) + mevcut `USDTRY=X`; gram TL = ons÷31,1035×kur | Spot altın/gümüş/platin | ₺0 | Sıfır yeni bağımlılık; `fetchYahoo`/`market-pricing`/`grafik` desenleri aynen; geçmiş grafik bedava (chart API) | TR fiziki piyasa (kapalıçarşı) fiyatından sapabilir; sarrafiye yok; Yahoo ToS gri alanı (hissedekiyle aynı, YENİ risk değil) |
| **B. [Truncgil Finans](https://finans.truncgil.com/)** | Gram/çeyrek/yarım/tam/ons altın + gümüş, TR serbest piyasa | Ücretsiz, anahtarsız | TR fiziki fiyatlar; proje geçmişinde kullanılmıştı (desen bilinir) | SLA/garanti yok; geçmiş seri yok (grafik için yetmez) |
| **C. Ücretli TR API** — [AltinAPI](https://altinapi.com/) (67 sembol, Harem verisi, WebSocket; ücretsiz katman 1000 istek/ay), [NosyAPI](https://www.nosyapi.com/api/doviz-ve-altin-fiyatlari), [GoldAPI.io](https://www.goldapi.io/) (global spot) | Sarrafiye dahil tam TR kapsamı | Ücretsiz katmanlar cron sıklığına yetmez (*/15 ≈ 2.900 istek/ay) → ücretli | En doğru TR verisi; anlık | Aylık maliyet + sözleşme; şirket kurulumu öncesi erken |

**Öneri:** v1 = **A** (ana kaynak; grafik+getiri+snapshot tek kaynaktan) + **B** yalnız "TR serbest piyasa gram fiyatı" doğrulama/etiket satırı olarak opsiyonel. C, sarrafiye modülü (v2) gündeme gelirse değerlendirilir. Her fiyat gösteriminde "spot, USD'den türetilmiş, ~15 dk gecikmeli" şeffaflık etiketi (kaynak+kur alanları şemada).

## 3. Route/sayfa planı

| Hisse karşılığı | Maden | Not |
|---|---|---|
| `/hisseler?varlik=fon` sekmesi | `/hisseler?varlik=maden` | Mevcut sekme deseni (page.tsx:147) üçüncü değere genişler; TEFAS filtresi gibi maden'e özgü filtre gerekmez (5 kayıt) |
| `/hisse/[ticker]` | `/maden/[kod]` (`/maden/gram-altin`) | Fon detay sayfası (`app/fon/[kod]/page+layout+loading`) şablon alınır; URL küçük-harf kebab (SEO: "gram altın fiyatı" aramasına doğal) |
| `/api/hisseler` | `/api/madenler` | 5 kayıt — sayfalama yok, tek SELECT |
| `/api/hisse-ozet` | `/api/maden/[kod]` içinde | Ayrı özet endpoint'e gerek yok (5 enstrüman, tek cache) |
| `/api/grafik?ticker=X` | Aynı route genişler | Suffix mantığına `=F` istisnası: `endsWith("=F") → suffix ekleme` (tek satır) — VEYA maden route'u kendi grafik verisini döndürür (temiz ayrım, önerilen) |

Dashboard: Piyasa Özeti şeridine (usd/eur/xu100/xu030) `gram-altin` kartı eklenir (`/api/piyasa`'ya 1 sembol — bağımsız hızlı kazanım).

## 4. Component reuse planı

**Doğrudan kullan (fork yok):** Toast, SkeletonCard, ErrorBoundary, AppShell (+1 nav item "Madenler"), formatters, design-tokens, useSession, StockLogo (fallback modu: "GA" + renk; ileride maden ikonları `public/`e eklenebilir).

**Props ile reuse:** `HisseGrafik` — veri şekli `{tarih, fiyat}[]` varlık-bağımsız; yalnız başlık/para birimi props'u eklenir (fork DEĞİL).

**Şablon-kopya (fon emsalinden):** fon detay sayfası → maden detay (getiri kartları, grafik, genel bilgiler bölümü; "yönetim ücreti/kategori kıyası" blokları çıkar, "birim/kaynak/kur" blokları girer).

**Kopyalanmayacak:** AlarmModal (⛔), KAP bileşenleri, TradingView/temel-analiz kartları, `kurumsalAksiyonlariAyarla`.

## 5. Sistem adaptasyonları

- **Cron:** `.github/workflows/maden-snapshot-cron.yml` — ***/15, 7/24** (COMEX ~23 saat işlem görür; BIST saatine bağlanmaz). Route: `/api/cron/maden-snapshot` — 5 sembol + USDTRY tek Promise.all → türetme → upsert → `hata` sayacı (mevcut workflow grep şablonu aynen).
- **Alert:** ⛔ dondurma kalkana kadar YOK. Kalkarsa: `alarmlar.ticker`'a maden kodu yazmak yeterli (şema hazır); cron'un fiyat kaynağına maden_snapshots eklenir; `gosterge` tipi (RSI) v2.
- **Portföy:** `tur='maden'`; adet alanı gram/ons miktarı (NUMERIC — kesirli gram desteklenir), maliyet birim fiyat. Karne/akşam raporu değer-ağırlıklı hesapları `lib/karne`'de tur-bilinçli genişletilir (fonla birlikte tek işte — [[faz4-gorev21-fon-karnesi-hazirlik]] ile birleştirilmeli).
- **AI commentary:** `/api/analiz`'e `varlik: 'maden'` dalı — ayrı prompt şablonu (bölümler: "Enstrüman Profili", "Fiyat Dinamikleri (kur+ons ayrışması)", "Piyasa Bağlamı (makro)", "Dikkat Noktaları"); SPK dili ve disclaimer aynen; makro risk bloğu zaten enjekte. Pako'ya `get_maden_fiyat` tool'u v2.
- **Risk skoru:** ayrı hafif hesap — volatilite + momentum + RSI + günlük range (beta/F-K/PD-DD/likidite/hacim YOK); `lib/risk-hesaplari` saf fonksiyonları aynen kullanılır (testli).
- **SEO:** `/maden/[kod]/layout.tsx` generateMetadata ("Gram Altın Fiyatı ve Analizi") + JSON-LD (`@type: Product`/`Observation` — Corporation değil); `app/sitemap.ts`'e 5 URL (**not:** fon sayfaları sitemap'te unutulmuş — bu işte fonlar da eklenmeli, 2 satır).

## 6. İmplementasyon sırası (hisse geliştirme sırasına paralel)

1. `data/madenler.json` + migration (`maden_snapshots` + portfoy CHECK) — supabase-schema subagent
2. `lib/maden-pricing.ts` (Yahoo futures + türetme; market-pricing'den uyarlama) — data-pipeline subagent
3. `/api/cron/maden-snapshot` + workflow (hata sayaçlı) → SQL Editor'de migration koşulur, cron elle tetiklenip doğrulanır
4. `/api/madenler` + `/api/maden/[kod]` (grafik verisi dahil)
5. `/maden/[kod]` sayfa+layout (fon şablonundan) + `/hisseler?varlik=maden` sekmesi + AppShell nav + dashboard şerit kartı
6. AI analiz maden şablonu + risk hesabı
7. SEO: metadata + JSON-LD + sitemap (fon URL'leriyle birlikte)
8. Portföy `tur='maden'` UI + karne/akşam raporu entegrasyonu (fon kalanıyla birleşik iş)
9. ⛔ Alert — dondurma kalkınca ayrı iş

Tahmini efor: 1-2 (yarım gün) → 3-5 (1,5 gün) → 6-7 (1 gün) → 8 (fonla ortak, ~1 gün). Toplam ~4 iş günü part-time.

## 7. Riskler ve açık sorular

- **TR fiziki fiyat sapması:** Yahoo türetilmiş gram TL, kapalıçarşı gram fiyatından ±%1-2 sapabilir — kullanıcı Harem/banka fiyatıyla kıyaslarsa güven sorunu. Karşı önlem: "spot/türetilmiş" etiketi net + truncgil doğrulama satırı. Karar gerekli: v1'de truncgil ikinci satırı gösterilsin mi?
- **Yahoo ToS:** mevcut hisse riskiyle aynı sınıf; strateji raporundaki vendor geçiş planı madeni de kapsamalı.
- **Sarrafiye talebi:** kullanıcılar büyük olasılıkla çeyrek/yarım fiyatı da isteyecek — v1'de bilinçli yok; v2 tetikleyicisi kullanıcı geri bildirimi (ve C seçeneği maliyet kararı).
- **BIST-dışı işlem saatleri:** maden 7/24'e yakın oynar — dashboard "KAPALI" rozeti mantığı madene uygulanmamalı (ayrı saat mantığı ya da rozet gizleme).
- **Risk skoru iletişimi:** hisseyle aynı 0-100 ölçek farklı bileşen setiyle üretilince kullanıcı kıyas yapabilir ("altın 30, THYAO 60") — metodoloji farkı UI'da açıkça belirtilmeli ("madene özgü ölçüm").
- **Açık soru:** gümüş/platin gram-TL gösterimi de türetilsin mi, yoksa yalnız altında mı gram (gümüşte ons yaygın)? Öneri: altın gram+ons, gümüş/platin yalnız ons (v1).
