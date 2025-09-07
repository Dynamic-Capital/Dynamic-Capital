import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Loader2, Bot } from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { useToast } from "@/hooks/use-toast";

export function AskSection() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/ai-faq-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim()
        })
      });

      const data = await response.json();
      
      if (data.success && data.answer) {
        setAnswer(data.answer);
      } else {
        throw new Error(data.error || 'Failed to get answer');
      }
    } catch (error) {
      console.error('Failed to get AI answer:', error);
      toast({
        title: "Unable to get answer",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FadeInOnView>
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Bot className="h-5 w-5 animate-pulse-glow" />
            AI Assistant
          </CardTitle>
          <CardDescription>
            Ask any trading or platform related question and get instant AI-powered answers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask me anything about trading, signals, or our platform..."
                className="glass-input min-h-[44px]"
                disabled={isLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full glass-button"
              disabled={isLoading || !question.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Getting answer...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Ask Question
                </>
              )}
            </Button>
          </form>

          {answer && (
            <FadeInOnView>
              <div className="mt-6 p-4 glass-card border-primary/10 bg-primary/5 rounded-lg animate-slide-up">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium text-primary">AI Answer:</h4>
                    <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {answer}
                    </div>
                  </div>
                </div>
              </div>
            </FadeInOnView>
          )}

          <div className="text-xs text-muted-foreground text-center border-t pt-4">
            <p>💡 Pro tip: Ask specific questions for better answers</p>
          </div>
        </CardContent>
      </Card>
    </FadeInOnView>
  );
}