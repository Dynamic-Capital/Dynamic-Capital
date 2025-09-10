import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

const Navbar = () => {
  return (
    <nav className="glass-motion-nav border-b border-border">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" aria-label="Home">
          <BrandLogo size="md" variant="brand" />
        </Link>
        <div className="flex gap-6 text-sm">
          <Link href="#deposit" className="hover:text-primary">Deposit</Link>
          <Link href="#checkout" className="hover:text-primary">Checkout</Link>
          <Link href="#settings" className="hover:text-primary">Settings</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
