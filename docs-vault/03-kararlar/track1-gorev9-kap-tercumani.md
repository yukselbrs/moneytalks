# Track 1 / GÖREV 9 — KAP Tercümanı

**Tarih:** 4 Temmuz 2026
**Durum:** Kod tamamlandı; canlıya almak için 2 manuel adım gerekli (aşağıda)
**Referans:** brainstorm-2026-07.md Fikir 1; 2026-07-analiz-raporu.md Görev B Boşluk 1

## Ne yapıldı
Uçtan uca akış: KAP bildirimi → tip sınıflandırma → 3 katmanlı özet → cache → izleme listesi eşleşmesi → e-posta.

### Bileşenler (3 subagent + entegrasyon)
1. **Şema** (`supabase/migrations.sql` sonu, supabase-schema agent): `kap_bildirimleri` (disclosure_index UNIQUE = cache anahtarı; ozet_tek_cumle + ozet_ne_demek cache kolonları; durum akışı), `kap_bildirim_gonderim` (bildirim_id+user_id UNIQUE — e-posta idempotency), `kap_cursor` (artımlı polling). Ayrıntı: [[kap-tercumani-supabase-semasi]].
2. **Özet modülü** (`lib/kap-ozet.ts`, kap-explainer agent): kural bazlı `siniflandir()` (demo veride 9/9), `ozetUret()` (claude-sonnet-4-6, tip bazlı kılavuz, katı JSON, SPK çift savunma: prompt yasakları + `YASAKLI_KALIPLAR` regex + retry), `baglamMetni()` (3. katman — nötr şablon, Claude'a gitmez, kullanıcı başına maliyet 0).
3. **Cron** (`app/api/cron/kap-bildirimleri/route.ts` + `.github/workflows/kap-bildirimleri-cron.yml`, data-pipeline agent): 15 dk'da bir; cursor → disclosures → FON/kodsuz atla → detay → sınıfla → upsert → 5'li batch özet → 5'li batch gönderim; `maxDuration=60`.
4. **UI** (`app/alarmlar/page.tsx`, `components/AlarmModal.tsx`): "Yakında" rozeti kaldırıldı; "KAP Haber Bildirimleri" izleme listesi üzerinden otomatik çalıştığını anlatan aktif modal + /izleme CTA'sına bağlandı.

### Entegrasyonda yakalanan ve düzeltilen 3 sorun
- **Kuyruk açlığı:** gönderim aşaması bildirimi terminal duruma çekmiyordu → en eski 5 "ozetlendi" kayıt pencereyi sonsuza dek işgal ederdi. `bildirildi` durumu eklendi (CHECK + route).
- **E-posta HTML injection:** KAP/LLM kaynaklı metinler kaçışsız gömülüyordu → `kacisHtml()`.
- **Şirket adı halüsinasyonu:** `senderTitle` prompt'a gitmiyordu; model DGNMO'dan "Dağımlı" uydurdu → meta'ya şirket adı + "ticker'dan ad türetme" talimatı eklendi, aynı bildirimle yeniden test edildi, doğru ad geldi.

## Doğrulama
- tsc temiz; sınıflandırma 9/9 (gerçek demo verisi); 4 gerçek Claude özeti SPK filtresinden ilk denemede geçti (VERUS pay_geri_alim, ATAKP temettu, EGSER sermaye_artirimi, DGNMO ozel_durum).
- Uçtan uca test (4 Temmuz): demo bildirim 1230813 → sınıflandırma → gerçek Claude özeti → route şablonuyla Resend 200, `[TEST]` maili barisyuksel2020@gmail.com'a ulaştı.
- DB ayağı henüz canlıda doğrulanamadı (tablolar Supabase'de yok — aşağıda).

## Canlıya alma: manuel adımlar
1. **supabase/migrations.sql'i SQL Editor'de çalıştır** (idempotent; 3 yeni tablo kurulur). Sonra cron'u bir kez elle tetikle ve `{yeniBildirim, ozetlenen, epostaGonderilen}` sayaçlarını kontrol et.
2. **MKK production geçişi geldiğinde:** yalnız `KAP_API_URL` (+KEY/SECRET) env değişkenlerini değiştir — kod feature-flag'li, başka değişiklik gerekmez.

## Maliyet mimarisi
Özet bildirim başına BİR kez üretilir (`disclosure_index` cache); kullanıcı sayısı marjinal AI maliyetini etkilemez. Batch 5/çalıştırma × 96 çalıştırma/gün = teorik tavan 480 özet/gün; BIST günlük bildirim hacmi (FON hariç birkaç yüz) bunun altında.

## SPK güvenlik duruşu
Yönlendirici dil çift katmanla engelli (prompt + regex-retry-throw); 3. katman şablonu nötr ("izleme listendeki X hissesini ilgilendiriyor"); her e-postada KAP kaynağının aslına link + "yatırım tavsiyesi değildir" disclaimer'ı.
