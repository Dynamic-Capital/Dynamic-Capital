"use client";

export default function GlobalError({ error }: { error: Error }) {
  return (
    <html>
      <body style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Something went wrong</h1>
        <pre>{error?.message}</pre>
      </body>
    </html>
  );
}
