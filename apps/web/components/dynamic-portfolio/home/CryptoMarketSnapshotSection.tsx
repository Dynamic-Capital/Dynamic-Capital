"use client";

import { StaticMarketSnapshotSection } from "./StaticMarketSnapshotSection";
import { CRYPTO_SNAPSHOT_CONFIG } from "./marketSnapshotConfigs";

export function CryptoMarketSnapshotSection() {
  return <StaticMarketSnapshotSection config={CRYPTO_SNAPSHOT_CONFIG} />;
}

export default CryptoMarketSnapshotSection;
