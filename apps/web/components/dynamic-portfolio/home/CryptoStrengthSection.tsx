import { HeatmapTool } from "@/components/tools/HeatmapTool";
import type { SnapshotVariant } from "./MarketSnapshotPrimitives";

export function CryptoStrengthSection({
  variant = "contained",
}: { variant?: SnapshotVariant } = {}) {
  return (
    <HeatmapTool
      id="crypto-strength"
      assetClass="crypto"
      variant={variant}
    />
  );
}

export default CryptoStrengthSection;
