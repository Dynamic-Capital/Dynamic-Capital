import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { TradeJournalWorkspace } from "@/components/tools/TradeJournalWorkspace";

export const metadata = {
  title: "Dynamic Trade Journal – Dynamic Capital",
  description:
    "Compile disciplined trade reviews with automated highlights, lessons, and coach prompts from your session telemetry.",
};

export default function TradeJournalToolPage() {
  return (
    <Column
      as="main"
      fillWidth
      gap="40"
      paddingY="40"
      align="center"
      horizontal="center"
      className="px-4 sm:px-6 lg:px-8"
    >
      <Column maxWidth={36} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Dynamic trade journal
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Feed in your session narrative, trade log, and risk telemetry to
          generate highlights, lessons, and next actions ready to share with the
          desk.
        </Text>
      </Column>
      <Column maxWidth={72} fillWidth className="w-full">
        <TradeJournalWorkspace />
      </Column>
    </Column>
  );
}
