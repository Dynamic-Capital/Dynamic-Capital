"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { z } from "zod";

import { callEdgeFunction } from "@/config/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  applyThemePassStyles,
  buildThemePassInlineScriptPayload,
  loadStoredThemePass,
  parseThemePassMetadata,
  storeThemePass,
  ThemePassMetadata,
  ThemePassSelection,
  ThemePreferenceMode,
} from "@/utils/theme-pass";

interface ThemePassOption {
  id: string;
  name: string;
  description?: string;
  priority: number;
  metadata: ThemePassMetadata;
  source: "wallet" | "cached";
}

interface ThemePassContextValue {
  status: "idle" | "loading" | "ready" | "error";
  unlocked: ThemePassOption[];
  selected: ThemePassOption | null;
  selectTheme: (id: string | null) => Promise<void>;
  clearTheme: () => Promise<void>;
  error?: string;
  walletAddress?: string;
  isFetching: boolean;
}

const ThemePassContext = createContext<ThemePassContextValue | undefined>(
  undefined,
);

const indexerEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.number().int().optional(),
  metadataUrl: z.string().min(1).optional(),
  metadata_uri: z.string().min(1).optional(),
  metadata: z.unknown().optional(),
});

const indexerResponseSchema = z.union([
  z.array(indexerEntrySchema),
  z.object({ passes: z.array(indexerEntrySchema) }),
  z.object({ data: z.array(indexerEntrySchema) }),
]);

function resolveIndexerEntries(payload: unknown) {
  const parsed = indexerResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return [];
  }
  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }
  if ("passes" in parsed.data) {
    return parsed.data.passes;
  }
  if ("data" in parsed.data) {
    return parsed.data.data;
  }
  return [];
}

function buildMetadataUrl(entry: z.infer<typeof indexerEntrySchema>) {
  const candidate = entry.metadataUrl ?? entry.metadata_uri;
  if (!candidate) return null;
  try {
    return new URL(candidate, window.location.origin).toString();
  } catch {
    return candidate;
  }
}

function resolveThemeName(entry: z.infer<typeof indexerEntrySchema>) {
  return entry.name ?? entry.title ?? entry.id;
}

function buildThemeSelection(
  option: ThemePassOption,
): ThemePassSelection {
  return {
    id: option.id,
    metadata: option.metadata,
    selectedAt: Date.now(),
  };
}

