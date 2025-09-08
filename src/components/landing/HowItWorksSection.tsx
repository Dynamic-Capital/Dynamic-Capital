import { Badge } from "@/components/ui/badge";
import { MotionScrollReveal, MotionStagger, MotionHoverCard } from "@/components/ui/motion-components";
import { Target, Crown, DollarSign, TrendingUp } from "lucide-react";

const HowItWorksSection = () => (
  <section className="py-20 bg-gradient-to-b from-background to-muted/20 relative">
    {/* Animated Grid Background */}
    <div className="absolute inset-0 opacity-30">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)/0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
    <div className="container mx-auto px-6">
      <MotionScrollReveal>
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Target className="w-4 h-4 mr-2" />
            Simple Process
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Get Started in 3 Easy Steps</h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of successful traders in minutes
          </p>
        </div>
      </MotionScrollReveal>

      <MotionStagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-8">
        {[
          {
            step: "1",
            icon: Crown,
            title: "Choose Your VIP Plan",
            description: "Select a subscription plan that fits your trading style and budget. All plans include premium signals and community access.",
            color: "from-[hsl(var(--dc-secondary))] to-[hsl(var(--accent-teal))]"
          },
          {
            step: "2",
            icon: DollarSign,
            title: "Secure Payment",
            description: "Pay securely via bank transfer, cryptocurrency, or other supported methods. Get instant access upon confirmation.",
            color: "from-[hsl(var(--accent-green-light))] to-[hsl(var(--accent-green))]"
          },
          {
            step: "3",
            icon: TrendingUp,
            title: "Start Profiting",
            description: "Receive premium trading signals, join our VIP community, and start your journey to consistent trading profits.",
            color: "from-[hsl(var(--dc-accent))] to-[hsl(var(--accent-pink))]"
          }
        ].map((item, index) => (
          <MotionHoverCard key={index} hoverScale={1.05} hoverY={-10}>
            <div className="text-center group hover:scale-105 transition-all duration-300">
              <div
                className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center relative group-hover:scale-110 transition-transform duration-300`}
              >
                <span className="text-3xl font-bold text-[hsl(var(--accent-light))]">{item.step}</span>
                <div className="absolute -inset-1 bg-gradient-to-br from-[hsl(var(--accent-light)/0.2)] to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div
                className={`w-12 h-12 mx-auto mb-4 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
              >
                <item.icon className="w-6 h-6 text-[hsl(var(--accent-light))]" />
              </div>
              <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          </MotionHoverCard>
        ))}
      </MotionStagger>
    </div>
  </section>
);

export default HowItWorksSection;
