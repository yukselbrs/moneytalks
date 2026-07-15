# Faz 4 / Görev 17 — Chip: Büyüklük Şartı + Sektör Yönlü (A.8/B.9)

**Tarih:** 15 Temmuz 2026 · **Durum:** Tamamlandı

1. "Endeks yönlü" artık `|hisse| ≤ 2.5×|endeks|` şartıyla basılıyor — -%10 tavan/taban hareketine endeks etiketi yapıştırılmıyor (yanlış-atıf fix'i).
2. `/api/neden` sektör ortalaması döndürüyor (bist-companies.sektor + hisse_snapshots.degisim_yuzde, ≥3 hisseli sektörler); KAP ve endeks açıklamıyorsa "Sektör yönlü" chip'i (aynı 2.5× büyüklük şartıyla). Canlı: Ulaştırma +0,47 / Finans +0,76 doğru hesaplandı.
3. Hisse detayına chip taşıma bilinçli atlandı: hisse sayfası zaten risk kartı+neden satırı kazandı; chip'in oradaki karşılığı Akşam Raporu kartı (Dalga 4) — mükerrer yüzey açmamak için.
