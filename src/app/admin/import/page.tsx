"use client";

import { useState } from "react";
import { Upload, Users, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";

export default function ImportPlayersPage() {
    const [csvText, setCsvText] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState("");
    
    // Column Mapping State
    const [headers, setHeaders] = useState<string[]>([]);
    const [step, setStep] = useState<1 | 2>(1);
    const [mapName, setMapName] = useState("");
    const [mapMobile, setMapMobile] = useState("");
    const [mapRole, setMapRole] = useState("");

    const handleParseHeaders = () => {
        if (!csvText.trim()) return setError("Please paste some CSV/TSV data first.");
        const lines = csvText.split("\n").filter(l => l.trim() !== "");
        if (lines.length < 2) return setError("Needs at least a header row and one data row.");
        
        const firstLine = lines[0];
        const separator = firstLine.includes("\t") ? "\t" : ",";
        const parsedHeaders = firstLine.split(separator).map(h => h.trim().replace(/"/g, ''));
        
        setHeaders(parsedHeaders);
        setStep(2);
        setError("");
    };

    const handleImport = async () => {
        if (!mapName || !mapMobile) {
            setError("Name and Mobile Number mappings are required.");
            return;
        }

        setError("");
        setLoading(true);
        setResults([]);

        try {
            const lines = csvText.split("\n").filter(l => l.trim() !== "");
            const separator = lines[0].includes("\t") ? "\t" : ",";
            
            // Skip header
            const dataRows = lines.slice(1);
            
            const processedData = dataRows.map(line => {
                // simple split (won't handle commas inside quotes perfectly, but works for basic sheets)
                const parts = line.split(separator).map(p => p.trim().replace(/"/g, ''));
                return {
                    name: parts[headers.indexOf(mapName)],
                    mobileNumber: parts[headers.indexOf(mapMobile)],
                    role: mapRole ? parts[headers.indexOf(mapRole)] : "UNKNOWN",
                    teamName: "UNSOLD" // Pre-auction default
                };
            }).filter(p => p.name && p.mobileNumber); // filter out blanks

            const res = await fetch("/api/admin/import-players", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ players: processedData })
            });

            const data = await res.json();

            if (res.ok) {
                setResults(data.imported);
                setStep(1);
                setCsvText("");
            } else {
                setError(data.error || "Failed to import");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center">
                        <Users className="text-amber-500 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Varchasva Account Import</h1>
                        <p className="text-zinc-500 text-sm tracking-widest uppercase mt-1">Upload Season 2 Registrations</p>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
                    {step === 1 && (
                        <>
                            <h2 className="text-sm font-bold tracking-widest text-zinc-400 mb-4 uppercase">1. Paste Google Forms Data</h2>
                            <p className="text-xs text-zinc-500 mb-4">
                                Paste directly from Google Sheets/Excel. Include the header row.
                            </p>
                            
                            <textarea 
                                className="w-full h-64 bg-black border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-300 focus:border-amber-500 focus:outline-none transition-colors mb-4"
                                placeholder="Timestamp&#9;Name&#9;Mobile Number&#9;Role&#10;10/05/2026 14:30&#9;Apoorv&#9;+919876543210&#9;Batsman"
                                value={csvText}
                                onChange={(e) => setCsvText(e.target.value)}
                            />

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-500 mb-4">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <span className="text-sm font-bold">{error}</span>
                                </div>
                            )}

                            <button 
                                onClick={handleParseHeaders}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                Next Step <ArrowRight className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 className="text-sm font-bold tracking-widest text-zinc-400 mb-4 uppercase">2. Map Columns</h2>
                            <p className="text-xs text-zinc-500 mb-6">
                                Tell us which column matches which data field. We will set their Team to "UNSOLD" automatically for the upcoming auction.
                            </p>

                            <div className="space-y-6 mb-8">
                                <div>
                                    <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">Player Name Column <span className="text-red-500">*</span></label>
                                    <select value={mapName} onChange={e => setMapName(e.target.value)} className="w-full bg-black border border-zinc-800 p-4 rounded-xl">
                                        <option value="">Select Column...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">Mobile Number Column <span className="text-red-500">*</span></label>
                                    <select value={mapMobile} onChange={e => setMapMobile(e.target.value)} className="w-full bg-black border border-zinc-800 p-4 rounded-xl">
                                        <option value="">Select Column...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">Role Column (Optional)</label>
                                    <select value={mapRole} onChange={e => setMapRole(e.target.value)} className="w-full bg-black border border-zinc-800 p-4 rounded-xl">
                                        <option value="">Select Column...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-500 mb-4">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <span className="text-sm font-bold">{error}</span>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold uppercase tracking-widest py-4 rounded-xl transition-colors text-white">Back</button>
                                <button 
                                    onClick={handleImport}
                                    disabled={loading}
                                    className="flex-[2] bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {loading ? "Processing Accounts..." : <><Upload className="w-5 h-5" /> Import & Generate Accounts</>}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {results.length > 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <h3 className="text-green-500 font-bold uppercase tracking-widest text-sm">Successfully Imported {results.length} Accounts</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-zinc-800 text-zinc-500">
                                        <th className="pb-2">ID</th>
                                        <th className="pb-2">Name</th>
                                        <th className="pb-2">Team</th>
                                        <th className="pb-2">Mobile</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((r, i) => (
                                        <tr key={i} className="border-b border-zinc-800/50">
                                            <td className="py-2 text-amber-500 font-mono">{r.accountId}</td>
                                            <td className="py-2 font-bold">{r.name}</td>
                                            <td className="py-2 text-zinc-400">{r.teamName}</td>
                                            <td className="py-2 text-zinc-500 font-mono">{r.mobileNumber}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
