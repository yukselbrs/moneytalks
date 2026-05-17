import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 38,
          background: "linear-gradient(145deg, #050B16 0%, #0B1220 55%, #101B31 100%)",
          border: "1px solid rgba(96,165,250,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", width: 104, height: 104, right: -28, top: -30, borderRadius: "50%", background: "rgba(59,130,246,0.18)" }} />
        <div style={{ position: "absolute", width: 90, height: 90, left: -28, bottom: -30, borderRadius: "50%", background: "rgba(139,92,246,0.14)" }} />
        <svg width="132" height="132" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="appleMarkBlue" x1="112" y1="122" x2="326" y2="374" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60A5FA" />
              <stop offset="0.55" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#1E40AF" />
            </linearGradient>
            <linearGradient id="appleMarkViolet" x1="310" y1="150" x2="414" y2="360" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A78BFA" />
              <stop offset="0.45" stopColor="#60A5FA" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
          </defs>
          <path d="M138 356V150" stroke="url(#appleMarkBlue)" strokeWidth="42" strokeLinecap="round" />
          <path d="M138 150H232C292 150 330 184 330 236C330 288 292 320 232 320H174" stroke="url(#appleMarkBlue)" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M326 258L398 162" stroke="url(#appleMarkViolet)" strokeWidth="36" strokeLinecap="round" />
          <path d="M326 258L404 352" stroke="url(#appleMarkViolet)" strokeWidth="36" strokeLinecap="round" />
          <circle cx="410" cy="140" r="12" fill="#93C5FD" />
          <circle cx="410" cy="140" r="22" stroke="#60A5FA" strokeWidth="2" strokeOpacity="0.32" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
