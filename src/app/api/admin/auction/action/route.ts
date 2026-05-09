import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getBasePrice } from "@/lib/auction";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, payload } = body;

        // Fetch current state
        const { data: stateData } = await supabase.from('vpl_auction_state').select('*').eq('id', 1).single();
        let state = stateData || { id: 1, status: 'IDLE', active_player_id: null, current_bid: 0, leading_team_id: null };

        switch (action) {
            case 'DRAW':
                // payload: { accountId, tier }
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
                // Validation happens on client, but we enforce it here too
                if (payload.amount > state.current_bid || state.leading_team_id === null) {
                    await supabase.from('vpl_auction_state').update({
                        current_bid: payload.amount,
                        leading_team_id: payload.teamId,
                        last_update: new Date().toISOString()
                    }).eq('id', 1);
                }
                break;

            case 'SOLD':
                // Mark player as sold in vpl_registrations
                if (!state.active_player_id || !state.leading_team_id) throw new Error("No active player or bid");
                
                // Get the team name for the registration update
                const { data: team } = await supabase.from('Team').select('name').eq('id', state.leading_team_id).single();

                await supabase.from('vpl_registrations').update({
                    team_name: team?.name || 'UNSOLD',
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
