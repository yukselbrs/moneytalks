# ParaKonuşur.com — Project Handoff v9
**Tarih:** 4 Mayıs 2026
**Durum:** Dashboard grafik fix, AI panel düzeltmeleri, endeks beta fix, MKK/KAP API erişimi sağlandı
**Önceki handoff:** v8 (3 Mayıs 2026)

---

## Hızlı Özet (TL;DR)

Bu oturumda dashboard'daki XU100 intraday grafik baseline sorunu düzeltildi (dünün kapanışından başlatma). AI panel güven skoru artık AI skorundan değil risk seviyesinden türetiliyor. Endeks tickerları (XU100, XU030, XU050) için beta hesabı devre dışı bırakıldı. MKK portalına erişim sağlandı ve KAP Veri Yayın Servisleri API entegrasyonu için zemin hazırlandı.

---

## Git & Stack

- **Repo:** `github.com/yukselbrs/moneytalks`
- **Branch:** `main`
- **Local path:** `~/code/parakonusur`
- **Framework:** Next.js 16.2.3 (Turbopack)
- **Hosting:** Vercel (Hobby plan, Washington D.C. region)
- **DB/Auth:** Supabase
- **CMS:** Sanity (`fflmbld7`, dataset: `production`)
- **DNS:** Cloudflare (DNS-only)
- **Domain:** parakonusur.com (GoDaddy)
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Email:** Resend (`hello@parakonusur.com`)
- **Veri:** Yahoo Finance (`range=2y&interval=1d`, adjclose bazlı % hesaplama)
- **Production URL:** `https://www.parakonusur.com`

---

## Bu Oturumda Yapılanlar

### 1. XU100 Intraday Grafik Baseline Fix

**Sorun:** `app/api/grafik/route.ts` `range=1d` için Yahoo'dan sadece bugünün intraday verisini çekiyordu. Grafik bugünün açılışından başladığı için yön (`%0.31` artı) ile grafik görüntüsü (düşüş) çelişiyordu.

**Kök neden:** `%0.31` dünün kapanışına göre hesaplanır. Ama grafik bugünün ilk mumuyla başladığı için intraday bazda düşüş varken yüzde artı gösteriyordu.

**Fix:** `meta.chartPreviousClose` değerini grafik dizisinin başına eklendi.

`app/api/grafik/route.ts` değişiklikleri (satır 27-44 arası):
```ts
const closes = result.indicators?.quote?.[0]?.close || [];
const prevClose = result.meta?.chartPreviousClose || result.meta?.previousClose || null;

// ... points oluşturulur ...

if (range === "1d" && prevClose && points.length > 0) {
  points = [{ tarih: "Onceki Kapanis", fiyat: parseFloat(prevClose.toFixed(2)) }, ...points];
}
```

### 2. AI Panel Güven Skoru Fix

**Sorun:** `app/dashboard/page.tsx` içinde güven skoru AI skoruna göre hesaplanıyordu:
```ts
const guven = skor >= 65 ? "Yuksek" : skor >= 45 ? "Orta" : "Dusuk";
```
Endeks + değerken - ye düşse bile skor yüksekse güven "Yüksek" kalıyordu.

**Fix:** Güven artık risk seviyesinin tersi:
```ts
const guven = risk.seviyeTR === "Dusuk" ? "Yuksek" : risk.seviyeTR === "Orta" ? "Orta" : "Dusuk";
```

### 3. Endeks Beta Fix

**Sorun:** `app/api/risk/route.ts` içinde XU100 için hem hisse hem piyasa olarak `XU100.IS` çekiliyordu, beta her zaman ~1.0 çıkıyordu.

