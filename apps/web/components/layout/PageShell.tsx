"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { isMiniAppPath } from "@/lib/pathnames";

type PageShellVariant = "centered" | "workspace";

const DEFAULT_VARIANT: PageShellVariant = "centered";

interface PageShellContextValue {
  setVariant: (variant: PageShellVariant) => void;
}

const PageShellVariantContext = createContext<PageShellContextValue | null>(
  null,
);

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const pathname = usePathname();
  const isMiniApp = isMiniAppPath(pathname);

  const [variant, setVariant] = useState<PageShellVariant>(DEFAULT_VARIANT);

  useEffect(() => {
    setVariant(DEFAULT_VARIANT);
  }, [pathname]);

  const contextValue = useMemo<PageShellContextValue>(() => ({
    setVariant,
  }), [setVariant]);

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
    <PageShellVariantContext.Provider value={contextValue}>
      <div className="system-shell" data-variant="page">
        <main
          id="main-content"
          tabIndex={-1}
          className="system-shell__body page-shell flex min-h-0 w-full flex-1 flex-col"
          data-variant={variant}
        >
          <div className="page-shell__surface" data-variant={variant}>
            {children}
          </div>
        </main>
      </div>
    </PageShellVariantContext.Provider>
  );
}

interface PageShellVariantProps {
  variant: PageShellVariant;
}

export function PageShellVariant({ variant }: PageShellVariantProps) {
  const context = useContext(PageShellVariantContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setVariant(variant);
    return () => {
      context.setVariant(DEFAULT_VARIANT);
    };
  }, [context, variant]);

  return null;
}
