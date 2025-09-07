import { useState, useEffect } from "react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { Button } from "@/components/ui/button";
import { 
  Hand, 
  Rocket, 
  DollarSign, 
  Target, 
  Star, 
  Users, 
  TrendingUp, 
  Shield,
  Sparkles,
  Crown,
  Zap
} from "lucide-react";

interface WelcomeLineProps {
  text: string;
  delay: number;
  icon?: any;
  iconColor?: string;
}

function WelcomeLine({ text, delay, icon: Icon, iconColor = "text-primary" }: WelcomeLineProps) {
  return (
    <FadeInOnView delay={delay} animation="slide-in-right">
      <div className="flex items-center justify-center gap-3 mb-2">
        {Icon && (
          <Icon className={`h-6 w-6 ${iconColor} animate-pulse`} />
        )}
        <p className="text-lg sm:text-xl text-muted-foreground font-medium text-center">
          {text}
        </p>
      </div>
    </FadeInOnView>
  );
}

interface AnimatedWelcomeProps {
  className?: string;
}

export function AnimatedWelcome({ className }: AnimatedWelcomeProps) {
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
        // Show stats after message loads and animation completes
        setTimeout(() => setShowStats(true), 2500);
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
        delay: 500 + (index * 400)
      };
    });
  };

  const welcomeLines = getWelcomeLines();

  return (
    <div className={`py-20 text-center max-w-6xl mx-auto ${className}`}>
      <div className="space-y-8">
        {/* Main title with animated icon */}
        <FadeInOnView delay={0} animation="bounce-in">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Star className="h-12 w-12 text-primary animate-spin" style={{ animationDuration: '3s' }} />
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Dynamic Capital
            </h1>
            <Zap className="h-12 w-12 text-yellow-500 animate-bounce" />
          </div>
        </FadeInOnView>

        <FadeInOnView delay={200} animation="fade-in">
          <h2 className="text-xl sm:text-2xl font-semibold text-primary mb-8 text-center">
            Professional Trading • Premium Signals • VIP Support
          </h2>
        </FadeInOnView>

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
        <div className={`transition-all duration-1000 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 px-6 py-3 bg-success/10 border border-success/20 rounded-full animate-bounce-in hover:scale-105 transition-transform">
              <Users className="h-5 w-5 text-success animate-pulse" />
              <span className="font-bold text-foreground">5000+ Members</span>
            </div>
            
            <div className="flex items-center gap-2 px-6 py-3 bg-info/10 border border-info/20 rounded-full animate-bounce-in hover:scale-105 transition-transform" style={{ animationDelay: '200ms' }}>
              <TrendingUp className="h-5 w-5 text-info animate-pulse" />
              <span className="font-bold text-foreground">85% Success</span>
            </div>
            
            <div className="flex items-center gap-2 px-6 py-3 bg-primary/10 border border-primary/20 rounded-full animate-bounce-in hover:scale-105 transition-transform" style={{ animationDelay: '400ms' }}>
              <Shield className="h-5 w-5 text-primary animate-pulse" />
              <span className="font-bold text-foreground">Verified</span>
            </div>
          </div>

          {/* Call to action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 animate-pulse-glow hover:scale-105 transition-transform"
              onClick={() => {
                document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Rocket className="h-5 w-5 mr-2" />
              Explore VIP Plans
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-4 hover:scale-105 transition-transform"
              onClick={() => {
                document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
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
