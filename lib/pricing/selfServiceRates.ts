/**
 * Self-service bay pay-per-use rates — the single source of truth for every
 * surface that quotes what a bay costs.
 *
 * These rates were published nowhere, and the site had drifted into calling the
 * $10 average a *price* in two places while calling it an average in three
 * others. The distinction is the whole point: a customer who reads
 * "$10 per visit", taps, spends $4, and then sees a $10 hold on their statement
 * has every reason to call it a bait and switch.
 *
 * Every marketing surface that names a bay price imports from here.
 */

/** Minimum to start a bay with coins. The machine takes quarters and dollar coins. */
export const BAY_MINIMUM_CASH = 3;

/** Minimum to start a bay with tap-to-pay. */
export const BAY_MINIMUM_CARD = 5;

/**
 * Temporary authorization the bank places on a tap-to-pay start. The unspent
 * balance is released automatically — this is the bank's hold, not a charge
 * from us, and not ours to release early. Paying with coins avoids it entirely.
 *
 * This is the single most complaint-generating fact about the bays, so it is
 * stated wherever tap-to-pay is offered rather than buried in a FAQ.
 */
export const BAY_CARD_HOLD = 10;
export const BAY_CARD_HOLD_RELEASE = "48 to 72 hours";

/**
 * What a customer typically spends in one visit. An observed average, NOT a
 * price — never render this next to "per visit" without the word "average",
 * which is exactly the mistake this module exists to stop repeating.
 */
export const BAY_AVERAGE_SPEND = 10;

/** Format a whole-dollar rate for display: 3 -> "$3". */
export const usd = (amount: number) => `$${amount}`;

/** One-line summary of what it costs to start a bay. */
export const BAY_STARTING_RATE_SUMMARY = `from ${usd(
  BAY_MINIMUM_CASH
)} with coins, ${usd(BAY_MINIMUM_CARD)} with tap-to-pay`;
