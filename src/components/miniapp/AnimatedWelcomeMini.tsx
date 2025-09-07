import { useState, useEffect } from "react";
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

interface WelcomeLineMiniProps {
  text: string;
  delay: number;
  icon?: any;
  iconColor?: string;
}

function WelcomeLineMini({ text, delay, icon: Icon, iconColor = "text-primary" }: WelcomeLineMiniProps) {
  return (
    <FadeInOnView delay={delay} animation="slide-in-right">
      <div className="flex items-center justify-center gap-2 mb-2">
        {Icon && (
          <Icon className={`h-5 w-5 ${iconColor} animate-pulse drop-shadow-sm`} />
        )}
        <p className="text-base sm:text-lg text-elevated font-semibold text-center drop-shadow-sm">
          {text}
        </p>
      </div>
    </FadeInOnView>
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
          <FadeInOnView delay={0} animation="fade-in">
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                <Zap className="h-6 w-6 text-yellow-500 animate-bounce" />
              </div>
            </div>
          </FadeInOnView>
          
          <FadeInOnView delay={200} animation="fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 drop-shadow-lg">
              Dynamic Capital VIP
            </h1>
          </FadeInOnView>

          <FadeInOnView delay={300} animation="fade-in">
            <p className="text-base sm:text-lg text-primary font-semibold mb-4 drop-shadow-sm">
              Professional Trading • Premium Signals • VIP Support
            </p>
          </FadeInOnView>

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
