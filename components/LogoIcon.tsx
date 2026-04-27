export default function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA"/>
          <stop offset="100%" stopColor="#1E40AF"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="256" height="256" rx="48" fill="#0B1220" stroke="rgba(59,130,246,0.3)" strokeWidth="2"/>
      <rect x="70" y="130" width="18" height="70" rx="3" fill="url(#logoGrad)"/>
      <rect x="94" y="110" width="18" height="90" rx="3" fill="url(#logoGrad)"/>
      <path d="M112 110 Q 180 110 180 140 Q 180 170 122 170" fill="none" stroke="url(#logoGrad)" strokeWidth="18" strokeLinecap="round"/>
      <circle cx="180" cy="92" r="7" fill="#60A5FA"/>
    </svg>
  );
}
