# ParaKonuşur — Strateji ve Lansman Yol Haritası Raporu

**Tarih:** 1 Temmuz 2026
**Hazırlanma amacı:** Handoff v9 (4 Mayıs 2026) temel alınarak; mevcut durum, pazar, boşluk analizi, ürün stratejisi, veri altyapısı, teknik yol haritası, iş stratejisi ve nihai roadmap'in tek dokümanda birleştirilmesi.
**Kapsam dışı:** Bu doküman yatırım tavsiyesi veya hukuki görüş değildir; regülasyon bölümleri için avukat teyidi şarttır.

---

# 0. Yönetici Özeti

**Tek cümlelik teşhis:** ParaKonuşur'un sorunu teknik değil; ürünün *kim için, hangi problemi, rakiplerden neden daha iyi çözdüğü* sorusunun cevapsız olması ve bu cevabın üzerine oturacağı veri altyapısının (fiyat + temel veri) henüz ticari olarak savunulabilir olmaması.

**Beş kritik bulgu:**

1. **"AI ile hisse analizi" artık farklılaştırıcı değil, hijyen faktörü.** Fintables'ın Evo'su (₺999/ay paket, AI mesaj kotalı), Investing.com'un ProPicks/WarrenAI'ı, QNB Invest'in ücretsiz Akıllı Robo'su ve — en kritiği — Midas'ın Mayıs 2026'da duyurduğu, ~4 milyon kullanıcıya **ücretsiz** sunulan yapay zekâ destekli "Piyasa Rehberi" (hisse sayfası özetleri + önemli gelişmelerde anlık bildirim) pazarda. "AI hisse yorumu" tek başına ürün değil; ürünün üstüne konduğu katman.

2. **Pazar büyük ama kayan bir zemin üzerinde.** MKK verilerine göre pay senedi yatırımcı sayısı ~6,4 milyon (Haziran 2026); 2026'da 15 halka arza 12+ milyon katılım oldu. Ancak yatırımcı sayısı haftadan haftaya 100-250 bin oynuyor; kitle büyük, sadakati düşük, finansal okuryazarlığı sınırlı. Bu tam olarak ParaKonuşur'un hedeflemesi gereken segmentin tanımıdır.

3. **En savunulabilir boşluk: broker-bağımsız, portföy-kişiselleştirilmiş "anlatım katmanı" (explainer layer).** Fintables tabloyu gösterir ama anlatmaz; Matriks/Foreks profesyonele veri satar; Midas anlatmaya başladı ama (a) kendi broker'ının müşterisine, (b) genel özet düzeyinde. Kimse "**KAP'a bildirim düştü → 30 saniye içinde sade Türkçe özet + senin portföyün/izleme listen için ne anlama geliyor**" akışını bağımsız ve derin şekilde yapmıyor. Barış'ın yeni açtığı MKK/KAP Veri Yayın Servisleri erişimi bu boşluğa doğrudan oturuyor.

