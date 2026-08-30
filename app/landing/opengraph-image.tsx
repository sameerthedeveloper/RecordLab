import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RULE_COUNT = 11;
const RULE_SPACING = 53;
const RULE_START = 90;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#faf7f0",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* ruled lines — satori has no repeating-linear-gradient support, so lay them out explicitly */}
        {Array.from({ length: RULE_COUNT }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              position: "absolute",
              top: RULE_START + i * RULE_SPACING,
              left: 0,
              right: 0,
              height: 2,
              background: "rgba(96,132,199,0.28)",
            }}
          />
        ))}
        {/* red margin rule */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 150,
            width: 3,
            background: "rgba(192,57,43,0.55)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 90px 0 200px",
            width: "100%",
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "monospace",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 4,
              color: "#b3261e",
            }}
          >
            SKIP THE ROUGH COPY
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 74,
              fontWeight: 700,
              lineHeight: 1.08,
              color: "#1c2b33",
            }}
          >
            Straight to the
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 700,
              lineHeight: 1.08,
              color: "#1c2b33",
            }}
          >
            fair copy.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontFamily: "sans-serif",
              fontSize: 28,
              color: "#4b5a63",
            }}
          >
            Record Lab - curated for Crescent CSE students
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 90,
            display: "flex",
            fontFamily: "monospace",
            fontSize: 22,
            fontWeight: 700,
            color: "#1c2b33",
          }}
        >
          Record Lab
        </div>
      </div>
    ),
    { ...size }
  );
}
