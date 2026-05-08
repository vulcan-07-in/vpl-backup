import { unstable_noStore as noStore } from "next/cache";
import prisma from "./prisma";
import { Team, Fixture } from "./tournament";
import { supabase } from "./supabase";

// Helper to map raw DB rows to internal types
const mapTeam = (row: any): Team => ({
  teamName: row.name,
  shortName: row.shortName,
  color: row.color,
});

/**
 * Fetch teams – works for both seasons.
 * Pass `season: 2` to use Supabase, otherwise Prisma (Season 1).
 */
export async function fetchTeams(season: number = 1): Promise<Team[]> {
  noStore();
  if (season === 2) {
    const { data, error } = await supabase
      .from("team")
      .select("name, shortName, color")
      .order("name", { ascending: true });
    if (error) {
      console.error("Supabase fetchTeams error:", error);
      return [];
    }
    return (data || []).map(mapTeam);
  }
  // Season 1 – Prisma
  try {
    const dbTeams = await prisma.team.findMany({
      orderBy: { name: "asc" },
    });
    return dbTeams.map(t => ({
      teamName: t.name,
      shortName: t.shortName,
      color: t.color,
    }));
  } catch (e) {
    console.error("Prisma fetchTeams error:", e);
    return [];
  }
}

/** Fetch squads (teams + players) */
export async function fetchSquads(season: number = 1): Promise<Array<{ teamName: string; shortName: string; color: string; players: { name: string; role: string; price: string }[] }>> {
  noStore();
  if (season === 2) {
    // Fetch teams with their IDs for correct FK resolution
    type TeamRow = { id: string; name: string; shortName: string; color: string };
    type PlayerRow = { name: string; role: string; price: number; team_id: string };
    const { data: teamRows, error: teamErr } = await supabase
      .from("team")
      .select("id, name, shortName, color")
      .order("name", { ascending: true });
    if (teamErr) {
      console.error("Supabase fetchSquads teams error:", teamErr);
      return [];
    }
    const { data: players, error: playerErr } = await supabase
      .from("player")
      .select("name, role, price, team_id");
    if (playerErr) {
      console.error("Supabase fetchSquads players error:", playerErr);
      return [];
    }

    // Build id→teamName map for correct FK lookup
    const idToName = new Map<string, string>(
      (teamRows as TeamRow[] || []).map((t: TeamRow) => [t.id, t.name])
    );

    const squads = (teamRows as TeamRow[] || []).map((t: TeamRow) => ({
      teamName: t.name,
      shortName: t.shortName,
      color: t.color,
      players: [] as { name: string; role: string; price: string }[],
    }));
    type SquadEntry = { teamName: string; shortName: string; color: string; players: { name: string; role: string; price: string }[] };
    const squadByName = Object.fromEntries(squads.map((s: SquadEntry) => [s.teamName, s])) as Record<string, SquadEntry>;

    (players as PlayerRow[] || []).forEach((p: PlayerRow) => {
      const teamName = idToName.get(p.team_id as string);
      if (teamName && squadByName[teamName]) {
        squadByName[teamName].players.push({
          name: p.name,
          role: p.role,
          price: p.price?.toString() ?? "",
        });
      }
    });
    return squads;
  }
  // Season 1 – Prisma
  try {
    const dbTeams = await prisma.team.findMany({
      include: { players: true },
      orderBy: { name: "asc" },
    });
    return dbTeams.map(t => ({
      teamName: t.name,
      shortName: t.shortName,
      color: t.color,
      players: t.players.map(p => ({
        name: p.name,
        role: p.role,
        price: p.price.toString(),
      })),
    }));
  } catch (e) {
    console.error("Prisma fetchSquads error:", e);
    return [];
  }
}

/** Fetch fixtures (matches) */
export async function fetchFixtures(season: number = 1): Promise<Fixture[]> {
  noStore();
  if (season === 2) {
    const { data: matches, error: matchErr } = await supabase
      .from("match")
      .select("matchNo, stage, \"group\", team1_id, team2_id, winner_id")
      .order("matchNo", { ascending: true });
    if (matchErr) {
      console.error("Supabase fetchFixtures match error:", matchErr);
      return [];
    }
    const { data: teams, error: teamErr } = await supabase.from("team").select("id, name");
    if (teamErr) {
      console.error("Supabase fetchFixtures team error:", teamErr);
      return [];
    }
    type TeamIdRow = { id: string; name: string };
    type MatchRow = { matchNo: string; stage: string; group: string | null; team1_id: string; team2_id: string; winner_id: string | null };
    const idToName = new Map<string, string>((teams as TeamIdRow[] || []).map((t: TeamIdRow) => [t.id, t.name]));
    return (matches as MatchRow[] || []).map((m: MatchRow) => ({
      matchNo: m.matchNo,
      stage: m.stage as any,
      group: (m as any)["group"] as any,
      team1: idToName.get(m.team1_id) ?? "",
      team2: idToName.get(m.team2_id) ?? "",
      winner: m.winner_id ? idToName.get(m.winner_id) ?? "" : "",
      sortOrder: parseInt(m.matchNo.replace(/[^0-9]/g, "")) || 0,
    }));
  }
  // Season 1 – Prisma (original implementation)
  try {
    const dbMatches = await prisma.match.findMany({
      include: {
        team1: true,
        team2: true,
        winner: true,
      },
      orderBy: { matchNo: "asc" },
    });
    const sortedMatches = dbMatches.sort((a, b) => {
      const numA = parseInt(a.matchNo.replace(/[^0-9]/g, "")) || 0;
      const numB = parseInt(b.matchNo.replace(/[^0-9]/g, "")) || 0;
      return numA - numB;
    });
    return sortedMatches.map(m => ({
      matchNo: m.matchNo,
      stage: m.stage as any,
      group: (m.group || "-") as any,
      team1: m.team1.name,
      team2: m.team2.name,
      winner: m.winner?.name || "",
      sortOrder: parseInt(m.matchNo.replace(/[^0-9]/g, "")) || 0,
    }));
  } catch (e) {
    console.error("Prisma fetchFixtures error:", e);
    return [];
  }
}
