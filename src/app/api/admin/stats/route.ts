import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { count: registered } = await supabase
            .from("vpl_registrations")
            .select("*", { count: "exact", head: true })
            .eq("season", 2);

        const { count: approved } = await supabase
            .from("vpl_registrations")
            .select("*", { count: "exact", head: true })
            .eq("season", 2)
            .eq("is_approved", true);

        const { count: captains } = await supabase
            .from("vpl_registrations")
            .select("*", { count: "exact", head: true })
            .eq("season", 2)
            .eq("is_captain", true);

        return NextResponse.json({
            registered: registered || 0,
            approved: approved || 0,
            captains: captains || 0,
            teams: 12
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
