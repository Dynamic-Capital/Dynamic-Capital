import { Column } from "@/components/dynamic-ui-system";

import { DynamicCliWorkbench } from "@/components/tools/DynamicCliWorkbench";
import { AdminWorkspace } from "@/components/workspaces/AdminWorkspace";

export default function DynamicCliPage() {
  return (
    <AdminWorkspace routeId="dynamic-cli">
      <Column fillWidth>
        <DynamicCliWorkbench />
      </Column>
    </AdminWorkspace>
  );
}