**Fix:** Endeks tickerları için beta hesabı atlanıyor, ağırlık sıfırlanıyor:
```ts
const endeksler = ["XU100", "XU030", "XU050"];
const isEndeks = endeksler.includes(ticker.toUpperCase());

const beta = isEndeks ? 1 : betaHesapla(hisseGetiri, piyasaGetiri);
const betaRisk = isEndeks ? 0 : (beta < 0.5 ? 10 : ...);

{ ad: "Beta", deger: isEndeks ? "N/A" : beta.toFixed(2), risk: betaRisk, agirlik: isEndeks ? 0 : 0.25 }

const toplamAgirlik = skorBilesenleri.reduce((acc, b) => acc + b.agirlik, 0);
const toplamSkor = skorBilesenleri.reduce((acc, b) => acc + b.risk * b.agirlik, 0) / toplamAgirlik;
```

### 4. MKK/KAP API Erişimi

Barış MKK portalına üye oldu. KAP Veri Yayın Servisleri **otomatik onay** ile açılıyor (bekleme yok).

**Onemli:** Simdilik sadece **demo/test ortamina** erisim var. Test ortaminda yalnizca **Aralik 2023** verileri mevcut. Gercek/canli veri icin **production API erisimi** ayrica alinmasi gerekiyor — henuz alinmadi.

**Demo OpenAPI Spec:** `https://apigwdev.mkk.com.tr/api/vyk?openapi` (test ortami)

**Mevcut servisler:**

| Servis | Fonksiyon | Oncelik |
|--------|-----------|---------|
| `generateToken` | Token Alma | Zorunlu |
| `disclosures` | Bildirim Listesi | Yuksek |
| `disclosureDetail` | Bildirim Detay | Yuksek |
| `lastDisclosureIndex` | Son Bildirim ID | Yuksek |
| `members` | Sirket Listesi | Orta |
| `memberDetail` | Sirket Detay | Orta |
| `memberSecurities` | Sirket Kiymet Bilgileri | Orta |
| `downloadAttachment` | Bildirim Ek Dosyalari | Dusuk |
| `caEventStatus` | Hak Kullanim Surec Durum | Dusuk |
| `blockedDisclosures` | Erisime Kapali Bildirimler | Dusuk |
| `funds` / `fundDetail` | Fon Bilgileri | Dusuk |

**Sonraki adim:**
1. Demo ortami ile auth flow + endpoint'leri test et ve kodla
2. MKK'dan production API erisimi al
3. Production URL ile gercek veriyi bagla
4. `disclosures` + `lastDisclosureIndex` hisse sayfasina entegre et

---

## Mevcut Dosya Yapısı (Kritik Dosyalar)

```
app/
  api/
    analiz/route.ts         — Claude Sonnet 4.6, kisaYorum destekli
    grafik/route.ts         — Yahoo Finance chart, prevClose baseline (BU OTURUMDA DUZELTILDI)
    risk/route.ts           — Beta/volatilite/RSI hesaplama, endeks fix (BU OTURUMDA DUZELTILDI)
    xu/route.ts             — XU100/XU030 fiyat/degisim, 15s cache
    piyasa/route.ts         — USD/TRY, EUR/TRY + XU100/XU030, truncgil.com
    fiyatlar/route.ts       — Hisse fiyat cache, 15s TTL
    hisseler/route.ts       — 606 hisse listesi, bist-companies.json'dan
    alarm*/route.ts         — Alarm CRUD
    portfoy*/route.ts       — Portfoy CRUD
    hesap-sil/route.ts      — Hesap silme, Bearer token
    cron/
      hisse-snapshot/       — GitHub Actions ile tetiklenir, CRON_SECRET gerekli
  dashboard/page.tsx        — Ana dashboard, AI panel fix (BU OTURUMDA DUZELTILDI)
  hisse/[ticker]/page.tsx   — Hisse detay sayfasi
  izleme/page.tsx           — Watchlist
  portfoy/page.tsx          — Portfoy
  alarmlar/page.tsx         — Alarm yonetimi
  bildirimler/page.tsx      — Bildirimler
  profile/page.tsx          — Kullanici profili (v8'de refactor edildi)
components/
  AppShell.tsx              — Sidebar + bottom nav, avatar destekli
  Hero.tsx                  — Landing hero (sticky scroll kaldirildi v8'de)
  StockLogo.tsx             — Logo component
data/
  bist-companies.json       — 606 aktif BIST hissesi
scripts/
  fetch-midas-logos.mjs     — Logo cache, 413 logo
  fetch-bist-snapshots.mjs  — Yahoo'dan snapshot, Supabase upsert
  sync-bist-companies.mjs   — Sembol sync, KOZAA blacklist
```

