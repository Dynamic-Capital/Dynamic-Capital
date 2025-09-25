"use client";

import { useId, useMemo } from "react";
import { motion } from "framer-motion";

import {
  Column,
  Heading,
  Icon,
  Line,
  Row,
  Tag,
  Text,
} from "@once-ui-system/core";

import { CountUp } from "@/components/ui/enhanced-typography";

const PERFORMANCE_SERIES = [
  {
    label: "Week 1",
    value: 12,
    focus: "Orientation drills",
    insight: "Quick wins from guided checklists build momentum and vocabulary.",
  },
  {
    label: "Week 2",
    value: 28,
    focus: "Playbook applied",
    insight: "Members submit their first automation recipe with mentor review.",
  },
  {
    label: "Week 3",
    value: 44,
    focus: "Journaling cadence",
    insight:
      "Structured recaps tighten execution and highlight repeatable edges.",
  },
  {
    label: "Week 4",
    value: 63,
    focus: "Risk alignment",
    insight: "Capital is scaled methodically once readiness score clears 60.",
  },
  {
    label: "Week 5",
    value: 78,
    focus: "Automation unlocked",
    insight: "Live alerts layer on as traders demonstrate consistency.",
  },
];

const PROGRESSION_STATS = [
  {
    label: "Playbook completions",
    value: 1482,
    suffix: "+",
    description:
      "members who finished the first readiness sprint in the last 90 days.",
    icon: "check" as const,
  },
  {
    label: "Confidence uplift",
    value: 27,
    suffix: "%",
    description:
      "average increase in simulated win rate after following the journaling cadence.",
    icon: "rocket" as const,
  },
  {
    label: "Automation recipes",
    value: 64,
    suffix: "+",
    description:
      "mentor-authored flows uploaded this month for members to remix.",
    icon: "book" as const,
  },
];

const LEARNING_PILLARS = [
  {
    title: "Visual frameworks",
    description:
      "Heat maps, flow charts, and annotated trade plans translate complex ideas into repeatable playbooks.",
    icon: "grid" as const,
  },
  {
    title: "Mentor commentary",
    description:
      "Every module ships with context from live desk operators so you understand why a tactic matters right now.",
    icon: "sparkles" as const,
  },
  {
    title: "Practice to production",
    description:
      "Simulated reps automatically sync into your live checklist once your readiness score clears the threshold.",
    icon: "repeat" as const,
  },
];

const CHART_DIMENSIONS = {
  width: 640,
  height: 280,
  marginX: 36,
  marginY: 28,
};

type ChartGeometry = {
  linePath: string;
  areaPath: string;
  points: Array<
    { x: number; y: number; label: string; focus: string; insight: string }
  >;
};

const buildChartGeometry = (): ChartGeometry => {
  const { width, height, marginX, marginY } = CHART_DIMENSIONS;
  const usableWidth = width - marginX * 2;
  const usableHeight = height - marginY * 2;
  const values = PERFORMANCE_SERIES.map((point) => point.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values, 0);
  const valueRange = Math.max(maxValue - minValue, 1);

  const scaleX = (index: number) =>
    marginX +
    (usableWidth / Math.max(PERFORMANCE_SERIES.length - 1, 1)) * index;
  const scaleY = (value: number) =>
    height - marginY - ((value - minValue) / valueRange) * usableHeight;

  let linePath = "";
  const points: ChartGeometry["points"] = [];

  PERFORMANCE_SERIES.forEach((point, index) => {
    const x = scaleX(index);
    const y = scaleY(point.value);
    points.push({
      x,
      y,
      label: point.label,
      focus: point.focus,
      insight: point.insight,
    });
    linePath += `${index === 0 ? "M" : "L"}${x} ${y}`;
  });

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  const areaPath = `${linePath} L ${lastPoint.x} ${
    height - marginY
  } L ${firstPoint.x} ${height - marginY} Z`;

  return { linePath, areaPath, points };
};

