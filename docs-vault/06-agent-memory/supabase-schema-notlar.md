# supabase-schema — Kalıcı Notlar

> supabase-schema subagent'ının şema/migration hafızası. Seyrek çalışır, hata maliyeti yüksek.

## Migration işleyişi (KRİTİK)
- Tek dosya: `supabase/migrations.sql`. **Manuel** çalıştırılır (Supabase SQL Editor). Otomatik migration runner veya DDL erişimi YOK.
- Dosya **idempotent**: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` + `CREATE POLICY`, `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`. Baştan sona tekrar çalıştırılabilir.
- Yorum stili: Türkçe, ASCII (Türkçe karakter yok — SQL Editor uyumu). Obvious yorum yazma.
- Production'da migration dosyasında olmayan tablolar olabilir (elle eklenmiş). Yeni ekleme yaparken `IF NOT EXISTS` ile geriye uyumlu tanımla — mevcut veriyi bozma.

## rate_limits tablosu + rate_limit_hit RPC (2026-07-04 eklendi)
Amaç: kalıcı, atomik rate limiting (in-memory `Map` süreç yeniden başlayınca sıfırlanıyor + serverless'ta paylaşılmıyordu).

- `public.rate_limits (key TEXT PK, window_start TIMESTAMPTZ, count INT, updated_at TIMESTAMPTZ)`.
- **RLS açık ama policy YOK** → hiçbir role erişemez; yalnız service role (RLS bypass) yazar/okur. Bu bilinçli tasarım.
- **RPC sözleşmesi** — `public.rate_limit_hit(p_key TEXT, p_window_seconds INT, p_max INT) RETURNS BOOLEAN`:
  - `SECURITY DEFINER`, `SET search_path = public`. `EXECUTE` anon/authenticated'tan REVOKE edildi → sadece service role çağırır.
  - **Fixed window** (sabit pencere, sliding değil): pencere başı = `to_timestamp(floor(epoch/p_window_seconds)*p_window_seconds)`.
  - Tek statement `INSERT ... ON CONFLICT (key) DO UPDATE` ile atomik: aynı pencerede `count+1`, yeni pencerede `count=1` + `window_start` yenilenir. Yarış koşulu yok.
  - **Dönüş: `count <= p_max` ise TRUE (izin var), aşıldıysa FALSE.** Çağıran taraf FALSE'ta 429 döndürmeli. Not: pencerenin ilk isteği `count=1`, yani `p_max` = pencere başına izin verilen toplam istek sayısı.
- Temizlik: `public.rate_limits_temizle() RETURNS void` → `updated_at < NOW() - INTERVAL '2 days'` satırları siler. Şimdilik manuel, ileride cron.

## chatbot_usage tablosu (2026-07-04 migration'a eklendi; prod'da zaten vardı)
Amaç: chatbot günlük mesaj limiti (ücretsiz 3 mesaj/gün; Pro bypass `profiles.is_pro`/`pro_until`).
- `public.chatbot_usage (user_id UUID FK auth.users ON DELETE CASCADE, gun DATE, mesaj_sayisi INT, updated_at TIMESTAMPTZ, PRIMARY KEY (user_id, gun))`.
- Kullanım (`app/api/chatbot/route.ts`): `.select("mesaj_sayisi").eq(user_id).eq(gun).single()` → composite PK bu okumanın tekilliğini garantiler. `.insert({user_id, gun, mesaj_sayisi:1})` ve `.update({mesaj_sayisi}).eq(user_id).eq(gun)`. `gun` = `new Date().toISOString().split("T")[0]` (bugün).
- **RLS**: kullanıcı kendi satırını SELECT eder (`chatbot_usage_select_own`, `auth.uid() = user_id`). INSERT/UPDATE policy YOK → yazma yalnız service role.

## KAP Tercümanı: kap_bildirimleri + kap_bildirim_gonderim + kap_cursor (2026-07-04 eklendi)
Amaç: KAP bildirimlerini saklamak + Claude 3 katmanlı özeti bir kez üretip cache'lemek + izleme bazlı e-posta idempotency + SEO'da kamuya açık gösterim. ADR: `docs-vault/03-kararlar/kap-tercumani-supabase-semasi.md`.

**`kap_bildirimleri`** (ana tablo, bir satır = bir bildirim + cache'li özet):
- `id UUID PK`; `disclosure_index BIGINT UNIQUE` = KAP doğal anahtarı + cache anahtarı. Cron `ON CONFLICT (disclosure_index) DO NOTHING` ile mükerrer yazımı önler.
- `ticker TEXT` (birincil = senderExchCodes[0]) + `tickerlar TEXT[] DEFAULT '{}'` (çoklu kod; array-overlap `&&` eşleşme için).
- `bildirim_tipi TEXT DEFAULT 'diger'` + ayrı `kap_bildirimleri_tip_check` CHECK constraint. Allowlist: ozel_durum, finansal_rapor, pay_geri_alim, sermaye_artirimi, temettu, genel_kurul, diger. **Yeni tip eklemek:** dosyadaki `ALTER ... DROP CONSTRAINT IF EXISTS ... ADD CONSTRAINT` bloğunu güncelle, tekrar çalıştır (idempotent).
- `kap_tipi TEXT` (ham disclosureType: ODA/FR/...), `baslik`, `konu`, `kap_zamani TIMESTAMPTZ`, `kap_link`, `ham_detay JSONB` (disclosureDetail kaynak-of-truth).
- Özet: `ozet_tek_cumle` (katman 1), `ozet_ne_demek` (katman 2), `ozet_uretim_zamani`. **3. katman (portföy/izleme bağlamı) tabloda YOK** — kullanıcıya göre gönderim anında şablonla kurulur, Claude'a gitmez.
- `durum TEXT DEFAULT 'yeni'` CHECK(yeni/ozetlendi/hata) = özet aşaması (per-bildirim, gönderim değil).
- Index'ler: `disclosure_index` UNIQUE (SEO tekil çekim + cache lookup); `(ticker, kap_zamani DESC)` (ticker SEO/listeleme); GIN `(tickerlar)` (izleme array-overlap); kısmi `(created_at) WHERE durum='yeni'` (cron "özetlenmemişleri bul"); `(kap_zamani DESC)` (genel akış).
- `updated_at` trigger var (`set_updated_at`).

**`kap_bildirim_gonderim`** (e-posta idempotency junction):
- `(bildirim_id UUID FK kap_bildirimleri ON DELETE CASCADE, user_id UUID FK auth.users ON DELETE CASCADE, gonderildi_at)`, **UNIQUE (bildirim_id, user_id)**. Cron `ON CONFLICT DO NOTHING` → aynı çifte ikinci e-posta yok. Ana tablodaki `durum` per-bildirim özet aşamasını; bu tablo per-user gönderimi izler.
- Index: `(user_id, gonderildi_at DESC)` (kullanıcının gönderim geçmişi).

**`kap_cursor`** (artımlı polling cursor'u):
- Tek satır: `id INT PK DEFAULT 1 CHECK(id=1)`, `son_index BIGINT DEFAULT 0`, `updated_at`. `INSERT ... ON CONFLICT (id) DO NOTHING` ile seed edilir. **Neden ayrı tablo, `rate_limits` key-value değil:** BIGINT tip güvenliği + okunabilirlik. **Neden MAX(disclosure_index) değil:** cron ODA-dışı bildirimleri görür ama yazmayabilir; MAX yalnız yazılanları bilir → cursor "görülen en yüksek index"i tutar, aralık tekrar taranmaz.

**RLS kararları:**
- Yazma: üç tabloda da policy YOK → yalnız service role (cron).
- `kap_bildirimleri`: anon+authenticated SELECT serbest (kamuya açık KAP + SEO). Operasyonel kolonlar kişisel veri değil.
- `kap_bildirim_gonderim`: `auth.uid() = user_id` (kendi gönderim geçmişi).
- `kap_cursor`: RLS açık, policy yok (rate_limits deseni).

**Rollback:** `DROP TABLE kap_bildirim_gonderim` (önce, FK child) → `kap_bildirimleri` → `kap_cursor`. Yeni tablolar; mevcut şemaya dokunulmadı, veri kaybı riski yok. `set_updated_at()` paylaşımlı, DROP edilmez.

## karne_gonderim tablosu (2026-07-05 eklendi)
Amaç: Portföy Haftalık Karnesi e-postası idempotency. Cron `app/api/cron/haftalik-karne` (Pazar akşamı) her kullanıcıya haftada EN FAZLA BİR karne maili atar; GitHub Actions birden çok tetikleyebilir. `kap_bildirim_gonderim` insert-then-check deseniyle birebir tutarlı.

- `public.karne_gonderim (id UUID PK, user_id UUID FK auth.users ON DELETE CASCADE, hafta_baslangic DATE, created_at)`, **UNIQUE (user_id, hafta_baslangic)** = idempotency anahtarı. `hafta_baslangic` = o haftanın Pazartesi'si (ISO hafta başı). Cron `INSERT ... ON CONFLICT (user_id, hafta_baslangic) DO NOTHING` → etkilenen satır 1 ise mail gönder, 0 ise atla.
- **RLS**: kullanıcı kendi satırını SELECT eder (`karne_gonderim_select_own`, `auth.uid() = user_id`). INSERT/UPDATE policy YOK → yazma yalnız service role (cron).
- Index: `(user_id, hafta_baslangic DESC)` (gönderim geçmişi + son gönderim lookup).
- Rollback: `DROP TABLE IF EXISTS public.karne_gonderim;` — yeni tablo, FK child yok, paylaşımlı trigger/fonksiyon yok, veri kaybı riski yok. ADR yazılmadı (küçük tablo, ana oturum karar notunda anılıyor).
- migrations.sql'de "GOREV 10" bloğu (yaklaşık satır 643-691).

## Auth pattern (referans)
- Client: `getSession()` → Bearer token. API: `getUser(token)`. Service role key asla client-side.
