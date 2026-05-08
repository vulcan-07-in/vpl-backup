import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { LiveMatchState } from '@/lib/tournament';
import { validateAdminRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const redis = new Redis(process.env.REDIS_URL || '');

// S2 Redis key prefix
const liveKey = (matchId: string) => `s2:live_match_${matchId}`;
const completedKey = (matchId: string) => `s2:completed_match_${matchId}`;

// GET — fetch current live match state
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
        return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    try {
        // 1. Try the live Redis key
        let data = await redis.get(liveKey(matchId));
        let matchState = data ? JSON.parse(data) as LiveMatchState : null;

        // 2. Fall back to the completed archive in Redis
        if (!matchState) {
            const archivedData = await redis.get(completedKey(matchId));
            if (archivedData) {
                matchState = JSON.parse(archivedData) as LiveMatchState;
            }
        }

        // 3. Fall back to Supabase liveState column
        if (!matchState) {
            const { data: match } = await supabase
                .from('match')
                .select('liveState')
                .eq('matchNo', matchId)
                .single();
            if (match?.liveState) {
                matchState = match.liveState as unknown as LiveMatchState;
            }
        }

        if (!matchState) {
            return NextResponse.json({ error: 'Match not found or not live' }, { status: 404 });
        }

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

// POST — update live match state (Admin Only)
export async function POST(request: Request) {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body: LiveMatchState = await request.json();

        if (!body.matchId) {
            return NextResponse.json({ error: 'Match ID is required in payload' }, { status: 400 });
        }

        const redisKey = liveKey(body.matchId);

        // 1. Race condition prevention: check lastSyncedAt
        const existingData = await redis.get(redisKey);
        if (existingData) {
            const existingState = JSON.parse(existingData) as LiveMatchState;
            if (existingState.lastSyncedAt && body.lastSyncedAt && body.lastSyncedAt < existingState.lastSyncedAt) {
                return NextResponse.json({
                    error: 'STALE_UPDATE',
                    message: 'A newer update already exists. Refreshing client...',
                    timestamp: existingState.lastSyncedAt
                }, { status: 409 });
            }
        }

        // 2. Save to Redis (fastest for live updates)
        await redis.set(redisKey, JSON.stringify(body));

        // 3. Save to Supabase as a persistent backup
        await supabase
            .from('match')
            .update({
                liveState: body as any,
                status: body.status
            })
            .eq('matchNo', body.matchId);

        // 4. Archive permanent copy if the match is completed
        if (body.status === "COMPLETED") {
            await redis.set(completedKey(body.matchId), JSON.stringify(body));
            revalidatePath('/matches');
            revalidatePath('/points');
            revalidatePath('/stats');
            revalidatePath('/');
        }

        return NextResponse.json({ success: true, timestamp: Date.now() });
    } catch (error) {
        console.error('KV POST Error:', error);
        return NextResponse.json({ error: 'Failed to update live score' }, { status: 500 });
    }
}
