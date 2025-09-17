import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ViewHeader } from "./ViewHeader";
import { MessageSquare } from "lucide-react";

interface SupportViewProps {
  onBack: () => void;
}

const TICKETS = [
  { user: "John Doe", issue: "Payment not processed", status: "Open", time: "2 min ago" },
  { user: "Jane Smith", issue: "VIP access expired", status: "Pending", time: "15 min ago" },
  { user: "Mike Johnson", issue: "Cannot access premium signals", status: "Resolved", time: "1 hour ago" },
];

export function SupportView({ onBack }: SupportViewProps) {
  return (
    <div className="space-y-6">
      <ViewHeader
        title="Customer Support"
        description="Manage user inquiries and support tickets"
        onBack={onBack}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-dc-brand/10 rounded-lg">
              <MessageSquare className="w-6 h-6 text-dc-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-muted-foreground">Open Tickets</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-500/10 rounded-lg">
              <MessageSquare className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">8</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">156</p>
              <p className="text-sm text-muted-foreground">Resolved Today</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Recent Support Requests</h3>
        <div className="space-y-4">
          {TICKETS.map((ticket) => (
            <div
              key={`${ticket.user}-${ticket.time}`}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {ticket.user.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="font-medium">{ticket.user}</p>
                  <p className="text-sm text-muted-foreground">{ticket.issue}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  variant="outline"
                  className={
                    ticket.status === "Open"
                      ? "border-dc-brand text-dc-brand-dark"
                      : ticket.status === "Pending"
                      ? "border-yellow-500 text-yellow-600"
                      : "border-green-500 text-green-600"
                  }
                >
                  {ticket.status}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">{ticket.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
