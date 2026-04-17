import { client } from '@/sanity/lib/client'

async function getPosts() {
  return client.fetch(`*[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0..5] {
    _id,
    title,
    slug,
    excerpt,
    publishedAt
  }`)
}

export default async function HomePage() {
  const posts = await getPosts()

  return (
    <main>
      <section style={{backgroundColor: '#0D1B2A', color: 'white', padding: '80px 16px'}}>
        <div style={{maxWidth: '900px', margin: '0 auto', textAlign: 'center'}}>
          <h1 style={{fontSize: '48px', fontWeight: 'bold', marginBottom: '16px'}}>
            Paraya Dair Her Sey
          </h1>
          <p style={{color: '#9ca3af', marginBottom: '32px'}}>
            Turkiye AI destekli finans platformu.
          </p>
          <a href="/yatirim" style={{backgroundColor: '#0B8F73', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none'}}>
            Yazilari Kesfet
          </a>
        </div>
      </section>

      <section style={{maxWidth: '900px', margin: '0 auto', padding: '64px 16px'}}>
        <h2 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '32px'}}>Son Yazilar</h2>
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          {posts.map((post: any) => (
            <a key={post._id} href={`/posts/${post.slug?.current}`}
              style={{border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'block', textDecoration: 'none', color: 'inherit'}}>
              <div style={{fontWeight: '600', fontSize: '18px', marginBottom: '8px'}}>{post.title}</div>
              {post.excerpt && <div style={{color: '#6b7280', fontSize: '14px'}}>{post.excerpt}</div>}
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}
