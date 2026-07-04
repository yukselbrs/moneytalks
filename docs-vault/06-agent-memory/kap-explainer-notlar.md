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

## Açık işler / gözlem

- `presentation` alanı (ODA tipi bildirimler) `flatData` yoksa parse edilmiyor; içerik boş kalırsa model yalnız subject+summary'den yazıyor. Kapsamı artırmak için `presentation` çıkarımı eklenebilir.
- Maliyet: bildirim başına tek üretim; sonuç cache'lenip çok kullanıcıya servis edilmeli (aynı disclosureIndex için tekrar üretme).
