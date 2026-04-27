import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { LiveMatchState } from '@/lib/tournament';
import { validateAdminRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const redis = new Redis(process.env.REDIS_URL || '');

// Fetch the current live match state
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
        return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    try {
        const data = await redis.get(`s2:live_match_${matchId}`);
        let matchState = data ? JSON.parse(data) as LiveMatchState : null;
        
        // If live match isn't found in Redis, check the permanent archive in Redis
        if (!matchState) {
            const archivedData = await redis.get(`s2:completed_match_${matchId}`);
            if (archivedData) {
                matchState = JSON.parse(archivedData) as LiveMatchState;
            }
        }

        // If still not found, check the PostgreSQL backup
        if (!matchState) {
            const match = await prisma.match.findUnique({
                where: { matchNo: matchId }
            });
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

// Update the live match state (Admin Only)
export async function POST(request: Request) {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body: LiveMatchState = await request.json();

        if (!body.matchId) {
            return NextResponse.json({ error: 'Match ID is required in payload' }, { status: 400 });
        }

        const redisKey = `s2:live_match_${body.matchId}`;
        
        // 1. Race Condition Prevention: Check lastSyncedAt
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

        // 2. Save state to Redis (Fastest for live updates)
        await redis.set(redisKey, JSON.stringify(body));

        // 3. Save state to PostgreSQL as a persistent backup (Slower, but safe)
        // We only do this if it's a significant update or just always if it's infrequent
        await prisma.match.update({
            where: { matchNo: body.matchId },
            data: { 
                liveState: body as any,
                status: body.status
            }
        });

        // 4. Archive permanent copy if the match is completed
        if (body.status === "COMPLETED") {
            await redis.set(`s2:completed_match_${body.matchId}`, JSON.stringify(body));
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
