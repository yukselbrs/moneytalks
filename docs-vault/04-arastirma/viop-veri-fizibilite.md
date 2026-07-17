# VİOP Veri Kaynağı Fizibilitesi

**Tarih:** 16 Temmuz 2026 · **Bağlam:** Kullanıcı sorusu "VİOP'tan hangi verileri çekebiliriz" → resmi BIST veri sayfası formatı araştırması. İlgili: [[rakip-analizi]] (Midas VİOP açtı), [[maden-v1-uygulama]] (ikinci varlık sınıfı deseni).
**Kapsam:** Sadece araştırma/fizibilite — kod yazılmadı, karar verilmedi.

## 1. VİOP'ta ne veri var (kontrat başına)
Endeks (XU030 ana + mini), tekil hisse, döviz (USD/TRY, EUR/TRY), kıymetli maden (altın ons/gram, gümüş), emtia, TLREF, tahvil vadeli+opsiyon sözleşmeleri. Alanlar: son fiyat, alış/satış, **uzlaşma fiyatı** (gün sonu), **açık pozisyon** (open interest), işlem hacmi/adedi, gün içi yüksek/düşük, vade; opsiyonlarda strike + call/put + örtük volatilite.

## 2. Erişim yolları (ampirik olarak sondalandı, 16 Tem 2026)

| Yol | Kapsam | Format | Güncellik | Erişim | Fizibilite |
|---|---|---|---|---|---|
| **Yahoo / TradingView** (mevcut) | ❌ türev yok, sadece XU030 spot | — | — | ₺0 | `F_XU030`/`XU100F.IS` yok; TV scanner `open_interest`/`expiration` = null. **Kullanılamaz** |
| **BIST resmi EOD sayfaları** | ✅ uzlaşma, açık pozisyon, hacim, üye kırılımı | **HTML tablo** (13 `<table>`), indirilebilir dosya | Gün sonu | ₺0, anahtarsız | Scrape edilebilir ama **kırılgan** (HTML yapısı değişir), ToS gri, **EOD-only** |
| **datastore.borsaistanbul.com** | ✅ tam + tarihsel | "download" + "api" (portal) | GZ/EOD | **Kayıt/ticari** | Resmi API yolu; lisanslı — strateji raporu veri rejimi (Faz 3+) |
| **Lisanslı vendor** (Matriks/Foreks/İdeal) | ✅ gerçek zamanlı | API | Canlı | Sözleşme + BIST lisans | Gerçek zamanlı tek meşru yol |

**Bulunan endpoint ipuçları:** settlement sayfası `datastore.borsaistanbul.com` + `/callback.json` referansları içeriyor; ama açık, dokümante, auth'suz bir gecikmeli-veri JSON endpoint'i **bulunamadı** (denenen `/data/viop/*` yolları 404). Veri gömülü HTML tablolarda.

## 3. Fizikbilite verdikti

- **Gerçek zamanlı VİOP → HAYIR** (ücretsiz yol yok; lisanslı vendor + BIST ekran ücreti gerekir — persona ve maliyet açısından şu an dışı).
- **Gün sonu (EOD) VİOP → ŞARTLI EVET, ama kırılgan.** BIST bülten/uzlaşma HTML tablolarını gün sonu scrape edip snapshot'lamak teknik olarak mümkün (maden modülü deseni: günlük cron → `viop_snapshots` tablosu → sayfa). Riskler: (a) HTML yapısı değişince kırılır — Sentry/hata-sayacı zorunlu, (b) ToS gri alan (BIST veri yeniden yayını lisansa tabi — türev içerik/özet için hukuki teyit şart), (c) yalnız EOD — "canlı VİOP fiyatı" beklentisini karşılamaz.
- **En temiz meşru yol** kayıt sonrası `datastore.borsaistanbul.com` (dosya/api) — ama ücret/koşul netleşmeli; bu KAP/MKK production geçişiyle aynı "resmi kaynak bekleniyor" kovasına girer.

## 4. Öneri
1. **v1 ücretsiz, sıfır risk:** VİOP kontratı çekme; onun yerine zaten sahip olduğumuz **dayanakları** (XU030 endeksi, USD/TRY, gram/ons altın — maden modülünde) "vadelinin izlediği" bağlamıyla göster. Eğitim çerçevesi: "VİOP XU030 vadelisi bu endeksi izler."
2. **Gerçek VİOP verisi istenirse:** önce `datastore.borsaistanbul.com`'a kayıt olup (a) ücretsiz EOD dosya var mı, (b) türev içerik/özet yayını lisansı hukuken uygun mu — bu ikisi netleşmeden kod yazılmamalı. Netleşirse maden deseninde EOD `viop_snapshots` + günlük cron 1-1,5 iş günü.
3. **Strateji sınırı korunmalı** ([[rakip-analizi]]): VİOP kaldıraçlı; "yeni başlayan" personasına sinyal/yönlendirme YOK, yalnız açık-pozisyon/uzlaşma gibi nesnel veriyi *anlatan* katman (Midas'tan farkımız terminal değil anlatım).

## 5. Açık sorular (kod öncesi cevaplanmalı)
- `datastore.borsaistanbul.com` kaydı ücretsiz EOD dosya/JSON veriyor mu, yoksa hepsi ücretli mi?
- BIST verisinin türev içerik (özet/gösterge) olarak yeniden yayını lisans/ToS açısından uygun mu? (avukat teyidi — KAP ile aynı kategori)
- Ürün gerçekten VİOP kontrat verisi mi istiyor, yoksa "altın/dolar vadeli fiyatı" beklentisi dayanak spot ile mi karşılanır? (kapsamı bu belirler)
