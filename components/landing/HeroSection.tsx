import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Crown, ArrowRight, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RotatingWords } from "@/components/ui/rotating-words";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { StatefulButton } from "@/components/ui/stateful-button";
import { TextLoader } from "@/components/ui/text-loader";
import { MotionFadeIn, MotionStagger, MotionCounter } from "@/components/ui/motion-components";
import { ResponsiveMotion } from "@/components/ui/responsive-motion";
import { MorphingText } from "@/components/ui/animated-text";

interface HeroSectionProps { onOpenTelegram: () => void; }

const vaporVariants = {
  hidden: { opacity: 0, filter: "blur(20px)", y: 20 },
  show: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 1 } }
};

const isTelegramWebApp = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return Boolean(
    (window as any).Telegram?.WebApp?.initData ||
    (window as any).Telegram?.WebApp?.initDataUnsafe ||
    window.location.search.includes("tgWebAppPlatform") ||
    navigator.userAgent.includes("TelegramWebApp")
  );
};

const HeroSection = ({ onOpenTelegram }: HeroSectionProps) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [showLoader, setShowLoader] = useState(true);
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 300], [0, 100]);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--accent-dark))] via-[hsl(var(--primary)/0.9)] to-[hsl(var(--dc-accent))] min-h-screen flex items-center">
        {/* Dynamic Animated Background with parallax */}
        <motion.div className="absolute inset-0" style={shouldReduceMotion ? undefined : { y: parallaxY }}>
          {/* Floating Orbs with Enhanced Animation */}
            <motion.div
              className={`absolute ${isMobile ? 'top-10 left-5 w-40 h-40' : 'top-20 left-10 w-72 h-72'} bg-[hsl(var(--accent-light)/0.2)] rounded-full blur-3xl`}
              animate={shouldReduceMotion ? { opacity: 0.5 } : {
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
                x: [0, isMobile ? 25 : 50, 0],
                y: [0, isMobile ? -15 : -30, 0]
              }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className={`absolute ${isMobile ? 'bottom-10 right-5 w-48 h-48' : 'bottom-20 right-10 w-96 h-96'} bg-[hsl(var(--accent-gold)/0.3)] rounded-full blur-3xl`}
              animate={shouldReduceMotion ? { opacity: 0.3 } : {
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.5, 0.2],
                x: [0, isMobile ? -30 : -60, 0],
                y: [0, isMobile ? 20 : 40, 0]
              }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            <motion.div
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${isMobile ? 'w-40 h-40' : 'w-80 h-80'} bg-[hsl(var(--accent-pink)/0.25)] rounded-full blur-3xl`}
              animate={shouldReduceMotion ? { opacity: 0.3 } : {
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2],
                rotate: [0, 180, 360]
              }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 12, repeat: Infinity, ease: "linear", delay: 2 }}
            />
          
          {/* Particle Effects */}
            {[...Array(shouldReduceMotion ? 0 : (isMobile ? 10 : 20))].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} bg-[hsl(var(--accent-light)/0.4)] rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={shouldReduceMotion ? undefined : {
                  y: [0, isMobile ? -50 : -100, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={shouldReduceMotion ? undefined : {
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                  ease: "easeInOut"
                }}
              />
            ))}
          
          {/* Gradient Overlay for Better Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--accent-dark)/0.2)] to-[hsl(var(--accent-dark)/0.4)]" />
        </motion.div>
        
        <div className={`relative container mx-auto ${isMobile ? 'px-4 py-12' : 'px-6 py-20'} text-center`}>
          <MotionStagger className={`mx-auto ${isMobile ? 'max-w-lg' : 'max-w-5xl'} space-y-6`}>
            {/* Dynamic Floating Badge */}
            <ResponsiveMotion mobileVariant="fade" desktopVariant="bounce" delay={0.2}>
              <motion.div
                className={isMobile ? 'mb-6' : 'mb-8'}
                variants={vaporVariants}
                initial="hidden"
                animate="show"
              >
                <Badge className={`bg-[hsl(var(--accent-light)/0.3)] text-[hsl(var(--accent-light))] border-[hsl(var(--accent-light)/0.5)] hover:bg-[hsl(var(--accent-light)/0.4)] ${isMobile ? 'text-sm px-4 py-1.5' : 'text-base px-6 py-2'} backdrop-blur-md shadow-xl`}>
                  <motion.div
                    animate={shouldReduceMotion ? undefined : { rotate: [0, 5, -5, 0] }}
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Crown className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mr-2`} />
                  </motion.div>
                  <MorphingText
                    texts={[
                      "#1 Premium Trading Platform",
                      "5000+ Active VIP Members",
                      "Seamless VIP Dashboard",
                      "92% Success Rate Proven",
                      "24/7 Expert Support"
                    ]}
                    interval={4000}
                    morphDuration={0.6}
                  />
                </Badge>
              </motion.div>
            </ResponsiveMotion>

            {/* New Hero Content */}
            <motion.h1
              className={`${isMobile ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl lg:text-6xl'} font-bold font-poppins text-[hsl(var(--accent-light))] drop-shadow-lg`}
              variants={vaporVariants}
              initial="hidden"
              animate="show"
            >
              Dynamic Capital VIP
            </motion.h1>

            <div className="flex justify-center">
              <Separator className="w-24 h-[2px] bg-[hsl(var(--accent-light)/0.5)] rounded-full" />
            </div>

            <p className={`${isMobile ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} text-[hsl(var(--accent-light)/0.9)] max-w-3xl mx-auto`}>
              <span className="text-[hsl(var(--accent-light)/0.8)]">Professional Trading • Premium </span>
              {showLoader ? (
                <span className="inline-flex items-center">
                  <span className="mr-2">Signals</span>
                  <TextLoader size="sm" dotColorClass="text-[hsl(var(--accent-gold))]" />
                </span>
              ) : (
                <RotatingWords
                  words={["Signals", "Analysis", "Support", "Strategies"]}
                  interval={2500}
                  colorClass="text-[hsl(var(--accent-gold))] font-semibold"
                />
              )}
              <span className="text-[hsl(var(--accent-light)/0.8)]"> • VIP Support</span>
            </p>

              <p className={`${isMobile ? 'text-base' : 'text-lg'} text-[hsl(var(--accent-light)/0.7)] max-w-2xl mx-auto`}>
                Trade with expert-guided confidence
              </p>
            </MotionStagger>

            {/* Enhanced CTA Buttons */}
            <ResponsiveMotion mobileVariant="slide" desktopVariant="bounce" delay={0.3}>
              <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-col sm:flex-row gap-6'} justify-center pt-2 ${isMobile ? 'mb-12' : 'mb-16'}`}>
                <StatefulButton
                  variant="shimmer"
                  size={isMobile ? "default" : "xl"}
                  className={`${isMobile ? 'px-6 py-3 w-full' : 'px-8 py-4'}`}
                  successText="Opening Plans..."
                  loadingText="Loading..."
                  icon={<Crown className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />}
                  onClick={() => {
                    return new Promise((resolve) => {
                      const inTelegram = isTelegramWebApp();
                      setTimeout(() => {
                        if (inTelegram) {
                          router.push("/miniapp?tab=plan");
                        } else {
                          router.push("/plans");
                        }
                        resolve(undefined);
                      }, 600);
                    });
                  }}
                >
                  Start VIP Journey
                  <ArrowRight className={`ml-2 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                </StatefulButton>

                <EnhancedButton
                  variant="glass"
                  size={isMobile ? "default" : "xl"}
                  className={`${isMobile ? 'px-6 py-3 w-full' : 'px-8 py-4'} text-[hsl(var(--accent-light))] border-[hsl(var(--accent-light)/0.4)]`}
                  onClick={onOpenTelegram}
                  icon={<MessageCircle className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />}
                >
                  Open Telegram Bot
                </EnhancedButton>
              </div>
            </ResponsiveMotion>

            {/* Enhanced Trust Indicators */}
            <MotionStagger staggerDelay={0.2} initialDelay={1.8}>
              <div className={`grid ${isMobile ? 'grid-cols-2 gap-6' : 'grid-cols-2 md:grid-cols-4 gap-8'} text-[hsl(var(--accent-light)/0.9)]`}>
                <motion.div 
                  className="text-center group cursor-pointer"
                  whileHover={{ scale: isMobile ? 1.05 : 1.1, y: -5 }}
                >
                  <MotionCounter 
                    from={0} 
                    to={5000} 
                    suffix="+" 
                    className={`${isMobile ? 'text-2xl md:text-3xl' : 'text-3xl md:text-5xl'} font-black mb-2 text-[hsl(var(--accent-gold))] block`}
                    delay={2}
                  />
                  <div className={`${isMobile ? 'text-xs md:text-sm' : 'text-sm md:text-base'} font-medium`}>Active VIP Members</div>
                </motion.div>
                
                <motion.div 
                  className="text-center group cursor-pointer"
                  whileHover={{ scale: 1.1, y: -5 }}
                >
                  <MotionCounter 
                    from={0} 
                    to={92} 
                    suffix="%" 
                    className="text-3xl md:text-5xl font-black mb-2 text-[hsl(var(--accent-green))] block"
                    delay={2.2}
                  />
                  <div className="text-sm md:text-base font-medium">Success Rate</div>
                </motion.div>
                
                <motion.div 
                  className="text-center group cursor-pointer"
                  whileHover={{ scale: 1.1, y: -5 }}
                >
                  <div className="text-3xl md:text-5xl font-black mb-2 text-[hsl(var(--accent-pink))]">24/7</div>
                  <div className="text-sm md:text-base font-medium">Expert Support</div>
                </motion.div>
                
                <motion.div 
                  className="text-center group cursor-pointer"
                  whileHover={{ scale: 1.1, y: -5 }}
                >
                  <div className="text-3xl md:text-5xl font-black mb-2 text-[hsl(var(--dc-secondary))] flex items-center justify-center gap-1">
                    5
                    <motion.div
                      animate={shouldReduceMotion ? undefined : { rotate: [0, 360] }}
                      transition={shouldReduceMotion ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      ★
                    </motion.div>
                  </div>
                  <div className="text-sm md:text-base font-medium">Customer Rating</div>
                </motion.div>
              </div>
            </MotionStagger>

            {/* Scroll Indicator */}
              {!shouldReduceMotion && (
                <MotionFadeIn delay={2.5}>
                  <motion.div
                    className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="w-6 h-10 border-2 border-[hsl(var(--accent-light)/0.5)] rounded-full flex justify-center">
                      <motion.div
                        className="w-1 h-3 bg-[hsl(var(--accent-light)/0.7)] rounded-full mt-2"
                        animate={{ y: [0, 15, 0], opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </motion.div>
                </MotionFadeIn>
              )}
          </div>
      </section>
  );
};

export default HeroSection;
