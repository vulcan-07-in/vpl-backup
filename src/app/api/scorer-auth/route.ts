import { NextResponse } from 'next/server';

// Temporary fixed PIN for scorers. In a real app, this could be in .env
// We keep it simple since it's just to prevent accidental access from players.
const SCORER_PIN = process.env.SCORER_PIN || "2025";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pin } = body;

        if (pin === SCORER_PIN) {
            // Success. We return a simple token that the client will store.
            // For VPL, a simple mock token is enough to unlock the UI locally.
            return NextResponse.json({ success: true, token: "vpl_scorer_authenticated" });
        } else {
            return NextResponse.json({ error: "Invalid Scorer PIN" }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
}
