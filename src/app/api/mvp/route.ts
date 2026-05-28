import { NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/auth';
import { redis } from '@/lib/redis';
const MVP_KEY = 's2:vpl_mvp_state_v1';

export async function GET() {
    try {
        const data = await redis.get(MVP_KEY);
        const state = data ? JSON.parse(data) : { player: null, published: false };
        
        return NextResponse.json(state, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('MVP GET Error:', error);
        return NextResponse.json({ error: 'Failed to fetch MVP state' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        // Expected body: { player: string | null, published: boolean }

        await redis.set(MVP_KEY, JSON.stringify(body));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('MVP POST Error:', error);
        return NextResponse.json({ error: 'Failed to update MVP state' }, { status: 500 });
    }
}
