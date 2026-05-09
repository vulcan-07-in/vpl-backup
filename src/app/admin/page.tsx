import { fetchTeams } from "@/lib/data";
import AdminClient from "./admin-client";
import { Metadata } from "next";

export const revalidate = 0;

export const metadata: Metadata = {
    title: "VPL Admin Command Center",
};

export default async function AdminPage() {
    // We fetch teams on the server to pass down for Match creation
    const teams = await fetchTeams(2);

    return <AdminClient initialTeams={teams} />;
}
