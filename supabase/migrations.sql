-- ParaKonusur Supabase schema
-- Supabase SQL Editor'de calistir. Dosya tekrar calistirilabilir olacak sekilde yazildi.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Kullanici profilleri
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Pro plan: chatbot günlük mesaj limitini atlatan alanlar.
-- is_pro = true ve (pro_until NULL veya gelecekte) ise kullanıcı sınırsız.
-- /api/chatbot bu kolonları okur; eksik olduklarında Pro özelliği sessizce devre dışı kalır.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_until TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx ON public.profiles (username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email, full_name, username, avatar_url)
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'username',
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
  username = COALESCE(public.profiles.username, EXCLUDED.username),
  avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.get_email_by_username(uname TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE username = LOWER(TRIM(uname))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- Erken erisim listesi
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Izleme listesi
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

ALTER TABLE public.watchlist ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.watchlist ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS watchlist_user_added_at_idx ON public.watchlist (user_id, added_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS watchlist_user_ticker_unique_idx ON public.watchlist (user_id, ticker);

-- Kaydedilen AI analizleri
CREATE TABLE IF NOT EXISTS public.analizler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  analiz TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

ALTER TABLE public.analizler ADD COLUMN IF NOT EXISTS analiz TEXT;
ALTER TABLE public.analizler ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.analizler ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS analizler_user_created_at_idx ON public.analizler (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS analizler_user_ticker_unique_idx ON public.analizler (user_id, ticker);

-- Portfoy. alis_fiyati eski ekranlar icin uyumluluk kolonudur.
CREATE TABLE IF NOT EXISTS public.portfoy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  adet NUMERIC NOT NULL CHECK (adet > 0),
  maliyet NUMERIC CHECK (maliyet > 0),
  alis_fiyati NUMERIC CHECK (alis_fiyati > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

ALTER TABLE public.portfoy ADD COLUMN IF NOT EXISTS maliyet NUMERIC;
ALTER TABLE public.portfoy ADD COLUMN IF NOT EXISTS alis_fiyati NUMERIC;
ALTER TABLE public.portfoy ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.portfoy ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE public.portfoy SET maliyet = alis_fiyati WHERE maliyet IS NULL AND alis_fiyati IS NOT NULL;
UPDATE public.portfoy SET alis_fiyati = maliyet WHERE alis_fiyati IS NULL AND maliyet IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_portfoy_fiyat()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.maliyet IS NULL AND NEW.alis_fiyati IS NOT NULL THEN
    NEW.maliyet = NEW.alis_fiyati;
  END IF;
  IF NEW.alis_fiyati IS NULL AND NEW.maliyet IS NOT NULL THEN
    NEW.alis_fiyati = NEW.maliyet;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_portfoy_fiyat_trigger ON public.portfoy;
CREATE TRIGGER sync_portfoy_fiyat_trigger
BEFORE INSERT OR UPDATE ON public.portfoy
FOR EACH ROW EXECUTE FUNCTION public.sync_portfoy_fiyat();

CREATE INDEX IF NOT EXISTS portfoy_user_created_at_idx ON public.portfoy (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS portfoy_user_ticker_unique_idx ON public.portfoy (user_id, ticker);

-- Alarm ve bildirimler
CREATE TABLE IF NOT EXISTS public.alarmlar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  tip TEXT NOT NULL,
  kosul TEXT NOT NULL,
  hedef_deger NUMERIC,
  hedef_yuzde NUMERIC,
  gosterge_tipi TEXT,
  gosterge_esik NUMERIC,
  durum TEXT NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (tip IN ('fiyat_seviye', 'fiyat_yuzde', 'yuzde_degisim', 'gosterge')),
  CHECK (kosul IN ('yukari', 'asagi')),
  CHECK (durum IN ('aktif', 'devre_disi', 'beklemede', 'tetiklendi'))
);

ALTER TABLE public.alarmlar ADD COLUMN IF NOT EXISTS durum TEXT NOT NULL DEFAULT 'aktif';
ALTER TABLE public.alarmlar ADD COLUMN IF NOT EXISTS hedef_deger NUMERIC;
ALTER TABLE public.alarmlar ADD COLUMN IF NOT EXISTS hedef_yuzde NUMERIC;
ALTER TABLE public.alarmlar ADD COLUMN IF NOT EXISTS gosterge_tipi TEXT;
ALTER TABLE public.alarmlar ADD COLUMN IF NOT EXISTS gosterge_esik NUMERIC;
ALTER TABLE public.alarmlar ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.alarmlar ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS alarmlar_user_created_at_idx ON public.alarmlar (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS alarmlar_aktif_ticker_idx ON public.alarmlar (ticker) WHERE durum = 'aktif';

CREATE TABLE IF NOT EXISTS public.bildirimler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baslik TEXT NOT NULL,
  aciklama TEXT DEFAULT '',
  detay TEXT DEFAULT '',
  tip TEXT DEFAULT 'bildirim',
  ikon TEXT DEFAULT '🔔',
  okundu BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bildirimler ADD COLUMN IF NOT EXISTS aciklama TEXT DEFAULT '';
ALTER TABLE public.bildirimler ADD COLUMN IF NOT EXISTS detay TEXT DEFAULT '';
ALTER TABLE public.bildirimler ADD COLUMN IF NOT EXISTS tip TEXT DEFAULT 'bildirim';
ALTER TABLE public.bildirimler ADD COLUMN IF NOT EXISTS ikon TEXT DEFAULT '🔔';
ALTER TABLE public.bildirimler ADD COLUMN IF NOT EXISTS okundu BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.bildirimler ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS bildirimler_user_created_at_idx ON public.bildirimler (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bildirimler_user_okundu_idx ON public.bildirimler (user_id, okundu);

-- Risk profil anketi
CREATE TABLE IF NOT EXISTS public.risk_profil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vade TEXT NOT NULL,
  risk_toleransi TEXT NOT NULL,
  sermaye TEXT NOT NULL,
  sektor TEXT NOT NULL,
  deneyim TEXT NOT NULL,
  ai_oneri TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.risk_profil ADD COLUMN IF NOT EXISTS ai_oneri TEXT;
ALTER TABLE public.risk_profil ALTER COLUMN ai_oneri TYPE TEXT USING ai_oneri::text;
ALTER TABLE public.risk_profil ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.risk_profil ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- BIST snapshot cache
CREATE TABLE IF NOT EXISTS public.hisse_snapshots (
  ticker TEXT PRIMARY KEY,
  fiyat NUMERIC,
  degisim_yuzde NUMERIC,
  hacim NUMERIC,
  piyasa_degeri NUMERIC,
  getiri_1h NUMERIC,
  getiri_1a NUMERIC,
  getiri_3a NUMERIC,
  getiri_1y NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hisse_snapshots ADD COLUMN IF NOT EXISTS fiyat NUMERIC;
ALTER TABLE public.hisse_snapshots ADD COLUMN IF NOT EXISTS degisim_yuzde NUMERIC;
ALTER TABLE public.hisse_snapshots ADD COLUMN IF NOT EXISTS hacim NUMERIC;
ALTER TABLE public.hisse_snapshots ADD COLUMN IF NOT EXISTS piyasa_degeri NUMERIC;
ALTER TABLE public.hisse_snapshots ADD COLUMN IF NOT EXISTS getiri_1h NUMERIC;
ALTER TABLE public.hisse_snapshots ADD COLUMN IF NOT EXISTS getiri_1a NUMERIC;
ALTER TABLE public.hisse_snapshots ADD COLUMN IF NOT EXISTS getiri_3a NUMERIC;
ALTER TABLE public.hisse_snapshots ADD COLUMN IF NOT EXISTS getiri_1y NUMERIC;
ALTER TABLE public.hisse_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS hisse_snapshots_degisim_idx ON public.hisse_snapshots (degisim_yuzde);
CREATE INDEX IF NOT EXISTS hisse_snapshots_hacim_idx ON public.hisse_snapshots (hacim);
CREATE INDEX IF NOT EXISTS hisse_snapshots_piyasa_degeri_idx ON public.hisse_snapshots (piyasa_degeri);

-- TEFAS fon snapshot cache
CREATE TABLE IF NOT EXISTS public.fon_snapshots (
  kod TEXT PRIMARY KEY,
  unvan TEXT NOT NULL,
  kategori TEXT,
  fiyat NUMERIC,
  gunluk_getiri NUMERIC,
  getiri_1h NUMERIC,
  getiri_1a NUMERIC,
  getiri_3a NUMERIC,
  getiri_6a NUMERIC,
  getiri_1y NUMERIC,
  getiri_yb NUMERIC,
  getiri_3y NUMERIC,
  getiri_5y NUMERIC,
  risk_degeri NUMERIC,
  portfoy_buyukluk NUMERIC,
  kisi_sayisi NUMERIC,
  tedavuldeki_pay NUMERIC,
  yonetim_ucreti_yillik NUMERIC,
  toplam_gider_orani NUMERIC,
  tefas_durum BOOLEAN,
  veri_tarihi DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS kod TEXT;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS unvan TEXT;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS kategori TEXT;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS fiyat NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS gunluk_getiri NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS getiri_1h NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS getiri_1a NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS getiri_3a NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS getiri_6a NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS getiri_1y NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS getiri_yb NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS getiri_3y NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS getiri_5y NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS risk_degeri NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS portfoy_buyukluk NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS kisi_sayisi NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS tedavuldeki_pay NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS yonetim_ucreti_yillik NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS toplam_gider_orani NUMERIC;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS tefas_durum BOOLEAN;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS veri_tarihi DATE;
ALTER TABLE public.fon_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS fon_snapshots_getiri_1a_idx ON public.fon_snapshots (getiri_1a);
CREATE INDEX IF NOT EXISTS fon_snapshots_getiri_1h_idx ON public.fon_snapshots (getiri_1h);
CREATE INDEX IF NOT EXISTS fon_snapshots_getiri_1y_idx ON public.fon_snapshots (getiri_1y);
CREATE INDEX IF NOT EXISTS fon_snapshots_risk_idx ON public.fon_snapshots (risk_degeri);
CREATE INDEX IF NOT EXISTS fon_snapshots_buyukluk_idx ON public.fon_snapshots (portfoy_buyukluk);

-- updated_at triggerleri
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS analizler_updated_at ON public.analizler;
CREATE TRIGGER analizler_updated_at BEFORE UPDATE ON public.analizler
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS portfoy_updated_at ON public.portfoy;
CREATE TRIGGER portfoy_updated_at BEFORE UPDATE ON public.portfoy
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS alarmlar_updated_at ON public.alarmlar;
CREATE TRIGGER alarmlar_updated_at BEFORE UPDATE ON public.alarmlar
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS risk_profil_updated_at ON public.risk_profil;
CREATE TRIGGER risk_profil_updated_at BEFORE UPDATE ON public.risk_profil
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analizler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfoy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarmlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bildirimler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_profil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hisse_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fon_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "waitlist_insert_anyone" ON public.waitlist;
CREATE POLICY "waitlist_insert_anyone" ON public.waitlist
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "watchlist_own_all" ON public.watchlist;
CREATE POLICY "watchlist_own_all" ON public.watchlist
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "analizler_own_all" ON public.analizler;
CREATE POLICY "analizler_own_all" ON public.analizler
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "portfoy_own_all" ON public.portfoy;
CREATE POLICY "portfoy_own_all" ON public.portfoy
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "alarmlar_own_all" ON public.alarmlar;
CREATE POLICY "alarmlar_own_all" ON public.alarmlar
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bildirimler_own_all" ON public.bildirimler;
CREATE POLICY "bildirimler_own_all" ON public.bildirimler
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "risk_profil_own_all" ON public.risk_profil;
CREATE POLICY "risk_profil_own_all" ON public.risk_profil
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "hisse_snapshots_read_all" ON public.hisse_snapshots;
CREATE POLICY "hisse_snapshots_read_all" ON public.hisse_snapshots
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "fon_snapshots_read_all" ON public.fon_snapshots;
CREATE POLICY "fon_snapshots_read_all" ON public.fon_snapshots
FOR SELECT TO anon, authenticated USING (true);

-- Avatar bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "avatars_read_public" ON storage.objects;
CREATE POLICY "avatars_read_public" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND name LIKE 'avatars/' || auth.uid()::text || '.%');

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND name LIKE 'avatars/' || auth.uid()::text || '.%')
WITH CHECK (bucket_id = 'avatars' AND name LIKE 'avatars/' || auth.uid()::text || '.%');

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND name LIKE 'avatars/' || auth.uid()::text || '.%');

-- Rate limit sayaci (fixed window). Sadece service role erisir.
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS acik, policy YOK: hicbir role satir goremez/yazamaz.
-- Service role RLS'i bypass ettigi icin yalniz o erisir.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomik rate limit artirma. Tek statement upsert oldugundan yaris kosulu yok.
-- Sabit pencere: pencere basi epoch'un p_window_seconds'a bolunup taban alinmasiyla bulunur.
-- Ayni pencere -> count+1, yeni pencere -> count=1 ve window_start guncellenir.
-- Donus: count <= p_max ise TRUE (izin var), degilse FALSE (limit asildi).
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key TEXT, p_window_seconds INT, p_max INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.rate_limits (key, window_start, count, updated_at)
  VALUES (p_key, v_window_start, 1, NOW())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN public.rate_limits.window_start = v_window_start THEN public.rate_limits.count + 1
      ELSE 1
    END,
    window_start = v_window_start,
    updated_at = NOW()
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

-- Yalniz service role cagirir; anon/authenticated erisimini kaldir.
REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) FROM anon, authenticated;

-- Eski pencere satirlarini temizler. Simdilik manuel; ileride cron'dan cagrilabilir.
CREATE OR REPLACE FUNCTION public.rate_limits_temizle()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE updated_at < NOW() - INTERVAL '2 days';
$$;

-- Chatbot gunluk mesaj sayaci. Production'da mevcut; burada geriye uyumlu tanimlanir.
-- /api/chatbot (user_id, gun) bazli okur; service role insert/update eder.
CREATE TABLE IF NOT EXISTS public.chatbot_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gun DATE NOT NULL,
  mesaj_sayisi INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, gun)
);

ALTER TABLE public.chatbot_usage ADD COLUMN IF NOT EXISTS mesaj_sayisi INT NOT NULL DEFAULT 0;
ALTER TABLE public.chatbot_usage ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.chatbot_usage ENABLE ROW LEVEL SECURITY;

-- Kullanici yalniz kendi satirini okur. INSERT/UPDATE policy YOK: yazma yalniz service role.
DROP POLICY IF EXISTS "chatbot_usage_select_own" ON public.chatbot_usage;
CREATE POLICY "chatbot_usage_select_own" ON public.chatbot_usage
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- RLS audit (Temmuz 2026): profiles_select_authenticated policy'si tum satirlari aciyor
-- (username musaitlik kontrolu icin gerekli) ama email kolonu herkese gorunmemeli.
-- RLS satir bazlidir; kolon kisiti icin column-level GRANT kullanilir (ikisi birlikte uygulanir).
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, username, full_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;

-- ============================================================================
-- KAP Tercumani (2026-07-04 eklendi)
-- Akis: cron KAP API'den yeni bildirimleri ceker (disclosureIndex artimli) ->
--   kap_bildirimleri'ne yazar -> Claude ile 3 katmanli ozet BIR KEZ uretilip
--   cache'lenir -> izleme listesinde ilgili ticker olan kullanicilara e-posta
--   gider -> ayni icerik SEO sayfalarinda herkese acik gosterilir.
-- Yazma yalniz service role (cron); okuma anon/authenticated SELECT (kamuya acik
--   KAP verisi + SEO). E-posta gonderim durumu ayri junction tablosunda tutulur.
-- ============================================================================

-- Ana tablo: bir satir = bir KAP bildirimi + cache'lenmis AI ozet katmanlari.
CREATE TABLE IF NOT EXISTS public.kap_bildirimleri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- KAP disclosureIndex: dogal unique anahtar, ayni zamanda cache anahtari.
  -- BIGINT cunku KAP index'i monoton artan buyuk tamsayidir.
  disclosure_index BIGINT NOT NULL,
  -- Birincil ticker (senderExchCodes[0]). Cross-endeks bildirimlerde ilk kod.
  ticker TEXT,
  -- Coklu durum: KAP senderExchCodes birden cok kod donebilir ( or. holding + istirak).
  -- Ticker bazli listelemede array-overlap sorgusu icin dizi olarak da saklanir.
  tickerlar TEXT[] NOT NULL DEFAULT '{}',
  -- Siniflandirma. Genisleyebilir olsun diye TEXT + CHECK; yeni tip eklemek
  -- CHECK'i CREATE OR REPLACE degil ALTER ile guncellemeyi gerektirir (asagida idempotent yonetiliyor).
  bildirim_tipi TEXT NOT NULL DEFAULT 'diger',
  -- KAP disclosureType ham degeri (ODA, FR, DG, ...). Siniflandirma girdisi + denetim izi.
  kap_tipi TEXT,
  baslik TEXT,
  konu TEXT,
  -- KAP bildirim zamani (disclosure.time parse edilmis UTC).
  kap_zamani TIMESTAMPTZ,
  kap_link TEXT,
  -- Ham KAP disclosureDetail JSON'u. Yeniden ozet uretimi/denetim icin kaynak-of-truth.
  ham_detay JSONB,
  -- AI ozet katmanlari (BIR KEZ uretilir, burada cache'lenir).
  ozet_tek_cumle TEXT,     -- (1) tek cumle ozet
  ozet_ne_demek TEXT,      -- (2) "bu ne demek" sade aciklama
  -- 3. katman (portfoy/izleme baglami) kullaniciya gore gonderim aninda sablonla
  -- kurulur, Claude'a gitmez, burada saklanmaz.
  ozet_uretim_zamani TIMESTAMPTZ,
  -- Islenme durumu: yeni -> ozetlendi -> bildirildi (terminal; per-user detay
  -- kap_bildirim_gonderim'de). 'bildirildi' olmadan gonderim kuyrugu tikanir:
  -- limit'li sorgu hep ayni eski satirlari doner. 'hata' = ozet uretimi kalici
  -- basarisiz; cron atlar, manuel mudahale.
  durum TEXT NOT NULL DEFAULT 'yeni',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (disclosure_index),
  CONSTRAINT kap_bildirimleri_durum_check CHECK (durum IN ('yeni', 'ozetlendi', 'bildirildi', 'hata'))
);

-- Geriye uyumlu kolon eklemeleri (tablo elle onceden olusturulmus olabilir).
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS ticker TEXT;
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS tickerlar TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS bildirim_tipi TEXT NOT NULL DEFAULT 'diger';
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS kap_tipi TEXT;
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS baslik TEXT;
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS konu TEXT;
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS kap_zamani TIMESTAMPTZ;
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS kap_link TEXT;
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS ham_detay JSONB;
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS ozet_tek_cumle TEXT;
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS ozet_ne_demek TEXT;
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS ozet_uretim_zamani TIMESTAMPTZ;
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS durum TEXT NOT NULL DEFAULT 'yeni';
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.kap_bildirimleri ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- bildirim_tipi allowlist. Genisleyebilir: yeni tip icin bu bloku guncelle, dosyayi
-- tekrar calistir. DROP + ADD ile idempotent (ayni isimli constraint yeniden kurulur).
ALTER TABLE public.kap_bildirimleri DROP CONSTRAINT IF EXISTS kap_bildirimleri_tip_check;
ALTER TABLE public.kap_bildirimleri ADD CONSTRAINT kap_bildirimleri_tip_check
  CHECK (bildirim_tipi IN (
    'ozel_durum',
    'finansal_rapor',
    'pay_geri_alim',
    'sermaye_artirimi',
    'temettu',
    'genel_kurul',
    'diger'
  ));

-- durum allowlist. Tablo onceden olusturulmussa da ayni isimli constraint
-- yeniden kurulur (inline CHECK ile ayni ad: kap_bildirimleri_durum_check).
ALTER TABLE public.kap_bildirimleri DROP CONSTRAINT IF EXISTS kap_bildirimleri_durum_check;
ALTER TABLE public.kap_bildirimleri ADD CONSTRAINT kap_bildirimleri_durum_check
  CHECK (durum IN ('yeni', 'ozetlendi', 'bildirildi', 'hata'));

-- Index'ler.
-- (a) SEO sayfasi tekil cekim: disclosure_index UNIQUE zaten b-tree index sagliyor;
--     ayrica id PK var. Ek index gerekmez.
-- (b) Ticker bazli listeleme (SEO ticker sayfasi + izleme eslesmesi): birincil
--     ticker uzerinden en yeni bildirimler.
CREATE INDEX IF NOT EXISTS kap_bildirimleri_ticker_zaman_idx
  ON public.kap_bildirimleri (ticker, kap_zamani DESC);
-- (c) Coklu-ticker eslesme (senderExchCodes overlap): izleme listesindeki ticker
--     seti ile array-overlap (&&) sorgusu icin GIN.
CREATE INDEX IF NOT EXISTS kap_bildirimleri_tickerlar_gin_idx
  ON public.kap_bildirimleri USING GIN (tickerlar);
-- (d) Cron "ozetlenmemis bildirimleri bul": durum='yeni' kismi index (kucuk, sicak).
CREATE INDEX IF NOT EXISTS kap_bildirimleri_yeni_idx
  ON public.kap_bildirimleri (created_at) WHERE durum = 'yeni';
-- (e) Genel akis / SEO ana liste: en yeni bildirimler.
CREATE INDEX IF NOT EXISTS kap_bildirimleri_zaman_idx
  ON public.kap_bildirimleri (kap_zamani DESC);

DROP TRIGGER IF EXISTS kap_bildirimleri_updated_at ON public.kap_bildirimleri;
CREATE TRIGGER kap_bildirimleri_updated_at BEFORE UPDATE ON public.kap_bildirimleri
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- E-posta gonderim idempotency: bir bildirim N kullaniciya gider, her (bildirim, user)
-- cifti bir kez gonderilmeli. Bu junction tablosu "gonderildi mi" gercegini tutar.
-- Ana tablodaki 'durum' per-bildirim ozet asamasini; bu tablo per-user gonderimi izler.
CREATE TABLE IF NOT EXISTS public.kap_bildirim_gonderim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bildirim_id UUID NOT NULL REFERENCES public.kap_bildirimleri(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gonderildi_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Insert-once idempotency anahtari: ayni cift ikinci kez INSERT edilirse
  -- ON CONFLICT DO NOTHING ile sessizce atlanir -> mukerrer e-posta gonderilmez.
  UNIQUE (bildirim_id, user_id)
);

ALTER TABLE public.kap_bildirim_gonderim ADD COLUMN IF NOT EXISTS gonderildi_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Kullaniciya "hangi KAP bildirimleri e-posta olarak geldi" gecmisi icin.
CREATE INDEX IF NOT EXISTS kap_bildirim_gonderim_user_idx
  ON public.kap_bildirim_gonderim (user_id, gonderildi_at DESC);

-- Cursor: son islenen disclosureIndex. rate_limits key-value deseni yerine
-- tek-satirlik tip-guvenli tablo (BIGINT). Neden ana tablodan MAX(disclosure_index)
-- degil: cron ODA disi bildirimleri de "gordu" ama tabloya yazmayabilir; cursor
-- gorulen en yuksek index'i tutar ki bir daha ayni araligi taramayalim.
-- id sabit 1 (tek satir); CHECK ile tekil satir garanti.
CREATE TABLE IF NOT EXISTS public.kap_cursor (
  id INT PRIMARY KEY DEFAULT 1,
  son_index BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

ALTER TABLE public.kap_cursor ADD COLUMN IF NOT EXISTS son_index BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.kap_cursor ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Tek satiri garantiye al (idempotent seed).
INSERT INTO public.kap_cursor (id, son_index) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS kap_cursor_updated_at ON public.kap_cursor;
CREATE TRIGGER kap_cursor_updated_at BEFORE UPDATE ON public.kap_cursor
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.kap_bildirimleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kap_bildirim_gonderim ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kap_cursor ENABLE ROW LEVEL SECURITY;

-- kap_bildirimleri: icerik kamuya acik (SEO). Anon/authenticated SELECT serbest.
-- Yazma policy YOK -> INSERT/UPDATE yalniz service role (cron).
-- Not: operasyonel kolon (durum, ozet_uretim_zamani) sizmasi sorun degil; kisisel
-- veri degil. Kisisel gonderim bilgisi ayri kap_bildirim_gonderim tablosunda ve
-- oraya anon/authenticated erisemez.
DROP POLICY IF EXISTS "kap_bildirimleri_read_all" ON public.kap_bildirimleri;
CREATE POLICY "kap_bildirimleri_read_all" ON public.kap_bildirimleri
FOR SELECT TO anon, authenticated USING (true);

-- kap_bildirim_gonderim: kullanici yalniz kendi gonderim gecmisini okur.
-- Yazma policy YOK -> INSERT yalniz service role (cron).
DROP POLICY IF EXISTS "kap_bildirim_gonderim_select_own" ON public.kap_bildirim_gonderim;
CREATE POLICY "kap_bildirim_gonderim_select_own" ON public.kap_bildirim_gonderim
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- kap_cursor: operasyonel durum. RLS acik, policy YOK -> yalniz service role erisir
-- (rate_limits ile ayni desen).
-- (policy tanimlanmaz)

-- ============================================================================
-- GOREV 12: Portfoy Haftalik Karne e-posta idempotency (karne_gonderim)
-- ============================================================================
-- Cron (app/api/cron/haftalik-karne, Pazar aksami) her kullaniciya HAFTADA EN
-- FAZLA BIR karne e-postasi gonderir. GitHub Actions ayni tetiklemeyi birden
-- cok kez calistirabilir; bu tablo (user, hafta) ciftini insert-once ile
-- kilitler. kap_bildirim_gonderim ile ayni desen (insert-then-check).
-- Idempotency anahtari: hafta o haftanin Pazartesi'si (hafta_baslangic DATE).
-- Cron akisi: her user icin INSERT ... ON CONFLICT (user_id, hafta_baslangic)
-- DO NOTHING; etkilenen satir sayisi 1 ise mail gonder, 0 ise zaten gonderilmis
-- -> atla. Boylece ayni hafta ikinci calisma mukerrer mail atmaz.
CREATE TABLE IF NOT EXISTS public.karne_gonderim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Haftanin Pazartesi'si (gonderim penceresi anahtari). Cron ISO hafta basini
  -- hesaplayip yazar; ayni hafta icin ikinci INSERT UNIQUE'e takilir.
  hafta_baslangic DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Insert-once idempotency anahtari: ayni (user, hafta) ikinci kez INSERT
  -- edilirse ON CONFLICT DO NOTHING ile sessizce atlanir -> ikinci mail yok.
  UNIQUE (user_id, hafta_baslangic)
);

-- Tablo onceden elle olusturulmus olabilir: kolonlari geriye uyumlu ekle.
ALTER TABLE public.karne_gonderim ADD COLUMN IF NOT EXISTS hafta_baslangic DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.karne_gonderim ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Kullaniciya "hangi haftalar karne aldim" gecmisi + son gonderim lookup icin.
CREATE INDEX IF NOT EXISTS karne_gonderim_user_idx
  ON public.karne_gonderim (user_id, hafta_baslangic DESC);

-- RLS: kap_bildirim_gonderim ile ayni desen.
ALTER TABLE public.karne_gonderim ENABLE ROW LEVEL SECURITY;

-- Kullanici yalniz kendi gonderim gecmisini okur.
-- Yazma policy YOK -> INSERT yalniz service role (cron).
DROP POLICY IF EXISTS "karne_gonderim_select_own" ON public.karne_gonderim;
CREATE POLICY "karne_gonderim_select_own" ON public.karne_gonderim
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Rollback (GOREV 12):
--   DROP TABLE IF EXISTS public.karne_gonderim;
-- Yeni tablo; mevcut semaya dokunulmadi, veri kaybi riski yok. FK child'i yok,
-- paylasimli fonksiyon/trigger kullanmiyor -> tek DROP yeterli. auth.users FK
-- ON DELETE CASCADE oldugu icin kullanici silinince satirlar otomatik gider.

-- FAZ4 GOREV 18: karne_gonderim.ozet — onceki hafta karsilastirmasi (delta) icin
-- son gonderilen karnenin sayisal ozeti saklanir (riskSkor, haftalikGetiri, toplamDeger).
ALTER TABLE public.karne_gonderim ADD COLUMN IF NOT EXISTS ozet JSONB;

-- ============================================================
-- FAZ4 GOREV 20: Aksam Raporu gonderim kaydi (gunluk idempotency)
-- Her kullaniciya islem gunu basina EN FAZLA BIR aksam raporu.
-- kap_bildirim_gonderim / karne_gonderim insert-then-check deseniyle ayni.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aksam_raporu_gonderim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gun DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT aksam_raporu_gonderim_unique UNIQUE (user_id, gun)
);

ALTER TABLE public.aksam_raporu_gonderim ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aksam_raporu_select_own ON public.aksam_raporu_gonderim;
CREATE POLICY aksam_raporu_select_own ON public.aksam_raporu_gonderim
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS aksam_raporu_gonderim_user_gun_idx
  ON public.aksam_raporu_gonderim (user_id, gun DESC);

-- FAZ4 GOREV 21 (C.4 hazirlik): portfoy.tur — hisse/fon pozisyon ayrimi.
-- UI ve karne fon satiri sonraki oturumda; kolon geriye uyumlu (default hisse).
ALTER TABLE public.portfoy ADD COLUMN IF NOT EXISTS tur TEXT NOT NULL DEFAULT 'hisse';
ALTER TABLE public.portfoy DROP CONSTRAINT IF EXISTS portfoy_tur_check;
ALTER TABLE public.portfoy ADD CONSTRAINT portfoy_tur_check CHECK (tur IN ('hisse', 'fon'));

-- ============================================================
-- MADEN v1: maden_snapshots — kiymetli maden fiyat cache'i
-- Kaynak: Yahoo futures (USD/ons) + USDTRY ile gram TL turetme.
-- hisse_snapshots deseni: herkes SELECT, yazma yalniz service role (cron).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maden_snapshots (
  kod TEXT PRIMARY KEY,
  ad TEXT NOT NULL,
  birim TEXT NOT NULL,
  para_birimi TEXT NOT NULL,
  fiyat NUMERIC,
  degisim_yuzde NUMERIC,
  gunluk_yuksek NUMERIC,
  gunluk_dusuk NUMERIC,
  getiri_1h NUMERIC,
  getiri_1a NUMERIC,
  getiri_3a NUMERIC,
  getiri_1y NUMERIC,
  kaynak TEXT,
  usdtry_kur NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.maden_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS maden_snapshots_select_all ON public.maden_snapshots;
CREATE POLICY maden_snapshots_select_all ON public.maden_snapshots
  FOR SELECT TO anon, authenticated USING (true);

-- portfoy.tur uc varlik sinifina genisler (fon UI'si ve maden UI'si ayri iste baglanacak)
ALTER TABLE public.portfoy DROP CONSTRAINT IF EXISTS portfoy_tur_check;
ALTER TABLE public.portfoy ADD CONSTRAINT portfoy_tur_check CHECK (tur IN ('hisse', 'fon', 'maden'));

-- ============================================================
-- DOVIZ+MADEN v1 (17 Tem 2026): enstruman_snapshots — doviz + kiymetli maden ORTAK fiyat cache'i.
-- maden_snapshots'in halefi: cron artik buraya yazar, maden_snapshots deprecate (DROP ileride, FAZ 8 borcu).
-- hisse_snapshots deseni: herkes SELECT, yazma yalniz service role (cron).
-- KAP/disclosure alanlari bilerek YOK (hisseden fark).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enstruman_snapshots (
  kod TEXT PRIMARY KEY,
  tur TEXT NOT NULL CHECK (tur IN ('doviz', 'maden')),
  ad TEXT NOT NULL,
  birim TEXT,
  para_birimi TEXT NOT NULL,
  fiyat NUMERIC,
  degisim_yuzde NUMERIC,
  gunluk_yuksek NUMERIC,
  gunluk_dusuk NUMERIC,
  getiri_1h NUMERIC,
  getiri_1a NUMERIC,
  getiri_3a NUMERIC,
  getiri_6a NUMERIC,
  getiri_1y NUMERIC,
  getiri_5y NUMERIC,
  kaynak TEXT,
  usdtry_kur NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabloyu onceki surumle olusturmus ortamlar icin (idempotent)
ALTER TABLE public.enstruman_snapshots ADD COLUMN IF NOT EXISTS getiri_5y NUMERIC;

ALTER TABLE public.enstruman_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enstruman_snapshots_select_all ON public.enstruman_snapshots;
CREATE POLICY enstruman_snapshots_select_all ON public.enstruman_snapshots
  FOR SELECT TO anon, authenticated USING (true);

-- Gunluk kapanis arsivi: getiri hesaplarinin saglayici-bagimsiz yedegi.
-- Cron her kosuda bugunun satirini upsert eder, 400 gunden eskiyi siler.
-- Okuma-yazma yalniz service role (cron ici fallback hesabi) — policy bilerek yok.
CREATE TABLE IF NOT EXISTS public.enstruman_fiyat_gecmisi (
  kod TEXT NOT NULL,
  tarih DATE NOT NULL,
  fiyat NUMERIC NOT NULL,
  PRIMARY KEY (kod, tarih)
);

ALTER TABLE public.enstruman_fiyat_gecmisi ENABLE ROW LEVEL SECURITY;

-- AI analiz server-side cache: ayni enstruman icin 15 dk icinde tek Sonnet cagrisi
-- (kullanicilar arasi paylasimli). Okuma-yazma yalniz service role — policy bilerek yok.
CREATE TABLE IF NOT EXISTS public.enstruman_analiz_cache (
  kod TEXT PRIMARY KEY,
  analiz TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.enstruman_analiz_cache ENABLE ROW LEVEL SECURITY;

-- Alarm varlik ayrimi: ticker kolonu doviz/maden icin enstruman kodu tasir (usd-try, gram-altin).
-- Isim portfoy.tur ile ayni tutuldu (ayni deger kumesi); alarmlar.tip alarm CESIDIDIR, karistirma.
ALTER TABLE public.alarmlar ADD COLUMN IF NOT EXISTS tur TEXT NOT NULL DEFAULT 'hisse';
ALTER TABLE public.alarmlar DROP CONSTRAINT IF EXISTS alarmlar_tur_check;
ALTER TABLE public.alarmlar ADD CONSTRAINT alarmlar_tur_check CHECK (tur IN ('hisse', 'doviz', 'maden'));

-- Portfoy doviz pozisyonlarina acilir (FAZ 7.5)
ALTER TABLE public.portfoy DROP CONSTRAINT IF EXISTS portfoy_tur_check;
ALTER TABLE public.portfoy ADD CONSTRAINT portfoy_tur_check CHECK (tur IN ('hisse', 'fon', 'maden', 'doviz'));

-- ============================================================
-- BILANCO v1 (19 Tem 2026): bilanco_snapshots — hisse temel/finansal tablo cache'i.
-- Kaynak: TradingView Scanner (scanner.tradingview.com/turkey/scan, lisanssiz).
-- Son ceyrek TAM bilanco (scalar) + 4-ceyrek trend (ceyrek_seri JSONB, yalniz _fq_h olan kalemler).
-- hisse_snapshots deseni: herkes SELECT, yazma yalniz service role (cron).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bilanco_snapshots (
  ticker TEXT PRIMARY KEY,
  -- Son ceyrek TAM kalemler (scalar; TradingView _fq)
  donen_varlik NUMERIC,
  duran_varlik NUMERIC,
  toplam_varlik NUMERIC,
  kv_yukumluluk NUMERIC,        -- kisa vadeli yukumlulukler
  uv_yukumluluk NUMERIC,        -- uzun vadeli yukumlulukler
  toplam_yukumluluk NUMERIC,
  ozkaynak NUMERIC,
  hasilat NUMERIC,              -- ttm
  brut_kar NUMERIC,             -- ttm
  faaliyet_kari NUMERIC,        -- ttm
  favok NUMERIC,                -- ttm (ebitda)
  net_kar NUMERIC,              -- ttm
  -- Rasyolar (TradingView'dan hazir, son)
  fk NUMERIC,                   -- fiyat/kazanc (price_earnings_ttm)
  pddd NUMERIC,                 -- piyasa deg/defter deg (price_book_ratio)
  roe NUMERIC,                  -- ozkaynak karliligi
  roa NUMERIC,                  -- aktif karliligi
  borc_ozkaynak NUMERIC,        -- debt_to_equity
  hbk NUMERIC,                  -- hisse basi kar (eps ttm)
  -- 4-ceyrek trend: { donem:[...], toplam_varlik:[...], hasilat:[...], brut_kar:[...], net_kar:[...], favok:[...], toplam_borc:[...] }
  -- en yeni once; yalniz TradingView _fq_h array'i olan kalemler.
  ceyrek_seri JSONB,
  son_bildirim_tarihi DATE,     -- en son finansal raporun aciklanma tarihi (best-effort)
  kaynak TEXT DEFAULT 'tradingview',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bilanco_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bilanco_snapshots_select_all ON public.bilanco_snapshots;
CREATE POLICY bilanco_snapshots_select_all ON public.bilanco_snapshots
  FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- IZLEME COK-VARLIK (20 Tem 2026): watchlist artik hisse + fon + doviz + maden.
-- tur kolonu + (user_id, ticker, tur) essiz -> ayni kod farkli varlik sinifinda cakismaz.
-- ============================================================
ALTER TABLE public.watchlist ADD COLUMN IF NOT EXISTS tur TEXT NOT NULL DEFAULT 'hisse';
ALTER TABLE public.watchlist DROP CONSTRAINT IF EXISTS watchlist_tur_check;
ALTER TABLE public.watchlist ADD CONSTRAINT watchlist_tur_check CHECK (tur IN ('hisse', 'fon', 'doviz', 'maden'));
-- Eski essiz (user_id, ticker) -> (user_id, ticker, tur)
DROP INDEX IF EXISTS watchlist_user_ticker_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS watchlist_user_ticker_tur_unique_idx ON public.watchlist (user_id, ticker, tur);

-- ============================================================
-- HALKA ARZ TAKVIMI v1 (24 Tem 2026): halka_arzlar — IPO yasam dongusu.
-- Kaynak mimarisi (K-HA1, bkz. docs-vault hisse-denetim-halka-arz-takvimi-log):
--   tespit+evre = KAP bildirim akisi; yapisal alanlar = araci kurum duyuru sayfasi
--   (+ halkaarz.info JSON-LD capraz); islem sinyali = Yahoo fiyat / sync-bist-companies.
-- Lifecycle: talep_toplaniyor -> arz_tamamlandi -> islem_goruyor (FAZ 6 cron'u yonetir).
-- islem_goruyor'a gecince hisse evrenine aktarilir ve takvimde "gecmis" sekmesine duser.
-- hisse_snapshots deseni: herkes SELECT, yazma yalniz service role (cron).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.halka_arzlar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kimlik
  kod TEXT NOT NULL,                    -- BIST kodu (KARCL); talep asamasinda kaynaklardan gelir
  sirket_adi TEXT NOT NULL,
  logo_url TEXT,
  -- Yasam dongusu
  durum TEXT NOT NULL DEFAULT 'talep_toplaniyor',
  -- Arz penceresi
  talep_baslangic DATE,
  talep_bitis DATE,
  islem_tarihi DATE,                    -- borsada ilk islem gunu (islem_goruyor'a gecince dolar)
  -- Yapisal alanlar (K-HA1: araci kurum sayfasindan parse)
  fiyat NUMERIC,                        -- halka arz fiyati (TL); aralikli arzda alt sinir
  fiyat_ust NUMERIC,                    -- aralikli arzda ust sinir (tek fiyatsa NULL)
  buyukluk NUMERIC,                     -- halka arz buyuklugu (TL)
  pay_miktari NUMERIC,                  -- toplam pay adedi
  dagitim_yontemi TEXT,                 -- esit / oransal / karma
  pazar TEXT,                           -- Yildiz Pazar / Ana Pazar / Alt Pazar
  arz_sekli TEXT,                       -- sermaye artirimi / ortak satisi / karma
  iskonto_orani NUMERIC,                -- % halka arz iskontosu
  halka_aciklik_orani NUMERIC,          -- % arz sonrasi halka aciklik
  araci_kurumlar TEXT[] NOT NULL DEFAULT '{}',  -- konsorsiyum (lider once)
  -- Izahname-derin alanlar (v1 manuel/nullable; UI "—" gosterir — bkz. log alan matrisi)
  fon_kullanim_yeri TEXT,
  tahsisat_gruplari JSONB,              -- [{grup, oran}] serbest yapi
  dagitim_tahminleri JSONB,             -- katilim buyuklugune gore olasi pay tahmini
  finansal_ozet JSONB,                  -- son 3 donem {donem, hasilat, brut_kar}
  fiyat_istikrari TEXT,                 -- fiyat istikrari islemi taahhudu
  satmama_taahhudu TEXT,                -- lock-up
  basvuru_yerleri TEXT,
  sirket_aciklama TEXT,                 -- kisa sirket tanitimi
  -- Kaynak izi (guven sinyali + debug)
  kaynak TEXT,                          -- ilk tespit kaynagi (kap / araci / manuel)
  kap_disclosure_index BIGINT,          -- tetikleyen KAP bildirimi (varsa)
  kaynak_linkleri JSONB,                -- {izahname, fiyat_tespit, araci_sayfa, kap} URL'leri
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.halka_arzlar DROP CONSTRAINT IF EXISTS halka_arzlar_durum_check;
ALTER TABLE public.halka_arzlar ADD CONSTRAINT halka_arzlar_durum_check
  CHECK (durum IN ('talep_toplaniyor', 'arz_tamamlandi', 'islem_goruyor'));

-- Ayni kod bir kez (ayni sirketin tek aktif arzi olur); ON CONFLICT (kod) upsert anahtari.
CREATE UNIQUE INDEX IF NOT EXISTS halka_arzlar_kod_unique_idx ON public.halka_arzlar (kod);
-- Takvim listesi: aktifler once, tarihe gore.
CREATE INDEX IF NOT EXISTS halka_arzlar_durum_tarih_idx ON public.halka_arzlar (durum, talep_baslangic DESC);

ALTER TABLE public.halka_arzlar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS halka_arzlar_select_all ON public.halka_arzlar;
CREATE POLICY halka_arzlar_select_all ON public.halka_arzlar
  FOR SELECT TO anon, authenticated USING (true);
-- Yazma policy'si yok: yalniz service role (cron + admin) yazar.
