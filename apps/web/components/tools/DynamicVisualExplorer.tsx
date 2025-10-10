"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Card,
  type Colors,
  Column,
  Heading,
  Line,
  Row,
  SegmentedControl,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { DeskSection } from "@/components/workspaces/DeskSection";

const CANVAS_BASE_SIZE = { width: 720, height: 360 } as const;

const FLOW_COLORS = [
  {
    from: [56, 189, 248] as const,
    to: [59, 130, 246] as const,
  },
  {
    from: [45, 212, 191] as const,
    to: [34, 197, 94] as const,
  },
  {
    from: [192, 132, 252] as const,
    to: [147, 51, 234] as const,
  },
  {
    from: [251, 191, 36] as const,
    to: [249, 115, 22] as const,
  },
  {
    from: [129, 140, 248] as const,
    to: [14, 165, 233] as const,
  },
];

type RgbTuple = readonly [number, number, number];

type VisualNodeTone = "signal" | "control" | "delivery";

type VisualNode = {
  id: string;
  label: string;
  caption: string;
  tone: VisualNodeTone;
  x: number;
  y: number;
  emphasis?: number;
};

type VisualFlow = {
  id: string;
  from: VisualNode["id"];
  to: VisualNode["id"];
  weight: number;
  velocity: number;
  curvature?: number;
};

type VisualMetric = {
  id: string;
  label: string;
  value: string;
  change: number;
  changeUnit: string;
  sentiment: "improving" | "stable" | "watch";
  caption: string;
};

type VisualScenario = {
  id: string;
  label: string;
  title: string;
  description: string;
  nodes: VisualNode[];
  flows: VisualFlow[];
  metrics: VisualMetric[];
};

const NODE_TONE_COLORS: Record<VisualNodeTone, RgbTuple> = {
  signal: [56, 189, 248],
  control: [192, 132, 252],
  delivery: [45, 212, 191],
};

const NODE_TAG_VARIANTS: Record<VisualNodeTone, Colors> = {
  signal: "brand-alpha-medium",
  control: "accent-alpha-medium",
  delivery: "success-alpha-medium",
};

const METRIC_SENTIMENT_VARIANTS: Record<
  VisualMetric["sentiment"],
  { background: Colors; label: string }
> = {
  improving: { background: "success-alpha-weak", label: "Improving" },
  stable: { background: "info-alpha-weak", label: "Stabilized" },
  watch: { background: "warning-alpha-weak", label: "Watch" },
};

