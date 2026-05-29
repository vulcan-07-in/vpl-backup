import { NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/auth';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const activeMatchId = await redis.get('s2:active_live_match_id');
        return NextResponse.json({ activeMatchId: activeMatchId || null }, {
            headers: { 'Cache-Control': 'no-store' }
        });
    } catch (error) {
        console.error('active-match GET Error:', error);
        return NextResponse.json({ error: 'Failed to fetch active match ID' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { activeMatchId } = await request.json();

        if (!activeMatchId) {
            await redis.del('s2:active_live_match_id');
        } else {
            await redis.set('s2:active_live_match_id', activeMatchId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('active-match POST Error:', error);
        return NextResponse.json({ error: 'Failed to update active match ID' }, { status: 500 });
    }
}
