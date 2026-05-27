import { NextResponse } from 'next/server';
import { LiveMatchState } from '@/lib/tournament';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const liveStates: Record<string, LiveMatchState> = {};

        // Fetch all live states directly from Supabase (bypasses Redis to stay within free tier limits)
        const { data: matches, error } = await supabase
            .from('Match')
            .select('matchNo, liveState, isFunMatch')
            .not('liveState', 'is', null);

        if (!error && matches) {
            matches.forEach(m => {
                const matchId = String(m.matchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                if (m.liveState) {
                    const state = m.liveState as unknown as LiveMatchState;
                    if (m.isFunMatch) state.isFunMatch = true;
                    liveStates[matchId] = state;
                }
            });
        } else if (error) {
            console.error('Supabase GET All Live Scores Error:', error);
        }

        return NextResponse.json(liveStates, {
            headers: {
                'Cache-Control': 's-maxage=3, stale-while-revalidate=5',
            },
        });
    } catch (error) {
        console.error('API GET All Live Scores Error:', error);
        return NextResponse.json({ error: 'Failed to fetch live scores' }, { status: 500 });
    }
}
