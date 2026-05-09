import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { players } = body;

        if (!players || !Array.isArray(players)) {
            return NextResponse.json({ error: "Invalid data provided" }, { status: 400 });
        }

        const results = [];

        // Fetch current count to generate VAR-XXX IDs
        const { count, error: countErr } = await supabase
            .from('varchasva_accounts')
            .select('*', { count: 'exact', head: true });

        let currentIdCounter = (count || 0) + 1;

        for (const player of players) {
            if (!player.name || !player.mobileNumber) continue;

            // Generate ID
            const accountId = `VAR-${currentIdCounter.toString().padStart(3, '0')}`;
            currentIdCounter++;

            let finalAccountId = accountId;

            // 1. Insert into varchasva_accounts
            const { error: accErr } = await supabase
                .from('varchasva_accounts')
                .insert({
                    account_id: finalAccountId,
                    name: player.name,
                    mobile_number: player.mobileNumber
                });

            if (accErr) {
                if (accErr.code === '23505') { // Unique violation on mobile
                    const { data: existing } = await supabase
                        .from('varchasva_accounts')
                        .select('account_id')
                        .eq('mobile_number', player.mobileNumber)
                        .single();
                    
                    if (existing) {
                        finalAccountId = existing.account_id;
                    } else {
                        console.error("Failed to find existing account after unique violation", player.mobileNumber);
                        continue;
                    }
                } else {
                    console.error("Account Insert Error:", accErr);
                    continue;
                }
            }

            // 2. Insert into vpl_registrations
            const registrationId = `VPL2-${finalAccountId}`;
            const { error: regErr } = await supabase
                .from('vpl_registrations')
                .insert({
                    registration_id: registrationId,
                    account_id: finalAccountId,
                    season: 2,
                    team_name: player.teamName || "UNSOLD",
                    role: player.role || "UNKNOWN"
                });

            if (regErr) {
                console.error("Registration Insert Error:", regErr);
            } else {
                results.push({ accountId: finalAccountId, name: player.name, teamName: player.teamName || "UNSOLD", mobileNumber: player.mobileNumber });
            }
        }

        return NextResponse.json({ imported: results });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
