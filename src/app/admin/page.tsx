"use client";

import { useEffect, useState } from "react";
import { 
    Users, 
    Hammer, 
    FileUp, 
    LayoutDashboard, 
    Settings, 
    ChevronRight,
    Trophy,
    Gamepad2,
    ShieldCheck,
    Smartphone
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AdminHub() {
    const [stats, setStats] = useState({
        registered: 76,
        approved: 0,
        captains: 0,
        teams: 12
    });

    useEffect(() => {
        // Fetch real stats from our new tables
        async function fetchStats() {
            try {
                const res = await fetch('/api/admin/stats');
                if (res.ok) setStats(await res.json());
            } catch (e) {
                console.error("Failed to fetch stats", e);
            }
        }
        fetchStats();
    }, []);

    const cards = [
        {
            title: "Player Management",
            desc: "Approve registrants, assign tiers, and set captains.",
            icon: Users,
            href: "/admin/players",
            color: "amber",
            tag: "Approval Required"
        },
        {
            title: "Live Auction Engine",
            desc: "The real-time bidding war. Manage sets and the hammer.",
            icon: Hammer,
            href: "/admin/auction",
            color: "blue",
            tag: "Phase 3"
        },
        {
            title: "Import Utility",
            desc: "Upload Google Forms CSV data to the identity system.",
            icon: FileUp,
            href: "/admin/import",
            color: "emerald",
            tag: "S2 Setup"
        },
        {
            title: "Match Scorer",
            desc: "The professional ball-by-ball scoring interface.",
            icon: Smartphone,
            href: "/scorer",
            color: "purple",
            tag: "Live"
        }
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-28 pb-20 px-6">
            <div className="max-w-5xl mx-auto">
                
                {/* Header */}
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <ShieldCheck className="text-amber-500" size={24} />
                        </div>
                        <span className="text-xs font-black tracking-[0.3em] text-zinc-600 uppercase">Admin Command Center</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight">Varchasva Hub</h1>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {[
                        { label: "Registrants", val: stats.registered, color: "text-white" },
                        { label: "Approved", val: stats.approved, color: "text-emerald-500" },
                        { label: "Captains", val: stats.captains, color: "text-amber-500" },
                        { label: "Teams", val: stats.teams, color: "text-blue-500" },
                    ].map((s, i) => (
                        <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
                            <p className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase mb-2">{s.label}</p>
                            <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
                        </div>
                    ))}
                </div>

                {/* Navigation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cards.map((card, idx) => (
                        <Link key={idx} href={card.href} className="group">
                            <motion.div 
                                whileHover={{ y: -5 }}
                                className="h-full bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-8 hover:bg-zinc-900/50 transition-all relative overflow-hidden"
                            >
                                <div className={`inline-flex p-4 rounded-2xl bg-${card.color}-500/10 mb-8 group-hover:scale-110 transition-transform`}>
                                    <card.icon className={`text-${card.color}-500`} size={28} />
                                </div>
                                
                                <div className="absolute top-8 right-8">
                                    <span className="text-[10px] font-bold bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full tracking-widest uppercase">
                                        {card.tag}
                                    </span>
                                </div>

                                <h3 className="text-2xl font-bold mb-3">{card.title}</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed mb-6">{card.desc}</p>
                                
                                <div className="flex items-center gap-2 text-zinc-400 group-hover:text-white transition-colors text-xs font-bold tracking-widest">
                                    ENTER MODULE <ChevronRight size={14} />
                                </div>

                                {/* Subtle background glow */}
                                <div className={`absolute -bottom-12 -right-12 w-24 h-24 bg-${card.color}-500/10 blur-[60px] rounded-full`} />
                            </motion.div>
                        </Link>
                    ))}
                </div>

                {/* Footer Settings */}
                <div className="mt-16 pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-8">
                        <Link href="/admin/settings" className="text-xs font-bold text-zinc-600 hover:text-white transition-colors flex items-center gap-2">
                            <Settings size={14} /> LEAGUE SETTINGS
                        </Link>
                        <Link href="/admin/advanced" className="text-xs font-bold text-zinc-600 hover:text-white transition-colors flex items-center gap-2">
                            <LayoutDashboard size={14} /> ADVANCED CONFIG
                        </Link>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-800 uppercase tracking-tighter">VPL S2 Framework v2.1.0</p>
                </div>

            </div>
        </div>
    );
}
