/**
 * Redis key helpers for Season 2.
 * All S2 live state keys use the `s2:` prefix to avoid collision with S1 keys.
 *
 * S1 keys (used in the main/season-1-archive branch) look like:
 *   live_match_<matchId>
 *   active_match
 *
 * S2 keys (used in season-2-preview branch) look like:
 *   s2:live_match_<matchId>
 *   s2:active_match
 */
export const liveMatchKey = (matchId: string): string =>
    `s2:live_match_${matchId}`;

export const activeMatchKey = (): string =>
    "s2:active_match";

export const allLiveMatchPattern = (): string =>
    "s2:live_match_*";

export const teamPursesKey = (): string =>
    "s2:team_purses";
