import { supabase } from "@/lib/supabase";
import ViewerClient from "./viewer-client";
import { Metadata } from "next";
import Redis from "ioredis";
import { teamPursesKey } from "@/lib/redis-keys";

export const revalidate = 60;
export const metadata: Metadata = {
    title: "Live Auction | VPL S2",
    description: "Watch the Varchasva Premier League Season 2 Player Draft live.",
};

export default async function AuctionViewerPage() {
    // 1. Fetch Teams
    const { data: teams } = await supabase
        .from("Team")
        .select("id, name, color, shortName")
        .order("name", { ascending: true });

    // 2. Fetch all registered players to calculate purses
    const { data: players } = await supabase
        .from("vpl_registrations")
        .select("account_id, team_name, price, varchasva_accounts(name, mobile_number), tier, role")
        .eq("season", 2);

    const formattedPlayers = (players || []).map((p: any) => ({
        accountId: p.account_id,
        name: p.varchasva_accounts?.name || "Unknown",
        teamName: p.team_name,
        price: p.price || 0,
        tier: p.tier,
        role: p.role
    }));

    // 3. Fetch custom purses
    const redis = new Redis(process.env.REDIS_URL || "");
    const pursesStr = await redis.hgetall(teamPursesKey());
    const initialPurses: Record<string, number> = {};
    for (const [teamId, purse] of Object.entries(pursesStr)) {
        initialPurses[teamId] = parseInt(purse, 10);
    }
    redis.disconnect();

    return <ViewerClient teams={teams || []} players={formattedPlayers} initialPurses={initialPurses} />;
}
