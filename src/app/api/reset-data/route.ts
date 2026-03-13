import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/auth';

const redis = new Redis(process.env.REDIS_URL || '');

export async function POST(request: Request) {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Clear active match
        await redis.del('active_live_match_id');

        // 2. Find and clear all vpl_live_state_* keys
        const keys = await redis.keys('vpl_live_state_*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }

        // 3. Clear logs
        await redis.del('vpl_audit_logs');

        // 4. Clear notifications
        await redis.del('vpl_notifications');

        return NextResponse.json({ success: true, clearedKeys: keys.length + 2 });
    } catch (error) {
        console.error('reset-data POST Error:', error);
        return NextResponse.json({ error: 'Failed to reset Redis data' }, { status: 500 });
    }
}
