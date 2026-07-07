# ParaKonuşur.com — Project Handoff v10

**Tarih:** 6 Temmuz 2026
**Önceki handoff:** v9 (4 Mayıs 2026)
**Branch:** `fable-track1` → `main`'e fast-forward merge edildi ve production'a deploy edildi
**Durum:** Track 1 (13 görev) tamamlandı ve canlıda. Kalan tek manuel iş: CRON_SECRET rotasyonunun Vercel/GitHub ayağı.

---

## Hızlı Özet (TL;DR)

v9'dan bu yana kod ~2 ay donmuştu. Bu oturumda önce bir **Faz 1 analizi** ([[2026-07-analiz-raporu]] + [[brainstorm-2026-07]]) yapıldı, ardından **Track 1** adıyla 13 görevlik bir uygulama turu tamamlandı: temel sağlamlaştırma (rate limit, RLS, cron, RSI, secret), ürün kimliği özellikleri (KAP Tercümanı, programatik SEO, "neden düştü/çıktı" kartı, portföy haftalık karnesi) ve premium frontend geçişi. Hepsi `main`'e merge edilip production'a deploy edildi (`e0c7bcd..69f5e21`). Supabase migration'ları SQL Editor'de koşuldu; KAP cron'u canlıda JSON dönüyor.

Stratejik bağlam: [[parakonusur_strateji_raporu]] "borsayı sana anlatan platform" konumunu tanımlamıştı; Track 1 bu konumun omurgasını (olay-tetiklemeli AI anlatım katmanı = KAP Tercümanı) hayata geçirdi.

---

## Git & Stack (v9'dan değişiklikler)

- **Repo:** `github.com/yukselbrs/moneytalks` · **Local:** `~/code/parakonusur`
- **Deploy:** `git push origin main` → Barış Vercel webhook → production. Bu turda merge+push yapıldı; **Cloudflare "Purge Everything" Barış tarafından yapılmalı.**
- **Yeni bağımlılık deseni:** rate limit ve cron sayaçları artık in-memory değil, **Supabase** (`rate_limits` + `rate_limit_hit()` RPC).
- AI model değişmedi: `claude-sonnet-4-6`.
- KAP: hâlâ **demo** ortamı (`apigwdev.mkk.com.tr`). Production geçişi tek satır env değişikliği (aşağıda).

---

## Track 1 — Yapılanlar (13 görev, 3 bölüm)

### BÖLÜM I — Temel Sağlamlaştırma

| # | Görev | Özet | Karar notu |
|---|---|---|---|
| 1 | İzleme arama teşhisi | Arama kaynağı `lib/bist-hisseler` tek kaynağına bağlandı; hardcode kopya kaldırıldı. Kök neden sayfalama değil, lokal listeydi | [[track1-gorev1-izleme-arama-teshis]] |
| 2 | CRON_SECRET rotasyonu | Yeni secret üretildi, `.env.local`'e yazıldı, eski değer tüm vault'tan `[REDACTED]`. **Vercel+GitHub güncellemesi Barış'ta (manuel)** | [[track1-gorev2-cron-secret-rotasyonu]] |
| 3 | Rate limit → Supabase | `analiz`/`chatbot`/`risk` in-memory Map → ortak `rate_limits` tablosu + atomik `rate_limit_hit()` RPC; risk'e IP limit + TTL cache | [[track1-gorev3-rate-limit-supabase]] |
| 4 | RLS audit | Politikalar migration'a alındı; `profiles` email/is_pro/pro_until kolon-grant kısıtı; `chatbot_usage` CLAUDE.md'ye eklendi | [[track1-gorev4-rls-audit]] |
| 5 | AI panel risk dili | "Güçlü/Olumsuz Görünüm" → volatilite/risk dili; "getiri tahmini değildir" mikro-copy; "Güven" → "Veri Yeterliliği" | [[track1-gorev5-ai-panel-dili]] |
| 6 | Alarm UX | `window.location.reload()` → optimistic refetch; karta "hedefe %X uzakta" göstergesi | [[track1-gorev6-alarm-ux]] |
| 7 | Çift alarm cron'u | `vercel.json` alarm cron'u kaldırıldı; GitHub Actions (15 dk) tek tetikleyici; atomic-claim idempotency | [[track1-gorev7-cift-cron]] |
| 8 | RSI Wilder | Basit ortalama → Wilder smoothing; 8 hisseyle doğrulandı (THYAO, PGSUS, GUBRF, ASELS, SASA, KRDMD, EREGL, GARAN) | [[track1-gorev8-rsi-wilder]] |

### BÖLÜM II — Ürün Kimliği Özellikleri

