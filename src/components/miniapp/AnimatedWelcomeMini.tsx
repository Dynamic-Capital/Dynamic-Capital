import { useState, useEffect } from "react";
import { Star, Users, TrendingUp, Shield } from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";

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
        setTimeout(() => setShowStats(true), 1500);
      }
    };

    fetchWelcomeMessage();
  }, []);

  const messageLines = welcomeMessage.split('•').map(line => line.trim()).filter(Boolean);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-accent/20"
        style={{
          background: `linear-gradient(135deg, 
            hsl(var(--primary) / 0.15), 
            hsl(var(--accent) / 0.1), 
            hsl(var(--secondary) / 0.05))`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 py-8 px-4 text-center space-y-6">
        {/* Animated welcome message */}
        <div className="space-y-3">
          <FadeInOnView delay={0} animation="fade-in">
            <div className="flex justify-center mb-4">
              <Star className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </FadeInOnView>
          
          <FadeInOnView delay={200} animation="fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Dynamic Capital VIP
            </h1>
          </FadeInOnView>

          {/* Animated message lines */}
          <div className="space-y-1">
            {messageLines.map((line, index) => (
              <FadeInOnView 
                key={index} 
                delay={400 + (index * 300)} 
                animation="slide-in-right"
              >
                <p className="text-base sm:text-lg text-muted-foreground font-medium">
                  {line}
                </p>
              </FadeInOnView>
            ))}
          </div>
        </div>

        {/* Stats pills - appear after message animation */}
        <div className={`transition-all duration-700 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/20 rounded-full animate-bounce-in">
              <Users className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold text-foreground">5000+ Members</span>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-info/10 border border-info/20 rounded-full animate-bounce-in" style={{ animationDelay: '200ms' }}>
              <TrendingUp className="h-4 w-4 text-info" />
              <span className="text-sm font-semibold text-foreground">85% Success</span>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full animate-bounce-in" style={{ animationDelay: '400ms' }}>
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
