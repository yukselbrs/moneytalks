# ParaKonuşur — Launch Checklist 2026

**Hedef:** ~9 Ağustos 2026 (15 gün) · **Kapsam:** Launch'ta site TAMAMEN ÜCRETSİZ · **Pro/premium KAPSAM DIŞI** ("Çok Yakında") · **Veri:** mevcut kaynaklarla (resmi BIST/MKK lisansı önkoşul değil)

---

## 🚦 LAUNCH DURUMU (25 Tem 2026)

| | Açık | Kapandı | Toplam |
|---|---|---|---|
| 🔴 **BLOCKER** | **0** | 3 | 3 |
| 🟠 **MAJOR** | **5** | 3 | 8 |
| 🟡 MINOR | 4 | 0 | 4 |

**Test edilen madde:** 20 / ~95 · **Kalan fazlar:** 2 (2.13 hariç), 3, 4, 6 (kısmi), 7 (kısmi), 8

### ⛔ Launch için önce şunlar kapatılmalı

| # | Madde | Kim | Süre |
|---|---|---|---|
| 🟠 **M-4** | **Yahoo Finance tek-nokta bağımlılığı** — risk kabul mü, ikincil kaynak mı? | **Barış kararı** | — |
| 🟠 **M-5** | **Sentry DSN + uptime monitoring** (paket var, config yok) | Barış + Claude | 30 dk |
| 🟠 **M-6** | **Supabase "leaked password protection"** kapalı → Dashboard → Auth → Password | **Barış** | 1 dk |
| 🟠 **M-7** | **Cloudflare purge stratejisi** kurulu/test edilmiş değil | Barış + Claude | 20 dk |
| 🟠 **M-8** | Uygulama içi sayfalarda footer/yasal link yok (yalnız landing + dashboard'da var) | Claude/Kaan | 20 dk |

---

## FAZ 0 — Resume protokolü ✅

- [x] Bu dosya oluşturuldu · **Geçti**
- [x] 84 vault dosyası tarandı, gerçek durum kod/DB ile doğrulandı · **Geçti**

### Geçmiş log durumu (yazan ≠ gerçek olanlar işaretli)

| Log | Yazan | GERÇEK | Aksiyon |
|---|---|---|---|
| hisse-denetim-halka-arz-takvimi | TAMAMLANDI | ✅ Doğru | — |
| doviz-kiymetli-maden | TAMAMLANDI | ✅ Doğru (16/16 canlı) | — |
| bilanco-kap-haberleri | TAMAMLANDI | ✅ Doğru | — |
| kap-ucretsiz-kaynak | prod'da | ✅ Doğru (tek kaynak, flag yok) | — |
| **cok-varlik-portfoy-izleme** | "migration Barış'ta" | ✅ **Çalışmış** | Log düzeltildi ✓ |
| **track1-gorev2-cron-secret** | "secret bekliyor" | ✅ **Çözüldü** | — |
| **track1-gorev3-rate-limit** | "migration bekliyor" | ✅ **Uygulanmış** | — |
| **track1-gorev4-rls-audit** | "grant bekliyor" | ✅ **Uygulanmış** | Bu denetimde daha da sıkıldı |
| **faz4-alarm-cron-donduruldu** | "Aktif kısıt" | ⚠️ **Bayat** (16 Tem'de kalktı) | Log düzeltildi ✓ |
| faz4-gorev7-gozlemlenebilirlik | "Sentry Barış'ta" | ⚠️ Hâlâ açık | → M-5 |
| faz4-gorev16 / 21 / 22 | ERTELENDİ/Kısmen | Kapsam dışı | MINOR |
| kiymetli-madenler / viop planları | PLAN | ✅ Hepsi uygulandı | — |

---

## FAZ 1 — Geçmiş iş doğrulaması ✅ (1.1b hariç)

- [x] **1.1a CRON_SECRET rotasyonu** · **Geçti** · 24-25 Tem'de 9 workflow yeşil, tablolara yazıyor.
- [ ] **1.1b Cloudflare purge stratejisi** · **Test Edilmedi** · 🟠 **M-7**
- [x] **1.1c KAP production endpoint** · **Geçti** · Feature-flag YOK; tek kaynak `kap.org.tr` (VYK/demo kaldırılmış), prod'da 1064 bildirim.
- [x] **1.2 Yahoo bağımlılığı** · **Kısmen** · 🟠 **M-4** · Hisse fiyat/grafik/getiri/risk + döviz/maden + temettü + halka-arz işlem sinyali Yahoo'ya bağlı. Bilinen kırılganlık: Vercel IP'sinden **uzun UA'da 429** (kısa UA ile aşıldı, [[yahoo-vercel-ua]]). Döviz'de Frankfurter yedeği var; **hisse fiyatında yedek YOK** → Yahoo kesilirse fiyatlar durur. **Barış kararı gerekiyor.**
- [x] **1.3 Son modüllerin gerçek durumu** · **Geçti** · 5 modül canlı doğrulandı.

---

## FAZ 5 — GÜVENLİK (öncelikli) 🔄

- [x] **5.1 RLS çapraz-kullanıcı izolasyonu (fiili test)** · **Geçti** · İki gerçek hesap: A, B'nin `portfoy`/`alarmlar`/`watchlist`/`bildirimler`/`analizler`/`risk_profil` satırlarını **göremiyor/silemiyor**; `user_id=eq.B` zorlamasında da boş; app API'leri sahte token'a 401. **Sızıntı yok.**
- [x] **5.1b Anon e-posta sızıntısı** · 🔴 **BLOCKER — KAPANDI** (`efeaa3b`) · `get_email_by_username` anon'a GRANT'liydi → **girişsiz herkes kullanıcı adından e-posta okuyabiliyordu** (KVKK + phishing). Giriş `/api/giris` ile sunucuya taşındı (e-posta istemciye dönmez, 10/5dk IP limiti, aynı genel hata mesajı). 4/4 anon RPC artık 401.
- [x] **5.1c Rate limit bypass** · 🔴 **BLOCKER — KAPANDI** (`efeaa3b`) · `rate_limits_temizle()` anon'a açıktı (204) → limit tablosu silinip AI limitleri bypass edilebiliyordu.
- [x] **5.1d profiles aşırı geniş okuma** · 🟠 **MAJOR — KAPANDI** (`efeaa3b`) · `USING(true)` → 27 kullanıcının username/full_name/avatar'ı okunabiliyordu. Kendi satırına daraltıldı + `username_musait` RPC'si.
- [x] **5.2 Client'ta secret sızıntısı** · **Geçti** · `.next/static`'te SERVICE_ROLE/ANTHROPIC/CRON_SECRET/RESEND yok (0 dosya).
- [x] **5.3 AI/maliyetli endpoint rate limiting** · 🟠 **MAJOR — KAPANDI** (`ccfae43`) · `/api/analiz` 10/saat ✓, chatbot 20/dk+kota ✓, doviz-maden/analiz ✓ — ama **`/api/risk-profil` Claude çağırıyordu ve LİMİTSİZDİ**. 10/saat/kullanıcı eklendi; fiili test: 11. istekte 429 ✓.
- [ ] **5.4 Sayfa yükleme hızı** · **Test Edilmedi** · MAJOR adayı
- [x] **5.5 Cron prod sağlığı** · **Geçti** · 9 workflow yeşil, halka-arz `hata:0`.
- [ ] **5.6 Advisor kalan uyarıları** · **Kısmen** · 🟡 MINOR · `function_search_path_mutable` (set_updated_at, sync_portfoy_fiyat); waitlist'te çift INSERT policy; `avatars` bucket listelenebilir. Veri sızdırmıyor.
- [ ] **5.7 Leaked password protection** · **Geçmedi** · 🟠 **M-6** · Barış: Dashboard → Authentication → Password.
- [x] **5.8 Test kullanıcılarını temizle** · 🔴 **BLOCKER — KAPANDI** (25 Tem) · `pk-test-a/b@example.com` + portfoy/watchlist satırları silindi; doğrulama: kalan test kullanıcısı YOK.

---

## FAZ 2 — İşlevsel test ⏳

- [x] **2.13 Pro/premium referansları** · **Geçti** (`ccfae43`) · **Ödeme sağlayıcı entegrasyonu HİÇ YOK** (iyzico/stripe/paytr yok) → kırık ödeme akışı riski sıfır. `/pro` zaten "çok yakında + bekleme listesi" sayfası (`/api/waitlist`). 18 CTA metni "Çok Yakında" diline çevrildi (AppShell kartı, profil, login, Pako AI, DashboardAiPanel, HisseChatbot, chatbot kota mesajı, /pro meta).
- [ ] 2.1 Landing · 2.2 Hisse listesi + tekil hisse · 2.3 Döviz/Maden · 2.4 Bilanço · 2.5 KAP · 2.6 Halka Arz · 2.7 AI analiz (cache/boş veri) · 2.8 Alarm kurma · 2.9 Portföy · 2.11 Arama/filtre · 2.12 404/hata — **Test Edilmedi**
- [ ] **2.10 Kayıt/giriş/şifre sıfırlama** · **Kısmen** · Giriş akışı bu oturumda **sunucu tarafına taşındı**; API'de 3 senaryo geçti (doğru giriş 200+token, yanlış şifre 401, olmayan kullanıcı aynı 401). **UI'dan uçtan uca test + kayıt + şifre sıfırlama sonraki oturumda.**

## FAZ 3 — Tutarlılık/UX ⏳ — hepsi Test Edilmedi
## FAZ 4 — Mobil/cross-browser ⏳ — hepsi Test Edilmedi

## FAZ 6 — Yasal 🔄
- [x] **6.1 Yasal sayfalar** · **Kısmen** · 🟠 **M-8** · 4 sayfa da mevcut (`/kvkk` 86, `/gizlilik` 74, `/kullanim-sartlari` 71, `/risk-uyarisi` 65 satır) ve `Footer.tsx` + `DashboardFooter.tsx`'te linkli. **Ama footer yalnız landing + dashboard'da render ediliyor** — AppShell'li iç sayfalarda (hisseler, portföy, halka arz…) yasal linke erişim yok.
- [ ] 6.2 Çerez onayı · 6.4 Disclaimer görünürlüğü — **Test Edilmedi**
- [x] 6.3 Ödeme akışı · **Kapsam Dışı** (2.13'te doğrulandı)

## FAZ 7 — SEO/izlenebilirlik 🔄
- [x] **7.1 sitemap.xml** · 🟠 **MAJOR — KAPANDI** (`d61d4bf`) · 2136 URL vardı ama **`/halka-arz` (yeni modül), `/kullanim-sartlari`, `/risk-uyarisi` eksikti**; fon listesi girişi de yoktu. Dördü eklendi, lokal doğrulandı.
- [x] **7.2 robots.txt** · **Geçti** · `Allow: /`, `/api/ /auth/ /studio/` disallow, sitemap referansı doğru.
- [ ] 7.3 Meta/OG etiketleri · **Test Edilmedi**
- [ ] **7.4 Sentry + uptime** · **Geçmedi** · 🟠 **M-5** · `@sentry/nextjs` bağımlılığı var, **config dosyası ve DSN yok**.
- [x] **7.5 Analytics** · **Geçti** · GA4 kurulu (`G-0H2KJGRV6D`).
- [ ] 7.6 Resend SPF/DKIM/DMARC + spam testi · **Test Edilmedi** · MAJOR adayı

## FAZ 8 — Launch günü ⏳ — hepsi Test Edilmedi

---

## Kapanan bulgular (kanıtlı)

| # | Bulgu | Önem | Commit | Kanıt |
|---|---|---|---|---|
| 1 | Anon → kullanıcı adından e-posta okuma | 🔴 BLOCKER | `efeaa3b` | anon RPC 401; giriş 3 senaryo geçti; yanıtta e-posta yok |
| 2 | `rate_limits_temizle` anon'a açık → AI limit bypass | 🔴 BLOCKER | `efeaa3b` | anon 401 |
| 3 | profiles `USING(true)` → 27 kullanıcının kişisel verisi | 🟠 MAJOR | `efeaa3b` | A artık yalnız 1 profil görüyor |
| 4 | `/api/risk-profil` AI çağrısı limitsiz | 🟠 MAJOR | `ccfae43` | 11. istekte 429 |
| 5 | sitemap'te `/halka-arz` + 2 yasal sayfa eksik | 🟠 MAJOR | `d61d4bf` | lokal sitemap'te 4 yeni URL |
| 6 | Test kullanıcıları prod DB'de | 🔴 BLOCKER | — | admin API ile silindi, doğrulandı |

---

## ŞU AN NEREDEYİM

**25 Tem 2026 — FAZ 0 ✅, FAZ 1 ✅ (1.1b hariç), FAZ 5 çekirdeği ✅, FAZ 2.13 ✅, FAZ 7.1/7.2/7.5 ✅.**

Bu oturumda **2 BLOCKER + 3 MAJOR bulundu ve kapatıldı** — hepsi gerçek açıktı, en ciddisi girişsiz kullanıcıların kullanıcı adından e-posta okuyabilmesiydi (KVKK). RLS çapraz-kullanıcı izolasyonu iki gerçek hesapla test edildi: **sağlam**. Ödeme akışı riski yok (sağlayıcı entegrasyonu hiç yok).

**Sonraki oturum sırası:**
1. ~~B-3 test kullanıcıları~~ ✅ 25 Tem'de silindi — **açık BLOCKER kalmadı**.
2. **FAZ 2** sayfa sayfa işlevsel test (özellikle 2.10 giriş UI'ı — akış değişti).
3. **FAZ 3 + 4** (tutarlılık, mobil).
4. FAZ 5.4 (hız), 6.2/6.4, 7.3/7.6, FAZ 8.
5. M-5 (Sentry) ve M-8 (iç sayfalarda yasal link) — Claude yapabilir.

**Barış'ın aksiyonu:** M-4 (Yahoo riski kararı), M-6 (leaked password koruması, 1 dk), M-7 (Cloudflare purge), M-5 için Sentry DSN.
