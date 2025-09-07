import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, 
  Users, 
  TrendingUp, 
  Shield, 
  Hand, 
  Rocket, 
  DollarSign, 
  Target,
  Crown,
  Zap,
  Sparkles
} from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { TypewriterText, StaggeredText, GradientText, LetterReveal } from "@/components/ui/animated-text";

interface WelcomeLineMiniProps {
  text: string;
  delay: number;
  icon?: any;
  iconColor?: string;
}

function WelcomeLineMini({ text, delay, icon: Icon, iconColor = "text-primary" }: WelcomeLineMiniProps) {
  return (
    <motion.div 
      className="flex items-center justify-center gap-2 mb-2"
      initial={{ opacity: 0, x: -50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        delay: delay / 1000,
        ease: [0.6, -0.05, 0.01, 0.99],
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
    >
      {Icon && (
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: delay / 1000
          }}
        >
          <Icon className={`h-5 w-5 ${iconColor} drop-shadow-sm`} />
        </motion.div>
      )}
      <StaggeredText 
        text={text}
        className="text-base sm:text-lg text-elevated font-semibold text-center drop-shadow-sm"
        delay={delay / 1000}
        staggerDelay={0.05}
        animationType="fadeUp"
      />
    </motion.div>
  );
}

interface AnimatedWelcomeMiniProps {
  className?: string;
}

export default function AnimatedWelcomeMini({ className }: AnimatedWelcomeMiniProps) {
  const [welcomeMessage, setWelcomeMessage] = useState<string>("Professional Trading • Premium Signals • VIP Support");
  const [showStats, setShowStats] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWelcomeMessage = async () => {
      try {
        const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/content-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keys: ['welcome_message']
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const contents = data.contents || [];
          const welcomeContent = contents.find((c: any) => c.content_key === 'welcome_message');
          
          if (welcomeContent?.content_value) {
            setWelcomeMessage(welcomeContent.content_value);
          }
        }
      } catch (error) {
        console.error('Failed to fetch welcome message:', error);
        // Keep default fallback message
      } finally {
        setLoading(false);
        // Show stats after message loads and a short delay
        setTimeout(() => setShowStats(true), 2000);
      }
    };

    fetchWelcomeMessage();
  }, []);

  // Parse welcome message and assign icons
  const getWelcomeLines = () => {
    const lines = welcomeMessage.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      // Remove emoji and clean text
      const cleanLine = line.replace(/[👋🚀💰🎯📈💎⭐]/g, '').trim();
      
      // Assign icons based on content
      let icon = Sparkles;
      let iconColor = "text-primary";
      
      if (cleanLine.includes('Welcome') || cleanLine.includes('Hey')) {
        icon = Hand;
        iconColor = "text-yellow-500";
      } else if (cleanLine.includes('Ready') || cleanLine.includes('level up')) {
        icon = Rocket;
        iconColor = "text-blue-500";
      } else if (cleanLine.includes('premium') || cleanLine.includes('signals')) {
        icon = DollarSign;
        iconColor = "text-green-500";
      } else if (cleanLine.includes('Join') || cleanLine.includes('traders')) {
        icon = Target;
        iconColor = "text-purple-500";
      } else if (cleanLine.includes('VIP') || cleanLine.includes('Capital')) {
        icon = Crown;
        iconColor = "text-amber-500";
      }
      
      return {
        text: cleanLine,
        icon,
        iconColor,
        delay: 400 + (index * 300)
      };
    });
  };

  const welcomeLines = getWelcomeLines();

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Enhanced background with scrim */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-gradient-to-br opacity-80"
          style={{
            background: `linear-gradient(135deg, 
              hsl(var(--primary) / 0.15), 
              hsl(var(--accent) / 0.12), 
              hsl(var(--secondary) / 0.08))`
          }}
        />
        <div className="absolute inset-0 bg-background/20 dark:bg-background/40" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 py-8 px-4 text-center space-y-6">
        {/* Animated welcome message */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 200, damping: 15 }}
          >
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Star className="h-8 w-8 text-primary" />
                </motion.div>
                <motion.div
                  animate={{ y: [-5, 5] }}
                  transition={{ duration: 1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                >
                  <Zap className="h-6 w-6 text-yellow-500" />
                </motion.div>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <LetterReveal 
              text="Dynamic Capital VIP"
              className="text-2xl sm:text-3xl font-bold text-foreground mb-2 drop-shadow-lg text-center"
              delay={0.5}
              duration={1.2}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <GradientText 
              text="Professional Trading • Premium Signals • VIP Support"
              gradient="from-primary via-purple-500 to-pink-500"
              className="text-base sm:text-lg font-semibold mb-4 drop-shadow-sm text-center block"
              animate={true}
              animationDuration={4}
            />
          </motion.div>

          {/* Animated message lines with icons */}
          <div className="space-y-2">
            {welcomeLines.map((line, index) => (
              <WelcomeLineMini
                key={index}
                text={line.text}
                delay={line.delay}
                icon={line.icon}
                iconColor={line.iconColor}
              />
            ))}
          </div>
        </div>

        {/* Stats pills - appear after message animation */}
        <div className={`transition-all duration-1000 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-4 py-2 liquid-glass border border-success/30 rounded-full animate-bounce-in hover:scale-105 transition-transform backdrop-blur-md">
              <Users className="h-4 w-4 text-success animate-pulse drop-shadow-sm" />
              <span className="text-sm font-semibold text-elevated drop-shadow-sm">5000+ Members</span>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 liquid-glass border border-info/30 rounded-full animate-bounce-in hover:scale-105 transition-transform backdrop-blur-md" style={{ animationDelay: '200ms' }}>
              <TrendingUp className="h-4 w-4 text-info animate-pulse drop-shadow-sm" />
              <span className="text-sm font-semibold text-elevated drop-shadow-sm">85% Success</span>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 liquid-glass border border-primary/30 rounded-full animate-bounce-in hover:scale-105 transition-transform backdrop-blur-md" style={{ animationDelay: '400ms' }}>
              <Shield className="h-4 w-4 text-primary animate-pulse drop-shadow-sm" />
              <span className="text-sm font-semibold text-elevated drop-shadow-sm">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
