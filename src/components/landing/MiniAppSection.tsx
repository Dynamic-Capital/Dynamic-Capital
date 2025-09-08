import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MotionFadeIn } from "@/components/ui/motion-components";
import MiniAppPreview from "@/components/telegram/MiniAppPreview";
import { Zap, CheckCircle, Sparkles } from "lucide-react";

interface MiniAppSectionProps {
  onOpenTelegram: () => void;
}

const features = [
  "⚡ Instant access to trading signals",
  "💳 Real-time payment processing",
  "📱 Seamless Telegram integration",
  "🎯 Mobile-optimized interface"
];

const MiniAppSection = ({ onOpenTelegram }: MiniAppSectionProps) => (
  <section id="preview-section" className="py-20 bg-background">
    <div className="container mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <MotionFadeIn direction="right" distance={50}>
            <Badge className="mb-4 bg-telegram/10 text-telegram border-telegram/20">
              <Zap className="w-4 h-4 mr-2" />
              Live Demo
            </Badge>

            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Experience Our Telegram Mini App
            </h2>

            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              See how easy it is to access premium trading signals and manage your VIP subscription
              directly within Telegram. No downloads required!
            </p>

            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <MotionFadeIn key={index} delay={index * 0.1}>
                  <div className="flex items-center group hover:scale-105 transition-transform duration-200">
                    <CheckCircle className="w-6 h-6 text-[hsl(var(--accent-green))] mr-4 group-hover:scale-110 transition-transform" />
                    <span className="text-lg">{feature}</span>
                  </div>
                </MotionFadeIn>
              ))}
            </div>

            <Button
              size="lg"
              className="bg-telegram hover:bg-telegram-dark shadow-lg hover:shadow-telegram/25 transform hover:scale-105 transition-all duration-300"
              onClick={onOpenTelegram}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Try It Now in Telegram
            </Button>
          </MotionFadeIn>
        </div>

        <MotionFadeIn delay={0.3} scale>
          <div className="lg:order-first">
            <MiniAppPreview className="mx-auto transform hover:scale-105 transition-transform duration-300" />
          </div>
        </MotionFadeIn>
      </div>
    </div>
  </section>
);

export default MiniAppSection;
