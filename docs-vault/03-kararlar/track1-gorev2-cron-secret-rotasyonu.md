# Track 1 / Görev 2 — CRON_SECRET Rotasyonu

**Tarih:** 4 Temmuz 2026 (onay: 6 Temmuz 2026) · **Branch:** `fable-track1` · **Durum:** Onaylandı — kod/dok tarafı tamamlandı; Vercel + GitHub secret güncellemesi Barış'ta (manuel)

## Yapılanlar (local)
1. Yeni secret üretildi (`openssl rand -hex 24`, `pk_cron_` prefix'li) ve `.env.local`'e yazıldı. Eski değer rollback için `.env.local` içindeki yorum satırında duruyor (dosya gitignore'da, repoya girmez).
2. Eski secret tüm vault dokümanlarından `[REDACTED]` yapıldı (handoff v9 ×3, fark analizi ×1, analiz raporu ×1).
3. `.gitignore`'daki mükerrer `docs-vault/.obsidian/` satırı tekilleştirildi.
4. **Olay kaydı:** Görev 1'in ilk commit'i secret'ı redakte edilmeden içeriyordu; push edilmeden fark edildi, `git reset --soft` + redaksiyon + yeniden commit ile local geçmişten tamamen çıkarıldı (`b1cef61`). Push edilmiş geçmişte secret YOK (zaten hiç olmamıştı).

## Production geçiş runbook'u (Barış — sıra önemli)
Yeni değeri chat'e/dokümana yazma. Terminalden oku: `grep '^CRON_SECRET=' .env.local` → çıkan değeri kopyala.

1. **Vercel** → Project Settings → Environment Variables → `CRON_SECRET` değerini yeni değerle değiştir (Sensitive işaretli kalsın). Env değişikliği deploy ile etkinleşir → değişiklikten sonra bir redeploy tetikle (Deployments → son deploy → Redeploy). Sonra Cloudflare "Purge Everything".
2. **GitHub** → repo Settings → Secrets and variables → Actions → `CRON_SECRET` güncelle. **Tek repo secret'ı 4 workflow'u da kapsar:** `hisse-snapshot-cron.yml`, `alarm-cron.yml`, `kap-bildirimleri-cron.yml`, `haftalik-karne-cron.yml` (hepsi `secrets.CRON_SECRET` okuyor).
3. Doğrulama: `curl -s -o /dev/null -w "%{http_code}" https://www.parakonusur.com/api/cron/hisse-snapshot -H "Authorization: Bearer <YENİ>"` → 200; eski değerle → 401.
4. `.env.local`'deki `# ROTASYON BEKLIYOR` yorumunu ve eski-değer rollback satırını, doğrulama geçtikten sonra sil.
5. Not: 1-2 arasındaki pencerede GitHub cron'ları eski secret'la 401 alabilir (maks. 15 dk, zararsız — bir sonraki tetiklemede düzelir).

Yeni değer bu dokümana bilinçli olarak YAZILMADI — yalnız `.env.local`'de.

## Commit durumu
- `.gitignore` tekilleştirmesi GÖREV 13 commit'iyle (`da059e8`) birlikte gitti; mükerrer `docs-vault/.obsidian/` satırı yok (doğrulandı).
- Bu karar notu onay sonrası commit'lendi. Kod tarafında rotasyona engel yok; kalan tek iş yukarıdaki Vercel + GitHub adımları (repoya girmeyen secret değerleri).
