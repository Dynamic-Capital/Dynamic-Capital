"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import {
  Button as DynamicButton,
  Card,
  Column,
  Heading,
  Icon as DynamicIcon,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import {
  type CommandBarItem,
  type CommandBarMeta,
  getCommandBarItems,
} from "@/config/route-registry";
import { cn } from "@/utils";

interface DynamicCommandBarProps {
  group?: CommandBarMeta["group"];
  className?: string;
}

const EMPHASIS_CARD_VARIANTS: Record<CommandBarItem["emphasis"], string> = {
  brand:
    "border-brand/40 bg-gradient-to-br from-brand/10 via-brand/5 to-background",
  accent:
    "border-accent/40 bg-gradient-to-br from-accent/10 via-accent/5 to-background",
  neutral:
    "border-border/50 bg-gradient-to-br from-muted/20 via-background to-background",
};

const CTA_VARIANTS: Record<
  CommandBarItem["emphasis"],
  "primary" | "secondary" | "tertiary"
> = {
  brand: "primary",
  accent: "secondary",
  neutral: "tertiary",
};

const DECORATIVE_ICON: Record<CommandBarItem["emphasis"], string> = {
  brand: "sparkle",
  accent: "computer",
  neutral: "world",
};

export function DynamicCommandBar({
  group = "dynamic-services",
  className,
}: DynamicCommandBarProps) {
  const items = useMemo(() => getCommandBarItems(group), [group]);

  if (items.length === 0) {
    return null;
  }

  return (
    <motion.div
      className={cn(
        "grid gap-4 rounded-3xl border border-border/40 bg-background/80 p-4 shadow-lg shadow-primary/5 backdrop-blur",
        "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {items.map((item) => {
        const IconComponent = item.icon;
        const emphasisClass = EMPHASIS_CARD_VARIANTS[item.emphasis];
        const tagList = item.tags.slice(0, 3);
        const ctaVariant = CTA_VARIANTS[item.emphasis];
        const decorativeIcon = DECORATIVE_ICON[item.emphasis];

        return (
          <motion.div key={item.id} whileHover={{ y: -4 }} className="h-full">
            <Card
              padding="16"
              radius="xl"
              gap="16"
              className={cn(
                "h-full overflow-hidden border bg-background/70 shadow-md shadow-primary/10 transition-all",
                emphasisClass,
                "hover:shadow-xl hover:shadow-primary/20",
              )}
            >
              <Column gap="12" fillHeight>
                <Row
                  gap="12"
                  vertical="center"
                  wrap
                  className="w-full justify-between"
                >
                  <Row gap="8" vertical="center" wrap>
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground">
                      <DynamicIcon
                        name={decorativeIcon}
                        size="s"
                        decorative
                        className="text-brand"
                      />
                      {IconComponent
                        ? (
                          <IconComponent
                            className="absolute inset-0 m-auto h-4 w-4 text-foreground/80"
                            aria-hidden
                          />
                        )
                        : null}
                    </span>
                    <Column gap="4">
                      <Heading variant="heading-strong-xs">
                        {item.label}
                      </Heading>
                      <Text
                        variant="body-default-xs"
                        onBackground="neutral-weak"
                      >
                        {item.hint.title}
                      </Text>
                    </Column>
                  </Row>
                  <DynamicButton
                    size="s"
                    variant={ctaVariant}
                    href={item.href}
                    suffixIcon="arrowUpRight"
                  >
                    Open
                  </DynamicButton>
                </Row>
                <Text
                  variant="body-default-xs"
                  onBackground="neutral-weak"
                  className="flex-1"
                >
                  {item.description}
                </Text>
                <Row gap="8" wrap>
                  {tagList.map((tag) => (
                    <Tag
                      key={tag}
                      size="s"
                      background="neutral-alpha-weak"
                      border="neutral-alpha-medium"
                    >
                      {tag}
                    </Tag>
                  ))}
                </Row>
              </Column>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default DynamicCommandBar;
