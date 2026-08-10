# "Forward Nedir?" — İçerik Planı (ekran ekran)

**Tarih:** 9 Ağustos 2026 · **Durum:** PLAN → uygulandı (`/egitimler/turev-araclar/forward-nedir`)
**Kardeş notlar:** [[viop-nedir-icerik-plani]] · [[viop-nedir-ux-plani]] · [[viop-nedir-teknik-plan]] · [[egitimler-menu-forward-log]]
**Üslup sözleşmesi:** [[viop-nedir-icerik-plani]] ile BİREBİR aynı — sen-dili, kısa cümleler, tek kavram/bölüm, ölçülü emoji, yargı/yönlendirme yok. Kâr=yeşil, zarar=kırmızı. SPK çerçevesi: "kazanırsın" değil "pozisyon değer kazanır".

> ⚠️ Sayfa başı ve sonu sabit disclaimer: "Bu içerik eğitim amaçlıdır; yatırım tavsiyesi değildir. Forward sözleşmeleri tezgâh üstü (OTC) ürünlerdir; karşı taraf riski taşır."

**Anlatı şablonu (VİOP'tan devralınan):** bilinen dünyadan başla → günlük hayat metaforu → aynı kavramı finansal örneğe taşı → tek seferde tek kavram → ara sorularla etkileşim → final mini simülasyon.

**Kavramsal köprü:** VİOP Nedir okuyucusu buraya geldiğinde "aynı fikrin daha eski/daha basit hali" hissini almalı. Forward = atası, VİOP = kurumsallaşmış hali.

---

## Bölüm 1 — Bildiğin şeyi hatırlayalım
**Kavram:** hisse alım-satımı (tanıdık zemin — VİOP'takiyle aynı giriş) · **Animasyon:** THYAO kartı + 330₺ → 340₺ sayaç, +%3 yeşil rozet
- E1: "THYAO'dan 100 lot aldın diyelim. Tanesi 330 ₺."
- E2: "Toplam 33.000 ₺ ödedin. Hisse bugün senin, fiyatı da bugünün fiyatı."
- E3: "Alım da teslim de **bugün** oldu. Şimdi bunu bozacağız: ya anlaşmayı bugün yapıp teslimi ileriye bıraksaydık?"
- **Soru 1 (devam kapısı):** "Buraya kadar tanıdık mı?" → [Evet, devam] / [Kısaca hatırlat] (ikincisi tek ekranlık mini özet açar)

## Bölüm 2 — Günlük hayat: fiyatı bugünden kilitlemek
**Kavram:** forward fikrinin özü — anlaşma bugün, teslim ileride · **Animasyon:** takvim ikonu; "bugün" ve "3 ay sonra" iki nokta, aralarında kilitli fiyat etiketi taşıyan çizgi
- E1: "Kahvecinin sahibisin. Çekirdek fiyatı şu an kilosu 100 ₺."
- E2: "Üreticiye gidiyorsun: 'Üç ay sonra 500 kilo alacağım, ama fiyatı **bugünden** 100 ₺ konuşalım.'"
- E3: "El sıkışıyorsunuz. Para da mal da bugün el değiştirmiyor — sadece **söz** veriliyor."
- E4: "Üç ay sonra çekirdek 130 ₺ olsa da, 80 ₺ olsa da: sizin fiyatınız 100 ₺."
- **Not kutusu:** "VİOP'taki ev kaporası 'pozisyon açmak' içindi. Buradaki el sıkışma ise doğrudan **fiyatı sabitlemek** için — forward'ın tek işi bu."

## Bölüm 3 — Forward'ın mantığı: bu bir ÖZEL anlaşma
**Kavram:** OTC / tezgâh üstü — VİOP'tan en kritik fark · **Animasyon:** ikiz kart — solda "VİOP: borsa" (standart kontrat ikonu, ortada borsa binası), sağda "Forward: iki taraf" (iki kişi arasında doğrudan çizgi, borsa yok)
- E1: "Aynı fikri finansal piyasada yaptığında adı **forward sözleşmesi** olur."
- E2: "Ama önemli bir fark var: forward borsada işlem görmez. İki taraf **kendi aralarında** anlaşır."
- E3 (ikiz kart):
  | | VİOP | Forward |
  |---|---|---|
  | Nerede | Borsada (BIST VİOP) | Taraflar arasında (OTC) |
  | Şartlar | Standart: miktar, vade, teminat belli | Serbest: ne konuşursanız o |
  | Devretme | Kolay, karşı taraf borsa | Zor, karşı tarafın onayı gerekir |
- E4: "Bu esneklik forward'ın gücü: '500 kilo, 12 Ekim, şu kalite' diyebilirsin. Borsa kontratında böyle bir özelleştirme yok."
- **Soru 2 (tahmin):** "Peki bu serbestliğin bir bedeli var mı sence?" → [Var] / [Yok] / [Emin değilim] — cevap ne olursa olsun Bölüm 4 bedeli gösterir; "Var" diyene "✓ tahminin doğru" rozeti.

## Bölüm 4 — Bedeli: karşı taraf riski
**Kavram:** counterparty risk — VİOP'ta olmayan, forward'a özgü · **Animasyon:** el sıkışma ikonu; sağdaki el soluyor/kayboluyor, aradaki bağ kopuk çizgiye dönüşüyor. VİOP tarafında araya "takas kurumu" kalkanı giriyor.
- E1: "Üç ay doldu. Çekirdek 130 ₺ olmuş. Senin anlaşman 100 ₺."
- E2: "Üretici bakıyor: sana 100 ₺'den satarsa 30 ₺ kaybediyor. Ya sözünü tutmazsa?"
- E3: "İşte **karşı taraf riski** bu: anlaşmanın diğer ucundaki kişi yükümlülüğünü yerine getirmezse, elinde sadece bir söz kalır."
- E4: "VİOP'ta bu risk yoktur — çünkü araya **takas kurumu** girer. Herkesin karşı tarafı borsadır; teminat sistemi de bunun için vardır."
- **Bilgi kutusu (uyarı tonu):** "Forward'da güvence tarafların anlaşmasına bağlıdır. Bazı forward'larda taraflar kendi aralarında teminat/garanti şartı koyar; bu zorunlu değil, pazarlık konusudur."

## Bölüm 5 — Long / Short
**Kavram:** iki yön · **Animasyon:** VİOP'takiyle AYNI asansör çifti (long ↑ / short ↓), yeşil pozisyon rozeti
- E1: "Forward'da da iki taraf vardır."
- E2 (long): "**Uzun taraf (long):** ileride almayı taahhüt eder. Fiyat yükselirse pozisyonu değer kazanır — düşük fiyattan alma hakkı elinde."
- E3 (short): "**Kısa taraf (short):** ileride satmayı taahhüt eder. Fiyat düşerse pozisyonu değer kazanır — yüksek fiyattan satma sözü elinde."
- E4: "Kahveci sensin: alacaksın, yani long'sun. Üretici short."
- **Not:** "Birinin kazancı diğerinin kaybıdır. Forward sıfır toplamlıdır."

## Bölüm 6 — Neden forward var?
**Kavram:** riskten korunma (hedging) + kavramsal köprü · **Animasyon:** VİOP'takiyle AYNI buğday grafiği — dalgalı piyasa çizgisi vs sabit anlaşma çizgisi
- E1: "Çiftçi hasadı Eylül'de kaldıracak. Buğday fiyatı o güne kadar ne olur, bilmiyor."
- E2: "Bugünden 'Eylül'de şu fiyata satarım' diye anlaşırsa, fiyat düşse de geliri bellidir."
- E3: "Forward'ın asıl amacı budur: kazanç değil, **belirsizliği azaltmak**."
- E4 (köprü — kapanış): "Forward bu fikrin en eski ve en basit hali; yüzyıllardır tüccarlar arasında yapılıyor. VİOP ise aynı fikrin **kurumsallaşmış** hali: borsaya taşınmış, standartlaştırılmış, teminat ve takas sistemiyle karşı taraf riski ortadan kaldırılmış. İkisi rakip değil — biri diğerinin evrimi."

## Bölüm 7 — Mini simülasyon
**Kavram:** öğrenileni uygula · **Yapı:** VİOP'taki `Simulasyon.tsx` deseni (`useReducer`, adım adım akış, sonunda karne)

**Akış:** TARAF SEÇ → VADE GELDİ (fiyat çekilir) → SONUÇ → *(fiyat aleyhineyse)* KARŞI TARAF KARARI → KARNE

1. **Taraf seç:** "Kahve çekirdeği, bugünkü fiyat 100 ₺/kg. 3 ay sonrası için 100 ₺'den 500 kilo forward yapıyorsun. Hangi taraftasın?" → [Long — alacağım] / [Short — satacağım]
2. **Vade geldi:** buton → üç senaryodan biri belirir (130 ₺ / 100 ₺ / 80 ₺)
3. **Sonuç:** pozisyon farkı hesaplanır ve gösterilir (long için `(spot − 100) × 500`, short için tersi)
4. **Karşı taraf kararı — forward'a özgü adım:** yalnızca karşı taraf zarardaysa çıkar. "Karşı taraf bu anlaşmada 15.000 ₺ zararda. Ne yapar?" → [Sözünü tutar] / [Kaçar]
   - "Sözünü tutar" → anlaşma tamamlanır, fark ödenir
   - "Kaçar" → **karne uyarısı:** "Kâğıt üstündeki kârın gerçekleşmedi. Forward'da seni koruyan bir takas kurumu yok — bu **karşı taraf riski**. VİOP'ta bu adım hiç olmazdı."
5. **Karne:** seçilen taraf · vade fiyatı · pozisyon farkı · karşı taraf sonucu · tek cümlelik ders + [Yeniden dene]

---

## Bölüm haritası (11 → 7)
VİOP 11 bölümdü; forward'da teminat/kaldıraç/teminat tamamlama zinciri **yok** (forward'da teminat zorunlu değil), bu yüzden 7 bölüm. Bölüm sayısı azaldı ama şablon aynı: tanıdık zemin → metafor → kavram → risk → yön → gerekçe → simülasyon.

| VİOP | Forward | Not |
|---|---|---|
| B1 tanıdık senaryo | B1 | aynı THYAO girişi |
| B2 kapora metaforu | B2 kahve anlaşması | metafor forward'a özgü: fiyat kilitleme |
| B3 teminat | B3 **OTC / özel anlaşma** | forward'ın kritik farkı |
| B4-B6 kaldıraç/kâr/zarar | — | forward'da kaldıraç zinciri yok |
| B7 teminat tamamlama | B4 **karşı taraf riski** | paralel konum, forward'a özgü kavram |
| B8-B9 long/short | B5 | asansör metaforu aynen |
| B10 neden var | B6 | çiftçi örneği + kavramsal köprü |
| B11 simülasyon | B7 | + karşı taraf kararı adımı |
