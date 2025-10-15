import { HeatmapTool } from "@/components/tools/HeatmapTool";
import type { SnapshotVariant } from "./MarketSnapshotPrimitives";

export function CurrencyStrengthSection({
  variant = "contained",
}: { variant?: SnapshotVariant } = {}) {
  return (
    <HeatmapTool
      id="currency-strength"
      assetClass="currencies"
      variant={variant}
    />
  );
}

export default CurrencyStrengthSection;
