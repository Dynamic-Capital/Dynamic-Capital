import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";

interface WelcomeData {
  content_value: string;
  is_active: boolean;
}

export const AnimatedWelcome = () => {
  const [welcomeMessage, setWelcomeMessage] = useState<string>("");
  const [showStats, setShowStats] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWelcomeMessage = async () => {
      try {
        const { data, error } = await supabase
          .from("bot_content")
          .select("content_value, is_active")
          .eq("content_key", "welcome_message")
          .eq("is_active", true)
          .single();

        if (error) {
          console.warn("Welcome message not found, using default");
          setWelcomeMessage("🎯 Welcome to Dynamic Capital VIP!\n\nJoin our exclusive trading community and unlock professional signals, expert analysis, and proven strategies that deliver consistent results.");
        } else {
          setWelcomeMessage((data as WelcomeData).content_value);
        }
      } catch (error) {
        console.error("Error fetching welcome message:", error);
        setWelcomeMessage("🎯 Welcome to Dynamic Capital VIP!\n\nJoin our exclusive trading community and unlock professional signals, expert analysis, and proven strategies that deliver consistent results.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWelcomeMessage();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Show stats after welcome message animation completes
      const timer = setTimeout(() => {
        setShowStats(true);
      }, 1500); // 1.5s delay for welcome message animation

      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const formatWelcomeMessage = (message: string) => {
    // Convert line breaks to JSX and handle emojis
    return message.split('\n').map((line, index) => {
      if (line.trim() === '') return <br key={index} />;
      
      // Extract emoji and text
      const emojiMatch = line.match(/^(\p{Emoji}+)\s*(.*)$/u);
      if (emojiMatch) {
        const [, emoji, text] = emojiMatch;
        return (
          <div key={index} className="flex items-start gap-3 mb-4">
            <span className="text-4xl animate-bounce" style={{ animationDelay: `${index * 0.2}s` }}>
              {emoji}
            </span>
            <span className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-relaxed">
              {text}
            </span>
          </div>
        );
      }
      
      return (
        <p key={index} className="text-lg md:text-xl text-white/90 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded-lg mb-4 mx-auto max-w-md"></div>
          <div className="h-6 bg-white/10 rounded-lg mb-2 mx-auto max-w-lg"></div>
          <div className="h-6 bg-white/10 rounded-lg mx-auto max-w-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-20 text-center max-w-5xl mx-auto">
      {/* Animated Welcome Message */}
      <FadeInOnView animation="fade-in" delay={0} className="mb-16">
        <div className="space-y-6">
          {formatWelcomeMessage(welcomeMessage)}
        </div>
      </FadeInOnView>

      {/* Animated Stats Buttons */}
      {showStats && (
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <FadeInOnView animation="bounce-in" delay={0}>
            <div className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-8 py-6 hover:bg-white/20 transition-all duration-300 cursor-pointer transform hover:scale-105">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-yellow-300" />
                <span className="text-2xl font-bold text-white">5000+</span>
              </div>
              <p className="text-white/80 text-sm font-medium">Members</p>
            </div>
          </FadeInOnView>

          <FadeInOnView animation="bounce-in" delay={200}>
            <div className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-8 py-6 hover:bg-white/20 transition-all duration-300 cursor-pointer transform hover:scale-105">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-green-300" />
                <span className="text-2xl font-bold text-white">85%</span>
              </div>
              <p className="text-white/80 text-sm font-medium">Success Rate</p>
            </div>
          </FadeInOnView>

          <FadeInOnView animation="bounce-in" delay={400}>
            <div className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-8 py-6 hover:bg-white/20 transition-all duration-300 cursor-pointer transform hover:scale-105">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-6 h-6 text-blue-300" />
                <Crown className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-white/80 text-sm font-medium">Verified Platform</p>
            </div>
          </FadeInOnView>
        </div>
      )}
    </div>
  );
};