import { supabase } from "@/lib/supabase";
import AuctioneerClient from "./auctioneer-client";
import { Metadata } from "next";
import Redis from "ioredis";
import { teamPursesKey } from "@/lib/redis-keys";

export const revalidate = 0;
export const metadata: Metadata = {
    title: "Auction Command | VPL Admin",
};

export default async function AdminAuctionPage() {
    // 1. Fetch all APPROVED players in the pool
    const { data: players } = await supabase
        .from("vpl_registrations")
        .select(`
            account_id,
            role,
            tier,
            team_name,
            price,
            varchasva_accounts (name, mobile_number)
        `)
        .eq("season", 2)
        .eq("is_approved", true);

    // 2. Fetch Teams
    const { data: teams } = await supabase
        .from("Team")
        .select("id, name, color, shortName")
        .order("name", { ascending: true });

    // Format players
    const formattedPlayers = (players || []).map((p: any) => ({
        accountId: p.account_id,
        name: p.varchasva_accounts?.name || "Unknown",
        role: p.role,
        tier: p.tier,
        teamName: p.team_name, // UNSOLD, PASSED, or a Team Name
        price: p.price || 0
    }));

    // 3. Fetch custom purses
    const redis = new Redis(process.env.REDIS_URL || "");
    const pursesStr = await redis.hgetall(teamPursesKey());
    const initialPurses: Record<string, number> = {};
    for (const [teamId, purse] of Object.entries(pursesStr)) {
        initialPurses[teamId] = parseInt(purse, 10);
    }
    redis.disconnect();

    return <AuctioneerClient players={formattedPlayers} teams={teams || []} initialPurses={initialPurses} />;
}
