export const FEATURE_FLAG_DEFAULTS = {
  payments_enabled: true,
  vip_sync_enabled: true,
  broadcasts_enabled: true,
  mini_app_enabled: true,
} as const satisfies Record<string, boolean>;

export type FeatureFlagName = keyof typeof FEATURE_FLAG_DEFAULTS;

export function getFeatureFlagDefault(
  name: string,
  fallback = false,
): boolean {
  if (Object.prototype.hasOwnProperty.call(FEATURE_FLAG_DEFAULTS, name)) {
    return FEATURE_FLAG_DEFAULTS[name as FeatureFlagName];
  }
  return fallback;
}
