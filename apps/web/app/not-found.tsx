"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="mb-2 text-4xl font-bold">404 - Page Not Found</h1>
      <p className="text-lg text-muted-foreground">
        The page you're looking for does not exist.
      </p>
      <Link href="/" className="mt-4 text-blue-500 underline">
        Return home
      </Link>
    </div>
  );
}
