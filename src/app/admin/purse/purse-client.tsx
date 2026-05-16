"use client";

import { useState, useEffect, useRef } from "react";
import { Coins, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Team {
    id: string;
    name: string;
    color: string;
    shortName: string;
}

function TeamPurseRow({ team, savedPurse, onSave }: { team: Team, savedPurse: number, onSave: (id: string, amount: number) => Promise<void> }) {
    const [val, setVal] = useState(savedPurse.toString());
    const [saving, setSaving] = useState(false);

    // Sync if parent purse changes after initial load
    const prevSavedRef = useRef(savedPurse);
    useEffect(() => {
        if (prevSavedRef.current !== savedPurse) {
            setVal(savedPurse.toString());
            prevSavedRef.current = savedPurse;
        }
    }, [savedPurse]);

    const amount = parseInt(val, 10);
    const isDirty = amount !== savedPurse;

    const handleClick = async () => {
        setSaving(true);
        await onSave(team.id, amount);
        setSaving(false);
    };

    return (
        <div className="flex items-center justify-between p-4 bg-black border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                <div>
                    <p className="font-bold">{team.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-widest">{team.shortName}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 font-mono text-emerald-400 font-bold w-32 text-right"
                />
                <button
                    onClick={handleClick}
                    disabled={saving || !isDirty || isNaN(amount)}
                    className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black px-4 py-2 rounded-lg font-bold transition-all w-24 flex justify-center"
                >
                    {saving ? "Saving..." : isDirty ? "Save" : "Saved ✓"}
                </button>
            </div>
        </div>
    );
}

export default function PurseClient({ initialTeams }: { initialTeams: Team[] }) {
    const [purses, setPurses] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [globalMsg, setGlobalMsg] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/purse")
            .then(r => r.json())
            .then(data => {
                if (data && !data.error) {
                    const parsed: Record<string, number> = {};
                    for (const k in data) parsed[k] = parseInt(data[k], 10);
                    setPurses(parsed);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSaveAll = async () => {
        setGlobalMsg("Saving all...");
        try {
            await Promise.all(
                initialTeams.map(t =>
                    fetch("/api/admin/purse", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ teamId: t.id, purse: purses[t.id] ?? 10000 })
                    })
                )
            );
            setGlobalMsg("All saved ✓");
            setTimeout(() => setGlobalMsg(null), 2000);
        } catch {
            setGlobalMsg("Error saving.");
        }
    };

    const handleSave = async (teamId: string, amount: number) => {
        const res = await fetch("/api/admin/purse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamId, purse: amount })
        });
        if (res.ok) {
            setPurses(prev => ({ ...prev, [teamId]: amount }));
        } else {
            alert("Failed to save purse.");
        }
    };

    if (loading) return <div className="p-12 text-center text-zinc-500">Loading...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans pt-24">
            <div className="max-w-4xl mx-auto">
                <Link href="/admin" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors text-sm font-bold tracking-widest uppercase">
                    <ArrowLeft size={16} /> Back to Hub
                </Link>

                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center">
                            <Coins className="text-amber-500 w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tight">Team Purse Setup</h1>
                            <p className="text-zinc-500 text-sm tracking-widest uppercase mt-1">Configure starting budgets for auction</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveAll}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold tracking-widest transition-all"
                    >
                        {globalMsg || "SAVE ALL"}
                    </button>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
                    {initialTeams.map(team => (
                        <TeamPurseRow
                            key={team.id}
                            team={team}
                            savedPurse={purses[team.id] ?? 10000}
                            onSave={handleSave}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
