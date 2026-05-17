import AdminClient from "./admin-client";
import { Metadata } from "next";
import prisma from "@/lib/prisma";

export const revalidate = 0;

export const metadata: Metadata = {
    title: "VPL Admin Command Center",
};

export default async function AdminPage() {
    // We fetch teams on the server to pass down for Match creation
    const teams = await prisma.team.findMany({
        select: { id: true, name: true, shortName: true, color: true, groupId: true },
        orderBy: { name: 'asc' }
    });

    return <AdminClient initialTeams={teams || []} />;
}
