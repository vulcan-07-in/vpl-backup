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
            const { error: regDelErr } = await supabase
                .from('vpl_registrations')
                .delete()
                .eq('season', 2);
            if (regDelErr) throw new Error(`Failed to clear registrations: ${regDelErr.message}`);

            const { error: accDelErr } = await supabase
                .from('varchasva_accounts')
                .delete()
                .neq('account_id', '0'); // delete all
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
                .limit(20); // fetch top 20 to find true max numerically

            if (lastAcc && lastAcc.length > 0) {
                const nums = lastAcc
                    .map((a: any) => parseInt(a.account_id.split('-')[1], 10))
                    .filter((n: number) => !isNaN(n));
                if (nums.length > 0) currentIdCounter = Math.max(...nums) + 1;
            }
        }

        const usedMobiles = new Set<string>();

        for (const player of players) {
            if (!player.name || !player.mobileNumber) continue;

            // Normalize mobile
            let mobile = player.mobileNumber.replace(/[^0-9]/g, '');
            if (mobile.startsWith('91') && mobile.length > 10) mobile = mobile.substring(2);
            if (mobile.length > 10) mobile = mobile.substring(mobile.length - 10);

            // Deduplicate within batch
            const mobileKey = usedMobiles.has(mobile) ? `${mobile}_DUP${currentIdCounter}` : mobile;
            usedMobiles.add(mobile);

            const accountId = `VAR-${currentIdCounter.toString().padStart(3, '0')}`;
            currentIdCounter++;
            let finalAccountId = accountId;

            // 1. Upsert account
            const { error: accErr } = await supabase
                .from('varchasva_accounts')
                .upsert({
                    account_id: finalAccountId,
                    name: player.name.trim(),
                    mobile_number: mobileKey
                }, { onConflict: 'account_id' });

            if (accErr) {
                // If mobile unique violation, find existing
                if (accErr.code === '23505') {
                    const { data: existing } = await supabase
                        .from('varchasva_accounts')
                        .select('account_id')
                        .eq('mobile_number', mobile)
                        .single();
                    if (existing) {
                        finalAccountId = existing.account_id;
                    } else {
                        console.error("Dupe mobile, cannot find:", mobile);
                        continue;
                    }
                } else {
                    console.error("Account Error:", accErr.message);
                    continue;
                }
            }

            // 2. Upsert registration
            const { error: regErr } = await supabase
                .from('vpl_registrations')
                .upsert({
                    registration_id: `VPL2-${finalAccountId}`,
                    account_id: finalAccountId,
                    season: 2,
                    team_name: 'UNSOLD',
                    role: (player.role || 'UNKNOWN').trim(),
                    is_approved: false,
                    is_captain: false,
                    price: 0
                }, { onConflict: 'registration_id' });

            if (regErr) {
                console.error("Registration Error:", regErr.message);
            } else {
                results.push({
                    accountId: finalAccountId,
                    name: player.name,
                    teamName: 'UNSOLD',
                    mobileNumber: mobile
                });
            }
        }

        return NextResponse.json({ imported: results, total: results.length, overwrite });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
