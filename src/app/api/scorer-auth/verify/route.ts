import { NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/auth';

/**
 * GET /api/scorer-auth/verify
 * 
 * Lightweight endpoint to check if the scorer's auth cookie is still valid.
 * Used on page load to detect expired cookies (common on tablets/mobile).
 * Returns 200 if valid, 401 if not.
 */
export async function GET() {
    try {
        const isValid = await validateAdminRequest();
        if (isValid) {
            return NextResponse.json({ valid: true });
        }
        return NextResponse.json({ valid: false }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ valid: false }, { status: 401 });
    }
}
