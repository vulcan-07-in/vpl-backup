"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "vpl_champion_dismissed_v2"; // changed key to reset for users testing

export default function ChampionBannerClient({ champion }: { champion: { name: string; color: string } }) {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Only show once per session
        if (sessionStorage.getItem(SESSION_KEY)) return;
        setVisible(true);
    }, [pathname]);

    function dismiss() {
        setVisible(false);
        sessionStorage.setItem(SESSION_KEY, "1");
    }

    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(dismiss, 7000);
        return () => clearTimeout(t);
    }, [visible]);

    // Generate particle positions deterministically
    const particles = Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: ((i * 137.5) % 100),
        y: ((i * 97.3) % 100),
        size: 2 + (i % 4),
        delay: (i * 0.15) % 2,
        dur: 1.5 + (i % 3) * 0.5,
    }));

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    onClick={dismiss}
                    className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer overflow-hidden"
                >
                    {/* Dark backdrop */}
                    <div className="absolute inset-0 bg-black/92 backdrop-blur-xl" />

                    {/* Radial color glow from center */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${champion.color}20 0%, transparent 70%)`,
                        }}
                    />

                    {/* Floating particles */}
                    {particles.map(p => (
                        <div
                            key={p.id}
                            className="absolute rounded-full"
                            style={{
                                left: `${p.x}%`,
                                top: `${p.y}%`,
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                                backgroundColor: champion.color,
                                opacity: 0,
                                animation: `vpl-rise ${p.dur}s ${p.delay}s ease-out infinite`,
                            }}
                        />
                    ))}

                    {/* Content */}
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: -20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.2 }}
                        className="relative z-10 flex flex-col items-center gap-4 text-center px-4 md:px-6 w-full max-w-7xl mx-auto overflow-hidden"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-6xl text-white tracking-widest leading-none" style={{ fontFamily: "var(--font-display)" }}>
                            VARCHASVA
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="h-px w-8 bg-zinc-600" />
                            <span className="text-[10px] tracking-[0.4em] text-amber-500 font-bold" style={{ fontFamily: "var(--font-body)" }}>
                                SEASON 1
                            </span>
                            <div className="h-px w-8 bg-zinc-600" />
                        </div>

                        <h3 className="text-4xl sm:text-5xl md:text-7xl text-white mt-4 tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                            CHAMPIONS
                        </h3>

                        <h1
                            className="text-6xl sm:text-8xl lg:text-[11rem] leading-[0.85] mt-2 mb-2 break-words w-full"
                            style={{
                                fontFamily: "var(--font-display)",
                                color: champion.color,
                                textShadow: `0 0 80px ${champion.color}80, 0 0 160px ${champion.color}40`,
                            }}
                        >
                            {champion.name.toUpperCase()}
                        </h1>

                        <div
                            className="h-px w-24"
                            style={{ background: `linear-gradient(to right, transparent, ${champion.color}, transparent)` }}
                        />

                        <p
                            className="text-[10px] tracking-[0.5em] text-zinc-700"
                            style={{ fontFamily: "var(--font-body)" }}
                        >
                            TAP TO DISMISS
                        </p>
                    </motion.div>

                    {/* CSS keyframe for rising particles */}
                    <style>{`
                        @keyframes vpl-rise {
                            0%   { opacity: 0; transform: translateY(20px) scale(0.5); }
                            30%  { opacity: 0.8; }
                            100% { opacity: 0; transform: translateY(-80px) scale(1.2); }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
