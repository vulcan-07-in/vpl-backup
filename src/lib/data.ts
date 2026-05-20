import { unstable_noStore as noStore } from "next/cache";
import prisma from "./prisma";
import { Team, Fixture, LiveMatchState } from "./tournament";
import { supabase } from "./supabase";
import Redis from "ioredis";
import { teamLogosKey, teamPaddlesKey } from "./redis-keys";

const globalForRedis = global as unknown as { redis: Redis };
const redis = globalForRedis.redis || new Redis(process.env.REDIS_URL || "");
if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Helper to map raw DB rows to internal types
const mapTeam = (row: any, logoUrl?: string, paddleNumber?: number): Team => ({
  id: row.id,
  teamName: row.name,
  shortName: row.shortName,
  color: row.color,
  logoUrl: logoUrl || undefined,
  paddleNumber: paddleNumber,
});

/**
 * Fetch team logos from Redis — returns { teamName: logoUrl }
 */
export async function fetchTeamLogos(): Promise<Record<string, string>> {
  try {
    const { data: teams } = await supabase.from("Team").select("id, name");
    const logosHash = await redis.hgetall(teamLogosKey());
    const byName: Record<string, string> = {};
    (teams || []).forEach((t: any) => {
      if (logosHash[t.id]) byName[t.name] = logosHash[t.id];
    });
    return byName;
  } catch {
    return {};
  }
}

/**
 * Fetch teams – works for both seasons.
 * Pass `season: 2` to use Supabase, otherwise Prisma (Season 1).
 */
