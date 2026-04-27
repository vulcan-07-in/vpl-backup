import prisma from "./prisma";
import { Team, Fixture } from "./tournament";

export async function fetchTeams(): Promise<Team[]> {
    try {
        const dbTeams = await prisma.team.findMany({
            orderBy: { name: 'asc' }
        });
        return dbTeams.map(t => ({
            teamName: t.name,
            shortName: t.shortName,
            color: t.color
        }));
    } catch (e) {
        console.error("Prisma fetchTeams error:", e);
        return [];
    }
}

export async function fetchSquads(): Promise<Array<{ teamName: string, shortName: string, color: string, players: { name: string, role: string, price: string }[] }>> {
    try {
        const dbTeams = await prisma.team.findMany({
            include: { players: true },
            orderBy: { name: 'asc' }
        });
        
        return dbTeams.map(t => ({
            teamName: t.name,
            shortName: t.shortName,
            color: t.color,
            players: t.players.map(p => ({
                name: p.name,
                role: p.role,
                price: p.price.toString()
            }))
        }));
    } catch (e) {
        console.error("Prisma fetchSquads error:", e);
        return [];
    }
}

export async function fetchFixtures(): Promise<Fixture[]> {
    try {
        const dbMatches = await prisma.match.findMany({
            include: {
                team1: true,
                team2: true,
                winner: true
            },
            orderBy: { matchNo: 'asc' } // In real implementation, add a sortOrder column or parse the M1, M2 properly
        });

        // Simple sort to handle M1, M2... M10 correctly instead of lexigraphically
        const sortedMatches = dbMatches.sort((a, b) => {
            const numA = parseInt(a.matchNo.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.matchNo.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
        });

        return sortedMatches.map(m => ({
            matchNo: m.matchNo,
            stage: m.stage as any,
            group: (m.group || "-") as any,
            team1: m.team1.name,
            team2: m.team2.name,
            winner: m.winner?.name || "",
            sortOrder: parseInt(m.matchNo.replace(/[^0-9]/g, '')) || 0
        }));
    } catch (e) {
        console.error("Prisma fetchFixtures error:", e);
        return [];
    }
}