export function PerformanceInsightsSection() {
  const gradientId = useId();
  const maskId = useId();

  const { linePath, areaPath, points } = useMemo(buildChartGeometry, []);

  return (
    <Column
      id="learning-progress"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Row s={{ direction: "column" }} gap="32">
        <Column flex={3} gap="24">
          <Column gap="12" maxWidth={32}>
            <Heading variant="display-strong-xs">
              Learning curve with real traction
            </Heading>
            <Text variant="body-default-l" onBackground="neutral-weak">
              Watch how members layer knowledge and unlock automation over their
              first five weeks. Every milestone is paired with guided drills and
              mentor reviews so you know exactly what to do next.
            </Text>
          </Column>
          <Column
            background="page"
            border="neutral-alpha-weak"
            radius="l"
            padding="l"
            gap="20"
          >
            <svg
              role="img"
              aria-label="Member readiness score progression over the first five weeks"
              viewBox={`0 0 ${CHART_DIMENSIONS.width} ${CHART_DIMENSIONS.height}`}
              className="w-full"
            >
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="rgba(80, 113, 204, 0.45)" />
                  <stop offset="70%" stopColor="rgba(18, 24, 63, 0.2)" />
                  <stop offset="100%" stopColor="rgba(18, 24, 63, 0)" />
                </linearGradient>
                <radialGradient id={maskId} cx="50%" cy="50%" r="65%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
              </defs>

              <motion.path
                d={areaPath}
                fill={`url(#${gradientId})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.2 }}
              />
              <motion.path
                d={linePath}
                fill="none"
                stroke="rgba(178, 212, 255, 0.9)"
                strokeWidth={3}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />

              {points.map((point, index) => (
                <motion.g
                  key={point.label}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.3 + index * 0.1,
                    type: "spring",
                    stiffness: 320,
                    damping: 18,
                  }}
                >
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={7}
                    fill="rgba(80, 113, 204, 1)"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={11}
                    fill="none"
                    stroke="rgba(178, 212, 255, 0.45)"
                    strokeWidth={2}
                  />
                </motion.g>
              ))}

              <rect
                x={CHART_DIMENSIONS.marginX}
                y={CHART_DIMENSIONS.marginY}
                width={CHART_DIMENSIONS.width - CHART_DIMENSIONS.marginX * 2}
                height={CHART_DIMENSIONS.height - CHART_DIMENSIONS.marginY * 2}
                fill={`url(#${maskId})`}
              />

              {points.map((point) => (
                <text
                  key={`${point.label}-label`}
                  x={point.x}
                  y={CHART_DIMENSIONS.height - CHART_DIMENSIONS.marginY / 2}
                  textAnchor="middle"
                  fontSize={14}
                  fill="rgba(255,255,255,0.72)"
                >
                  {point.label}
                </text>
              ))}
            </svg>
            <Row gap="12" wrap>
              {points.map((point) => (
                <Column key={point.label} flex={1} minWidth={18} gap="8">
                  <Tag
                    size="s"
                    background="brand-alpha-weak"
                    prefixIcon="sparkles"
                  >
                    {point.focus}
                  </Tag>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {point.insight}
                  </Text>
                </Column>
              ))}
            </Row>
          </Column>
        </Column>
        <Column
          flex={2}
          gap="24"
          background="page"
          border="neutral-alpha-weak"
          radius="l"
          padding="l"
        >
          <Column gap="16">
            <Heading variant="heading-strong-m">
              Education that compounds
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Interactive frameworks and live mentor cues keep you from
              guessing. Each resource is purpose-built to move you from theory
              into confident execution.
            </Text>
          </Column>
          <Column gap="20">
            {PROGRESSION_STATS.map((stat) => (
              <Column
                key={stat.label}
                background="surface"
                border="neutral-alpha-weak"
                radius="l"
                padding="m"
                gap="12"
              >
                <Row horizontal="between" vertical="center">
                  <Row gap="8" vertical="center">
                    <Icon name={stat.icon} onBackground="brand-medium" />
                    <Text
                      variant="label-default-s"
                      onBackground="neutral-medium"
                    >
                      {stat.label}
                    </Text>
                  </Row>
                  <CountUp
                    end={stat.value}
                    suffix={stat.suffix}
                    className="text-[1.75rem] font-black text-white"
                  />
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {stat.description}
                </Text>
              </Column>
            ))}
          </Column>
          <Line background="neutral-alpha-weak" />
          <Column gap="16">
            {LEARNING_PILLARS.map((pillar) => (
              <Row key={pillar.title} gap="12" vertical="start">
                <Icon name={pillar.icon} onBackground="brand-medium" />
                <Column gap="4">
                  <Text variant="heading-strong-xs">{pillar.title}</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {pillar.description}
                  </Text>
                </Column>
              </Row>
            ))}
          </Column>
        </Column>
      </Row>
    </Column>
  );
}

export default PerformanceInsightsSection;
