import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { pin } = await request.json();
        const correctPin = process.env.SCORER_PIN ?? "2526";

        if (pin === correctPin) {
            const cookieStore = await cookies();
            cookieStore.set('vpl_scorer_token', correctPin, {
                httpOnly: true,
                secure: process.env.NEXT_PUBLIC_APP_ENV !== 'local',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    } catch (error) {
        console.error('Auth POST Error:', error);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
