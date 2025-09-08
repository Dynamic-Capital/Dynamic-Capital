import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { MotionCard } from "@/components/ui/motion-card";
import { AutoSizingGrid } from "@/components/ui/auto-sizing";
import { MotionScrollReveal } from "@/components/ui/motion-components";
import { GradientText, TypewriterText } from "@/components/ui/animated-text";
import { Star } from "lucide-react";

const TestimonialsSection = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
      <section className="py-20 bg-gradient-to-b from-background via-muted/20 to-background relative">
        {/* Subtle Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-[hsl(var(--primary)/0.05)] rounded-full blur-3xl"
            animate={shouldReduceMotion ? undefined : {
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0]
            }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-[hsl(var(--dc-accent)/0.05)] rounded-full blur-3xl"
            animate={shouldReduceMotion ? undefined : {
              scale: [1, 1.1, 1],
              rotate: [0, -90, 0]
            }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 25, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <div className="container mx-auto px-6">
          <MotionScrollReveal>
            <div className="text-center mb-16">
              <GradientText 
                text="Trusted by Elite Traders Worldwide"
                gradient="from-foreground via-primary to-[hsl(var(--dc-accent))]"
                className="text-3xl md:text-5xl font-bold mb-6 font-poppins block"
                animate={true}
                animationDuration={6}
              />
              <TypewriterText 
                text="See what our VIP members are saying about their trading success"
                className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed"
                delay={1000}
                speed={30}
              />
            </div>
          </MotionScrollReveal>

          <AutoSizingGrid stagger={0.2} minItemWidth={280} gap={32} className="mb-16">
            {[
              {
                name: "Sarah M.",
                role: "Professional Trader",
                avatar: "💼",
                text: "Dynamic Capital's signals increased my portfolio by 340% in 6 months. The accuracy is incredible!",
                profit: "+$45,000"
              },
              {
                name: "James L.",
                role: "Investment Manager", 
                avatar: "📈",
                text: "Best trading signals I've ever used. The community support and analysis are unmatched.",
                profit: "+$78,000"
              },
              {
                name: "Maria K.",
                role: "Day Trader",
                avatar: "🎯",
                text: "From losing money to consistent profits. Dynamic Capital changed my trading game completely!",
                profit: "+$32,000"
              }
            ].map((testimonial, index) => (
              <MotionCard 
                key={index} 
                variant="glass"
                hover={true}
                animate={true}
                delay={index * 0.2}
                className="p-6 motion-card-glow"
              >
                <CardContent className="space-y-4 p-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-[hsl(var(--dc-accent))] rounded-full flex items-center justify-center text-xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold font-poppins text-foreground">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground font-inter">{testimonial.role}</p>
                    </div>
                    <Badge className="ml-auto bg-[hsl(var(--accent-green)/0.1)] text-[hsl(var(--accent-green))] dark:bg-[hsl(var(--accent-green)/0.3)] dark:text-[hsl(var(--accent-green))] font-inter font-semibold">
                      {testimonial.profit}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground italic font-inter leading-relaxed">"{testimonial.text}"</p>
                  <div className="flex text-[hsl(var(--accent-gold))]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </CardContent>
              </MotionCard>
            ))}
          </AutoSizingGrid>
        </div>
      </section>
  );
};

export default TestimonialsSection;
