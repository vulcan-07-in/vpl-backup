import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { LiveMatchState } from '@/lib/tournament';
import fs from 'fs';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL || '');

export async function GET() {
    try {
        // 1. Try to fetch from Redis
        const [liveKeys, vplKeys, archiveKeys] = await Promise.all([
            redis.keys('live_match_*'),
            redis.keys('vpl_live_state_*'),
            redis.keys('completed_match_*')
        ]).catch(() => [[], [], []]); // Ignore connection errors here

        const allKeys = [...new Set([...liveKeys, ...vplKeys, ...archiveKeys])];
        const liveStates: Record<string, LiveMatchState> = {};

        if (allKeys.length > 0) {
            const values = await redis.mget(...allKeys);
            allKeys.forEach((key, i) => {
                const matchId = key.replace('live_match_', '').replace('vpl_live_state_', '').replace('completed_match_', '');
                const data = values[i];
                if (data) {
                    liveStates[matchId] = JSON.parse(data);
                }
            });
        }

        // 2. MERGE WITH STATIC ARCHIVE DATA (Season 1 Backup)
        try {
            const backupPath = path.join(process.cwd(), 'src/data/season1.json');
            if (fs.existsSync(backupPath)) {
                const backupRaw = fs.readFileSync(backupPath, 'utf8');
                const backupData = JSON.parse(backupRaw);
                
                Object.keys(backupData).forEach(key => {
                    const matchId = key.replace('live_match_', '').replace('vpl_live_state_', '').replace('completed_match_', '');
                    // Only use backup if not already in Redis (Redis wins)
                    if (!liveStates[matchId]) {
                        liveStates[matchId] = backupData[key];
                    }
                });
            }
        } catch (backupError) {
            console.error('Failed to load static Season 1 backup:', backupError);
        }

        return NextResponse.json(liveStates, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('API GET All Live Scores Error:', error);
        return NextResponse.json({ error: 'Failed to fetch live scores' }, { status: 500 });
    }
}
