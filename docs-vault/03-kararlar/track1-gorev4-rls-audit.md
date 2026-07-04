# Track 1 / Görev 4 — RLS Audit ve Migration Durumu

**Tarih:** 4 Temmuz 2026 · **Branch:** `fable-track1` · **Durum:** Tamamlandı (grant değişikliğinin SQL Editor'de koşulması bekliyor)

## Bulgu özeti
Görev tanımı "RLS politikalarını migration olarak repoya al" idi; upstream'de bu büyük ölçüde yapılmış çıktı — `supabase/migrations.sql` (Kaan, Mayıs-Temmuz commit'leri) tüm çekirdek tabloların RLS'ini içeriyor. Audit sonuçları:

| Tablo | Politika | Denetim |
|---|---|---|
| watchlist, analizler, portfoy, alarmlar, bildirimler, risk_profil | `own_all` — `auth.uid() = user_id` (USING + WITH CHECK) | ✅ Sağlam |
| hisse_snapshots | herkes SELECT, yazma service role | ✅ Doğru (kamusal veri) |
| waitlist | herkes INSERT, SELECT yok | ✅ Doğru (sızıntı yok) |
| storage avatars | dosya adı `avatars/<uid>.*` desenli own-write, public read | ✅ Sağlam |
| chatbot_usage | select_own; yazma service role (Görev 3'te migration'a eklendi) | ✅ |
| rate_limits | RLS açık, policy yok — yalnız service role (Görev 3) | ✅ |
| **profiles** | `profiles_select_authenticated USING (true)` | ⚠️ **Bulgu → düzeltildi** |

## Profiles bulgusu ve karar
Giriş yapan her kullanıcı tüm profilleri **email dahil** okuyabiliyordu. Satır politikası daraltılamaz — [profile/page.tsx:74](../../app/profile/page.tsx) username müsaitlik kontrolü cross-profile SELECT'e ihtiyaç duyuyor. Karar: **kolon-seviyesi GRANT** (RLS + column grant birlikte uygulanır):
```sql
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, username, full_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
```
`email`, `is_pro`, `pro_until` artık yalnız service role'dan okunur — kod taraması bu üçünün client'tan hiç okunmadığını doğruladı (chatbot route service role kullanıyor). Alternatif (SECURITY DEFINER username-check RPC + own-row policy) client kodu değişikliği gerektirdiği için elenmiş; grant çözümü sıfır kod değişikliğiyle aynı sonucu veriyor.

## Diğer değişiklikler
- `.claude/CLAUDE.md` Supabase Tables listesine `chatbot_usage` + `rate_limits` eklendi; `profiles` açıklaması güncellendi.
- Root `CLAUDE.md`'ye docs-vault yönlendirme bölümü (önceki oturumdan bekleyen değişiklik) bu commit'le repoya girdi.

## Dağıtım notu
migrations.sql'in yeni REVOKE/GRANT bölümü SQL Editor'de koşulmalı (rate_limits bölümüyle birlikte tek seferde koşulabilir). Koşulmazsa mevcut davranış sürer (email görünür kalır) — işlevsel kırılma yok.

## Devam noktası
Sıradaki: Görev 5 (DashboardAiPanel dil düzeltmesi).
