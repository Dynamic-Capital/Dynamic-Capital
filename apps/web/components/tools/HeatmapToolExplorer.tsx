"use client";

import { useMemo, useState } from "react";

import {
  Column,
  Row,
  SegmentedControl,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

import { HeatmapTool } from "./HeatmapTool";
import { HEATMAP_CONFIGS, type HeatmapAssetClass } from "./heatmapConfigs";

const ASSET_CLASS_ORDER = [
  "commodities",
  "currencies",
  "indices",
  "crypto",
] as const satisfies readonly HeatmapAssetClass[];

const ASSET_CLASS_LABELS: Record<HeatmapAssetClass, string> = {
  commodities: "Commodities",
  currencies: "FX",
  indices: "Indices",
  crypto: "Crypto",
};

const isHeatmapAssetClass = (
  value: string,
): value is HeatmapAssetClass =>
  ASSET_CLASS_ORDER.includes(value as HeatmapAssetClass);

export function HeatmapToolExplorer() {
  const [selectedAssetClass, setSelectedAssetClass] = useState<
    HeatmapAssetClass
  >(
    ASSET_CLASS_ORDER[0],
  );

  const segmentedOptions = useMemo(
    () =>
      ASSET_CLASS_ORDER.map((assetClass) => ({
        label: ASSET_CLASS_LABELS[assetClass],
        value: assetClass,
      })),
    [],
  );

  const snapshotLabel = HEATMAP_CONFIGS[selectedAssetClass].snapshotLabel;

  return (
    <Column gap="24" fillWidth>
      <Column gap="8" align="start" fillWidth>
        <Text variant="label-default-s" onBackground="neutral-weak">
          Select an asset complex
        </Text>
        <SegmentedControl
          aria-label="Select asset class heatmap"
          buttons={segmentedOptions}
          fillWidth
          onToggle={(value) => {
            if (isHeatmapAssetClass(value)) {
              setSelectedAssetClass(value);
            }
          }}
          selected={selectedAssetClass}
        />
      </Column>

      <Row gap="12" vertical="center" wrap>
        <Tag background="brand-alpha-weak" size="s">
          {ASSET_CLASS_LABELS[selectedAssetClass]}
        </Tag>
        <Text variant="label-default-s" onBackground="neutral-medium">
          {snapshotLabel}
        </Text>
      </Row>

      <HeatmapTool key={selectedAssetClass} assetClass={selectedAssetClass} />
    </Column>
  );
}

export default HeatmapToolExplorer;
