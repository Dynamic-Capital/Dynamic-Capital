import type { Metadata as NextMetadata } from "next";
export interface Alternate {
  href: string;
  hrefLang: string;
}
export interface MetaProps {
  title: string;
  description: string;
  baseURL: string;
  path?: string;
  type?: "website" | "article";
  image?: string;
  publishedTime?: string;
  author?: {
    name: string;
    url?: string;
  };
  canonical?: string;
  robots?: string;
  noindex?: boolean;
  nofollow?: boolean;
  alternates?: Alternate[];
}
export declare function generateMetadata(
  {
    title,
    description,
    baseURL,
    path,
    type,
    image,
    publishedTime,
    author,
    canonical,
    robots,
    noindex,
    nofollow,
    alternates,
  }: MetaProps,
): NextMetadata;
export declare const Meta: {
  generate: typeof generateMetadata;
};
export default Meta;
//# sourceMappingURL=Meta.d.ts.map
