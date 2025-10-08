import { Column } from "@/components/dynamic-ui-system";

import { DynamicChat } from "@/components/tools/DynamicChat";
import { AdminWorkspace } from "@/components/workspaces/AdminWorkspace";

export const metadata = {
  title: "Dynamic Chat – Dynamic Capital",
  description:
    "Compare Dynamic AGI alongside OpenAI, Anthropic, and Groq responses inside Dynamic Capital's orchestration workspace.",
};

export default function DynamicChatToolPage() {
  return (
    <AdminWorkspace routeId="multi-llm">
      <Column maxWidth={64} fillWidth>
        <DynamicChat />
      </Column>
    </AdminWorkspace>
  );
}
