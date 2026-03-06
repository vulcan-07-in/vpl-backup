"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { X, ArrowRight } from "lucide-react";

// Google Sheets → CSV export URL (sheet must be publicly viewable)
const SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/12cbvXQkyWZWor1EYPCUljKi6so1-CANOgyQUzwZFgro/export?format=csv&gid=667574756";

interface Player {
    name: string;
    role: string;
    price: string;
}

interface TeamData {
    TeamName: string;
    ShortName: string;
    Color: string;
    Players: string;
}

interface Team {
    teamName: string;
    shortName: string;
    color: string;
    players: Player[];
}

const ROLE_LABEL: Record<string, string> = {
    Batsman: "BAT",
    Bowler: "BOWL",
    "All Rounder": "AR",
    "All-Rounder": "AR",
    Wicketkeeper: "WK",
    WK: "WK",
};

export default function SquadsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    useEffect(() => {
        Papa.parse<TeamData>(SHEET_CSV_URL, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: ({ data }) => {
                setTeams(
                    data.map((row) => ({
                        teamName: row.TeamName || "Unknown",
                        shortName: row.ShortName || "UNK",
                        color: row.Color || "#EAB308",
                        players: row.Players
                            ? row.Players.split(",").map((p) => {
                                const [name, role, price] = p.trim().split(":");
                                return {
                                    name: name?.trim() ?? "Unknown",
                                    role: role?.trim() ?? "-",
                                    price: price?.trim() ?? "-",
                                };
                            })
                            : [],
                    }))
                );
                setLoading(false);
            },
            error: () => setLoading(false),
        });
    }, []);

    return (
        <>
            <main className="min-h-screen pt-24 pb-16 px-4 md:pt-28">
                <div className="max-w-4xl mx-auto">

                    {/* Page Header */}
                    <div className="mb-12 md:mb-16">
                        <p
                            className="text-[11px] tracking-[0.5em] text-zinc-600 mb-3"
                            style={{ fontFamily: "var(--font-body)" }}
                        >
                            VARCHASVA PREMIER LEAGUE
                        </p>
                        <h1
                            className="text-6xl md:text-8xl text-white leading-none"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            SQUADS
                        </h1>
                        <div className="mt-5 flex items-center gap-4">
                            <div className="h-px w-8 bg-amber-500" />
                            <span className="text-xs text-zinc-700 tracking-widest">
                                {loading ? "—" : `${teams.length} TEAMS`}
                            </span>
                        </div>
                    </div>

                    {/* Loading */}
                    {loading ? (
                        <div className="flex items-center gap-4 py-24">
                            <div className="w-5 h-5 rounded-full border border-white/10 border-t-amber-500 animate-spin" />
                            <span
                                className="text-xs tracking-[0.4em] text-zinc-700"
                                style={{ fontFamily: "var(--font-body)" }}
                            >
                                FETCHING SQUADS
                            </span>
                        </div>
                    ) : (
                        /* Team List — editorial rows */
                        <div className="space-y-px">
                            {teams.map((team, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedTeam(team)}
                                    className="group w-full flex items-center gap-0 text-left focus:outline-none"
                                >
                                    {/* Team color accent bar */}
                                    <div
                                        className="w-0.5 self-stretch shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                                        style={{ backgroundColor: team.color }}
                                    />

                                    <div className="flex-1 flex items-center justify-between px-5 md:px-8 py-5 md:py-6 border-b border-white/[0.04] group-hover:bg-white/[0.02] transition-colors">
                                        {/* Left: index + names */}
                                        <div className="flex items-center gap-5 md:gap-8 min-w-0">
                                            {/* Index number */}
                                            <span
                                                className="text-xs text-zinc-800 w-5 shrink-0 text-right tabular-nums"
                                                style={{ fontFamily: "var(--font-mono)" }}
                                            >
                                                {String(idx + 1).padStart(2, "0")}
                                            </span>

                                            {/* Short name pill */}
                                            <span
                                                className="hidden sm:block text-[10px] font-bold tracking-widest px-2 py-1 rounded shrink-0"
                                                style={{
                                                    color: team.color,
                                                    backgroundColor: `${team.color}12`,
                                                    fontFamily: "var(--font-body)",
                                                }}
                                            >
                                                {team.shortName}
                                            </span>

                                            {/* Full team name */}
                                            <h2
                                                className="text-xl md:text-2xl lg:text-3xl text-white group-hover:text-amber-100 transition-colors truncate"
                                                style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
                                            >
                                                {team.teamName}
                                            </h2>
                                        </div>

                                        {/* Right: player count + arrow */}
                                        <div className="flex items-center gap-4 md:gap-6 shrink-0 ml-4">
                                            <span
                                                className="hidden md:block text-xs text-zinc-700 tracking-widest"
                                                style={{ fontFamily: "var(--font-body)" }}
                                            >
                                                {team.players.length} PLAYERS
                                            </span>
                                            <ArrowRight
                                                className="w-4 h-4 text-zinc-700 group-hover:text-amber-400 group-hover:translate-x-1 transition-all duration-200"
                                            />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* ── Squad Modal ─────────────────────────────────────────────── */}
            {selectedTeam && (
                <div
                    className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
                    onClick={() => setSelectedTeam(null)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

                    {/* Panel */}
                    <div
                        className="relative w-full md:max-w-xl bg-zinc-950 border-t md:border md:rounded-2xl overflow-hidden"
                        style={{ borderColor: `${selectedTeam.color}25` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Thin color bar at top */}
                        <div className="h-[2px] w-full" style={{ backgroundColor: selectedTeam.color }} />

                        {/* Modal Header */}
                        <div className="px-6 pt-6 pb-5 flex items-start justify-between gap-4 border-b border-white/[0.05]">
                            <div className="min-w-0">
                                <p
                                    className="text-[10px] tracking-[0.5em] text-zinc-600 mb-1"
                                    style={{ fontFamily: "var(--font-body)" }}
                                >
                                    {selectedTeam.shortName} · {selectedTeam.players.length} PLAYERS
                                </p>
                                <h2
                                    className="text-3xl md:text-4xl text-white leading-none"
                                    style={{ fontFamily: "var(--font-display)" }}
                                >
                                    {selectedTeam.teamName.toUpperCase()}
                                </h2>
                            </div>
                            <button
                                onClick={() => setSelectedTeam(null)}
                                className="mt-1 p-2 text-zinc-700 hover:text-white transition-colors shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Player Roster */}
                        <div className="max-h-[55vh] overflow-y-auto">
                            {selectedTeam.players.map((player, pIdx) => (
                                <div
                                    key={pIdx}
                                    className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                                >
                                    {/* Row number */}
                                    <span
                                        className="text-xs text-zinc-800 w-5 text-right shrink-0 tabular-nums"
                                        style={{ fontFamily: "var(--font-mono)" }}
                                    >
                                        {String(pIdx + 1).padStart(2, "0")}
                                    </span>

                                    {/* Player name */}
                                    <span
                                        className="flex-1 text-base text-white font-medium truncate"
                                        style={{ fontFamily: "var(--font-body)" }}
                                    >
                                        {player.name}
                                    </span>

                                    {/* Role pill */}
                                    <span
                                        className="text-[10px] font-bold tracking-widest text-zinc-600 shrink-0 hidden sm:block"
                                        style={{ fontFamily: "var(--font-body)" }}
                                    >
                                        {ROLE_LABEL[player.role] ?? player.role.toUpperCase().slice(0, 4)}
                                    </span>

                                    {/* Price */}
                                    <span
                                        className="text-sm font-bold text-amber-400 shrink-0 text-right"
                                        style={{ fontFamily: "var(--font-mono)" }}
                                    >
                                        {player.price}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 flex items-center justify-between">
                            <span
                                className="text-[10px] tracking-widest text-zinc-800"
                                style={{ fontFamily: "var(--font-body)" }}
                            >
                                VARCHASVA PREMIER LEAGUE
                            </span>
                            <button
                                onClick={() => setSelectedTeam(null)}
                                className="text-[10px] tracking-widest text-zinc-700 hover:text-white transition-colors"
                                style={{ fontFamily: "var(--font-body)" }}
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
