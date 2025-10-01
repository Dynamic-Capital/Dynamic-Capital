"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { Button } from "@/components/ui/button";
import {
  Crown,
  DollarSign,
  Hand,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  GradientText,
  LetterReveal,
  MorphingText,
  StaggeredText,
  TypewriterText,
} from "@/components/ui/animated-text";
import { callEdgeFunction } from "@/config/supabase";

interface WelcomeLineProps {
  text: string;
  delay: number;
  icon?: any;
  iconColor?: string;
}

function WelcomeLine(
  { text, delay, icon: Icon, iconColor = "text-primary" }: WelcomeLineProps,
) {
  return (
    <motion.div
      className="flex items-center justify-center gap-3 mb-2"
      initial={{ opacity: 0, x: -50, rotateY: -30 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{
        duration: 0.8,
        delay: delay / 1000,
        ease: [0.6, -0.05, 0.01, 0.99],
        type: "spring",
        stiffness: 120,
        damping: 20,
      }}
    >
      {Icon && (
        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay / 1000,
          }}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </motion.div>
      )}
      <StaggeredText
        text={text}
        className="text-lg sm:text-xl text-muted-foreground font-medium text-center font-inter"
        delay={delay / 1000}
        staggerDelay={0.03}
        animationType="elastic"
      />
    </motion.div>
  );
}

interface AnimatedWelcomeProps {
  className?: string;
}

export function AnimatedWelcome({ className }: AnimatedWelcomeProps) {
  const [welcomeMessage, setWelcomeMessage] = useState<string>(
    "Professional Trading • Premium Signals • VIP Support",
  );
  const [showStats, setShowStats] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWelcomeMessage = async () => {
      try {
        const { data, error } = await callEdgeFunction("CONTENT_BATCH", {
          method: "POST",
          body: { keys: ["welcome_message"] },
        });

        if (!error && data) {
          const contents = (data as any).contents || [];
          const welcomeContent = contents.find((c: any) =>
            c.content_key === "welcome_message"
          );

          if (welcomeContent?.content_value) {
            setWelcomeMessage(welcomeContent.content_value);
          }
        } else if (error) {
          console.error("Failed to fetch welcome message:", error.message);
        }
      } finally {
        setLoading(false);
        // Show stats after message loads and animation completes
        setTimeout(() => setShowStats(true), 2500);
      }
    };

    fetchWelcomeMessage();
  }, []);

  // Parse welcome message and assign icons
  const getWelcomeLines = () => {
    const lines = welcomeMessage.split("\n").filter((line) => line.trim());

    return lines.map((line, index) => {
      // Remove emoji and clean text
      const cleanLine = line
        .replace(/\p{Extended_Pictographic}/gu, "")
        .trim();

      // Assign icons based on content
      let icon = Sparkles;
      let iconColor = "text-primary";

      if (cleanLine.includes("Welcome") || cleanLine.includes("Hey")) {
        icon = Hand;
        iconColor = "text-yellow-500";
      } else if (
        cleanLine.includes("Ready") || cleanLine.includes("level up")
      ) {
        icon = Rocket;
        iconColor = "text-blue-500";
      } else if (
        cleanLine.includes("premium") || cleanLine.includes("signals")
      ) {
        icon = DollarSign;
        iconColor = "text-green-500";
      } else if (cleanLine.includes("Join") || cleanLine.includes("traders")) {
        icon = Target;
        iconColor = "text-primary";
      } else if (cleanLine.includes("VIP") || cleanLine.includes("Capital")) {
        icon = Crown;
        iconColor = "text-amber-500";
      }

      return {
        text: cleanLine,
        icon,
        iconColor,
        delay: 500 + (index * 400),
      };
    });
  };

  const welcomeLines = getWelcomeLines();

  return (
    <div className={`py-20 text-center max-w-6xl mx-auto ${className}`}>
      <div className="space-y-8">
        {/* Main title with animated icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 1,
            type: "spring",
            stiffness: 200,
            damping: 15,
          }}
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Star className="h-12 w-12 text-primary" />
            </motion.div>

            <LetterReveal
              text="Dynamic Capital"
              className="text-4xl sm:text-5xl font-bold text-foreground font-poppins"
              delay={0.5}
              duration={2}
            />

            <motion.div
              animate={{ y: [-10, 10] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            >
              <Zap className="h-12 w-12 text-yellow-500" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5 }}
        >
          <GradientText
            text="Professional Trading • Premium Signals • VIP Support"
            gradient="from-primary via-accent to-accent"
            className="text-xl sm:text-2xl font-semibold mb-8 text-center font-inter block"
            animate={true}
            animationDuration={5}
          />
        </motion.div>

        {/* Welcome message lines with icons */}
        <div className="space-y-4 mb-8">
          {welcomeLines.map((line, index) => (
            <WelcomeLine
              key={index}
              text={line.text}
              delay={line.delay}
              icon={line.icon}
              iconColor={line.iconColor}
            />
          ))}
        </div>

        {/* Stats - appear after message animation */}
        <div
          className={`transition-all duration-1000 ${
            showStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 px-6 py-3 bg-success/10 border border-success/20 rounded-full animate-bounce-in hover:scale-105 transition-transform">
              <Users className="h-5 w-5 text-success animate-pulse" />
              <span className="font-bold text-foreground font-poppins">
                5000+ Members
              </span>
            </div>

            <div
              className="flex items-center gap-2 px-6 py-3 bg-info/10 border border-info/20 rounded-full animate-bounce-in hover:scale-105 transition-transform"
              style={{ animationDelay: "200ms" }}
            >
              <TrendingUp className="h-5 w-5 text-info animate-pulse" />
              <span className="font-bold text-foreground font-poppins">
                85% Success
              </span>
            </div>

            <div
              className="flex items-center gap-2 px-6 py-3 bg-primary/10 border border-primary/20 rounded-full animate-bounce-in hover:scale-105 transition-transform"
              style={{ animationDelay: "400ms" }}
            >
              <Shield className="h-5 w-5 text-primary animate-pulse" />
              <span className="font-bold text-foreground font-poppins">
                Verified
              </span>
            </div>
          </div>

          {/* Call to action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="text-lg px-8 py-4 animate-pulse-glow hover:scale-105 transition-transform font-semibold font-poppins"
              onClick={() => {
                document.getElementById("plans-section")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              <Rocket className="h-5 w-5 mr-2" />
              Explore VIP Plans
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-4 hover:scale-105 transition-transform font-semibold font-poppins"
              onClick={() => {
                document.getElementById("contact-section")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              <Target className="h-5 w-5 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
