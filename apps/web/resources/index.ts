// import a pre-defined template for config and content options
export {
  about,
  blog,
  gallery,
  home,
  newsletter,
  person,
  social,
  work,
} from "./content";

export {
  baseURL,
  dataStyle,
  display,
  dynamicUI,
  effects,
  fonts,
  mailchimp,
  protectedRoutes,
  routes,
  sameAs,
  schema,
  socialSharing,
  style,
} from "./dynamic-ui.config";

export {
  dynamicBranding,
  exportDynamicBranding,
  importDynamicBranding,
} from "./dynamic-branding.config";

export {
  dynamicPortfolioBucketBaseUrl,
  dynamicPortfolioBucketName,
  supabaseAsset,
  toAbsoluteUrl,
} from "./assets";

export { getRouteDefinitions, isRouteEnabled } from "./routes";

export {
  buildJettonExplorerUrl,
  buildTonscanAccountUrl,
  buildTonscanJettonUrl,
  buildTonviewerAccountUrl,
  shortenTonAddress,
  tokenContent,
  tokenDescriptor,
} from "./token";
