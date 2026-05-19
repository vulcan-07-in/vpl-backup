import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateAdminRequest } from "@/lib/auth";

export async function POST(req: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const body = await req.json();
        const { players, overwrite = false } = body;

        if (!players || !Array.isArray(players)) {
            return NextResponse.json({ error: "Invalid data provided" }, { status: 400 });
        }

        // If overwrite mode: wipe all season 2 data first
        if (overwrite) {
            // Delete registrations first (FK dependency)
            const { error: regDelErr } = await supabase
                .from('vpl_registrations')
                .delete()
                .eq('season', 2);
            if (regDelErr) throw new Error(`Failed to clear registrations: ${regDelErr.message}`);

            // Then delete accounts
            const { error: accDelErr } = await supabase
                .from('varchasva_accounts')
                .delete()
                .neq('account_id', '___NEVER_MATCH___'); // delete all
            if (accDelErr) throw new Error(`Failed to clear accounts: ${accDelErr.message}`);
        }

        const results = [];
        let currentIdCounter = 1;

        if (!overwrite) {
            // Fetch last numeric ID to avoid collision
            const { data: lastAcc } = await supabase
                .from('varchasva_accounts')
                .select('account_id')
                .like('account_id', 'VAR-%')
                .order('account_id', { ascending: false })
                .limit(20);

            if (lastAcc && lastAcc.length > 0) {
                const nums = lastAcc
                    .map((a: any) => parseInt(a.account_id.split('-')[1], 10))
                    .filter((n: number) => !isNaN(n));
                if (nums.length > 0) currentIdCounter = Math.max(...nums) + 1;
            }
        }

        for (const player of players) {
            if (!player.name || !player.name.trim()) continue;

            const accountId = `VAR-${currentIdCounter.toString().padStart(3, '0')}`;
            currentIdCounter++;

            // Normalize contact number (if provided)
            let contactNumber = player.contactNumber || '';
            if (contactNumber) {
                contactNumber = contactNumber.replace(/[^0-9]/g, '');
                if (contactNumber.startsWith('91') && contactNumber.length > 10) {
                    contactNumber = contactNumber.substring(contactNumber.length - 10);
                }
            }
            // If no contact, use accountId as mobile placeholder
            const mobileValue = contactNumber || accountId;

            // Normalize tier — accept any custom tier value, just clean up shorthand
            let tier = (player.tier || 'TIER 2').toUpperCase().trim();
            // Normalize common shorthand → canonical names
            const tierShorthandMap: Record<string, string> = {
                'MARQUEE PLAYER': 'MARQUEE',
                'M': 'MARQUEE',
                'T1': 'TIER 1', 'TIER1': 'TIER 1', 'T-1': 'TIER 1',
                'T2': 'TIER 2', 'TIER2': 'TIER 2', 'T-2': 'TIER 2',
                'T3': 'TIER 3', 'TIER3': 'TIER 3', 'T-3': 'TIER 3',
                'T4': 'TIER 4', 'TIER4': 'TIER 4', 'T-4': 'TIER 4',
            };
            tier = tierShorthandMap[tier] ?? tier; // If no match, keep as-is

            // Normalize gender
            const gender = (player.gender || 'Male').trim();

            // Normalize role
            const role = (player.role || 'All Rounder').trim();

            // 1. Create account
            const { error: accErr } = await supabase
                .from('varchasva_accounts')
                .upsert({
                    id: crypto.randomUUID(),
                    account_id: accountId,
                    name: player.name.trim(),
                    mobile_number: mobileValue
                }, { onConflict: 'account_id' });

            if (accErr) {
                console.error("Account Error:", accErr.message, "for player:", player.name);
                continue;
            }

            // 2. Create registration
            const { error: regErr } = await supabase
                .from('vpl_registrations')
                .upsert({
                    id: crypto.randomUUID(),
                    registration_id: `VPL2-${accountId}`,
                    account_id: accountId,
                    season: 2,
                    team_name: 'UNSOLD',
                    role: role,
                    tier: tier,
                    gender: gender,
                    is_approved: false,
                    is_captain: false,
                    price: 0
                }, { onConflict: 'registration_id' });

            if (regErr) {
                console.error("Registration Error:", regErr.message, "for player:", player.name);
            } else {
                results.push({
                    accountId: accountId,
                    name: player.name.trim(),
                    tier: tier,
                    role: role,
                    gender: gender,
                    teamName: 'UNSOLD'
                });
            }
        }

        return NextResponse.json({ imported: results, total: results.length, overwrite });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
