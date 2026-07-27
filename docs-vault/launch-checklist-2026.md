# ParaKonuşur — Launch Checklist 2026

**Hedef:** ~9 Ağustos 2026 (15 gün) · **Kapsam:** Site launch'ta TAMAMEN ÜCRETSİZ · **Pro/premium KAPSAM DIŞI** ("Çok Yakında" olarak işaretlenecek, ödeme akışına GÖTÜRMEYECEK) · **Veri:** mevcut kaynaklarla çıkılıyor (resmi BIST/MKK lisansı önkoşul değil)

---

## 🚦 LAUNCH DURUMU (25 Tem 2026, 02:1x)

| | Açık | Kapandı | Toplam |
|---|---|---|---|
| 🔴 **BLOCKER** | **1** | 2 | 3 |
| 🟠 **MAJOR** | **3** | 1 | 4 |
| 🟡 MINOR | 4 | 0 | 4 |

**Test edilen madde:** 14 / ~95 · **Kalan fazlar:** 2, 3, 4, 6, 7, 8 (+5'in bir kısmı)

### ⛔ Launch için önce şunlar kapatılmalı
1. **[BLOCKER-3] Test kullanıcıları production DB'de** — `pk-test-a@example.com`, `pk-test-b@example.com` (bu denetim için oluşturuldu). Launch öncesi SİLİNMELİ + oluşturdukları portfoy/watchlist satırları temizlenmeli.
2. **[MAJOR-2] Yahoo Finance tek nokta bağımlılığı** — Barış'ın karar vermesi gereken risk (aşağıda FAZ 1.2).
3. **[MAJOR-3] Sentry DSN + uptime monitoring kurulu değil** (paket var, config yok).
4. **[MAJOR-4] Supabase "leaked password protection" kapalı** — Barış dashboard'dan açmalı (1 dk).

---

## FAZ 0 — Resume protokolü ✅

- [x] Bu dosya oluşturuldu · **Geçti** · —
- [x] Geçmiş log taraması (84 md dosyası) · **Geçti** · — · Bulgular aşağıdaki tabloda

### Geçmiş log durumu (gerçek kod/DB doğrulamasıyla)

| Log | Yazan durum | GERÇEK durum | Aksiyon |
|---|---|---|---|
| hisse-denetim-halka-arz-takvimi-log | TAMAMLANDI | ✅ Doğru (prod'da 614 hisse, halka arz canlı) | — |
| doviz-kiymetli-maden-implementasyon-log | TAMAMLANDI | ✅ Doğru (16/16 enstrüman canlı) | — |
| bilanco-kap-haberleri-implementasyon-log | TAMAMLANDI | ✅ Doğru (8 çeyrek, KAP canlı) | — |
| kap-ucretsiz-kaynak-uygulama | prod'da | ✅ Doğru (tek kaynak kap.org.tr, VYK yok) | FAZ 1.1'de teyit |
| cok-varlik-portfoy-izleme-entegrasyon | "watchlist migration Barış'ta" | ✅ **Migration çalışmış** (watchlist.tur + unique idx var) | Log güncellenecek |
| track1-gorev2-cron-secret-rotasyonu | "secret güncellemesi bekliyor" | ✅ **Çözüldü** (24 Tem: cron'lar yazıyor) | — |
| track1-gorev3-rate-limit-supabase | "migration bekliyor" | ✅ **Uygulanmış** (rate_limits + RPC canlı) | — |
| track1-gorev4-rls-audit | "grant SQL bekliyor" | ✅ **Uygulanmış** (profiles email kolon-kısıtlı) | Bu denetimde daha da sıkılaştırıldı |
| faz4-gorev7-gozlemlenebilirlik | "Sentry DSN Barış'ta" | ⚠️ **Hâlâ açık** → MAJOR-3 | FAZ 7.4 |
| faz4-gorev16-web-push | ERTELENDİ | Kapsam dışı (launch'ı engellemez) | MINOR |
| faz4-gorev21-fon-karnesi | Kısmen | Şema var, UI yok — kapsam dışı | MINOR |
| faz4-gorev22-dalga5 | ERTELENDİ | Kapsam dışı | — |
| faz4-alarm-cron-donduruldu | "Aktif kısıt" | ⚠️ Bayat — dondurma 16 Tem'de kalktı | Log düzeltilecek |
| kiymetli-madenler-plan / viop-*-plani | PLAN | ✅ Hepsi uygulandı (maden-v1, viop-nedir canlı) | — |

---

## FAZ 1 — Geçmiş iş durumu doğrulaması 🔄

- [x] **1.1a CRON_SECRET rotasyonu** · **Geçti** · — · GitHub secret güncel; 24-25 Tem'de tüm zamanlanmış cron'lar yazıyor (hisse/enstruman/KAP/bilanço/fon/halka-arz).
- [ ] **1.1b Cloudflare cache purge stratejisi** · **Test Edilmedi** · MAJOR
- [x] **1.1c KAP production endpoint** · **Geçti** · — · Feature-flag YOK; tek kaynak `kap.org.tr` açık JSON API (VYK/demo tamamen kaldırılmış). Prod'da bildirimler akıyor (1064 satır).
- [ ] **1.2 Yahoo Finance bağımlılığı** · **Kısmen** · **MAJOR-2** · Hisse fiyat/grafik/getiri/risk, döviz+maden, temettü ve halka arz işlem-sinyali Yahoo'ya bağlı. Bilinen kırılganlık: Vercel IP'sinden **uzun UA ile 429** (kısa UA ile aşıldı — bkz. [[yahoo-vercel-ua]] notu). Yedekler: döviz için Frankfurter fallback var; hisse fiyatı için yedek YOK. **Barış kararı:** launch trafiğinde Yahoo kesintisi = fiyatların durması. Risk kabul edilebilir mi, yoksa ikincil kaynak (Stooq/TradingView) eklensin mi?
- [x] **1.3 Son modüllerin gerçek durumu** · **Geçti** · — · Yukarıdaki tabloda tek tek doğrulandı (5 modül canlı).

---

## FAZ 5 — GÜVENLİK (öncelikli faz) 🔄

- [x] **5.1 Kullanıcı veri izolasyonu (RLS) — fiili test** · **Geçti** · — · İki gerçek test hesabıyla: A, B'nin `portfoy`/`alarmlar`/`watchlist`/`bildirimler`/`analizler`/`risk_profil` satırlarını **göremiyor, silemiyor**; `user_id=eq.B` ile zorlamada da boş. App API route'ları sahte token'a 401. **Sızıntı yok.**
- [x] **5.1b Anon (girişsiz) erişim** · **BLOCKER — KAPANDI** · 🔴 · **`get_email_by_username` RPC'si anon'a GRANT'liydi: kullanıcı adından E-POSTA dönüyordu** (KVKK + phishing/enumeration). Kanıt: anon çağrısı HTTP 200 + gerçek e-posta. **Düzeltildi** (`efeaa3b`): giriş `/api/giris` ile sunucuya taşındı — e-posta istemciye hiç dönmez, IP başına 10/5dk kaba-kuvvet limiti, "kullanıcı yok" ile "şifre yanlış" aynı mesaj. RPC + 3 fonksiyon `PUBLIC`'ten revoke edildi. Doğrulama: 4/4 anon çağrısı 401.
- [x] **5.1c Rate limit bypass** · **BLOCKER — KAPANDI** · 🔴 · `rate_limits_temizle()` anon'a açıktı (HTTP 204) → rate limit tablosu dışarıdan silinip **AI limitleri bypass** edilebilirdi (maliyet patlaması). Revoke edildi, doğrulandı.
- [x] **5.1d profiles aşırı geniş okuma** · **MAJOR — KAPANDI** · 🟠 · Policy `USING (true)` idi: giriş yapmış herkes **27 kullanıcının** username/full_name/avatar'ını okuyabiliyordu. Kendi satırına daraltıldı; müsaitlik kontrolü kişisel veri dönmeyen `username_musait` RPC'sine taşındı. Doğrulama: A artık yalnız 1 profil görüyor.
- [x] **5.2 Client'ta secret sızıntısı** · **Geçti** · — · `.next/static` içinde SERVICE_ROLE / ANTHROPIC / CRON_SECRET / RESEND anahtarlarının hiçbiri yok (0 dosya).
- [ ] **5.3 AI/maliyetli endpoint rate limiting** · **Test Edilmedi** · BLOCKER adayı · `/api/analiz` 10/saat + chatbot kotası var görünüyor, fiilen test edilecek.
- [ ] **5.4 Sayfa yükleme hızı (bilanço/KAP ağır sayfalar)** · **Test Edilmedi** · MAJOR
- [x] **5.5 Cron'ların prod sağlığı** · **Geçti** · — · 9 workflow, son koşular yeşil; halka-arz cron `hata:0`.
- [ ] **5.6 Supabase advisor kalan uyarıları** · **Kısmen** · 🟡 MINOR · `function_search_path_mutable` (set_updated_at, sync_portfoy_fiyat); waitlist'te çift INSERT policy; `avatars` bucket listelemeye açık. Hiçbiri veri sızdırmıyor, launch'ı engellemez.
- [ ] **5.7 Leaked password protection** · **Geçmedi** · 🟠 **MAJOR-4** · Supabase Auth'ta kapalı. **Barış:** Dashboard → Authentication → Password → "Leaked password protection" aç (1 dk).
- [ ] **5.8 Test kullanıcılarını temizle** · **Geçmedi** · 🔴 **BLOCKER-3** · `pk-test-a@example.com`, `pk-test-b@example.com` prod DB'de + B'nin portfoy/watchlist satırları. Launch öncesi silinecek.

---

## FAZ 2 — İşlevsel test (sayfa sayfa) ⏳

- [ ] 2.1 Ana sayfa / landing · **Test Edilmedi**
- [ ] 2.2 Hisse listesi + tekil hisse (farklı sektörler) · **Test Edilmedi**
- [ ] 2.3 Döviz ve Kıymetli Maden (9 çift + madenler) · **Test Edilmedi**
- [ ] 2.4 Bilanço bölümü · **Test Edilmedi**
- [ ] 2.5 KAP haberleri · **Test Edilmedi**
- [ ] 2.6 Halka Arz Takvimi (liste + detay) · **Test Edilmedi**
- [ ] 2.7 AI analiz butonu (her modül; cache + boş veri davranışı) · **Test Edilmedi**
- [ ] 2.8 Fiyat alarmı kurma · **Test Edilmedi**
- [ ] 2.9 Portföy ekleme/görüntüleme · **Test Edilmedi**
- [ ] 2.10 Kayıt / giriş / şifre sıfırlama · **Kısmen** · Giriş akışı bu oturumda değişti (sunucu tarafı) — API seviyesinde 3 senaryo geçti; **UI'dan uçtan uca test edilecek** + kayıt/şifre sıfırlama.
- [ ] 2.11 Arama/filtreleme · **Test Edilmedi**
- [ ] 2.12 404 / hata sayfaları · **Test Edilmedi**
- [ ] 2.13 **Pro/premium referansları** ("Çok Yakında" + ödeme akışına gitmemeli) · **Test Edilmedi** · MAJOR adayı · Tespit: `app/pro`, AppShell'de "Pro'ya Yükselt" kartı, profile/login/chatbot'ta is_pro referansları.

## FAZ 3 — Tutarlılık ve UX ⏳
- [ ] 3.1 Terminoloji · 3.2 Görsel tutarlılık · 3.3 Gecikme uyarıları · 3.4 "Yatırım tavsiyesi değildir" · 3.5 Loading state · 3.6 Boş veri · 3.7 Türkçe dil kalitesi — **hepsi Test Edilmedi**

## FAZ 4 — Mobil / cross-browser ⏳
- [ ] 4.1 Mobil genişlik (tablolar, kartlar) · 4.2 Chrome/Safari/Firefox · 4.3 Dokunma hedefleri — **Test Edilmedi**

## FAZ 6 — Yasal ⏳
- [ ] 6.1 KVKK / gizlilik / kullanım şartları (sayfalar var: `/kvkk`, `/gizlilik`, `/kullanim-sartlari`, `/risk-uyarisi`) — footer erişimi + güncellik **Test Edilmedi**
- [ ] 6.2 Çerez onayı · 6.4 "Yatırım tavsiyesi değildir" görünürlüğü — **Test Edilmedi**
- [x] 6.3 Ödeme akışı kapsam dışı · **Kapsam Dışı** · Yalnız 2.13 kontrolü yapılacak

## FAZ 7 — SEO ve izlenebilirlik ⏳
- [ ] 7.1 sitemap.xml (yeni modüller: halka-arz, doviz-maden, fon?) · **Test Edilmedi** · MAJOR adayı
- [ ] 7.2 robots.txt · 7.3 meta/OG — **Test Edilmedi**
- [ ] **7.4 Sentry + uptime** · **Geçmedi** · 🟠 **MAJOR-3** · `@sentry/nextjs` paket var ama sentry config dosyası YOK, DSN kurulmamış.
- [x] 7.5 Analytics · **Geçti** · — · GA4 kurulu (`G-0H2KJGRV6D`, layout.tsx).
- [ ] 7.6 Resend SPF/DKIM/DMARC + spam testi · **Test Edilmedi** · MAJOR adayı

## FAZ 8 — Launch günü ⏳
- [ ] 8.1 DB yedekleme · 8.2 Feature flag'ler · 8.3 Vercel/Supabase plan limitleri · 8.4 Favicon/OG görselleri — **Test Edilmedi**

---

## Kapanan bulgular (kanıtlı)

| # | Bulgu | Önem | Commit | Doğrulama |
|---|---|---|---|---|
| 1 | Anon → kullanıcı adından e-posta okuma | 🔴 BLOCKER | `efeaa3b` | anon RPC 401; giriş 3 senaryo geçti; yanıtta e-posta yok |
| 2 | `rate_limits_temizle` anon'a açık → limit bypass | 🔴 BLOCKER | `efeaa3b` | anon 401 |
| 3 | profiles `USING(true)` → 27 kullanıcının kişisel verisi | 🟠 MAJOR | `efeaa3b` | A artık 1 profil görüyor; `username_musait` çalışıyor |

---

## ŞU AN NEREDEYİM

**25 Tem 2026 — FAZ 0 bitti, FAZ 5'in güvenlik çekirdeği (5.1/5.2) bitti, FAZ 1 %80.**

Bu oturumda **2 BLOCKER + 1 MAJOR bulundu ve kapatıldı** (hepsi gerçek sızıntıydı, en ciddisi girişsiz kullanıcıların kullanıcı adından e-posta okuyabilmesiydi). RLS çapraz-kullanıcı izolasyonu iki gerçek hesapla test edildi ve **sağlam** çıktı; client bundle'da secret yok.

**Sonraki oturum sırası:**
1. **BLOCKER-3**: test kullanıcılarını sil (`pk-test-a/b@example.com` + B'nin portfoy/watchlist satırları) — FAZ 5.8.
2. FAZ 5 kalanı: 5.3 (AI rate limit fiili test), 5.4 (sayfa hızı).
3. FAZ 2 (sayfa sayfa işlevsel test) — özellikle **2.13 Pro/premium referansları** ve **2.10 giriş UI'ı** (akış bu oturumda değişti, UI'dan doğrulanmalı).
4. FAZ 7.1 (sitemap yeni modüller) + 7.4 (Sentry) + 7.6 (e-posta SPF/DKIM).
5. FAZ 3/4/6/8.

**Barış'ın karar/aksiyonu gereken:** Yahoo bağımlılığı riski (MAJOR-2), Sentry DSN (MAJOR-3), Supabase leaked-password koruması (MAJOR-4), Cloudflare purge stratejisi (FAZ 1.1b).
