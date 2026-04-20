import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#0B1220",
          border: "1px solid rgba(59,130,246,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#3B82F6",
            lineHeight: 1,
          }}
        >
          P
        </div>
      </div>
    ),
    { ...size }
  );
}
