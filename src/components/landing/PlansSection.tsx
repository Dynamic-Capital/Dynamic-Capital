import { Badge } from "@/components/ui/badge";
import { MotionScrollReveal } from "@/components/ui/motion-components";
import VipPriceSwitcher from "@/components/landing/VipPriceSwitcher";
import { LivePlansSection } from "@/components/shared/LivePlansSection";
import { Crown } from "lucide-react";

const PlansSection = () => (
  <section className="py-20 bg-background">
    <div className="container mx-auto px-6">
      <MotionScrollReveal>
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Crown className="w-4 h-4 mr-2" />
            VIP Membership
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Choose Your Trading Plan</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Flexible plans designed to match your trading goals and experience level
          </p>
        </div>
      </MotionScrollReveal>

      <VipPriceSwitcher />
      <LivePlansSection showPromo={true} showHeader={false} />
    </div>
  </section>
);

export default PlansSection;
