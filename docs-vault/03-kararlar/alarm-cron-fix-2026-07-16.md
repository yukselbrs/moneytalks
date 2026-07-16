# Alarm Cron Teşhis + Fix — 16 Temmuz 2026

**Durum:** Kod fix uygulandı; 1 manuel adım Barış'ta. Dondurma ([[faz4-alarm-cron-donduruldu]]) kullanıcı talebiyle kalktı.

## Teşhis (iki ayrı sorun)

### Sorun 1 — FLEET GENELİ: GitHub Actions secret uyuşmazlığı (asıl büyük neden)
- `hisse_snapshots` son güncelleme **81 dk önce** (cron */5 olmasına rağmen) → GitHub scheduled cron'ları **hiç yazmıyor**.
- Production: eski secret `parakonusur2026` → **401**, `.env.local`'deki yeni değer → **200**. Yani Vercel yeniye rotate edilmiş ama **GitHub repo secret'ı hâlâ eski** → her zamanlanmış cron 401 → alarm dahil hiçbiri çalışmıyor.
- **`.env.local` satır 12 yorumu ("ROTASYON BEKLIYOR ... production eski değeri kullanır") YANLIŞ/BAYAT** — prod aslında yeniyi kullanıyor.

### Sorun 2 — ALARMA ÖZEL: kod bug'ı
- `alarm-cron.yml` route'u `.select("*, profiles(email)")` embed'i kullanıyordu → **PGRST200**: prod'da `alarmlar`→`profiles` FK yok (`user_id` muhtemelen `auth.users`'a bağlı). → sorgu patlıyor, `{"checked":0,"hata":1}` dönüyor, aktif alarm hiç işlenmiyor.

## Fix (bu commit)
`app/api/cron/alarmlar/route.ts`: embedded join kaldırıldı → alarmlar `.select("*")` ile çekiliyor, e-postalar ayrı `profiles.select("id,email").in(...)` sorgusuyla `emailMap`'e alınıyor (karne/aksam-raporu cron'larıyla birebir aynı desen; service role email okuyabiliyor). Kuru test: 1 aktif alarm + email doğru eşleşti; tsc temiz.

## Barış'ın yapması gereken (Sorun 1 — fix'ten bağımsız, daha kritik)
**GitHub → repo Settings → Secrets and variables → Actions → `CRON_SECRET`'ı Vercel'deki (yeni) değerle güncelle.** Terminalden oku: `grep '^CRON_SECRET=' .env.local`. Bu tek secret 6 workflow'u da kapsıyor (alarm, hisse-snapshot, kap, karne, fon, aksam-raporu) — güncellenene kadar HİÇBİRİ çalışmaz. Sonra `.env.local` satır 12'deki bayat "ROTASYON BEKLIYOR" yorumunu sil.

## Doğrulama planı
Deploy sonrası: endpoint `checked:1, hata:0` dönmeli (artık hata:1 değil). GitHub secret düzeldikten sonra Actions'ta 6 workflow yeşil + `hisse_snapshots.updated_at` < 5 dk olmalı.
