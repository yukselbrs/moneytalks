# "Swap Nedir?" — İçerik Planı (ekran ekran)

**Tarih:** 9 Ağustos 2026 · **Durum:** PLAN → uygulandı (`/egitimler/turev-araclar/swap-nedir`)
**Kardeş notlar:** [[forward-nedir-icerik-plani]] · [[viop-nedir-icerik-plani]] · [[swap-nedir-log]] · [[egitimler-menu-forward-log]]
**Üslup sözleşmesi:** [[forward-nedir-icerik-plani]] ile BİREBİR aynı — sen-dili, kısa cümleler, tek kavram/bölüm, ölçülü emoji, yargı/yönlendirme yok. Kâr=yeşil, zarar=kırmızı. SPK çerçevesi: "kazanırsın" değil "pozisyon değer kazanır".

> ⚠️ Sayfa başı ve sonu sabit disclaimer: "Bu içerik eğitim amaçlıdır; yatırım tavsiyesi değildir. Swap sözleşmeleri tezgâh üstü (OTC) ürünlerdir; karşı taraf riski taşır."

**Anlatı şablonu (VİOP/Forward'dan devralınan):** bilinen dünyadan başla → günlük hayat metaforu → aynı kavramı finansal örneğe taşı → tek seferde tek kavram → ara sorularla etkileşim → final mini simülasyon.

**Kavramsal köprü:** Bu eğitim serinin ÜÇÜNCÜSÜ ve forward bilgisinin üzerine kurulu. Bölüm 3'te Forward Nedir'e açık atıf var; okuyucu "aynı fikrin tekrarlanan hali" bağlantısını kurmalı.

---

## Bölüm 1 — Bildiğin şeyi hatırlayalım
**Kavram:** hisse alım-satımı (tanıdık zemin — üç eğitimde de aynı giriş) · **Animasyon:** THYAO kartı + 330₺ sayaç, tek seferlik işlem rozeti
- E1: "THYAO'dan 100 lot aldın diyelim. Tanesi 330 ₺."
- E2: "Toplam 33.000 ₺ ödedin. İşlem bitti — **tek seferlik** bir alışverişti."
- E3: "Şimdi bunu değiştireceğiz: ya tek seferlik değil de, aylarca **tekrar eden** bir anlaşma olsaydı?"
- **Soru 1 (devam kapısı):** "Buraya kadar tanıdık mı?" → [Evet, devam] / [Kısaca hatırlat]

## Bölüm 2 — Günlük hayat: ev takası
**Kavram:** swap'ın özü — iki tarafın sahip olduğu şeyi belirli bir süre için değiştirmesi · **Animasyon:** iki ev ikonu, aralarında çift yönlü ok; ok üzerinde "6 ay" etiketi, süre dolunca oklar geri döner
- E1: "İstanbul'da eviniz var. Arkadaşınızın da İzmir'de."
- E2: "Altı aylığına takas ediyorsunuz: sen onun evinde otur, o senin evinde otursun."
- E3: "Mülkiyet değişmiyor — evler yine sizin. Değişen şey, altı ay boyunca **kimin neyi kullandığı**."
- E4: "Süre bitince herkes kendi evine döner."
- **Not kutusu:** "Swap'ın mantığı tam olarak bu: sahip olduğun şeyi değil, ondan doğan **akışı** belirli bir süre için takas edersin."

## Bölüm 3 — Swap aslında arka arkaya dizilmiş forward'lardır
**Kavram:** forward → swap köprüsü · **Animasyon:** tek bir forward oku (bir vade noktası), sonra çoğalıp 4 ardışık oka dönüşüyor — her biri bir ödeme tarihi
- E1: "**Forward Nedir**'de öğrendiğin şeyi hatırla: bugünden anlaşıp, ileri bir tarihte tek seferlik alışveriş yapıyordun."
- E2: "Swap bunun tekrar edeni: tek vade yerine **birçok vade**. Her üç ayda bir, bir yıl boyunca."
- E3 (animasyon): "Yani swap ≈ arka arkaya dizilmiş forward'lar."
- E4: "Tek fark: hepsini tek bir sözleşmede, tek bir anlaşmayla kuruyorsun."
- **Soru 2 (tahmin):** "Peki swap borsada mı işlem görür, taraflar arasında mı?" → [Borsada] / [Taraflar arasında] / [Emin değilim] — doğru: taraflar arasında; "Forward gibi swap de tezgâh üstü (OTC) bir üründür."

## Bölüm 4 — En yaygın örnek: faiz swap'ı
**Kavram:** sabit ↔ değişken faiz takası · **Animasyon:** iki kişi kartı; ortada çift yönlü ok. Sol taraf düz çizgi (sabit), sağ taraf dalgalı çizgi (değişken); ok animasyonuyla çizgiler yer değiştirir
- E1: "Ayşe'nin kredisi **değişken** faizli. Faiz yükselirse ödemesi artıyor — bu belirsizlik onu rahatsız ediyor."
- E2: "Mehmet'in kredisi **sabit** faizli. O ise faizlerin düşeceğini düşünüyor, sabit ödemeye takılı kalmak istemiyor."
- E3: "İkisi anlaşır: Ayşe bundan sonra sabit öder, Mehmet değişken. **Faiz swap'ı** budur."
- E4: "Krediler yerinde duruyor — bankalar değişmedi. Değişen sadece aralarındaki **ödeme akışı**."
- E5 (sayı örneği): "Ana para 1.000.000 ₺ (buna 'nominal' denir; el değiştirmez, sadece hesap için). Sabit taraf %40 öder. Değişken taraf o dönemin faizini öder."
- **Not kutusu:** "Nominal tutar taraflar arasında el değiştirmez. Yalnızca ödeme farkı el değiştirir."

## Bölüm 5 — Karşı taraf riski (yine)
**Kavram:** OTC'nin bedeli — Forward'daki kavrama açık atıf · **Animasyon:** Forward Nedir'deki `KarsiTarafRiskiSVG` AYNEN reuse (kopan el sıkışma + VİOP tarafında takas kurumu kalkanı)
- E1: "Swap da forward gibi **tezgâh üstü (OTC)** bir üründür. Borsada işlem görmez."
- E2: "Yani **Forward Nedir**'de gördüğün risk burada da var: karşı taraf sözünü tutmazsa, elinde sadece bir anlaşma kalır."
- E3: "Üstelik swap'ta bu risk daha uzun sürer — forward tek vadede biter, swap aylarca hatta yıllarca devam eder."
- E4: "Her ödeme tarihi, karşı tarafın yükümlülüğünü yerine getirmesi gereken yeni bir andır."
- **Bilgi kutusu (uyarı tonu):** "Kurumsal swap'larda taraflar genelde çerçeve sözleşme ve teminat şartı koyar. Bu zorunlu değil, anlaşmaya bağlıdır."

## Bölüm 6 — Neden swap var?
**Kavram:** riskten korunma (hedging) — çiftçi örneğine paralel · **Animasyon:** Forward/VİOP'taki `BugdaySVG` mantığında: dalgalı faiz çizgisi vs sabit ödeme çizgisi
- E1: "Bir şirket düşün: 10 milyon ₺ değişken faizli kredisi var."
- E2: "Faiz yükselirse ödemesi artar; bütçesini kuramaz, fiyatlamasını yapamaz."
- E3: "Swap ile sabit tarafa geçer: artık her ay ne ödeyeceğini bilir."
- E4: "Amaç kazanç değil, **belirsizliği azaltmak** — buğdayını bugünden fiyatlayan çiftçiyle aynı mantık."
- E5 (kapanış — seri köprüsü): "Üçünü birlikte düşün: **VİOP** borsada standart kontrat, **forward** taraflar arası tek seferlik anlaşma, **swap** ise taraflar arası tekrar eden anlaşma. Üçü de aynı soruyu yanıtlıyor: geleceğin belirsizliğini bugünden nasıl yönetirim?"

## Bölüm 7 — Mini simülasyon
**Kavram:** öğrenileni uygula · **Yapı:** Forward'daki `Simulasyon.tsx` deseni (`useReducer`, adım adım, sonda karne)

**Akış:** TARAF SEÇ → 4 ÇEYREK İLERLET → KARNE

1. **Taraf seç:** "1.000.000 ₺ nominal, 1 yıllık faiz swap'ı. Sabit oran %40. Hangi tarafı alırsın?"
   → [Sabit öderim — değişken alırım] / [Değişken öderim — sabit alırım]
2. **Çeyrekler:** buton → her tıklamada bir çeyreğin değişken faizi belirir (%30–%55 arası), o çeyreğin nakit farkı hesaplanır ve tabloya eklenir. 4 çeyrek.
   - Sabit ödeyen için çeyrek farkı: `(değişken − 40) / 4 × nominal / 100`
   - Değişken ödeyen için tersi
3. **Karne:** dört çeyreğin tablosu (dönem · değişken faiz · o çeyreğin farkı) + toplam net + tek cümlelik ders + [Yeniden dene]
   - Ders, sonuca göre değişir: değişken yükseldiyse sabit ödeyen lehine; düştüyse aleyhine.
   - **Her durumda vurgu:** "Swap'ın amacı bu sayıyı büyütmek değil, ödemeni öngörülebilir kılmaktı."

---

## Bölüm haritası — üç eğitim karşılaştırması

| VİOP (11) | Forward (7) | Swap (7) | Not |
|---|---|---|---|
| B1 tanıdık senaryo | B1 | B1 | üçünde de aynı THYAO girişi |
| B2 kapora | B2 fiyat kilidi | B2 **ev takası** | metafor araca özgü |
| B3 teminat | B3 OTC/özel anlaşma | B3 **forward'ların dizisi** | swap forward'ın üzerine kuruluyor |
| B4-B6 kaldıraç/kâr/zarar | — | B4 **faiz swap'ı** | swap'ın somut örneği |
| B7 teminat tamamlama | B4 karşı taraf riski | B5 **karşı taraf riski (tekrar)** | aynı SVG reuse, süre vurgusu eklendi |
| B8-B9 long/short | B5 | — | swap'ta long/short yerine sabit/değişken taraf var (B4'te) |
| B10 neden var | B6 | B6 | çiftçi mantığı + seri kapanışı |
| B11 simülasyon | B7 | B7 | swap'ta 4 çeyrek ilerletmeli |

## Terminoloji sözleşmesi (üç eğitimde ortak)
- **karşı taraf riski** — hep bu haliyle (counterparty risk değil)
- **tezgâh üstü (OTC)** — ilk geçişte uzun hali + parantez içinde OTC
- **takas kurumu** — VİOP tarafındaki merkezi karşı taraf
- **teminat** — yalnız VİOP ve "zorunlu değil" notuyla forward/swap'ta
- **nominal** — swap'a özgü, ilk geçişte "el değiştirmez, sadece hesap için" açıklamasıyla
