# AI Analizlerine Haber + Döviz Tutarlılık + Portföy KAP Maili (19 Tem 2026)

**Durum: KOD TAMAMLANDI, push edildi.** Üç kullanıcı isteği tek turda uygulandı. İki operasyonel engel (Barış'ta) aşağıda.

## 1. Hisse AI analizine KAP haberi enjeksiyonu
`app/api/analiz/route.ts` — yeni `kapHaberMetni(ticker)`: `kap_bildirimleri` tablosundan (zaten özetlenmiş + SPK-filtreli) ilgili ticker'ın son 5 bildirimini çeker (`tickerlar` contains + `ozet_tek_cumle` not null, tarihe göre), prompt'a "Şirkete dair son KAP bildirimleri" bloğu olarak ekler. Hem tam analizde (Piyasa Konumu + Dikkat Noktaları'na dahil et talimatı) hem 1-cümlelik kısa yorumda kullanılıyor. Veri yoksa boş döner (zarar yok).
- **Döviz/maden analizine haber EKLENMEDİ** — bilinçli: KAP enstrümana-özgü şirket haberi döviz/madende yok. Döviz tarafı temel çerçevede (faiz/MB politikası) zaten makro bağlam alıyor.
- `content[0]` yerine tüm text blokları birleştirilerek okunuyor (sonnet thinking bloğu güvenliği).

## 2. Döviz/maden AI analizi tutarlılığı (USD/TRY sorunu)
**Şikayet:** USD/TRY analizi "40'ın altına düşerse sıkıntı başlar" diyordu; ama 40 = 1 yıl önceki seviye, USD/TRY yapısal yükselişte — oraya inmek olağanüstü bir tersine dönüş gerektirir, asıl risk gibi sunmak yanıltıcı. Kök neden: prompt "1 yıllık aralık uçlarını destek/direnç olarak anabilirsin" diyordu; trend'li enstrümanda bu mekanik yorum yanlış.

**Çözüm** (`app/api/doviz-maden/analiz/route.ts`):
- **Veri bloğu zenginleşti:** `trendEtiketi()` (1y/5y getiriden "güçlü/ılımlı yükseliş/düşüş (çok yıllık yapısal trend)"), `bandKonum()` (fiyatın banttaki %konumu), ayrıca **son 1 aylık aralık** eklendi. Böylece model destek/direnci güncel harekete anchor'layabiliyor, yıllık uca değil.
- **Prompt talimatı değişti:** trend'liyse 1y uçlarını mekanik destek/direnç kullanma; "X'in altına inerse sıkıntı" gibi düşük olasılıklı eşikleri asıl risk gibi sunma; destek/direnci öncelikle son 1 aya göre tanımla; trendin yön/gücünü açıkça belirt; yıllık uç seviyeyi anacaksan trende göre ne kadar uzak/gerçekçi olduğunu söyle.

## 3. Portföydeki hisseye KAP haberi → e-posta
`app/api/cron/kap-bildirimleri/route.ts` — `bildirimGonder()` yeniden yazıldı. Eskiden yalnız **izleme listesi** (watchlist) sahiplerine mail gidiyordu; artık **izleyenler ∪ portföyünde tutanlar** (birleşim). Portföy sorgusu `tur='hisse'` ile sınırlı (döviz/maden pozisyon kodları KAP ticker'ıyla eşleşmez zaten). E-postalar tek `profiles` sorgusuyla toplanıyor (embed yerine — PGRST200 riski yok). Idempotency `kap_bildirim_gonderim (bildirim_id, user_id)` essiz kısıtıyla korunuyor: hem izleyip hem tutan kullanıcı tek mail alır, eş zamanlı cron çift göndermez.

## Doğrulama
- tsc temiz, production build temiz (3 route derleniyor).
- Özellik 2 canlı LLM testi **YAPILAMADI** — `ANTHROPIC_API_KEY` kredi bakiyesi tükenmiş (API 400: "credit balance too low"). Değişiklik deterministik prompt/veri düzenlemesi; `bandKonum`/`trendEtiketi` mantığı elle doğrulandı (USD/TRY: 1y bandında %99, son 1a bandında ~%70, "ılımlı yükseliş (çok yıllık yapısal trend)").
- Özellik 1 için `kap_bildirimleri` tablosu **şu an boş** (0 satır) → enjekte edilecek haber yok; kod boş dönüyor (zarar yok), tablo dolunca otomatik devreye girer.

## ⚠️ AÇIK ENGELLER (Barış — kod değil, operasyon)
1. **ANTHROPIC_API_KEY kredisi bitti.** Sitedeki TÜM AI özellikleri (hisse/döviz analizi, chatbot, KAP özetleme) şu an çalışmıyor olabilir. Plans & Billing'den kredi yüklenmeli — bu yapılmadan ne yeni haber enjeksiyonu ne döviz analizi görünür.
2. **KAP pipeline'ı tabloyu doldurmamış** (0 satır). Muhtemelen cron'lar CRON_SECRET uyuşmazlığından 401 alıyor (bkz. [[alarm-cron-fix-2026-07-16]], [[track1-gorev2-cron-secret-rotasyonu]]). GitHub Actions secret'ı Vercel'deki `CRON_SECRET` ile eşitlenmeli. Eşitlenince cron KAP'ı ücretsiz kaynaktan çekip özetler (kredi de gerekir) → hem haberler zenginleşir hem portföy/izleme mailleri gider.

İlgili: [[kap-ucretsiz-kaynak-uygulama]] · [[doviz-kiymetli-maden-implementasyon-log]] · [[track1-gorev11-neden-karti]]
