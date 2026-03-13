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

        // 2. Find and clear all match state keys
        // We clear both live_match_* (engine) and vpl_live_state_* (legacy/alternative)
        const matchKeys = await redis.keys('live_match_*');
        const vplKeys = await redis.keys('vpl_live_state_*');
        const allMatchKeys = [...matchKeys, ...vplKeys];
        
        if (allMatchKeys.length > 0) {
            await redis.del(...allMatchKeys);
        }

        // 3. Clear logs and notifications
        await redis.del('vpl_audit_logs');
        await redis.del('vpl_notifications');

        // 4. Optional: Clear session tokens to force re-login? 
        // No, let's keep it to data for now.

        return NextResponse.json({ success: true, clearedKeys: allMatchKeys.length + 3 });
    } catch (error) {
        console.error('reset-data POST Error:', error);
        return NextResponse.json({ error: 'Failed to reset Redis data' }, { status: 500 });
    }
}
