# data-pipeline — Kalıcı Notlar

> data-pipeline subagent'ının veri kaynağı hafızası. Yeniden keşfetme, buradan oku.

## KAP API (apigwdev.mkk.com.tr/api/vyk) — endpoint davranışları (2026-07-04)

- **Auth**: Basic Auth, `base64(KAP_API_KEY:KAP_API_SECRET)`. Env: `KAP_API_URL`, `KAP_API_KEY`, `KAP_API_SECRET` (`app/api/haberler/route.ts` ile aynı desen). Demo ortamda çalışıyor doğrulandı — production URL değişimi sadece `KAP_API_URL` env değişimiyle olmalı (hardcode etme).
- **`GET /lastDisclosureIndex`** → `{ lastDisclosureIndex: "1231017" }` (string, parseInt gerekli). Monoton artan tam sayı.
- **`GET /disclosures?disclosureIndex={N}`** → dizi, `disclosureIndex` **N dahil** olarak N'den itibaren gelen tüm bildirimleri döner (son testte 31 bildirim için range [N, N+30] verdi — yani `disclosureIndex` parametresi "bu index'ten itibaren" anlamına geliyor, "bu index'ten sonra" değil). Cursor güncellerken bir sonraki taramada aynı index'in tekrar işlenmesi sorun değil çünkü `kap_bildirimleri.disclosure_index` UNIQUE + upsert ignoreDuplicates.
- **`disclosureType` çeşitliliği ham listede**: `FON` (fon bildirimleri — görev gereği atlanıyor), `ODA` (özel durum açıklaması), `CA` (kurumsal aksiyon/ihraç), `DG` (genel bilgi formu), `DUY` (KAP duyurusu/sistem — **test bildirimleri de bu tipte gelebilir**, örn. "Test Bildirimi" subject'i ile `senderExchCodes` alanı hiç yok).
- **`GET /disclosureDetail/{index}?fileType=data`** → tekil detay. Liste endpoint'inde olmayan `senderExchCodes`, `subject.tr`, `summary.tr`, `time` (`DD.MM.YYYY HH:mm:ss` formatında, parse için `parseDate` gibi manuel split gerekli — ISO değil), `link`, opsiyonel `flatData` (yalnız bazı tiplerde, örn. CA/DG'de var, DUY'da yok) alanlarını taşır.
- **Boş `senderExchCodes` filtresi kritik**: DUY tipi sistem/test bildirimlerinde `senderExchCodes` alanı tamamen eksik (undefined, boş array değil). Bu bildirimler tickera bağlanamadığı için tabloya YAZILMAMALI — cursor'da "görüldü" sayılır ama `kap_bildirimleri`'ne insert edilmez. Filtre: `if (!detay.senderExchCodes?.length) continue;`.
- **`summary.tr` bazen null**: `subject.tr` her zaman dolu, `summary.tr` (KAP'ın kendi özeti) bazı tiplerde (örn. DG) null olabilir. Başlık/konu için `subject.tr` fallback zorunlu.
- Rate/timeout riski: her yeni bildirim için ayrı `disclosureDetail` çağrısı yapılıyor (N+1). Batch'te 10-30 bildirim normal ama tek bildirim hatası tüm run'ı düşürmemeli — try/catch + continue ile izole edildi (`app/api/cron/kap-bildirimleri/route.ts`).

## KAP cron mimarisi (2026-07-04)

- Route: `app/api/cron/kap-bildirimleri/route.ts`. Akış: cursor oku → yeni bildirim listesi çek → FON hariç detay çek + sınıflandır + kaydet → cursor güncelle → durum='yeni' olanlardan en fazla 5'i özetle (`lib/kap-ozet.ts`, paralel yazılan modül — sözleşme: `[[kap-ozet-sozlesmesi]]`) → durum='ozetlendi' olanlardan en fazla 5'i `watchlist` üzerinden eşleşen kullanıcılara gönder (idempotency: `kap_bildirim_gonderim` insert-then-check).
- `watchlist` tablosunda ticker tekil kolon (array değil) — bildirimin `tickerlar[]` dizisiyle eşleşme `.in("ticker", tickerlar)` ile yapılıyor, GIN array-overlap sorgusu `kap_bildirimleri` tarafında SEO/listeleme için var ama watchlist eşleşmesinde gerekmiyor.
- Batch limiti 5/run seçildi çünkü `maxDuration = 60` var ve özet üretimi (Claude çağrısı) + e-posta gönderimi zaman alıyor; birikim sonraki 15dk'lık cron çalıştırmasında erir — tek run'da tüm birikimi işlemeye çalışmak timeout riski taşır.
- ADR: `docs-vault/03-kararlar/kap-tercumani-supabase-semasi.md` (şema tarafı, supabase-schema agent'ı yazdı).

## kap-ozet-sozlesmesi (lib/kap-ozet.ts arayüzü, 2026-07-04)

Route bu sözleşmeye göre yazıldı (dosya bu görev sırasında henüz mevcut değildi, kap-explainer agent'ı paralel yazıyordu):
```ts
export type KapBildirimTipi = "ozel_durum" | "finansal_rapor" | "pay_geri_alim" | "sermaye_artirimi" | "temettu" | "genel_kurul" | "diger";
export type KapDetay = { disclosureIndex: string; senderExchCodes?: string[]; subject?: {tr?: string}; summary?: {tr?: string}; disclosureType?: string; disclosureClass?: string; time?: string; link?: string; flatData?: unknown };
export function siniflandir(detay: KapDetay): KapBildirimTipi;
export async function ozetUret(detay: KapDetay, tip: KapBildirimTipi): Promise<{ ozetTekCumle: string; ozetNeDemek: string }>;
export function baglamMetni(ticker: string): string;
```
Bu tipler `kap_bildirimleri.bildirim_tipi` CHECK constraint'iyle birebir eşleşmeli (supabase/migrations.sql satır ~537). Gelecekte modül değişirse burayı güncelle.

## TradingView Scanner — `sector` kolonu (2026-07-05)

- `POST https://scanner.tradingview.com/turkey/scan`, body `{ symbols: { tickers: ["BIST:THYAO", ...] }, columns: ["sector"] }` — **606 ticker'ın tamamı tek istekte** kabul edildi (chunk'a bölmeye gerek kalmadı, `totalCount: 606`, `data.length: 606`). Aynı endpoint F/K, PD/DD, piyasa değeri için `app/api/risk/route.ts` satır ~257'de tek-ticker olarak kullanılıyor; çoklu-ticker (batch) modu da destekleniyor.
- Response sırası istek sırasıyla aynı çıktı (606/606 test edildi) ama **garanti değil** — eşleştirmeyi index'e göre değil, response'taki `s` alanına (`"BIST:TICKER"` formatında) göre yap. Geçersiz/rename olmuş ticker'lar (ör. eski `KOZAA`) `data` dizisinden sessizce düşer, hata dönmez.
- Sektör kategorileri sabit ~20 değerlik İngilizce bir taksonomi (GICS-benzeri: Finance, Process Industries, Producer Manufacturing, Non-Energy Minerals, Technology Services, Electronic Technology, vb.) — TradingView'in kendi sektör şeması, GICS ile birebir aynı isimlendirme değil. 606 BIST hissesinin tamamında bu kolon dolu geldi (null yok), `data/bist-companies.json`'a `sektor` alanı bu şekilde eklendi (`scripts/add-sektor.mjs`, çeviri tablosu `SEKTOR_CEVIRI` scriptin içinde).
- Kapsama %100 çıktığı için fallback/yedek kaynak (KAP sektör alanı vb.) araştırılmadı — ileride bir ticker null dönerse önce TradingView'in ticker formatını (rename/deList olasılığı) kontrol et, sonra fallback kaynağa geç.
