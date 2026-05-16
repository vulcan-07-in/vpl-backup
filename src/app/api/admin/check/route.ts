import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
}
