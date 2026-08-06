# Bilanço Takvimi — İkincil Kaynak Değerlendirmesi

**Tarih:** 7 Ağu 2026 · **Soru:** Şirket bazlı *planlanan* bilanço açıklama tarihleri
KAP'tan alınamıyor (bkz. takvim logu K-TK4). İkincil kaynak var mı, kullanılabilir mi?

**Değerlendirme kuralı (Barış):** Sadece bir kaynağın kullanım şartlarında site verisinin
başka bir siteye/ürüne aktarılmasını AÇIKÇA VE KESİN ŞEKİLDE yasakladığı görülürse o kaynak
pas geçilir. Muğlak "fair use" notları yasak sayılmaz.

## Sonuç tablosu

| Kaynak | Veri var mı? | ToS / erişim | Karar |
|---|---|---|---|
| **GCM Yatırım** (`/arastirma-analiz/yurt-ici-bilanco-takvimi`) | **Evet** — ileriye dönük tarih + kâr beklentisi, `*` = şirket onaylı | **AÇIK YASAK:** "Web Sitesi'nde yer alan herhangi bir içeriğin kopyalanması, değiştirilmesi, dağıtımı veya ticari kullanımı, telif hakkı sahiplerinin izni olmadıkça yasaktır." | **PAS** |
| **Matriks Haber** | **Evet — asıl kaynak.** Çeyreklik "bilanço anketi" ile şirketlerden topluyor; GCM atıfla yayınlıyor | Ticari veri ürünü, lisanslı | **PAS** (scraping); lisans yolu açık |
| **Bigpara** | ? | **robots.txt: `User-agent: anthropic-ai → Disallow: /`** (ayrıca GPTBot, ChatGPT-User, ClaudeBot) | **PAS** |
| **Fintables** (`/son-bilancolar/yaklasan-bilancolar`) | Evet — "sadece tarihini duyurmuş şirketler listeleniyor" | robots.txt açık (`Disallow:` boş) **ama sunucu isteğine 403** — bot koruması = fiili ret | **PAS** (teknik ret) |
| **İş Yatırım** | Hayır — takvim sayfası yok (404), sitemap'te de geçmiyor | robots.txt serbest; MaliTablo ucu zaten kullanımda | Veri yok |
| **Foreks / ForInvest** | Hayır — yalnız ekonomik takvim | `llms.txt` ile AI'a açıkça davetkâr | Veri yok |
| **infoyatirim** | Hayır — tablo yok, açıklama metni | Açık | Veri yok |
| **KAP ekleri** | Hayır — 12 bildirimde `attachmentCount=0` | — | Veri yok |

## Değerlendirme

Türkiye'de şirket bazlı planlanan bilanço tarihinin **tek gerçek kaynağı Matriks'in çeyreklik
anketi**. Bu bir ticari veri ürünü; GCM gibi aracı kurumlar atıfla yayınlıyor ve kendi
şartlarında yeniden dağıtımı açıkça yasaklıyor. Yani "ücretsiz, lisans-riski olmayan ikincil
kaynak" **yok**.

Fintables'ın robots.txt'i serbest ama sunucu tarafı isteklere 403 dönüyor — robots'a rağmen
bu fiili bir rettir, zorlanmadı.

## Öneri: yasal son tarih bandı (üçüncü taraf gerektirmez)

SPK II-14.1 ve BIST duyuruları **yasal son tarihleri** kamuya açık şekilde belirliyor
(ör. 2025 yıl sonu: konsolide olmayan 2 Mart 2026, konsolide 11 Mart 2026; 2026/Q2 solo
son gün 10 Ağustos 2026). Bunlar mevzuat — telif/ToS sorunu yok, scraping gerektirmez,
deterministik üretilir.

Bilanço sekmesine şirket başına **uydurma tarih** yazmak yerine, çeyrek başına
"**yasal son açıklama tarihi**" bandı gösterilebilir: kullanıcı ileriye dönük sinyali alır,
veri dürüst etiketlenir ("beyan edilen tarih değil, mevzuat son tarihi"). Fiilen açıklananlar
zaten KAP FR'den kesin tarihle geliyor.

**Karar Barış'ta:** (a) böyle bir band eklensin mi, (b) Matriks/aracı kurum lisansı
düşünülsün mü. Lisans alınırsa mevcut şema hazır — `durum='bekleniyor'` satırları olarak
girer, FR geldiğinde `aciklandi`ya döner.
