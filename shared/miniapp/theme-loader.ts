/* eslint-disable no-console -- Logging is useful for telemetry during theme sync */

const TON_API_BASE = "https://tonapi.io/v2";
const NFT_FETCH_LIMIT = 256;
const ACTIVE_THEME_STORAGE_KEY = "dc:miniapp:theme:active";
const ACTIVE_THEME_WALLET_PREFIX = "dc:miniapp:theme:wallet:";
const DEFAULT_CONTRAST_REQUIREMENT = 4.5;
const SECONDARY_CONTRAST_REQUIREMENT = 3;
const CONTENT_POLL_INTERVAL_MS = 60_000;

type TonConnectAccountLike = {
  address?: string | null;
};

export type TonConnectLike = {
  account?: TonConnectAccountLike | null;
  wallet?: TonConnectAccountLike | null;
  onStatusChange?: (
    listener: (wallet: TonConnectAccountLike | null) => void,
  ) => void | (() => void) | Promise<void | (() => void)>;
};

export type ThemeFontDefinition = {
  family: string;
  src: string;
  descriptors?: FontFaceDescriptors;
};

export type ThemeSoundDefinition = {
  id: string;
  src: string;
  type?: string;
};

export type ThemeAccessibilityPair = {
  foreground: string;
  background: string;
  minRatio?: number;
};

export type MiniAppThemeOption = {
  id: string;
  label: string;
  description?: string;
  previewImage?: string | null;
  cssVariables: Record<string, string>;
  fonts: ThemeFontDefinition[];
  sounds: ThemeSoundDefinition[];
  updatedAt?: string | null;
  nftAddress: string;
  collectionAddress?: string | null;
  contentUri?: string | null;
  metadataUri?: string | null;
  accessibility: {
    pairs: ThemeAccessibilityPair[];
  };
};

export type MiniAppThemeState = {
  availableThemes: MiniAppThemeOption[];
  activeThemeId: string | null;
  isLoading: boolean;
  isApplying: boolean;
  isReady: boolean;
  walletAddress?: string;
  error?: string | null;
};

type CacheEntry = {
  id: string;
  metadata: MiniAppThemeOption;
  storedAt: number;
  contentUri?: string | null;
  metadataUri?: string | null;
};

type TonApiNftItem = {
  address?: string;
  index?: number;
  owner?: string;
  collection?: { address?: string | null } | null;
  content_uri?: string | null;
  metadata?: unknown;
  metadata_url?: string | null;
  previews?: Array<{ url?: string | null }>;
  last_update_time?: string | null;
  updated_at?: string | null;
};

type TonApiAccountNftsResponse = {
  nft_items?: TonApiNftItem[];
};

type TonApiEventsResponse = {
  events?: Array<{
    timestamp?: number;
    event_id?: string;
    event_type?: string;
    payload?: {
      content_uri?: string | null;
      contentUri?: string | null;
    } | null;
  }>;
};

function normaliseVarName(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("--")) return trimmed;
  return `--${trimmed.replace(/^--/, "")}`;
}

function safeJsonParse<T = unknown>(value: unknown): T | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn("[miniapp-theme] Failed to parse JSON payload", error);
      return null;
    }
  }
  if (typeof value === "object" && value !== null) {
    return value as T;
  }
  return null;
}

function normaliseCssVariables(source: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!source || typeof source !== "object") return result;
  for (
    const [key, rawValue] of Object.entries(source as Record<string, unknown>)
  ) {
    if (typeof rawValue !== "string") continue;
    const normalisedKey = normaliseVarName(key);
    result[normalisedKey] = rawValue;
  }
  return result;
}

function normaliseAccessibilityPairs(
  source: unknown,
): ThemeAccessibilityPair[] {
  if (!Array.isArray(source)) return [];
  const result: ThemeAccessibilityPair[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const foreground = typeof candidate.foreground === "string"
      ? candidate.foreground
      : typeof candidate.foregroundVar === "string"
      ? `var(${normaliseVarName(candidate.foregroundVar)})`
      : typeof candidate.fg === "string"
      ? candidate.fg
      : null;
    const background = typeof candidate.background === "string"
      ? candidate.background
      : typeof candidate.backgroundVar === "string"
      ? `var(${normaliseVarName(candidate.backgroundVar)})`
      : typeof candidate.bg === "string"
      ? candidate.bg
      : null;
    if (!foreground || !background) continue;
    const pair: ThemeAccessibilityPair = { foreground, background };
    const minRatio = typeof candidate.minRatio === "number"
      ? candidate.minRatio
      : typeof candidate.min_ratio === "number"
      ? candidate.min_ratio
      : undefined;
    if (typeof minRatio === "number") {
      pair.minRatio = minRatio;
    }
    result.push(pair);
  }
  return result;
}

