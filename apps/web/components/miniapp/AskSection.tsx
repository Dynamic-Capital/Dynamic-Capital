"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bot, Loader2, MessageSquare, Send } from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { MotionCard, MotionCardContainer } from "@/components/ui/motion-card";
import { MicroButton, MicroInput } from "@/components/ui/micro-interactions";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/motion-variants";
import { cn } from "@/lib/utils";

type LanguageCode = "dv" | "en";

const localeContent: Record<LanguageCode, {
  assistantTitle: string;
  assistantDescription: string;
  suggestions: string[];
  placeholder: string;
  askButton: string;
  loadingLabel: string;
  validationTitle: string;
  validationDescription: string;
  errorTitle: string;
  errorDescription: string;
  answerLabel: string;
  tip: string;
  localeName: string;
}> = {
  dv: {
    assistantTitle: "AI އެސިސްޓަންޓް",
    assistantDescription: "ޓްރޭޑިން، ރިސްކް މިނިގްމެންޓް، Dynamic Capital ސަރވިސްތައް އެކުލެވޭނެއެވެ.",
    suggestions: [
      "ޓްރޭޑިން އެންމެން ހެދުމަށް ކޮން ކަންކޮޅެއް ހުރިއްޔާ؟",
      "ރިސްކް މިނިގްމެންޓް ކުރެވޭނީކަމަށް؟",
      "VIP މެމްބަރޝިޕްގެ ބެނެފިޓްތައް ކިޔަނީ؟",
      "ޑެމޮ ޓްރޭޑިންގ އެކުލެވޭނީ؟",
    ],
    placeholder: "ޓްރޭޑިން ކަމުގައި ބައެއް ސުވާލެއް ލިޔުއްވާ...",
    askButton: "ސުވާލު ކުރޭ",
    loadingLabel: "ޖަވާބު ހޯދާނެ...",
    validationTitle: "ސުވާލެއް ލިޔުމަށް ބަލާލެއްވާ",
    validationDescription:
      "ޓްރޭޑިން، ޓޮކެންތައް، ނުވަތަ Dynamic Capital ސަރވިސްތައްގެ ސުވާލެއް ލިޔުއްވާ.",
    errorTitle: "ޖަވާބު ނުފެނުނު",
    errorDescription: "އެކަން ތިބާ އެންމެން އަލުން ކުރަންވާ ނުވަތަ ސަޕޯޓްގައި ބަލާ.",
    answerLabel: "AI ޖަވާބު",
    tip: "💡 އެއްޗެއް ބެލިގެން ސުވާލުތައް ލިޔުއްވާ އިންސްޓަންޓް ޖަވާބުތައް ހޯދާލައްވާ",
    localeName: "ދިވެހި",
  },
  en: {
    assistantTitle: "AI Assistant",
    assistantDescription:
      "Ask about trading, risk management, or Dynamic Capital services.",
    suggestions: [
      "How do I start trading?",
      "What are the best trading strategies?",
      "How to manage risk in trading?",
      "What are VIP benefits?",
    ],
    placeholder: "Ask me anything about trading, signals, or our platform...",
    askButton: "Ask Question",
    loadingLabel: "Getting answer...",
    validationTitle: "Please enter a question",
    validationDescription:
      "Type your trading or platform related question to continue.",
    errorTitle: "Unable to get answer",
    errorDescription: "Please try again or contact support.",
    answerLabel: "AI Answer",
    tip: "💡 Pro tip: Ask specific questions for better answers",
    localeName: "English",
  },
};

const languageOptions: { code: LanguageCode; label: string }[] = [
  { code: "dv", label: localeContent.dv.localeName },
  { code: "en", label: localeContent.en.localeName },
];

export function AskSection() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>("dv");
  const [answerLanguage, setAnswerLanguage] = useState<LanguageCode>("dv");
  const { toast } = useToast();

  const locale = localeContent[language];
  const quickSuggestions = locale.suggestions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast({
        title: locale.validationTitle,
        description: locale.validationDescription,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setAnswer("");
    setAnswerLanguage(language);

    try {
      const { data, error } = await supabase.functions.invoke(
        "ai-faq-assistant",
        {
          body: { question: question.trim(), language },
        },
      );

      if (error) throw error;

      if (data.answer) {
        setAnswer(data.answer);
        if (data.language === "dv" || data.language === "en") {
          setAnswerLanguage(data.language);
        }
      } else {
        throw new Error("No answer received");
      }
    } catch (error) {
      console.error("Failed to get AI answer:", error);
      toast({
        title: locale.errorTitle,
        description: locale.errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const answerLocale = localeContent[answerLanguage];

  return (
    <FadeInOnView>
      <MotionCard variant="glass" className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Bot className="h-5 w-5 animate-pulse-glow" />
            {locale.assistantTitle}
          </CardTitle>
          <CardDescription>{locale.assistantDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {language === "dv" ? "ބަހުގައި ބައިވެރިން ބަލާ" : "Toggle language"}
            </span>
            <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 p-1">
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => setLanguage(option.code)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    language === option.code
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-transparent text-primary hover:bg-primary/20",
                  )}
                  disabled={isLoading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <MotionCardContainer staggerDelay={0.1}>
            <motion.div
              className="flex flex-wrap gap-2"
              variants={staggerContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {quickSuggestions.map((suggestion, index) => (
                <motion.div key={index} variants={staggerItemVariants}>
                  <MicroButton
                    variant="glass"
                    size="sm"
                    onClick={() =>
                      setQuestion(suggestion)}
                    className="text-xs h-8 px-3"
                    disabled={isLoading}
                  >
                    {suggestion}
                  </MicroButton>
                </motion.div>
              ))}
            </motion.div>
          </MotionCardContainer>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <MicroInput
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={locale.placeholder}
              className="glass-input min-h-[44px]"
              disabled={isLoading}
              icon={<Bot className="h-4 w-4" />}
            />

            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading
                ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {locale.loadingLabel}
                  </>
                )
                : (
                  <>
                    <Send className="h-4 w-4" />
                    {locale.askButton}
                  </>
                )}
            </button>
          </motion.form>

          <AnimatePresence>
            {answer && (
              <motion.div
                className="mt-6"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <MotionCard
                  variant="glow"
                  className="border-primary/10 bg-primary/5"
                >
                  <div className="flex items-start gap-3">
                    <motion.div
                      className="flex-shrink-0 p-2 bg-primary/10 rounded-full"
                      animate={{
                        boxShadow: [
                          "0 0 0 0 hsl(var(--primary) / 0.3)",
                          "0 0 0 8px hsl(var(--primary) / 0.1)",
                          "0 0 0 0 hsl(var(--primary) / 0.3)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </motion.div>
                    <div className="flex-1 space-y-2">
                      <motion.h4
                        className="font-medium text-primary"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        {`${answerLocale.answerLabel} (${answerLocale.localeName})`}
                      </motion.h4>
                      <motion.div
                        className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        {answer}
                      </motion.div>
                    </div>
                  </div>
                </MotionCard>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-xs text-muted-foreground text-center border-t pt-4">
            <p>{locale.tip}</p>
          </div>
        </CardContent>
      </MotionCard>
    </FadeInOnView>
  );
}
