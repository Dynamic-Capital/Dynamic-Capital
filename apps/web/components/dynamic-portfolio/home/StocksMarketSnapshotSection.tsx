"use client";

import { StaticMarketSnapshotSection } from "./StaticMarketSnapshotSection";
import { STOCKS_SNAPSHOT_CONFIG } from "./marketSnapshotConfigs";

export function StocksMarketSnapshotSection() {
  return <StaticMarketSnapshotSection config={STOCKS_SNAPSHOT_CONFIG} />;
}

export default StocksMarketSnapshotSection;
