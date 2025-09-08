import { Card, CardContent } from "@/components/ui/card";
import { MotionHoverCard, MotionStagger, MotionScrollReveal } from "@/components/ui/motion-components";
import { TrendingUp, Shield, Users } from "lucide-react";

const FeatureGrid = () => {
  return (
      <section className="py-20 bg-gradient-to-b from-background via-muted/10 to-background relative">
        {/* Interactive Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-[hsl(var(--dc-secondary)/0.1)] to-[hsl(var(--accent-teal)/0.1)] rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-[hsl(var(--dc-accent)/0.1)] to-[hsl(var(--accent-pink)/0.1)] rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
        <div className="container mx-auto px-6">
          <MotionScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 font-poppins text-foreground">Why Choose Dynamic Capital VIP?</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed">
                Get exclusive access to premium features designed for elite traders
              </p>
            </div>
          </MotionScrollReveal>

          <MotionStagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "Premium Signals",
                description: "Receive high-accuracy trading signals with detailed entry, exit, and stop-loss levels. Our signals have a proven 92% success rate.",
                color: "from-[hsl(var(--accent-green-light))] to-[hsl(var(--accent-green))]"
              },
              {
                icon: Shield,
                title: "Risk Management",
                description: "Professional risk management strategies to protect your capital and maximize profits with expert guidance every step of the way.",
                color: "from-[hsl(var(--dc-secondary))] to-[hsl(var(--accent-teal))]"
              },
              {
                icon: Users,
                title: "VIP Community",
                description: "Join an exclusive community of successful traders and learn from the best. Network, share strategies, and grow together.",
                color: "from-[hsl(var(--dc-accent))] to-[hsl(var(--accent-pink))]"
              }
            ].map((feature, index) => (
              <MotionHoverCard key={index} hoverScale={1.05} hoverY={-10}>
                <Card className="bot-card group hover:shadow-2xl transition-all duration-500 hover:scale-105">
                  <CardContent className="p-8 text-center">
                    <div className={`bot-icon-wrapper w-16 h-16 mx-auto mb-6 bg-gradient-to-br ${feature.color} transform group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-8 h-8 text-[hsl(var(--accent-light))]" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors font-poppins">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed font-inter">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </MotionHoverCard>
            ))}
          </MotionStagger>
        </div>
      </section>
  );
};

export default FeatureGrid;
