import React from "react";
import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import DesktopNav from "@/components/navigation/DesktopNav";
import MobileMenu from "@/components/navigation/MobileMenu";

const Header: React.FC = () => {
  return (
    <header 
      className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border sticky top-0 z-50"
      role="banner"
    >
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
            aria-label="Go to homepage"
          >
            <BrandLogo />
          </Link>

          <DesktopNav />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
