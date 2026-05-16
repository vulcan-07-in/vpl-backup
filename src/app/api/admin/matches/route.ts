import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateAdminRequest } from "@/lib/auth";

export async function GET() {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: matches, error } = await supabase
            .from("Match")
            .select("*")
            .order("createdAt", { ascending: true });

        if (error) throw error;
        return NextResponse.json(matches);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
