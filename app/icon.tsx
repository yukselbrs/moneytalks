import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 96,
          background: "linear-gradient(145deg, #050B16 0%, #0B1220 55%, #101B31 100%)",
          border: "2px solid rgba(96,165,250,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 290,
            height: 290,
            right: -70,
            top: -80,
            borderRadius: "50%",
            background: "rgba(59,130,246,0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 240,
            height: 240,
            left: -70,
            bottom: -80,
            borderRadius: "50%",
            background: "rgba(139,92,246,0.14)",
          }}
        />
        <svg width="372" height="372" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="markBlue" x1="112" y1="122" x2="326" y2="374" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60A5FA" />
              <stop offset="0.55" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#1E40AF" />
            </linearGradient>
            <linearGradient id="markViolet" x1="310" y1="150" x2="414" y2="360" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A78BFA" />
              <stop offset="0.45" stopColor="#60A5FA" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
            <filter id="softGlow" x="70" y="84" width="380" height="360" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#2563EB" floodOpacity="0.35" />
            </filter>
          </defs>
          <g filter="url(#softGlow)">
            <path d="M138 356V150" stroke="url(#markBlue)" strokeWidth="42" strokeLinecap="round" />
            <path d="M138 150H232C292 150 330 184 330 236C330 288 292 320 232 320H174" stroke="url(#markBlue)" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M326 258L398 162" stroke="url(#markViolet)" strokeWidth="36" strokeLinecap="round" />
            <path d="M326 258L404 352" stroke="url(#markViolet)" strokeWidth="36" strokeLinecap="round" />
          </g>
          <circle cx="410" cy="140" r="12" fill="#93C5FD" />
          <circle cx="410" cy="140" r="22" stroke="#60A5FA" strokeWidth="2" strokeOpacity="0.32" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
