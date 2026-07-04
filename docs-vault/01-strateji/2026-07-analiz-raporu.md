# ParaKonuşur — Temmuz 2026 Analiz Raporu (Faz 1)

**Tarih:** 4 Temmuz 2026
**Kapsam:** Görev A-G — pazar/rakip, boşluk, UX, teknik altyapı, finansal kalite, davranışsal uyum, frontend önerileri.
**Yöntem:** Kod tabanı taraması (son commit `5b4c06c`, 9 Mayıs 2026), 4 Temmuz 2026 web araştırması, gerçek BIST verisiyle sayısal test (RSI). Eski dokümanlardan ([[parakonusur_handoff_v9]], [[parakonusur_strateji_raporu]]) hiçbir bulgu kopyalanmadı; tümü yeniden doğrulandı. Fark analizi: [[handoff-v9-fark-analizi]].
**Not:** Bu doküman yatırım tavsiyesi veya hukuki görüş değildir.

---

## A. Market ve Rakip Analizi (güncel, 4 Temmuz 2026)

### A.1 Pazar büyüklüğü — doğrulandı
- **Pay senedi yatırımcı sayısı: 6.405.563** (MKK, 26 Haziran 2026 kapanış verisi). Strateji raporundaki ~6,4M rakamı hâlâ geçerli. Halka açık payların büyüklüğü 9,33 trilyon TL; BIST Pay Piyasası'nda 606 şirket. Kaynak: [borsagundem.com.tr](https://www.borsagundem.com.tr/mkk-acikladi-pay-senedinde-yatirimci-sayisi-64-milyon), [finansopia.com](https://www.finansopia.com/ekonomi/borsa/borsa-istanbulda-yatirimci-sayisi-64-milyona-ulasti/)
- Yerli yatırımcı sahiplik payı %67, yabancı %33. Kitle tanımı (büyük, düşük sadakat, sınırlı okuryazarlık) değişmedi.

### A.2 Fintables — fiyatlandırma DEĞİŞMİŞ (kritik güncelleme)
Strateji raporu (1 Temmuz) Evo'yu "₺999/ay ayrı paket" olarak tanımlıyordu. Güncel arama sonucuna göre yapı şu an farklı:
- **Trade: ₺149/ay** — canlı piyasa verisi + **Evo AI 20 mesaj/ay dahil**
- **Fon: ₺149/ay** — fon karşılaştırma + Evo AI 20 mesaj/ay dahil
- **Pro: ₺699/ay** (yıllık ₺4.999) — profesyonel katman
- Yıllık Trade/Fon: ₺999 (aylık ₺1.188 yerine)

