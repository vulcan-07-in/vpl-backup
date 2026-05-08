/**
 * Redis key helpers for Season 2.
 * All S2 live state keys use the `s2_` prefix to avoid collision with S1 keys.
 *
 * S1 keys (used in the main/season-1-archive branch) look like:
 *   live_match_<matchId>
 *   active_match
 *
 * S2 keys (used in season-2-preview branch) look like:
 *   s2_live_match_<matchId>
 *   s2_active_match
 */
export const liveMatchKey = (matchId: string): string =>
    `s2_live_match_${matchId}`;

export const activeMatchKey = (): string =>
    "s2_active_match";

export const allLiveMatchPattern = (): string =>
    "s2_live_match_*";