function normaliseFonts(source: unknown): ThemeFontDefinition[] {
  if (!Array.isArray(source)) return [];
  const fonts: ThemeFontDefinition[] = [];
  for (const entry of source) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const family = typeof candidate.family === "string"
      ? candidate.family
      : typeof candidate.name === "string"
      ? candidate.name
      : null;
    const src = typeof candidate.src === "string"
      ? candidate.src
      : typeof candidate.url === "string"
      ? candidate.url
      : null;
    if (!family || !src) continue;
    const descriptors =
      candidate.descriptors && typeof candidate.descriptors === "object"
        ? candidate.descriptors as FontFaceDescriptors
        : undefined;
    fonts.push({ family, src, descriptors });
  }
  return fonts;
}

function normaliseSounds(source: unknown): ThemeSoundDefinition[] {
  if (!Array.isArray(source)) return [];
  const sounds: ThemeSoundDefinition[] = [];
  source.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return;
    }
    const candidate = entry as Record<string, unknown>;
    const src = typeof candidate.src === "string"
      ? candidate.src
      : typeof candidate.url === "string"
      ? candidate.url
      : null;
    if (!src) {
      return;
    }
    const id = typeof candidate.id === "string"
      ? candidate.id
      : typeof candidate.key === "string"
      ? candidate.key
      : `sound-${index}`;
    const type = typeof candidate.type === "string"
      ? candidate.type
      : undefined;
    sounds.push({ id, src, type });
  });
  return sounds;
}

function normaliseThemeOption(
  nft: TonApiNftItem,
  metadata: Record<string, unknown>,
): MiniAppThemeOption | null {
  const metadataRecord = metadata;
  const metadataData = typeof metadataRecord["data"] === "object" &&
      metadataRecord["data"] !== null
    ? metadataRecord["data"] as Record<string, unknown>
    : null;
  const metadataAttributes = Array.isArray(metadataRecord["attributes"])
    ? metadataRecord["attributes"] as Array<Record<string, unknown>>
    : [];

  const attributeTheme = metadataAttributes.find((attribute) => {
    if (!attribute || typeof attribute !== "object") return false;
    const attributeRecord = attribute as Record<string, unknown>;
    const key = typeof attributeRecord.trait_type === "string"
      ? attributeRecord.trait_type
      : typeof attributeRecord.key === "string"
      ? attributeRecord.key
      : undefined;
    return key === "theme" || key === "theme_payload";
  });

  const attributeValue = attributeTheme && "value" in attributeTheme
    ? attributeTheme.value
    : undefined;

  const themeSource = metadataRecord["theme"] ??
    metadataRecord["theme_payload"] ??
    metadataRecord["themePayload"] ??
    (metadataData ? metadataData["theme"] : undefined) ??
    attributeValue;

  const themeCandidate = safeJsonParse<Record<string, unknown>>(themeSource) ??
    metadataRecord;

  if (!themeCandidate || typeof themeCandidate !== "object") {
    return null;
  }

  const assetsRecord = typeof themeCandidate["assets"] === "object" &&
      themeCandidate["assets"] !== null
    ? themeCandidate["assets"] as Record<string, unknown>
    : null;

  const cssVariables = normaliseCssVariables(
    themeCandidate["cssVariables"] ?? themeCandidate["css_vars"] ??
      themeCandidate["variables"] ?? themeCandidate["vars"],
  );

  if (Object.keys(cssVariables).length === 0) {
    return null;
  }

  const fonts = normaliseFonts(
    themeCandidate["fonts"] ??
      (assetsRecord ? assetsRecord["fonts"] : undefined) ??
      themeCandidate["typography"],
  );
  const sounds = normaliseSounds(
    themeCandidate["sounds"] ??
      (assetsRecord ? assetsRecord["sounds"] : undefined) ??
      themeCandidate["audio"],
  );

  const accessibilitySource = (() => {
    const accessibilityValue = themeCandidate["accessibility"];
    if (accessibilityValue && typeof accessibilityValue === "object") {
      const record = accessibilityValue as Record<string, unknown>;
      return record["pairs"] ?? accessibilityValue;
    }
    return themeCandidate["accessibility"] ?? themeCandidate["contrast"];
  })();
  const accessibilityPairs = normaliseAccessibilityPairs(accessibilitySource);

  const idCandidate = nft.address ??
    metadataRecord["id"] ??
    metadataRecord["slug"] ??
    metadataRecord["key"] ?? "";
  const id = typeof idCandidate === "string"
    ? idCandidate
    : typeof idCandidate === "number"
    ? idCandidate.toString()
    : "";
  if (!id) {
    return null;
  }

  const label = typeof metadataRecord["name"] === "string"
    ? metadataRecord["name"] as string
    : typeof themeCandidate["name"] === "string"
    ? themeCandidate["name"] as string
    : `Theme #${nft.index ?? "?"}`;
  const description = typeof metadataRecord["description"] === "string"
    ? metadataRecord["description"] as string
    : typeof themeCandidate["description"] === "string"
    ? themeCandidate["description"] as string
    : undefined;
  const previewImage = typeof metadataRecord["image"] === "string"
    ? metadataRecord["image"] as string
    : Array.isArray(nft.previews) && nft.previews[0]?.url
    ? nft.previews[0]?.url ?? null
    : typeof themeCandidate["preview"] === "string"
    ? themeCandidate["preview"] as string
    : typeof themeCandidate["previewImage"] === "string"
    ? themeCandidate["previewImage"] as string
    : null;
  const updatedAt = typeof metadataRecord["updatedAt"] === "string"
    ? metadataRecord["updatedAt"] as string
    : typeof themeCandidate["updatedAt"] === "string"
    ? themeCandidate["updatedAt"] as string
    : nft.updated_at ?? nft.last_update_time ?? null;

  return {
    id,
    label,
    description,
    previewImage,
    cssVariables,
    fonts,
    sounds,
    updatedAt,
    nftAddress: nft.address ?? id,
    collectionAddress: nft.collection?.address ?? null,
    contentUri: nft.content_uri ?? null,
    metadataUri: nft.metadata_url ?? null,
    accessibility: { pairs: accessibilityPairs },
  } satisfies MiniAppThemeOption;
}

function ensureBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function resolveGatewayUrl(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`;
  }
  if (uri.startsWith("tonstorage://")) {
    return `https://tonstorage.com/${uri.replace("tonstorage://", "")}`;
  }
  return uri;
}

async function fetchJson(
  uri: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const url = resolveGatewayUrl(uri);
  try {
    const response = await fetch(url, { cache: "no-store", signal });
    if (!response.ok) {
      console.warn(
        `[miniapp-theme] Unexpected metadata status ${response.status} for ${url}`,
      );
      return null;
    }
    const payload = await response.json();
    if (!payload || typeof payload !== "object") {
      return null;
    }
    return payload as Record<string, unknown>;
  } catch (error) {
    if ((signal?.aborted) ?? false) return null;
    console.warn(`[miniapp-theme] Failed to fetch metadata from ${url}`, error);
    return null;
  }
}

async function fetchThemeNfts(
  address: string,
  signal?: AbortSignal,
  tonApiBaseUrl: string = TON_API_BASE,
): Promise<TonApiNftItem[]> {
  const url = new URL(`${tonApiBaseUrl}/accounts/${address}/nfts`);
  url.searchParams.set("limit", NFT_FETCH_LIMIT.toString());
  url.searchParams.set("indirect_ownership", "true");
  try {
    const response = await fetch(url, { cache: "no-store", signal });
    if (!response.ok) {
      throw new Error(`Unexpected status ${response.status}`);
    }
    const payload = await response.json() as TonApiAccountNftsResponse;
    if (!payload?.nft_items) return [];
    return payload.nft_items.filter((item): item is TonApiNftItem =>
      Boolean(item?.address)
    );
  } catch (error) {
    if ((signal?.aborted) ?? false) return [];
    throw error;
  }
}

async function delay(ms: number, signal?: AbortSignal) {
  if (!ms) return;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      resolve();
    }, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

