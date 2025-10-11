"use client";

import type { ComponentProps, ComponentType, ReactNode } from "react";

import {
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

export interface DeskSectionHeaderTag {
  label: string;
  background?: ComponentProps<typeof Tag>["background"];
  prefixIcon?: ComponentProps<typeof Tag>["prefixIcon"];
  size?: ComponentProps<typeof Tag>["size"];
  suffixIcon?: ComponentProps<typeof Tag>["suffixIcon"];
}

export interface DeskSectionHeaderProps {
  title: ReactNode;
  titleVariant?: ComponentProps<typeof Heading>["variant"];
  description?: ReactNode;
  descriptionVariant?: ComponentProps<typeof Text>["variant"];
  descriptionTone?: ComponentProps<typeof Text>["onBackground"];
  helperText?: ReactNode;
  helperVariant?: ComponentProps<typeof Text>["variant"];
  helperTone?: ComponentProps<typeof Text>["onBackground"];
  tag?: DeskSectionHeaderTag;
  gap?: ComponentProps<typeof Column>["gap"];
  align?: ComponentProps<typeof Column>["align"];
  bodyGap?: ComponentProps<typeof Column>["gap"];
  maxWidth?: ComponentProps<typeof Column>["maxWidth"];
  className?: string;
}

export function DeskSectionHeader({
  title,
  titleVariant = "heading-strong-m",
  description,
  descriptionVariant = "body-default-m",
  descriptionTone = "neutral-weak",
  helperText,
  helperVariant = "label-default-m",
  helperTone = "neutral-medium",
  tag,
  gap = "12",
  align = "start",
  bodyGap = "12",
  maxWidth,
  className,
}: DeskSectionHeaderProps) {
  const hasBodyContent = description || helperText;

  return (
    <Column gap={gap} align={align} className={className}>
      <Row gap="12" vertical="center" wrap>
        <Heading variant={titleVariant}>{title}</Heading>
        {tag
          ? (
            <Tag
              size={tag.size ?? "s"}
              background={tag.background}
              prefixIcon={tag.prefixIcon}
              suffixIcon={tag.suffixIcon}
            >
              {tag.label}
            </Tag>
          )
          : null}
      </Row>
      {hasBodyContent
        ? (
          <Column gap={bodyGap} maxWidth={maxWidth} align="start">
            {description
              ? (
                <Text
                  variant={descriptionVariant}
                  onBackground={descriptionTone}
                >
                  {description}
                </Text>
              )
              : null}
            {helperText
              ? (
                <Text variant={helperVariant} onBackground={helperTone}>
                  {helperText}
                </Text>
              )
              : null}
          </Column>
        )
        : null}
    </Column>
  );
}

export type DeskSectionGridItem = {
  key: string;
  Component: ComponentType;
  flex?: ComponentProps<typeof Column>["flex"];
  minWidth?: ComponentProps<typeof Column>["minWidth"];
  className?: string;
  fillWidth?: boolean;
};

export function DeskSectionGrid({
  items,
  gap = "24",
  wrap = true,
  vertical = "stretch",
}: {
  items: DeskSectionGridItem[];
  gap?: ComponentProps<typeof Row>["gap"];
  wrap?: ComponentProps<typeof Row>["wrap"];
  vertical?: ComponentProps<typeof Row>["vertical"];
}) {
  return (
    <Row gap={gap} wrap={wrap} fillWidth vertical={vertical}>
      {items.map(({ key, Component, flex, minWidth, className, fillWidth }) => (
        <Column
          key={key}
          flex={flex}
          minWidth={minWidth}
          fillWidth={fillWidth ?? true}
          className={className}
        >
          <Component />
        </Column>
      ))}
    </Row>
  );
}

export default DeskSectionHeader;
