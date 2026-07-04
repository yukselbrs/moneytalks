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

## Auth pattern (referans)
- Client: `getSession()` → Bearer token. API: `getUser(token)`. Service role key asla client-side.
