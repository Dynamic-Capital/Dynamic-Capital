"use client";

import { StaticMarketSnapshotSection } from "./StaticMarketSnapshotSection";
import { INDICES_SNAPSHOT_CONFIG } from "./marketSnapshotConfigs";

export function IndicesMarketSnapshotSection() {
  return <StaticMarketSnapshotSection config={INDICES_SNAPSHOT_CONFIG} />;
}

export default IndicesMarketSnapshotSection;
