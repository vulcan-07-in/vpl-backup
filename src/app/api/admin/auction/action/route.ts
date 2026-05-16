import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getBasePrice, AUCTION_CONSTANTS, calculateMaxBid } from "@/lib/auction";
import { validateAdminRequest } from "@/lib/auth";
import Redis from "ioredis";
import { teamPursesKey } from "@/lib/redis-keys";

export async function POST(req: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action, payload } = body;

        // Fetch current state
        const { data: stateData } = await supabase.from('vpl_auction_state').select('*').eq('id', 1).single();
        let state = stateData || { id: 1, status: 'IDLE', active_player_id: null, current_bid: 0, leading_team_id: null };

        switch (action) {
            case 'DRAW':
                // payload: { accountId, tier }
                const { data: player } = await supabase.from('vpl_registrations').select('team_name').eq('account_id', payload.accountId).eq('season', 2).single();
                if (!player || (player.team_name !== 'UNSOLD' && player.team_name !== 'PASSED')) {
                    throw new Error("Player is already sold or not eligible for draft");
                }
                const basePrice = getBasePrice(payload.tier);
                await supabase.from('vpl_auction_state').upsert({
                    id: 1,
                    active_player_id: payload.accountId,
                    current_bid: basePrice,
                    leading_team_id: null,
                    status: 'BIDDING',
                    last_update: new Date().toISOString()
                });
                break;

            case 'BID':
                // payload: { amount, teamId }
                if (payload.amount <= state.current_bid && state.leading_team_id !== null) {
                    throw new Error("Bid must be higher than current bid");
                }

                // 1. Fetch team's current players to check roster size and spent amount
                const { data: team } = await supabase.from('Team').select('name').eq('id', payload.teamId).single();
                if (!team) throw new Error("Team not found");

                const { data: roster } = await supabase.from('vpl_registrations').select('price').eq('team_name', team.name).eq('season', 2);
                const currentRosterSize = roster?.length || 0;
                
                if (currentRosterSize >= AUCTION_CONSTANTS.MAX_PLAYERS) {
                    throw new Error("Roster is full");
                }

                const spent = (roster || []).reduce((sum: number, p: any) => sum + (p.price || 0), 0);

                // 2. Fetch team's custom purse
                const redis = new Redis(process.env.REDIS_URL || "");
                const purseStr = await redis.hget(teamPursesKey(), payload.teamId);
                redis.disconnect();
                
                const startingPurse = purseStr ? parseInt(purseStr, 10) : AUCTION_CONSTANTS.MAX_BUDGET;
                const currentPurse = startingPurse - spent;

                // 3. Check dynamic ceiling
                const minBasePrice = Math.min(...Object.values(AUCTION_CONSTANTS.BASE_PRICES));
                const maxBid = calculateMaxBid(currentPurse, currentRosterSize, minBasePrice);

                if (payload.amount > maxBid) {
                    throw new Error(`Bid exceeds dynamic ceiling of ${maxBid}`);
                }

                await supabase.from('vpl_auction_state').update({
                    current_bid: payload.amount,
                    leading_team_id: payload.teamId,
                    last_update: new Date().toISOString()
                }).eq('id', 1);
                break;

            case 'SOLD':
                // Mark player as sold in vpl_registrations
                if (!state.active_player_id || !state.leading_team_id) throw new Error("No active player or bid");
                
                // Get the team name for the registration update
                const { data: teamSold } = await supabase.from('Team').select('name').eq('id', state.leading_team_id).single();
                if (!teamSold) throw new Error("Team not found");

                // Check roster limit again just before selling
                const { data: rosterSold } = await supabase.from('vpl_registrations').select('id').eq('team_name', teamSold.name).eq('season', 2);
                if ((rosterSold?.length || 0) >= AUCTION_CONSTANTS.MAX_PLAYERS) {
                    throw new Error("Team roster is full");
                }

                await supabase.from('vpl_registrations').update({
                    team_name: teamSold.name,
                    price: state.current_bid
                }).eq('account_id', state.active_player_id).eq('season', 2);

                // Add to history
                await supabase.from('vpl_auction_history').insert({
                    player_id: state.active_player_id,
                    bid_amount: state.current_bid,
                    team_id: state.leading_team_id
                });

                // Reset state
                await supabase.from('vpl_auction_state').update({
                    active_player_id: null,
                    current_bid: 0,
                    leading_team_id: null,
                    status: 'IDLE'
                }).eq('id', 1);
                break;

            case 'PASS':
                // Mark player as passed
                if (!state.active_player_id) break;
                await supabase.from('vpl_registrations').update({
                    team_name: 'PASSED' // Special keyword
                }).eq('account_id', state.active_player_id).eq('season', 2);

                // Reset state
                await supabase.from('vpl_auction_state').update({
                    active_player_id: null,
                    current_bid: 0,
                    leading_team_id: null,
                    status: 'IDLE'
                }).eq('id', 1);
                break;

            case 'UNDO':
                // Get last history entry
                const { data: history } = await supabase
                    .from('vpl_auction_history')
                    .select('*')
                    .order('timestamp', { ascending: false })
                    .limit(1);

                if (history && history.length > 0) {
                    const lastSale = history[0];
                    
                    // Revert registration
                    await supabase.from('vpl_registrations').update({
                        team_name: 'UNSOLD',
                        price: 0
                    }).eq('account_id', lastSale.player_id).eq('season', 2);

                    // Delete history entry
                    await supabase.from('vpl_auction_history').delete().eq('id', lastSale.id);
                }
                break;
        }

        return NextResponse.json({ status: "SUCCESS" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
