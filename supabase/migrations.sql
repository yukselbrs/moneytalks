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
