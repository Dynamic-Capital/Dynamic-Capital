export function generateMetadata(
  {
    title,
    description,
    baseURL,
    path = "",
    type = "website",
    image,
    publishedTime,
    author,
    canonical,
    robots,
    noindex,
    nofollow,
    alternates,
  },
) {
  const normalizedBaseURL = baseURL.endsWith("/")
    ? baseURL.slice(0, -1)
    : baseURL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : `${image.startsWith("/") ? "" : "/"}${image}`
    : `/api/og/generate?title=${encodeURIComponent(title)}`;
  const url = canonical || `${normalizedBaseURL}${normalizedPath}`;
  let robotsContent = robots;
  if (!robotsContent && (noindex || nofollow)) {
    robotsContent = `${noindex ? "noindex" : "index"},${
      nofollow ? "nofollow" : "follow"
    }`;
  }
  return {
    metadataBase: new URL(
      normalizedBaseURL.startsWith("https://")
        ? normalizedBaseURL
        : `https://${normalizedBaseURL}`,
    ),
    title,
    description,
    openGraph: {
      title,
      description,
      type,
      ...(publishedTime && type === "article" ? { publishedTime } : {}),
      url,
      images: [
        {
          url: ogImage,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    ...(author ? { authors: [{ name: author.name, url: author.url }] } : {}),
    ...(robotsContent ? { robots: robotsContent } : {}),
    ...(alternates?.length
      ? {
        alternates: {
          canonical: url,
          languages: Object.fromEntries(
            alternates.map((alt) => [alt.hrefLang, alt.href]),
          ),
        },
      }
      : {}),
  };
}
export const Meta = {
  generate: generateMetadata,
};
export default Meta;
//# sourceMappingURL=Meta.js.map
