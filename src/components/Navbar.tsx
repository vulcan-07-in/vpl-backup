"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

interface NavLink {
    href: string;
    label: string;
}

const links: NavLink[] = [
    { href: "/", label: "HOME" },
    { href: "/live", label: "LIVE MATCH" },
    { href: "/matches", label: "MATCHES" },
    { href: "/points", label: "STANDINGS" },
    { href: "/stats", label: "STATS" },
    { href: "/squads", label: "SQUADS" },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [isMatchLive, setIsMatchLive] = useState(false);

    useEffect(() => {
        const checkLive = async () => {
            try {
                const res = await fetch("/api/active-match");
                if (res.ok) {
                    const data = await res.json();
                    setIsMatchLive(!!data.activeMatchId);
                }
            } catch (e) {}
        };
        checkLive();
        const interval = setInterval(checkLive, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 glass-nav px-5 py-3 flex items-center justify-between" style={{ backdropFilter: 'blur(8px)' }}>
                {/* Brand & Logo */}
                <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setOpen(false)}>
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/10 group-hover:border-amber-500/50 transition-colors shadow-lg shrink-0">
                        <Image
                            src="/logo.jpg"
                            alt="Varchasva Phoenix Logo"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 36px, 72px"
                            priority
                        />
                    </div>
                    <span
                        className="text-[1.45rem] leading-none tracking-[0.15em] text-white group-hover:text-amber-400 transition-colors"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        VARCHASVA
                    </span>
                </Link>

                <div className="flex items-center gap-4">
                    {/* Desktop links */}
                    <div className="hidden md:flex items-center gap-8">
                        {links.map((l) => {
                            const isLiveLink = l.href === "/live";
                            return (
                                <Link
                                    key={l.href}
                                    href={l.href}
                                    className={`text-xs font-semibold tracking-[0.25em] transition-all relative ${
                                        isLiveLink && isMatchLive 
                                            ? "text-red-500 hover:text-red-400" 
                                            : "text-zinc-500 hover:text-white"
                                    }`}
                                    style={{ fontFamily: "var(--font-heading)" }}
                                >
                                    {l.label}
                                    {isLiveLink && isMatchLive && (
                                        <>
                                            <span className="absolute -top-1 -right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                            <span className="absolute inset-0 bg-red-500/20 blur-md rounded-full animate-pulse -z-10" />
                                        </>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Toggle menu"
                >
                    {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </nav>

            {/* Mobile slide-down menu */}
            {open && (
                <div className="fixed inset-0 z-40 flex flex-col pt-16" onClick={() => setOpen(false)}>
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
                    <nav className="relative z-10 flex flex-col items-center justify-center flex-1 gap-10">
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                onClick={() => setOpen(false)}
                                className="text-4xl tracking-[0.3em] text-zinc-300 hover:text-white transition-colors"
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </>
    );
}