async function fetchThemePasses(
  ownerAddress: string,
): Promise<ThemePassOption[]> {
  const base = process.env.NEXT_PUBLIC_THEME_PASS_INDEXER_URL;
  if (!base) return [];

  let requestUrl: string | null = null;
  try {
    const url = new URL(base);
    url.searchParams.set("owner", ownerAddress);
    requestUrl = url.toString();
  } catch {
    try {
      const url = new URL(`${base.replace(/\/$/, "")}/${ownerAddress}`);
      requestUrl = url.toString();
    } catch {
      requestUrl = null;
    }
  }

  if (!requestUrl) {
    console.warn("[theme-pass] Invalid indexer URL", base);
    return [];
  }

  const response = await fetch(requestUrl, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Indexer responded with ${response.status}`);
  }

  const payload = await response.json();
  const entries = resolveIndexerEntries(payload);

  const options: ThemePassOption[] = [];
  for (const entry of entries) {
    const metadataSource = entry.metadata;
    const metadataUrl = buildMetadataUrl(entry);
    try {
      const metadataJson = metadataSource ??
        (metadataUrl
          ? await fetch(metadataUrl, { cache: "no-store" }).then((res) => {
            if (!res.ok) {
              throw new Error(`metadata ${res.status}`);
            }
            return res.json();
          })
          : null);
      if (!metadataJson) {
        continue;
      }
      const parsedMetadata = parseThemePassMetadata(metadataJson);
      options.push({
        id: entry.id,
        name: resolveThemeName(entry),
        description: entry.description,
        priority: entry.priority ?? 0,
        metadata: parsedMetadata,
        source: "wallet",
      });
    } catch (error) {
      console.warn("[theme-pass] Failed to parse metadata", entry.id, error);
    }
  }

  return options.sort((a, b) => a.priority - b.priority);
}

function createCachedOption(selection: ThemePassSelection): ThemePassOption {
  return {
    id: selection.id,
    name: selection.metadata.name ?? selection.id,
    description: selection.metadata.description,
    priority: Number.MAX_SAFE_INTEGER,
    metadata: selection.metadata,
    source: "cached",
  };
}

function determinePersistedMode(
  selection: ThemePassSelection | null,
  fallbackMode: ThemePreferenceMode,
): ThemePreferenceMode {
  const preferred = selection?.metadata.defaultMode;
  if (preferred && preferred !== "system") {
    return preferred;
  }
  return fallbackMode;
}

function ThemePassProviderInner({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { theme: preference, setTheme, isInTelegram } = useTheme();
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = tonConnectUI?.account?.address;

  const [status, setStatus] = useState<ThemePassContextValue["status"]>(
    "idle",
  );
  const [isFetching, setIsFetching] = useState(false);
  const [unlocked, setUnlocked] = useState<ThemePassOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ThemePassOption | null>(
    null,
  );
  const [error, setError] = useState<string | undefined>(undefined);
  const isFetchingRef = useRef(false);
  const storageHydratedRef = useRef(false);
  const pendingPersistRef = useRef(false);
  const mountedRef = useRef(true);

  const cachedSelectionRef = useRef<ThemePassSelection | null>(null);

  useEffect(() => {
    storageHydratedRef.current = true;
    const cached = loadStoredThemePass();
    if (cached) {
      cachedSelectionRef.current = cached;
      const option = createCachedOption(cached);
      setSelectedOption(option);
      setUnlocked((previous) => {
        if (previous.some((entry) => entry.id === option.id)) {
          return previous;
        }
        return [...previous, option];
      });
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const persistSelection = useCallback(
    async (selection: ThemePassSelection | null) => {
      const token = session?.access_token;
      if (!token) return;
      try {
        const payload = selection
          ? {
            id: selection.id,
            metadata: selection.metadata,
          }
          : null;
        await callEdgeFunction("THEME_SAVE", {
          method: "POST",
          token,
          body: {
            mode: determinePersistedMode(selection, preference),
            themePass: payload,
          },
        });
      } catch (persistError) {
        console.warn("[theme-pass] Failed to persist selection", persistError);
      }
    },
    [preference, session?.access_token],
  );

  useEffect(() => {
    if (!storageHydratedRef.current) {
      return;
    }
    if (!selectedOption && cachedSelectionRef.current) {
      return;
    }
    applyThemePassStyles(
      selectedOption ? buildThemeSelection(selectedOption) : null,
    );
    storeThemePass(selectedOption ? buildThemeSelection(selectedOption) : null);

    if (
      selectedOption?.metadata.defaultMode &&
      selectedOption.metadata.defaultMode !== "system"
    ) {
      setTheme(selectedOption.metadata.defaultMode);
    }

    if (pendingPersistRef.current) {
      pendingPersistRef.current = false;
      void persistSelection(
        selectedOption ? buildThemeSelection(selectedOption) : null,
      );
    }
  }, [persistSelection, selectedOption, setTheme]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data, error: fetchError } = await callEdgeFunction<{
          mode?: ThemePreferenceMode;
          themePass?: { id: string; metadata?: ThemePassMetadata } | null;
        }>("THEME_GET", { token: session.access_token });
        if (cancelled || fetchError) return;
        if (data?.themePass?.id && data.themePass.metadata) {
          const parsed = {
            id: data.themePass.id,
            metadata: parseThemePassMetadata(data.themePass.metadata),
            selectedAt: Date.now(),
          } satisfies ThemePassSelection;
          cachedSelectionRef.current = parsed;
          if (!selectedOption || selectedOption.id !== parsed.id) {
            const option = createCachedOption(parsed);
            setSelectedOption(option);
          }
        }
      } catch (requestError) {
        console.warn("[theme-pass] Failed to hydrate theme pass", requestError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedOption, session?.access_token]);

  useEffect(() => {
    if (!walletAddress || isInTelegram) {
      setUnlocked((previous) =>
        previous.filter((entry) => entry.source === "cached")
      );
      setStatus("idle");
      setError(undefined);
      setIsFetching(false);
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    setStatus("loading");
    setError(undefined);

    void (async () => {
      try {
        const passes = await fetchThemePasses(walletAddress);
        if (cancelled || !mountedRef.current) return;
        setIsFetching(false);

        const cachedSelection = cachedSelectionRef.current;
        const merged = passes.slice();
        if (
          cachedSelection &&
          !merged.some((entry) => entry.id === cachedSelection.id)
        ) {
          merged.push(createCachedOption(cachedSelection));
        }

        setUnlocked(merged);
        setStatus(merged.length > 0 ? "ready" : "idle");
        if (merged.length === 0) {
          setSelectedOption(null);
          return;
        }

        const preferred = cachedSelection
          ? merged.find((entry) => entry.id === cachedSelection.id)
          : merged[0];

        if (preferred) {
          setSelectedOption(preferred);
        }
      } catch (fetchError) {
        if (cancelled) return;
        setIsFetching(false);
        setStatus("error");
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to resolve theme passes",
        );
      }
    })();

    return () => {
      cancelled = true;
      if (mountedRef.current) {
        setIsFetching(false);
      }
    };
  }, [isInTelegram, walletAddress]);

  const selectTheme = useCallback(
    async (id: string | null) => {
      if (!id) {
        pendingPersistRef.current = true;
        setSelectedOption(null);
        return;
      }
      const option = unlocked.find((entry) => entry.id === id);
      if (!option) {
        console.warn("[theme-pass] Attempted to select unknown theme", id);
        return;
      }
      cachedSelectionRef.current = buildThemeSelection(option);
      pendingPersistRef.current = true;
      setSelectedOption(option);
    },
    [unlocked],
  );

  const clearTheme = useCallback(async () => {
    pendingPersistRef.current = true;
    cachedSelectionRef.current = null;
    setSelectedOption(null);
  }, []);

  const contextValue = useMemo<ThemePassContextValue>(() => ({
    status,
    unlocked,
    selected: selectedOption,
    selectTheme,
    clearTheme,
    error,
    walletAddress,
    isFetching,
  }), [
    clearTheme,
    error,
    isFetching,
    selectTheme,
    selectedOption,
    status,
    unlocked,
    walletAddress,
  ]);

  return (
    <ThemePassContext.Provider value={contextValue}>
      {children}
    </ThemePassContext.Provider>
  );
}

export function ThemePassProvider({ children }: { children: React.ReactNode }) {
  return <ThemePassProviderInner>{children}</ThemePassProviderInner>;
}

export function useThemePass() {
  const context = useContext(ThemePassContext);
  if (!context) {
    throw new Error("useThemePass must be used within a ThemePassProvider");
  }
  return context;
}

export function getCachedThemePassPayload() {
  const cached = loadStoredThemePass();
  return buildThemePassInlineScriptPayload(cached);
}
