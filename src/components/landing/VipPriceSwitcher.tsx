import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const VipPriceSwitcher = () => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section className="mb-10">
      <div className="flex justify-center gap-4 mb-4">
        <Button
          variant={billing === 'monthly' ? 'default' : 'outline'}
          onClick={() => setBilling('monthly')}
          disabled={billing === 'monthly'}
        >
          Monthly
        </Button>
        <Button
          variant={billing === 'annual' ? 'default' : 'outline'}
          onClick={() => setBilling('annual')}
          disabled={billing === 'annual'}
        >
          Annual
        </Button>
      </div>
      <div className="text-3xl font-bold text-center">
        <AnimatePresence mode="wait">
          {billing === 'monthly' ? (
            <motion.span
              key="monthly"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              $49 / mo
            </motion.span>
          ) : (
            <motion.span
              key="annual"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              $480 / yr
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default VipPriceSwitcher;
