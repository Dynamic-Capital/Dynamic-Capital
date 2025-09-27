interface OgData {
  title: string;
  description: string;
  image: string;
  url: string;
  faviconUrl?: string;
}
export declare function useOgData(
  url: string | null,
  customFetchUrl?: string,
  customProxyUrl?: string,
): {
  ogData: Partial<OgData> | null;
  loading: boolean;
};
export declare function useOgImage(
  url: string | null,
  customFetchUrl?: string,
  customProxyUrl?: string,
): {
  ogImage: string | null;
  loading: boolean;
};
export {};
//# sourceMappingURL=useFetchOg.d.ts.map
