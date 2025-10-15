import { HeatmapTool } from "@/components/tools/HeatmapTool";
import type { SnapshotVariant } from "./MarketSnapshotPrimitives";

export function IndexStrengthSection({
  variant = "contained",
}: { variant?: SnapshotVariant } = {}) {
  return (
    <HeatmapTool
      id="index-strength"
      assetClass="indices"
      variant={variant}
    />
  );
}

export default IndexStrengthSection;