---

## Supabase Tabloları

```sql
profiles (id, username, full_name, created_at)
  — username unique index: profiles_username_unique on lower(username)
  — RLS: select/update/insert for auth.uid() = id

hisse_snapshots (ticker, fiyat, degisim, getiri_1y, ...)
  — cron job ile guncelleniyor (range=2y, adjclose bazli)
  — Server-side sort destekli

alarmlar (id, user_id, ticker, tip, hedef, aktif, ...)
  — fiyat / yuzde / gosterge alarmlari (RSI, MACD, MA50, hacim)

portfoy (id, user_id, ticker, adet, maliyet, ...)

izleme (id, user_id, ticker, ...)
```

Storage: `avatars` bucket, public read, authenticated write.

---

## Kritik Teknik Bilgiler

### Yahoo Finance
- `regularMarketChangePercent` BIST hisselerinde null donuyor — adjclose bazli hesaplama zorunlu
- `range=1d` + `regularMarketChangePercent` kullanma, `range=5d` + adjclose kullan
- `chartPreviousClose` split oncesi unadjusted fiyat donebilir — bedelsiz sermaye artirimi olan hisseler icin fallback gerekebilir (stuck adjclose: tum degerler ayni)
- Grafik icin `range=1d&interval=5m`, tatilde fallback `range=5d` son gecerli gun
- Yahoo v7/quote kapali, v10/quoteSummary BIST icin marketCap donmuyor
- Piyasa degeri icin ucretli vendor gerekiyor (Foreks/Matriks)

### Vercel
- Hobby plan, Washington D.C. region
- `CRON_SECRET=[REDACTED]` — Sensitive olarak isaretli, `vercel env pull` ile gelmiyor, `.env.local`'e manuel ekle
- In-memory cache (`globalThis`) cold start'ta sifirlanir — rate limit Map icin Supabase/Redis gerekiyor (launch sonrasi)
- Manual cron: `curl -X POST https://www.parakonusur.com/api/cron/hisse-snapshot -H "Authorization: Bearer [REDACTED]"`

### Git Workflow (Kaan ayni repoda calisiyor)
```bash
git stash
git pull --rebase origin main
git stash pop
git push origin main
```
Conflict buyukse: `git rebase --abort` + `git reset --hard origin/main`

### Terminal/macOS
- `conda deactivate` sonra `nvm use 22` — Node v22 LTS, v25 Next.js ile uyumsuz
- zsh: bracket path'lerde tek tirnak: `'app/hisse/[ticker]/page.tsx'`
- Turkce karakter heredoc'ta bozuluyor — `/tmp/` altina Python script yaz
- Project path: `~/code/parakonusur` (iCloud Desktop degil)

### Kod Standartlari
- Python script ile dosya duzenle (`/tmp/fix_*.py`), inline heredoc kullanma
- Comment yok
- Commit mesajlari Turkce karakter icermemeli
- Her degisiklik once local test, sonra push

---

## AI Analiz Sistemi

