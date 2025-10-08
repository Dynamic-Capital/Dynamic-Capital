"use client";

import type { ReactNode } from "react";

import { AdminGate } from "@/components/admin/AdminGate";
import type { RouteId } from "@/config/route-registry";

import { ToolWorkspaceLayout } from "./ToolWorkspaceLayout";

interface AdminWorkspaceProps {
  routeId: RouteId;
  children: ReactNode;
  commandBar?: ReactNode;
  className?: string;
  contentClassName?: string;
  unauthorizedFallback?: ReactNode;
}

export function AdminWorkspace({
  routeId,
  children,
  commandBar,
  className,
  contentClassName,
  unauthorizedFallback,
}: AdminWorkspaceProps) {
  return (
    <ToolWorkspaceLayout
      routeId={routeId}
      commandBar={commandBar}
      className={className}
      contentClassName={contentClassName}
    >
      <AdminGate fallback={unauthorizedFallback}>{children}</AdminGate>
    </ToolWorkspaceLayout>
  );
}

export default AdminWorkspace;
