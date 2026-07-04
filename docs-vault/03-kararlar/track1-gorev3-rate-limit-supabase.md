# Track 1 / Görev 3 — Rate Limit'in Supabase'e Taşınması

**Tarih:** 4 Temmuz 2026 · **Branch:** `fable-track1` · **Durum:** Tamamlandı (DB migration'ın manuel uygulanması bekliyor)

## Karar
In-memory rate limit Map'leri (cold start'ta sıfırlanıyordu) tek bir ortak Supabase sayacına taşındı. Upstash yerine Supabase seçildi: yeni servis/sözleşme eklemeden mevcut altyapıyla çözülüyor; atomik `INSERT ... ON CONFLICT` upsert yarış koşulunu engelliyor.

## Mimari
- **DB:** `rate_limits` tablosu + `rate_limit_hit(p_key, p_window_seconds, p_max) → boolean` RPC (SECURITY DEFINER, fixed-window, tek-statement atomik). `rate_limits_temizle()` bakım fonksiyonu. RLS açık, policy yok — yalnız service role. `supabase/migrations.sql` sonuna eklendi (supabase-schema subagent).
- **Kod:** [lib/rate-limit.ts](../../lib/rate-limit.ts) — `rateLimitHit(key, windowSeconds, max)`. **Supabase erişilemezse veya RPC henüz kurulmadıysa in-memory fixed-window fallback'e düşer** (`degraded: true`) — davranış bugünkünden kötüleşmez, migration uygulanınca kendiliğinden kalıcılaşır. `istekIpAdresi()` helper'ı `x-forwarded-for` ilk değerini alır (Vercel).

## Uygulanan limitler (değerler korundu)
| Route | Anahtar | Pencere | Limit | Not |
|---|---|---|---|---|
| `/api/analiz` | `analiz:<userId>` | 3600 sn | 10 | Eski globalThis Map + setInterval cleanup silindi |
| `/api/chatbot` | `chatbot:<userId>` | 60 sn | 20 | Günlük 3 mesaj kotası (chatbot_usage) zaten Supabase'teydi, dokunulmadı |
| `/api/risk` | `risk:ip:<ip>` | 60 sn | 30 | **Yeni** — önceden limitsizdi. + 60 sn TTL in-memory yanıt cache'i (ticker başına; cache HIT limit tüketmez) |

## Dağıtım notu
`supabase/migrations.sql`'in yeni bölümü Supabase SQL Editor'de çalıştırılmalı (repo'da DDL erişimi yok). Çalıştırılana kadar sistem fallback modda — işlevsel ama cold start'ta sayaç sıfırlanır (bugünkü davranış).

## Devam noktası
Sıradaki: Görev 4 (RLS audit — büyük kısmı upstream'de `migrations.sql`'e alınmış çıktı; kalan: chatbot_usage CLAUDE.md kaydı + audit notu).
