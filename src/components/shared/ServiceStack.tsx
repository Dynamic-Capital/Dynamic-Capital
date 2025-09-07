import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Star, 
  Shield, 
  Users, 
  Sparkles, 
  MessageSquare, 
  Award,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceStackProps {
  services: string;
  className?: string;
}

interface ServiceItem {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  gradient: string;
}

export function ServiceStack({ services, className }: ServiceStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const dragControls = useDragControls();

  const parseServices = (servicesText: string): ServiceItem[] => {
    const serviceLines = servicesText.split('\n').filter(service => service.trim());
    
    return serviceLines.map((service) => {
      const cleanService = service.replace(/[📈📊🛡️👨‍🏫💎📞]/g, '').replace('•', '').trim();
      
      const getServiceData = (text: string) => {
        if (text.includes('Signal')) return { 
          icon: TrendingUp, 
          title: 'Trading Signals', 
          description: 'Real-time market signals with entry and exit points for maximum profitability',
          color: 'text-green-500',
          gradient: 'from-green-500 to-emerald-600'
        };
        if (text.includes('Analysis')) return { 
          icon: Star, 
          title: 'Market Analysis', 
          description: 'Daily comprehensive market research and technical analysis insights',
          color: 'text-blue-500',
          gradient: 'from-blue-500 to-cyan-600'
        };
        if (text.includes('Risk')) return { 
          icon: Shield, 
          title: 'Risk Management', 
          description: 'Professional guidance on protecting and growing your trading capital',
          color: 'text-purple-500',
          gradient: 'from-purple-500 to-pink-600'
        };
        if (text.includes('Mentor')) return { 
          icon: Users, 
          title: 'Personal Mentor', 
          description: 'One-on-one guidance from experienced professional traders',
          color: 'text-orange-500',
          gradient: 'from-orange-500 to-red-600'
        };
        if (text.includes('VIP')) return { 
          icon: Sparkles, 
          title: 'VIP Community', 
          description: 'Exclusive access to premium trading community and networking',
          color: 'text-pink-500',
          gradient: 'from-pink-500 to-purple-600'
        };
        if (text.includes('Support')) return { 
          icon: MessageSquare, 
          title: '24/7 Support', 
          description: 'Round-the-clock customer support and technical assistance',
          color: 'text-cyan-500',
          gradient: 'from-cyan-500 to-blue-600'
        };
        
        return { 
          icon: Award, 
          title: cleanService, 
          description: 'Premium service designed exclusively for VIP members',
          color: 'text-primary',
          gradient: 'from-primary to-purple-600'
        };
      };
      
      return getServiceData(cleanService);
    });
  };

  const serviceItems = parseServices(services);

  const nextService = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % serviceItems.length);
  };

  const prevService = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + serviceItems.length) % serviceItems.length);
  };

  // Auto-rotation effect
  useEffect(() => {
    const timer = setInterval(() => {
      nextService();
    }, 5000);

    return () => clearInterval(timer);
  }, [serviceItems.length]);

  const stackVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8,
      rotateY: direction > 0 ? 45 : -45,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8,
      rotateY: direction < 0 ? 45 : -45,
    })
  };

  const backgroundCards = [-2, -1, 1, 2].map((offset) => {
    const index = (currentIndex + offset + serviceItems.length) % serviceItems.length;
    return { ...serviceItems[index], offset, index };
  });

  return (
    <motion.div
      className={cn("relative w-full max-w-4xl mx-auto", className)}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.6, -0.05, 0.01, 0.99] }}
    >
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center mb-12"
      >
        <motion.h2 
          className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            backgroundSize: '200% 200%'
          }}
        >
          Premium Services
        </motion.h2>
        <motion.p 
          className="text-muted-foreground text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Comprehensive trading solutions for maximum success
        </motion.p>
      </motion.div>

      <div className="relative h-[400px] perspective-1000">
        {/* Background Stack Cards */}
        {backgroundCards.map((item, stackIndex) => {
          const Icon = item.icon;
          const zIndex = 10 - Math.abs(item.offset);
          const scale = 1 - Math.abs(item.offset) * 0.05;
          const translateZ = -Math.abs(item.offset) * 20;
          const rotateY = item.offset * 5;
          const opacity = 1 - Math.abs(item.offset) * 0.15;
          
          return (
            <motion.div
              key={`${item.index}-${item.offset}`}
              className="absolute inset-0"
              style={{
                zIndex,
                scale,
                rotateY,
                opacity,
                transformStyle: 'preserve-3d',
              }}
              animate={{
                scale,
                rotateY,
                opacity,
                x: item.offset * 15,
                y: Math.abs(item.offset) * 10,
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Card className="w-full h-full bg-gradient-to-br from-card/60 to-muted/30 border border-border/50 backdrop-blur-sm">
                <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center">
                  <div className={`p-4 rounded-full bg-gradient-to-br ${item.gradient} mb-6 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Main Active Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={stackVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.3 },
              scale: { duration: 0.4 },
              rotateY: { duration: 0.5 }
            }}
            className="absolute inset-0"
            style={{ zIndex: 20 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) > 50 || Math.abs(velocity.x) > 500;
              if (swipe) {
                if (offset.x > 0) {
                  prevService();
                } else {
                  nextService();
                }
              }
            }}
            whileHover={{ scale: 1.02, rotateY: 2 }}
            whileDrag={{ scale: 1.1, rotateY: 10 }}
          >
            <Card className="w-full h-full bg-gradient-to-br from-card to-card/80 border-2 border-primary/20 shadow-2xl shadow-primary/10 backdrop-blur-md">
              <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center relative overflow-hidden">
                {/* Animated background gradient */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5"
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{
                    backgroundSize: '200% 200%'
                  }}
                />
                
                <motion.div
                  className={`p-6 rounded-full bg-gradient-to-br ${serviceItems[currentIndex].gradient} mb-8 shadow-2xl relative z-10`}
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  {React.createElement(serviceItems[currentIndex].icon, { className: "w-12 h-12 text-white" })}
                </motion.div>
                
                <motion.h3 
                  className="text-3xl font-bold mb-4 relative z-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {serviceItems[currentIndex].title}
                </motion.h3>
                
                <motion.p 
                  className="text-muted-foreground text-lg leading-relaxed max-w-md relative z-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {serviceItems[currentIndex].description}
                </motion.p>

                {/* Floating particles effect */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-primary/30 rounded-full"
                    animate={{
                      x: [0, Math.random() * 100 - 50],
                      y: [0, Math.random() * 100 - 50],
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0]
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeInOut"
                    }}
                    style={{
                      left: `${20 + Math.random() * 60}%`,
                      top: `${20 + Math.random() * 60}%`
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <motion.button
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 p-3 bg-background/80 backdrop-blur-sm rounded-full border border-border/50 shadow-lg hover:shadow-xl"
          onClick={prevService}
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </motion.button>

        <motion.button
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 p-3 bg-background/80 backdrop-blur-sm rounded-full border border-border/50 shadow-lg hover:shadow-xl"
          onClick={nextService}
          whileHover={{ scale: 1.1, x: 2 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <ChevronRight className="w-6 h-6 text-foreground" />
        </motion.button>
      </div>

      {/* Dots Indicator */}
      <motion.div 
        className="flex justify-center mt-8 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        {serviceItems.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className={cn(
              "rounded-full transition-all duration-300 border",
              index === currentIndex 
                ? "w-12 h-4 bg-gradient-to-r from-primary to-purple-500 border-primary" 
                : "w-4 h-4 bg-muted-foreground/50 border-muted-foreground/50 hover:bg-muted-foreground/70"
            )}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            animate={index === currentIndex ? {
              boxShadow: [
                '0 0 0 0 rgba(var(--primary-rgb), 0)',
                '0 0 0 10px rgba(var(--primary-rgb), 0.1)',
                '0 0 0 0 rgba(var(--primary-rgb), 0)'
              ]
            } : {}}
            transition={{
              boxShadow: { duration: 1.5, repeat: Infinity }
            }}
          />
        ))}
      </motion.div>

      {/* Progress bar */}
      <motion.div 
        className="w-full bg-muted/30 rounded-full h-1 mt-6 overflow-hidden"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
          animate={{ 
            width: `${((currentIndex + 1) / serviceItems.length) * 100}%`,
            x: [0, 2, 0]
          }}
          transition={{ 
            width: { duration: 0.5, ease: "easeOut" },
            x: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      </motion.div>
    </motion.div>
  );
}