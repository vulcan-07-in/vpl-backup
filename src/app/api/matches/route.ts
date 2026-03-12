import { NextResponse } from "next/server";
import { readSheet, writeSheet, clearSheet } from "@/lib/sheets";
import { FIXTURES_CSV_URL, type Fixture } from "@/lib/tournament";
import { validateAdminRequest } from "@/lib/auth";

const FIXTURES_RANGE = "Fixtures!A:G";
const HEADER = ["MatchNo", "Stage", "Pool", "Team1", "Team2", "Winner", "SortOrder"];

// GET — proxy the public CSV so admin can load existing fixtures without CORS
export async function GET() {
    try {
        const res = await fetch(`${FIXTURES_CSV_URL}&t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return NextResponse.json([]);
        const csv = await res.text();

        // Parse CSV manually (lightweight, no papaparse on server)
        const lines = csv.trim().split("\n").filter(Boolean);
        if (lines.length <= 1) return NextResponse.json([]);

        const [headerLine, ...dataLines] = lines;
        const headers = headerLine.split(",").map(h => h.trim().replace(/^"|"$/g, ""));

        const col = (row: string[], key: string) => {
            const idx = headers.indexOf(key);
            return idx >= 0 ? (row[idx] ?? "").trim().replace(/^"|"$/g, "") : "";
        };

        const fixtures: Fixture[] = dataLines
            .filter(l => l.trim())
            .map(line => {
                const row = line.split(",");
                return {
                    matchNo: col(row, "MatchNo"),
                    stage: col(row, "Stage") as Fixture["stage"],
                    pool: (col(row, "Pool") || "-") as Fixture["pool"],
                    team1: col(row, "Team1"),
                    team2: col(row, "Team2"),
                    winner: col(row, "Winner"),
                    sortOrder: parseInt(col(row, "SortOrder") || "0", 10),
                };
            })
            .filter(f => f.matchNo)
            .sort((a, b) => a.sortOrder - b.sortOrder);

        return NextResponse.json(fixtures);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// POST — write full fixture list (admin only)
export async function POST(request: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const fixtures: Fixture[] = await request.json();
        const rows: string[][] = [
            HEADER,
            ...fixtures.map((f, i) => [
                f.matchNo,
                f.stage,
                f.pool,
                f.team1,
                f.team2,
                f.winner,
                String(i + 1),
            ]),
        ];

        await clearSheet(FIXTURES_RANGE);
        await writeSheet(FIXTURES_RANGE, rows);
        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("VPL Sheets Write Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
