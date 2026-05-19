"use client";

import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
    { href: "/live", label: "LIVE MATCH" },
    { href: "/matches", label: "VIEW MATCHES" },
    { href: "/points", label: "STANDINGS" },
    { href: "/stats", label: "VIEW STATS" },
    { href: "/squads", label: "VIEW SQUADS" },
    { href: "/auction", label: "LIVE AUCTION" },
    { href: "/admin", label: "ADMIN HUB" },
];

export default function HomeClient({ champion }: { champion: { name: string; color: string } | null }) {
    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
    const [showAuction, setShowAuction] = useState(true);

    useEffect(() => {
        const targetDate = new Date("2026-05-20T17:00:00+05:30").getTime();
        const hideDate = new Date("2026-05-20T21:00:00+05:30").getTime();

        const updateCountdown = () => {
            const now = new Date().getTime();
            if (now >= hideDate) {
                setShowAuction(false);
                return;
            }
            setShowAuction(true);
            const diff = targetDate - now;
            if (diff <= 0) {
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
            } else {
                setTimeLeft({
                    d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    s: Math.floor((diff % (1000 * 60)) / 1000),
                });
            }
        };
        
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 pt-24 md:pt-32">
            {/* Ambient glow */}
            <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-500 opacity-5 blur-[80px] pointer-events-none" />

            {/* Hero */}
            <div className="relative z-10 flex flex-col items-center gap-6 text-center w-full max-w-sm">
                {/* Logo */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="relative w-32 h-32 md:w-44 md:h-44 drop-shadow-2xl"
                >
                    <Image
                        src="/logo.jpg"
                        alt="Varchasva Phoenix"
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 160px, 208px"
                        priority
                    />
                </motion.div>

                {/* Title */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="flex flex-col gap-2"
                >
                    <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-gold-gradient leading-none">
                        Varchasva
                    </h1>
                    <p className="text-sm md:text-base uppercase tracking-[0.4em] text-zinc-500 font-medium">
                        Premier League
                    </p>
                </motion.div>

                {/* Divider */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent my-1"
                />

                {/* Permanent Champion Display */}
                {champion && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="w-full flex justify-center"
                    >
                        <div
                            className="flex flex-col items-center gap-2 px-8 py-5 rounded-3xl w-full border backdrop-blur-sm"
                            style={{
                                backgroundColor: `${champion.color}08`,
                                borderColor: `${champion.color}30`,
                                boxShadow: `0 0 40px ${champion.color}15, inset 0 0 20px ${champion.color}05`
                            }}
                        >
                            <Trophy className="w-7 h-7 mb-1 drop-shadow-lg" style={{ color: champion.color }} strokeWidth={1.5} />
                            <p className="text-[9px] tracking-[0.5em] text-zinc-400 font-bold" style={{ fontFamily: "var(--font-body)" }}>
                                SEASON 2 CHAMPIONS
                            </p>
                            <h2
                                className="text-3xl sm:text-4xl md:text-5xl uppercase tracking-wider leading-none mt-1 text-center w-full break-words"
                                style={{
                                    fontFamily: "var(--font-display)",
                                    color: champion.color,
                                    textShadow: `0 0 30px ${champion.color}80`
                                }}
                            >
                                {champion.name}
                            </h2>
                        </div>
                    </motion.div>
                )}

                {/* Upcoming Events */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                    className="w-full flex flex-col gap-4 mb-2"
                >
                    {showAuction && (
                        <div className="flex flex-col items-center gap-2 px-6 py-5 rounded-3xl w-full border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                            <h3 className="text-amber-500 font-bold tracking-widest text-[10px] sm:text-xs uppercase mb-1">Live Auction</h3>
                            
                            <div className="flex flex-col items-center text-white">
                                <p className="text-xl sm:text-2xl font-black uppercase tracking-wider" style={{ fontFamily: "var(--font-display)" }}>20th May</p>
                                <p className="text-sm sm:text-base font-semibold tracking-wide text-zinc-300">5:00 PM</p>
                                <p className="text-[11px] sm:text-xs tracking-widest text-zinc-400 mt-1 uppercase">Saraswati Hall</p>
                            </div>

                            {timeLeft && (timeLeft.d > 0 || timeLeft.h > 0 || timeLeft.m > 0 || timeLeft.s > 0) && (
                                <div className="flex gap-3 mt-2 mb-2">
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg sm:text-xl font-bold text-amber-400">{timeLeft.d}</span>
                                        <span className="text-[9px] text-amber-500/60 tracking-widest">DAYS</span>
                                    </div>
                                    <span className="text-lg sm:text-xl font-bold text-amber-500/30">:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg sm:text-xl font-bold text-amber-400">{timeLeft.h.toString().padStart(2, '0')}</span>
                                        <span className="text-[9px] text-amber-500/60 tracking-widest">HRS</span>
                                    </div>
                                    <span className="text-lg sm:text-xl font-bold text-amber-500/30">:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg sm:text-xl font-bold text-amber-400">{timeLeft.m.toString().padStart(2, '0')}</span>
                                        <span className="text-[9px] text-amber-500/60 tracking-widest">MIN</span>
                                    </div>
                                    <span className="text-lg sm:text-xl font-bold text-amber-500/30">:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg sm:text-xl font-bold text-amber-400">{timeLeft.s.toString().padStart(2, '0')}</span>
                                        <span className="text-[9px] text-amber-500/60 tracking-widest">SEC</span>
                                    </div>
                                </div>
                            )}

                            <Link href="/auction" className="mt-2 w-full max-w-[200px] text-center bg-amber-500 text-black font-black text-xs sm:text-sm uppercase tracking-widest py-2.5 rounded-full hover:bg-amber-400 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                View Auction
                            </Link>
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-4 px-6 py-5 rounded-3xl w-full border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                        <h3 className="text-zinc-500 font-bold tracking-widest text-[10px] sm:text-xs uppercase">Match Schedule</h3>
                        
                        <div className="w-full flex flex-col gap-3 text-xs sm:text-sm">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="font-bold text-zinc-300 tracking-wide">29th May</span>
                                <span className="text-zinc-500 font-medium">6:00 PM - 8:30 PM</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="font-bold text-zinc-300 tracking-wide">30th May</span>
                                <span className="text-zinc-500 font-medium">4:00 PM - 8:30 PM</span>
                            </div>
                            <div className="flex justify-between items-start border-b border-white/5 pb-2">
                                <span className="font-bold text-zinc-300 tracking-wide mt-0.5">31st May</span>
                                <div className="flex flex-col items-end text-zinc-500 font-medium gap-0.5">
                                    <span>7:00 AM - 10:30 AM</span>
                                    <span>4:00 PM - 8:30 PM</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <span className="font-bold text-amber-500/90 tracking-wide uppercase">1st June (Finals)</span>
                                <span className="text-amber-500/70 font-medium">6:00 PM - 9:00 PM</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* CTA Buttons - Hidden as per request to focus on schedule */}
                {/* 
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: champion ? 0.8 : 0.6 } }
                    }}
                    className="flex flex-col w-full gap-3"
                >
                    {NAV_ITEMS.map(({ href, label }) => (
                        <motion.div
                            variants={{
                                hidden: { opacity: 0, x: -20 },
                                show: { opacity: 1, x: 0 }
                            }}
                            key={href}
                        >
                            <Link
                                href={href}
                                className="block group relative w-full px-8 py-3.5 rounded-full border border-white/10 text-sm font-semibold tracking-widest text-zinc-300 hover:text-white transition-all duration-300 overflow-hidden text-center"
                            >
                                <span className="relative z-10">{label} →</span>
                                <span className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
                */}
            </div>
        </main>
    );
}
