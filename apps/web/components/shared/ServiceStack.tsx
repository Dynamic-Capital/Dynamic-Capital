"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Award,
  type LucideIcon,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/utils";

interface ServiceStackProps {
  services: string;
  className?: string;
}

interface ServiceItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

// Parse services string into structured data
function parseServices(servicesText: string): ServiceItem[] {
  const serviceLines = servicesText.split("\n").filter((s) => s.trim());
  return serviceLines.map((service) => {
    const clean = service
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace("•", "")
      .trim();

    const data = (text: string) => {
      if (text.includes("Signal")) {
        return {
          icon: TrendingUp,
          title: "Trading Signals",
          description: "Real-time market signals with entry and exit points",
          color: "text-green-500",
        };
      }
      if (text.includes("Analysis")) {
        return {
          icon: Star,
          title: "Market Analysis",
          description: "Daily market research and technical insights",
          color: "text-blue-500",
        };
      }
      if (text.includes("Risk")) {
        return {
          icon: Shield,
          title: "Risk Management",
          description: "Guidance on protecting your trading capital",
          color: "text-primary",
        };
      }
      if (text.includes("Mentor")) {
        return {
          icon: Users,
          title: "Personal Mentor",
          description: "One-on-one coaching from experienced traders",
          color: "text-orange-500",
        };
      }
      if (text.includes("VIP")) {
        return {
          icon: Sparkles,
          title: "VIP Community",
          description: "Exclusive access to premium trading community",
          color: "text-accent",
        };
      }
      if (text.includes("Support")) {
        return {
          icon: MessageSquare,
          title: "24/7 Support",
          description: "Round-the-clock customer assistance",
          color: "text-cyan-500",
        };
      }
      return {
        icon: Award,
        title: clean,
        description: "Premium service for VIP members",
        color: "text-primary",
      };
    };

    return data(clean);
  });
}

export function ServiceStack({ services, className }: ServiceStackProps) {
  const items = useMemo(() => parseServices(services), [services]);

  const cardHeight = 160; // approximate card height
  const stackGap = 60; // vertical offset between cards
  const containerHeight = cardHeight + stackGap * (items.length - 1);

  return (
    <div
      className={cn("relative max-w-md mx-auto", className)}
      style={{ height: containerHeight }}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={index}
            className="absolute left-0 right-0"
            style={{ top: index * stackGap, zIndex: items.length - index }}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className={cn("w-6 h-6", item.color)} />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                {item.description}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

export default ServiceStack;
