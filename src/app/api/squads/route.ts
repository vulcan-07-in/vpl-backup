import { NextResponse } from "next/server";
import { readSheet, writeSheet, clearSheet } from "@/lib/sheets";
import { SQUADS_GID } from "@/lib/tournament";
import { validateAdminRequest } from "@/lib/auth";

const SQUADS_RANGE = "Squads!A:D"; // Assuming column A to D has headers

export async function GET() {
    try {
        const rows = await readSheet(SQUADS_RANGE);
        if (rows.length === 0) return NextResponse.json([]);

        const headers = rows[0];
        const data = rows.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((h, i) => {
                obj[h] = row[i] || "";
            });
            return obj;
        });

        return NextResponse.json(data);
    } catch (e) {
        console.error("Squads GET Error:", e);
        return NextResponse.json({ error: "Failed to fetch squads" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json(); // Expected: Array of { TeamName, ShortName, Color, Players }

        if (!Array.isArray(body)) {
            return NextResponse.json({ error: "Payload must be an array" }, { status: 400 });
        }

        const headers = ["TeamName", "ShortName", "Color", "Players"];
        const rows = [headers];

        body.forEach(item => {
            rows.push([
                item.TeamName || "",
                item.ShortName || "",
                item.Color || "#EAB308",
                item.Players || ""
            ]);
        });

        // Clear existing and write new
        await clearSheet(SQUADS_RANGE);
        await writeSheet(SQUADS_RANGE, rows);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Squads POST Error:", e);
        return NextResponse.json({ error: "Failed to update squads" }, { status: 500 });
    }
}
