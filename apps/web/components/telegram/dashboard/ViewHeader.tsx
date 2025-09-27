import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ViewHeaderProps {
  title: string;
  description: string;
  onBack: () => void;
  actions?: ReactNode;
}

export function ViewHeader(
  { title, description, onBack, actions }: ViewHeaderProps,
) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-3xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2 self-start md:self-auto">
        {actions}
        <Button variant="outline" onClick={onBack}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
