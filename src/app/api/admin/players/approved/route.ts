import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// Returns approved players for captain assignment dropdowns
export async function GET() {
    const { data, error } = await supabase
        .from("vpl_registrations")
        .select("account_id, team_name, is_captain, tier, varchasva_accounts(name)")
        .eq("season", 2)
        .eq("is_approved", true);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const players = (data || []).map((p: any) => ({
        accountId: p.account_id,
        name: p.varchasva_accounts?.name || "Unknown",
        tier: p.tier,
        isCaptain: p.is_captain,
        teamName: p.team_name,
    }));

    return NextResponse.json(players);
}
