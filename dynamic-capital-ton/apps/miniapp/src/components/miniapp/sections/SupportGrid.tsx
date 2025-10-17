"use client";

import { Button, Card, Column, Grid, Text } from "@once-ui-system/core";

export type SupportOption = {
  title: string;
  description: string;
  action: string;
};

export function SupportGrid({ options }: { options: SupportOption[] }) {
  return (
    <Column as="section" id="support" gap="l">
      <Column gap="s">
        <Text variant="code-strong-s" onBackground="brand-strong">
          Support
        </Text>
        <Text variant="heading-strong-l">Desk assistance within reach</Text>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Route questions to the right desk member, jump into documentation, or view status reports.
        </Text>
      </Column>
      <Grid columns="3" gap="m" m={{ columns: "1" }}>
        {options.map((option) => (
          <Card key={option.title} background="surface" border="neutral-alpha-medium" radius="l" padding="l">
            <Column gap="m">
              <Column gap="xs">
                <Text variant="heading-strong-m">{option.title}</Text>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {option.description}
                </Text>
              </Column>
              <Button variant="tertiary" arrowIcon>
                {option.action}
              </Button>
            </Column>
          </Card>
        ))}
      </Grid>
    </Column>
  );
}
