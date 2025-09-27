import { jsx as _jsx } from "react/jsx-runtime";
import Script from "next/script";
const schemaTypeMap = {
  website: "WebSite",
  article: "Article",
  blogPosting: "BlogPosting",
  techArticle: "TechArticle",
  webPage: "WebPage",
  organization: "Organization",
};
export function Schema(
  {
    as,
    title,
    description,
    baseURL,
    path,
    datePublished,
    dateModified,
    image,
    sameAs = [],
    author,
  },
) {
  const normalizedBaseURL = baseURL.endsWith("/")
    ? baseURL.slice(0, -1)
    : baseURL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const imageUrl = image
    ? `${normalizedBaseURL}${image.startsWith("/") ? image : `/${image}`}`
    : `${normalizedBaseURL}/og?title=${encodeURIComponent(title)}`;
  const url = `${normalizedBaseURL}${normalizedPath}`;
  const schemaType = schemaTypeMap[as];
  // biome-ignore lint/suspicious/noExplicitAny: <cause why not, we love any in typescript..>
  const schema = {
    "@context": "https://schema.org",
    "@type": schemaType,
    url,
  };
  schema.sameAs = sameAs.filter(Boolean);
  if (as === "website") {
    schema.name = title;
    schema.description = description;
    schema.image = imageUrl;
  } else if (as === "organization") {
    schema.name = title;
    schema.description = description;
    schema.image = imageUrl;
  } else {
    schema.headline = title;
    schema.description = description;
    schema.image = imageUrl;
    if (datePublished) {
      schema.datePublished = datePublished;
      schema.dateModified = dateModified || datePublished;
    }
  }
  if (author) {
    schema.author = {
      "@type": "Person",
      name: author.name,
      ...(author.url && { url: author.url }),
      ...(author.image && {
        image: {
          "@type": "ImageObject",
          url: author.image,
        },
      }),
    };
  }
  return (_jsx(Script, {
    id: `schema-${as}-${path}`,
    type: "application/ld+json",
    // biome-ignore lint/security/noDangerouslySetInnerHtml: <It's not dynamic nor a security issue.>
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(schema),
    },
  }));
}
export default Schema;
//# sourceMappingURL=Schema.js.map
