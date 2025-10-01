import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MotionCard } from "@/components/ui/motion-card";
import { Badge } from "@/components/ui/badge";
import {
  EmoticonRain,
  ThreeDEmoticon,
  TradingEmoticonSet,
} from "@/components/ui/three-d-emoticons";
import { Award, Shield, Sparkles, TrendingUp, Users } from "lucide-react";

interface AnimatedWelcomeMiniProps {
  className?: string;
}

const AnimatedWelcomeMini: React.FC<AnimatedWelcomeMiniProps> = (
  { className = "" },
) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showEmoticonRain, setShowEmoticonRain] = useState(false);

  const steps = [
    {
      title: "Hey there! Welcome to Dynamic Capital VIP!",
      subtitle: "Ready to level up your trading game?",
      emoji: "👋",
      color: "from-brand-primary/20 to-brand-secondary/20",
    },
    {
      title: "Get premium signals & expert guidance",
      subtitle: "Join thousands of successful traders",
      emoji: "📈",
      color: "from-green-500/20 to-emerald-500/20",
    },
    {
      title: "What would you like to do?",
      subtitle: "Choose your trading journey",
      emoji: "🚀",
      color: "from-primary/20 to-accent/20",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [steps.length]);

  useEffect(() => {
    if (currentStep === 1) {
      setShowEmoticonRain(true);
      setTimeout(() => setShowEmoticonRain(false), 3000);
    }
  }, [currentStep]);

  const currentStepData = steps[currentStep];

  return (
    <>
      <EmoticonRain
        emojis={["📈", "💰", "🚀", "⭐", "💎"]}
        count={8}
        active={showEmoticonRain}
      />

      <MotionCard
        variant="glass"
        hover={true}
        animate={true}
        className={`relative overflow-hidden bg-gradient-to-br ${currentStepData.color} border-primary/30 ${className}`}
      >
        <div className="relative z-10 p-6">
          {/* Header with 3D Emoticon */}
          <motion.div
            className="text-center mb-6"
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center items-center gap-3 mb-4">
              <ThreeDEmoticon
                emoji={currentStepData.emoji}
                size={40}
                intensity={0.4}
                animate={true}
              />
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-6 w-6 text-primary" />
              </motion.div>
            </div>

            <motion.h2
              className="text-xl font-bold text-foreground mb-2 leading-tight"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {currentStepData.title}
            </motion.h2>

            <motion.p
              className="text-muted-foreground text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {currentStepData.subtitle}
            </motion.p>
          </motion.div>

          {/* Stats Section with Enhanced Design */}
          <motion.div
            className="grid grid-cols-3 gap-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <motion.div
              className="text-center group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="flex items-center justify-center gap-1 mb-1"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0 }}
              >
                <Users className="h-4 w-4 text-primary" />
                <ThreeDEmoticon emoji="👥" size={16} intensity={0.2} />
              </motion.div>
              <Badge className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 group-hover:bg-primary/20 transition-colors">
                5000+ Members
              </Badge>
            </motion.div>

            <motion.div
              className="text-center group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="flex items-center justify-center gap-1 mb-1"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >
                <TrendingUp className="h-4 w-4 text-green-500" />
                <ThreeDEmoticon emoji="📊" size={16} intensity={0.2} />
              </motion.div>
              <Badge className="bg-green-500/10 text-green-600 text-xs font-semibold px-2 py-1 group-hover:bg-green-500/20 transition-colors">
                85% Success
              </Badge>
            </motion.div>

            <motion.div
              className="text-center group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="flex items-center justify-center gap-1 mb-1"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >
                <Shield className="h-4 w-4 text-blue-500" />
                <ThreeDEmoticon emoji="✅" size={16} intensity={0.2} />
              </motion.div>
              <Badge className="bg-blue-500/10 text-blue-600 text-xs font-semibold px-2 py-1 group-hover:bg-blue-500/20 transition-colors">
                Verified
              </Badge>
            </motion.div>
          </motion.div>

          {/* Trading Emoticon Set */}
          <motion.div
            className="flex justify-center mb-4"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <TradingEmoticonSet variant="vip" />
          </motion.div>

          {/* Step Indicators */}
          <motion.div
            className="flex justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "bg-primary scale-125"
                    : "bg-muted-foreground/30"
                }`}
                animate={index === currentStep
                  ? {
                    scale: [1.25, 1.5, 1.25],
                  }
                  : {}}
                transition={{ duration: 0.5 }}
              />
            ))}
          </motion.div>
        </div>

        {/* Background Animation */}
        <motion.div
          className="absolute inset-0 opacity-5"
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, hsl(var(--primary)) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 50%, hsl(var(--primary)) 0%, transparent 50%)",
              "radial-gradient(circle at 40% 50%, hsl(var(--primary)) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </MotionCard>
    </>
  );
};

export default AnimatedWelcomeMini;
