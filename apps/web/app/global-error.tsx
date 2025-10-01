"use client";

export default function GlobalRootError({ error }: { error: Error }) {
  return (
    <html>
      <body>
        <h1>App crashed</h1>
        <pre>{String(error)}</pre>
      </body>
    </html>
  );
}
