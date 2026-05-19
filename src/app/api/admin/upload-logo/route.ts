import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateAdminRequest } from "@/lib/auth";
import Redis from "ioredis";
import { teamLogosKey } from "@/lib/redis-keys";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const teamId = formData.get('teamId') as string;

        if (!file || !teamId) {
            return NextResponse.json({ error: "file and teamId are required" }, { status: 400 });
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${teamId}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadErr } = await supabase.storage
            .from('team-logos')
            .upload(path, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (uploadErr) {
            return NextResponse.json({ error: uploadErr.message }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from('team-logos')
            .getPublicUrl(path);

        const redis = new Redis(process.env.REDIS_URL || "");
        await redis.hset(teamLogosKey(), teamId, publicUrl);

        return NextResponse.json({ ok: true, url: publicUrl });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
