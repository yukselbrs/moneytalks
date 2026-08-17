// JSON-LD'yi <script> icine gomerken GUVENLI seri hale getirme.
//
// JSON.stringify " ve \ karakterlerini kacirir ama < ve > karakterlerini KACIRMAZ.
// Icerikte "</script>" gecerse tarayicinin HTML ayristiricisi script etiketini erken
// kapatir ve sonrasi HTML olarak yorumlanir -> depolanmis XSS.
// Kanit: JSON.stringify({d:"</script><script>alert(1)</script>"}) ciktisinda dizi aynen durur.
//
// Bu ozellikle /kap/[index] sayfasinda onemli: `description` alani AI ozetinden
// (ozet_tek_cumle) veya KAP'tan gelen SIRKET-BEYANLI `konu` metninden besleniyor —
// ikisi de bizim yazmadigimiz icerik.
//
// < ve > karakterlerini unicode kacisina cevirmek JSON'i BOZMAZ: JSON ayristiricisi
// \u003c dizisini yine "<" olarak okur, ama HTML ayristiricisi etiket goremez.
//
// NOT: U+2028/U+2029 burada kacirilmiyor — onlar JS olarak EVAL edilen baglamlarda
// (JSONP vb.) sorun olur. application/ld+json icerigi JSON.parse ile okunur, eval edilmez.
export function jsonLdGuvenli(veri: unknown): string {
  return JSON.stringify(veri).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}
