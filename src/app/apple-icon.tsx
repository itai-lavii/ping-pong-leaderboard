import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#09090b",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 55,
            left: 15,
            width: 110,
            height: 110,
            display: "flex",
            transform: "rotate(-35deg)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 65,
              left: 44,
              width: 22,
              height: 66,
              borderRadius: 11,
              background: "#52525b",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 98,
              height: 98,
              borderRadius: "50%",
              background: "#dc2626",
              border: "7px solid #18181b",
              display: "flex",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 32,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#fafafa",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
