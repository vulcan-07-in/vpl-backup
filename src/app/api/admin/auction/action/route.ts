import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getBasePrice, AUCTION_CONSTANTS, calculateMaxBid, getBidIncrement } from "@/lib/auction";
import { validateAdminRequest } from "@/lib/auth";
import Redis from "ioredis";
import { teamPursesKey } from "@/lib/redis-keys";

// Module-level Redis singleton — reused across requests to avoid cold-connect latency on every bid
const redis = new Redis(process.env.REDIS_URL || "");

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

                // Use module-level singleton — no cold-connect on every click
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

                const tierPricesStr = await redis.get("vpl_tier_prices");
                let minBasePrice = Math.min(...Object.values(AUCTION_CONSTANTS.BASE_PRICES));
                if (tierPricesStr) {
                    try {
                        const tp = JSON.parse(tierPricesStr);
                        minBasePrice = Math.min(...Object.values(tp) as number[]);
                    } catch (e) {}
                }
                
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
                    .select('price')
                    .eq('team_name', teamForce.name)
                    .eq('season', 2);
                
                const currentRosterSizeForce = rosterForce?.length || 0;
                if (currentRosterSizeForce >= AUCTION_CONSTANTS.MAX_PLAYERS) {
                    throw new Error(`${teamForce.name}'s roster is full.`);
                }

                // Purse check
                const purseStrForce = await redis.hget(teamPursesKey(), teamId);
                const purseForce = purseStrForce ? parseInt(purseStrForce, 10) : AUCTION_CONSTANTS.MAX_BUDGET;
                const spentForce = (rosterForce || []).reduce((sum: number, p: any) => sum + (p.price || 0), 0);
                const currentPurseForce = purseForce - spentForce;

                const tierPricesStrForce = await redis.get("vpl_tier_prices");
                let minBasePriceForce = Math.min(...Object.values(AUCTION_CONSTANTS.BASE_PRICES));
                if (tierPricesStrForce) {
                    try {
                        const tp = JSON.parse(tierPricesStrForce);
                        minBasePriceForce = Math.min(...Object.values(tp) as number[]);
                    } catch (e) {}
                }
                
                const maxBidForce = calculateMaxBid(currentPurseForce, currentRosterSizeForce, minBasePriceForce);
                if (amount > maxBidForce) {
                    throw new Error(`Force Sell denied: ${amount} exceeds ${teamForce.name}'s maximum allowed bid of ${maxBidForce}.`);
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

            case 'UNDO_BID': {
                if (state.status !== 'BIDDING') {
                    throw new Error("Cannot undo bid. No active bidding.");
                }
                // Revert state to previous bid
                await supabase.from('vpl_auction_state').update({
                    current_bid: payload.amount,
                    leading_team_id: payload.teamId || null,
                    last_update: new Date().toISOString()
                }).eq('id', 1);
                break;
            }

            case 'UPDATE_TIER_PRICES': {
                // payload contains the new prices Record<string, number>
                if (payload.tierPrices) {
                    await redis.set("vpl_tier_prices", JSON.stringify(payload.tierPrices));
                }
                break;
            }

            case 'END': {
    // End the auction permanently
    await supabase.from('vpl_auction_state').update({
        status: 'ENDED',
        last_update: new Date().toISOString()
    }).eq('id', 1);
    break;
}

case 'RESET': {
                await supabase.from('vpl_auction_state').update({
                    active_player_id: null,
                    current_bid: 0,
                    leading_team_id: null,
                    status: 'WAITING',
                    last_update: new Date().toISOString()
                }).eq('id', 1);
                break;
            }

            case 'WIPE_ALL': {
                // 1. Reset auction state to WAITING (shows countdown timer to viewers)
                await supabase.from('vpl_auction_state').update({
                    active_player_id: null,
                    current_bid: 0,
                    leading_team_id: null,
                    status: 'WAITING',
                    active_pool: null,
                    last_update: new Date().toISOString()
                }).eq('id', 1);

                // 2. Clear all auction history
                await supabase.from('vpl_auction_history').delete().neq('id', 0);

                // 3. Reset all players to UNSOLD, EXCEPT captains
                await supabase.from('vpl_registrations')
                    .update({ team_name: 'UNSOLD', price: 0 })
                    .eq('season', 2)
                    .eq('is_captain', false);
                break;
            }

            case 'START': {
                await supabase.from('vpl_auction_state').update({
                    status: 'IDLE',
                    last_update: new Date().toISOString()
                }).eq('id', 1);
                break;
            }

            case 'PAUSE': {
                await supabase.from('vpl_auction_state').update({
                    status: 'PAUSED',
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

            case 'WAIT': {
                // Return viewer to countdown timer screen
                await supabase.from('vpl_auction_state').update({
                    active_player_id: null,
                    current_bid: 0,
                    leading_team_id: null,
                    status: 'WAITING',
                    last_update: new Date().toISOString()
                }).eq('id', 1);
                break;
            }

            case 'SYNC_PURSES': {
                // Recalculate all team purses from Supabase registrations to fix Redis drift
                const { data: allTeams } = await supabase.from('Team').select('id, name');
                if (!allTeams) throw new Error('No teams found');

                const { data: allRegs } = await supabase
                    .from('vpl_registrations')
                    .select('team_name, price')
                    .eq('season', 2);

                for (const team of allTeams) {
                    const roster = (allRegs || []).filter((r: any) => r.team_name === team.name);
                    const spent = roster.reduce((sum: number, r: any) => sum + (r.price || 0), 0);
                    // Correct purse = MAX_BUDGET minus what they've spent
                    const correctPurse = Math.max(0, AUCTION_CONSTANTS.MAX_BUDGET - spent);
                    await redis.hset(teamPursesKey(), team.id, correctPurse);
                }
                break;
            }

            case 'ADJUST_PURSE': {
                // Manually set a specific team's purse in Redis
                const { teamId: adjustTeamId, amount: adjustAmount } = payload;
                if (!adjustTeamId) throw new Error('teamId required');
                if (adjustAmount === undefined || adjustAmount < 0) throw new Error('Valid amount required');
                await redis.hset(teamPursesKey(), adjustTeamId, adjustAmount);
                break;
            }

            case 'SET_AUCTION_TIME': {
                // Store auction start and optional end time in Redis
                const { startTime, endTime } = payload;
                if (!startTime) throw new Error('startTime (ISO string) required');
                // Validate it parses
                if (isNaN(new Date(startTime).getTime())) throw new Error('Invalid startTime format');
                await redis.set('vpl_auction_start_time', startTime);
                if (endTime) {
                    if (isNaN(new Date(endTime).getTime())) throw new Error('Invalid endTime format');
                    await redis.set('vpl_auction_end_time', endTime);
                }
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
