import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/auth';

const redis = new Redis(process.env.REDIS_URL || '');

export async function POST(request: Request) {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Clear active match
        await redis.del('s2:active_live_match_id');

        // 2. Find and clear all match state keys
        // We clear live_match_*, vpl_live_state_*, and completed_match_* (archives)
        const matchKeys = await redis.keys('s2:live_match_*');
        const vplKeys = await redis.keys('s2:vpl_logs_*'); // Note: changed to vpl_logs_* since vpl_live_state_* is old
        const archiveKeys = await redis.keys('s2:completed_match_*');
        const allMatchKeys = [...matchKeys, ...vplKeys, ...archiveKeys];
        
        if (allMatchKeys.length > 0) {
            await redis.del(...allMatchKeys);
        }

        // 3. Clear logs and notifications
        await redis.del('s2:vpl_logs_global');
        await redis.del('s2:vpl_notifications');
        await redis.del('s2:vpl_mvp_state_v1');

        // 4. Optional: Clear session tokens to force re-login? 
        // No, let's keep it to data for now.

        return NextResponse.json({ success: true, clearedKeys: allMatchKeys.length + 3 });
    } catch (error) {
        console.error('reset-data POST Error:', error);
        return NextResponse.json({ error: 'Failed to reset Redis data' }, { status: 500 });
    }
}
