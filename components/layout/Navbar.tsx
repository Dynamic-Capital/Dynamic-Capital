"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { MotionStagger } from "@/components/ui/motion-components";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const { user, signOut } = useAuth();
  return (
    <nav className="glass-motion-nav border-b border-border">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" aria-label="Home">
          <BrandLogo size="md" variant="brand" />
        </Link>
        <div className="flex items-center gap-6 text-sm">
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
          {user ? (
            <button onClick={() => signOut()} className="hover:text-primary">Logout</button>
          ) : (
            <Link href="/login" className="hover:text-primary">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
