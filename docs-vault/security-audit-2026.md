# ParaKonuşur — Güvenlik Denetimi 2026

**Başlangıç:** 17 Ağu 2026 · **Durum:** DEVAM EDİYOR
Önceki denetim: [[launch-checklist-2026]] FAZ 5 (25 Tem) — **tekrar edilmedi, üzerine inşa edildi.**

## 🔒 GÜVENLİK DURUMU

| Seviye | Bulundu | Kapatıldı | Açık |
|---|---|---|---|
| 🔴 KRİTİK | 0 | 0 | **0** |
| 🟠 YÜKSEK | 1 | 1 | **0** |
| 🟡 ORTA | 1 | 1 | **0** |
| 🔵 DÜŞÜK | 0 | 0 | 0 |

*(Önceki denetimde kapatılanlar dahil değil: 2 BLOCKER + 3 MAJOR — bkz. launch-checklist)*

### ⚠️ Launch öncesi mutlaka kapatılmalı
Şu an bu listede **madde yok** — bulunan 2 açık (B1 YÜKSEK, B2 ORTA) kapatıldı.
Denetim tamamlanınca güncellenecek.

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

## FAZ 3 — Input validation 🔄 (kısmi)

- [x] **3.1 `waitlist`** · 254 karakter üst sınırı + tip kontrolü eklendi (B1 ile birlikte).
- [x] **3.2 `analiz`** · ticker allow-list ile çözülüyor (bkz. FAZ 7.1).
- [x] **3.3 XSS — `dangerouslySetInnerHTML` taraması** · Kod tabanında 6 kullanım, **hepsi JSON-LD**.
  Kullanıcı içeriği doğrudan HTML olarak render edilmiyor. Ama bkz. **B2**.
- [ ] **3.4 Alarm/portföy form alanları (negatif fiyat, aşırı büyük sayı)** · Test edilmedi.
- [ ] **3.5 SQL injection** · Supabase client parametrize; ham SQL taraması yapılmadı.

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

## FAZ 6 — JWT / token 🔄
- [ ] Test edilmedi.

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

**Tamamlanan:** FAZ 0, 1 (secrets), 4 (IDOR), 5 (RLS — fiili anon testi), 7 (prompt injection).
**Kısmi:** FAZ 2 (envanter + B1 kapatıldı), FAZ 3 (XSS taraması + 2 alan doğrulandı).

**Bu denetimde 1 YÜKSEK + 1 ORTA bulundu, ikisi de kapatıldı. KRİTİK açık yok.**

Sıradaki: FAZ 2.3-2.4 (Supabase Auth limitleri, public okuma yükü) → FAZ 3.4-3.5
(form validasyonu, ham SQL) → FAZ 6 (JWT/token) → FAZ 8 (araştırma) → FAZ 9 (kapanış).
