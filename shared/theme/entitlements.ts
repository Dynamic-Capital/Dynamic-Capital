import type { ThemePassDefinition } from "./passes.ts";

export interface ThemeEntitlementSummary {
  id: string;
  label: string;
  description: string;
  priority: number;
  reasons: string[];
  metadata?: ThemePassDefinition["metadata"];
}

export interface ThemeEntitlementsPayload {
  ok: true;
  wallet: string;
  evaluatedAt: string;
  dctBalance: number;
  nftCollections: string[];
  themes: ThemeEntitlementSummary[];
}
