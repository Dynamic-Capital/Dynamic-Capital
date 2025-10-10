import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Workflow, Zap } from "lucide-react";

const procedures = [
  {
    name: "Customer Support",
    description: "Route to specialized customer support agent",
    status: "active",
    tools: ["ticket_creation", "knowledge_search", "escalation"],
  },
  {
    name: "Trading Assistant",
    description: "Handle trading queries and market analysis",
    status: "active",
    tools: ["market_data", "signal_analysis", "risk_assessment"],
  },
  {
    name: "Education Guide",
    description: "Assist with educational content and enrollment",
    status: "active",
    tools: ["course_search", "enrollment", "progress_tracking"],
  },
  {
    name: "Payment Processing",
    description: "Handle payment intents and verification",
    status: "active",
    tools: ["payment_intent", "verification", "receipt_upload"],
  },
];

export default function ProceduresRouting() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <GitBranch className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Procedures & Routing</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {procedures.map((procedure) => (
            <Card key={procedure.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{procedure.name}</CardTitle>
                  <Badge variant={procedure.status === "active" ? "default" : "secondary"}>
                    {procedure.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{procedure.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="w-4 h-4" />
                    Available Tools
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {procedure.tools.map((tool) => (
                      <Badge key={tool} variant="outline">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-primary" />
              <CardTitle>Routing Strategy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              The AGI system uses intelligent routing to direct queries to specialized agents based on:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Intent Classification:</strong> Analyzing user input to determine the primary intent
              </li>
              <li>
                <strong>Context Awareness:</strong> Considering conversation history and user profile
              </li>
              <li>
                <strong>Tool Availability:</strong> Routing to agents with appropriate capabilities
              </li>
              <li>
                <strong>Load Balancing:</strong> Distributing requests across available agents
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
