import TeamsClient from "./teams-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Team Management | VPL Admin",
};

export default function AdminTeamsPage() {
    // Teams are fetched client-side so the UI is always live
    return <TeamsClient />;
}