const SCENARIOS: VisualScenario[] = [
  {
    id: "hedging",
    label: "Adaptive hedging mesh",
    title: "Adaptive hedging mesh",
    description:
      "Follow how signal ingestion flows through routing policies, risk sentries, and hedge inventory before execution touches the market.",
    nodes: [
      {
        id: "alpha",
        label: "Alpha desk",
        caption: "Signal ingestion",
        tone: "signal",
        x: 0.12,
        y: 0.56,
        emphasis: 0.45,
      },
      {
        id: "router",
        label: "Routing layer",
        caption: "Policy engine",
        tone: "control",
        x: 0.32,
        y: 0.34,
        emphasis: 0.8,
      },
      {
        id: "hedge",
        label: "Hedge lattice",
        caption: "Inventory buffers",
        tone: "delivery",
        x: 0.58,
        y: 0.26,
        emphasis: 0.9,
      },
      {
        id: "risk",
        label: "Risk sentry",
        caption: "Guardrails",
        tone: "control",
        x: 0.60,
        y: 0.64,
        emphasis: 0.7,
      },
      {
        id: "ops",
        label: "Execution ops",
        caption: "Venue routing",
        tone: "delivery",
        x: 0.86,
        y: 0.46,
        emphasis: 0.55,
      },
    ],
    flows: [
      {
        id: "alpha-router",
        from: "alpha",
        to: "router",
        weight: 0.75,
        velocity: 0.42,
        curvature: 0.18,
      },
      {
        id: "router-hedge",
        from: "router",
        to: "hedge",
        weight: 0.82,
        velocity: 0.56,
        curvature: 0.1,
      },
      {
        id: "router-risk",
        from: "router",
        to: "risk",
        weight: 0.54,
        velocity: 0.48,
        curvature: -0.2,
      },
      {
        id: "risk-hedge",
        from: "risk",
        to: "hedge",
        weight: 0.4,
        velocity: 0.32,
        curvature: 0.14,
      },
      {
        id: "hedge-ops",
        from: "hedge",
        to: "ops",
        weight: 0.68,
        velocity: 0.58,
        curvature: 0.06,
      },
      {
        id: "risk-ops",
        from: "risk",
        to: "ops",
        weight: 0.36,
        velocity: 0.35,
        curvature: -0.1,
      },
    ],
    metrics: [
      {
        id: "latency",
        label: "Routing latency",
        value: "182 ms",
        change: -18,
        changeUnit: " ms",
        sentiment: "improving",
        caption: "Median policy resolution vs 30d baseline",
      },
      {
        id: "coverage",
        label: "Hedge coverage",
        value: "96.4%",
        change: 3.1,
        changeUnit: "%",
        sentiment: "stable",
        caption: "Inventory protection across correlated pairs",
      },
      {
        id: "breach",
        label: "Guardrail breaches",
        value: "2",
        change: -1,
        changeUnit: "",
        sentiment: "watch",
        caption: "Interventions triggered in the last session",
      },
    ],
  },
  {
    id: "alignment",
    label: "Signal alignment loop",
    title: "Signal alignment feedback loop",
    description:
      "Visualize the calibration feedback loop that keeps model ensembles, QA, and operator overrides aligned with live market structure.",
    nodes: [
      {
        id: "research",
        label: "Research intake",
        caption: "Desk notes",
        tone: "signal",
        x: 0.1,
        y: 0.38,
        emphasis: 0.4,
      },
      {
        id: "blend",
        label: "Model blend",
        caption: "Ensemble sync",
        tone: "control",
        x: 0.3,
        y: 0.2,
        emphasis: 0.72,
      },
      {
        id: "qa",
        label: "QA harness",
        caption: "Regression deck",
        tone: "control",
        x: 0.52,
        y: 0.42,
        emphasis: 0.62,
      },
      {
        id: "operators",
        label: "Operator overrides",
        caption: "Desk reviews",
        tone: "delivery",
        x: 0.72,
        y: 0.65,
        emphasis: 0.52,
      },
      {
        id: "release",
        label: "Strategy release",
        caption: "Production",
        tone: "delivery",
        x: 0.9,
        y: 0.36,
        emphasis: 0.66,
      },
    ],
    flows: [
      {
        id: "research-blend",
        from: "research",
        to: "blend",
        weight: 0.58,
        velocity: 0.4,
        curvature: -0.12,
      },
      {
        id: "blend-qa",
        from: "blend",
        to: "qa",
        weight: 0.76,
        velocity: 0.55,
        curvature: 0.16,
      },
      {
        id: "qa-operators",
        from: "qa",
        to: "operators",
        weight: 0.61,
        velocity: 0.5,
        curvature: 0.2,
      },
      {
        id: "operators-release",
        from: "operators",
        to: "release",
        weight: 0.64,
        velocity: 0.48,
        curvature: -0.1,
      },
      {
        id: "release-feedback",
        from: "release",
        to: "blend",
        weight: 0.46,
        velocity: 0.37,
        curvature: 0.24,
      },
      {
        id: "operators-feedback",
        from: "operators",
        to: "research",
        weight: 0.32,
        velocity: 0.3,
        curvature: -0.22,
      },
    ],
    metrics: [
      {
        id: "alignment",
        label: "Alignment score",
        value: "92.7",
        change: 4.2,
        changeUnit: " pts",
        sentiment: "improving",
        caption: "Agreement across ensemble checkpoints",
      },
      {
        id: "qa",
        label: "QA coverage",
        value: "148 cases",
        change: 26,
        changeUnit: "",
        sentiment: "stable",
        caption: "Regression deck executed this week",
      },
      {
        id: "override",
        label: "Operator overrides",
        value: "3",
        change: -2,
        changeUnit: "",
        sentiment: "watch",
        caption: "Manual adjustments in the last 5 sessions",
      },
    ],
  },
  {
    id: "liquidity",
    label: "Liquidity relay",
    title: "Cross-venue liquidity relay",
    description:
      "Inspect how liquidity adapters fan out to venues, stream depth, and recycle flow back into balance sheets without losing latency headroom.",
    nodes: [
      {
        id: "router",
        label: "Smart router",
        caption: "Venue weights",
        tone: "control",
        x: 0.18,
        y: 0.32,
        emphasis: 0.66,
      },
      {
        id: "fx",
        label: "FX venues",
        caption: "Bank rails",
        tone: "delivery",
        x: 0.42,
        y: 0.22,
        emphasis: 0.58,
      },
      {
        id: "crypto",
        label: "Crypto venues",
        caption: "OTC pipes",
        tone: "delivery",
        x: 0.42,
        y: 0.62,
        emphasis: 0.64,
      },
      {
        id: "monitor",
        label: "Depth monitor",
        caption: "Order book telemetry",
        tone: "control",
        x: 0.64,
        y: 0.44,
        emphasis: 0.72,
      },
      {
        id: "treasury",
        label: "Treasury loop",
        caption: "Balance sync",
        tone: "signal",
        x: 0.86,
        y: 0.48,
        emphasis: 0.6,
      },
    ],
    flows: [
      {
        id: "router-fx",
        from: "router",
        to: "fx",
        weight: 0.78,
        velocity: 0.52,
        curvature: 0.12,
      },
      {
        id: "router-crypto",
        from: "router",
        to: "crypto",
        weight: 0.64,
        velocity: 0.48,
        curvature: -0.18,
      },
      {
        id: "fx-monitor",
        from: "fx",
        to: "monitor",
        weight: 0.59,
        velocity: 0.55,
        curvature: 0.16,
      },
      {
        id: "crypto-monitor",
        from: "crypto",
        to: "monitor",
        weight: 0.62,
        velocity: 0.5,
        curvature: -0.16,
      },
      {
        id: "monitor-treasury",
        from: "monitor",
        to: "treasury",
        weight: 0.7,
        velocity: 0.58,
        curvature: 0.08,
      },
      {
        id: "treasury-router",
        from: "treasury",
        to: "router",
        weight: 0.46,
        velocity: 0.34,
        curvature: -0.22,
      },
    ],
    metrics: [
      {
        id: "latency",
        label: "Venue latency",
        value: "142 ms",
        change: -11,
        changeUnit: " ms",
        sentiment: "improving",
        caption: "p95 round-trip across active venues",
      },
      {
        id: "depth",
        label: "Depth stability",
        value: "88%",
        change: 5.6,
        changeUnit: "%",
        sentiment: "stable",
        caption: "Top-of-book resilience vs prior session",
      },
      {
        id: "recycle",
        label: "Flow recycled",
        value: "63%",
        change: 7.4,
        changeUnit: "%",
        sentiment: "watch",
        caption: "Liquidity fed back into treasury buffers",
      },
    ],
  },
];

