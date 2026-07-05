# KAP Explainer — Üslup ve Prompt Öğrenimleri

`lib/kap-ozet.ts` modülünün kalibrasyonundan (Aralık 2023 demo KAP verisi) çıkan, zamanla biriktirilecek notlar.

## Sınıflandırma (kural bazlı, Claude YOK)

- **Sıralama önemli:** İçerik anahtar kelimeleri (geri alım → temettü → sermaye → genel kurul → FR) `disclosureType/Class` fallback'inden ÖNCE gelmeli. Gerçek örnek: `1231009` `disclosureType=ODA` ama summary "Bedelli..." → doğru şekilde `sermaye_artirimi`. subject çoğu zaman jenerik ("Özel Durum Açıklaması (Genel)"), asıl sinyal **summary.tr**'de.
- **`disclosureClass=DUY` tuzağı:** "Pay Alım Satım Bildirimi" (yatırımcı/içeriden pay hareketi) `disclosureType=ODA` taşır ama şirketin *özel durumu* değil. DUY sınıfı içerik kuralları eşleşmezse `diger`'e düşmeli, ODA fallback'ine değil. `pay_geri_alim` SADECE "geri al/geri alım/geri alınma"; "pay alım satım" ≠ geri alım.
- **Regex boundary tuzağı:** `\bsermaye artirim\b` YANLIŞ — "artırımı" (sonda ek var) trailing `\b`'yi kırar. Türkçe ekler yüzünden kök-eşleşmede kelime sonu `\b` kullanma; substring bırak.
- **Normalizasyon:** subject+summary'yi NFD + tr→ascii (ı→i, ş→s...) ile normalize edip küçük harfle eşle. Kalibrasyonda 9/9 isabet.

## Prompt tasarımı (ozetUret)

- **Tek mesaj + katı JSON çıktı** (`{ozetTekCumle, ozetNeDemek}`), regex ile `{...}` ayıkla + parse. Parse hatasında 1 kez yeniden dene, olmazsa throw. Sonnet bu formata güvenilir uyuyor.
- **Tip bazlı kılavuz enjeksiyonu iyi çalışıyor:** her tip için ayrı 1-2 cümlelik "bu tipte neyi açıkla" talimatı prompt'a gömülü (`TIP_KILAVUZ`). Bedelsiz→mekanik fiyat bölünmesi, temettü→tanım, geri alım→dolaşımdaki pay azalması. Model kavramı gerçekten açıklıyor (bkz. VERUS geri alım çıktısı: "dolaşımdaki toplam hisse miktarı azalmış oluyor").
- **İçerik çıkarımı:** `flatData` derin iç içe MKK DTO listesi. `property` adı `additionalExplanationTr` / `*Tr` ile biten alanlar altın; DTO sınıf adları/İng. label/property adları gürültü. Öncelikli alanları önce topla, ~4000 karakterde kırp. `presentation` alanı bazı ODA'larda `flatData` yerine geçiyor (henüz parse edilmiyor — iyileştirme fırsatı).
- **Kalite gözlemi:** Model tek cümlede şirketin tam adını + ticker'ı + somut rakamı (adet, fiyat, %) veriyor; "ne demek" bölümünde terimi tanımlayıp bağlam veriyor. Sayıları KAP metninden doğru çekiyor (ör. %4,0768 → "yaklaşık yüzde 4,08").

## SPK filtresi (kod tarafı savunma)

- Prompt'a **kesin yasaklar bloğu** göm (al/sat/tut, yön iddiası, hedef fiyat, fırsat/garanti, tavsiye imâsı) + belirsizlikte "olası/genellikle" dili.
- **Çift savunma:** üretilen metni `YASAKLI_KALIPLAR` regex'iyle de tara. Yakalanırsa prompt'a "önceki denemende yasaklı ifade vardı" uyarısı ekleyip 1 kez yeniden üret; yine geçmezse throw. Kalibrasyonda 3/3 çıktı ilk denemede TEMIZ geçti (yeniden üretim tetiklenmedi) — prompt yeterince sıkı.
- chatbot'taki `YASAKLI_IFADELER` desenini temel al ama daha sıkı: "yükselir/düşer/yükselecek/düşecek" ve "fırsat/kaçırma" gibi tetikleyicileri de ekle.

## baglamMetni (3. katman, Claude'a GİTMEZ)

- Nötr tek cümle şablon: "Bu bildirim izleme listendeki {ticker} hissesini ilgilendiriyor." "İyi/kötü haber" ASLA deme. Yatırım tavsiyesi olmadığı ibaresini ekle.

## Teşhis dili — portföy/karne metinleri (haftalik-karne route incelemesi, Temmuz 2026)

- **Teşhis vs. eylem sınırı — çalışan kalıp:** Durumu tarif et, ardından mekanik sonucu nötr belirt, ama kullanıcıya ne yapacağını ASLA söyleme. Onaylanmış örnek: "Portföyünün %62'si X sektöründe. Tek sektör ağırlığı yüksek olduğunda o sektöre özgü dalgalanmalar portföyün geneline daha güçlü yansır." — "çeşitlendir/dengele/azalt" YOK, sadece neden-sonuç.
- **Yargı sıfatı = örtük yönlendirme:** "riskli/tehlikeli/sağlıksız/güvenli" gibi değer yargısı sıfatları yönlendirme sayılır. Bunun yerine tarif eden ifade: "yüksek konsantrasyon", "endeksten daha oynak/yumuşak", "endekse yakın profil". Beta yorumunda bu üçlü (oynak/yumuşak/yakın) temiz çalışıyor.
- **Risk skoru daima çerçevele:** Risk sayısını verince hemen "Bu bir risk ölçüsüdür, getiri tahmini değildir." ekle. Skor ≠ tahmin ayrımını her seferinde yaz.
- **Eğitim içeriği başlığı tuzağı:** "Çeşitlendirme ne işe yarar?" başlığı hafif örtük tavsiye kokuyor ama gövde salt mekanizmayı (konsantrasyon↑ → dalgalanma portföye geçer) anlatıp "sen yapmalısın" demediği sürece eğitim çerçevesinde kalıyor. Sınırda ama kabul edilebilir; gövdeyi asla imperatife çevirme.
- **RSI eğitim metninde "tek başına yön garantisi vermez" ibaresi ZORUNLU** — kaldırma/gevşetme. "aşırı alım/aşırı satım" standart terimleri tırnak içinde + bu disclaimer ile birlikte kullan.
- **Karne disclaimer katmanı (yeterli bulunan set):** (1) üst başlık altı: "durumu tarif eder; ne yapman gerektiğini söylemez", (2) risk satırında getiri-tahmini-değil, (3) alt footer: 15dk gecikme + yatırım tavsiyesi değil + "al/sat yönlendirmesi içermez". Üç katman bir arada SPK açısından temiz.
- **Bildirim (in-app) başlığı/açıklaması nötr kalmalı:** "Haftalık portföy karnen hazır" + "%X hareket etti" — hareketi tarif eder, yön yorumu (iyi/kötü hafta) yapmaz. Emoji (📊) bilgilendirici, hırs/korku tetiklemiyor; kabul.

## Açık işler / gözlem

- `presentation` alanı (ODA tipi bildirimler) `flatData` yoksa parse edilmiyor; içerik boş kalırsa model yalnız subject+summary'den yazıyor. Kapsamı artırmak için `presentation` çıkarımı eklenebilir.
- Maliyet: bildirim başına tek üretim; sonuç cache'lenip çok kullanıcıya servis edilmeli (aynı disclosureIndex için tekrar üretme).
