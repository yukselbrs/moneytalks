async function getPost(slug: string) {
  try {
    const { client } = await import('@/sanity/lib/client')
    return client.fetch(`*[_type == "post" && slug.current == $slug][0] {
      _id,
      title,
      excerpt,
      publishedAt
    }`, { slug })
  } catch {
    return null
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    return <div style={{padding: '64px', textAlign: 'center'}}>Yazi bulunamadi.</div>
  }

  return (
    <article style={{maxWidth: '700px', margin: '0 auto', padding: '64px 16px'}}>
      <h1 style={{fontSize: '36px', fontWeight: 'bold', marginBottom: '16px'}}>
        {post.title}
      </h1>
      {post.excerpt && (
        <p style={{color: '#6b7280', fontSize: '18px', marginBottom: '32px', lineHeight: '1.6'}}>
          {post.excerpt}
        </p>
      )}
    </article>
  )
}
