# Handoff v9 — Kod Tabanı Fark Analizi

> ℹ️ **Arşiv notu (13 Temmuz 2026):** Bu analiz 4 Temmuz'daki kod durumunun fotoğrafıdır; "teknik borç" bölümündeki maddelerin çoğu Track 1'de kapatıldı (bkz. [[parakonusur_handoff_v10]]). Güncel denetim: [[2026-07-tam-audit]].

**Tarih:** 4 Temmuz 2026
**Karşılaştırılan:** [[parakonusur_handoff_v9]] (4 Mayıs 2026) ↔ kod tabanının güncel hali (son commit: `5b4c06c`, **9 Mayıs 2026**)
**Önemli bağlam:** 9 Mayıs'tan bu yana (~2 ay) **hiç commit yok**. Kod tabanı 9 Mayıs durumunda donmuş; v9 (4 Mayıs) ile bugün arasındaki fark, 4-9 Mayıs arasındaki 121 commit'ten ibaret.

---

## 1. v9'daki "bu oturumda yapıldı" fix'leri hâlâ kodda mı?

### 1.1 XU100 intraday grafik baseline fix — ✅ MEVCUT, üzerine değişiklik gelmiş

`app/api/grafik/route.ts:65-67` — `chartPreviousClose` grafik başına ekleniyor, v9'daki gibi.

