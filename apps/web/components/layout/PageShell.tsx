"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { isMiniAppPath } from "@/lib/pathnames";

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const pathname = usePathname();
  const isMiniApp = isMiniAppPath(pathname);

  if (isMiniApp) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 w-full flex-1 flex-col"
      >
        {children}
      </main>
    );
  }

  return (
    <div className="system-shell" data-variant="page">
      <main
        id="main-content"
        tabIndex={-1}
        className="system-shell__body page-shell flex min-h-0 w-full flex-1 flex-col"
      >
        <div className="page-shell__surface">{children}</div>
      </main>
    </div>
  );
}
