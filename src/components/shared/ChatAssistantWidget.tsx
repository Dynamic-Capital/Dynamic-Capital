import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Loader2, Bot, X, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ChatAssistantWidgetProps {
  telegramData?: any;
  className?: string;
}

export function ChatAssistantWidget({ telegramData, className }: ChatAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const quickSuggestions = [
    "How do I start?",
    "VIP benefits?",
    "Trading tips?",
    "Risk management?"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast({
        title: "Please enter a question",
        description: "Type your trading or platform related question",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setAnswer("");

    try {
      // First try to call the ai-faq-assistant function
      const { data, error } = await supabase.functions.invoke('ai-faq-assistant', {
        body: { 
          question: question.trim(),
          context: telegramData ? { telegram: telegramData } : undefined
        }
      });

      if (error) {
        // If the AI service fails, provide a helpful fallback response
        console.warn('AI service unavailable:', error);
        setAnswer(`I'm sorry, the AI service is temporarily unavailable. 

Here are some quick answers to common questions:

🔹 **Getting Started**: Choose a VIP plan → Make payment → Get access to our premium signals and community
🔹 **VIP Benefits**: Real-time signals, market analysis, 24/7 support, and exclusive community access  
🔹 **Trading Tips**: Always use proper risk management, never risk more than 2% per trade
🔹 **Risk Management**: Set stop losses, use proper position sizing, and never trade with emotion

💡 Need more help? Contact @DynamicCapital_Support or check our VIP plans!`);
        return;
      }
      
      
      if (data.answer) {
        setAnswer(data.answer);
      } else {
        throw new Error('No answer received');
      }
    } catch (error) {
      console.error('Failed to get AI answer:', error);
      // Provide a helpful fallback response when AI service fails
      setAnswer(`I apologize, but the AI service is currently experiencing issues. 

Here are some helpful resources:

🔹 **Trading Questions**: Our VIP community provides real-time support and guidance
🔹 **Platform Help**: Contact @DynamicCapital_Support for technical assistance  
🔹 **Account Issues**: Email support@dynamiccapital.com for account-related questions
🔹 **VIP Plans**: Choose from 1, 3, 6, 12 month or Lifetime VIP access

📈 **Quick Trading Tips**:
• Use proper risk management (max 2% per trade)
• Follow our premium signals for best results
• Join our VIP community for live market analysis

💡 Need immediate help? Contact @DynamicCapital_Support!`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className={cn("fixed bottom-4 right-4 z-50", className)}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 animate-pulse-glow"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]", className)}>
      <Card className="bg-card/95 backdrop-blur-md border shadow-xl">
        {!isMinimized && (
          <>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary animate-pulse-glow" />
                  <CardTitle className="text-base">AI Assistant</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(true)}
                    className="h-7 w-7 p-0"
                  >
                    <Minimize2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs">
                Ask any trading or platform question
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Quick suggestion buttons */}
              <div className="flex flex-wrap gap-1">
                {quickSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuestion(suggestion)}
                    className="text-xs h-6 px-2"
                    disabled={isLoading}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about trading, signals, plans..."
                  className="text-sm"
                  disabled={isLoading}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  size="sm"
                  disabled={isLoading || !question.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Getting answer...
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-2" />
                      Ask
                    </>
                  )}
                </Button>
              </form>

              {answer && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg max-h-40 overflow-y-auto">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {answer}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </>
        )}
        
        {isMinimized && (
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Assistant</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(false)}
                  className="h-6 w-6 p-0"
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}