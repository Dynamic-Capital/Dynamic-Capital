export default function Head() {
  const title = "Dynamic Market Review – Dynamic Capital";
  const description =
    "Adapt Dynamic Capital's Market Review workspace to the active session with responsive heatmaps, watchlists, and cross-asset telemetry.";
  const siteOrigin = "https://dynamic.capital";
  const path = "/tools/dynamic-market-review";
  const url = `${siteOrigin}${path}`;
  const ogImageUrl = new URL("/api/og", siteOrigin);
  ogImageUrl.searchParams.set("title", "Dynamic Market Review");

  const ogImage = ogImageUrl.toString();

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="application-name" content="Dynamic Market Review" />
      <meta name="apple-mobile-web-app-title" content="Market Review" />
      <meta name="robots" content="index,follow" />
      <meta
        name="keywords"
        content="market review, fx heatmap, cross-asset dashboard, dynamic capital"
      />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Dynamic Capital" />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={ogImage} />
      <link rel="canonical" href={url} />
    </>
  );
}