export async function fetchTeams(season: number = 1): Promise<Team[]> {
  if (season === 2) {
    const { data, error } = await supabase
      .from("Team")
      .select("id, name, shortName, color")
      .order("name", { ascending: true });
    if (error) {
      console.error("Supabase fetchTeams error:", error);
      return [];
    }
    // Fetch logos and paddles from Redis
    let logosHash: Record<string, string> = {};
    let paddlesHash: Record<string, string> = {};
    try { 
      logosHash = await redis.hgetall(teamLogosKey()) || {}; 
      paddlesHash = await redis.hgetall(teamPaddlesKey()) || {};
    } catch {}
    return (data || []).map((row: any) => mapTeam(row, logosHash[row.id], paddlesHash[row.id] ? parseInt(paddlesHash[row.id], 10) : undefined));
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
  if (season === 2) {
    // Fetch teams with their IDs for correct FK resolution
    type TeamRow = { id: string; name: string; shortName: string; color: string };
    
    const { data: teamRows, error: teamErr } = await supabase
      .from("Team")
      .select("id, name, shortName, color")
      .order("name", { ascending: true });

    if (teamErr) {
      console.error("Supabase fetchSquads teams error:", teamErr);
      return [];
    }

    // Fetch players from the new Varchasva identity tables
    const { data: registrations, error: regErr } = await supabase
      .from("vpl_registrations")
      .select(`
        team_name,
        role,
        is_captain,
        price,
        varchasva_accounts (
          name,
          account_id
        )
      `)
      .eq("season", 2);

    if (regErr) {
      console.error("Supabase fetchSquads registrations error:", regErr);
      return [];
    }

    // Fetch manual admin additions from Player table
    const { data: manualPlayers, error: manualErr } = await supabase
      .from("Player")
      .select("id, name, role, price, teamId");

    if (manualErr) {
      console.error("Supabase fetchSquads manual players error:", manualErr);
    }

    // Fetch logos from Redis for squads
    let logosHash: Record<string, string> = {};
    try { logosHash = await redis.hgetall(teamLogosKey()) || {}; } catch {}
    const logoByTeamId = Object.fromEntries((teamRows as TeamRow[] || []).map((t: TeamRow) => [t.id, logosHash[t.id] || undefined]));

    const squads = (teamRows as TeamRow[] || []).map((t: TeamRow) => ({
      teamName: t.name,
      shortName: t.shortName,
      color: t.color,
      logoUrl: logoByTeamId[t.id],
      players: [] as { name: string; role: string; price: string; accountId: string; isCaptain?: boolean }[],
    }));

    type SquadEntry = { teamName: string; shortName: string; color: string; logoUrl?: string; players: { name: string; role: string; price: string; accountId: string; isCaptain?: boolean }[] };
    const squadByName = Object.fromEntries(squads.map((s: SquadEntry) => [s.teamName.toLowerCase().trim(), s])) as Record<string, SquadEntry>;
    const squadByTeamId = Object.fromEntries((teamRows as TeamRow[] || []).map((t) => [t.id, squadByName[t.name.toLowerCase().trim()]]));

    (registrations as any[] || []).forEach((reg: any) => {
      const teamKey = (reg.team_name || "UNSOLD").toLowerCase().trim();
      const targetSquad = squadByName[teamKey];
      
      if (targetSquad) {
        targetSquad.players.push({
          name: reg.varchasva_accounts?.name || "Unknown",
          role: reg.role || "Unknown",
          price: reg.price != null ? reg.price.toString() : "0",
          accountId: reg.varchasva_accounts?.account_id || "",
          isCaptain: reg.is_captain || false
        });
      }
    });

    (manualPlayers as any[] || []).forEach((p: any) => {
      const targetSquad = squadByTeamId[p.teamId];
      if (targetSquad) {
        targetSquad.players.push({
          name: p.name,
          role: p.role,
          price: p.price?.toString() || "0",
          accountId: p.id // Use player ID as account ID for manual players
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
  if (season === 2) {
    const { data: matches, error: matchErr } = await supabase
      .from("Match")
      .select("matchNo, stage, \"group\", team1Id, team2Id, winnerId, status, tossWinnerId, tossDecision")
      .order("matchNo", { ascending: true });
    if (matchErr) {
      console.error("Supabase fetchFixtures match error:", matchErr);
      return [];
    }
    const { data: teams, error: teamErr } = await supabase.from("Team").select("id, name");
    if (teamErr) {
      console.error("Supabase fetchFixtures team error:", teamErr);
      return [];
    }
    type TeamIdRow = { id: string; name: string };
    type MatchRow = { matchNo: string; stage: string; group: string | null; team1Id: string; team2Id: string; winnerId: string | null; status: string; tossWinnerId: string | null; tossDecision: string | null };
    const idToName = new Map<string, string>((teams as TeamIdRow[] || []).map((t: TeamIdRow) => [t.id, t.name]));
    return (matches as MatchRow[] || []).map((m: MatchRow) => ({
      matchNo: m.matchNo,
      stage: m.stage as any,
      group: (m as any)["group"] as any,
      team1: idToName.get(m.team1Id) ?? "",
      team2: idToName.get(m.team2Id) ?? "",
      winner: m.status === "ABANDONED" ? "ABANDONED" : (m.winnerId ? idToName.get(m.winnerId) ?? "" : ""),
      tossWinner: m.tossWinnerId ? idToName.get(m.tossWinnerId) ?? "" : "",
      tossDecision: m.tossDecision ?? "",
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

/** Fetch all live states from Supabase + Redis */
export async function fetchAllLiveStates(): Promise<Record<string, LiveMatchState>> {
  let liveStates: Record<string, any> = {};
  const cleanId = (id: string) => String(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();

  try {
    const { data: matches, error } = await supabase
      .from('Match')
      .select('matchNo, liveState, isFunMatch')
      .not('liveState', 'is', null);

    if (!error && matches) {
      matches.forEach(m => {
        const matchId = cleanId(m.matchNo);
        if (m.liveState) {
          const state = m.liveState as any;
          if (m.isFunMatch) state.isFunMatch = true;
          liveStates[matchId] = state;
        }
      });
    }
  } catch (e) {
    console.error("Failed to fetch S2 live states from Supabase", e);
  }

  try {
    const keys = await redis.keys('s2:live_match_*');
    if (keys.length > 0) {
      const values = await redis.mget(...keys);
      keys.forEach((key, i) => {
        const matchId = key.replace('s2:live_match_', '');
        const data = values[i];
        if (data) {
          const parsed = JSON.parse(data);
          const cid = cleanId(matchId);
          if (liveStates[cid]?.isFunMatch) {
            parsed.isFunMatch = true;
          }
          liveStates[cid] = parsed;
        }
      });
    }
  } catch (e) {
    console.error("Failed to fetch S2 live states from Redis", e);
  }

  return liveStates;
}
