"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { isMiniAppPath } from "@/lib/pathnames";

type PageShellVariant = "centered" | "workspace";

interface PageShellContextValue {
  variant: PageShellVariant;
  setVariant: (variant: PageShellVariant) => void;
  reset: () => void;
}

const PageShellVariantContext = createContext<PageShellContextValue | null>(
  null,
);

interface PageShellProps {
  children: ReactNode;
  variant?: PageShellVariant;
}

export function PageShell({
  children,
  variant = "centered",
}: PageShellProps) {
  const pathname = usePathname();
  const isMiniApp = isMiniAppPath(pathname);

  const [currentVariant, setCurrentVariant] = useState<PageShellVariant>(
    variant,
  );
  const initialVariantRef = useRef<PageShellVariant>(variant);

  useEffect(() => {
    const nextVariant = variant;
    initialVariantRef.current = nextVariant;
    setCurrentVariant(nextVariant);
  }, [variant, pathname]);

  const contextValue = useMemo<PageShellContextValue>(() => ({
    variant: currentVariant,
    setVariant: setCurrentVariant,
    reset: () => setCurrentVariant(initialVariantRef.current),
  }), [currentVariant]);

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
          data-variant={currentVariant}
        >
          <div className="page-shell__surface" data-variant={currentVariant}>
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
      context.reset();
    };
  }, [context, variant]);

  return null;
}