const toRgba = (color: RgbTuple, alpha: number) =>
  `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

type Dimensions = { width: number; height: number };

type PositionedNode = VisualNode & { x: number; y: number };

type Point = { x: number; y: number };

const getControlPoint = (from: Point, to: Point, curvature = 0) => {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const normalX = (-dy / length) * curvature * length;
  const normalY = (dx / length) * curvature * length;

  return {
    x: midX + normalX,
    y: midY + normalY,
  } satisfies Point;
};

const getQuadraticPoint = (
  from: Point,
  control: Point,
  to: Point,
  t: number,
) => {
  const oneMinusT = 1 - t;
  const x = oneMinusT * oneMinusT * from.x + 2 * oneMinusT * t * control.x +
    t * t * to.x;
  const y = oneMinusT * oneMinusT * from.y + 2 * oneMinusT * t * control.y +
    t * t * to.y;

  return { x, y } satisfies Point;
};

const drawScene = (
  ctx: CanvasRenderingContext2D,
  scenario: VisualScenario,
  dimensions: Dimensions,
  time: number,
) => {
  const { width, height } = dimensions;
  const nodes: PositionedNode[] = scenario.nodes.map((node) => ({
    ...node,
    x: node.x * width,
    y: node.y * height,
  }));
  const nodeMap = new Map(nodes.map((node) => [node.id, node] as const));

  // Background gradient layer
  const backgroundGradient = ctx.createLinearGradient(0, 0, width, height);
  backgroundGradient.addColorStop(0, "rgba(15, 23, 42, 0.92)");
  backgroundGradient.addColorStop(0.5, "rgba(7, 43, 77, 0.9)");
  backgroundGradient.addColorStop(1, "rgba(12, 74, 110, 0.88)");

  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, width, height);

  // Subtle animated grid to imply motion
  const gridSpacing = 72;
  const gridShift = (time * 12) % gridSpacing;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
  ctx.setLineDash([gridSpacing / 2, gridSpacing]);

  for (let x = -gridSpacing; x < width + gridSpacing; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x + gridShift, 0);
    ctx.lineTo(x + gridShift, height);
    ctx.stroke();
  }

  for (let y = -gridSpacing; y < height + gridSpacing; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y + gridShift);
    ctx.lineTo(width, y + gridShift);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // Draw flows with glow and motion
  scenario.flows.forEach((flow, index) => {
    const from = nodeMap.get(flow.from);
    const to = nodeMap.get(flow.to);

    if (!from || !to) {
      return;
    }

    const palette = FLOW_COLORS[index % FLOW_COLORS.length];
    const control = getControlPoint(from, to, flow.curvature ?? 0);

    const strength = 1.2 + flow.weight * 4.8;
    const glowGradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    glowGradient.addColorStop(0, toRgba(palette.from, 0.18));
    glowGradient.addColorStop(1, toRgba(palette.to, 0.05));

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    ctx.lineWidth = strength + 6;
    ctx.strokeStyle = glowGradient;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
    ctx.stroke();

    const lineGradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    lineGradient.addColorStop(0, toRgba(palette.from, 0.6));
    lineGradient.addColorStop(1, toRgba(palette.to, 0.5));

    ctx.lineWidth = strength;
    ctx.setLineDash([14, 18]);
    ctx.lineDashOffset = -((time * 90 * flow.velocity) % 32);
    ctx.strokeStyle = lineGradient;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const particleCount = 2;
    for (let i = 0; i < particleCount; i += 1) {
      const offset = (i / particleCount) * 0.5;
      const progress = (time * flow.velocity + flow.weight * 0.35 + offset) % 1;
      const pulsePoint = getQuadraticPoint(from, control, to, progress);
      const pulseRadius = 2.2 + flow.weight * 3.6;
      const pulseGradient = ctx.createRadialGradient(
        pulsePoint.x,
        pulsePoint.y,
        0,
        pulsePoint.x,
        pulsePoint.y,
        pulseRadius * 3,
      );

      pulseGradient.addColorStop(0, toRgba(palette.from, 0.9));
      pulseGradient.addColorStop(0.5, toRgba(palette.to, 0.35));
      pulseGradient.addColorStop(1, toRgba(palette.to, 0));

      ctx.fillStyle = pulseGradient;
      ctx.beginPath();
      ctx.arc(pulsePoint.x, pulsePoint.y, pulseRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });

  // Draw nodes with breathing glow
  nodes.forEach((node, index) => {
    const toneColor = NODE_TONE_COLORS[node.tone];
    const baseRadius = 10 + (node.emphasis ?? 0) * 12;
    const breathing = Math.sin(time * 2 + index) * 0.5 + 0.5;
    const radius = baseRadius + breathing * 2.4;

    const glowGradient = ctx.createRadialGradient(
      node.x,
      node.y,
      radius * 0.4,
      node.x,
      node.y,
      radius * 2.6,
    );
    glowGradient.addColorStop(0, toRgba(toneColor, 0.55));
    glowGradient.addColorStop(1, toRgba(toneColor, 0));

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const nodeGradient = ctx.createRadialGradient(
      node.x,
      node.y,
      radius * 0.2,
      node.x,
      node.y,
      radius,
    );
    nodeGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    nodeGradient.addColorStop(0.65, toRgba(toneColor, 0.85));
    nodeGradient.addColorStop(1, toRgba(toneColor, 0.65));

    ctx.fillStyle = nodeGradient;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = toRgba(toneColor, 0.65);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  });
};

export function DynamicVisualExplorer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [dimensions, setDimensions] = useState<Dimensions>({
    width: CANVAS_BASE_SIZE.width,
    height: CANVAS_BASE_SIZE.height,
  });
  const [pixelRatio, setPixelRatio] = useState(() =>
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    SCENARIOS[0]?.id ?? "",
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePixelRatioChange = () => {
      setPixelRatio(window.devicePixelRatio || 1);
    };

    window.addEventListener("resize", handlePixelRatioChange);

    return () => {
      window.removeEventListener("resize", handlePixelRatioChange);
    };
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateSize = () => {
      const width = container.clientWidth || CANVAS_BASE_SIZE.width;
      const aspect = CANVAS_BASE_SIZE.height / CANVAS_BASE_SIZE.width;
      const height = Math.max(260, width * aspect);
      setDimensions({ width, height });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const scenario = useMemo(() => {
    return (
      SCENARIOS.find((item) => item.id === selectedScenarioId) ?? SCENARIOS[0]
    );
  }, [selectedScenarioId]);

  const positionedNodes = useMemo(() => {
    return scenario.nodes.map((node) => ({
      ...node,
      x: node.x * dimensions.width,
      y: node.y * dimensions.height,
    }));
  }, [scenario, dimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = pixelRatio;
    canvas.width = Math.floor(dimensions.width * dpr);
    canvas.height = Math.floor(dimensions.height * dpr);
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    let animationFrame = 0;

    const render = (timestamp: number) => {
      const time = timestamp / 1000;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.scale(dpr, dpr);
      drawScene(ctx, scenario, dimensions, time);
      ctx.restore();

      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [scenario, dimensions, pixelRatio]);

  return (
    <Column gap="32" fillWidth>
      <DeskSection
        anchor="visual"
        background="surface"
        border="neutral-alpha-medium"
        shadow="l"
        width="wide"
      >
        <Column gap="16">
          <Column gap="8">
            <Text variant="label-default-s" onBackground="neutral-weak">
              Choose a desk system
            </Text>
            <SegmentedControl
              buttons={SCENARIOS.map((item) => ({
                label: item.label,
                value: item.id,
              }))}
              onToggle={(value) => setSelectedScenarioId(value)}
              selected={scenario.id}
              aria-label="Select visualization scenario"
            />
          </Column>

          <Card
            direction="column"
            gap="16"
            padding="24"
            radius="l"
            background="surface"
            border="neutral-alpha-weak"
            shadow="m"
            className="relative overflow-hidden"
          >
            <Column gap="12" align="start">
              <Tag background="brand-alpha-weak" size="s">
                {scenario.title}
              </Tag>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {scenario.description}
              </Text>
            </Column>

            <div
              ref={containerRef}
              className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-slate-900/40"
            >
              <canvas
                ref={canvasRef}
                className="h-full w-full"
                role="img"
                aria-label={scenario.title}
              />
              <div className="pointer-events-none absolute inset-0">
                {positionedNodes.map((node) => (
                  <div
                    key={node.id}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  >
                    <Tag
                      background={NODE_TAG_VARIANTS[node.tone]}
                      size="s"
                      className="backdrop-blur"
                    >
                      {node.label}
                    </Tag>
                    <Text
                      variant="body-default-xs"
                      onBackground="neutral-weak"
                      align="center"
                      className="max-w-[160px] text-slate-200/70"
                    >
                      {node.caption}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Column>
      </DeskSection>

      <DeskSection
        anchor="telemetry"
        background="surface"
        border="neutral-alpha-medium"
        width="wide"
      >
        <Column gap="20" fillWidth>
          <Heading variant="heading-strong-m">Desk telemetry</Heading>
          <Row gap="16" wrap fillWidth>
            {scenario.metrics.map((metric) => {
              const sentiment = METRIC_SENTIMENT_VARIANTS[metric.sentiment];
              const formattedChange = `${
                metric.change >= 0 ? "+" : ""
              }${metric.change}${metric.changeUnit}`;

              return (
                <Card
                  key={metric.id}
                  direction="column"
                  gap="8"
                  padding="20"
                  radius="m"
                  background="surface"
                  border="neutral-alpha-medium"
                  className="min-w-[220px] flex-1"
                >
                  <Row gap="8" vertical="center">
                    <Text
                      variant="label-default-s"
                      onBackground="neutral-medium"
                    >
                      {metric.label}
                    </Text>
                    <Tag background={sentiment.background} size="s">
                      {sentiment.label}
                    </Tag>
                  </Row>
                  <Heading variant="display-strong-s">{metric.value}</Heading>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    {formattedChange}
                  </Text>
                  <Line background="neutral-alpha-weak" />
                  <Text
                    variant="body-default-xs"
                    onBackground="neutral-weak"
                    className="max-w-[220px]"
                  >
                    {metric.caption}
                  </Text>
                </Card>
              );
            })}
          </Row>
        </Column>
      </DeskSection>
    </Column>
  );
}

export default DynamicVisualExplorer;
