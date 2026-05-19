"use client";

import { useState, useRef } from "react";
import { Upload, Users, ShieldAlert, CheckCircle2, ArrowRight, FileSpreadsheet, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

interface ParsedPlayer {
    name: string;
    tier: string;
    role: string;
    gender: string;
    contactNumber: string;
}

export default function ImportPlayersPage() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [overwriteMode, setOverwriteMode] = useState(true);

    // Raw data from file/paste
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<string[][]>([]);
    const [fileName, setFileName] = useState("");

    // Column mapping
    const [mapName, setMapName] = useState("");
    const [mapTier, setMapTier] = useState("");
    const [mapRole, setMapRole] = useState("");
    const [mapGender, setMapGender] = useState("");
    const [mapContact, setMapContact] = useState("");

    // Results
    const [results, setResults] = useState<any[]>([]);
    const [confirmPending, setConfirmPending] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Parse Excel/CSV file
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setError("");

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

                if (jsonData.length < 2) {
                    setError("File must have at least a header row and one data row.");
                    return;
                }

                const parsedHeaders = jsonData[0].map(h => String(h).trim());
                const dataRows = jsonData.slice(1).filter(row => row.some(cell => String(cell).trim() !== ""));

                setHeaders(parsedHeaders);
                setRows(dataRows.map(r => r.map(c => String(c).trim())));

                // Auto-detect column mapping
                parsedHeaders.forEach((h, i) => {
                    const lower = h.toLowerCase();
                    if (lower.includes("player name") || lower === "name") setMapName(h);
                    else if (lower === "tier") setMapTier(h);
                    else if (lower === "role") setMapRole(h);
                    else if (lower === "gender") setMapGender(h);
                    else if (lower.includes("contact") || lower.includes("phone") || lower.includes("mobile")) setMapContact(h);
                });

                setStep(2);
            } catch (err: any) {
                setError("Failed to parse file: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Handle CSV/TSV paste
    const [csvText, setCsvText] = useState("");
    const handleParsePaste = () => {
        if (!csvText.trim()) { setError("Paste some data first."); return; }
        const lines = csvText.split("\n").filter(l => l.trim() !== "");
        if (lines.length < 2) { setError("Need at least a header row and one data row."); return; }

        const separator = lines[0].includes("\t") ? "\t" : ",";
        const parsedHeaders = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
        const dataRows = lines.slice(1).map(line => line.split(separator).map(p => p.trim().replace(/"/g, '')));

        setHeaders(parsedHeaders);
        setRows(dataRows);
        setFileName("Pasted Data");

        // Auto-detect
        parsedHeaders.forEach(h => {
            const lower = h.toLowerCase();
            if (lower.includes("player name") || lower === "name") setMapName(h);
            else if (lower === "tier") setMapTier(h);
            else if (lower === "role") setMapRole(h);
            else if (lower === "gender") setMapGender(h);
            else if (lower.includes("contact") || lower.includes("phone") || lower.includes("mobile")) setMapContact(h);
        });

        setStep(2);
        setError("");
    };

    // Import to database
    const handleImport = async () => {
        if (!mapName) { setError("Player Name mapping is required."); return; }

        const nameIdx = headers.indexOf(mapName);
        const tierIdx = mapTier ? headers.indexOf(mapTier) : -1;
        const roleIdx = mapRole ? headers.indexOf(mapRole) : -1;
        const genderIdx = mapGender ? headers.indexOf(mapGender) : -1;
        const contactIdx = mapContact ? headers.indexOf(mapContact) : -1;

        const processedData: ParsedPlayer[] = rows
            .map(row => ({
                name: row[nameIdx] || "",
                tier: tierIdx >= 0 ? (row[tierIdx] || "TIER 2").toUpperCase() : "TIER 2",
                role: roleIdx >= 0 ? (row[roleIdx] || "All Rounder") : "All Rounder",
                gender: genderIdx >= 0 ? (row[genderIdx] || "Male") : "Male",
                contactNumber: contactIdx >= 0 ? (row[contactIdx] || "") : "",
            }))
            .filter(p => p.name.trim() !== "");

        if (processedData.length === 0) { setError("No valid players found."); return; }

        // Show in-UI confirmation instead of window.confirm()
        if (overwriteMode && !confirmPending) {
            setConfirmPending(true);
            return;
        }
        setConfirmPending(false);

        setError("");
        setLoading(true);
        setResults([]);

        try {
            const res = await fetch("/api/admin/import-players", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ players: processedData, overwrite: overwriteMode })
            });

            const data = await res.json();

            if (res.ok) {
                setResults(data.imported);
                setStep(3);
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
        <div className="min-h-screen bg-black text-white p-8 font-sans pt-24">
            <div className="max-w-4xl mx-auto">
                <Link href="/admin" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors text-sm font-bold tracking-widest uppercase">
                    <ArrowLeft size={16} /> Back to Hub
                </Link>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center">
                        <Users className="text-amber-500 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Player Data Import</h1>
                        <p className="text-zinc-500 text-sm tracking-widest uppercase mt-1">Upload Excel / Paste CSV · Season 2</p>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-3 mb-8">
                    {[1, 2, 3].map(s => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                                step >= s ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-500'
                            }`}>
                                {s === 3 ? '✓' : s}
                            </div>
                            <span className={`text-xs font-bold tracking-widest uppercase ${step >= s ? 'text-white' : 'text-zinc-600'}`}>
                                {s === 1 ? 'Upload' : s === 2 ? 'Map & Import' : 'Done'}
                            </span>
                            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-amber-500' : 'bg-zinc-800'}`} />}
                        </div>
                    ))}
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
                    {step === 1 && (
                        <>
                            <h2 className="text-sm font-bold tracking-widest text-zinc-400 mb-4 uppercase">1. Upload Player Data</h2>

                            {/* Overwrite toggle */}
                            <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 border ${overwriteMode ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-800 border-zinc-700'}`}>
                                <input type="checkbox" id="overwriteCheck" checked={overwriteMode} onChange={e => setOverwriteMode(e.target.checked)} className="mt-0.5 w-4 h-4 accent-red-500" />
                                <label htmlFor="overwriteCheck" className="text-sm cursor-pointer">
                                    <span className={`font-black tracking-widest ${overwriteMode ? 'text-red-400' : 'text-zinc-400'}`}>OVERWRITE MODE</span>
                                    <span className="text-zinc-500 ml-2 text-xs">{overwriteMode ? '— Deletes ALL existing players and re-imports.' : '— Appends to existing data.'}</span>
                                </label>
                            </div>

                            {/* File Upload */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-zinc-700 hover:border-amber-500/50 rounded-2xl p-12 text-center cursor-pointer transition-all group mb-6"
                            >
                                <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                                <p className="text-lg font-bold mb-2">Drop Excel file or click to upload</p>
                                <p className="text-zinc-500 text-sm">Supports .xlsx, .xls, .csv files</p>
                                {fileName && <p className="text-amber-500 text-sm font-bold mt-4">📄 {fileName}</p>}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv,.tsv"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            {/* Or paste */}
                            <div className="relative mb-6">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="h-px flex-1 bg-zinc-800" />
                                    <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Or Paste Data</span>
                                    <div className="h-px flex-1 bg-zinc-800" />
                                </div>
                                <textarea
                                    className="w-full h-40 bg-black border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-300 focus:border-amber-500 focus:outline-none transition-colors"
                                    placeholder="Paste from Google Sheets / Excel (include header row)..."
                                    value={csvText}
                                    onChange={(e) => setCsvText(e.target.value)}
                                />
                                {csvText && (
                                    <button
                                        onClick={handleParsePaste}
                                        className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                    >
                                        Parse Pasted Data <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-500">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <span className="text-sm font-bold">{error}</span>
                                </div>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 className="text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">2. Map Columns & Preview</h2>
                            <p className="text-xs text-zinc-500 mb-6">
                                Found <span className="text-amber-500 font-bold">{rows.length}</span> players from <span className="text-amber-500 font-bold">{fileName}</span>. Map your columns below.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div>
                                    <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">Player Name <span className="text-red-500">*</span></label>
                                    <select value={mapName} onChange={e => setMapName(e.target.value)} className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm">
                                        <option value="">Select Column...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">Tier</label>
                                    <select value={mapTier} onChange={e => setMapTier(e.target.value)} className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm">
                                        <option value="">Select Column (optional)...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">Role</label>
                                    <select value={mapRole} onChange={e => setMapRole(e.target.value)} className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm">
                                        <option value="">Select Column (optional)...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">Gender</label>
                                    <select value={mapGender} onChange={e => setMapGender(e.target.value)} className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm">
                                        <option value="">Select Column (optional)...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">Contact Number</label>
                                    <select value={mapContact} onChange={e => setMapContact(e.target.value)} className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm">
                                        <option value="">Select Column (optional)...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden mb-6">
                                <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                                    <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Preview (first 5 rows)</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-zinc-800 text-zinc-500">
                                                <th className="p-3 text-left">#</th>
                                                <th className="p-3 text-left">Name</th>
                                                <th className="p-3 text-left">Tier</th>
                                                <th className="p-3 text-left">Role</th>
                                                <th className="p-3 text-left">Gender</th>
                                                <th className="p-3 text-left">Contact</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.slice(0, 5).map((row, i) => {
                                                const nameIdx = headers.indexOf(mapName);
                                                const tierIdx = mapTier ? headers.indexOf(mapTier) : -1;
                                                const roleIdx = mapRole ? headers.indexOf(mapRole) : -1;
                                                const genderIdx = mapGender ? headers.indexOf(mapGender) : -1;
                                                const contactIdx = mapContact ? headers.indexOf(mapContact) : -1;
                                                return (
                                                    <tr key={i} className="border-b border-zinc-800/50">
                                                        <td className="p-3 text-zinc-600">{i + 1}</td>
                                                        <td className="p-3 font-bold text-white">{nameIdx >= 0 ? row[nameIdx] : '—'}</td>
                                                        <td className="p-3"><span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] font-bold">{tierIdx >= 0 ? row[tierIdx] : 'TIER 2'}</span></td>
                                                        <td className="p-3 text-zinc-400">{roleIdx >= 0 ? row[roleIdx] : '—'}</td>
                                                        <td className="p-3 text-zinc-400">{genderIdx >= 0 ? row[genderIdx] : '—'}</td>
                                                        <td className="p-3 text-zinc-500 font-mono">{contactIdx >= 0 ? row[contactIdx] : '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-500 mb-4">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <span className="text-sm font-bold">{error}</span>
                                </div>
                            )}

                            {/* In-UI overwrite confirmation banner */}
                            {confirmPending && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-4">
                                    <p className="text-red-400 font-black uppercase tracking-widest text-sm mb-1">⚠️ Overwrite Confirmation</p>
                                    <p className="text-zinc-300 text-sm mb-4">This will <span className="text-red-400 font-bold">DELETE ALL existing Season 2 player data</span> and re-import <span className="text-amber-400 font-bold">{rows.length} players</span>. Are you sure?</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setConfirmPending(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest py-3 rounded-xl transition-colors">
                                            Cancel
                                        </button>
                                        <button onClick={handleImport} className="flex-[2] bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest py-3 rounded-xl transition-colors">
                                            Yes, Delete & Re-Import
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold uppercase tracking-widest py-4 rounded-xl transition-colors text-white">Back</button>
                                <button
                                    onClick={handleImport}
                                    disabled={loading || !mapName || confirmPending}
                                    className="flex-[2] bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {loading ? "Importing..." : <><Upload className="w-5 h-5" /> Import {rows.length} Players</>}
                                </button>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div className="flex items-center gap-2 mb-6">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                <h3 className="text-emerald-500 font-bold uppercase tracking-widest text-lg">Successfully Imported {results.length} Players</h3>
                            </div>
                            <p className="text-zinc-500 text-sm mb-6">All players are set to <span className="text-amber-500 font-bold">UNAPPROVED</span> by default. Go to Player Management to approve them for the auction pool.</p>

                            <div className="max-h-96 overflow-y-auto bg-black border border-zinc-800 rounded-xl">
                                <table className="w-full text-xs text-left">
                                    <thead className="sticky top-0 bg-zinc-900">
                                        <tr className="border-b border-zinc-800 text-zinc-500">
                                            <th className="p-3">ID</th>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Tier</th>
                                            <th className="p-3">Role</th>
                                            <th className="p-3">Gender</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((r, i) => (
                                            <tr key={i} className="border-b border-zinc-800/50">
                                                <td className="p-3 text-amber-500 font-mono">{r.accountId}</td>
                                                <td className="p-3 font-bold">{r.name}</td>
                                                <td className="p-3"><span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] font-bold">{r.tier}</span></td>
                                                <td className="p-3 text-zinc-400">{r.role}</td>
                                                <td className="p-3 text-zinc-400">{r.gender}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button onClick={() => { setStep(1); setResults([]); setCsvText(""); setFileName(""); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold uppercase tracking-widest py-4 rounded-xl transition-colors">
                                    Import More
                                </button>
                                <Link href="/admin/players" className="flex-[2] bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-center">
                                    Go to Player Management <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
