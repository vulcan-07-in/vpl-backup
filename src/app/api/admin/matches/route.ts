import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateAdminRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';

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

        const sorted = (matches || []).sort((a: any, b: any) => {
            if (a.scheduledTime && b.scheduledTime) {
                const timeA = new Date(a.scheduledTime).getTime();
                const timeB = new Date(b.scheduledTime).getTime();
                if (timeA !== timeB) return timeA - timeB;
            }
            const numA = parseInt(a.matchNo.replace(/[^0-9]/g, "")) || 999;
            const numB = parseInt(b.matchNo.replace(/[^0-9]/g, "")) || 999;
            if (numA !== numB) return numA - numB;
            return a.matchNo.localeCompare(b.matchNo);
        });

        return NextResponse.json(sorted);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
