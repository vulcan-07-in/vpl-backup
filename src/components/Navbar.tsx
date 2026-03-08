"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
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
    { href: "/squads", label: "SQUADS" },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);

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

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-8">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="text-xs font-semibold tracking-[0.25em] text-zinc-500 hover:text-white transition-colors"
                            style={{ fontFamily: "var(--font-heading)" }}
                        >
                            {l.label}
                        </Link>
                    ))}
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
