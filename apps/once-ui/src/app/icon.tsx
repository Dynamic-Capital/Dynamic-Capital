import { ImageResponse } from "next/server";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#111827",
          borderRadius: "100%",
          color: "#f9fafb",
          display: "flex",
          fontSize: 20,
          fontWeight: 600,
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        OU
      </div>
    ),
    {
      ...size,
    },
  );
}
