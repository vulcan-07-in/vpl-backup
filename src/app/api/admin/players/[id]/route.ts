import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// PATCH /api/admin/players/[accountId] - Update approval, tier, or captaincy
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await req.json();
        const { is_approved, tier, is_captain, team_name } = body;
        const resolvedParams = await params;
        const accountId = resolvedParams.id;

        const { data, error } = await supabase
            .from("vpl_registrations")
            .update({
                is_approved,
                tier,
                is_captain,
                team_name: team_name || 'UNSOLD'
            })
            .eq("account_id", accountId)
            .eq("season", 2)
            .select();

        if (error) throw error;

        return NextResponse.json({ status: "SUCCESS", data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE /api/admin/players/[accountId] - Remove a registrant
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const accountId = resolvedParams.id;

        // Delete registration first
        await supabase.from("vpl_registrations").delete().eq("account_id", accountId).eq("season", 2);
        
        // Then account
        const { error } = await supabase.from("varchasva_accounts").delete().eq("account_id", accountId);

        if (error) throw error;

        return NextResponse.json({ status: "SUCCESS" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
