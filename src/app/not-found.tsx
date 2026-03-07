"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black text-center relative overflow-hidden">
            {/* Ambient background */}
            <div className="absolute w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 flex flex-col items-center"
            >
                <h1 className="text-[8rem] md:text-[12rem] font-black text-white/5 leading-none select-none" style={{ fontFamily: "var(--font-display)" }}>
                    404
                </h1>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[11px] tracking-[0.5em] text-amber-500 font-bold mb-3" style={{ fontFamily: "var(--font-body)" }}>
                        PAGE NOT FOUND
                    </p>
                    <h2 className="text-3xl md:text-4xl text-white mb-8" style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.05em" }}>
                        LOST IN THE OUTFIELD
                    </h2>

                    <Link
                        href="/"
                        className="group flex items-center gap-3 px-8 py-3.5 rounded-full border border-white/10 hover:border-amber-500/50 bg-white/5 hover:bg-amber-500/10 transition-all duration-300 text-xs font-semibold tracking-[0.2em] text-white"
                    >
                        <Home className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 transition-colors" />
                        RETURN TO HUB
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
