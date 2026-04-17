export default function Navbar() {
  return (
    <header style={{backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 16px'}}>
      <div style={{maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px'}}>
        <a href="/" style={{fontWeight: 'bold', fontSize: '20px', color: '#0B8F73', textDecoration: 'none'}}>
          ParaKonusur<span style={{color: '#9ca3af', fontWeight: 'normal'}}>.com</span>
        </a>
        <nav style={{display: 'flex', gap: '24px'}}>
          <a href="/yatirim" style={{color: '#6b7280', textDecoration: 'none', fontSize: '14px'}}>Yatirim</a>
          <a href="/ekonomi" style={{color: '#6b7280', textDecoration: 'none', fontSize: '14px'}}>Ekonomi</a>
          <a href="/turkiye-ekonomisi" style={{color: '#6b7280', textDecoration: 'none', fontSize: '14px'}}>Turkiye Ekonomisi</a>
        </nav>
      </div>
    </header>
  )
}
