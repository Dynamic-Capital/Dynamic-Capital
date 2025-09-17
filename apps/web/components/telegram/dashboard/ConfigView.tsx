import { ViewHeader } from "./ViewHeader";

interface ConfigViewProps {
  onBack: () => void;
}

export function ConfigView({ onBack }: ConfigViewProps) {
  return (
    <div className="space-y-6">
      <ViewHeader
        title="Bot Configuration"
        description="Configure your bot settings and behavior"
        onBack={onBack}
      />
      <div className="text-center p-8">
        <p className="text-muted-foreground">
          Bot settings configuration will be available here.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Please use the Admin dashboard for full settings management.
        </p>
      </div>
    </div>
  );
}
