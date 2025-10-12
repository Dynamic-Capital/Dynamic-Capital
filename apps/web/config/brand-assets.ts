export const DYNAMIC_CAPITAL_ASSET_BASE_URL =
  "https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/";

const buildAssetUrl = (fileName: string): string =>
  `${DYNAMIC_CAPITAL_ASSET_BASE_URL}${fileName}`;

export const DC_MARK_URL = buildAssetUrl("DC-Mark.svg");
export const DC_ICON_MARK_URL = buildAssetUrl("icon-mark.svg");
export const DC_LOGO_MARK_URL = buildAssetUrl("logo-mark.svg");
export const DC_LOGO_WORDMARK_URL = buildAssetUrl("logo.svg");
export const DC_SOCIAL_PREVIEW_URL = buildAssetUrl("social-preview.svg");
export const DC_DYNAMIC_LOGO_URL = buildAssetUrl("dynamic-logo.svg");
