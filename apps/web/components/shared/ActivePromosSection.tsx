"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

interface Promo {
  code: string;
  description: string;
}

const promos: Promo[] = [
  { code: "SAVE10", description: "Save 10% on any plan" },
  { code: "VIPBONUS", description: "Bonus month on VIP plan" },
];

export function ActivePromosSection() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % promos.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative h-32 w-full flex items-center justify-center"
      style={{ perspective: 1000 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ rotateY: -90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: 90, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute"
          style={{ transformStyle: "preserve-3d" }}
        >
          <Card className="w-64 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="font-bold text-lg">{promos[index].code}</div>
              <p className="text-sm text-muted-foreground">
                {promos[index].description}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default ActivePromosSection;
