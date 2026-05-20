import { supabase } from "@/lib/supabase";
import AuctioneerClient from "./auctioneer-client";
import { Metadata } from "next";
import Redis from "ioredis";
import { teamPursesKey, teamLogosKey, teamPaddlesKey } from "@/lib/redis-keys";
import { AUCTION_CONSTANTS } from "@/lib/auction";

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
            gender,
            is_captain,
            varchasva_accounts (name, mobile_number)
        `)
        .eq("season", 2)
        .eq("is_approved", true);

    // 2. Fetch Teams (without purse)
    const { data: teamsData } = await supabase
        .from("Team")
        .select("id, name, color, shortName")
        .order("name", { ascending: true });

    // 3. Fetch purses, logos, and paddles from Redis
    const redis = new Redis(process.env.REDIS_URL || "");
    const [pursesHash, logosHash, paddlesHash] = await Promise.all([
        redis.hgetall(teamPursesKey()),
        redis.hgetall(teamLogosKey()),
        redis.hgetall(teamPaddlesKey()),
    ]);

    const teams = (teamsData || []).map(t => ({
        ...t,
        purse: pursesHash[t.id] ? parseInt(pursesHash[t.id], 10) : AUCTION_CONSTANTS.MAX_BUDGET,
        logoUrl: logosHash[t.id] || null,
        paddleNumber: paddlesHash[t.id] ? parseInt(paddlesHash[t.id], 10) : undefined,
    }));

    // Format players
    const formattedPlayers = (players || []).map((p: any) => ({
        accountId: p.account_id,
        name: p.varchasva_accounts?.name || "Unknown",
        role: p.role,
        tier: p.tier,
        gender: p.gender || "Male",
        teamName: p.team_name,
        price: p.price || 0,
        isCaptain: p.is_captain || false,
    }));

    // 4. Fetch Tier Prices Configuration — seeded from actual player tier data
    const tierPricesStr = await redis.get("vpl_tier_prices");

    // Derive distinct tiers from actual player pool
    const distinctTiers = [...new Set((players || []).map((p: any) => (p.tier || '').toUpperCase()).filter(Boolean))].sort();

    let initialTierPrices: Record<string, number>;
    if (tierPricesStr) {
        try {
            const saved = JSON.parse(tierPricesStr) as Record<string, number>;
            // Merge: keep saved values, add any new tiers not yet in Redis with a sensible default
            initialTierPrices = { ...saved };
            for (const tier of distinctTiers) {
                if (!(tier in initialTierPrices)) {
                    initialTierPrices[tier] = AUCTION_CONSTANTS.BASE_PRICES[tier] ?? 100;
                }
            }
        } catch (e) {
            console.error("Failed to parse tier prices", e);
            initialTierPrices = Object.fromEntries(distinctTiers.map(t => [t, AUCTION_CONSTANTS.BASE_PRICES[t] ?? 100]));
        }
    } else {
        // No saved prices — build from actual tiers
        initialTierPrices = Object.fromEntries(distinctTiers.map(t => [t, AUCTION_CONSTANTS.BASE_PRICES[t] ?? 100]));
        // Persist to Redis so settings panel works immediately
        if (distinctTiers.length > 0) {
            await redis.set("vpl_tier_prices", JSON.stringify(initialTierPrices));
        }
    }

    return <AuctioneerClient players={formattedPlayers} teams={teams} initialTierPrices={initialTierPrices} />;
}
