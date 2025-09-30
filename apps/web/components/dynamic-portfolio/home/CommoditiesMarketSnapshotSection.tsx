"use client";

import { StaticMarketSnapshotSection } from "./StaticMarketSnapshotSection";
import { COMMODITIES_SNAPSHOT_CONFIG } from "./marketSnapshotConfigs";

export function CommoditiesMarketSnapshotSection() {
  return <StaticMarketSnapshotSection config={COMMODITIES_SNAPSHOT_CONFIG} />;
}

export default CommoditiesMarketSnapshotSection;
