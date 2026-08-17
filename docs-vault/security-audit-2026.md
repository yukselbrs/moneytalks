# ParaKonuşur — Güvenlik Denetimi 2026

**Başlangıç:** 17 Ağu 2026 · **Durum:** DEVAM EDİYOR
Önceki denetim: [[launch-checklist-2026]] FAZ 5 (25 Tem) — **tekrar edilmedi, üzerine inşa edildi.**

## 🔒 GÜVENLİK DURUMU

| Seviye | Bulundu | Kapatıldı | Açık |
|---|---|---|---|
| 🔴 KRİTİK | 0 | 0 | **0** |
| 🟠 YÜKSEK | 1 | 1 | **0** |
| 🟡 ORTA | 0 | 0 | 0 |
| 🔵 DÜŞÜK | 0 | 0 | 0 |

*(Önceki denetimde kapatılanlar dahil değil: 2 BLOCKER + 3 MAJOR — bkz. launch-checklist)*

### ⚠️ Launch öncesi mutlaka kapatılmalı
Şu an bu listede **madde yok**. Denetim tamamlanınca güncellenecek.

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

## FAZ 3 — Input validation 🔄
- [ ] Test edilmedi.

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

## FAZ 5 — RLS 🔄
- [ ] Test edilmedi (önceki denetimde çapraz-kullanıcı izolasyonu geçmişti; tablo tablo politika okuması yapılmadı).

## FAZ 6 — JWT / token 🔄
- [ ] Test edilmedi.

## FAZ 7 — Prompt injection 🔄
- [ ] Test edilmedi.

## FAZ 8 — AI-coded sitelerde yaygın 3 açık 🔄
- [ ] Araştırma yapılmadı.

---

## ŞU AN NEREDEYİM

FAZ 0, 1 ve 4 (kod denetimi) tamamlandı. FAZ 2 kısmi: endpoint envanteri çıkarıldı,
bulunan tek boşluk (`waitlist`) kapatıldı.

**Bu oturumda 1 YÜKSEK bulundu ve kapatıldı. KRİTİK açık yok.**

Sıradaki: FAZ 2.3-2.4 → FAZ 3 (input validation) → FAZ 5 (RLS tablo tablo) →
FAZ 6 (JWT) → FAZ 7 (prompt injection) → FAZ 8 (araştırma) → FAZ 9 (kapanış).