Üzerine gelen değişiklikler:
- **Türkçe karakter düzeltmesi** (`953e8a6`): `"Onceki Kapanis"` → `"Önceki Kapanış"`.
- **`kurumsalAksiyonlariAyarla()` eklendi** (satır 3-19): ardışık kapanışlarda oran <0.55 veya >1.8 ise geçmiş seri open-ratio ile geriye doğru düzeltiliyor (bedelsiz/split fix'inin grafik ayağı). `1d`/`1wk` hariç tüm range'lerde uygulanıyor.
- **Tatil fallback'i** (satır 70-106): `1d` boş dönerse `5d`'den son geçerli işlem günü çekiliyor.

### 1.2 AI panel güven skoru fix — ✅ MEVCUT, taşınmış

`app/dashboard/page.tsx:203` — güven hâlâ risk seviyesinden türetiliyor (v9'daki fix aynen duruyor):
```ts
const guven = risk.seviyeTR === "Düşük" ? "Yüksek" : risk.seviyeTR === "Orta" ? "Orta" : "Düşük";
```
Fark: dashboard component'lara bölünmüş; güven skoru UI'ı artık `components/DashboardAiPanel.tsx:81`'de render ediliyor. (Not: bu component'ta inline `style={{}}` kullanımı var — `.claude/CLAUDE.md`'deki "Tailwind tüm styling" kuralına aykırı, teknik borç.)

### 1.3 Endeks beta fix — ✅ MEVCUT, üzerine genişletilmiş

`app/api/risk/route.ts:80-97` — `isEndeks` kontrolü, beta=1/N-A, ağırlık 0, toplam ağırlıkla normalizasyon: hepsi v9'daki gibi duruyor.

Üzerine gelen değişiklikler:
- **Risk motoru 8 → 10 faktöre çıkmış:** TradingView Scanner'dan F/K (`price_earnings_ttm`) ve PD/DD (`price_book_ratio`) eklendi (satır 136-179), piyasa değeri de buradan geliyor (v9'daki "piyasa değeri için ücretli vendor gerekiyor" notu **kısmen aşılmış** — TradingView `market_cap_basic` kullanılıyor).
- Endeks için ağırlıklar yeniden dağıtılıyor (volatilite 0.30, 52H 0.25, momentum 0.25; günlük range/likidite/F-K/PD-DD 0).
- Küçük tutarsızlık: v9 likidite ağırlığını 0.06 diyor, kodda 0.05 (satır 198). Satır 204'te `* (isEndeks ? 1 : 1)` ölü kod var.
- **RSI hâlâ basit ortalama** (satır 62-72) — Wilder yöntemi backlog'da, değişmemiş. ✓ v9 ile tutarlı.

---

## 2. KAP/MKK API entegrasyonu ilerlemesi

**Durum: v9'daki "sonraki adım 1" (demo ile kodlama) kısmen tamamlandı; production'a GEÇİLMEDİ.**

- `app/api/haberler/route.ts` canlı KAP API'ye bağlanmış: `members` (company id cache), `lastDisclosureIndex`, `disclosures`, `disclosureDetail` akışı kodlanmış. Basic Auth, `KAP_API_URL/KEY/SECRET` env'den geliyor.
- `.env.local`'de `KAP_API_URL` hâlâ **demo** (`apigwdev.mkk.com.tr`) — yani sadece Aralık 2023 test verisi dönüyor. Production başvurusu/geçişi yapılmamış.
- **Yapılmamış olanlar** (strateji raporunun omurga özellikleri): AI bildirim özetleyici boru hattı yok, `kap_bildirimleri` Supabase tablosu yok, index-bazlı polling cron'u yok, bildirim tipi sınıflandırıcı yok, izleme listesi bazlı KAP push'u yok. Sadece "son 10 ODA bildirimini listele" düzeyinde.
- **Dikkat:** 9 Mayıs handoff'u `app/api/bilanco/route.ts` "yazıldı" diyor ama bu dosya kodda **yok** ve git geçmişinde de hiç olmamış (`git log --all -- app/api/bilanco` boş). Commit edilmeden kaybolmuş olabilir — yeniden yazılması gerekecek.

---

## 3. Launch checklist yüzdeleri hâlâ doğru mu?

v9 (4 Mayıs): Faz 1 ~99%, Faz 2 ~95%, Faz 3 ~35%, Faz 4 ~18%.

| Faz | v9 | Şimdi (tahmin) | Gerekçe |
|---|---|---|---|
| Faz 1 — Ürün & Fonksiyon | ~99% | **~99-100%** | 4-9 Mayıs'ta üstüne eklendi: design system rollout (alarmlar/hisseler/izleme/analizler), Pako AI sayfası (`/yapay-zeka`), takvim (TCMB PPK + FED hardcode), 607 hisse araması, landing waitlist kaldırıldı, bedelsiz/adjclose fix zinciri |
| Faz 2 — Finansal Veri & AI | ~95% | **~80-85% (efektif)** | Sayı geriledi çünkü hedef büyüdü: strateji raporu (1 Temmuz) KAP AI özetleyiciyi ürünün omurgası yaptı. Mevcut: KAP demo listesi var; eksik: production erişim, AI özet boru hattı, sınıflandırıcı, kişisel bildirim, bilanço. v9'un kendi tanımıyla %95 hâlâ savunulabilir ama yeni stratejiye göre yanıltıcı |
| Faz 3 — Ödeme & Abonelik | ~35% | **~35% (değişmedi)** | Şirket kurulumu hâlâ beklemede; ödeme entegrasyonu yok |
| Faz 4 | ~18% | **~18-20%** | Vercel Analytics eklendi (`f781dbd`); Meta Pixel, Beehiiv, SEO pilotu hâlâ yok |

---

## 4. v9 sonrası gelen, v9'da olmayan işler (4-9 Mayıs, 121 commit)

1. **Pako AI** — `/yapay-zeka` sayfası, sidebar nav, futuristik tasarım, chat geçmişi, markdown render (9 commit).
2. **Bedelsiz/adjclose fix zinciri** — `fiyatlar` (adjclose bazlı değişim), `hisse/[ticker]` (`degisimYuzde` field), cron snapshot (2y+5d paralel fetch, stuck adjclose tespiti + `chartPreviousClose` fallback), `hisseler` (snapshot öncelikli sort). 9 Mayıs handoff'unda belgelenmiş, kodda doğrulandı.
3. **Takvim sayfası** — TCMB PPK 2026 + FED FOMC hardcode, Finnhub hata toleransı (`app/api/takvim/route.ts`).
4. **Gecikmeli veri etiketi kısmen var** — portföyde "~15dk gecikmeli" etiketi eklendi (`f1fb21a`, `e0f8983`). Strateji raporunun "tüm fiyat gösterimlerine gecikmeli etiketi" hedefinin ilk adımı farkında olmadan atılmış.
5. **Cron gel-git'i** — snapshot Vercel cron'a taşındı (`93389cb`) sonra GitHub Actions'a geri alındı (`d51965b`). Güncel durum: snapshot GitHub Actions `*/5`, alarmlar Vercel cron `0 9 * * 1-5` (`vercel.json`). v9'un tarifiyle uyumlu ama alarm cron'u için ayrıca `.github/workflows/alarm-cron.yml` de mevcut — **çift tetikleme riski kontrol edilmeli**.

---

## 5. Değişmeyen teknik borç (v9 + strateji raporu doğrulaması)

- **Rate limit / cache hâlâ in-memory** (`globalThis`): `fiyatlar`, `analiz`, `chatbot`, `xu`, `piyasa`. Upstash/Redis yok (`package.json`'da `@upstash` yok). Strateji raporu bunu "lansman öncesi kritik" seviyesine çekti.
- **Sentry yok** (package.json'da yok). Strateji raporu: lansman öncesi.
- **RSI basit ortalama** — düşük öncelik, backlog'da kalabilir.
- **`CRON_SECRET` düz metin** hem v9 hem 9 Mayıs handoff'unda geziniyor (`[REDACTED]`); strateji raporu rotasyon istiyor — yapılmadı.
- Yahoo Finance bağımlılığı aynen sürüyor (tüm fiyat/grafik/risk endpoint'leri).

---

## 6. Sonuç

- v9'un üç fix'i de kodda **mevcut ve sağlam**; grafik fix'inin üzerine kurumsal aksiyon düzeltmesi ve tatil fallback'i, risk motorunun üzerine F/K + PD/DD faktörleri eklenmiş.
- KAP entegrasyonu demo listeleme düzeyinde; **strateji raporunun omurga özelliklerinin (AI özet, sınıflandırıcı, kişisel bildirim) hiçbiri başlamadı**. `bilanco` route'u kayıp.
- Yüzdeler v9'un kendi tanımına göre hâlâ doğru; ancak 1 Temmuz strateji raporu ürün tanımını değiştirdiği için Faz 2 efektif olarak geriledi.
- Kod 9 Mayıs'tan beri donuk — bir sonraki oturumun doğal başlangıcı: KAP demo → AI özet boru hattı ([[parakonusur_strateji_raporu]] Bölüm 6, iş #1-2) + Upstash rate limit + Sentry.
