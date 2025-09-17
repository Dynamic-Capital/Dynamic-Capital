import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ViewHeader } from "./ViewHeader";
import { Copy, Gift } from "lucide-react";

interface PromosViewProps {
  onBack: () => void;
  onCopyPromo: (code: string) => void;
}

const PROMOS = [
  {
    code: "VIPBOTLAUNCH50",
    description: "VIP Bot Launch - 50% OFF Lifetime",
    discount: "50%",
    type: "Percentage",
    uses: "0/100",
    status: "Active",
    expires: "30 days",
  },
  {
    code: "WELCOME20",
    description: "Welcome discount for new users",
    discount: "20%",
    type: "Percentage",
    uses: "45/500",
    status: "Disabled",
    expires: "60 days",
  },
  {
    code: "SUMMER25",
    description: "Summer special offer",
    discount: "$25",
    type: "Fixed",
    uses: "123/200",
    status: "Disabled",
    expires: "Expired",
  },
];

export function PromosView({ onBack, onCopyPromo }: PromosViewProps) {
  return (
    <div className="space-y-6">
      <ViewHeader
        title="Promo Codes Management"
        description="Create and manage discount codes for your users"
        onBack={onBack}
        actions={
          <Button variant="default" className="gap-2">
            <Gift className="w-4 h-4" />
            Create New Promo
          </Button>
        }
      />

      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg border-l-4 border-l-green-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Gift className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-600">🚀 VIP Bot Launch Special!</h3>
              <p className="text-muted-foreground">VIPBOTLAUNCH50 - 50% OFF Lifetime Access</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge className="bg-green-500 text-white">ACTIVE</Badge>
                <span className="text-sm text-muted-foreground">Valid for 30 days • 0/100 uses</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Button variant="outline" size="sm" className="mr-2">
              Edit
            </Button>
            <Button variant="destructive" size="sm">
              Disable
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">All Promo Codes</h3>
        </div>
        <div className="space-y-4">
          {PROMOS.map((promo) => (
            <div
              key={promo.code}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Gift className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-semibold">{promo.code}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      aria-label={`Copy promo code ${promo.code}`}
                      title="Copy code"
                      onClick={async () => {
                        await navigator.clipboard.writeText(promo.code);
                        onCopyPromo(promo.code);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Badge
                      variant="outline"
                      className={
                        promo.status === "Active"
                          ? "border-green-500 text-green-600"
                          : promo.status === "Disabled"
                          ? "border-orange-500 text-orange-600"
                          : "border-dc-brand text-dc-brand-dark"
                      }
                    >
                      {promo.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{promo.description}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>
                      {promo.discount} {promo.type}
                    </span>
                    <span>Uses: {promo.uses}</span>
                    <span>Expires: {promo.expires}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  {promo.status === "Active" ? "Disable" : "Enable"}
                </Button>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-dc-brand-dark hover:text-dc-brand-dark"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Promo Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold text-green-500">$2,450</p>
            <p className="text-sm text-muted-foreground">Revenue from promos</p>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold text-blue-500">168</p>
            <p className="text-sm text-muted-foreground">Total redemptions</p>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold text-red-500">23%</p>
            <p className="text-sm text-muted-foreground">Conversion rate</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
