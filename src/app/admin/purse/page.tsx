import { supabase } from "@/lib/supabase";
import PurseClient from "./purse-client";
import { Metadata } from "next";

export const revalidate = 0;

export const metadata: Metadata = {
    title: "Team Purses | VPL Admin",
};

export default async function AdminPursePage() {
    const { data: teams } = await supabase
        .from("Team")
        .select("id, name, color, shortName")
        .order("name", { ascending: true });

    return <PurseClient initialTeams={teams || []} />;
}
