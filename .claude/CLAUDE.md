# ParaKonusur — Claude Code Rules

## Project
AI-powered Turkish stock analysis platform (BIST).
Stack: Next.js 16.2.3 (App Router), TypeScript, Tailwind CSS v4, Supabase, Vercel, Resend, Sanity CMS, Cloudflare.
Repo: github.com/yukselbrs/moneytalks (private) | Dev: ~/moneytalks
Production: parakonusur.com | AI model: claude-sonnet-4-6

## Team
- **Kaan Ilgın** (kaanilgin) — co-founder, Koç Üniversitesi Ekonomi. Supabase sahibi. Frontend, product, UI/UX, Claude Code.
- **Barış Yüksel** (yukselbrs) — co-founder, Sabancı Üniversitesi Endüstri Mühendisliği. Vercel sahibi (parakonusur.com buradan). Backend, infra, deploy.

## Deploy Flow
- `git push origin main` → Barış'ın Vercel webhook'u → production deploy.
- `npx vercel --prod` → Kaan'ın hesabına deploy, parakonusur.com'a yansımaz.
- Cloudflare cache: deploy sonrası Barış "Purge Everything" yapmalı.
- Local: `cd ~/moneytalks && git pull --rebase && npm run dev`
- Türkçe karakter: `LANG=tr_TR.UTF-8 python3` ile yaz.

## App Structure
- `app/` — Next.js App Router sayfaları (dashboard, hisse/[ticker], portfoy, analizler, alarmlar, izleme, haberler, blog, takvim, bildirimler, profile, pro, login, register, reset-password)
- `app/api/` — API route'ları
- `app/api/cron/` — GitHub Actions ile tetiklenen cron job'lar
- `components/` — Shared component'lar (AppShell, StockLogo, HisseChatbot, RiskProfilWidget)
- `lib/` — Utility'ler (bist-hisseler.ts, stock-logos.ts, midas-stock-logos.ts)
- `data/` — Static JSON (bist-companies.json 607 hisse, bist-price-coverage.json)
- `public/stock-logos/midas/` — Local logo cache (132 hisse)
- `hooks/` — Custom hooks (useMediaQuery)

## Key API Endpoints
- `/api/fiyatlar` — Yahoo Finance fiyat, 15sn TTL. `?extra=TICKER1,TICKER2` ile ek hisse.
- `/api/grafik` — Yahoo Finance chart. `?ticker=THYAO.IS&range=1d/1wk/1mo/3mo/1y`
- `/api/xu` — XU100/XU030 endeks verisi, 15sn global cache.
- `/api/risk` — 10 faktörlü risk skoru: beta(%25), volatilite(%20), 52H pozisyon(%15), momentum(%15), hacim anomalisi(%10), RSI(%10), günlük range(%4), likidite(%5), F/K(%5), PD/DD(%5). TradingView Scanner ile F/K ve PD/DD çekiliyor.
- `/api/analiz` — claude-sonnet-4-6 ile AI teknik analiz. `veriOnly:true` sadece veri döner.
- `/api/chatbot` — Auth (Bearer token) + rate limit (20 req/dk/user) + SPK filtresi.
- `/api/hisseler` — Supabase hisse_snapshots, sort+pagination. 607 hisse evreni.
- `/api/risk-profil` — GET/POST kullanıcı risk profili. SPK uyumlu tarama sonucu.
- `/api/alarmlar` — GET/POST/PATCH/DELETE alarm CRUD. Tip: fiyat_seviye, fiyat_yuzde, yuzde_degisim, gosterge.
- `/api/cron/hisse-snapshot` — */5dk GitHub Actions, Yahoo Finance → Supabase hisse_snapshots.
- `/api/cron/alarmlar` — Alarm tetikleme cron'u. Fiyat, yüzde, RSI bazlı kontrol + Resend email.
- `/api/hesap-sil` — DELETE, Supabase Admin API. Bearer token zorunlu, sadece kendi hesabını silebilir.
- `/auth/callback` — OAuth SSR callback. Supabase SSR cookie yazımı (@supabase/ssr).

