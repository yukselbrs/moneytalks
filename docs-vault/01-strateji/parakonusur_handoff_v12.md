# ParaKonuşur — Handoff v12

**Tarih:** 15 Temmuz 2026
**Önceki:** [[parakonusur_handoff_v10]] (Track 1) · Faz 3 denetimi: [[2026-07-tam-audit]]
**Durum:** Faz 4 Dalga 1-4 tamamlandı (`fable-faz4` → main); Dalga 5 + web push bilinçli ertelendi.

---

## TL;DR

Faz 3 audit'inin KAP-dışı tüm kritik bulguları kapatıldı (Dalga 1), gözlemlenebilirlik+test altyapısı kuruldu (Dalga 2), 7 özellik yükseltmesi yapıldı (Dalga 3) ve **Akşam Raporu v1** canlıya hazır (Dalga 4). KAP'a bağlı hiçbir şeye dokunulmadı (MKK görüşmesi sürüyor). Kaan'ın makro radarı ve TEFAS kaşifi korunup güçlendirildi.

## Dalga özetleri (karar notları: `03-kararlar/faz4-gorev*.md`)

- **Dalga 1 (`c3e3459`):** Chatbot boş-gövde → 400; yıldız hatasına toast+retry; `createBrowserClient`'a geçiş (tek oturum deposu — **deploy sonrası herkes bir kez yeniden giriş yapar**) + `useSession` hook'u; Faz 3'ün "oturum yarışı" bulgusu büyük ölçüde test-sekmesi artefaktı çıktı; mobil "N" butonu = Next dev göstergesi (bulgu kapandı, gösterge sağ-alta alındı); **makro taban kaldırıldı → kademeli harman** (THYAO 52→40 doğrulandı) + `makroKatki` şeffaflık satırı; chatbot `****` artefakt temizliği.
- **Dalga 2 (`559410f`):** Sentry (DSN'siz no-op) + `hataYakala` + **5 cron'da `hata` sayacı** + workflow'larda hata-grep (sessiz başarısızlık sınıfı bitti — A.1 artık Actions'ta kırmızı görünür, fix'i ayrı iş); Vitest 21 test (Wilder RSI, beta, fixed-window); `.bak`/WaitlistCTA temizliği; @anthropic-ai/sdk 0.111, next 16.2.10; **fon-snapshot GH Actions'a taşındı, vercel.json crons boş** (tek düzlem).
- **Dalga 3 (`e0a3bac`):** `GET /api/hisse-ozet` (15sn cache'li; analiz route'u artık veri servisi değil); risk kartına "Neden bu skor?" (top-3 bileşen + makro katkı); **chatbot tool döngüsü stream içine taşındı** — canlı "Fiyat verisi çekiliyor…" status'ları + "🔔 Bu alarmı kur" butonu (alarmTaslak köprüsü); chip'lere 2.5× büyüklük şartı + **"Sektör yönlü"** chip'i (canlı doğrulandı); **/karne sayfası + GET /api/karne** (cron beklemeden, `lib/karne.ts` ortak çekirdek) + karne e-postasına hafta deltası (`karne_gonderim.ozet`); fon detayına **kategori medyan kıyası**.
- **Dalga 4 (`78b43a8`):** **Akşam Raporu v1** — hafta içi 18:35'te portföy/izleme sahibi herkese kişisel gün sonu özeti (değer-ağırlıklı hareket + XU100 kıyası + en etkili pozisyon + sektörü + izleme hareketleri), in-app+e-posta, `aksam_raporu_gonderim` idempotency, `?dry=1` canlı doğrulandı (9 kullanıcı). KAP cümlesi ve Claude harmanı bilinçli dışarıda. `portfoy.tur` kolonu hazırlandı (fon pozisyonları için).

## Deploy sonrası MANUEL adımlar (Barış)

1. **Supabase SQL Editor:** `supabase/migrations.sql`'i baştan sona koş (idempotent). Yeni: `karne_gonderim.ozet`, `aksam_raporu_gonderim`, `portfoy.tur`. Koşulmazsa: karne cron insert'i düşer, akşam raporu hiç gönderilmez (mükerrer gönderim riski YOK).
2. **Vercel:** deploy sonrası Cron Jobs sekmesi BOŞ olmalı; `SENTRY_DSN` env'i eklenince Sentry aktifleşir (yoksa console-only, sorun değil).
3. **GitHub Actions:** 6 workflow görünmeli (alarm, snapshot, kap, karne, fon, **aksam-raporu**); ilk koşularda `hata` alanı kontrol et — artık `"hata":>0` job'ı kırmızı yapar.
4. **Cloudflare** Purge Everything.
5. **CRON_SECRET rotasyonu** hâlâ sende ([[track1-gorev2-cron-secret-rotasyonu]] — artık 6 workflow'u kapsıyor, tek GitHub secret).
6. Kullanıcılara not: oturum deposu değişti — herkes bir kez yeniden giriş yapacak.

## Açık işler

**KAP'a bağlı (MKK bekleniyor — bilinçli dondurulmuş):** A.1 cursor fix'i (2 satır + tek SQL: `fetchSonIndex`'te `son_index===0 → guncel-30` + prod'da cursor UPDATE) · A.5 KAP feed tarihi · B.6 izleme KAP sekmesi · B.8 backfill/presentation · B.11 SEO envanteri · C.2/C.3/C.5 · Akşam Raporu'na KAP korelasyon cümlesi. *Not: Dalga 2 sayesinde A.1 artık Actions'ta görünür hata.*

**KAP'sız açık işler:** Web push (B.5 — [[faz4-gorev16-web-push-ertelendi]], sonraki oturumun ilk maddesi) · Dalga 5 (Premium Pass 2a + sayısal hiyerarşi) · Fon karnesi kalanı (portföy fon UI + karne fon bloğu — [[faz4-gorev21-fon-karnesi-hazirlik]]) · Akşam Raporu'na opsiyonel Claude cümlesi (env flag'li) · CI'da `npm test` · chatbot canlı SSE status/alarm-butonu smoke testi (kod tamam, prod'da bir mesajla doğrula).

## Faydalı

```bash
npm test                         # 21 birim testi
# Akşam raporu dry-run (yan etkisiz):
curl -s "https://www.parakonusur.com/api/cron/aksam-raporu?dry=1" -H "Authorization: Bearer $CRON_SECRET"
# Karne web görünümü: /karne (giriş gerekli)
```
