import { useId, type CSSProperties } from "react";

export default function LogoIcon({
  size = 32,
  style,
  "aria-label": ariaLabel = "ParaKonusur mark",
}: {
  size?: number;
  style?: CSSProperties;
  "aria-label"?: string;
}) {
  const generatedId = useId().replace(/:/g, "");
  const titleId = ariaLabel ? `pk-logo-title-${generatedId}` : undefined;
  const bgId = `pk-logo-bg-${generatedId}`;
  const blueId = `pk-logo-blue-${generatedId}`;
  const violetId = `pk-logo-violet-${generatedId}`;
  const glowId = `pk-logo-glow-${generatedId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : true}
      style={style}
    >
      {ariaLabel && <title id={titleId}>{ariaLabel}</title>}
      <defs>
        <linearGradient id={bgId} x1="72" y1="40" x2="430" y2="482" gradientUnits="userSpaceOnUse">
          <stop stopColor="#050B16" />
          <stop offset="0.56" stopColor="#0B1220" />
          <stop offset="1" stopColor="#101B31" />
        </linearGradient>
        <linearGradient id={blueId} x1="112" y1="122" x2="326" y2="374" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="0.55" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id={violetId} x1="310" y1="150" x2="414" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA" />
          <stop offset="0.45" stopColor="#60A5FA" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
        <filter id={glowId} x="70" y="84" width="380" height="360" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#2563EB" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="1" y="1" width="510" height="510" rx="96" fill={`url(#${bgId})`} stroke="rgba(96,165,250,0.18)" strokeWidth="2" />
      <circle cx="438" cy="40" r="145" fill="#3B82F6" opacity="0.18" />
      <circle cx="16" cy="488" r="120" fill="#8B5CF6" opacity="0.14" />
      <g filter={`url(#${glowId})`}>
        <path d="M138 356V150" stroke={`url(#${blueId})`} strokeWidth="42" strokeLinecap="round" />
        <path d="M138 150H232C292 150 330 184 330 236C330 288 292 320 232 320H174" fill="none" stroke={`url(#${blueId})`} strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M326 258L398 162" stroke={`url(#${violetId})`} strokeWidth="36" strokeLinecap="round" />
        <path d="M326 258L404 352" stroke={`url(#${violetId})`} strokeWidth="36" strokeLinecap="round" />
      </g>
      <circle cx="410" cy="140" r="12" fill="#93C5FD" />
      <circle cx="410" cy="140" r="22" fill="none" stroke="#60A5FA" strokeWidth="2" strokeOpacity="0.32" />
    </svg>
  );
}
