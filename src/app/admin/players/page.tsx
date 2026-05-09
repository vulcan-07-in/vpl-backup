import { supabase } from "@/lib/supabase";
import PlayersClient from "./players-client";
import { Metadata } from "next";

export const revalidate = 0;
export const metadata: Metadata = {
    title: "Manage Players | VPL Admin",
};

export default async function AdminPlayersPage() {
    // 1. Fetch all registrants for Season 2
    const { data: registrations, error } = await supabase
        .from("vpl_registrations")
        .select(`
            registration_id,
            account_id,
            role,
            tier,
            is_approved,
            is_captain,
            team_name,
            varchasva_accounts (
                name,
                mobile_number
            )
        `)
        .eq("season", 2)
        .order("is_approved", { ascending: true });

    // 2. Fetch teams for captain assignment
    const { data: teams } = await supabase
        .from("Team")
        .select("id, name, color")
        .order("name", { ascending: true });

    const formattedPlayers = (registrations || []).map((reg: any) => ({
        accountId: reg.account_id,
        name: reg.varchasva_accounts?.name || "Unknown",
        mobile: reg.varchasva_accounts?.mobile_number || "",
        role: reg.role,
        tier: reg.tier,
        isApproved: reg.is_approved,
        isCaptain: reg.is_captain,
        teamName: reg.team_name
    }));

    return (
        <PlayersClient 
            initialPlayers={formattedPlayers} 
            teams={teams || []} 
        />
    );
}
