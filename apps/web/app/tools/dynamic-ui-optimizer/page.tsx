import DynamicUiOptimizer from "@/components/tools/DynamicUiOptimizer";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";

export default function DynamicUiOptimizerPage() {
  return (
    <ToolWorkspaceLayout routeId="dynamic-ui-optimizer">
      <DynamicUiOptimizer />
    </ToolWorkspaceLayout>
  );
}
