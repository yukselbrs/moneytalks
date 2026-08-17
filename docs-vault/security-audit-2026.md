# ParaKonuşur — Güvenlik Denetimi 2026

**Başlangıç:** 17 Ağu 2026 · **Durum:** TAMAMLANDI (kalan 2 madde Barış aksiyonu)
Önceki denetim: [[launch-checklist-2026]] FAZ 5 (25 Tem) — **tekrar edilmedi, üzerine inşa edildi.**

## 🔒 GÜVENLİK DURUMU

| Seviye | Bulundu | Kapatıldı | Açık |
|---|---|---|---|
| 🔴 KRİTİK | 0 | 0 | **0** |
| 🟠 YÜKSEK | 1 | 1 | **0** |
| 🟡 ORTA | 2 | 2 | **0** |
| 🔵 DÜŞÜK | 0 | 0 | 0 |

*(Önceki denetimde kapatılanlar dahil değil: 2 BLOCKER + 3 MAJOR — bkz. launch-checklist)*

### ⚠️ Launch öncesi mutlaka kapatılmalı
**Kod tarafında açık madde YOK.** Bulunan 3 açığın (B1 YÜKSEK, B2 + B3 ORTA) hepsi kapatıldı.

Kalan 2 madde **Barış'ın panelden yapması gereken** kontroller — kod değişikliği değil:
1. **Supabase Auth rate limit ayarları** (kayıt / şifre sıfırlama). Bu akışlar client'tan
   doğrudan Supabase'e gidiyor, bizim route'umuz yok → limit Supabase panelinde.
2. **Leaked-password protection** (launch checklist M-6, 1 dakikalık ayar).

---

## FAZ 0 — Devralınan bulgular (25 Tem, tekrar edilmedi)

| # | Bulgu | Seviye | Durum |
|---|---|---|---|
| D1 | Anon → kullanıcı adından e-posta okuma (`get_email_by_username`) | 🔴 BLOCKER | ✅ `efeaa3b` |
| D2 | `rate_limits_temizle()` anon'a açık → AI limit bypass | 🔴 BLOCKER | ✅ `efeaa3b` |
| D3 | `/api/risk-profil` Claude çağırıyor, limitsiz | 🟠 MAJOR | ✅ `ccfae43` |
| D4 | Test kullanıcıları prod DB'de | 🔴 BLOCKER | ✅ silindi |
| D5 | RLS çapraz-kullanıcı izolasyonu (2 gerçek hesap) | — | ✅ Geçti, sızıntı yok |

---

## FAZ 1 — Exposed keys / secrets ✅ TEMİZ

- [x] **1.1 Kaynak kod taraması** · Temiz. `sk-ant-`, `re_`, uzun JWT deseni: 0 eşleşme (`app`, `lib`, `components`, `scripts`, `sanity`).
- [x] **1.2 Production build çıktısı** · Temiz. `.next/static` içinde SERVICE_ROLE / ANTHROPIC / CRON_SECRET / RESEND / SANITY_API_TOKEN: **0 dosya**.
  `re_` için 3 dosya eşleşti ama **gerçek Resend key'i 0 dosyada** — alt dize yanlış pozitifi (`re_` başka kelimelerin içinde geçiyor). Doğrulama: `.env.local`'daki gerçek değer bundle'da aranıp bulunamadı.
