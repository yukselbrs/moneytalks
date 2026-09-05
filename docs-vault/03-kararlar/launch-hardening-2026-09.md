# Launch iyileştirmeleri — 5 Eylül 2026

## Sorun ve karar

Eksik fiyat/risk verisinin sıfır veya maliyet üzerinden hesaplanması, karışık varlık portföylerinde hisse kaynağının kullanılması ve grafik tarih etiketlerinin anahtar yapılması yanıltıcı sonuçlar üretiyordu. Fiyat kaynakları varlık türüne göre ortaklaştırıldı. Tam fiyat kapsamı yoksa toplam değer/getiri gösterilmez; risk eksikse skor üretilmez. Grafikler gerçek zaman damgaları ve ortak tarihler üzerinden birleşir. Fonların gün içi grafiği desteklenmez. Gösterilen geçmiş seri, mevcut pozisyonların fiyat değişimidir; nakit akışlarına göre yatırımcı getirisi değildir.

Pro haklarının istemci tarafından yazılması sütun izinleriyle engellenir. Profil formu yalnız kullanıcı tarafından düzenlenebilen alanları UPDATE eder. SQL geçişi uygulama yayını sonrasında uygulanmalıdır; eski upsert istemcisi ID güncelleme iznine ihtiyaç duyar.

OAuth dönüş adresleri aynı origin içindeki yollara sınırlandı. Chatbot günlük kotası mevcut benzersiz kullanıcı/gün kaydı üzerinde karşılaştırmalı atomik güncelleme ile ayrılır. Hak model çağrısından önce ayrılır; eşzamanlı istekler ücretsiz kotayı aşamaz. Model hatasında gönderim hakkı tüketilmiş olabilir. Ham AI metni filtrelenmeden kullanıcıya akıtılmaz; bütün yanıt denetlendikten sonra gösterilir. Bu filtre dilsel koruma sağlar, finansal doğruluk garantisi vermez.

## Tasarım ve ürün

Ana sayfa, gerçek fiyat önizlemesi ve iki net giriş yolu içeren yeni bir düzen kullanır. Ücretsiz kullanım sınırları görünürdür. Veri kaynakları/metodoloji sayfası eklendi. Uygulama kontrastı, klavye odağı, mobil dokunma alanları ve azaltılmış hareket tercihi iyileştirildi. Giriş/kayıt alanlarının erişilebilir adları ve otomatik doldurma amaçları tanımlandı. Forum hazır olmadığı için açıkça “Yakında” olarak işaretlendi.

Halka arz metadata ve canonical adresleri sunucuda üretilir, bulunmayan kayıtlar 404 döner. Sitemap halka arz detaylarını içerir, kişisel hesap sayfalarını içermez.

## Bağımlılıklar ve doğrulama

Mevcut sürüm aralıkları içinde güvenlik güncellemeleri yapıldı. Sanity CLI alt bağımlılıklarında adm-zip, js-yaml ve uuid için dar kapsamlı overrides kullanıldı. Audit sıfır açık. next-sanity defineLive ihracı var ancak SanityLive bileşeni render edilmiyor; v12 uyarısındaki canlı CMS akışı kullanılmıyor.

39 davranış testi (eşzamanlı kota dahil), 192 Pako kontrolü, TypeScript, uyarısız ESLint ve üretim build'i doğrulama kapsamındadır. GitHub Quality iş akışı bu kontrolleri tekrarlar. Mobil ve masaüstü ana sayfa, NETGL detay/sekme, oturumlu ekranlar kontrol edilir.

## Kapsam sınırları

Bu çalışma yatırım değerlemesi, yasal uygunluk sertifikası veya kapasite garantisi değildir. Forum ve ücretli plan henüz hazır değildir. Harici fiyat kaynaklarının gecikme/erişilebilirlik sınırları sürer. Büyük ölçekli yük testi ve bağımsız penetrasyon testi bu değişikliğin parçası değildir.
