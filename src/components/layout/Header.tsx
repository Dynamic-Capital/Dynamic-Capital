import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";
import DesktopNav from "@/components/navigation/DesktopNav";
import MobileMenu from "@/components/navigation/MobileMenu";

const Header: React.FC = () => {
  return (
    <header
      className={cn(
        "bg-gradient-navigation backdrop-blur-xl border-b border-border/50 sticky top-0 z-50",
        "shadow-lg shadow-primary/5 transition-all duration-300"
      )}
      role="banner"
      aria-label="Site header"
    >
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className={cn(
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg",
              "transition-all duration-300 hover:scale-105"
            )}
            aria-label="Go to homepage"
          >
            <BrandLogo variant="brand" animated />
          </Link>

          <DesktopNav />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
