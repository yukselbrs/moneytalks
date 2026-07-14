# Faz 4 / Görev 11 — Cron Tek Düzlem Kararı (D.5)

**Tarih:** 15 Temmuz 2026 · **Branch:** `fable-faz4` · **Durum:** Tamamlandı

## Karar
**Tüm cron'lar GitHub Actions'ta** (GÖREV 7'deki ilkeye dönüş): `fon-snapshot` Vercel cron'dan GH Actions'a taşındı (`fon-snapshot-cron.yml`, aynı saat `30 19 * * *`); `vercel.json` crons boş. Gerekçe: tek zamanlama düzlemi, `workflow_dispatch` ile manuel tetikleme, ve Görev 7'de (D.2) eklenen hata-grep denetiminin tüm cron'lara tek desenle uygulanabilmesi. (Vercel cron'un otomatik `Authorization: Bearer CRON_SECRET` göndermesi tatlı bir özellikti ama iki düzlemin yönetim maliyetine değmiyor.)

## Not
- CRON_SECRET rotasyon runbook'u ([[track1-gorev2-cron-secret-rotasyonu]]) "4 workflow" diyordu — artık **5 workflow** (fon eklendi); rotasyonda GitHub secret güncellemesi hepsini birden kapsıyor, ek adım yok.
- D.5'in supabase client ayağı (createBrowserClient) Dalga 1'de yapıldı: [[faz4-gorev3-oturum-tek-depo]].

## Deploy sonrası kontrol
Vercel dashboard → Cron Jobs BOŞ olmalı; Actions → 5 workflow yeşil.
