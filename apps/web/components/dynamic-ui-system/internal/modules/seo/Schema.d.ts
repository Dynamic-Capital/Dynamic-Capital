export interface SchemaProps {
  as:
    | "website"
    | "article"
    | "blogPosting"
    | "techArticle"
    | "webPage"
    | "organization";
  title: string;
  description: string;
  baseURL: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
  sameAs?: string[];
  author?: {
    name: string;
    url?: string;
    image?: string;
  };
}
export declare function Schema(
  {
    as,
    title,
    description,
    baseURL,
    path,
    datePublished,
    dateModified,
    image,
    sameAs,
    author,
  }: SchemaProps,
): import("react/jsx-runtime").JSX.Element;
export default Schema;
//# sourceMappingURL=Schema.d.ts.map
