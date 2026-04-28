-- Supabase SQL Editor'de calistir

-- waitlist tablosu
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can join waitlist" ON waitlist FOR INSERT WITH CHECK (true);

-- bildirimler tablosu
CREATE TABLE IF NOT EXISTS bildirimler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  baslik TEXT NOT NULL,
  aciklama TEXT DEFAULT '',
  detay TEXT DEFAULT '',
  tip TEXT DEFAULT 'bildirim',
  ikon TEXT DEFAULT '🔔',
  okundu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bildirimler ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users own bildirimler" ON bildirimler FOR ALL USING (auth.uid() = user_id);

-- alarmlar tablosuna durum kolonu
ALTER TABLE alarmlar ADD COLUMN IF NOT EXISTS durum TEXT DEFAULT 'aktif';

-- avatars storage: Dashboard > Storage > New Bucket > avatars > Public: true
-- CRON_SECRET: Vercel Dashboard > Settings > Env Vars > CRON_SECRET = (random)
-- NEXT_PUBLIC_APP_URL: https://parakonusur.com
