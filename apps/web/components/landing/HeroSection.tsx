"use client";

import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center h-screen bg-black text-center overflow-hidden">
      {/* Curved Text Ticker */}
      <motion.svg
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%] pointer-events-none"
        viewBox="0 0 1000 500"
        initial={{ x: 0 }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      >
        <path id="curve" d="M 0,300 Q 500,100 1000,300" fill="transparent" />
        <text fill="#f13d00" fontSize="36" fontWeight="bold" letterSpacing="2px">
          <textPath href="#curve" startOffset="0%">
            ALL YOU NEED IS THE PROJECT ARCHIVE — ALL YOU NEED IS THE PROJECT ARCHIVE —
          </textPath>
        </text>
      </motion.svg>

      {/* Hero Content */}
      <div className="relative z-10 max-w-3xl">
        <h1 className="text-6xl font-extrabold text-white mb-6">The Project Archive</h1>
        <p className="text-lg text-gray-300 mb-8">Where stories live forever 🐾</p>
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-3 bg-[#f13d00] text-white font-semibold rounded-lg hover:opacity-90 transition">
            Explore Now
          </button>
          <button className="px-6 py-3 border border-white text-white font-semibold rounded-lg hover:bg-white hover:text-black transition">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

