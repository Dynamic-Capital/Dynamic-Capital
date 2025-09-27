import { CondensedTShirtSizes } from "@/types";
import { Card } from ".";
export interface OgServiceConfig {
  proxyImageUrl?: (url: string) => string;
  proxyFaviconUrl?: (url: string) => string;
  fetchOgUrl?: string;
  proxyOgUrl?: string;
}
export interface OgData {
  title: string;
  description: string;
  faviconUrl: string;
  image: string;
  url: string;
}
interface OgCardProps extends Omit<React.ComponentProps<typeof Card>, "title"> {
  url?: string;
  sizes?: string;
  size?: CondensedTShirtSizes;
  ogData?: Partial<OgData> | null;
  direction?: "column" | "row" | "column-reverse" | "row-reverse";
  serviceConfig?: OgServiceConfig;
  title?: string | false;
  description?: string | false;
  favicon?: string | false;
  image?: string | false;
  cardUrl?: string | false;
}
declare const OgCard: {
  (
    {
      url,
      ogData: providedOgData,
      direction,
      sizes,
      size,
      serviceConfig,
      title,
      description,
      favicon,
      image,
      cardUrl,
      ...card
    }: OgCardProps,
  ): import("react/jsx-runtime").JSX.Element | null;
  displayName: string;
};
export { OgCard };
//# sourceMappingURL=OgCard.d.ts.map
