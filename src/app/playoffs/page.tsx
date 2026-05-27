import { fetchFixtures, fetchTeams, fetchAllLiveStates } from "@/lib/data";
import PlayoffsClient from "./playoffs-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Playoffs | Varchasva Premier League",
    description: "Knockout stage bracket and seedings for the VPL Season 2.",
};

export default async function PlayoffsPage() {
    // Fetch S2 data
    const teams = await fetchTeams(2);
    const fixtures = await fetchFixtures(2);
    const liveStates = await fetchAllLiveStates();

    return <PlayoffsClient fixtures={fixtures} teams={teams} liveStates={liveStates} />;
}
