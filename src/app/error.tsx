"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("VPL Global Error Caught:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black text-center relative overflow-hidden">
            {/* Ambient background */}
            <div className="absolute w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 flex flex-col items-center max-w-md p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl"
            >
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.1em" }}>
                    SYSTEM ERROR
                </h1>

                <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
                    We encountered an issue fetching the latest tournament data from our servers. Please try again.
                </p>

                <button
                    onClick={() => reset()}
                    className="group flex items-center gap-3 px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300 text-sm font-semibold tracking-widest text-zinc-200"
                >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    RETRY CONNECTION
                </button>
            </motion.div>
        </div>
    );
}
