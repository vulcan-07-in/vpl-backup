// Auction configuration for VPL Season 2
// Teams have 8 players total: 1 captain + 7 auctioned

export const AUCTION_CONSTANTS = {
    MAX_BUDGET: 10000,        // Default starting purse (same for all teams)
    MAX_PLAYERS: 8,           // Total squad size (captain + 7 auctioned)
    AUCTIONED_SLOTS: 7,       // Slots filled via auction
    DEFAULT_BID_INCREMENT_LOW: 50,    // +50 up to 1000
    DEFAULT_BID_INCREMENT_HIGH: 100,  // +100 above 1000
    BID_INCREMENT_THRESHOLD: 1000,    // Threshold to switch increments
    BASE_PRICES: {
        'MARQUEE': 500,
        'TIER 1': 300,
        'TIER 2': 100,
    } as Record<string, number>
};

/**
 * Get the bid increment based on the current bid amount.
 * Default: +50 up to 1000, +100 above 1000.
 * Can be overridden with custom increment.
 */
export function getBidIncrement(
    currentBid: number,
    customIncrement?: number
): number {
    if (customIncrement && customIncrement > 0) return customIncrement;
    return currentBid < AUCTION_CONSTANTS.BID_INCREMENT_THRESHOLD
        ? AUCTION_CONSTANTS.DEFAULT_BID_INCREMENT_LOW
        : AUCTION_CONSTANTS.DEFAULT_BID_INCREMENT_HIGH;
}

/**
 * Calculate the maximum amount a team can bid.
 * Must reserve enough purse for remaining empty slots at minimum base price.
 */
export function calculateMaxBid(
    currentPurse: number,
    currentRosterSize: number,
    minBasePriceInLeague: number = 100
): number {
    const emptySlots = AUCTION_CONSTANTS.MAX_PLAYERS - currentRosterSize;
    if (emptySlots <= 0) return 0; // Roster full

    // Reserve money for all REMAINING empty slots (excluding the one they are bidding on right now)
    const requiredReservation = (emptySlots - 1) * minBasePriceInLeague;

    return Math.max(0, currentPurse - requiredReservation);
}

/**
 * Get the base/minimum price for a given tier/pool.
 */
export function getBasePrice(tier: string | undefined): number {
    if (!tier) return 100;
    return AUCTION_CONSTANTS.BASE_PRICES[tier.toUpperCase()] || 100;
}
