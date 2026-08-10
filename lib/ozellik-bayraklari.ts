// Ozellik bayraklari — gecici olarak kapatilan bolumler.
// Kod SILINMEZ; bayrak tersine cevrilince her sey geri gelir.

// BLOG — 9 Agu 2026'da "ikinci bir emre kadar" gizlendi (Baris talebi).
// true yapmak icin baska hicbir degisiklik gerekmez; su dort yer bu bayragi okur:
//   components/AppShell.tsx   (uygulama ici sidebar)
//   components/Navbar.tsx     (pazarlama navbar'i)
//   app/sitemap.ts            (blog + posts URL'leri)
//   app/blog/page.tsx + app/posts/[slug]/page.tsx  (kapaliyken notFound())
export const BLOG_AKTIF = false;
