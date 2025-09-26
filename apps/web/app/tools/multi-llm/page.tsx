import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { MultiLlmStudio } from "@/components/tools/MultiLlmStudio";

export const metadata = {
  title: "Multi-LLM Studio – Dynamic Capital",
  description:
    "Compare OpenAI, Anthropic, and Groq responses side by side with Dynamic Capital's orchestration workspace.",
};

export default function MultiLlmToolPage() {
  return (
    <Column gap="32" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={36} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Multi-LLM studio
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Route prompts across configured providers to benchmark quality,
          latency, and token usage within a shared workspace.
        </Text>
      </Column>
      <Column maxWidth={64} fillWidth>
        <MultiLlmStudio />
      </Column>
    </Column>
  );
}
