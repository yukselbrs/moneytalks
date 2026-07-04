# Track 1 / Görev 1 — İzleme Arama Kapsamı Teşhisi

**Tarih:** 4 Temmuz 2026 · **Branch:** `fable-track1` · **Durum:** Tamamlandı (kod değişikliği gerekmedi)

## Bağlam
Rapor C.4 ve G.1, izleme sayfası aramasının 50 hisselik hardcode listeyle sınırlı olduğunu iddia ediyordu; ekip geri bildirimi bunun yanlış olduğu yönündeydi. Kök neden testi bu görevin kapsamıydı.

## Teşhis sonucu
İkisi de kısmen haklıydı — asıl neden **bayat local checkout**:
- Analiz raporu, origin/main'in **85 commit gerisindeki** local main üzerinden yazılmış (son local commit 9 Mayıs, remote'ta Kaan'ın Mayıs-Temmuz arası işleri vardı).
- Eski kodda izleme sayfasında gerçekten dosya-içi 50'lik `BIST_HISSELER` dizisi vardı; **güncel main'de bu liste kaldırılmış**, [izleme/page.tsx:10](../../app/izleme/page.tsx) `@/lib/bist-hisseler` import ediyor — o da `data/bist-companies.json`'ı (606 hisse) re-export ediyor.
- Davranış testi (simülasyon): `A1YEN` araması tam evrende bulunuyor. Repo genelinde inline hardcode hisse listesi kalmadı (grep doğrulandı).

## Karar
- Kod değişikliği yok; tek-kaynak hedefi upstream'de zaten sağlanmış.
- `2026-07-analiz-raporu.md` C.4 ve G.1 maddeleri "çözüldü (bayat checkout artefaktı)" olarak işaretlendi.
- **Süreç dersi:** Analiz/implementasyon öncesi her oturumda `git fetch` + behind kontrolü zorunlu (Kaan aynı repoya push yapıyor).

## Devam noktası
Sıradaki: Görev 2 (CRON_SECRET rotasyonu — commit öncesi onay gerekli).
