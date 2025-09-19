"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import FramerMainNav from "@/components/navigation/FramerMainNav";

const Navbar = () => {
  const { user, signOut } = useAuth();
  return (
    <nav className="glass-motion-nav border-b border-border">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" aria-label="Home">
          <BrandLogo size="md" variant="brand" />
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <div className="hidden md:block">
            <FramerMainNav />
          </div>
          {user ? (
            <button
              onClick={() => signOut()}
              className="rounded-md px-3 py-2 text-sm font-medium transition hover:text-primary"
              aria-label="Sign out"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm font-medium transition hover:text-primary"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
