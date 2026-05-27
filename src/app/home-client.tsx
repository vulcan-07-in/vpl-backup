"use client";

import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
    // { href: "/live", label: "LIVE MATCH" },
    // { href: "/matches", label: "VIEW MATCHES" },
    { href: "/points", label: "STANDINGS" },
    { href: "/playoffs", label: "PLAYOFFS" },
    // { href: "/stats", label: "VIEW STATS" },
    // { href: "/squads", label: "VIEW SQUADS" },
    // { href: "/auction", label: "LIVE AUCTION" },
    // { href: "/admin", label: "ADMIN HUB" },
];

export default function HomeClient({ champion, auctionStartTime, auctionEndTime }: { champion: { name: string; color: string } | null, auctionStartTime: string, auctionEndTime: string }) {
    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
    const [showAuction, setShowAuction] = useState(true);

    useEffect(() => {
        const targetDate = new Date(auctionStartTime).getTime();
        const hideDate = new Date(auctionEndTime).getTime();

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
    }, [auctionStartTime, auctionEndTime]);

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
                        Premier League S2
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

                    {/* Sponsors Section — above match schedule */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.6 }}
                        className="w-full"
                    >
                        <div className="flex flex-col items-center gap-5 px-6 py-6 rounded-3xl w-full border border-amber-500/10 bg-amber-500/[0.02] backdrop-blur-sm relative overflow-hidden">
                            {/* Subtle top glow line */}
                            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

                            <p className="text-[9px] tracking-[0.5em] text-amber-500/50 font-bold uppercase">
                                Proud Sponsors · Season 2
                            </p>

                            <div className="flex items-center justify-center gap-10">
                                {/* Patil Biryani */}
                                <div className="flex flex-col items-center gap-3 group">
                                    <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                                        <div className="absolute inset-0 rounded-full bg-amber-500/15 blur-xl group-hover:bg-amber-500/30 transition-all duration-500" />
                                        <div className="absolute inset-0 rounded-full border-2 border-amber-500/25 group-hover:border-amber-500/60 transition-all duration-300" />
                                        <Image
                                            src="/sponsor-patil.png"
                                            alt="Patil Biryani"
                                            fill
                                            className="object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                                            sizes="112px"
                                        />
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-zinc-400 tracking-widest font-semibold text-center leading-tight">
                                        PATIL<br />BIRYANI
                                    </p>
                                </div>

                                {/* Divider */}
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className="w-px h-8 bg-gradient-to-b from-transparent via-amber-500/20 to-transparent" />
                                    <span className="text-[10px] tracking-widest text-amber-500/30 font-bold">&</span>
                                    <div className="w-px h-8 bg-gradient-to-b from-transparent via-amber-500/20 to-transparent" />
                                </div>

                                {/* Chitralaya Cineverse */}
                                <div className="flex flex-col items-center gap-3 group">
                                    <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                                        <div className="absolute inset-0 rounded-full bg-white/5 blur-xl group-hover:bg-white/10 transition-all duration-500" />
                                        <div className="absolute inset-0 rounded-full border-2 border-zinc-600/30 group-hover:border-zinc-400/60 transition-all duration-300" />
                                        <div className="absolute inset-0 rounded-full bg-white/5" />
                                        <Image
                                            src="/sponsor-chitralaya.png"
                                            alt="Chitralaya Cineverse"
                                            fill
                                            className="object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                                            sizes="112px"
                                        />
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-zinc-400 tracking-widest font-semibold text-center leading-tight">
                                        CHITRALAYA<br />CINEVERSE
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Rewards Partner Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0, duration: 0.6 }}
                        className="w-full"
                    >
                        <div className="flex flex-col items-center gap-4 px-6 py-5 rounded-3xl w-full border border-red-500/10 bg-red-500/[0.01] backdrop-blur-sm relative overflow-hidden">
                            {/* Subtle top glow line in red */}
                            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />

                            <p className="text-[9px] tracking-[0.5em] text-red-500/60 font-bold uppercase">
                                Rewards Partner
                            </p>

                            <div className="flex flex-col items-center gap-2 group">
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                                    {/* Red ambient glow */}
                                    <div className="absolute inset-0 rounded-full bg-red-500/10 blur-xl group-hover:bg-red-500/20 transition-all duration-500" />
                                    <div className="absolute inset-0 rounded-full border-2 border-red-500/20 group-hover:border-red-500/50 transition-all duration-300" />
                                    
                                    {/* Circular logo badge with white background to perfectly fit the logo */}
                                    <div className="absolute inset-[3px] rounded-full bg-white overflow-hidden p-1 shadow-inner">
                                        <div className="relative w-full h-full">
                                            <Image
                                                src="/partner-meraki.jpg"
                                                alt="The Cafe Meraki"
                                                fill
                                                className="object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
                                                sizes="80px"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] sm:text-[11px] text-zinc-400 tracking-widest font-semibold text-center leading-tight mt-1">
                                    THE CAFE MERAKI
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Match Schedule */}
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

                        {/* View Squads CTA */}
                        <Link
                            href="/squads"
                            className="mt-1 w-full text-center border border-white/10 text-zinc-400 hover:text-white hover:border-white/25 font-bold text-xs uppercase tracking-widest py-2.5 rounded-full transition-all duration-200 hover:bg-white/[0.03]"
                        >
                            View Squads →
                        </Link>
                    </div>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: champion ? 0.8 : 0.6 } }
                    }}
                    className="flex flex-col w-full gap-3 mt-4"
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
            </div>
        </main>
    );
}
