import { HeatmapTool } from "@/components/tools/HeatmapTool";
import type { SnapshotVariant } from "./MarketSnapshotPrimitives";

export function CommodityStrengthSection({
  variant = "contained",
}: { variant?: SnapshotVariant } = {}) {
  return (
    <HeatmapTool
      id="commodity-strength"
      assetClass="commodities"
      variant={variant}
    />
  );
}

export default CommodityStrengthSection;