function resolveColorValue(
  manager: MiniAppThemeManager,
  value: string,
  candidateVars: Record<string, string>,
  seen: Set<string>,
): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("var(")) {
    const inner = trimmed.slice(4, -1).trim();
    const normalisedKey = normaliseVarName(inner);
    if (seen.has(normalisedKey)) {
      return null;
    }
    seen.add(normalisedKey);
    const nextValue = candidateVars[normalisedKey] ??
      manager.getCurrentVarValue(normalisedKey);
    if (!nextValue) return null;
    return resolveColorValue(manager, nextValue, candidateVars, seen);
  }
  return trimmed;
}

function parseColor(value: string): { r: number; g: number; b: number } | null {
  const hexMatch = value.match(/^#(?<hex>[0-9a-fA-F]{3,8})$/);
  if (hexMatch?.groups?.hex) {
    const hex = hexMatch.groups.hex;
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
  }
  const rgbMatch = value
    .replace(/\s+/g, "")
    .match(
      /^rgba?\((?<r>\d{1,3}),(?<g>\d{1,3}),(?<b>\d{1,3})(?:,(?<a>[\d.]+))?\)$/i,
    );
  if (rgbMatch?.groups) {
    const r = Number(rgbMatch.groups.r);
    const g = Number(rgbMatch.groups.g);
    const b = Number(rgbMatch.groups.b);
    if ([r, g, b].every((channel) => Number.isFinite(channel))) {
      return { r, g, b };
    }
  }
  return null;
}

function luminance(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function calculateContrast(colorA: string, colorB: string): number | null {
  const first = parseColor(colorA);
  const second = parseColor(colorB);
  if (!first || !second) return null;
  const lum1 = 0.2126 * luminance(first.r) + 0.7152 * luminance(first.g) +
    0.0722 * luminance(first.b);
  const lum2 = 0.2126 * luminance(second.r) + 0.7152 * luminance(second.g) +
    0.0722 * luminance(second.b);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

class ThemeMetadataCache {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private openDb(): Promise<IDBDatabase | null> {
    if (!ensureBrowserEnvironment() || !("indexedDB" in window)) {
      return Promise.resolve(null);
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        const request = indexedDB.open("dc-miniapp-themes", 1);
        request.onerror = () => {
          console.debug("[miniapp-theme] IndexedDB unavailable", request.error);
          resolve(null);
        };
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains("themes")) {
            database.createObjectStore("themes", { keyPath: "id" });
          }
        };
      });
    }
    return this.dbPromise;
  }

  async get(id: string): Promise<CacheEntry | null> {
    if (!ensureBrowserEnvironment()) return null;
    const localKey = `${ACTIVE_THEME_WALLET_PREFIX}cache:${id}`;
    try {
      const stored = globalThis.localStorage.getItem(localKey);
      if (stored) {
        return JSON.parse(stored) as CacheEntry;
      }
    } catch (error) {
      console.debug(
        "[miniapp-theme] Unable to parse localStorage cache",
        error,
      );
    }
    const db = await this.openDb();
    if (!db) return null;
    return await new Promise<CacheEntry | null>((resolve) => {
      const transaction = db.transaction("themes", "readonly");
      const store = transaction.objectStore("themes");
      const request = store.get(id);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async set(entry: CacheEntry) {
    if (!ensureBrowserEnvironment()) return;
    const serialized = JSON.stringify(entry);
    const localKey = `${ACTIVE_THEME_WALLET_PREFIX}cache:${entry.id}`;
    try {
      globalThis.localStorage.setItem(localKey, serialized);
    } catch (error) {
      console.debug("[miniapp-theme] Failed to persist metadata cache", error);
    }
    const db = await this.openDb();
    if (!db) return;
    const transaction = db.transaction("themes", "readwrite");
    transaction.objectStore("themes").put(entry);
  }

  async remove(id: string) {
    if (!ensureBrowserEnvironment()) return;
    const localKey = `${ACTIVE_THEME_WALLET_PREFIX}cache:${id}`;
    try {
      globalThis.localStorage.removeItem(localKey);
    } catch (error) {
      console.debug("[miniapp-theme] Failed to clear metadata cache", error);
    }
    const db = await this.openDb();
    if (!db) return;
    const transaction = db.transaction("themes", "readwrite");
    transaction.objectStore("themes").delete(id);
  }
}

export class MiniAppThemeManager {
  private state: MiniAppThemeState = {
    availableThemes: [],
    activeThemeId: null,
    isLoading: false,
    isApplying: false,
    isReady: false,
    error: null,
  };
  private listeners = new Set<(state: MiniAppThemeState) => void>();
  private readonly cache = new ThemeMetadataCache();
  private appliedVarKeys = new Set<string>();
  private defaultVarSnapshot: Record<string, string> = {};
  private loadedFonts = new Set<string>();
  private loadedSounds = new Map<string, HTMLAudioElement>();
  private abortController?: AbortController;
  private contentCleanup?: () => void;
  private tonApiBaseUrl: string;

  constructor(options?: { tonApiBaseUrl?: string }) {
    this.tonApiBaseUrl = options?.tonApiBaseUrl ?? TON_API_BASE;
  }

  subscribe(listener: (state: MiniAppThemeState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): MiniAppThemeState {
    return this.state;
  }

  private setState(patch: Partial<MiniAppThemeState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setWalletAddress(address?: string | null) {
    const normalised = address?.toString().trim();
    if (!normalised) {
      this.abortController?.abort();
      this.abortController = undefined;
      this.setState({
        walletAddress: undefined,
        availableThemes: [],
        activeThemeId: null,
      });
      void this.resetTheme();
      if (this.contentCleanup) {
        this.contentCleanup();
        this.contentCleanup = undefined;
      }
      return;
    }
    if (this.state.walletAddress === normalised) {
      return;
    }
    this.setState({ walletAddress: normalised });
    void this.refresh();
  }

  async refresh() {
    const address = this.state.walletAddress;
    if (!address) return;
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;
    this.setState({ isLoading: true, error: null });
    try {
      const nftItems = await fetchThemeNfts(
        address,
        controller.signal,
        this.tonApiBaseUrl,
      );
      if (controller.signal.aborted) return;
      const themes: MiniAppThemeOption[] = [];
      for (const nft of nftItems) {
        if (controller.signal.aborted) return;
        const theme = await this.resolveThemeFromNft(nft, controller.signal);
        if (theme) {
          themes.push(theme);
        }
      }
      if (controller.signal.aborted) return;
      this.setState({
        availableThemes: themes,
        isLoading: false,
        isReady: true,
      });
      this.reapplySelection(themes);
      this.attachContentListener(themes);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      console.error("[miniapp-theme] Failed to load theme NFTs", error);
      this.setState({
        isLoading: false,
        isReady: true,
        error: error instanceof Error
          ? error.message
          : "Unable to load theme NFTs",
      });
    }
  }

  private async resolveThemeFromNft(
    nft: TonApiNftItem,
    signal: AbortSignal,
  ): Promise<MiniAppThemeOption | null> {
    const id = nft.address;
    if (!id) return null;
    const cacheEntry = await this.cache.get(id);
    const currentContentUri = nft.content_uri ?? null;
    const currentMetadataUri = nft.metadata_url ?? null;
    if (
      cacheEntry &&
      cacheEntry.contentUri === currentContentUri &&
      cacheEntry.metadataUri === currentMetadataUri
    ) {
      return { ...cacheEntry.metadata };
    }
    let metadata: Record<string, unknown> | null = null;
    if (nft.metadata && typeof nft.metadata === "object") {
      metadata = nft.metadata as Record<string, unknown>;
    } else if (nft.metadata_url) {
      metadata = await fetchJson(nft.metadata_url, signal);
    } else if (nft.content_uri) {
      metadata = await fetchJson(nft.content_uri, signal);
    }
    if (!metadata) {
      return null;
    }
    const theme = normaliseThemeOption(nft, metadata);
    if (!theme) {
      return null;
    }
    await this.cache.set({
      id,
      metadata: theme,
      storedAt: Date.now(),
      contentUri: currentContentUri,
      metadataUri: currentMetadataUri,
    });
    return theme;
  }

  private readStoredSelection(address?: string): string | null {
    if (!ensureBrowserEnvironment()) return null;
    const walletKey = address
      ? `${ACTIVE_THEME_WALLET_PREFIX}${address}`
      : null;
    try {
      if (walletKey) {
        const stored = globalThis.localStorage.getItem(walletKey);
        if (stored) return stored;
      }
      const fallback = globalThis.localStorage.getItem(
        ACTIVE_THEME_STORAGE_KEY,
      );
      return fallback ?? null;
    } catch (error) {
      console.debug(
        "[miniapp-theme] Unable to read stored theme selection",
        error,
      );
      return null;
    }
  }

  private persistSelection(themeId: string | null) {
    if (!ensureBrowserEnvironment()) return;
    const wallet = this.state.walletAddress;
    const walletKey = wallet ? `${ACTIVE_THEME_WALLET_PREFIX}${wallet}` : null;
    try {
      if (walletKey) {
        if (themeId) {
          globalThis.localStorage.setItem(walletKey, themeId);
        } else {
          globalThis.localStorage.removeItem(walletKey);
        }
      }
      if (themeId) {
        globalThis.localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, themeId);
      } else {
        globalThis.localStorage.removeItem(ACTIVE_THEME_STORAGE_KEY);
      }
    } catch (error) {
      console.debug("[miniapp-theme] Unable to persist active theme", error);
    }
  }

  private reapplySelection(themes: MiniAppThemeOption[]) {
    const currentActive = this.state.activeThemeId;
    if (currentActive && themes.some((theme) => theme.id === currentActive)) {
      const activeTheme = themes.find((theme) => theme.id === currentActive);
      if (activeTheme) {
        void this.applyTheme(activeTheme, { persist: false });
        return;
      }
    }
    const stored = this.readStoredSelection(this.state.walletAddress);
    if (stored && themes.some((theme) => theme.id === stored)) {
      void this.applyTheme(
        themes.find((theme) => theme.id === stored)!,
        { persist: true },
      );
      return;
    }
    void this.resetTheme();
  }

  async selectTheme(themeId: string) {
    const theme = this.state.availableThemes.find((candidate) =>
      candidate.id === themeId
    );
    if (!theme) {
      console.warn(
        `[miniapp-theme] Theme ${themeId} not found in unlocked set`,
      );
      return;
    }
    await this.applyTheme(theme, { persist: true });
  }

  resetTheme(): Promise<void> {
    if (!ensureBrowserEnvironment()) return Promise.resolve();
    const root = document.documentElement;
    for (const key of this.appliedVarKeys) {
      const defaultValue = this.defaultVarSnapshot[key];
      if (defaultValue) {
        root.style.setProperty(key, defaultValue);
      } else {
        root.style.removeProperty(key);
      }
    }
    this.appliedVarKeys.clear();
    this.persistSelection(null);
    this.setState({ activeThemeId: null, isApplying: false });
    return Promise.resolve();
  }

  private async applyTheme(
    theme: MiniAppThemeOption,
    { persist }: { persist: boolean },
  ) {
    if (!ensureBrowserEnvironment()) return;
    this.setState({ isApplying: true, error: null });
    try {
      await this.prepareAssets(theme);
      const candidateVars: Record<string, string> = {
        ...this.defaultVarSnapshot,
        ...theme.cssVariables,
      };
      if (!this.validateAccessibility(theme, candidateVars)) {
        console.warn(
          `[miniapp-theme] Theme ${theme.id} failed accessibility checks. Reverting to default palette.`,
        );
        await this.resetTheme();
        return;
      }
      this.commitCssVariables(theme);
      this.setState({ activeThemeId: theme.id });
      if (persist) {
        this.persistSelection(theme.id);
      }
    } catch (error) {
      console.error("[miniapp-theme] Failed to apply theme", error);
      this.setState({
        error: error instanceof Error ? error.message : "Failed to apply theme",
        activeThemeId: null,
      });
      await this.resetTheme();
    } finally {
      this.setState({ isApplying: false });
    }
  }

  private captureDefaultValues(keys: Iterable<string>) {
    if (!ensureBrowserEnvironment()) return;
    const root = document.documentElement;
    const computed = globalThis.getComputedStyle(root);
    for (const key of keys) {
      if (this.defaultVarSnapshot[key]) continue;
      const inline = root.style.getPropertyValue(key);
      const value = inline || computed.getPropertyValue(key);
      if (value) {
        this.defaultVarSnapshot[key] = value.trim();
      }
    }
  }

  private commitCssVariables(theme: MiniAppThemeOption) {
    if (!ensureBrowserEnvironment()) return;
    const root = document.documentElement;
    const keys = Object.keys(theme.cssVariables);
    this.captureDefaultValues(keys);
    for (const key of this.appliedVarKeys) {
      const defaultValue = this.defaultVarSnapshot[key];
      if (defaultValue) {
        root.style.setProperty(key, defaultValue);
      } else {
        root.style.removeProperty(key);
      }
    }
    this.appliedVarKeys.clear();
    for (const [key, value] of Object.entries(theme.cssVariables)) {
      root.style.setProperty(key, value);
      this.appliedVarKeys.add(key);
    }
  }

  private async prepareAssets(theme: MiniAppThemeOption) {
    if (!ensureBrowserEnvironment()) return;
    const fontPromises: Promise<void>[] = [];
    if (theme.fonts.length && typeof document.fonts !== "undefined") {
      for (const font of theme.fonts) {
        const key = `${font.family}::${font.src}`;
        if (this.loadedFonts.has(key)) continue;
        try {
          const fontFace = new FontFace(
            font.family,
            `url(${font.src})`,
            font.descriptors,
          );
          const loadPromise = fontFace
            .load()
            .then((loaded) => {
              document.fonts.add(loaded);
              this.loadedFonts.add(key);
            })
            .catch((error) => {
              console.warn(
                `[miniapp-theme] Failed to load font ${font.family}`,
                error,
              );
            });
          fontPromises.push(loadPromise);
        } catch (error) {
          console.warn(
            `[miniapp-theme] Unable to construct font ${font.family}`,
            error,
          );
        }
      }
    }
    if (theme.sounds.length) {
      for (const sound of theme.sounds) {
        const key = `${sound.id}::${sound.src}`;
        if (this.loadedSounds.has(key)) continue;
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = sound.src;
        audio.addEventListener("error", () => {
          console.warn(`[miniapp-theme] Failed to preload sound ${sound.id}`);
        }, { once: true });
        try {
          audio.load();
          this.loadedSounds.set(key, audio);
        } catch (error) {
          console.warn(
            `[miniapp-theme] Unable to initialise sound ${sound.id}`,
            error,
          );
        }
      }
    }
    if (fontPromises.length) {
      await Promise.all(fontPromises);
    }
  }

  private validateAccessibility(
    theme: MiniAppThemeOption,
    candidateVars: Record<string, string>,
  ): boolean {
    const pairs = theme.accessibility.pairs.length
      ? theme.accessibility.pairs
      : [
        {
          foreground: "var(--tg-text)",
          background: "var(--tg-bg)",
          minRatio: DEFAULT_CONTRAST_REQUIREMENT,
        },
        {
          foreground: "var(--tg-button)",
          background: "var(--tg-bg)",
          minRatio: SECONDARY_CONTRAST_REQUIREMENT,
        },
      ];
    for (const pair of pairs) {
      const foreground = resolveColorValue(
        this,
        pair.foreground,
        candidateVars,
        new Set(),
      );
      const background = resolveColorValue(
        this,
        pair.background,
        candidateVars,
        new Set(),
      );
      if (!foreground || !background) {
        continue;
      }
      const ratio = calculateContrast(foreground, background);
      if (ratio === null) continue;
      if (pair.minRatio && ratio < pair.minRatio) {
        return false;
      }
      if (!pair.minRatio && ratio < DEFAULT_CONTRAST_REQUIREMENT) {
        return false;
      }
    }
    return true;
  }

  getCurrentVarValue(key: string): string {
    if (!ensureBrowserEnvironment()) return "";
    const root = document.documentElement;
    const inline = root.style.getPropertyValue(key);
    if (inline) return inline.trim();
    const computed = globalThis.getComputedStyle(root).getPropertyValue(key);
    return computed.trim();
  }

  private attachContentListener(themes: MiniAppThemeOption[]) {
    if (this.contentCleanup) {
      this.contentCleanup();
      this.contentCleanup = undefined;
    }
    if (!themes.length) return;
    if (!ensureBrowserEnvironment()) return;
    const abortController = new AbortController();
    for (const theme of themes) {
      const targetAddress = theme.nftAddress;
      if (!targetAddress) continue;
      void this.watchContentUpdates(targetAddress, abortController.signal);
    }
    this.contentCleanup = () => abortController.abort();
  }

  private async watchContentUpdates(address: string, signal: AbortSignal) {
    let lastEventId: string | null = null;
    while (!signal.aborted) {
      try {
        const url = new URL(`${this.tonApiBaseUrl}/accounts/${address}/events`);
        url.searchParams.set("event_types", "ContentUpdated");
        url.searchParams.set("limit", "1");
        const response = await fetch(url, { cache: "no-store", signal });
        if (response.ok) {
          const payload = await response.json() as TonApiEventsResponse;
          const event = payload.events?.[0];
          const eventId = event?.event_id ?? event?.timestamp?.toString() ??
            null;
          if (event && eventId && eventId !== lastEventId) {
            lastEventId = eventId;
            console.debug(
              `[miniapp-theme] Detected ContentUpdated for ${address}, refreshing cache`,
            );
            await this.cache.remove(address);
            void this.refresh();
          }
        }
      } catch (error) {
        if (signal.aborted) return;
        console.debug(
          `[miniapp-theme] Failed to poll ContentUpdated for ${address}`,
          error,
        );
      }
      await delay(CONTENT_POLL_INTERVAL_MS, signal);
    }
  }

  destroy() {
    this.abortController?.abort();
    this.abortController = undefined;
    if (this.contentCleanup) {
      this.contentCleanup();
      this.contentCleanup = undefined;
    }
    this.listeners.clear();
  }
}

let sharedManager: MiniAppThemeManager | null = null;

export function getMiniAppThemeManager(): MiniAppThemeManager {
  if (!sharedManager) {
    sharedManager = new MiniAppThemeManager();
  }
  return sharedManager;
}

function extractAddress(source: unknown): string | null {
  if (!source || typeof source !== "object") return null;
  const candidate = source as TonConnectAccountLike & {
    account?: TonConnectAccountLike | null;
    wallet?: TonConnectAccountLike | null;
  };
  if (typeof candidate.address === "string") {
    return candidate.address;
  }
  if (candidate.account && typeof candidate.account.address === "string") {
    return candidate.account.address;
  }
  if (candidate.wallet && typeof candidate.wallet.address === "string") {
    return candidate.wallet.address;
  }
  return null;
}

export function attachTonConnect(
  manager: MiniAppThemeManager,
  tonConnect: TonConnectLike | null | undefined,
): () => void {
  if (!tonConnect) {
    manager.setWalletAddress(null);
    return () => {};
  }

  let disposed = false;

  const updateFromWallet = (wallet: TonConnectAccountLike | null) => {
    if (disposed) return;
    const address = extractAddress(wallet ?? tonConnect);
    manager.setWalletAddress(address);
  };

  updateFromWallet(tonConnect.account ?? tonConnect.wallet ?? null);

  let cleanup: (() => void) | undefined;
  if (typeof tonConnect.onStatusChange === "function") {
    try {
      const result = tonConnect.onStatusChange((wallet) =>
        updateFromWallet(wallet)
      );
      if (typeof result === "function") {
        cleanup = result;
      } else if (
        result && typeof (result as Promise<unknown>).then === "function"
      ) {
        (result as Promise<void | (() => void)>).then((value) => {
          if (typeof value === "function") {
            cleanup = value;
          }
        }).catch((error) => {
          console.debug(
            "[miniapp-theme] TonConnect onStatusChange rejected",
            error,
          );
        });
      }
    } catch (error) {
      console.debug(
        "[miniapp-theme] Unable to attach TonConnect listener",
        error,
      );
    }
  }

  return () => {
    disposed = true;
    cleanup?.();
  };
}

export function attachGlobalTonConnect(
  manager: MiniAppThemeManager,
): () => void {
  if (!ensureBrowserEnvironment()) return () => {};
  let cleanup: (() => void) | undefined;
  let disposed = false;

  const attemptAttach = () => {
    if (disposed) return true;
    const globalCandidate =
      (window as unknown as Record<string, unknown>).TonConnectUI ??
        (window as unknown as Record<string, unknown>).tonConnectUI ??
        (window as unknown as Record<string, unknown>).tonConnect ?? null;
    if (globalCandidate) {
      cleanup = attachTonConnect(manager, globalCandidate as TonConnectLike);
      return true;
    }
    return false;
  };

  if (attemptAttach()) {
    return () => {
      disposed = true;
      cleanup?.();
    };
  }

  const interval = globalThis.setInterval(() => {
    if (attemptAttach()) {
      globalThis.clearInterval(interval);
    }
  }, 500);

  return () => {
    disposed = true;
    globalThis.clearInterval(interval);
    cleanup?.();
  };
}
