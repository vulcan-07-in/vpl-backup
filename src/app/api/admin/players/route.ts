import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateAdminRequest } from "@/lib/auth";

export async function POST(req: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, mobile, role, tier } = body;

        // 1. Create account
        // Generate a new VAR-ID (Find last one)
        const { data: lastAcc } = await supabase
            .from("varchasva_accounts")
            .select("account_id")
            .order("account_id", { ascending: false })
            .limit(1);
        
        let newId = "VAR-078"; // Default fallback
        if (lastAcc && lastAcc.length > 0) {
            const lastNum = parseInt(lastAcc[0].account_id.split('-')[1]);
            newId = `VAR-${(lastNum + 1).toString().padStart(3, '0')}`;
        }

        const { error: accErr } = await supabase.from("varchasva_accounts").insert({
            id: crypto.randomUUID(),
            account_id: newId,
            name,
            mobile_number: mobile
        });

        if (accErr) throw accErr;

        // 2. Create registration
        const { error: regErr } = await supabase.from("vpl_registrations").insert({
            id: crypto.randomUUID(),
            registration_id: `VPL2-${newId}`,
            account_id: newId,
            season: 2,
            team_name: 'UNSOLD',
            role: role || 'All',
            tier: tier || 'TIER 2',
            is_approved: true // Manually added players are auto-approved
        });

        if (regErr) throw regErr;

        return NextResponse.json({ status: "SUCCESS", account_id: newId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
