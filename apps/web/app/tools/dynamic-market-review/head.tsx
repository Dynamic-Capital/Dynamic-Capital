export default function Head() {
  const title = "Dynamic Market Review – Dynamic Capital";
  const description =
    "Monitor currency strength, volatility, and cross-asset heatmaps with the desk's live Dynamic Market Review dashboard.";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </>
  );
}
