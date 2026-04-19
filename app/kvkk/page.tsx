export default function KVKKPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-200">
      <h1 className="text-3xl font-bold mb-8 text-white">
        KVKK Aydınlatma Metni
      </h1>

      <p className="mb-6 text-sm text-gray-400">
        Son güncelleme: Nisan 2026
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-white">1. Veri Sorumlusu</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu
          sıfatıyla ParaKonusur.com ("Platform") olarak kişisel verilerinizi aşağıda
          açıklanan amaçlar doğrultusunda işlemekteyiz.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-white">2. İşlenen Kişisel Veriler</h2>
        <p>Platform üzerinden yalnızca e-posta adresiniz toplanmaktadır.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-white">3. Kişisel Verilerin İşlenme Amacı</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Erken erişim listesine kaydınızın oluşturulması</li>
          <li>Platform lansmanı ve güncellemeler hakkında bilgilendirme yapılması</li>
          <li>Kullanıcı deneyiminin iyileştirilmesi</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-white">4. Kişisel Verilerin Aktarılması</h2>
        <p>
          E-posta adresiniz; e-posta gönderim altyapısı olarak kullandığımız Resend Inc.
          ile paylaşılmaktadır. Üçüncü taraflarla ticari amaçla paylaşılmamaktadır.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-white">5. Kişisel Verilerin Saklanma Süresi</h2>
        <p>
          E-posta adresiniz, listeden çıkma talebinde bulunana kadar saklanmaktadır.
          Abonelikten çıkmak için hello@parakonusur.com adresine e-posta gönderebilirsiniz.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-white">6. Haklarınız</h2>
        <p className="mb-3">KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme</li>
          <li>Kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
          <li>İşlemenin kısıtlanmasını talep etme</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-white">7. İletişim</h2>
        <p>
          Talepleriniz için:{" "}
          <a href="mailto:hello@parakonusur.com" className="text-blue-400 underline">
            hello@parakonusur.com
          </a>
        </p>
      </section>
    </main>
  );
}