### `/api/analiz/route.ts`
- Model: `claude-sonnet-4-6`
- `kisaYorum: true` (dashboard): 2-3 cumle, al/sat/tut yonlendirmesi yok
- `kisaYorum: false` (hisse sayfasi): 4 bolumlu format (Sirket Profili, Finansal Durum, Piyasa Konumu, Dikkat Noktalari)
- Rate limit: IP bazli, saatte 10 istek, in-memory Map (Vercel'de guvenilir degil — launch sonrasi Redis)

### `/api/risk/route.ts`
- Yahoo'dan 3 aylik OHLCV cekiyor
- Faktorler: Beta (0.25), Volatilite (0.20), 52H Pozisyonu (0.15), Momentum (0.15), Hacim Anomalisi (0.10), RSI (0.10), Gunluk Range (0.04), Likidite (0.06)
- Endeks icin beta agirlik = 0, normalize ediliyor
- Skor: 0-100 risk skoru (yuksek = riskli)
- Dashboard: `AI Skoru = 100 - risk.skor`
- Guven: `risk.seviyeTR === "Dusuk" ? "Yuksek" : risk.seviyeTR === "Orta" ? "Orta" : "Dusuk"`
- RSI: Wilder yontemi degil, basit ortalama — kucuk sapma kabul edilebilir

---

## Launch Checklist Durumu

| Bolum | Durum |
|-------|-------|
| 1 — Urun & Fonksiyon | Tamamlandi |
| 2 — Finansal Veri & AI | Devam ediyor (KAP/bilanco beklemede) |
| 3 — Hukuk & Uyumluluk | Tamamlandi (avukat onerilir) |
| 4 — Odeme & Abonelik | Sirket kurulumu bekleniyor |
| 5 — Teknik & Guvenlik | Buyuk olcude tamam |
| 6 — UX & Onboarding | Devam ediyor |
| 7 — Icerik & Marka | Baslamadi |
| 8 — Growth & Analytics | GA4 kurulu, Meta Pixel eksik |
| 9 — Launch Oncesi Test | Devam ediyor |
| 10 — Operasyon & Destek | Baslamadi |

---

## Acik Aksiyonlar

### En Kritik
- **KAP API entegrasyonu** — Demo/test ortami hazir (sadece Aralik 2023 verisi var), production erisimi henuz alinmadi
  - Demo spec: `https://apigwdev.mkk.com.tr/api/vyk?openapi`
  - Adimlar: demo ile auth flow + kodlama yap, sonra MKK'dan production erisimi al, production URL ile canli veriye gec
- **Sirket kurulumu** — odeme entegrasyonunun onkosulu, KOSGEB (NACE 62) icin de gerekli

### Orta Oncelik
- Programatik SEO (50 hisse ile pilot)
- Beta testi (10-20 kisi)
- Meta Pixel + LinkedIn Tag
- Beehiiv newsletter
- UX & onboarding akisi, demo video
- Blog (5 yazi)

### Teknik Borc
- Rate limit → Supabase veya Upstash Redis'e tasima
- Bilanco/temel analiz verisi → KAP API sonrasi yeniden degerlendir
- Sentry + PostHog (lansman sonrasi)
- Redis/Upstash API cache (olceklenme oncesi)
- Apple login (mobil uygulama sonrasi)
- Piyasa degeri → ucretli vendor (Foreks/Matriks)
- `next.config.ts` images.domains → remotePatterns migration
- RSI Wilder yontemi

---

## Yeni Chat'e Baslarken

1. Lansmana teknik engel yok — ucretsiz plan ile baslanilebilir
2. **KAP API sonraki buyuk adim** — MKK portali hazir, otomatik onay, spec indirilip token alinabilir
3. Kaan ile ayni repoda calisiyoruz — push oncesi mutlaka `git stash && git pull --rebase origin main && git stash pop`
4. Python script ile dosya duzelt, heredoc kullanma, Turkce karakter yazma
5. Comment yok, commit mesaji Turkce karaktersiz
6. `CRON_SECRET=[REDACTED]` Vercel'de Sensitive, `.env.local`'e manuel ekle
7. Her degisiklik local test sonrasi push
8. Faz durumu (4 Mayis):
   - Faz 1: ~99%
   - Faz 2: ~95% (KAP + bilanco beklemede)
   - Faz 3: ~35% (sirket kurulumu bekliyor)
   - Faz 4: ~18%
