"use client";

import { motion } from "framer-motion";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="flex flex-col items-center gap-6">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, ease: "linear", duration: 1.5 }}
                    className="relative w-16 h-16"
                >
                    <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-amber-500 opacity-80 shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                    <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-white/50 opacity-60"></div>
                </motion.div>
                <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="text-[10px] tracking-[0.5em] text-amber-500/80 uppercase font-bold"
                    style={{ fontFamily: "var(--font-body)" }}
                >
                    LOADING
                </motion.p>
            </div>
        </div>
    );
}
