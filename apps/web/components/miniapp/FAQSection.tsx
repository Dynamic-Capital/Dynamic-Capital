"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How do I get VIP access after payment?",
    answer:
      "After successful payment verification, you'll be automatically added to our VIP Telegram channels within 24 hours. You'll receive a confirmation message with access details.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept bank transfers (MVR/USD) and cryptocurrency (USDT TRC20). Bank transfers take 1-3 business days, while crypto payments are processed within 30 minutes.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Yes, you can cancel anytime by contacting our support team. Refunds are available within 7 days of purchase for monthly plans, subject to our refund policy.",
  },
  {
    question: "How accurate are your trading signals?",
    answer:
      "Our VIP signals maintain an 85%+ success rate based on historical performance. However, all trading involves risk, and past performance doesn't guarantee future results.",
  },
  {
    question: "Do you provide trading education?",
    answer:
      "Yes! VIP members get access to educational content, webinars, and one-on-one mentoring sessions with our expert traders.",
  },
  {
    question: "What's the difference between plans?",
    answer:
      "Higher-tier plans include more signals per day, priority support, exclusive analysis, and access to additional trading tools and educational resources.",
  },
];

export function FAQSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleContactSupport = () => {
    const isInTelegram = typeof window !== "undefined" &&
      window.Telegram?.WebApp;
    if (isInTelegram) {
      window.open("https://t.me/DynamicCapital_Support", "_blank");
    } else {
      window.open("https://t.me/DynamicCapital_Support", "_blank");
    }
  };

  return (
    <FadeInOnView>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Find answers to common questions about our VIP service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqData.map((item, index) => (
            <FadeInOnView key={index} delay={index * 100}>
              <div className="border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  className="w-full p-4 justify-between text-left hover:bg-muted/50 touch-target"
                  onClick={() =>
                    toggleExpanded(index)}
                  aria-expanded={expandedIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span id={`faq-question-${index}`} className="font-medium">
                    {item.question}
                  </span>
                  {expandedIndex === index
                    ? <ChevronUp className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />}
                </Button>
                {expandedIndex === index && (
                  <div
                    id={`faq-answer-${index}`}
                    className="px-4 pb-4 border-t bg-muted/20"
                    role="region"
                    aria-labelledby={`faq-question-${index}`}
                  >
                    <p className="text-sm text-muted-foreground pt-3 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            </FadeInOnView>
          ))}

          <FadeInOnView delay={600}>
            <div className="mt-6 p-4 bg-primary/10 rounded-lg text-center">
              <h4 className="font-semibold mb-2">Still have questions?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Our support team is available 24/7 to help you
              </p>
              <Button onClick={handleContactSupport} className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </FadeInOnView>
        </CardContent>
      </Card>
    </FadeInOnView>
  );
}
