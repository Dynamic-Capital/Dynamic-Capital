"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { MotionStagger } from "@/components/ui/motion-components";
import { motion } from "framer-motion";

const Navbar = () => {
  return (
    <nav className="glass-motion-nav border-b border-border">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" aria-label="Home">
          <BrandLogo size="md" variant="brand" />
        </Link>
        <MotionStagger className="flex gap-6 text-sm">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="#deposit" className="hover:text-primary">Deposit</Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="#checkout" className="hover:text-primary">Checkout</Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="#settings" className="hover:text-primary">Settings</Link>
          </motion.div>
        </MotionStagger>
      </div>
    </nav>
  );
};

export default Navbar;