- [x] **1.3 Git geçmişi** · Temiz. Hiç `.env*` commit'lenmemiş; `sk-ant-` / `service_role` / JWT deseni ile pickaxe taraması: eşleşme yok. **Rotasyon gerekmiyor.**
- [x] **1.4 .gitignore** · `.env*` ve `.env*.local` hariç tutulmuş ✓
- [x] **1.5 Client'a açılan değişkenler** · Kodda yalnız 3 tanesi kullanılıyor, üçü de client-safe:
  `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `NEXT_PUBLIC_APP_URL`
  (Anon key'in bundle'da olması **normal ve gerekli** — RLS ile korunuyor, bkz. FAZ 5.)

---

## FAZ 2 — Rate limiting 🔄

### Endpoint envanteri (45 route)
Tüm `app/api/**/route.ts` tarandı. Sınıflandırma:

| Grup | Sayı | Auth | Rate limit | Değerlendirme |
|---|---|---|---|---|
| Cron (`/api/cron/*`) | 10 | `verifyCronAuth` ✓ | — | Secret'la korunuyor, limit gereksiz |
| AI/maliyetli | 4 | ✓ | ✓ | `analiz` 10/sa · `chatbot` 20/dk+kota · `doviz-maden/analiz` ✓ · `risk-profil` 10/sa |
| Kullanıcı verisi | 6 | `requireUser` ✓ | — | Auth'lu; kötüye kullanım kullanıcı hesabına bağlı |
| Giriş | 1 | — | ✓ 10/5dk IP | `/api/giris` |
| Genel/okuma | 23 | — | — | Public piyasa verisi; çoğu upstream cache'li |
| Public yazma | 1 | — | ❌ → ✅ | **`/api/waitlist` — bulgu B1** |

- [x] **2.1 Bulgu B1 — `/api/waitlist` limitsiz** · 🟠 **YÜKSEK — KAPANDI**
  **Sorun:** Herkese açık POST, her istekte Supabase'e yazıyor **ve Resend ile e-posta gönderiyor**. Limit yoktu → spam + e-posta maliyeti + Resend itibar riski.
  **Düzeltme:** IP başına 5 kayıt / 10 dk + `email` için 254 karakter üst sınırı (regex şişmiş girdide pahalı; DB/Resend'e de sismiş veri gitmesin).
  **Doğrulama:** 1-5. istek `200`, 6. ve 7. istek `429` anlamlı Türkçe mesajla ✓
- [x] **2.2 Giriş brute force** · `/api/giris` 10/5dk IP ✓ (önceki denetim), aynı genel hata mesajı — kullanıcı numaralandırma kapalı.
- [ ] **2.3 Kayıt / şifre sıfırlama** · Supabase Auth'a **doğrudan client'tan** gidiyor (kendi API route'umuz yok) → limit Supabase tarafında. Supabase Auth rate limit ayarları panelden doğrulanmalı. **Test edilmedi.**
- [ ] **2.4 Public okuma uçlarında DB/upstream yük riski** · 23 endpoint. **Test edilmedi.**

---

## FAZ 3 — Input validation ✅

- [x] **3.1 `waitlist`** · 254 karakter üst sınırı + tip kontrolü eklendi (B1 ile birlikte).
- [x] **3.2 `analiz`** · ticker allow-list ile çözülüyor (bkz. FAZ 7.1).
- [x] **3.3 XSS — `dangerouslySetInnerHTML` taraması** · Kod tabanında 6 kullanım, **hepsi JSON-LD**.
  Kullanıcı içeriği doğrudan HTML olarak render edilmiyor. Ama bkz. **B2**.
- [x] **3.4 Alarm/portföy form alanları** · `alarmlar` **örnek düzeyde** (allow-list, enum,
  aralık, NaN). `portfoy` **açıktı** → **B4** ile kapatıldı.
- [x] **3.5 SQL injection** · Ham SQL **yok**. Yalnız 2 RPC çağrısı var, ikisi de parametreli:
  `username_musait(uname)` ve `rate_limit_hit(p_key, p_window_seconds, p_max)`. Diğer tüm
  erişim Supabase client query builder üzerinden (parametrize).

---

## 🟡 BULGU B2 — JSON-LD'de `</script>` kaçışı (ORTA, KAPANDI)

**Sorun:** `/kap/[index]` sayfası JSON-LD'ye `description: ozet_tek_cumle ?? konu` koyuyordu ve
`JSON.stringify` ile `<script>` etiketinin içine gömüyordu. **`JSON.stringify` `<` ve `>` karakterlerini
kaçırmaz** — içerikte `</script>` geçse tarayıcının HTML ayrıştırıcısı script'i erken kapatır,
sonrası HTML olarak yorumlanır → depolanmış XSS.

**Kanıt:**
```
JSON.stringify({d:"</script><script>alert(1)</script>"})
  -> {"d":"</script><script>alert(1)</script>"}     // dizi AYNEN duruyor
```

**Neden gerçek bir vektör:** o alan bizim yazdığımız metin değil — ya **AI özeti** ya da KAP'tan gelen
**şirket-beyanlı `konu`** metni. Sömürülme olasılığı düşük (KAP güvenilir kaynak, Claude çıktısı
kısıtlı) ama sınıf iyi bilinen ve düzeltmesi tek satır.

**Düzeltme:** `lib/json-ld.ts` → `jsonLdGuvenli()`; `<` ve `>` unicode kaçışına çevriliyor.
JSON geçerliliği bozulmuyor (ayrıştırıcı `\u003c` dizisini `<` olarak okur), HTML ayrıştırıcısı
etiket göremiyor. **6 JSON-LD kullanımının hepsinde** uygulandı (kap, hisse, doviz-maden, 3 eğitim).

**Doğrulama:** `/kap/1633009` → 200; JSON-LD hâlâ geçerli JSON (`JSON.parse` geçiyor),
ham çıktıda `<` karakteri **yok**. `/hisse/THYAO`, `/doviz-maden/usd-try`, eğitim sayfaları 200.

---

## FAZ 4 — IDOR ✅ (kod denetimi) / 🔄 (fiili test)

- [x] **4.1 Auth kapısı** · `lib/auth.ts` → `requireUser(req, supabase)`:
  Bearer token çıkarılır, desen kontrolü yapılır, **`supabase.auth.getUser(token)` ile SUNUCUDA doğrulanır**. İstemcinin gönderdiği hiçbir kimlik iddiasına güvenilmiyor. Token yok/geçersizse 401.
- [x] **4.2 Sahiplik filtreleri** · Kullanıcı verisi tutan tüm route'lar service role kullanıyor (**RLS bypass**), bu yüzden sahiplik kontrolü kodda olmak zorunda. Denetlendi:

  | Route | SELECT | UPDATE | DELETE |
  |---|---|---|---|
  | `portfoy` | `.eq(user_id)` ✓ | — | `.eq(user_id).eq(ticker)` ✓ |
  | `alarmlar` | `.eq(user_id)` ✓ | `.eq(id).eq(user_id)` ✓ | `.eq(id).eq(user_id)` ✓ |
  | `bildirimler` | `.eq(user_id)` ✓ | `.eq(id).eq(user_id)` ✓ | `.eq(id).eq(user_id)` ✓ |

  **Kritik nokta:** UPDATE/DELETE'lerde `id` TEK BAŞINA kullanılmıyor — her zaman `user_id` ile birlikte. Başka kullanıcının kaynağının id'si tahmin edilse bile sorgu 0 satır etkiler.
- [x] **4.3 `hesap-sil`** · Silinecek kullanıcı **token'dan** alınıyor (`auth.user.id`), body'deki `userId` kullanılmıyor ✓
- [x] **4.4 Auth'suz erişim testi** · `/api/portfoy`, `/api/alarmlar`, `/api/bildirimler`, `/api/karne` → hepsi **401** ✓
- [ ] **4.5 İki hesapla fiili çapraz erişim testi** · Önceki denetimde (25 Tem) yapıldı ve geçti; bu denetimde **tekrar edilmedi** — kod deseni değişmedi.

---

## FAZ 5 — RLS ✅ FİİLEN DOĞRULANDI

Politikanın "var olmasına" güvenilmedi — **anon key ile gerçek istek atıldı.**

- [x] **5.1 Anon OKUMA — özel tablolar** · 12 tablonun **hepsinden 0 satır**:
  `profiles` `portfoy` `alarmlar` `watchlist` `bildirimler` `analizler` `risk_profil`
  `chatbot_usage` `rate_limits` `waitlist` `kap_bildirim_gonderim` `kap_cursor`
- [x] **5.2 Anon OKUMA — public tablolar** · 8 tablo normal okunuyor (site bozulmadı):
  `hisse_snapshots` `kap_bildirimleri` `halka_arzlar` `ekonomik_takvim`
  `sirket_takvim_etkinlikleri` `bilanco_snapshots` `fon_snapshots` `enstruman_snapshots`
- [x] **5.3 Anon YAZMA** · *Okumanın engellenmesi yazmanın engellendiği anlamına gelmez* — ayrıca test edildi.
  9 tabloya INSERT denemesi: **hepsi 401 `new row violates row-level security policy`**.
  Public tablolarda anon UPDATE/DELETE: **0 satır etkilendi**.
- [x] **5.4 Service role yalnız server** · FAZ 1.2 ile doğrulandı (bundle'da 0 dosya).

## FAZ 6 — JWT / token ✅

- [x] **6.1/6.3 Token deposu — cookie, localStorage DEĞİL** · `components/lib/supabase.ts`
  `createBrowserClient` (@supabase/ssr) kullanıyor → oturum **cookie'de**. Kodda yorumla
  belgelenmiş: önceki `createClient` localStorage kullanıyordu ve OAuth cookie'siyle iki ayrı
  oturum deposu oluşuyordu; birleştirilmiş. Görevdeki "localStorage ise XSS riski" maddesi
  **bu projede geçerli değil**.
- [x] **6.2 Alg confusion / `none` algoritması** · **Bize uygulanamaz**: JWT'yi kendimiz
  doğrulamıyoruz. `jsonwebtoken` bağımlılığı yok, manuel decode yok — `supabase.auth.getUser(token)`
  doğrulamayı Supabase sunucusuna yaptırıyor.
- [x] **6.5 Logout** · `supabase.auth.signOut()` üç noktada (Navbar, AppShell, profil).
- [ ] **6.4 Token ömrü / refresh rotasyonu / şifre sıfırlama token'ı** · Supabase yönetiminde,
  **panelden doğrulanmalı** (Barış aksiyonu).

## FAZ 8 — AI-coded sitelerde yaygın açıklar ✅

Araştırma (2026 kaynakları): AI üretimi kodun %38'i açık içeriyor, örneklerin **%86'sı XSS'e
karşı savunmasız**, %19,7'si **var olmayan paket adı** (slopsquatting) içeriyor, CRUD
uygulamalarında model **yetkilendirme kontrolünü tamamen atlıyor**.
Kaynaklar: OX Security · CSA Labs · Georgia Tech Vibe Security Radar · SecurityWeek.

Bu üçü ParaKonuşur'a en uygun olanlar olduğu için seçildi (körü körüne kopyalanmadı):

- [x] **A8-1 XSS (%86)** · ParaKonuşur'da **gerçekten bulundu** → bkz. B2. Ek olarak CSP
  eksikliği tespit edildi → **B3** ile kapatıldı.
- [x] **A8-2 Broken access control / IDOR** · CRUD ağırlıklı ve service role (RLS bypass)
  kullanan bir yapı — tam risk profili. **Denetlendi, temiz** (bkz. FAZ 4).
- [x] **A8-3 Halüsinasyon bağımlılık (%19,7)** · 26 bağımlılığın **hepsi** npm registry'de
  kayıtlı — var olmayan paket adı **YOK**. Slopsquatting riski yok.
- [x] **A8-4 CORS wildcard** · `Access-Control-Allow-Origin` başlığı hiç dönmüyor →
  cross-origin okuma tarayıcı tarafından engelleniyor ✓
- [x] **A8-5 Production hata sızıntısı** · Test edilen uçlar temiz Türkçe mesaj dönüyor
  (`Giriş gerekli`, `Geçersiz ticker`, `bilinmeyen tip`) — stack trace / iç yol / SQL yok ✓

---

## 🟡 BULGU B3 — CSP yokluğu (ORTA, KAPANDI)

**Sorun:** Güvenlik başlıkları vardı (HSTS, X-Frame-Options, nosniff, Referrer-Policy,
Permissions-Policy) ama **Content-Security-Policy yoktu**. B2 gerçek bir XSS vektörü
olduğu ve araştırma XSS'i AI kodunun en yaygın açığı olarak gösterdiği için savunma
katmanı gerekiyordu.

**Düzeltme (bilinçli olarak dar kapsamlı):**
`object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`

**`script-src` BİLEREK eklenmedi:** Next.js inline script/style üretiyor; kısıtlamak için
nonce altyapısı gerekir — bu mimari bir değişiklik ve launch'a günler kala siteyi bozma
riski taşır. Eklenen dört direktif hiçbir mevcut davranışı bozmadan gerçek kazanç sağlıyor.
**Öneri:** launch sonrası nonce tabanlı `script-src` eklenmeli.

**Doğrulama:** build yeşil; `/`, `/dashboard`, `/hisseler`, `/takvim`, `/login`,
`/kap/1633009`, `/hisse/THYAO`, eğitim sayfası → **hepsi 200**.

---

## 🟡 BULGU B4 — `/api/portfoy` girdi doğrulaması yok (ORTA, KAPANDI)

**Sorun:** POST yalnız truthiness bakıyordu (`if (!ticker || !adet || !maliyet)`).
Aynı kod tabanında `alarmlar` doğru yapıyordu (allow-list + enum + aralık + NaN) —
`portfoy` istisnaydı. Kanıtlanan davranış:

| Girdi | Eski sonuç |
|---|---|
| `adet: -5` | kabul → negatif pozisyon |
| `adet: "abc"` | kabul → DB'ye **NaN** |
| `adet: 1e308` | kabul |
| `maliyet: -99` | kabul |
| `ticker: 123` | `.toUpperCase()` → **yakalanmamış 500** |
| `ticker: "'; DROP TABLE…"` | kabul → çöp satır (SQL enjeksiyonu değil, sorgular parametrize) |

**Düzeltme:** `alarmlar` standardına çekildi — tip kontrolü, `Number.isFinite`, pozitif +
üst sınır (`adet ≤ 1e9`, `maliyet ≤ 1e7`), ticker biçim/uzunluk kontrolü. DELETE de aynı
tip kontrolüyle korundu (aynı 500 riski oradaydı). Gövde `JSON.parse` hatası artık 400.

**Doğrulama:** yedi kötü girdi vakasının **hepsi 400**; geçerli hisse (`THYAO, 100, 330.5`)
ve **kesirli fon adedi** (`AFA, 12.3456, 1.05`) kabul ediliyor — fon desteği bozulmadı.
Auth akışı sağlam: auth'suz ve sahte token'lı istekler hâlâ **401**.

## FAZ 7 — Prompt injection ✅ (kod denetimi)

- [x] **7.1 `/api/analiz` — serbest metin YOK** · `body.ticker` → `tickerCozOverlayli()` ile
  BIST evrenine karşı çözülüyor; çözülemezse **400**. Keyfi metin prompt'a giremiyor.
  (Görev metnindeki FAZ 7.5 tam olarak bunu istiyordu: önceden tanımlı ID'lerle çalışma.)
- [x] **7.2 Chatbot — doğru mimari** · `anthropic.messages.create({ system: systemPrompt, messages: [...] })`.
  Sistem talimatı **ayrı parametre**, kullanıcı içeriği rol'lü mesajda — string birleştirme YOK.
  Bu, prompt injection'a karşı doğru yapısal ayrım.
- [x] **7.3 SPK çıktı filtresi** · `icerikGuvenli()` yasaklı ifade tararsa yeniden denenir, yine geçmezse hata.
- [x] **7.4 AI çıktısı XSS — BULGU B2 (aşağıda)** · 🟡 **ORTA — KAPANDI**

## FAZ 8 — AI-coded sitelerde yaygın 3 açık 🔄
- [ ] Araştırma yapılmadı.

---

## ŞU AN NEREDEYİM

**TAMAMLANDI.** Sekiz kategorinin hepsi incelendi.

**Bulunan: 1 YÜKSEK + 3 ORTA. Hepsi kapatıldı. KRİTİK açık YOK.**

| # | Bulgu | Seviye | Durum |
|---|---|---|---|
| B1 | `/api/waitlist` limitsiz (spam + e-posta maliyeti) | 🟠 YÜKSEK | ✅ |
| B2 | JSON-LD'de `</script>` kaçışı (depolanmış XSS) | 🟡 ORTA | ✅ |
| B3 | CSP yok | 🟡 ORTA | ✅ |
| B4 | `/api/portfoy` girdi doğrulaması yok | 🟡 ORTA | ✅ |

**Temiz çıkanlar:** secrets (kaynak + build + git geçmişi), IDOR/sahiplik, RLS (fiili anon
okuma+yazma testi), prompt injection, CORS, hata sızıntısı, halüsinasyon bağımlılık, SQL
enjeksiyonu, token deposu (cookie).

### Düzeltilmeyenler ve gerekçeleri
1. **Nonce tabanlı `script-src` CSP** — mimari değişiklik, launch'a günler kala riskli.
   Dar kapsamlı CSP ile kısmi koruma sağlandı (B3). **Öneri: launch sonrası.**
2. **Supabase Auth rate limit + leaked-password koruması** — panel ayarı, kod değil.
   **Barış aksiyonu.**
3. **FAZ 2.4 public okuma uçlarında yük testi** — güvenlik açığı değil, kapasite konusu;
   yük testi ayrı bir çalışma. 23 uç auth'suz ama hepsi public piyasa verisi.
4. **FAZ 4.5 iki hesapla fiili çapraz erişim testi** — 25 Tem'de yapıldı ve geçti; kod deseni
   değişmediği için tekrar edilmedi (prod'a test kullanıcısı açmamak için).
