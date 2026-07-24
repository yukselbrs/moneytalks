# Çok-Varlık Portföy + İzleme Entegrasyonu — İmplementasyon Logu

**Durum:** KOD TAMAMLANDI (24 Tem 2026) — watchlist migration Barış'ta bekliyor · Başlangıç: 24 Tem 2026
Tek kaynak: yeni oturum en alttaki **ŞU AN NEREDEYİM** paragrafını okur.

## Bağlam / Talep

Kullanıcı talebi (24 Tem 2026):
> 1. Sorun: hisseler butonu fonlar sayfasına yönlendiriyor.
> 2. Talep: Fonları, döviz ve kıymetli madenleri de portföy kısmına ve izleme listesine entegre et — bir kullanıcı fonları ve kıymetli maden ve dövizleri de portföyüne ve izleme listesine ekleyebilsin.

O ana kadar durum:
- **Döviz + maden** portföye zaten eklenebiliyordu (`portfoy.tur` = hisse/fon/maden/doviz constraint'i canlı, [[doviz-kiymetli-maden-implementasyon-log]]).
- **Fon** hiçbir yere eklenemiyordu (yalnız `/fon` listeleme + `/fon/[kod]` detay vardı).
- **İzleme (watchlist)** yalnız hisse kabul ediyordu (`watchlist` tablosu tek boyutlu `ticker`).

## Karar 1 — Nav bug: routing değil, aktif-vurgu state'i

Teşhis: "Hisseler butonu fonlara yönlendiriyor" algısının **kök nedeni routing değildi** — `AppShell` içindeki `currentVarlik` state'i yalnız `useEffect(..., [pathname])` ile güncelleniyordu; `?varlik=fon` gibi **query-only** navigasyonda `pathname` değişmediği için effect ateşlenmiyor, aktif-vurgu yanlış kalıyordu.

Çözüm: `useSearchParams`'ı Suspense sınırına izole eden `VarlikSync` alt bileşeni.
- Next.js 16'da `useSearchParams` CSR bailout tetikler → prerender hatası ("should be wrapped in a suspense boundary at page /alarmlar"). AppShell tepe seviyesinde çağrılınca tüm sayfalar patlıyordu.
- `VarlikSync` yalnız `sp.get("varlik")` okur, `useEffect`'le parent'a `setCurrentVarlik` bildirir, `<Suspense fallback={null}>` ile sarılır.
- Kaldırılanlar: `navVarlikForHref`, tüm `setCurrentVarlik` onClick'leri, `[pathname]` effect'i.
- Yan düzeltme: mobil nav İzleme ikonu `navItems[5].icon` → `navItems[6].icon` (Fonlar öğesi araya girince kaymıştı).

Commit: `66eb089`.

## Karar 2 — İzleme çok-varlık (watchlist.tur)

`watchlist` tablosuna `tur` kolonu (hisse/fon/doviz/maden). Migration:
```sql
ALTER TABLE public.watchlist ADD COLUMN IF NOT EXISTS tur TEXT NOT NULL DEFAULT 'hisse';
ALTER TABLE public.watchlist DROP CONSTRAINT IF EXISTS watchlist_tur_check;
ALTER TABLE public.watchlist ADD CONSTRAINT watchlist_tur_check CHECK (tur IN ('hisse', 'fon', 'doviz', 'maden'));
DROP INDEX IF EXISTS watchlist_user_ticker_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS watchlist_user_ticker_tur_unique_idx ON public.watchlist (user_id, ticker, tur);
```
**Neden unique index (user_id, ticker, tur):** fon kodu ile hisse ticker'ı teorik olarak çakışabilir (3 harfli fon kodu); `tur`'u anahtara katınca aynı kullanıcı hem "XYZ hisse" hem "XYZ fon"u izleyebilir.

`app/izleme/page.tsx`:
- 3 kaynaklı paralel fiyat: hisse→`/api/fiyatlar`, doviz/maden→`/api/doviz-maden`, fon→`fon_snapshots`. Fiyat **sembolüyle** (₺/$/…) saklanır.
- Güvenli geri-uyum: `loadData` önce `select("ticker,added_at,tur")` dener; hata olursa `tur`'suz tekrar dener (migration ÖNCESİ mevcut hisse izleme listeleri bozulmasın).
- Birleşik arama: hisse (4) + enstrüman (3) + fon (3), keydown + tür rozetli dropdown.
- Satır render: tür'e göre ikon (StockLogo / fon rozeti / EnstrumanIkon); SparklineSVG yalnız hisse.
- Etiketler genelleştirildi: "Toplam Varlık", "+ Varlık Ekle", "VARLIK" başlığı.

Commit: `9ca853f`.

## Karar 3 — Portföy fon (hisseHarici deseni)

`portfoy.tur` constraint'i zaten `('hisse','fon','maden','doviz')` içeriyordu (döviz/maden portföyü canlı) → **fon için yeni migration GEREKMEZ**.

`hooks/usePortfolioData.ts`:
- `fonPozisyonMu(item)` + `hisseHarici(item) = enstrumanPozisyonMu || fonPozisyonMu` yardımcıları.
- `fiyatlariYenile` 3 kaynağa bölündü: `hisseTickers` (=!hisseHarici), `enstrumanVar`, `fonKodlar`. Fon fetch'i `supabase.from("fon_snapshots").select("kod, fiyat, gunluk_getiri")`; map'e `fiyat=f.fiyat, degisim=f.gunluk_getiri`.
- **Risk/senaryo/karne yalnız hisseye özgü** → filtreler `!enstrumanPozisyonMu` yerine `!hisseHarici` (fon da dışlanır).

`app/portfoy/page.tsx`:
- `pozisyonLink`: fon → `/fon/${ticker}`. `pozisyonAd`: fon → kod (detay sayfası tam ünvanı gösterir).
- `fonListesi` (kod+ünvan) bir kez çekilir; `fonKodSet` = useMemo(Set).
- `handleEkle`: `fonMu = !enstruman && fonKodSet.has(girilen)` → `tur = enstruman ? enstruman.tur : fonMu ? "fon" : undefined`.
- Ekle-modal autocomplete'e **Fon rozeti** (teal, #2DD4BF) bloğu — kod + kırpılmış ünvan.
- Toplam/PL hesapları `tur` filtresi olmadan tüm portföyü gezer; fon artık `fon_snapshots`'tan fiyat aldığı için doğal olarak dahil (enstrümanla aynı desen).

Commit: `84dddf2`.

## Alternatifler (elenen)

- **Portföyde fon için ayrı unique-key (user_id,ticker,tur):** eklenmedi. Döviz/maden zaten `tur`'suz (user_id,ticker) uzayını paylaşıyor; fon kodu ↔ BIST ticker çakışması ekstrem edge (3 harfli fon vs 4-5 harfli ticker + kullanıcının ikisini birden tutması). Mevcut enstrüman deseniyle tutarlı kalındı. İzleme'de ise `tur` anahtara katıldı çünkü orada maliyet sıfır ve doğallık yüksek.
- **Fon fiyatını /api/fiyatlar'a ek endpoint yapmak:** gereksiz; `fon_snapshots` doğrudan Supabase'den okunabiliyor, ekstra HTTP yok.

## AÇIK KALANLAR

- [ ] **Barış — Supabase SQL Editor:** watchlist `tur` migration'ı (yukarıdaki blok, `supabase/migrations.sql` içinde idempotent). İzleme çok-varlık **bu çalışana kadar** yalnız hisse döner (güvenli fallback devrede — hata vermez, sadece fon/döviz/maden izleme eklenemez).
- [ ] Barış — deploy sonrası Cloudflare "Purge Everything".
- [ ] Prod doğrulama: fon portföye ekle → 15sn fiyat yenileme → PL doğru mu; fon izlemeye ekle (migration sonrası).

## ŞU AN NEREDEYİM

24 Tem 2026 — **Kod tamamlandı, üçü de push'landı** (nav `66eb089`, izleme `9ca853f`, portföy `84dddf2`). tsc temiz, `npm run build` ✓ (15.5s, tüm route'lar derlendi). Portföy fonu **migration'sız canlıya hazır** (constraint mevcut). İzleme çok-varlık **watchlist.tur migration'ına bağlı** — Barış çalıştırınca tam açılır; öncesinde güvenli fallback ile hisse-only çalışır ve kırılmaz. Sıradaki gerçek iş: prod doğrulama (Barış migration + purge sonrası).
