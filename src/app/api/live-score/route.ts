import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { LiveMatchState } from '@/lib/tournament';
import { validateAdminRequest } from '@/lib/auth';

const redis = new Redis(process.env.REDIS_URL || '');

// Fetch the current live match state
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
        return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    try {
        const data = await redis.get(`live_match_${matchId}`);
        let matchState = data ? JSON.parse(data) as LiveMatchState : null;
        
        // If live match isn't found, check the permanent archive
        if (!matchState) {
            const archivedData = await redis.get(`completed_match_${matchId}`);
            if (archivedData) {
                matchState = JSON.parse(archivedData) as LiveMatchState;
            }
        }

        if (!matchState) {
            return NextResponse.json({ error: 'Match not found or not live' }, { status: 404 });
        }

        // We use Edge caching logic here.
        // It tells the browser/Vercel CDN: "Cache this for 5 seconds. If a request comes in within 5s, serve the cached version."
        return NextResponse.json(matchState, {
            headers: {
                'Cache-Control': 's-maxage=1, stale-while-revalidate=1',
            },
        });
    } catch (error) {
        console.error('KV GET Error:', error);
        return NextResponse.json({ error: 'Failed to fetch live score' }, { status: 500 });
    }
}

// Update the live match state (Admin Only)
export async function POST(request: Request) {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body: LiveMatchState = await request.json();

        if (!body.matchId) {
            return NextResponse.json({ error: 'Match ID is required in payload' }, { status: 400 });
        }

        // Save state to Redis. It overwrites the existing state instantly.
        await redis.set(`live_match_${body.matchId}`, JSON.stringify(body));

        // Archive permanent copy if the match is completed
        if (body.status === "COMPLETED") {
            await redis.set(`completed_match_${body.matchId}`, JSON.stringify(body));
        }

        // Success response
        return NextResponse.json({ success: true, timestamp: Date.now() });
    } catch (error) {
        console.error('KV POST Error:', error);
        return NextResponse.json({ error: 'Failed to update live score' }, { status: 500 });
    }
}
