import AppShell from "@/components/AppShell";

async function getPosts() {
  try {
    const { client } = await import('@/sanity/lib/client')
    return client.fetch(`*[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0..9] {
      _id,
      title,
      slug,
      excerpt,
      publishedAt,
      "readTime": round(length(pt::text(body)) / 5 / 180),
      "category": categories[0]->title
    }`)
  } catch {
    return []
  }
}

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <style>{`.blog-kart:hover { border-color: rgba(59,130,246,0.3) !important; background: rgba(59,130,246,0.04) !important; }`}</style>
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px" }}>
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, color: "#3B82F6", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>ParaKonuşur · Blog</p>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.5px", marginBottom: 8 }}>Paraya Dair Her Şey</h1>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>Türkiye&apos;nin AI destekli finans platformundan piyasa içgörüleri, analiz ve yorum.</p>
          </div>

          {posts.length === 0 ? (
            <div style={{ padding: "48px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 36 }}>📝</div>
              <p style={{ fontSize: 14, color: "#334155" }}>Henüz yazı yok, yakında içerikler eklenecek.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {posts.map((post: {_id: string; title: string; slug: {current: string}; excerpt?: string; publishedAt?: string; readTime?: number; category?: string}) => (
                <a key={post._id} href={`/posts/${post.slug?.current}`} className="blog-kart"
                  style={{ border: "1px solid rgba(59,130,246,0.1)", borderRadius: 12, padding: "20px 24px", display: "block", textDecoration: "none", background: "rgba(255,255,255,0.02)", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    {(post as {category?: string}).category && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        {(post as {category?: string}).category}
                      </span>
                    )}
                    {post.publishedAt && (
                      <span style={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>
                        {new Date(post.publishedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    )}
                    {(post as {readTime?: number}).readTime && (
                      <span style={{ fontSize: 11, color: "#334155", marginLeft: "auto" }}>
                        ⏱ {(post as {readTime?: number}).readTime} dk okuma
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: "#E2E8F0", marginBottom: 8, letterSpacing: "-0.2px", lineHeight: 1.4 }}>{post.title}</div>
                  {post.excerpt && <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.excerpt}</div>}
                  <div style={{ marginTop: 14, fontSize: 12, color: "#3B82F6", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>Devamını oku <span>→</span></div>
                </a>
              ))}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  )
}
