"use client";

import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
    { href: "/matches", label: "VIEW MATCHES" },
    { href: "/points", label: "STANDINGS" },
    { href: "/squads", label: "VIEW SQUADS" },
];

export default function HomeClient({ champion }: { champion: { name: string; color: string } | null }) {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
            {/* Ambient glow */}
            <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-500 opacity-5 blur-[80px] pointer-events-none" />

            {/* Hero */}
            <div className="relative z-10 flex flex-col items-center gap-10 text-center w-full max-w-sm">
                {/* Logo */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="relative w-40 h-40 md:w-52 md:h-52 drop-shadow-2xl"
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
                    className="flex flex-col gap-3"
                >
                    <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-gold-gradient leading-none">
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
                                SEASON 1 CHAMPIONS
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

                {/* CTA Buttons */}
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
            </div>
        </main>
    );
}
