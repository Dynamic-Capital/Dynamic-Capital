"use client";

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const VipPriceSwitcher = () => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section className="py-16 bg-gradient-to-b from-transparent via-card/10 to-transparent">
      <div className="container mx-auto px-6">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-dc-accent bg-clip-text text-transparent">
            VIP Membership Plans
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your trading journey
          </p>
        </motion.div>

        <motion.div 
          className="flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-2 shadow-lg">
            <div className="flex gap-2">
              <motion.button
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden ${
                  billing === 'monthly' 
                    ? 'bg-gradient-to-r from-primary to-dc-accent text-white shadow-lg shadow-primary/30' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setBilling('monthly')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {billing === 'monthly' && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                )}
                Monthly
              </motion.button>
              
              <motion.button
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden ${
                  billing === 'annual' 
                    ? 'bg-gradient-to-r from-primary to-dc-accent text-white shadow-lg shadow-primary/30' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setBilling('annual')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {billing === 'annual' && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                )}
                Annual
                <span className="ml-2 text-xs bg-accent-green/20 text-accent-green px-2 py-1 rounded-full">
                  Save 18%
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="relative">
            <AnimatePresence mode="wait">
              {billing === 'monthly' ? (
                <motion.div
                  key="monthly"
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                  className="text-center"
                >
                  <div className="text-6xl md:text-7xl font-black bg-gradient-to-r from-primary via-dc-accent to-primary bg-clip-text text-transparent mb-2">
                    $49
                  </div>
                  <div className="text-xl text-muted-foreground font-medium">
                    per month
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="annual"
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                  className="text-center"
                >
                  <div className="text-6xl md:text-7xl font-black bg-gradient-to-r from-primary via-dc-accent to-primary bg-clip-text text-transparent mb-2">
                    $480
                  </div>
                  <div className="text-xl text-muted-foreground font-medium">
                    per year
                  </div>
                  <div className="text-sm text-accent-green font-semibold mt-2">
                    Save $108 annually
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default VipPriceSwitcher;
