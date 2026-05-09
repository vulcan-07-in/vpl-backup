export const AUCTION_CONSTANTS = {
    MAX_BUDGET: 10000,
    MAX_PLAYERS: 15,
    BASE_PRICES: {
        'MARQUEE': 500,
        'FEMALE': 100,
        'TIER 1': 300,
        'TIER 2': 100
    } as Record<string, number>
};

export function calculateMaxBid(
    currentPurse: number, 
    currentRosterSize: number, 
    minBasePriceInLeague: number = 100
): number {
    const emptySlots = AUCTION_CONSTANTS.MAX_PLAYERS - currentRosterSize;
    if (emptySlots <= 0) return 0; // Roster full

    // Reserve money for all REMAINING empty slots (excluding the one they are bidding on right now)
    const requiredReservation = (emptySlots - 1) * minBasePriceInLeague;
    
    return currentPurse - requiredReservation;
}

export function getBasePrice(tier: string | undefined): number {
    if (!tier) return 100;
    return AUCTION_CONSTANTS.BASE_PRICES[tier.toUpperCase()] || 100;
}
