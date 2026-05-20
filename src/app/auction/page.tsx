import { supabase } from "@/lib/supabase";
import ViewerClient from "./viewer-client";
import { Metadata } from "next";
import Redis from "ioredis";
import { teamPursesKey, teamLogosKey } from "@/lib/redis-keys";
import { AUCTION_CONSTANTS } from "@/lib/auction";

export const revalidate = 60;
export const metadata: Metadata = {
    title: "Live Auction | VPL S2",
    description: "Watch the Varchasva Premier League Season 2 Player Draft live.",
};

export default async function AuctionViewerPage() {
    // Fetch Teams (without purse)
    const { data: teamsData } = await supabase
        .from("Team")
        .select("id, name, color, shortName")
        .order("name", { ascending: true });

    // Fetch purses and logos from Redis
    const redis = new Redis(process.env.REDIS_URL || "");
    const [pursesHash, logosHash, tierPricesStr, auctionStartTimeStr] = await Promise.all([
        redis.hgetall(teamPursesKey()),
        redis.hgetall(teamLogosKey()),
        redis.get("vpl_tier_prices"),
        redis.get("vpl_auction_start_time"),
    ]);

    const auctionStartTime = auctionStartTimeStr || "2026-05-20T17:00:00+05:30";

    const teams = (teamsData || []).map(t => ({
        ...t,
        purse: pursesHash[t.id] ? parseInt(pursesHash[t.id], 10) : AUCTION_CONSTANTS.MAX_BUDGET,
        logoUrl: logosHash[t.id] || null,
    }));

    const { data: players } = await supabase
        .from("vpl_registrations")
        .select("account_id, team_name, price, varchasva_accounts(name, mobile_number), tier, role, gender, is_captain")
        .eq("season", 2)
        .eq("is_approved", true);

    let initialTierPrices: Record<string, number> = AUCTION_CONSTANTS.BASE_PRICES;
    if (tierPricesStr) {
        try {
            initialTierPrices = JSON.parse(tierPricesStr);
        } catch (e) {}
    } else {
        // Build from actual player tiers on first load
        const distinctTiers = [...new Set((players || []).map((p: any) => (p.tier || '').toUpperCase()).filter(Boolean))];
        if (distinctTiers.length > 0) {
            initialTierPrices = Object.fromEntries(distinctTiers.map(t => [t, AUCTION_CONSTANTS.BASE_PRICES[t] ?? 100]));
        }
    }

    const formattedPlayers = (players || []).map((p: any) => ({
        accountId: p.account_id,
        name: p.varchasva_accounts?.name || "Unknown",
        teamName: p.team_name,
        price: p.price || 0,
        tier: p.tier,
        role: p.role,
        gender: p.gender || "Male",
        isCaptain: p.is_captain || false,
    }));

    return <ViewerClient teams={teams} players={formattedPlayers} initialTierPrices={initialTierPrices} auctionStartTime={auctionStartTime} />;
}
