"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle ambient glow behind the logo */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-500 opacity-5 blur-[120px] pointer-events-none" />

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center gap-10 text-center px-4">
        {/* Logo */}
        <div className="relative w-40 h-40 md:w-52 md:h-52 drop-shadow-2xl">
          <Image
            src="/logo.jpg"
            alt="Varchasva Phoenix"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-3">
          <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-gold-gradient leading-none">
            Varchasva
          </h1>
          <p className="text-sm md:text-base uppercase tracking-[0.4em] text-zinc-500 font-medium">
            Premier League
          </p>
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        {/* CTA Button */}
        <Link
          href="/squads"
          className="group relative px-8 py-3 rounded-full border border-white/10 text-sm font-semibold tracking-widest text-zinc-300 hover:text-white transition-all duration-300 overflow-hidden"
        >
          <span className="relative z-10">VIEW SQUADS →</span>
          {/* hover shimmer fill */}
          <span className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </Link>
      </div>
    </main>
  );
}
