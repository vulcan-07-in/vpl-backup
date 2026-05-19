import { NextResponse } from "next/server";
import Redis from "ioredis";

export const dynamic = 'force-dynamic';

// Temporary diagnostic endpoint — REMOVE AFTER DEBUGGING
export async function GET() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET';
    const redisUrl = process.env.REDIS_URL || 'NOT_SET';
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasAnonKey = !!process.env.SUPABASE_ANON_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const adminPassword = process.env.ADMIN_PASSWORD ? 'SET' : 'NOT_SET';

    // Test Supabase connectivity
    let supabaseTest: any = 'not_tested';
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/Team?limit=1`, {
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
            }
        });
        supabaseTest = { status: res.status, ok: res.ok };
        if (!res.ok) {
            const text = await res.text();
            supabaseTest.body = text.slice(0, 200);
        }
    } catch (e: any) {
        supabaseTest = { error: e.message };
    }

    // Test Redis connectivity
    let redisTest: any = 'not_tested';
    if (redisUrl !== 'NOT_SET') {
        try {
            const redis = new Redis(redisUrl, { connectTimeout: 3000, lazyConnect: true });
            await redis.connect();
            await redis.ping();
            redisTest = { status: 'ok' };
            redis.disconnect();
        } catch (e: any) {
            redisTest = { error: e.message };
        }
    } else {
        redisTest = { error: 'REDIS_URL not set' };
    }

    return NextResponse.json({
        supabaseUrl,
        hasServiceKey,
        hasAnonKey,
        adminPassword,
        redisUrl: redisUrl.slice(0, 30) + (redisUrl.length > 30 ? '...' : ''),
        supabaseTest,
        redisTest,
    });
}