| # | Görev | Özet | Karar notu |
|---|---|---|---|
| 9 | **KAP Tercümanı** | Bildirim → tip sınıflandırma → 3 katmanlı Claude özeti (tek cümle / "bu ne demek" / portföy bağlamı) → cache → izleme listesi eşleşmesi → Resend e-posta. SPK çift savunma (prompt yasakları + regex-retry). 3 subagent (supabase-schema, data-pipeline, kap-explainer) | [[track1-gorev9-kap-tercumani]], [[kap-tercumani-supabase-semasi]] |
| 10 | Programatik SEO | Her KAP bildirimi için ISR sayfası (`/kap/[index]`), 50 pilot hisse JSON-LD structured data, dinamik sitemap | [[track1-gorev10-programatik-seo]] |
| 11 | "Neden düştü/çıktı" v1 | Hacim anomalisi + momentum ile anormal hareket tespiti → aynı gün KAP eşleşmesi + endeks chip'leri → olasılık dili ("kesin neden" yok) | [[track1-gorev11-neden-karti]] |
| 12 | Portföy Haftalık Karnesi | `bist-companies.json`'a 606 hisse sektör alanı; değer-ağırlıklı risk/getiri + sektör konsantrasyonu; Pazar akşamı Resend cron; teşhis dili (eylem önerisi yok) | [[track1-gorev12-haftalik-karne]] |

### BÖLÜM III — Premium Frontend

| # | Görev | Özet | Karar notu |
|---|---|---|---|
| 13 | Premium geçişi (Pass 1) | Hero derinlik (grain + radial glow), güven rozetleri ("15 dk gecikmeli"), markaya uygun skeleton/boş-durum, mobil dokunma hedefleri + a11y, yeni yüzey tutarlılık turu. Mevcut design system taban alındı | [[track1-gorev13-premium-frontend]] |

---

## Deploy Kaydı

- **Merge:** `fable-track1` → `main`, fast-forward (13 commit, çakışma yok).
- **Commit aralığı:** `e0c7bcd..69f5e21`.
- **Push:** `git push origin main` başarılı → Vercel production build tetiklendi.
- **Migration:** `supabase/migrations.sql` SQL Editor'de koşuldu (idempotent) — KAP tabloları + `karne_gonderim` + `rate_limits` canlıda.
- **Doğrulama:** KAP cron'u production'da JSON (`{yeniBildirim, ozetlenen, epostaGonderilen}`) dönüyor; "Expecting value" hatası çözüldü (sebep: route deploy edilmemişti).

---

## Yeni Supabase Tabloları (bu turda eklenen)

- `kap_bildirimleri` — bildirim + cache'li 2 AI katmanı (`disclosure_index` UNIQUE = cache anahtarı; durum akışı: yeni→ozetlendi→bildirildi/hata)
- `kap_bildirim_gonderim` — e-posta idempotency (bildirim_id + user_id UNIQUE)
- `kap_cursor` — artımlı polling imleci (tek satır)
- `karne_gonderim` — haftalık karne idempotency
- `rate_limits` — atomik rate limit sayacı (`rate_limit_hit()` RPC ile)

Şema detayları: [[kap-tercumani-supabase-semasi]] ve `docs-vault/06-agent-memory/supabase-schema-notlar.md`.

## Yeni API / Cron / Sayfalar

- **Cron:** `/api/cron/kap-bildirimleri` (15 dk), `/api/cron/haftalik-karne` (Pazar akşamı) — her ikisi GitHub Actions workflow'lu.
- **API:** `/api/neden` (neden düştü/çıktı atıf motoru).
- **Sayfa:** `/kap` (bildirim akışı), `/kap/[index]` (ISR bildirim detay/SEO sayfası).
- **Lib:** `lib/kap-ozet.ts` (sınıflandırma + özet + bağlam), `lib/rate-limit.ts`, `lib/seo-pilot-hisseler.ts`.
- **Workflow toplamı 4:** `hisse-snapshot`, `alarm`, `kap-bildirimleri`, `haftalik-karne` — hepsi tek `secrets.CRON_SECRET` okuyor.

---

## Açık İşler / Kalan Manuel Adımlar

### Barış'ta (manuel, kod tarafı hazır)
1. **CRON_SECRET rotasyonu** — production hâlâ eski secret'la çalışıyor (cron'lar sağlam). Sıra: **Vercel env → redeploy → Cloudflare purge → GitHub Actions secret** (tek secret 4 workflow'u kapsar). Runbook: [[track1-gorev2-cron-secret-rotasyonu]].
2. **Cloudflare "Purge Everything"** — bu deploy sonrası (henüz yapılmadıysa).

### Stratejik / sonraki track'ler
- **KAP production geçişi** — MKK erişimi gelince yalnız `KAP_API_URL`/`KEY`/`SECRET` env değişir; kod feature-flag'li. Şu an demo (Aralık 2023 verisi).
- **Premium frontend Pass 2** — toptan inline-style → Tailwind temizliği (25 component; bilinçli ertelendi), dashboard/portföy sayı hiyerarşisi, KAP e-posta şablon cilası.
- **Kapsam dışı bırakılan borç:** Sentry/izleme yok; `bilanco` route'u hâlâ kayıp (v9 fark analizinde not düşülmüştü) — ayrı iş.

---

## Referans Dokümanlar

- Faz 1 analizi: [[2026-07-analiz-raporu]] (Görev A-G), [[brainstorm-2026-07]] (5 ürün fikri)
- v9 fark analizi: [[handoff-v9-fark-analizi]]
- Strateji: [[parakonusur_strateji_raporu]]
- Tüm Track 1 karar notları: `docs-vault/03-kararlar/track1-gorev*.md`
- Subagent hafızası: `docs-vault/06-agent-memory/{data-pipeline,kap-explainer,supabase-schema}-notlar.md`
