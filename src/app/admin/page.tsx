import { supabase } from "@/lib/supabase";
import AdminClient from "./admin-client";
import { Metadata } from "next";

export const revalidate = 0;

export const metadata: Metadata = {
    title: "VPL Admin Command Center",
};

export default async function AdminPage() {
    // We fetch teams on the server to pass down for Match creation
    const { data: teams } = await supabase
        .from("Team")
        .select("id, name, shortName, color, groupId")
        .order("name", { ascending: true });

    return <AdminClient initialTeams={teams || []} />;
}
