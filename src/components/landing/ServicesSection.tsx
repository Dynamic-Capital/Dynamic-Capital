import { Badge } from "@/components/ui/badge";
import { MotionSection } from "@/components/ui/motion-theme";
import { MotionScrollReveal } from "@/components/ui/motion-components";
import { ServiceStack } from "@/components/shared/ServiceStack";
import { Award } from "lucide-react";

const ServicesSection = () => (
  <MotionSection variant="fadeUp" className="py-20 bg-background">
    <div className="container mx-auto px-6">
      <MotionScrollReveal>
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Award className="w-4 h-4 mr-2" />
            Premium Services
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 font-poppins text-foreground">Everything You Need to Succeed</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed">
            Comprehensive trading solutions designed for maximum profitability
          </p>
        </div>
      </MotionScrollReveal>

      <ServiceStack
        services="📈 Real-time Trading Signals\n📊 Daily Market Analysis\n🛡️ Risk Management Guidance\n👨‍🏫 Personal Trading Mentor\n💎 Exclusive VIP Community\n📞 24/7 Customer Support"
      />
    </div>
  </MotionSection>
);

export default ServicesSection;