## Supabase Tables
- `profiles` — user metadata (username, avatar_url, full_name)
- `watchlist` — (user_id, ticker, added_at)
- `analizler` — (user_id, ticker, analiz TEXT, created_at)
- `portfoy` — (user_id, ticker, adet, maliyet, alis_tarihi)
- `alarmlar` — (user_id, ticker, tip, kosul, hedef_deger, hedef_yuzde, gosterge_tipi, gosterge_esik, durum)
- `bildirimler` — (user_id, baslik, aciklama, detay, tip, ikon, okundu, created_at)
- `hisse_snapshots` — (ticker, fiyat, degisim_yuzde, hacim, getiri_1h/1a/3a/1y, updated_at)
- `waitlist` — (email, created_at)
- `risk_profil` — (user_id, vade, risk_toleransi, sermaye, sektor, deneyim, ai_oneri JSON)

## Data Sources
- Yahoo Finance — fiyat, grafik, beta, volatilite (15dk gecikmeli, `.IS` suffix zorunlu)
- TradingView Scanner — F/K (price_earnings_ttm), PD/DD (price_book_ratio), piyasa değeri. POST https://scanner.tradingview.com/turkey/scan, ticker format: "BIST:THYAO"
- BIST evreni: 607 aktif hisse (StockAnalysis + KAP parse). Yahoo fiyat kapsamı 606/607 (KOZAA eksik).

## Stock Logo Resolution Order
1. Local Midas cache (`/public/stock-logos/midas/` — 132 hisse)
2. TradingView SVG base64 (`lib/stock-logos.ts` — 160 hisse)
3. Google Favicon (`https://www.google.com/s2/favicons?domain=X&sz=64`)
4. Fallback: ticker ilk 3 harf, `tickerRenk()` ile deterministik renk

## SPK Compliance
- AI çıktılarında "al", "sat", "kesin yükselir/düşer", "yatırım tavsiyesi", "garanti" ifadeleri yasak.
- `/api/chatbot` response'unda yasaklı ifade tespitinde standart disclaimer döner.
- `/api/risk-profil` prompt'u "tarama asistanı" framing'i ile yazılmış, "danışman" değil.
- Her AI analiz çıktısında "Bu analiz yatırım tavsiyesi değildir." ibaresi zorunlu.

## Auth Pattern
- Client: `supabase.auth.getSession()` → `session.access_token` → `Authorization: Bearer <token>` header.
- API: `req.headers.get("authorization")?.replace("Bearer ", "")` → `supabase.auth.getUser(token)`.
- OAuth: `/auth/callback` route, `@supabase/ssr` createServerClient ile cookie yazımı.
- Hesap silme: token'dan user alınır, body'deki userId kullanılmaz.

## Behavior
- Türkçe yanıt ver.
- Kodu direkt yaz. Açıklama istenmediğinde yazma.
- Kısa ve net. Dolgu cümle yok.
- Birden fazla yaklaşım varsa en iyisini seç ve uygula.

## Code Style
- TypeScript strict. `any` yasak.
- Functional components. Class component yok.
- Tailwind tüm styling. Inline style ve CSS module yok.
- Named export component, default export page.
- `async/await`. `.then()` zinciri yasak.
- Early return. Nested conditional yok.

## Supabase
- Her zaman RLS göz önünde bulundur.
- Server component → `createServerClient`. Client → `createBrowserClient`.
- Service role key asla client-side.

## What NOT to do
- Obvious koda comment ekleme.
- Gereksiz try/catch.
- İstenmeden yeni dosya oluşturma.
- Request dışı refactor.
- `any` kullanma.
- `.then()` zinciri kurma.

## next.config.ts
- `eslint.ignoreDuringBuilds: true` — lint hataları build'i kırmaz.
- `images.remotePatterns`: www.google.com, t1/t2/t3.gstatic.com (favicon için).

## GitHub Actions
- `.github/workflows/` altında cron job'lar tanımlı.
- `hisse-snapshot`: */5 dakikada bir Yahoo Finance → Supabase hisse_snapshots.
- Cron secret: `CRON_SECRET` env variable, `lib/cron-auth.ts` ile doğrulanır.

## Sanity CMS
- Studio: parakonusur.com/studio
- Dataset: production
- Schema: `/sanity/schemas/` — blog post, kategori vb.
- GROQ ile sorgula, JS filtering yapma.
- Sanity config: `sanity.config.ts` root'ta.

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase proje URL'i (client-safe)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (client-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — Admin işlemler için, asla client-side
- `ANTHROPIC_API_KEY` — Claude API
- `RESEND_API_KEY` — Email gönderimi
- `CRON_SECRET` — Cron job auth
- `NEXT_PUBLIC_APP_URL` — https://parakonusur.com (cron içi fetch için)
- `SANITY_API_TOKEN` — Sanity write işlemleri
