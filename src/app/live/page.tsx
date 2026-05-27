import { fetchFixtures, fetchTeams } from "@/lib/data";
import LiveClient from "./live-client";

export const revalidate = 0; // Ensure data is always fresh

export default async function LivePage() {
    const fixtures = await fetchFixtures(2);
    const teams = await fetchTeams(2);
    
    return <LiveClient fixtures={fixtures} teams={teams} />;
}
