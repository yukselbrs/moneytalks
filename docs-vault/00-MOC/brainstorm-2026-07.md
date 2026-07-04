# Brainstorm — Temmuz 2026: Sonraki Büyük Yön

**Tarih:** 4 Temmuz 2026 · **Dayanak:** [[2026-07-analiz-raporu]] (Görev A-G bulguları)
**Öncelik sırasına göre 5 fikir.** Efor tahminleri part-time tempoya göre net efordur; takvimde 2× planlanmalı.

---

## 1. "KAP Tercümanı" — bildirim → 30 saniyede sade Türkçe özet + kişisel bildirim ⭐

**Ne:** KAP'a bildirim düşer → tip sınıflandırıcı → Claude ile 3 katmanlı özet (tek cümle / "bu ne demek" / portföy-izleme bağlamı) → izleme listesinde o hisse olan kullanıcıya e-posta/push. Her özet bir kez üretilir, cache'ten herkese servis edilir.

- **Neden şimdi:** Midas Piyasa Rehberi *genel* özet+bildirimi ücretsiz kapattı (Mayıs 2026) — kişisel + KAP-derin versiyonun penceresi tahminen 6-12 ay. Fintables ₺149'a AI indirdi; fiyatla farklılaşma bitti, ürünle farklılaşma tek yol. KAP demo erişimi ve `haberler` route iskeleti hazır; alarm/e-posta altyapısı (Resend) çalışıyor.
- **Efor:** 2-3 hafta (demo pipeline + sınıflandırıcı + prompt şablonları + bildirim entegrasyonu); production geçişi MKK takvimine bağlı — demo ile tamamı kodlanabilir.
- **Etki:** Ürün kimliğinin kendisi. "Haber Alarmı: Yakında" rozetini gerçek özelliğe çevirir; Boşluk 1'i fiilen işgal eder; chatbot/analiz AI'ına da bağlam verisi sağlar (E.2'deki girdi tavanını kırar).
- **Boşluk/ihtiyaç:** Boşluk 1 (ana fırsat) + "bir şey oluyor ama anlamıyorum" kaygısı.

## 2. Programatik SEO — bildirim & hisse açıklama sayfaları

**Ne:** Her KAP bildirimi için otomatik, indekslenebilir sayfa ("GUBRF bedelsiz sermaye artırımı ne anlama geliyor?") + 50 pilot hisse için zenginleştirilmiş hisse sayfası (ISR, sitemap, schema.org). #1'in çıktısını yeniden kullanır.

- **Neden şimdi:** SEO'nun 3-6 aylık indeksleme gecikmesi var — **takvimsel olarak en geç kalınamayacak iş**; Eylül lansmanında trafik isteniyorsa Temmuz'da başlamalı. Dağıtım kanalı sıfır (organik edinim yok) ve ücretli edinimle Midas/Fintables'a karşı savaş kaybedilir.
- **Efor:** 1 hafta (şablon + ISR + sitemap); içerik #1'in pipeline'ından ücretsiz gelir. #1'e bağımlı ama demo verisiyle şablon bugün kurulabilir.
- **Etki:** Tek sürdürülebilir, sıfır-marjinal-maliyetli edinim motoru; her bildirim = yeni sayfa envanteri.
- **Boşluk/ihtiyaç:** Dağıtım zayıflığı (rapor A.2/2.3) + Boşluk 1'in dağıtım bacağı.

## 3. "Neden Düştü / Neden Çıktı?" kartı v1

**Ne:** Gün sonunda anormal hareket eden hisseler (mevcut hacim anomalisi + momentum faktörleri) için otomatik "olası nedenler" kartı: aynı gün KAP bildirimi eşleşmesi + endeks/sektör hareketi karşılaştırması. "Kesin neden" değil, kaynaklı olasılık dili.

- **Neden şimdi:** Hiçbir rakipte yok (Boşluk 2 hâlâ tamamen açık); atıf verisinin yarısı (anomali tespiti) risk motorunda zaten hesaplanıyor; dashboard'daki topMovers listesi bağlam chip'i için hazır yüzey (rapor G.12 buna zemin).
- **Efor:** 1 hafta (v1: yalnız KAP-eşleştirme + endeks karşılaştırma; döviz/sektör ayrıştırması v2).
- **Etki:** Günlük geri gelme (retention) davranışı — "bugün ne oldu" sorusunun cevabı; SEO'nun ikinci bacağı ("THYAO bugün neden düştü" aramaları); FOMO listesini eğitim yüzeyine çevirir (F.4).
- **Boşluk/ihtiyaç:** Boşluk 2 + günlük merak/kaygı anı.

## 4. Portföy Haftalık Karnesi (e-posta ritüeli)

**Ne:** Pazar akşamı e-postası: portföy risk özeti (değer-ağırlıklı skor zaten hesaplanıyor), sektör konsantrasyonu, haftanın portföy-ilgili KAP olayları, tek eğitim mikro-içeriği. Teşhis dili, asla eylem önerisi.

- **Neden şimdi:** Kod olarak **en hazır** boşluk: portföy risk skoru + Resend + risk açıklamaları sözlüğü mevcut; eksik olan sektör verisi (bist-companies.json'a sektör alanı) ve şablon. Premium'un çapa özelliği olarak fiyat testinden önce değer kanıtı üretir.
- **Efor:** 1 hafta (sektör verisi + hesap + e-posta şablonu + cron).
- **Etki:** Haftalık ritüel = retention; disposition-effect kıran dil için doğal kanal (F.2); "anlatan platform" konumunun portföy ayağı.
- **Boşluk/ihtiyaç:** Boşluk 3 + kayıp/panik yönetimi.

## 5. "Sakin Mod" — davranışsal farklılaşma olarak ürün duruşu

**Ne:** Varsayılan deneyimi "daha az bak, daha iyi anla" ekseninde yeniden çerçevele: fiyat flash animasyonları kapalı varsayılan, 15 sn polling → 60-90 sn, günlük tek "akşam özeti" bildirimi, K/Z'de göreli çerçeve (XU100 karşılaştırma chip'i), skorlarda risk dili (G.2/G.8 paketinin ürünleşmiş hali).

- **Neden şimdi:** Rakiplerin tamamı "daha çok bak, daha çok işlem yap" yüzeyinde yarışıyor (broker'ların geliri işlem hacmi). Broker-bağımsız tek oyuncu olarak "seni işlem yapmaya itmiyoruz" duruşu hem davranışsal literatürle (Barber-Odean) hem SPK konumuyla hem pazarlama hikâyesiyle hizalı — ve kopyalanması rakiplerin iş modeline aykırı olduğu için **yapısal olarak savunulabilir**.
- **Efor:** 3-4 gün (çoğu çerçeveleme/metin/ayar değişikliği); teknik yan faydası Vercel maliyet düşüşü (polling ↓).
- **Etki:** Marka konumu ("borsayı sana anlatan, seni borsaya yapıştırmayan platform"); churn üzerinde dolaylı, güven üzerinde doğrudan etki. Tek başına büyüme motoru değil — 1-4'ün üstüne anlatı katmanı.
- **Boşluk/ihtiyaç:** F bölümündeki davranışsal açı + güven kıtlığı (kategori sinyal-satıcılarıyla zehirlenmiş).

---

## Sıralama gerekçesi (tek bakışta)

| # | Fikir | Efor | Etki | Zaman baskısı |
|---|---|---|---|---|
| 1 | KAP Tercümanı | 2-3 hf | Ürün kimliği | Rekabet penceresi 6-12 ay |
| 2 | Programatik SEO | 1 hf | Tek organik kanal | İndeksleme gecikmesi → hemen |
| 3 | Neden düştü/çıktı v1 | 1 hf | Günlük retention + SEO#2 | Orta |
| 4 | Haftalık karne | 1 hf | Haftalık retention, premium çapası | Düşük |
| 5 | Sakin Mod | 3-4 gün | Konum/güven | Düşük (ama ucuz) |

**Önerilen yürütme:** 1 ve 2 paralel başlar (2, 1'in çıktısını tüketir); 3 → 4 → 5 sırayla. 1-3 tamamlandığında ürün, strateji raporundaki "olay-tetiklemeli anlatım platformu" tanımını ilk kez fiilen karşılar.

*İlgili: [[2026-07-analiz-raporu]] · [[parakonusur_strateji_raporu]] (Bölüm 3-4) · [[handoff-v9-fark-analizi]]*