**Stratejik sonuç:** Strateji raporunun "₺0 ile ₺999 arasında geniş boşluk, ₺99-199 bandı açık" tezi **zayıfladı**. Fintables ₺149'a AI kotalı paket indirmiş durumda — ParaKonuşur'un ₺129 hedef fiyatı artık "şemsiyenin altı" değil, Fintables Trade ile **kafa kafaya**. Farklılaşma fiyattan değil, üründen (olay-tetiklemeli KAP anlatımı, kişiselleştirme, kaynak şeffaflığı) gelmek zorunda. Kaynak: [fintables.com/uyelik-paketleri](https://fintables.com/uyelik-paketleri), [fintables.com/evo](https://fintables.com/evo)

Fintables ayrıca KAP haber akışını bildirim türü bazında sayfalıyor ([borsa-haber-akisi](https://fintables.com/fintables.com/borsa-haber-akisi) sayfaları) — akış var, **yorum/anlatım hâlâ yok**.

### A.3 Midas — Piyasa Rehberi canlı, teyit edildi
7 Mayıs 2026 "Gelecek Daha Yakın" etkinliğinde duyuruldu: yapay zekâ destekli **Piyasa Rehberi** — hisse detay sayfalarında kısa/anlaşılır özetler + **önemli gelişmelerde otomatik anlık bildirim**; ~4M kullanıcıya ücretsiz. Aynı pakette: Atlas (masaüstü platform), Avrupa borsaları, VİOP, DeFi. Kaynak: [webrazzi.com](https://webrazzi.com/2026/05/11/midas-in-yeni-ozelliklerini-midas-ceo-su-egem-eraslan-ile-konustuk/), [egirisim.com](https://egirisim.com/2026/05/08/midasin-yeni-urunleri-atlas-avrupa-borsalari-viop-piyasa-rehberi-ve-defi/), [forbes.com.tr](https://www.forbes.com.tr/fintek/midas-islem-yelpazesine-bes-yeni-urun-ekledi)

**Stratejik sonuç:** "Genel özet + önemli gelişme bildirimi" savaşı fiilen kaybedildi (öngörüldüğü gibi). Kalan savunulabilir alan: **KAP-bildirimi-derinliğinde, portföy-kişisel, broker-bağımsız** anlatım. Midas'ın bildirimi "genel önemli gelişme"; ParaKonuşur'un hedefi "senin izleme listendeki hissenin bildirimi, sana özel bağlamla" olmalı.

### A.4 borsapara.com — ulaşılamıyor
`borsapara.com` DNS çözümlemesi başarısız (4 Temmuz 2026, www'lu ve www'suz denendi); web aramasında da aktif bir ürün izi yok. **Aktif bir rakip değil.** İsim karışıklığı olasılıkları: Uzman Para (uzmanpara.milliyet.com.tr — portal, analiz aracı değil), Paratic Piyasalar, [BistScan](https://app.bistscan.com/) ("akıllı borsa analiz ve sinyal takip sistemi" — sinyal-satıcısı kategorisi, güven açısından ParaKonuşur'un bilinçli uzak durduğu segment).

### A.5 Rakip matrisi — hangi satırlar değişti

| Rakip | Strateji raporundaki durum | Temmuz 2026 durumu | Değişim |
|---|---|---|---|
| Fintables | Pro ₺699 / Evo ₺999, AI mesaj kotalı | Trade/Fon ₺149 (Evo 20 mesaj dahil), Pro ₺699 | **Değişti** — AI ucuz katmana indi, fiyat şemsiyesi daraldı |
| Midas | Piyasa Rehberi duyuruldu | Canlı, ücretsiz, ~4M kullanıcı + Atlas/VİOP/Avrupa | Geçerli, teyit edildi |
| Matriks/Foreks/İdeal | Profesyonel terminal, B2B2C | Değişim izi yok | Geçerli |
| KAP | Ham, teknik, anlatımsız | Değişim yok | Geçerli — boşluk duruyor |
| AI niş oyuncular | Sinyal-satıcısı görünüm | BistScan vb. aktif | Geçerli — kategori güven sorunu sürüyor |

---

## B. Ürün Boşluk Analizi (güncellenmiş)

| # | Boşluk | Pazar durumu (Temmuz 2026) | Kod tabanı durumu | Verdict |
|---|---|---|---|---|
| 1 | **KAP explainer** | Midas *genel* özet+bildirimi kapattı; Fintables KAP'ı listeliyor, yorumlamıyor. Kişisel + KAP-derin versiyon **hâlâ boş** | [haberler/route.ts](app/api/haberler/route.ts) demo URL'de son 10 ODA bildirimini listeliyor; AI özet boru hattı, sınıflandırıcı, kişisel push **yok**; `kap_bildirimleri` tablosu yok | **AÇIK ama pencere daralıyor** — Midas'ın kişiselleştirmeye inmesi an meselesi; 6-12 aylık pencere varsayımı makul |
| 2 | **Atıf motoru** ("neden düştü/çıktı") | Hiçbir rakipte yok (Midas Rehberi kısmen değiyor: "önemli gelişme" bildirimi neden'e yaklaşıyor ama hisse-hareket-atıf formatında değil) | Hacim anomalisi + momentum faktörleri [risk/route.ts](app/api/risk/route.ts)'te hesaplanıyor; eşleştirme katmanı yok | **AÇIK** — Boşluk 1'in doğal uzantısı |
| 3 | **Portföy sağlık karnesi** | Rakiplerde portföy takibi var, "anlatımlı teşhis" yok | **Kısmen başlamış:** [portfoy/page.tsx:233-251](app/portfoy/page.tsx:233) değer-ağırlıklı portföy risk skoru zaten hesaplıyor; çeşitlendirme/sektör konsantrasyonu/haftalık e-posta yok | **AÇIK, en hazır boşluk** — mevcut koddan 1 hafta uzaklıkta |
| 4 | **Eğitim × ürün entegrasyonu** | Akademiler (Fintables/Midas) ayrı yaşıyor, ürün-içi bağlam yok | Embriyonik: `RISK_ACIKLAMALARI` mini-sözlüğü ([portfoy/page.tsx:34-42](app/portfoy/page.tsx:34)) risk kartlarında tek satır açıklama gösteriyor | **AÇIK** — tutkal özellik, tek başına ürün değil (değerlendirme değişmedi) |
| 5 | **Fon / halka arz anlatımı** | Fintables Fon ₺149 ile fon alanını **güçlendirdi**; halka arz izahname özeti hâlâ kimsede yok | Kod tarafında hiçbir şey yok | **Fon tarafı zorlaştı; halka arz tarafı açık** — Faz 4+ değerlendirmesi doğru |

**Net sonuç:** Beş boşluğun stratejik sıralaması değişmedi ama iki nüans var: (1) fiyat boşluğu daraldığı için Boşluk 1'in *hız* değeri arttı — tek savunma ürün derinliği; (2) Boşluk 3 kod olarak en olgun durumda, "quick win" adayı.

---

## C. UX / Product Analizi

### C.1 Onboarding (ilk 5 dakika) — net değil
Akış: register → e-posta doğrulama ekranı → login → dashboard. Sorunlar:
1. **Boş-durum yönlendirmesi yok.** İlk girişte izleme listesi, portföy, alarm boş; dashboard "ne yapmalıyım"ı söylemiyor. Kurulum sihirbazı (izleme listesi kurdur → ilk analiz yaptır) yok. Strateji raporundaki "onboarding akışı" işi (iş #12) hâlâ yapılmamış — doğrulandı.
2. [register/page.tsx](app/register/page.tsx): kullanıcı adı müsaitlik kontrolü inline yok — çakışma ancak submit'te Supabase hatasıyla dönüyor.
3. E-posta doğrulama ekranından sonra kullanıcı /login'e manuel dönüyor; doğrulama-sonrası otomatik yönlendirme yok.

### C.2 Ölü para duvarı — en kritik UX sorunu
[pro/page.tsx](app/pro/page.tsx) bir satış sayfası değil, **"YAKINDA" + e-posta bekleme listesi**. Buna rağmen uygulama Pro CTA'larıyla dolu:
- [DashboardAiPanel.tsx](components/DashboardAiPanel.tsx): tek panelde **3 ayrı** Pro CTA ("Detaylı yorumu görmek için Pro'ya geç", "Detaylı teknik analiz için Pro'ya geç", "Pro'ya Yükselt" butonu)
- [HisseChatbot.tsx](components/HisseChatbot.tsx): günlük 3 mesaj limiti dolunca input alanı tamamen "Pro'ya Yükselt" linkine dönüşüyor
- Sidebar'da kalıcı "Pro'ya Yükselt" rozeti ([AppShell.tsx:380](components/AppShell.tsx:380))

Kullanıcı tıklıyor → "yakında" görüyor. Bu (a) beklenti kırıyor, (b) paywall'ın boş olduğunu öğretiyor (lansmanda gerçek Pro çıktığında tıklama refleksi ölmüş olur), (c) Pro sayfası **"Gerçek zamanlı fiyat akışı"** vadediyor — hem gecikmeli-veri stratejisiyle hem BIST lisans gerçeğiyle çelişen bir vaat.

### C.3 Chatbot kotası — sürpriz limit
Günlük 3 mesaj hakkı ([chatbot/route.ts:56](app/api/chatbot/route.ts:56)) kullanıcıya **ancak limit dolunca** söyleniyor. Hak göstergesi baştan görünmüyor; ilk mesajdan önce "3 hakkın var" bilgisi yok. Ayrıca chatbot cevapları düz metin render ediliyor — Pako AI sayfası markdown render alırken (commit `6d9b8ea`) HisseChatbot almadı; iki AI yüzeyi arasında tutarsızlık.

### C.4 İzleme listesi — arama kapsamı: ÇÖZÜLDÜ (bayat checkout artefaktı)
**Kapanış (4 Temmuz 2026, Track 1 Görev 1):** Bulgu, origin/main'in 85 commit gerisindeki local checkout'tan kaynaklanıyormuş. Güncel main'de izleme araması `lib/bist-hisseler` üzerinden 606 hisselik tam evreni kapsıyor; A1YEN davranış testi geçti, repo genelinde hardcode liste kalmadı. Ayrıntı: [[track1-gorev1-izleme-arama-teshis]]. Aşağıdaki metin tarihsel kayıt olarak duruyor.

### ~~C.4 (eski)~~ İzleme listesi — arama kapsamı: DOĞRULANACAK (kesinleşmemiş bulgu)
**Düzeltme (4 Temmuz 2026):** Bu bulgu ilk sürümde "arama 50 hisseyle sınırlı, kırık" olarak raporlanmıştı; ekip geri bildirimi 607 hissenin mevcut olduğu ve 50'nin sayfalama/sayfa boyutu kaynaklı göründüğü yönünde. Kök neden netleşmeden "kırık" sayılmamalı. İki gözlem yan yana:
- Kod okuması: [izleme/page.tsx:165](app/izleme/page.tsx:165) `filteredBIST`, dosya içindeki 50 elemanlık lokal `BIST_HISSELER` dizisini filtreliyor; `PER_PAGE=10` sayfalaması ise izleme *listesinin görüntülenmesine* uygulanıyor (satır 162-163) — yani kod okumasına göre arama kaynağı ile sayfalama ayrı mekanizmalar.
- Ekip bilgisi: 607 hisse eviren mevcut; görünen 50 sınırı sayfalama meselesi olabilir (/hisseler sayfası 607 hisseyi server-side sayfalıyor, dashboard araması `lib/bist-hisseler` kullanıyor).

**Yapılacak:** İzleme sayfasındaki arama kutusuna 50'lik listede olmayan bir ticker (ör. A1YEN) yazılarak davranış testi — sonuca göre ya bulgu kapatılır ya da kapsam düzeltmesi ayrı iş olarak açılır. O zamana kadar bu madde "doğrulanacak" statüsündedir.

Bağımsız geçerli kalan not: 50'lik hardcode listesi dashboard ve izleme'de iki ayrı kopya halinde duruyor (portföyde `lib/bist-hisseler` kullanılıyor — üçüncü desen); tek kaynağa indirme önerisi (G.1) kapsam sorusundan bağımsız geçerli.

### C.5 Alarmlar
- Alarm ekleme sonrası `window.location.reload()` ([alarmlar/page.tsx:315](app/alarmlar/page.tsx:315)) — tam sayfa yenileme, state ve scroll kaybı.
- Alarm kartında **hedefe uzaklık** gösterilmiyor (hedef 300 ₺, güncel 334 ₺ — %11 uzakta bilgisi yok).
- "Haber Alarmı" kalıcı "Yakında" rozetinde — KAP entegrasyonu beklediği için ürünün vaat ettiği çekirdek özellik gri duruyor.
- Bildirim kanalı belirsizliği: e-posta mı, uygulama içi mi geleceği alarm kurarken söylenmiyor.

### C.6 Performans/veri UX'i
- **15 sn polling her yerde:** hisse detay ([hisse/[ticker]/page.tsx:142](app/hisse/[ticker]/page.tsx:142)), portföy fiyat + grafik (15 sn ×2), dashboard hook'ları. 15 dk gecikmeli veri için 15 saniyelik yenileme oranı — sunucu maliyeti yüksek, kullanıcı değeri düşük (bkz. F.3: davranışsal olarak da zararlı).
- İzleme listesinde satır başına ayrı sparkline fetch'i ([izleme/page.tsx:84](app/izleme/page.tsx:84)) — 10 satır = 10 ayrı `/api/grafik` çağrısı (n+1).
- Hisse analizi 2 saat localStorage cache — cihaz bazlı: aynı kullanıcı telefonda tekrar üretiyor (çift Claude maliyeti); Supabase `analizler` tablosuna yazılıyor ama sayfa yüklenirken okunuyor, cache kontrolünde kullanılmıyor.

### C.7 Olumlu bulgular
"15 dk gecikmeli" pill'i ([hisse/[ticker]/page.tsx:287](app/hisse/[ticker]/page.tsx:287)), portföyde piyasa-kapalı/kapanış etiketi mantığı ([portfoy/page.tsx:105-133](app/portfoy/page.tsx:105)), alarm/izleme boş-durum tasarımları, hisse sayfası disclaimer'ları, register'daki "yatırım tavsiyesi değildir" onayı — hepsi doğru yönde.

---

## D. Teknik Temel Yapı Analizi

Başlangıç noktası: [[handoff-v9-fark-analizi]] (donmuş kod tabanı — 9 Mayıs'tan beri commit yok; KAP demo'da takılı; kayıp bilanço route'u; çift cron riski).

### D.1 Ölçeklenme — launch trafiğinde ne kırılır
1. **In-memory rate limit fiilen bypass edilebilir.** `analiz` (10/saat), `chatbot` (20/dk) limitleri `globalThis` Map'te ([analiz/route.ts:74](app/api/analiz/route.ts:74), [chatbot/route.ts:18](app/api/chatbot/route.ts:18)). Vercel serverless'ta her instance'ın kendi Map'i var ve cold start'ta sıfırlanıyor → paralel istekler farklı instance'lara düşüp limiti aşar. **Claude API maliyet saldırısına açık en kritik nokta** (chatbot'un günlük 3 hakkı Supabase'te — o sağlam; dakika limiti ve analiz limiti değil).
2. **`/api/risk` tamamen korumasız:** auth yok, rate limit yok, cache yok. Her çağrı 2 Yahoo + 1 TradingView isteği tetikliyor. Botla dövülürse hem Yahoo IP banı hem function-invocation faturası riski. Portföy sayfası da her açılışta N hisse × risk çağrısı yapıyor (kendi kendine yük).
3. **15 sn polling mimarisi:** kullanıcı başına dakikada ~8-12 function invocation (hisse + portföy + dashboard). Birkaç yüz eşzamanlı kullanıcıda Vercel Hobby limitlerini zorlar; snapshot verisi Supabase'te zaten var — client'ın Yahoo-proxy'ye değil snapshot'a bakması yeterli olurdu.
4. In-memory fiyat cache'i (15 sn TTL) cold start'ta boşalıyor → her cold start Yahoo'ya seri fetch dalgası.

### D.2 Güvenlik — launch'a hazırlık
1. **Secret hijyeni:** `CRON_SECRET` (`[REDACTED]`) düz metin olarak `docs-vault/01-strateji/parakonusur_handoff_v9.md` içinde duruyor ve **docs-vault repoya commit'lenecek durumda** (.gitignore yalnızca `docs-vault/.obsidian/` hariç tutuyor — o satır da mükerrer). Commit atılırsa secret git geçmişine girer. Ayrıca 9 Mayıs handoff'unda (Downloads'ta) KAP demo API anahtarları düz metin. **Rotasyon + vault secret temizliği commit'ten önce şart.**
2. **Auth pattern'leri doğru:** analiz/chatbot/alarmlar Bearer token + `getUser(token)` kullanıyor; hesap silmede token'dan user alınıyor. `/api/risk` ve `/api/grafik` bilinçli açık olabilir ama en azından risk route'una IP-bazlı limit gerekli.
3. **RLS audit yapılamıyor:** client doğrudan `supabase.from("watchlist"/"portfoy"/"analizler")` çağırıyor — güvenlik tamamen Supabase RLS politikalarında. Politikalar repoda yok (migration dosyası yok) → **launch öncesi Supabase dashboard'dan RLS audit** yapılmalı ve politikalar migration olarak koda alınmalı.
4. `chatbot_usage` tablosu dokümantasyonda yok (`.claude/CLAUDE.md` tablo listesinde eksik) — şema kaynağı tek yer olmalı.
5. Sentry/izleme yok: production'da hata görünürlüğü sıfır (değişmedi).

### D.3 Performans — Vercel Hobby gerçekleri
- `hisse-snapshot` cron `maxDuration = 60` ile 606 hisseyi işliyor — Hobby'de 60 sn tavanına yakın; hisse sayısı arttıkça veya Yahoo yavaşladıkça timeout riski. Batch'leme/parçalama düşünülmeli.
- Cold start + in-memory cache kombinasyonu p95 gecikmeleri öngörülemez yapar; kritik endpoint'lerde (fiyatlar) Supabase snapshot-first okuma hem hızlı hem ucuz.

### D.4 Ayrı aksiyon maddeleri (bu raporun kapsamı dışında, ayrıca ele alınacak)

> **AKSİYON 1 — Kayıp bilanço route'u:** 9 Mayıs handoff'u `app/api/bilanco/route.ts` (KAP FR tipi) "yazıldı" diyor; dosya çalışma ağacında ve git geçmişinde yok (`git log --all -- app/api/bilanco` boş). Commit edilmeden kaybolmuş. **Yapılacak:** KAP demo erişimiyle yeniden yazılıp commit edilmesi; handoff'taki tarife göre `disclosures` FR-tipi filtreleme temel alınabilir.

> **AKSİYON 2 — Çift alarm cron'u:** Alarm kontrolü İKİ yerden tetikleniyor: `.github/workflows/alarm-cron.yml` **her 15 dakikada** (`*/15 * * * *`) + `vercel.json` **iş günleri 09:00** (`0 9 * * 1-5`). Hafta içi 09:00'da ikisi çakışır → aynı alarm için çift e-posta riski; ayrıca GH Actions'ın 15 dk'lık temposu ile Vercel'in günlük temposu farklı davranış üretir. **Yapılacak:** tek tetikleyiciye indirilmesi (öneri: GH Actions kalsın, `vercel.json` cron'u silinsin — snapshot cron'la aynı desen) + `/api/cron/alarmlar`'a idempotency (son tetiklenme zamanı kontrolü).

---

## E. Finansal Analiz Özelliklerinin Kalite Değerlendirmesi

### E.1 Risk skoru motoru — literatür uyumu

| Faktör (ağırlık) | Kod yaklaşımı | Literatür standardı | Değerlendirme |
|---|---|---|---|
| Beta %25 | 3 aylık günlük getiri, XU100'e karşı kovaryans/varyans | CAPM doğru; ama pencere kısa — yaygın pratik 1-2 yıl günlük veya 5 yıl aylık | Formül doğru, **62 gözlem gürültülü**; beta gün gün oynar |
| Volatilite %20 | stddev × √252, yıllıklandırılmış | Standart | Uyumlu |
| 52H pozisyon %15 | >0.9 balon riski, <0.15 dip riski | Momentum literatürüyle (52w-high etkisi, George & Hwang 2004) uyumlu sezgi | Makul heuristic |
| Momentum %15 | Son 20g ort. / önceki 40g ort. | Kısa-dönem momentum proxy'si | Pragmatik, kabul edilebilir |
| Hacim anomalisi %10 | Güncel/3 ay ort. | Yaygın pratik | Uyumlu |
| **RSI %10** | **Basit ortalama, son 15 kapanış, yüzde getiriler üzerinden** | **Wilder (1978): fiyat farkları + üstel (1/14) smoothing, tüm seri** | **Sapmalı — aşağıda test** |
| Günlük range %4, Likidite %5 | Basit eşikler | — | Makul |
| F/K %5, PD/DD %5 | TradingView Scanner, null→40 nötr | — | Makul; kaynak bağımlılığı riski |

**RSI sapma testi (gerçek veri, 4 Temmuz 2026, 8 hisse):**

| Ticker | RSI (kod) | RSI (Wilder) | Fark | Risk bucket değişti mi? |
|---|---|---|---|---|
| THYAO | 74,9 | 66,5 | **+8,4** | hayır (ama kod 75 "aşırı alım" eşiğinin kılpayı altında — Wilder'a göre 8+ puan uzakta) |
| PGSUS | 57,1 | 50,6 | +6,5 | hayır |
| GUBRF | 47,5 | 41,6 | +5,9 | hayır |
| ASELS | 55,4 | 52,1 | +3,3 | hayır |
| SASA | 33,1 | 36,3 | −3,2 | hayır |
| KRDMD | 49,7 | 46,9 | +2,9 | hayır |
| **EREGL** | **60,1** | **57,4** | +2,7 | **EVET** (30 vs 15 — risk bileşeni 2×) |
| GARAN | 57,6 | 55,8 | +1,8 | hayır |

Yorum: (1) Sapma tipik +2..+8 puan; toplam skora etkisi ağırlık %10 nedeniyle ≤ ~1,5 puan — **skor açısından tolere edilebilir**. (2) Asıl sorun **görünen değer**: RSI, UI'da sayı olarak gösteriliyor; TradingView/Matriks ile karşılaştıran kullanıcı farklı sayı görür → "bunların RSI'ı yanlış" algısı, güven konumlandırmasına doğrudan zarar. (3) Kod yalnızca son 15 kapanışı kullandığı için değer günden güne Wilder'dan çok daha oynak. **Öneri: Wilder'a geçiş "düşük öncelik backlog" değil, "güven ürünüyseniz orta öncelik" olmalı.**

Yapısal notlar: ağırlıklar makul ama **metodoloji sayfası yok** — "risk skoru nasıl hesaplanıyor" hâlâ yayınlanmamış (güven stratejisinin en ucuz taşı). [risk/route.ts:204](app/api/risk/route.ts:204)'te `* (isEndeks ? 1 : 1)` ölü kod; likidite ağırlığı kodda 0.05, CLAUDE.md'de %5, v9'da 0.06 — küçük doküman tutarsızlığı.

### E.2 AI yorum sistemi — yapısal jeneriklik sorunu
[analiz/route.ts](app/api/analiz/route.ts) prompt'una giden **verinin tamamı** şudur (THYAO ile 4 Temmuz 2026'da birebir yeniden üretildi):

```
Fiyat: 334 ₺
Günlük aralık: 330,75 – 335,75 ₺
52 haftalık aralık: 262,75 – 352,5 ₺
Hacim: 44.008.702 adet
```

Bu 5 sayıdan modele **"Şirket Profili" ve "Finansal Durum"** bölümleri yazdırılıyor. Model bu bölümleri ya eğitim verisinden (güncelliği belirsiz, doğrulanamaz) ya da jenerik kalıplarla doldurmak zorunda — **bu bir prompt kalitesi sorunu değil, girdi tavanı sorunu**. Sonuç öngörülebilir şekilde: "Piyasa Konumu" ve "Dikkat Noktaları" bölümleri veri-bazlı ve savunulabilir (52H pozisyonu, hacim yorumu); "Şirket Profili" ve "Finansal Durum" bölümleri karar destekleme açısından zayıf/jenerik. `kisaYorum` modu (tek cümle) fiyat/52H tekrarının ötesine geçemiyor.

**Rakip kıyası:** Fintables Evo standardize bilanço verisinin üzerinde oturuyor (finansal tablolara soru sorulabiliyor) — içerik derinliğinde açık ara önde. Midas Rehberi haber/gelişme bağlamı taşıyor. ParaKonuşur'un AI'ı şu an ikisinden de az bilgiyle konuşuyor. **Kapatma yolu bellidir ve zaten stratejidir: KAP bildirimleri + KAP künye/pay verisi prompt'a girmeden AI çıktısı rekabetçi olamaz.** Ara adım olarak maliyetsiz iyileştirme: risk motorunun zaten hesapladığı F/K, PD/DD, beta, RSI, momentum değerlerini analiz prompt'una eklemek (aynı fetch zinciri, sıfır ek kaynak).

### E.3 SPK sınırı yönetimi — yeterlilik değerlendirmesi
**İyi çalışan katmanlar:**
- Prompt'larda "yatırım tavsiyesi verme" talimatı (analiz + chatbot)
- Chatbot'ta çıktı-sonrası regex filtresi ([chatbot/route.ts:22-32](app/api/chatbot/route.ts:22)) + her cevaba zorunlu "Bu analiz yatırım tavsiyesi değildir."
- UI disclaimer'ları (hisse sayfası, AI panel, register onayı)

**Zayıf noktalar:**
1. **"Görünüm" çerçevelemesi:** `AI Skoru = 100 − risk` dönüşümü + "Güçlü Görünüm / Olumsuz Görünüm" etiketi ([DashboardAiPanel.tsx:22-28](components/DashboardAiPanel.tsx:22)) risk ölçüsünü **yön beklentisi gibi** sunuyor. "Güçlü Görünüm" yeşil renkte tek sayıyla verildiğinde, ortalama kullanıcı bunu al sinyali olarak okur. III-37.1'in "yönlendirici nitelik" kriterine *yaklaşan* en riskli UI öğesi bu — metin değişikliği ucuz, hukuki konfor kazancı büyük (bkz. G.3).
2. **Regex filtresi eksik kalıplar kaçırıyor:** "almalısın", "satmalısın", "yükselecek", "düşecek", "hedef fiyat X" yakalanmıyor; filtre son savunma hattı olarak kalmalı, genişletilmeli.
3. **API-düzeyi disclaimer yok:** `/api/analiz` yanıtına server-side disclaimer eklenmiyor; UI eklemezse (veya API doğrudan çağrılırsa) çıplak içerik dönüyor. Strateji raporundaki "AI çıktı standardı bileşeni" (iş #10) yapılmamış — doğrulandı.
4. Chatbot'a kullanıcının portföyü prompt'a veriliyor ([chatbot/route.ts:93](app/api/chatbot/route.ts:93)) — kişiselleştirme derinleştikçe "kişiye özel + yönlendirici" tanımına yaklaşılır; şu an yönlendirme yasağı korunuyor ama **yazılı hukuki görüş alınmadan** portföy-bazlı cevap derinleştirilmemeli.

---

## F. Psikolojik ve Rasyonel Tüketici Uyumu

Hedef persona (21-45, mobil-öncelikli, bilanço okuyamayan, X/Telegram'dan beslenen, "bir şey oluyor ama anlamıyorum" kaygısı) için davranışsal bulgular ve **somut** karşılıkları. TR yatırımcılarında aşırı güven, çıpalama, kayıptan kaçınma ve sürü davranışının belgelendiği yerel literatür: [dergipark — bireysel yatırımcı eğilimleri](https://dergipark.org.tr/en/pub/mbdd/issue/60927/658324), [İKÜ çalışması](https://openaccess.iku.edu.tr/server/api/core/bitstreams/16e43d6a-d0d3-4e92-a466-88aeed5f3f92/content), [finansal okuryazarlık-yanlılık ilişkisi](https://dergipark.org.tr/tr/pub/biibfad/issue/66329/901371).

| # | Davranışsal olgu | Üründeki mevcut tetikleyici | Somut öneri |
|---|---|---|---|
| 1 | **Kayıptan kaçınma** (kayıplar ~2× ağır hissedilir; Kahneman-Tversky 1979) | Portföyde büyük kırmızı K/Z; kayıp günlerinde panik satış zemini | K/Z yanına **göreli çerçeve**: "Portföyün %-1,4 · XU100 %-2,1" — kaybı piyasa bağlamına oturtmak paniği düşürür. Haftalık karnede mutlak TL yerine yüzde+bağlam dili |
| 2 | **Disposition effect** (karlıyı erken sat, zararlıyı tut; Shefrin-Statman 1985) | Portföy tablosu alış-maliyeti çıpasına kilitli; her satır "maliyete göre" renkleniyor | Maliyet çıpasını kıran ikinci görünüm: "bugünden ileriye" modu (pozisyonun risk skoru + 52H bağlamı, maliyet gizli). Karne e-postasında "alış fiyatın bir karar kriteri değildir" eğitim mikro-içeriği |
| 3 | **Aşırı güven → aşırı işlem** (izleme sıklığı ↑ işlem ↑ getiri ↓; Barber-Odean 2000) | 15 sn fiyat polling + fiyat flash animasyonları (portföyde `flashTickers`) sürekli-izleme davranışını ödüllendiriyor | **"Sakin mod":** varsayılan görünümde anlık flash yok, günlük özet ön planda; 15 dk gecikmeli veride 15 sn yenileme zaten yanıltıcı bir "canlılık" hissi — yenilemeyi 60-90 sn'ye çekmek hem dürüst hem sağlıklı |
| 4 | **FOMO / sürü** | Dashboard "Piyasa Odakları / En Çok Yükselenler" listesi — günün +%8'ini gösterip bağlam vermiyor | Yükselen/düşen satırlarına **"neden" chip'i** (atıf motoru v1: aynı gün KAP bildirimi varsa rozet) + risk skoru mini-göstergesi. Bağlamsız yükselen listesi, sinyal-avcısı davranışı besler; bağlamlısı eğitir |
| 5 | **Çerçeveleme + otomasyon yanlılığı** | "AI Skoru 72 — Güçlü Görünüm" (yeşil): tek sayı + yön etiketi + renk = karar kısayolu; kullanıcı AI'a aşırı kalibre güven duyar | Etiketi risk diline çevir ("Düşük Volatilite Profili"), skorun altına kalıcı mikro-copy: "Bu skor getiri tahmini değildir; fiyat oynaklığı ve teknik faktörleri özetler." Güven göstergesi ("Güven: Yüksek") kaldırılmalı veya "veri yeterliliği" olarak yeniden adlandırılmalı — şu an risk seviyesinin tersinden türetiliyor ve modele duyulan güveni değil hissenin sakinliğini ölçüyor |
| 6 | **Doğrulama yanlılığı** | Chatbot serbest soru alıyor; "X yükselir mi" soran kullanıcı olumlu cümleyi cımbızlar | Chatbot cevap şablonuna zorunlu "denge cümlesi" (bir destekleyici + bir riskli faktör). Bu SPK duruşunu da güçlendirir |
| 7 | **Belirsizlik kaygısı → güven ihtiyacı** | "15 dk gecikmeli" pill'i doğru yönde; ama AI çıktılarında kaynak yok | Her AI çıktısının altına veri kaynağı satırı ("Veri: Yahoo Finance kapanış + TradingView temel oranlar, 15 dk gecikmeli") — KAP gelince bildirim linki. Kaynak şeffaflığı bu segmentte satın alma nedenidir, süs değil |

**Sentez:** Ürünün mevcut kası (risk motoru, alarm, izleme) "daha çok bak, daha çok işlem yap" yüzeyine monte edilmiş durumda; hedef persona için doğru ürün **"daha az bak, daha iyi anla"** yüzeyi. Bu, strateji raporundaki "anlatım katmanı" konumunun davranışsal karşılığıdır — konum ile mevcut UX arasında ölçülebilir bir açı var ve kapatması ucuz (çoğu metin/çerçeveleme değişikliği).

---

## G. Frontend İyileştirme Önerileri

Görev C, E, F bulgularına dayalı; öncelik sırasıyla. Design system: mevcut `card-glass`, `dot-grid`, `hover-glow`, `animate-fade-up` sınıfları ve `StockLogo`/`AppShell` desenleri korunmalı. Not: components/ genelinde inline style hâkim — `.claude/CLAUDE.md` "Tailwind tüm styling" der; yeni işler Tailwind'le yazılmalı, dokunulan yerlerde fırsatçı geçiş.

| # | Öneri | Mevcut durum | Sorun | Değişiklik | Beklenen etki |
|---|---|---|---|---|---|
| 1 | **İzleme arama kapsamını doğrula; hardcode listeyi tek kaynağa indir** | [izleme/page.tsx:165](app/izleme/page.tsx:165) lokal 50'lik listeden filtreliyor; ekip bilgisine göre 607 evren mevcut, görünen sınır sayfalama olabilir (bkz. C.4 düzeltme notu) | Kök neden (sayfalama mı, arama kapsamı mı) doğrulanmadı — "kırık" iddiası kesinleşmemiş | Önce davranış testi (50 dışı ticker ara); her durumda hardcode kopyayı `lib/bist-hisseler` tek kaynağına bağla | Kod tekrarında azalma; kapsam sorunu varsa tutarlılık düzelir |
| 2 | **"Görünüm" → risk dili** | [DashboardAiPanel.tsx:22-28](components/DashboardAiPanel.tsx:22) "Güçlü/Olumsuz Görünüm", `AI Skoru = 100−risk` | Yön beklentisi iması — SPK gri alanı + otomasyon yanlılığı (E.3, F.5) | Etiketleri volatilite/risk diline çevir; skor altına "getiri tahmini değildir" mikro-copy; "Güven" satırını kaldır/yeniden adlandır | Hukuki konfor + yanlış kalibre güvenin azalması |
| 3 | **Pro CTA temizliği** | 6+ CTA "YAKINDA" sayfasına çıkıyor (C.2) | Ölü funnel; beklenti kırılması; "gerçek zamanlı veri" vaadi stratejiyle çelişik | CTA'ları tek tutarlı "Erken erişim listesine katıl" diline indir (panelde 1 adet); pro sayfasından "gerçek zamanlı fiyat akışı" maddesini çıkar | Güven; lansmanda gerçek Pro'nun tıklanma refleksinin korunması |
| 4 | **Chatbot hak göstergesi + markdown** | Limit ancak dolunca görünüyor; cevaplar düz metin | Sürpriz paywall hissi; Pako AI ile tutarsız render | Panel başlığına "3/3 hak" sayacı; markdown render'ı Pako AI'dan taşı; her cevabın altında disclaimer'ı görsel olarak ayır | Şeffaflık; iki AI yüzeyinin tutarlılığı |
| 5 | **Alarm UX** | Ekleme sonrası `window.location.reload()`; kartta hedefe uzaklık yok | Yavaş, state kaybı; alarm "ne kadar yakın" bilgisi yok | Optimistic insert (liste state'e ekle); karta "hedefe %X" progress çubuğu (güncel fiyat zaten fetch ediliyor) | Akıcılık; alarmların "canlı" hissetmesi |
| 6 | **Onboarding kurulum akışı** | İlk girişte boş dashboard (C.1) | İlk 5 dakikada "ne yapmalıyım" cevapsız | İlk girişte 3 adımlı kart: (1) 3 hisse seç → izleme, (2) ilk AI analizini gör, (3) alarm kur. `watchlist.length===0` tetikleyici | Aktivasyon oranı; ilk oturumda değer anı ("aha") |
| 7 | **Sparkline n+1 düzeltmesi** | İzlemede satır başına `/api/grafik` (C.6) | 10 satır = 10 istek; Hobby invocation israfı | Snapshot tablosundan mini-seri veya tek batch endpoint; en ucuzu: sparkline'ı `getiri_1h` bazlı statik mini-bar'a çevir | Sayfa yükü ↓, maliyet ↓ |
| 8 | **Göreli K/Z çerçevesi** | Portföy K/Z mutlak (F.1) | Kayıp panik çerçevesi | K/Z satırının yanına "XU100 bugün: %X" karşılaştırma chip'i (XU verisi `/api/xu`'da hazır) | Kayıp günlerinde panik-satış zemininin yumuşaması; "anlatan platform" konumuyla uyum |
| 9 | **Metodoloji sayfası + skor tooltip'i** | Risk skoru "nasıl hesaplanıyor" içeriği yok (E.1) | Güven konumlandırmasının en ucuz taşı eksik | `/metodoloji` statik sayfa (faktörler, ağırlıklar, sınırlar); skorların yanına "?" → sayfaya link. RISK_ACIKLAMALARI sözlüğü genişletilerek yeniden kullanılabilir | Güven; SEO yan faydası; destek sorusu azalması |
| 10 | **Analiz cache'ini Supabase-first yap** | 2 saat localStorage; `analizler` tablosu yazılıyor ama cache olarak okunmuyor (C.6) | Cihazlar arası tutarsızlık; çift Claude maliyeti | `handleAnaliz` önce Supabase'teki son analizi (updated_at < 2sa) kontrol etsin; localStorage yalnızca hızlandırıcı | AI maliyeti ↓; deneyim tutarlılığı |
| 11 | Kayıtta kullanıcı adı müsaitlik kontrolü | Submit'te Supabase hatası (C.1) | Geç geri bildirim | Debounce'lu `profiles` sorgusu + yeşil/kırmızı ikon | Kayıt hunisi sürtünmesi ↓ |
| 12 | Yükselen/düşen listesine bağlam chip'i | topMovers bağlamsız (F.4) | FOMO makinesi | Satıra risk skoru mini-rozeti; KAP eşleşmesi gelince "bildirim var" rozeti (atıf motoru v1'e zemin) | FOMO'dan eğitime köprü; Boşluk 2 hazırlığı |

---

## Kaynaklar
- [Fintables üyelik paketleri](https://fintables.com/uyelik-paketleri) · [Fintables Evo](https://fintables.com/evo) · [Fintables PRO](https://fintables.com/abone-ol)
- [Webrazzi — Midas'ın beş yeni ürünü (CEO röportajı)](https://webrazzi.com/2026/05/11/midas-in-yeni-ozelliklerini-midas-ceo-su-egem-eraslan-ile-konustuk/) · [eGirişim](https://egirisim.com/2026/05/08/midasin-yeni-urunleri-atlas-avrupa-borsalari-viop-piyasa-rehberi-ve-defi/) · [Forbes TR](https://www.forbes.com.tr/fintek/midas-islem-yelpazesine-bes-yeni-urun-ekledi) · [Fintechtime](https://fintechtime.com/2026/05/midastan-yatirim-ekosistemine-bes-yeni-urun/)
- [BorsaGündem — MKK pay senedi yatırımcı sayısı 6,4M](https://www.borsagundem.com.tr/mkk-acikladi-pay-senedinde-yatirimci-sayisi-64-milyon) · [Finansopia](https://www.finansopia.com/ekonomi/borsa/borsa-istanbulda-yatirimci-sayisi-64-milyona-ulasti/)
- [BistScan](https://app.bistscan.com/) (AI sinyal kategorisi örneği)
- Davranışsal finans (TR): [DergiPark — Bireysel yatırımcı finansal davranış eğilimleri](https://dergipark.org.tr/en/pub/mbdd/issue/60927/658324) · [İKÜ tez/çalışma](https://openaccess.iku.edu.tr/server/api/core/bitstreams/16e43d6a-d0d3-4e92-a466-88aeed5f3f92/content) · [Bingöl Ün. — okuryazarlık ve yanlılıklar](https://dergipark.org.tr/tr/pub/biibfad/issue/66329/901371)
- Klasik literatür: Kahneman & Tversky (1979) Prospect Theory; Shefrin & Statman (1985) disposition effect; Barber & Odean (2000) *Trading Is Hazardous to Your Wealth*; Wilder (1978) *New Concepts in Technical Trading Systems* (RSI); George & Hwang (2004) 52-week high momentum.
- RSI testi: bu oturumda gerçek Yahoo Finance verisiyle çalıştırılan karşılaştırma scripti (8 BIST hissesi, 3 aylık günlük seri, 4 Temmuz 2026).

*Rapor sonu — Faz 1. İlgili brainstorm: [[brainstorm-2026-07]]*