4. **En büyük varoluşsal risk veri tarafında:** Yahoo Finance verisinin ticari üründe kullanımı hem hizmet şartları hem güvenilirlik (adjclose hack'leri, marketCap yok, bedelsiz sermaye artırımı sorunları) açısından lansmanda taşınamaz. BIST verisi lisanslı dağıtıcılar (Matriks, ForInvest, İdeal vb.) üzerinden alınır; standart API sözleşmeleri yeniden dağıtım hakkı vermez ve BIST lisans ücretleri ayrıca uygulanır. Gecikmeli (15 dk) veri + KAP resmi verisi kombinasyonuyla meşru ve ucuz bir başlangıç mimarisi mümkün; gerçek zamanlı veri Faz 3+ konusu.

5. **Regülasyon bir engel değil, hendek (moat) — ama sınır çizgisi net çizilmeli.** SPK mevzuatında (III-37.1 Tebliğ) *kişiye özel, yönlendirici* tavsiye lisanslı "yatırım danışmanlığı"dır; genel nitelikli bilgilendirme ve analiz ise standart uyarı metniyle serbesttir. Mevcut "al/sat/tut yönlendirmesi yok" kararı doğru; kişiselleştirme derinleştikçe bu çizgi ürün tasarımıyla korunmalı ve yazılı hukuki görüş alınmalıdır. Ayrıca 1 Ağustos 2026'da yürürlüğe giren reklam yönetmeliği değişiklikleri AI ile üretilen içerik/karakterlerde açık etiketleme zorunluluğu getiriyor — pazarlamada dikkate alınmalı.

**Önerilen strateji (tek paragraf):** ParaKonuşur, "Türkiye'nin en kapsamlı analiz platformu" olmaya çalışmayı bırakıp (o savaş Fintables/Matriks/Midas arasında ve sermaye savaşı), **"borsayı sana anlatan platform"** konumuna kilitlenmelidir: KAP bildirimlerinin ve bilançoların saniyeler içinde sade Türkçe'ye çevrilmesi, "bu hisse bugün neden düştü/çıktı" sorusunun cevaplanması, portföy/izleme listesine göre kişiselleştirilmiş bildirim ve haftalık AI portföy karnesi. Bu konum (a) mevcut kod tabanının %80'ini yeniden kullanır, (b) KAP API erişimiyle veri maliyeti neredeyse sıfır bir hendek yaratır, (c) programatik SEO ile ("ASELS KAP bildirimi ne anlama geliyor" tipi aramalar) ücretsiz dağıtım kanalı açar, (d) Fintables'ın ₺699-999'luk fiyat şemsiyesinin altında ₺99-149'luk kitlesel fiyatlamaya izin verir.

**Sonraki 90 günün 5 önceliği:** (1) KAP API demo→production entegrasyonu ve AI bildirim özetleyici, (2) şirket kurulumu (ödeme + KOSGEB + veri sözleşmeleri önkoşulu), (3) Yahoo bağımlılığının gecikmeli-veri stratejisiyle meşrulaştırılması/değiştirilmesi, (4) 50 hisselik programatik SEO pilotu, (5) 20 kişilik kapalı beta + fiyat testi.

---

# 1. Mevcut Durum Analizi

## 1.1 Ürün envanteri (handoff v9 itibarıyla)

Çalışan yetenekler: 606 hisselik liste ve snapshot altyapısı (GitHub Actions cron + Supabase), hisse detay sayfası, dashboard (XU100 intraday grafik düzeltildi), AI analiz (Claude Sonnet 4.6; kısa yorum + 4 bölümlü uzun format), 8 faktörlü risk skoru (beta/volatilite/RSI/momentum vb., endeks fix'i yapıldı), fiyat/yüzde/gösterge alarmları (Resend e-posta), portföy, izleme listesi, profil/avatar, auth (Supabase), Sanity CMS, GA4. Launch checklist'te Bölüm 1 (ürün & fonksiyon) ve 3 (hukuk temel metinleri) tamam; 5 (teknik/güvenlik) büyük ölçüde tamam.

## 1.2 Güçlü yönler

| Alan | Değerlendirme |
|---|---|
| Yürütme hızı | İki kişilik ekip, çalışan uçtan uca ürün; iterasyon maliyeti çok düşük |
| Domain bilgisi | Kurucunun treasury/türev/BIST deneyimi; AI çıktılarının kalite kontrolünü içeriden yapabilme |
| Maliyet yapısı | Vercel Hobby + Supabase + Claude API; aylık sabit maliyet ihmal edilebilir düzeyde |
| KAP/MKK erişimi | Veri Yayın Servisleri'ne resmi erişim (demo hazır, otomatik onay) — rakiplerin çoğunun temelindeki veri kaynağına doğrudan ulaşım |
| Marka ismi | "ParaKonuşur" — "anlatan platform" konumlandırmasıyla birebir örtüşüyor; isim stratejiyi taşıyor |
| Regülasyon farkındalığı | AI çıktılarında al/sat yönlendirmesi olmaması bilinçli tasarlanmış |

## 1.3 Zayıf yönler

| Alan | Değerlendirme | Şiddet |
|---|---|---|
| Veri kaynağı | Yahoo Finance: ticari kullanım ToS ihlali riski, adjclose kırılganlıkları, marketCap yok, split/bedelsiz sorunları | Kritik |
| Temel analiz verisi | Bilanço/gelir tablosu/rasyo yok — Fintables'ın çekirdeği olan alan tamamen boş | Kritik |
| Farklılaşma | AI analiz + risk skoru + alarm kombinasyonunun tamamı rakiplerde (çoğu daha derin veriyle) mevcut | Kritik |
| Dağıtım | SEO/içerik/topluluk sıfır; organik edinim kanalı yok | Yüksek |
| Kurumsal yapı | Şirket yok → ödeme alınamıyor, veri sözleşmesi imzalanamıyor, KOSGEB başvurulamıyor | Yüksek |
| Operasyonel dayanıklılık | In-memory rate limit (cold start'ta sıfırlanıyor), Sentry yok, izleme yok | Orta |
| Ekip bant genişliği | Kurucu tam zamanlı stajda; part-time yürütülüyor | Orta |

## 1.4 Kritik riskler (önem sırasıyla)

1. **Veri hukuku riski:** Yahoo verisiyle ücretli ürün satmak, hem Yahoo ToS hem BIST veri dağıtım rejimi açısından savunulamaz. Ücretli plan açılmadan önce çözülmeli. (Bkz. Bölüm 5)
2. **Regülasyon riski:** Kişiselleştirme derinleştikçe "genel yatırım tavsiyesi" ile lisans gerektiren "yatırım danışmanlığı" arasındaki çizgiye yaklaşılıyor. III-37.1 Tebliğ md. 45 çerçevesinde bir hizmetin yatırım danışmanlığı sayılması için kişiye özel ve yönlendirici olması gerekir; ürün "bilgilendirme + eğitim" çerçevesinde kalmalı, her AI çıktısında standart uyarı bulunmalı, lansman öncesi yazılı hukuki görüş alınmalı.
3. **Platform riski (Midas):** Midas'ın ücretsiz AI Piyasa Rehberi, "sade özet + bildirim" değer önerisinin genel versiyonunu 4 milyon kullanıcıya sıfır fiyatla dağıtıyor. ParaKonuşur'un cevabı derinlik (KAP-bazlı, portföy-kişisel, broker-bağımsız) olmalı; genel özet savaşı kaybedilmiş kabul edilmeli.
4. **AI maliyet riski:** Sınırsız AI analizi vaadi, Claude API maliyetini kullanıcı başına gelirin üstüne çıkarabilir. Kota + cache (aynı hisse/aynı gün analizi tek üretim, çok servis) mimarisi şart.
5. **Anahtar sızıntısı:** `CRON_SECRET` handoff dokümanında düz metin olarak dolaşıyor; repo/doküman hijyeni ve rotasyon gerekli.

## 1.5 Teknik borç değerlendirmesi

Handoff'taki liste doğru önceliklenmiş; buradaki tek düzeltme sıralama: **rate limit'in Upstash/Supabase'e taşınması ve Sentry** lansman *öncesi* yapılmalı (launch sonrası değil), çünkü ücretli AI endpoint'i kota koruması olmadan açılırsa maliyet saldırısına açık. RSI Wilder düzeltmesi, remotePatterns migrasyonu, Apple login düşük öncelikte kalabilir.

## 1.6 Lansmana engel noktalar (önceliklendirilmiş)

| # | Engel | Tip | Durum |
|---|---|---|---|
| 1 | Şirket kurulumu | İş/hukuk | Beklemede — ödemenin, veri sözleşmesinin ve KOSGEB'in önkoşulu |
| 2 | Veri kaynağının meşrulaştırılması | Hukuk/teknik | Yahoo → gecikmeli veri stratejisi + KAP (Bölüm 5) |
| 3 | KAP API production erişimi | Teknik | Demo hazır; production başvurusu yapılmadı |
| 4 | AI kota + rate limit kalıcılaştırma | Teknik | In-memory; Upstash'e taşınacak |
| 5 | Yasal uyarı metinlerinin AI akışlarına gömülmesi | Hukuk | Kısmen var; her AI çıktısına standardize edilmeli |
| 6 | Sentry + temel izleme | Teknik | Yok |

Ücretsiz, veri açısından temiz bir lansman için 1-2-3 çözülmeden ücretli plan açılmamalı; ücretsiz beta ise 3-4-5-6 ile başlatılabilir.

---

# 2. Pazar ve Rakip Analizi

## 2.1 Pazar büyüklüğü ve dinamikleri

- **Pay senedi yatırımcısı:** ~6,4 milyon (MKK, 26 Haziran 2026). Yıl içinde 6,4-6,8 milyon bandında dalgalanıyor; tek haftada 100-250 bin kişilik giriş/çıkışlar oluyor. Yorum: kitle büyük ama "turist yatırımcı" oranı yüksek — tam da eğitim/anlatım ürününün hedef kitlesi.
- **Toplam MKK sicilli yatırımcı:** 38+ milyon; bakiyeli yatırımcı ~10,6 milyon (2026 Ç1). Fon yatırımcısı ~5,8 milyon. Yani pay senedi dışında da büyük bir "finansal karar veren" havuz var (uzun vadede fon modülü fırsatı).
- **Halka arz dinamosu:** 2026'da 15 halka arz, 12,15 milyon katılım, 23,68 milyar TL hasılat. Halka arz dönemleri, yeni yatırımcı ediniminin en verimli anları (SEO + içerik fırsatı).
- **Yeni yatırımcı demografisi:** 2026 Ç1'de sicil alan ~412 bin yeni yatırımcının en büyük grubu 21-40 yaş (erkek 115 bin, kadın 93 bin) — mobil-öncelikli, içerikle beslenen kitle.
- **Ödeme istekliliği kanıtlanmış:** Fintables ₺149-999/ay bandında abonelik satabiliyor; kullanıcı şikâyetleri "değer" değil "fiyat artışı ve iptal süreci" odaklı. Yani Türk bireysel yatırımcısı analiz aracı için para ödüyor — doğru fiyat noktasında.

## 2.2 Rakip matrisi

| Rakip | Konum | Güçlü | Zayıf | Fiyat | Hedef kitle |
|---|---|---|---|---|---|
| **Fintables** | Temel analiz standardı | Standardize bilanço verisi, rasyolar, radar/tarama, KAP haber akışı, güçlü marka ve topluluk; Evo AI asistanı; A1 Capital entegrasyonu | Fiyat üst banda kaydı (Pro ₺699, Evo ₺999/ay); AI mesaj kotalı (20-50/ay); "anlatım" değil "tablo" ürünü; şikâyetlerde abonelik/iptal sürtünmesi | Ücretsiz katman + ₺149 (Fon) / ₺699 (Pro) / ₺999 (Evo) | Bilanço okuyabilen, temel analiz yapan orta-ileri yatırımcı |
| **Midas** | Komisyonsuz broker + süper-app | ~4M kullanıcı, $140M fon; BIST komisyonsuz; canlı veri ücretsiz; Mayıs 2026: Atlas masaüstü, VİOP, Avrupa borsaları, **ücretsiz AI Piyasa Rehberi** | Analiz derinliği sınırlı; AI özetleri genel (portföy-kişisel değil); çıkar çatışması (broker'ın işlem hacmi teşviki); yalnız kendi müşterisine | Uygulama ücretsiz; gelir işlem/spread tarafında | Yeni başlayan ve orta seviye kitlesel yatırımcı |
| **Matriks / Matriks IQ** | Profesyonel veri terminali | Derinlik, AKD, algoritmik işlem, kurumsal API'ler, aracı kurum dağıtım ağı | Öğrenme eğrisi dik; BIST lisans ücretleri kullanıcıya yansıyor (ör. mobil KD1 ₺30, PD2 ₺803/ay bandında ekran lisansları); modern tüketici UX'i değil | Ekran + lisans bazlı, aracı kurum üzerinden | Aktif trader, profesyonel |
| **ForInvest (Foreks)** | Veri terminali + F-RAY temel analiz | Kurumsal veri altyapısı, F-RAY skorlama/filtreleme modülü, aracı kurum ağı | Tüketici markası zayıf; UX terminal mantığında | Paket bazlı aylık abonelik (BIST lisansı dahil) | Aktif yatırımcı, yarı-profesyonel |
| **İdeal Data** | Terminal | Trader sadakati, sistem tester | Eski nesil UX | Ekran+lisans bazlı | Aktif trader |
| **TradingView** | Global grafik standardı | Grafik/teknik analiz üstünlüğü, topluluk, alarm altyapısı | BIST temel verisi ve KAP derinliği zayıf; Türkçe yerelleşme sınırlı; BIST gerçek zamanlı veri ek ücretli | USD bazlı global abonelik + BIST veri eklentisi | Teknik analizci |
| **Investing.com / InvestingPro** | Haber + AI hisse seçimi | ProPicks AI Türkiye stratejileri, WarrenAI, adil değer/sağlık skoru; devasa trafik | Reklam yoğun UX; yerel güven sorunu; Türkçe içerik çeviri ağırlıklı | InvestingPro abonelik (kampanyalı TL fiyatlar) | Haber takipçisi, fırsat arayan |
| **KAP (kap.org.tr)** | Resmi bildirim kaynağı | Otoriter, ücretsiz, eksiksiz | Ham, teknik dil; arama/özet/bağlam yok; bildirim kişiselleştirmesi yok | Ücretsiz | Herkes (mecburen) |
| **QNB Akıllı Robo, Yatırımcı.AI, BorsAI, Borsify vb.** | AI niş oyuncular | AI sinyal/öneri denemeleri; QNB ücretsiz robo öneriler | Güven ve derinlik sınırlı; çoğu sinyal-satıcısı görünümünde | Karışık | Sinyal arayan kitle |

## 2.3 Analizden çıkan genel sonuçlar

1. **Pazar iki kutuplu:** Bir uçta veri/terminal oyuncuları (Matriks, Foreks, İdeal — B2B2C, aracı kurum kanalı), diğer uçta tüketici uygulamaları (Midas, Fintables). Orta kuşakta "veriyi bilgiye, bilgiyi karara çeviren" katman hâlâ zayıf.
2. **AI hamlesi 2025-2026'da herkes tarafından yapıldı** — ama hepsi ya *genel özet* (Midas) ya *kotalı sohbet asistanı* (Fintables Evo) ya *kara kutu hisse seçimi* (ProPicks) formunda. "Olay-tetiklemeli, kişiselleştirilmiş, kaynağa (KAP) bağlantılı anlatım" formu boş.
3. **Fiyat şemsiyesi geniş:** ₺0 (Midas, KAP) ile ₺999/ay (Fintables Evo) arasında büyük boşluk var. ₺99-199 bandında "ciddi ama erişilebilir" konum açık.
4. **Dağıtım belirleyici:** Midas'ın gücü ürün değil dağıtım (4M kullanıcı). Bağımsız bir platformun dağıtım cevabı SEO + sosyal içerik + topluluk olmak zorunda; ücretli reklamla Midas/Fintables'a karşı edinim savaşı kazanılamaz.
5. **Güven en kıt kaynak:** Sinyal-satıcısı AI uygulamaları kategoriye güvensizlik bulaştırmış durumda. Kaynak gösterme (her AI cümlesinin dayandığı KAP bildirimi/veri linki), al/sat önerisi vermeme ve şeffaf metodoloji, güven üzerinden farklılaşma imkânı veriyor.


---

# 3. Pazardaki Boşlukların Analizi

Aşağıdaki beş boşluk; kullanıcı problemi, pazar büyüklüğü, çözüm ve ParaKonuşur'un liderlik yolu ekseninde değerlendirilmiştir. Sıralama stratejik önceliğe göredir.

## Boşluk 1 — "Bu bildirim/bilanço ne anlama geliyor?" (Anlatım katmanı) ⭐ ANA FIRSAT

- **Problem:** KAP'a günde yüzlerce bildirim düşüyor; dili hukuki/teknik. 6,4 milyon yatırımcının büyük çoğunluğu bedelsiz sermaye artırımı ile bedelli arasındaki farkı, bir "pay geri alım" bildiriminin veya finansal tablo dipnotunun anlamını bilmiyor. Bugün bu ihtiyaç X (Twitter), Ekşi Sözlük ve Telegram gruplarında — yani en güvenilmez kanallarda — karşılanıyor.
- **Pazar büyüklüğü:** Hedeflenebilir kitle, pay senedi yatırımcılarının bilanço okuyamayan çoğunluğu; muhafazakâr tahminle 4-5 milyon kişi. Bunun %1'i × ₺99/ay ≈ ₺4-5M/ay gelir tavanı — tek boşluktan.
- **Mevcut çözümler ve eksikleri:** KAP ham veri verir, anlatmaz. Fintables KAP akışını listeler, yorumlamaz. Midas Piyasa Rehberi genel özet verir ama KAP-bildirimi-bazlı derinlik ve portföy kişiselleştirmesi yok, üstelik yalnız Midas müşterisine.
- **Çözüm:** KAP API (`disclosures` + `lastDisclosureIndex` + `disclosureDetail`) → yeni bildirim yakalanır → Claude ile 3 katmanlı çıktı: (1) tek cümle özet, (2) sade Türkçe açıklama ("bedelsiz %400 ne demek, fiyata mekanik etkisi ne"), (3) izleme listesi/portföyünde bu hisse olan kullanıcıya push/e-posta. Her çıktıda orijinal bildirime link (güven) ve standart uyarı (regülasyon).
- **Neden ParaKonuşur kazanabilir:** KAP API erişimi hazır; olay-tetiklemeli mimari mevcut alarm altyapısının uzantısı; marka adı ("para konuşur") bu değer önerisinin kendisi. Ayrıca her bildirim otomatik bir SEO sayfası üretir ("GUBRF bedelsiz sermaye artırımı ne anlama geliyor") — içerik maliyeti sıfıra yakın programatik dağıtım.

## Boşluk 2 — "Neden düştü / neden çıktı?" (Atıf motoru)

- **Problem:** Bir hisse %8 hareket ettiğinde yatırımcının ilk sorusu "neden?". Bugün cevabı yok: KAP'ta arar, X'te söylentiye maruz kalır.
- **Çözüm:** Gün sonunda anormal hareket eden hisseler (mevcut hacim-anomalisi/momentum faktörleri zaten hesaplanıyor) için otomatik "olası nedenler" kartı: aynı gün KAP bildirimi var mı, sektör/endeks hareketi mi, döviz etkisi mi, haber mi. "Kesin neden" iddia edilmez; olasılıklar kaynaklarıyla sıralanır.
- **Büyüklük/uygunluk:** Boşluk 1 ile aynı kitle; aynı altyapıyı kullanır; günlük geri gelme (retention) davranışı yaratır. Programatik SEO'nun ikinci bacağı ("THYAO bugün neden düştü" araması her gün binlerce kez yapılıyor).

## Boşluk 3 — Portföy sağlık karnesi (karar desteği, tavsiye değil)

- **Problem:** Yeni yatırımcı portföyünün riskini görmüyor: tek sektöre yığılma, yüksek beta toplamı, likidite riski. Robo-danışmanlık lisans gerektirir; ama *teşhis* (tanı koyma, yönlendirmeme) gerektirmez.
- **Çözüm:** Mevcut 8 faktörlü risk motoru portföy düzeyine genellenir: çeşitlendirme skoru, sektör konsantrasyonu, portföy betası, haftalık AI karne e-postası. "Şunu sat/al" asla denmez; "portföyünün %62'si tek sektörde" denir.
- **Neden biz:** Risk motoru yazılmış durumda; fark yaratan katman anlatım ve düzenli ritüel (haftalık karne = retention).

## Boşluk 4 — Yatırımcı eğitimi × ürün entegrasyonu

- **Problem:** Eğitim içeriği (YouTube, Midas Akademi, Fintables Akademi) ile analiz aracı ayrı yaşıyor. Kullanıcı terimi görüyor, öğrenmek için platformdan çıkıyor.
- **Çözüm:** Ürün-içi "bunu bana açıkla" katmanı: her rasyo/terim tıklanabilir, bağlama özel açıklama (statik sözlük + AI). Ayrıca risk profili quiz'i (mevcut) → kişiselleştirilmiş öğrenme yolu.
- **Not:** Tek başına ürün değil; Boşluk 1-3'ün tutkalı ve elde tutma aracı.

## Boşluk 5 — (Orta vade) Fon ve halka arz anlatımı

- ~5,8 milyon fon yatırımcısı için "fon karnesi" (Fintables ₺149/ay ile bu alanı tek başına paketlemiş durumda) ve halka arz dönemlerinde izahname özetleyici ("bu halka arzın riskleri sade Türkçe") — halka arz başına milyonlarca katılımcıya dokunan, sezonluk ama çok yüksek trafikli bir kanca. MVP dışı; Faz 4 adayı.

**Bilinçli olarak girilmeyecek alanlar:** gerçek zamanlı trading terminali (Matriks/Midas Atlas savaşı), al/sat sinyali (regülasyon + güven zehri), kripto (ayrı lisans rejimi), sosyal ağ/copy-trading (moderasyon ve regülasyon yükü).

---

# 4. Ürün (Product) Stratejisi

## 4.1 Konumlandırma

> **"ParaKonuşur: Borsa senin dilinden konuşsun."**
> Broker'dan bağımsız, kaynak gösteren, al/sat söylemeyen; olan biteni saniyeler içinde sade Türkçe anlatan ve senin portföyüne göre kişiselleştiren platform.

Farklılaşma üçgeni: (1) **Olay-tetiklemeli AI** (sohbet asistanı değil — KAP/fiyat olayı olur, ParaKonuşur anlatır), (2) **kişiselleştirme** (portföy/izleme listesi bağlamı), (3) **radikal kaynak şeffaflığı** (her AI cümlesinin altında dayanağı).

## 4.2 Özellik envanteri ve puanlama

Puanlama 1-5 (5 = en iyi). Skor = Değer×2 + Rekabet avantajı×2 + Gelir + MVP uygunluğu − Maliyet − Veri ihtiyacı. (Basitleştirilmiş RICE/ICE melezi; amaç mutlak doğruluk değil sıralama tutarlılığı.)

| Özellik | Değer | Rekabet | Maliyet | Veri | Gelir | MVP | Skor |
|---|---|---|---|---|---|---|---|
| KAP bildirim AI özeti + kişisel push | 5 | 5 | 2 | 2 | 5 | 5 | **26** |
| "Neden düştü/çıktı" günlük atıf kartı | 5 | 5 | 2 | 2 | 4 | 4 | **24** |
| Programatik SEO sayfaları (bildirim+hisse) | 4 | 4 | 2 | 1 | 4 | 5 | **23** |
| Portföy sağlık karnesi (haftalık e-posta) | 4 | 4 | 2 | 1 | 4 | 4 | **21** |
| AI hisse analizi (mevcut, iyileştirilmiş) | 4 | 2 | 2 | 2 | 3 | 5 | **18** |
| Bilanço dönemi AI özeti ("karne günü") | 5 | 4 | 3 | 4 | 5 | 2 | **17** |
| Terim/rasyo "bana açıkla" katmanı | 3 | 3 | 2 | 1 | 2 | 4 | **16** |
| Gösterge alarmları (mevcut) | 3 | 2 | 1 | 2 | 2 | 5 | **14** |
| Hisse karşılaştırma (2-3 hisse yan yana) | 3 | 2 | 2 | 3 | 3 | 3 | **13** |
| Temel analiz tabloları (Fintables paritesi) | 4 | 1 | 4 | 5 | 3 | 1 | **7** |
| Mobil uygulama (native) | 3 | 1 | 5 | 1 | 2 | 1 | **6** |
| Fon modülü | 3 | 2 | 4 | 4 | 3 | 1 | **6** |
| Gerçek zamanlı veri/derinlik | 3 | 1 | 5 | 5 | 3 | 1 | **3** |
| Al/sat sinyalleri | — | — | — | — | — | — | **Yapılmayacak** |

## 4.3 Kategorilere ayrım

### Mutlaka MVP'de olmalı (lansman sepeti)
1. **KAP bildirim akışı + AI özet + izleme listesi bazlı bildirim** — ürünün omurgası; KAP production erişimi tek bağımlılık.
2. **AI hisse analizi (mevcut)** — hijyen faktörü; kaynak-linki ve uyarı metni standardize edilerek.
3. **Risk skoru + alarmlar + portföy/izleme (mevcut)** — tutundurma altyapısı.
4. **Programatik SEO pilotu (50 hisse × bildirim sayfaları)** — dağıtım MVP'nin parçasıdır, sonrası değil.
5. **"Neden düştü/çıktı" kartı (v1: yalnız KAP-eşleştirmeli basit sürüm)** — tam atıf motoru sonra; bildirim-fiyat eşleştirmesi lansmanda.

### Launch sonrası ilk 3 ay
- Portföy sağlık karnesi + haftalık e-posta ritüeli (premium çapa özelliği)
- Atıf motorunun genişletilmesi (sektör/endeks/döviz ayrıştırması)
- Terim sözlüğü / "bana açıkla" katmanı
- Bildirim kanallarının çeşitlendirilmesi (web push; Telegram botu — Türk yatırımcısının yaşadığı yer)
- Fiyat/paket testleri, yıllık plan

### Orta vadede (3-9 ay)
- Bilanço dönemi AI karnesi (KAP finansal tablo ekleri + `downloadAttachment` ile; veri normalizasyonu ciddi iş)
- Hisse karşılaştırma; sektör sayfaları
- Basit temel veri seti (satış/net kâr/özkaynak zaman serisi — Fintables paritesi değil, anlatım için yeterli minimum)
- Mobil (önce PWA/push; native daha sonra)

### Uzun vadeli vizyon (9-24 ay)
- Fon karnesi modülü; halka arz izahname özetleyici
- Gerçek zamanlı veri katmanı (vendor sözleşmesiyle, premium+)
- B2B API: "KAP-özet-servisi"ni medya/fintech'lere satmak (Boşluk 1 altyapısının ikinci para kazanma yolu)
- Aracı kurum ortaklıkları (Fintables×A1 Capital modeli: işlem yönlendirme geliri)


---

# 5. Veri Altyapısı Analizi

## 5.1 Veri ihtiyacının sınıflandırılması

| Veri tipi | MVP'de gerekli mi | Kaynak (öneri) | Not |
|---|---|---|---|
| Hisse fiyat (gün sonu + gecikmeli gün içi) | Evet | Kısa vade: mevcut kaynak, gecikmeli gösterim + vendor görüşmesi | Aşağıda strateji |
| KAP bildirimleri | Evet (omurga) | MKK/KAP Veri Yayın Servisleri | Erişim alındı; production bekliyor |
| Şirket künye + pay adedi | Evet | KAP `members`, `memberDetail`, `memberSecurities` | Pay adedi × fiyat = **piyasa değeri sorununu vendor'sız çözer** |
| Endeks verileri | Evet | Mevcut (XU100/XU030) + gecikmeli politika | |
| Döviz/altın | Evet | Mevcut (truncgil) | Yedek kaynak eklenmeli |
| Finansal tablolar (bilanço/GT) | Hayır (Faz 3) | KAP bildirim ekleri (`downloadAttachment`) veya lisanslı sağlayıcı | Normalizasyon maliyeti yüksek; Fintables'ın hendeği tam burası |
| Temettü / sermaye artırımı (hak kullanımı) | Faz 2 | KAP `caEventStatus` | Bedelsiz/bedelli anlatımı için kritik |
| Haber akışı | Faz 2-3 | RSS/anlaşmalı kaynak; telif nedeniyle özet+link | Tam metin çekilmez |
| Makro veriler | Faz 3 | TCMB EVDS (ücretsiz, resmi) | Faiz/enflasyon/kur serileri |
| Fon verileri | Faz 4 | KAP `funds` + TEFAS | |
| Kripto / emtia | Vizyon dışı / düşük | — | Odak dağıtmamak için ertelendi |

## 5.2 Fiyat verisi: sağlayıcı karşılaştırması

| Seçenek | Kapsam | Güncellik | Hukuki durum | Maliyet | Değerlendirme |
|---|---|---|---|---|---|
| Yahoo Finance (mevcut) | BIST geniş | ~15 dk gecikmeli | Ticari kullanımda ToS riski; BIST lisans zinciri dışı | ₺0 | Ücretsiz beta için geçici; ücretli üründe sürdürülemez |
| **Matriks kurumsal veri servisi (API)** | Tam BIST + türev | Gerçek zamanlı veya gecikmeli | Resmi dağıtıcı; standart API'de yeniden dağıtım hakkı yok → web sitesinde gösterim için ayrıca dağıtım/alt-bayilik sözleşmesi ve BIST lisans ücretleri gerekir | Sözleşmeye bağlı (teklif alınmalı) | Faz 3+ için ana aday; şirket kurulunca teklif istenmeli |
| **ForInvest (Foreks) kurumsal** | Tam BIST | GZ/gecikmeli | Resmi dağıtıcı; aynı lisans rejimi | Teklif | Matriks'e alternatif; ikili teklif pazarlık gücü verir |
| BIST doğrudan (Datastore/veri dağıtım lisansı) | Tam | GZ/gecikmeli/EOD | En resmi yol; alt-dağıtıcı statüsü sermaye ve süreç ister | Yüksek başlangıç | Ölçek sonrası (Faz 5) |
| Global agregatörler (EODHD vb.) | BIST EOD kısmi | Gün sonu | BIST verisinin kaynağı ve yeniden dağıtım hakkı sözleşmede doğrulanmalı | Düşük ($) | EOD yedek/geçiş köprüsü olarak incelemeye değer |

**Önemli ilke:** BIST verisinde gerçek zamanlılık, son kullanıcı başına ekran lisans ücreti doğurur (örnek kamu tarifelerinde KD1 ≈ ₺30/ay/kullanıcı gibi kalemler). **Gecikmeli (15 dk) veri politikasına bilinçli geçiş**, hem maliyeti hem hukuki yükü dramatik düşürür ve ParaKonuşur'un değer önerisiyle çelişmez: ürün milisaniye yarışı değil, anlam yarışı satıyor. Arayüzde "veriler 15 dk gecikmelidir" ibaresi güven de üretir.

## 5.3 Önerilen hibrit mimari (üç aşama)

- **Aşama A (şimdi → lansman):** KAP API production (bildirim + künye + pay adedi) ana omurga; fiyat tarafında gün sonu snapshot (mevcut cron) + gecikmeli gün içi; tüm fiyat gösterimlerine "gecikmeli" etiketi. Piyasa değeri = KAP pay adedi × son fiyat (Foreks/Matriks vendor ihtiyacı bu kalemden silinir). Bedelsiz kaynaklı "stuck adjclose" vakaları için `caEventStatus` ile düzeltme tetikleyicisi.
- **Aşama B (lansman + 3-6 ay, gelir başlayınca):** Matriks/ForInvest'ten gecikmeli-veri web dağıtımı için resmi teklif; imzalanınca Yahoo tamamen devre dışı. Haber ve makro (EVDS) eklenir.
- **Aşama C (ölçek):** Gerçek zamanlı katman premium+ pakete; finansal tablo normalizasyon boru hattı (KAP ekleri → yapılandırılmış veri, AI-destekli çıkarım + insan doğrulaması).

## 5.4 KAP API entegrasyon planı (handoff'taki adımların detaylandırılması)

1. Demo ortamda (`apigwdev.mkk.com.tr`, Aralık 2023 test verisi) `generateToken` → `lastDisclosureIndex` → `disclosures` → `disclosureDetail` akışının kodlanması; index-bazlı artımlı çekim (polling) + Supabase `kap_bildirimleri` tablosu.
2. Şirket kurulumuyla eş zamanlı **production erişim başvurusu** (ticari kullanım koşulları ve ücret tarifesi bu aşamada netleşir — sözleşmede *türev içerik/özet yayını* hakkının açıkça teyit edilmesi kritik).
3. Bildirim tipi sınıflandırıcısı (özel durum, finansal rapor, pay geri alım, sermaye artırımı…) → tip bazlı AI prompt şablonları → önem skoru (push eşiği).
4. Maliyet kontrolü: her bildirim **bir kez** özetlenir, tüm kullanıcılara cache'ten servis edilir (kullanıcı başına marjinal AI maliyeti ≈ 0).

---

# 6. Teknik Yol Haritası (lansmana kadar)

| # | İş | Öncelik | Zorluk | Süre* | Bağımlılık | Risk |
|---|---|---|---|---|---|---|
| 1 | KAP demo entegrasyonu (auth + polling + şema) | Kritik | Orta | 1-1,5 hf | Demo erişimi (var) | Test verisi eski (Aralık 2023) — şema değişebilir |
| 2 | Bildirim sınıflandırıcı + AI özet boru hattı + cache | Kritik | Orta | 1,5 hf | #1 | Prompt kalitesi; tip çeşitliliği |
| 3 | KAP production başvurusu + geçiş | Kritik | Düşük (bekleme) | Takvim MKK'ya bağlı | Şirket kurulumu (muhtemelen) | Ücret/koşul belirsizliği |
| 4 | İzleme listesi bazlı push/e-posta bildirimi | Kritik | Düşük | 3-4 gün | #2, mevcut alarm altyapısı | — |
| 5 | Rate limit + AI kota → Upstash Redis | Kritik | Düşük | 2 gün | — | — |
| 6 | Sentry + temel loglama/uptime | Kritik | Düşük | 1 gün | — | — |
| 7 | Gecikmeli-veri etiketi + Yahoo azaltma planı | Yüksek | Düşük | 2 gün | — | — |
| 8 | Programatik SEO: bildirim sayfası şablonu + 50 hisse pilotu (SSG/ISR, sitemap, schema.org) | Yüksek | Orta | 1 hf | #2 | İndeksleme süresi (erken başlanmalı) |
| 9 | "Neden düştü/çıktı" v1 (KAP-fiyat eşleştirme) | Yüksek | Orta | 1 hf | #2, snapshot | Yanlış atıf riski → "olası" dili |
| 10 | AI çıktı standardı: kaynak linki + yasal uyarı bileşeni | Yüksek | Düşük | 2 gün | — | — |
| 11 | Ödeme entegrasyonu (iyzico/Stripe) + abonelik tablosu | Yüksek | Orta | 1 hf | Şirket kurulumu | Kurulum takvimi |
| 12 | Onboarding akışı (izleme listesi kurdurma odaklı) | Orta | Düşük | 3 gün | — | — |
| 13 | Portföy karnesi + haftalık e-posta | Orta | Orta | 1 hf | Risk motoru (var) | Launch sonrası ilk 3 aya |
| 14 | RSI Wilder, remotePatterns, Apple login | Düşük | Düşük | — | — | Backlog |

*Süreler part-time (staj yanında, Kaan ile paralel) net efor tahminidir; takvimde 2-2,5×'i planlanmalı. Kritik yol: **Şirket kurulumu → KAP production → ödeme**. Teknik işlerin tamamı bu bekleme sürelerinin gölgesinde bitirilebilir; yani lansman tarihini kod değil, kurumsal/idari süreçler belirleyecek.


---

# 7. İş Stratejisi

## 7.1 Hedef kullanıcı kitlesi

**Birincil persona — "Yeni/orta seviye bireysel yatırımcı" (tahmini 4-5M kişi):** 21-45 yaş, mobil-öncelikli, portföyü 50 bin - 2 milyon TL bandında, bilanço okuyamıyor, bilgiyi X/Telegram/YouTube'dan alıyor, en büyük duygusu "bir şey oluyor ama anlamıyorum" kaygısı. Ödeme eşiği: bir streaming aboneliği düzeyi (₺100-200/ay).

**İkincil persona — "Meraklı öğrenen":** Öğrenci/genç profesyonel, küçük portföy, eğitim değeri arıyor; ücretsiz katmanın ve topluluğun taşıyıcısı, düşük dönüşüm ama yüksek yayılım.

**Bilinçli olarak hedeflenmeyen:** Aktif trader (Matriks/İdeal kitlesi), profesyonel/kurumsal (Bloomberg/Foreks), sinyal arayan kitle.

## 7.2 Gelir modeli ve fiyatlandırma

**Model: Freemium abonelik.** Reklam modeli güven konumlandırmasıyla çelişir; işlem yönlendirme (broker ortaklığı) ancak ölçek sonrası pazarlık konusudur.

| Katman | Fiyat (öneri) | İçerik |
|---|---|---|
| **Ücretsiz** | ₺0 | Hisse sayfaları, gecikmeli fiyat, KAP akışı + günde sınırlı AI özet görüntüleme, 1 izleme listesi (5 hisse), günde 1 AI analiz, temel alarmlar |
| **Plus** | **₺129/ay veya ₺1.099/yıl** (~%30 indirim) | Sınırsız KAP AI özeti + anlık kişisel bildirim, sınırsız izleme/alarm, günde 20 AI analiz, "neden düştü/çıktı" kartları, portföy karnesi (haftalık) |
| **Pro (Faz 3+)** | ₺299/ay | Bilanço dönemi AI karneleri, karşılaştırma, öncelikli yeni özellikler, (ileride) gerçek zamanlı veri |

Gerekçe: Fintables'ın ana paketleri ₺699-999/ay'a çıkmış durumda; Midas ücretsiz ucu tutuyor. ₺129, "ciddi araç ama herkes için" mesajını verir; yıllık plan nakit akışını öne çeker. AI maliyeti cache mimarisi sayesinde kullanıcı sayısıyla değil *olay sayısıyla* ölçeklendiği için bu fiyatta brüt marj korunur (kritik varsayım: bildirim başına tek üretim).

**Birim ekonomi (kaba):** 1.000 Plus abonesi ≈ ₺129K/ay gelir. Maliyetler: Claude API (bildirim-bazlı, ~₺5-15K/ay tahmini), vendor gecikmeli veri (Aşama B'de teklife bağlı), Vercel Pro + Supabase + Upstash (~₺5K/ay), ödeme komisyonu ~%3-5. %70+ brüt marj hedefi gerçekçi. Başabaş için birkaç yüz abone yeterli.

## 7.3 Büyüme stratejisi

1. **Programatik SEO (ana motor):** Her KAP bildirimi ve her hisse için otomatik, AI-özetli, indekslenebilir sayfa. "X hissesi bedelsiz", "Y bugün neden düştü", "Z bilanço yorumu" aramaları sürekli ve niyetli trafik üretir. 606 hisse × bildirim geçmişi = on binlerce sayfa envanteri. İlk 50 hisse pilotu lansman öncesi indekslenmeye başlamalı (SEO'nun 3-6 aylık gecikmesi nedeniyle en erken başlanması gereken iş).
2. **X (Twitter) bot/hesabı:** Önemli KAP bildirimlerinin AI özetini dakikalar içinde paylaşan hesap — ürünün kendisinin canlı demosu. Türk borsa X'i çok aktif; viral potansiyeli en yüksek kanal. (Paylaşımlarda kaynak linki; hiçbir zaman yönlendirici dil.)
3. **Beehiiv haftalık bülten:** "Bu hafta KAP'ta ne oldu" — e-posta listesi hem retention hem edinim varlığı.
4. **Beta topluluğu (10-20 kişi → 100):** İlk kullanıcılar borsa Telegram/Discord gruplarından ve üniversite yatırım kulüplerinden (Sabancı/Koç ağı hazır avantaj).
5. **Güven oluşturma:** Metodoloji sayfası (risk skoru nasıl hesaplanıyor), her AI çıktısında kaynak, "al/sat söylemiyoruz" ilkesinin pazarlamanın kendisi olması, kurucu hikâyesinin (öğrenci + hazine stajyeri, kendi problemini çözüyor) şeffaf anlatımı.
6. **Yapılmayacaklar:** Ücretli performans pazarlaması (CAC savaşı kaybedilir), finfluencer işbirliği (Ağustos 2026 reklam yönetmeliği etiketleme zorunlulukları + kategori güven riski) — en azından ilk 6 ay.

## 7.4 Regülasyon çerçevesi (iş stratejisinin parçası olarak)

- Ürün dili her yerde "bilgilendirme/analiz/eğitim"; III-37.1 kapsamındaki *kişiye özel yönlendirici tavsiye* tanımından uzak durulur. Sektör standardı uyarı metni ("Burada yer alan bilgiler yatırım danışmanlığı kapsamında değildir…") tüm AI çıktılarına ve sayfa altlıklarına gömülür (Fintables dahil tüm oyuncular bunu yapıyor).
- Portföy karnesi "teşhis" dilinde kalır ("konsantrasyonun yüksek"), asla eylem önermez ("azalt/sat" yok).
- KVKK: portföy verisi hassas kabul edilip aydınlatma metni + veri işleme envanteri; Supabase RLS zaten uygulanıyor.
- Lansman öncesi: sermaye piyasası mevzuatına hâkim bir avukattan yazılı görüş (handoff'ta da öneriliyordu; bütçeye alınmalı).

---

# 8. Nihai Roadmap

### Faz 1 — Lansman Öncesi (Temmuz - Ağustos 2026)
- **İşler:** Şirket kurulumu + KOSGEB başvurusu; KAP demo entegrasyonu ve production başvurusu; bildirim AI boru hattı + izleme listesi bildirimleri; Upstash rate limit + Sentry; gecikmeli veri etiketi; SEO pilotu (50 hisse) canlıya; X hesabı açılıp yayına başlar; hukuki görüş; 20 kişilik kapalı beta.
- **Çıktı:** Ücretsiz, veri açısından temiz, KAP-omurgalı ürün production'da; SEO sayaç çalışıyor.
- **Başarı kriteri:** Beta kullanıcılarının ≥%50'si ikinci haftada geri dönüyor; bildirim özeti gecikmesi < 2 dk; sıfır kritik hata.
- **Risk:** MKK production takvimi; şirket kurulum bürokrasisi. Etki: Yüksek (ürün kimliği bu fazda kurulur).

### Faz 2 — Lansman (Eylül 2026 hedef)
- **İşler:** Herkese açık ücretsiz lansman (Product Hunt TR muadilleri, X, Webrazzi başvurusu, üniversite kulüpleri); ödeme entegrasyonu hazır ama Plus 2-4 hafta "erken erişim indirimi" ile açılır; Beehiiv bülten başlar; Meta Pixel/analitik tamamlanır.
- **Çıktı:** İlk 1.000 kayıtlı kullanıcı; ilk ödeyen aboneler.
- **Başarı kriteri:** 30 gün içinde 1.000+ kayıt, ≥%3 ücretliye dönüşüm denemesi, haftalık aktiflik ≥%25.
- **Risk:** Midas Piyasa Rehberi ile karıştırılma → mesajda "broker'ından bağımsız + portföyüne özel + kaynak gösterir" vurgusu.

### Faz 3 — İlk 3 Ay (Ekim - Aralık 2026)
- **İşler:** Portföy karnesi + haftalık e-posta; atıf motoru v2; sözlük katmanı; Telegram bot; SEO 606 hisseye genişler; vendor (Matriks/ForInvest) teklif süreci ve gecikmeli veri sözleşmesi; fiyat testi sonuçlandırılır.
- **Başarı kriteri:** 5.000+ kayıt, 150-300 ödeyen abone (başabaş bandı), organik trafik payı ≥%40, aylık kayıp (churn) <%8.
- **Risk:** AI maliyet sürprizi → kota/cache disiplini; SEO'nun gecikmesi → X/bülten telafi kanalları.

### Faz 4 — İlk 6 Ay (2027 Ç1)
- **İşler:** Bilanço dönemi AI karnesi (ilk bilanço sezonu canlı testi — Şubat/Mart 2027 dönemi hedef); hisse karşılaştırma; PWA/push; halka arz özetleyici pilotu; Pro katman tasarımı.
- **Başarı kriteri:** 15-20K kayıt, 750+ abone, bilanço haftalarında trafik zirvesi ölçülür (sezonluk kanca doğrulaması).
- **Risk:** Finansal tablo normalizasyonunun zorluğu → kapsam ilk 100 hisseyle sınırlanır.

### Faz 5 — İlk 12 Ay (2027 ortası)
- **İşler:** Native mobil; gerçek zamanlı veri (Pro+); B2B KAP-özet API pilotu; aracı kurum ortaklık görüşmeleri; fon modülü fizibilitesi; tohum yatırım turu değerlendirmesi (metrikler elverirse — Midas/Fintables emsalleri kategoriye yatırımcı iştahı olduğunu gösteriyor).
- **Başarı kriteri:** 50K+ kayıt, 2.000+ abone (≈₺250K+/ay), tek haneli churn, en az 1 B2B pilot.
- **Risk:** Büyük oyuncuların (Fintables/Midas) özellik kopyalaması → hız + niş derinlik + topluluk savunması; bu nedenle 12 ay boyunca odak dağılmamalı.

---

# 9. Varsayımlar, Belirsizlikler ve Alternatif Senaryolar

**Açık varsayımlar:**
1. KAP Veri Yayın Servisleri production erişiminin ticari türev içerik (özet) yayınına izin verdiği varsayılmıştır → sözleşme metniyle **doğrulanmalı**; kısıt çıkarsa ürün "kişisel bildirim + link" moduna daralır (değer önerisi zayıflar ama ölmez).
2. Gecikmeli BIST verisinin web'de gösteriminin, lisanslı bir dağıtıcı sözleşmesiyle düşük maliyetle mümkün olduğu varsayılmıştır → Matriks/ForInvest tekliflerinde doğrulanacak; beklenenden pahalıysa fiyat verisi minimuma indirilir, ürün KAP/anlatım ağırlığına kayar.
3. Fintables fiyatlarının ₺699-999 bandında kalacağı varsayılmıştır; agresif ucuz katman açarlarsa ParaKonuşur farklılaşmayı fiyattan çok bildirim hızı + kişiselleştirme + bağımsızlığa taşır.
4. Midas Piyasa Rehberi'nin genel-özet düzeyinde kalacağı varsayılmıştır; KAP-bazlı kişisel bildirime girerse, broker-bağımsızlık + çoklu-broker portföy takibi ana savunma hattıdır.
5. Kurucu bant genişliği: mezuniyet + staj döneminde haftalık ~15-20 saat net efor varsayıldı; takvimler buna göre 2-2,5× tamponludur.

**Emin olunmayan noktalar:** MKK production ücret tarifesi; KAP bildirim hacminin AI maliyeti (ölçüm: demo döneminde bildirim/gün × ortalama token); SEO indekslenme hızı; ₺129 fiyat noktası (lansmanda A/B: ₺99 vs ₺149).

---

## Ek: Bu analizde kullanılan başlıca güncel kaynaklar
- MKK pay piyasası verileri (Haziran 2026): borsagundem.com.tr, finansopia.com, istanbulticaretgazetesi.com
- Fintables paket/fiyat sayfaları: fintables.com/uyelik-paketleri
- Midas kullanıcı/yatırım/ürün duyuruları (Mayıs 2026 "Gelecek Daha Yakın", Seri B): fintechtime.com, forbes.com.tr, webrazzi.com
- BIST veri lisans kodları ve örnek tarifeler: matriksdata.com blog, cdn.ataonline.com.tr tarifeler, tacirler.com.tr
- Matriks kurumsal API SSS (yeniden dağıtım/lisans): matriksdata.com
- ForInvest paket/lisans koşulları ve F-RAY: trader.foreks.com
- InvestingPro / ProPicks Türkiye: tr.investing.com
- SPK Yatırım Hizmetleri Rehberi (III-37.1, son güncelleme Aralık 2025): spk.gov.tr
- Ticari Reklam Yönetmeliği değişikliği (1 Ağustos 2026 yürürlük): Resmî Gazete 33297 haberleri

*Rapor sonu — ParaKonuşur kurucu ekibi için hazırlanmıştır, 1 Temmuz 2026.*
