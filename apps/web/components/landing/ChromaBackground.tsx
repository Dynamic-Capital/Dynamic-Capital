"use client";

import { useEffect, useMemo, useRef } from "react";

import { cn } from "@/utils";

const SCRIPT_SRC = "https://cdn.unicorn.studio/v1.2.3/unicornStudio.umd.js";

type UnicornStudioController = {
  init: () => Promise<unknown>;
  destroy: () => void;
};

declare global {
  interface Window {
    UnicornStudio?: UnicornStudioController;
  }
}

let unicornStudioScriptPromise: Promise<void> | null = null;

async function loadUnicornStudioScript(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (unicornStudioScriptPromise) {
    return unicornStudioScriptPromise;
  }

  unicornStudioScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener(
        "load",
        () => {
          existingScript.dataset.loaded = "true";
          resolve();
        },
        { once: true },
      );

      existingScript.addEventListener(
        "error",
        () => {
          unicornStudioScriptPromise = null;
          reject(new Error("Failed to load the Unicorn Studio script."));
        },
        { once: true },
      );

      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;

    const handleLoad = () => {
      script.dataset.loaded = "true";
      resolve();
    };

    const handleError = () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
      unicornStudioScriptPromise = null;
      reject(new Error("Failed to load the Unicorn Studio script."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    document.head.appendChild(script);
  });

  return unicornStudioScriptPromise;
}

const PROJECT_IDS = {
  liquid: "lHlDvoJDIXCxxXVqTNOC",
  folds: "YnADGzDD7LGB9cUocyyN",
  smoke: "ezEDNzFtrAgm8yCUWUeX",
  flow: "wYI4YirTR5lrja86ArSY",
  pixel: "rJ39y9Nnyz3cJooDtmNM",
  ascii: "HJKVa10sftexJ7OgsOnU",
} as const satisfies Record<string, string>;

export type ChromaBackgroundStyle = keyof typeof PROJECT_IDS;

export interface ChromaBackgroundProps {
  variant?: ChromaBackgroundStyle;
  className?: string;
  /**
   * Optional attribute overrides for Unicorn Studio embeds.
   */
  fps?: number;
  scale?: number;
  dpi?: number;
}

export function ChromaBackground({
  variant = "liquid",
  className,
  fps = 60,
  scale = 1,
  dpi = 1,
}: ChromaBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const projectId = useMemo(() => PROJECT_IDS[variant] ?? PROJECT_IDS.liquid, [
    variant,
  ]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!containerRef.current || !projectId) {
        return;
      }

      try {
        await loadUnicornStudioScript();

        if (cancelled || !containerRef.current) {
          return;
        }

        containerRef.current.setAttribute("data-us-project", projectId);

        const unicornStudio = window.UnicornStudio;

        if (!unicornStudio) {
          return;
        }

        unicornStudio.destroy();
        await unicornStudio.init();
      } catch (error) {
        console.error("Failed to initialise Unicorn Studio background", error);
      }
    };

    initialize();

    return () => {
      cancelled = true;
      try {
        window.UnicornStudio?.destroy();
      } catch (error) {
        console.error("Failed to tear down Unicorn Studio background", error);
      }
    };
  }, [projectId]);

  return (
    <div
      ref={containerRef}
      data-us-dpi={dpi}
      data-us-scale={scale}
      data-us-fps={fps}
      aria-hidden
      className={cn("h-full w-full", className)}
    />
  );
}

export default ChromaBackground;
