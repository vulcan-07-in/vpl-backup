"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, GripVertical, Crown, Users } from "lucide-react";

interface Team {
    id: string;
    name: string;
    shortName: string;
    color: string;
    groupId: string;
    purse: number;
    captainId: string | null;
    captainName: string | null;
}

interface ApprovedPlayer {
    accountId: string;
    name: string;
    tier: string;
    isCaptain: boolean;
    teamName: string;
}

const GROUPS = ["A", "B", "C"] as const;

function TeamCard({
    team,
    approvedPlayers,
    onUpdate,
    onDelete,
    onAssignCaptain,
    onDragStart,
    dragging,
}: {
    team: Team;
    approvedPlayers: ApprovedPlayer[];
    onUpdate: (id: string, fields: Partial<Team>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onAssignCaptain: (teamId: string, captainAccountId: string | null) => Promise<void>;
    onDragStart: (id: string) => void;
    dragging: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [fields, setFields] = useState({ name: team.name, shortName: team.shortName, color: team.color, purse: team.purse });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Available captains: approved players who are not already captains of other teams
    const availableCaptains = approvedPlayers.filter(
        p => !p.isCaptain || p.teamName === team.name
    );

    const handleSave = async () => {
        setSaving(true);
        await onUpdate(team.id, fields);
        setSaving(false);
        setEditing(false);
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${team.name}"? This will unassign all their players.`)) return;
        setDeleting(true);
        await onDelete(team.id);
        setDeleting(false);
    };

    return (
        <div
            draggable
            onDragStart={() => onDragStart(team.id)}
            className={`bg-zinc-900 border rounded-2xl p-4 transition-all cursor-grab active:cursor-grabbing select-none ${
                dragging ? "opacity-40 border-amber-500 scale-95" : "border-zinc-800 hover:border-zinc-600"
            }`}
        >
            <div className="flex items-center gap-3 mb-3">
                <GripVertical size={16} className="text-zinc-600 shrink-0" />
                {editing ? (
                    <input
                        type="color"
                        value={fields.color}
                        onChange={e => setFields(f => ({ ...f, color: e.target.value }))}
                        className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent shrink-0"
                    />
                ) : (
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                )}
                {editing ? (
                    <div className="flex-1 flex gap-2">
                        <input
                            value={fields.name}
                            onChange={e => setFields(f => ({ ...f, name: e.target.value }))}
                            className="flex-[2] bg-black border border-zinc-700 rounded px-2 py-1 text-sm font-bold"
                            placeholder="Team Name"
                        />
                        <input
                            value={fields.shortName}
                            onChange={e => setFields(f => ({ ...f, shortName: e.target.value }))}
                            className="flex-1 bg-black border border-zinc-700 rounded px-2 py-1 text-sm font-mono"
                            placeholder="Short"
                            maxLength={5}
                        />
                    </div>
                ) : (
                    <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{team.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{team.shortName} · ₹{team.purse}</p>
                    </div>
                )}
            </div>

            {editing && (
                <div className="flex items-center gap-2 mb-3">
                    <label className="text-[10px] text-zinc-500 tracking-widest uppercase">Purse</label>
                    <input
                        type="number"
                        value={fields.purse}
                        onChange={e => setFields(f => ({ ...f, purse: parseInt(e.target.value, 10) || 0 }))}
                        className="bg-black border border-zinc-700 rounded px-2 py-1 text-sm font-mono text-emerald-400 w-28"
                    />
                </div>
            )}

            {/* Captain Assignment */}
            <div className="mb-3 flex items-center gap-2">
                <Crown size={14} className={team.captainName ? "text-amber-500" : "text-zinc-600"} />
                <select
                    value={team.captainId || ""}
                    onChange={e => onAssignCaptain(team.id, e.target.value || null)}
                    className={`flex-1 bg-black border rounded px-2 py-1.5 text-xs font-bold ${
                        team.captainName ? 'border-amber-500/30 text-amber-500' : 'border-zinc-700 text-zinc-400'
                    }`}
                >
                    <option value="">No Captain</option>
                    {availableCaptains.map(p => (
                        <option key={p.accountId} value={p.accountId}>{p.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex gap-2">
                {editing ? (
                    <>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                            <Check size={12} /> {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                            onClick={() => { setEditing(false); setFields({ name: team.name, shortName: team.shortName, color: team.color, purse: team.purse }); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setEditing(true)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1"
                        >
                            <Pencil size={12} /> Edit
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <Trash2 size={12} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function GroupDropZone({
    group,
    teams,
    approvedPlayers,
    onUpdate,
    onDelete,
    onAssignCaptain,
    draggingId,
    onDragStart,
    onDrop,
    onDragOver,
}: {
    group: string;
    teams: Team[];
    approvedPlayers: ApprovedPlayer[];
    onUpdate: (id: string, fields: Partial<Team>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onAssignCaptain: (teamId: string, captainAccountId: string | null) => Promise<void>;
    draggingId: string | null;
    onDragStart: (id: string) => void;
    onDrop: (group: string) => void;
    onDragOver: (e: React.DragEvent) => void;
}) {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div
            className={`flex-1 min-w-[240px] rounded-2xl border-2 transition-all p-4 ${
                isDragOver ? "border-amber-500 bg-amber-500/5" : "border-zinc-800 bg-zinc-950"
            }`}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); onDragOver(e); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { e.preventDefault(); setIsDragOver(false); onDrop(group); }}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black tracking-[0.3em] text-amber-500 uppercase">GROUP {group}</h3>
                <span className="text-xs text-zinc-600 font-mono">{teams.length} teams</span>
            </div>
            <div className="space-y-3 min-h-[80px]">
                {teams.length === 0 && (
                    <div className="h-16 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-zinc-700 text-xs">
                        Drop teams here
                    </div>
                )}
                {teams.map(team => (
                    <TeamCard
                        key={team.id}
                        team={team}
                        approvedPlayers={approvedPlayers}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onAssignCaptain={onAssignCaptain}
                        onDragStart={onDragStart}
                        dragging={draggingId === team.id}
                    />
                ))}
            </div>
        </div>
    );
}

export default function TeamsClient() {
    const router = useRouter();
    const [authed, setAuthed] = useState(false);
    const [teams, setTeams] = useState<Team[]>([]);
    const [approvedPlayers, setApprovedPlayers] = useState<ApprovedPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [draggingId, setDraggingId] = useState<string | null>(null);

    // New team form
    const [newTeam, setNewTeam] = useState({ name: "", shortName: "", color: "#EAB308", groupId: "A", purse: 10000, captainAccountId: "" });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const fetchTeams = async () => {
        try {
            const res = await fetch("/api/admin/teams");
            const data = await res.json();
            if (res.ok) setTeams(data);
            else setError(data.error);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlayers = async () => {
        try {
            const res = await fetch("/api/admin/players/approved");
            const data = await res.json();
            if (res.ok) setApprovedPlayers(data);
        } catch (e: any) {
            console.error("Failed to fetch players:", e);
        }
    };

    useEffect(() => {
        fetch("/api/admin/check").then(res => {
            if (!res.ok) { router.replace("/admin"); return; }
            setAuthed(true);
            fetchTeams();
            fetchPlayers();
        });
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError("");
        if (!newTeam.name.trim() || !newTeam.shortName.trim()) {
            setCreateError("Name and Short Name are required");
            return;
        }
        setCreating(true);
        try {
            const res = await fetch("/api/admin/teams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create", ...newTeam }),
            });
            const data = await res.json();
            if (res.ok && data.team) {
                setTeams(prev => [...prev, data.team]);
                setNewTeam({ name: "", shortName: "", color: "#EAB308", groupId: "A", purse: 10000, captainAccountId: "" });
                fetchPlayers(); // Refresh available captains
            } else {
                setCreateError(data.error || "Failed to create team");
            }
        } catch (e: any) {
            setCreateError(e.message);
        }
        setCreating(false);
    };

    const handleUpdate = async (id: string, fields: Partial<Team>) => {
        const res = await fetch("/api/admin/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update", teamId: id, ...fields }),
        });
        const data = await res.json();
        if (res.ok) {
            setTeams(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
        } else {
            alert("❌ " + (data.error || "Update failed"));
        }
    };

    const handleDelete = async (id: string) => {
        const res = await fetch("/api/admin/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", teamId: id }),
        });
        const data = await res.json();
        if (res.ok) {
            setTeams(prev => prev.filter(t => t.id !== id));
            fetchPlayers(); // Refresh available captains
        } else {
            alert("❌ " + (data.error || "Delete failed"));
        }
    };

    const handleAssignCaptain = async (teamId: string, captainAccountId: string | null) => {
        const res = await fetch("/api/admin/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "assign_captain", teamId, captainAccountId }),
        });
        if (res.ok) {
            // Refresh both teams and players
            fetchTeams();
            fetchPlayers();
        } else {
            const data = await res.json();
            alert("❌ " + (data.error || "Captain assignment failed"));
        }
    };

    const handleDrop = async (targetGroup: string) => {
        if (!draggingId) return;
        const team = teams.find(t => t.id === draggingId);
        if (!team || team.groupId === targetGroup) { setDraggingId(null); return; }

        setTeams(prev => prev.map(t => t.id === draggingId ? { ...t, groupId: targetGroup } : t));
        setDraggingId(null);

        const res = await fetch("/api/admin/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update", teamId: draggingId, groupId: targetGroup }),
        });
        if (!res.ok) {
            alert("❌ Failed to update group");
            fetchTeams();
        }
    };

    const teamsByGroup = (group: string) => teams.filter(t => t.groupId === group);

    if (!authed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-16 px-6 font-sans">
            <div className="max-w-7xl mx-auto">
                <Link href="/admin" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors text-sm font-bold tracking-widest uppercase">
                    <ArrowLeft size={16} /> Back to Hub
                </Link>

                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tight">Team Management</h1>
                        <p className="text-zinc-500 text-sm mt-1 tracking-wide">Create teams · Assign captains · Drag between groups</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-zinc-400 text-sm font-mono">{teams.length} teams total</span>
                    </div>
                </div>

                {/* Create Team Form */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10">
                    <h2 className="text-sm font-black tracking-widest text-zinc-400 uppercase mb-4 flex items-center gap-2">
                        <Plus size={14} className="text-amber-500" /> Create New Team
                    </h2>
                    <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
                        <div className="flex-[2] min-w-[160px]">
                            <label className="text-[10px] text-zinc-600 tracking-widest uppercase block mb-1">Team Name *</label>
                            <input
                                type="text"
                                value={newTeam.name}
                                onChange={e => setNewTeam(n => ({ ...n, name: e.target.value }))}
                                placeholder="e.g. Royal Challengers"
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm font-bold focus:border-amber-500 outline-none transition-colors"
                                required
                            />
                        </div>
                        <div className="w-28">
                            <label className="text-[10px] text-zinc-600 tracking-widest uppercase block mb-1">Short Name *</label>
                            <input
                                type="text"
                                value={newTeam.shortName}
                                onChange={e => setNewTeam(n => ({ ...n, shortName: e.target.value.toUpperCase() }))}
                                placeholder="RCB"
                                maxLength={5}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono font-bold focus:border-amber-500 outline-none transition-colors"
                                required
                            />
                        </div>
                        <div className="w-20">
                            <label className="text-[10px] text-zinc-600 tracking-widest uppercase block mb-1">Color</label>
                            <input
                                type="color"
                                value={newTeam.color}
                                onChange={e => setNewTeam(n => ({ ...n, color: e.target.value }))}
                                className="w-full h-[46px] rounded-xl cursor-pointer border border-zinc-700 bg-black px-1"
                            />
                        </div>
                        <div className="w-28">
                            <label className="text-[10px] text-zinc-600 tracking-widest uppercase block mb-1">Group</label>
                            <select
                                value={newTeam.groupId}
                                onChange={e => setNewTeam(n => ({ ...n, groupId: e.target.value }))}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-3 text-sm font-bold focus:border-amber-500 outline-none transition-colors"
                            >
                                <option value="A">Group A</option>
                                <option value="B">Group B</option>
                                <option value="C">Group C</option>
                            </select>
                        </div>
                        <div className="w-32">
                            <label className="text-[10px] text-zinc-600 tracking-widest uppercase block mb-1">Captain</label>
                            <select
                                value={newTeam.captainAccountId}
                                onChange={e => setNewTeam(n => ({ ...n, captainAccountId: e.target.value }))}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-3 text-sm font-bold focus:border-amber-500 outline-none transition-colors"
                            >
                                <option value="">None</option>
                                {approvedPlayers.filter(p => !p.isCaptain).map(p => (
                                    <option key={p.accountId} value={p.accountId}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={creating}
                            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black px-6 py-3 rounded-xl tracking-widest uppercase transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus size={16} /> {creating ? "Creating..." : "Create Team"}
                        </button>
                    </form>
                    {createError && (
                        <p className="text-red-400 text-sm font-bold mt-3">❌ {createError}</p>
                    )}
                </div>

                {/* Group Boards */}
                {loading ? (
                    <div className="flex items-center justify-center h-48 text-zinc-600">Loading teams...</div>
                ) : error ? (
                    <div className="text-red-400 text-center py-12">❌ {error}</div>
                ) : (
                    <>
                        <p className="text-xs text-zinc-600 tracking-widest uppercase mb-4 text-center">
                            ⟵ Drag teams between groups to reassign →
                        </p>
                        <div className="flex gap-4 items-start flex-wrap">
                            {GROUPS.map(group => (
                                <GroupDropZone
                                    key={group}
                                    group={group}
                                    teams={teamsByGroup(group)}
                                    approvedPlayers={approvedPlayers}
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                    onAssignCaptain={handleAssignCaptain}
                                    draggingId={draggingId}
                                    onDragStart={setDraggingId}
                                    onDrop={handleDrop}
                                    onDragOver={e => e.preventDefault()}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
