import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getBasePrice, AUCTION_CONSTANTS, calculateMaxBid, getBidIncrement } from "@/lib/auction";
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

        // Fetch current auction state
        const { data: stateData } = await supabase.from('vpl_auction_state').select('*').eq('id', 1).maybeSingle();
        const state = stateData || { id: 1, status: 'IDLE', active_player_id: null, current_bid: 0, leading_team_id: null, active_pool: null, bid_increment: null, show_pool_to_viewers: true };

        switch (action) {
            case 'DRAW': {
                if (state.status === 'BIDDING') {
                    throw new Error("Cannot draw while a player is active. PASS or SOLD first.");
                }
                const { data: player } = await supabase
                    .from('vpl_registrations')
                    .select('team_name, tier')
                    .eq('account_id', payload.accountId)
                    .eq('season', 2)
                    .single();
                if (!player || (player.team_name !== 'UNSOLD' && player.team_name !== 'PASSED')) {
                    throw new Error("Player is already sold or not eligible for draft.");
                }
                const basePrice = payload.basePrice !== undefined ? payload.basePrice : getBasePrice(payload.tier || player.tier);
                await supabase.from('vpl_auction_state').upsert({
                    id: 1,
                    active_player_id: payload.accountId,
                    current_bid: basePrice,
                    leading_team_id: null,
                    status: 'BIDDING',
                    active_pool: payload.tier || player.tier || state.active_pool,
                    last_update: new Date().toISOString()
                });
                break;
            }

            case 'BID': {
                if (state.status !== 'BIDDING') {
                    throw new Error("No active auction block. Draw a player first.");
                }
                if (payload.amount <= state.current_bid && state.leading_team_id !== null) {
                    throw new Error(`Bid must be higher than current bid of ${state.current_bid}`);
                }

                // Fetch team
                const { data: team } = await supabase.from('Team').select('name').eq('id', payload.teamId).single();
                if (!team) throw new Error("Team not found");

                const redis = new Redis(process.env.REDIS_URL || "");
                const purseStr = await redis.hget(teamPursesKey(), payload.teamId);
                const purse = purseStr ? parseInt(purseStr, 10) : AUCTION_CONSTANTS.MAX_BUDGET;

                // Fetch roster (count players already assigned to this team, including captain)
                const { data: roster } = await supabase
                    .from('vpl_registrations')
                    .select('price')
                    .eq('team_name', team.name)
                    .eq('season', 2);
                const currentRosterSize = roster?.length || 0;

                if (currentRosterSize >= AUCTION_CONSTANTS.MAX_PLAYERS) {
                    throw new Error(`${team.name}'s roster is full (${AUCTION_CONSTANTS.MAX_PLAYERS} players max)`);
                }

                const spent = (roster || []).reduce((sum: number, p: any) => sum + (p.price || 0), 0);
                const currentPurse = purse - spent;

                const minBasePrice = Math.min(...Object.values(AUCTION_CONSTANTS.BASE_PRICES));
                const maxBid = calculateMaxBid(currentPurse, currentRosterSize, minBasePrice);

                if (payload.amount > maxBid) {
                    throw new Error(`Bid of ${payload.amount} exceeds ${team.name}'s ceiling of ${maxBid}`);
                }

                await supabase.from('vpl_auction_state').update({
                    current_bid: payload.amount,
                    leading_team_id: payload.teamId,
                    last_update: new Date().toISOString()
                }).eq('id', 1);
                break;
            }

            case 'SOLD': {
                if (!state.active_player_id || !state.leading_team_id) {
                    throw new Error("No active player or no team has bid yet.");
                }
                if (state.status !== 'BIDDING') {
                    throw new Error("Auction is not in BIDDING state.");
                }

                const { data: teamSold } = await supabase.from('Team').select('name').eq('id', state.leading_team_id).single();
                if (!teamSold) throw new Error("Leading team not found");

                // Final roster check
                const { data: rosterSold } = await supabase
                    .from('vpl_registrations')
                    .select('id')
                    .eq('team_name', teamSold.name)
                    .eq('season', 2);
                if ((rosterSold?.length || 0) >= AUCTION_CONSTANTS.MAX_PLAYERS) {
                    throw new Error(`${teamSold.name}'s roster is full — cannot complete sale.`);
                }

                // Update registration + history + reset state
                const [regResult, histResult, resetResult] = await Promise.all([
                    supabase.from('vpl_registrations').update({
                        team_name: teamSold.name,
                        price: state.current_bid
                    }).eq('account_id', state.active_player_id).eq('season', 2),

                    supabase.from('vpl_auction_history').insert({
                        player_id: state.active_player_id,
                        bid_amount: state.current_bid,
                        team_id: state.leading_team_id
                    }),

                    supabase.from('vpl_auction_state').update({
                        active_player_id: null,
                        current_bid: 0,
                        leading_team_id: null,
                        status: 'IDLE',
                        last_update: new Date().toISOString()
                    }).eq('id', 1)
                ]);

                if (regResult.error) throw new Error(`Sale failed: ${regResult.error.message}`);
                break;
            }

            case 'FORCE_SELL': {
                // Manual override — auctioneer enters final bid + team
                const { teamId, amount, playerId } = payload;
                const activePlayerId = playerId || state.active_player_id;

                if (!activePlayerId) throw new Error("No active player.");
                if (!teamId) throw new Error("Must select a team.");
                if (!amount || amount <= 0) throw new Error("Must enter a valid bid amount.");

                const { data: teamForce } = await supabase.from('Team').select('name').eq('id', teamId).single();
                if (!teamForce) throw new Error("Team not found");

                // Roster check
                const { data: rosterForce } = await supabase
                    .from('vpl_registrations')
                    .select('id')
                    .eq('team_name', teamForce.name)
                    .eq('season', 2);
                if ((rosterForce?.length || 0) >= AUCTION_CONSTANTS.MAX_PLAYERS) {
                    throw new Error(`${teamForce.name}'s roster is full.`);
                }

                await Promise.all([
                    supabase.from('vpl_registrations').update({
                        team_name: teamForce.name,
                        price: amount
                    }).eq('account_id', activePlayerId).eq('season', 2),

                    supabase.from('vpl_auction_history').insert({
                        player_id: activePlayerId,
                        bid_amount: amount,
                        team_id: teamId
                    }),

                    supabase.from('vpl_auction_state').update({
                        active_player_id: null,
                        current_bid: 0,
                        leading_team_id: null,
                        status: 'IDLE',
                        last_update: new Date().toISOString()
                    }).eq('id', 1)
                ]);
                break;
            }

            case 'PASS': {
                if (!state.active_player_id) break;
                
                const { error: regError } = await supabase.from('vpl_registrations').update({
                    team_name: 'PASSED'
                }).eq('account_id', state.active_player_id).eq('season', 2);
                
                if (regError) throw new Error(`Failed to update registration: ${regError.message}`);

                const { error: stateError } = await supabase.from('vpl_auction_state').update({
                    active_player_id: null,
                    current_bid: 0,
                    leading_team_id: null,
                    status: 'IDLE',
                    last_update: new Date().toISOString()
                }).eq('id', 1);
                
                if (stateError) throw new Error(`Failed to update auction state: ${stateError.message}`);
                
                break;
            }

            case 'UNDO': {
                const { data: history } = await supabase
                    .from('vpl_auction_history')
                    .select('*')
                    .order('timestamp', { ascending: false })
                    .limit(1);

                if (history && history.length > 0) {
                    const lastSale = history[0];
                    await supabase.from('vpl_registrations').update({
                        team_name: 'UNSOLD',
                        price: 0
                    }).eq('account_id', lastSale.player_id).eq('season', 2);

                    await supabase.from('vpl_auction_history').delete().eq('id', lastSale.id);
                } else {
                    throw new Error("No sale to undo.");
                }
                break;
            }

            case 'RESET': {
                await supabase.from('vpl_auction_state').update({
                    active_player_id: null,
                    current_bid: 0,
                    leading_team_id: null,
                    status: 'IDLE',
                    last_update: new Date().toISOString()
                }).eq('id', 1);
                break;
            }

            case 'UPDATE_CONFIG': {
                // Update auction config (pool visibility, active pool, bid increment)
                const update: any = { last_update: new Date().toISOString() };
                if (payload.show_pool_to_viewers !== undefined) update.show_pool_to_viewers = payload.show_pool_to_viewers;
                if (payload.active_pool !== undefined) update.active_pool = payload.active_pool;
                if (payload.bid_increment !== undefined) update.bid_increment = payload.bid_increment;

                await supabase.from('vpl_auction_state').update(update).eq('id', 1);
                break;
            }

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return NextResponse.json({ status: "SUCCESS" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
