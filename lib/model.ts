// The token radar's model, version radar-2: one sealed snapshot of the protocol universe in, one
// ranked board of pre-token protocols out. Every figure on the board is derived from the snapshot's
// own numbers; no protocol name is ever special-cased, and no row is hand-picked.
//
// WHICH PROTOCOLS THE BOARD RANKS
// A protocol is pre-token when its record carries no token: no market cap, no CoinGecko id, no
// symbol. Pre-token is necessary but not sufficient: a launch radar ranks protocols that could
// still issue a token of their own, so the board also sets aside the records the house's own
// watchlist rule identifies as products of a token that already trades, in the rule's own terms:
//   - a name that begins with an exchange's name (the house's list of eight);
//   - a name carrying a whole word wrapped, staked or staking;
//   - the CEX category (an exchange's own listing is a venue, not a launch candidate);
//   - the Canonical Bridge category (a chain's official gateway: the chain's infrastructure,
//     and where the chain's token already trades, its product);
//   - a Bridge the snapshot records on a single chain (a one-chain "bridge" wraps one asset or
//     serves one chain; an interoperability protocol spans chains by construction).
// Multi-chain bridges, liquid staking and restaking protocols, and every other pre-token record
// stay: their own governance token is a real candidate. Of the snapshot's 342 pre-token records
// the screen keeps 246. The watchlist (40 protocols at or above the $50M floor) is a subset of
// the board by construction: coverage of it is the gate's row, and the board never gambles it.
// The universe is finite (342 pre-token records exist), so the board is as wide as an honest
// screen allows: padding it further would mean ranking wrapped bitcoin and exchange listings as
// future launches, which is the one error this screen exists to prevent.
//
// THE IMPLIED VALUE MODEL
// Protocols that already trade show what the market pays for a dollar of TVL in each category, so
// the model reads that multiple out of the snapshot itself instead of assuming one:
//
//   ratio(c)    = median over the snapshot's live-token protocols in category c of mcap_usd / tvl_usd,
//                 shrunk toward the global live median G with a prior weight of 4 observations and
//                 clamped to [0.04, 2.5]; a category with no live protocol uses G.
//   base        = tvl_usd x ratio(category)
//   momentum    = 1 + 0.6 x clamp(change_7d, -50, 100) / 100        (unreported growth counts 0)
//   seasoning   = 0.70 + 0.50 x (1 - exp(-age_days / 540))          (age unknown: 365 days)
//   reach       = 1 + 0.03 x min(chains - 1, 7)                      (distribution breadth)
//   deployment  = 0.35 when the name ends in a version marker AND the unversioned parent protocol
//                 is itself in the snapshot (a later deployment of a listed protocol: the launch,
//                 if it comes, belongs to the parent name, so the row's claim is discounted, not
//                 doubled); 1 otherwise.
//   implied     = max(1, round(base x momentum x seasoning x reach x deployment))
//
// The multipliers a row carries are rounded to 4 decimals BEFORE the multiplication, so the
// dashboard recomputes the identical integer from the figures it shows: the page's arithmetic and
// the board's data are one arithmetic, visibly.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the code applies them. */
export interface ModelConstants {
  ratio_floor: number;
  ratio_cap: number;
  ratio_prior_weight: number;
  momentum_weight: number;
  momentum_floor: number;
  momentum_cap: number;
  seasoning_base: number;
  seasoning_range: number;
  seasoning_tau_days: number;
  unknown_age_days: number;
  reach_per_chain: number;
  reach_max_extra_chains: number;
  deployment_discount: number;
}

export const MODEL: ModelConstants = {
  ratio_floor: 0.04,
  ratio_cap: 2.5,
  ratio_prior_weight: 4,
  momentum_weight: 0.6,
  momentum_floor: -50,
  momentum_cap: 100,
  seasoning_base: 0.7,
  seasoning_range: 0.5,
  seasoning_tau_days: 540,
  unknown_age_days: 365,
  reach_per_chain: 0.03,
  reach_max_extra_chains: 7,
  deployment_discount: 0.35,
};

/** The model's version label: the dashboard names it and the board's rows carry it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One category's live multiple: how many live protocols priced it, their median, and what the model uses. */
export interface CategoryRatio {
  category: string;
  live_count: number;
  median_ratio: number;
  used_ratio: number;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row, with the model's own working shown. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  watchlist: boolean;
  versioned: boolean;
  implied_value_usd: number;
  model: {
    category_ratio: number;
    ratio_live_count: number;
    momentum_multiplier: number;
    seasoning_multiplier: number;
    reach_multiplier: number;
    deployment_factor: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's view of one row: the board row's figures, its farm plan, and its model working. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  watchlist: boolean;
  versioned: boolean;
  implied_value_usd: number;
  category_ratio: number;
  ratio_live_count: number;
  momentum_multiplier: number;
  seasoning_multiplier: number;
  reach_multiplier: number;
  deployment_factor: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, the ratios the model read, and the model. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  global_ratio: number;
  ratios: CategoryRatio[];
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  set_aside_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule, the same pattern the house's watchlist is drawn with. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A name that begins with an exchange's name: the house's own list, from the watchlist's rule. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/** A whole word wrapped, staked or staking, any case: the mark of a product of another token. */
const PRODUCT_WORD = /\b(wrapped|staked|staking)\b/i;

/**
 * Whether the board ranks a protocol: it records no token, and it is not a product of a token that
 * already trades under the screen the header states (an exchange's name, a wrapped/staked/staking
 * word, the CEX or Canonical Bridge categories, or a bridge recorded on a single chain).
 */
export function isBoardable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (EXCHANGE_PREFIX.test(p.name)) return false;
  if (PRODUCT_WORD.test(p.name)) return false;
  if (p.category === 'CEX') return false;
  if (p.category === 'Canonical Bridge') return false;
  if (p.category === 'Bridge' && p.chains.length <= 1) return false;
  return true;
}

/** The name with its version marker stripped, or null when the name carries none. */
function parentName(name: string): string | null {
  const m = VERSIONED.exec(name);
  return m === null ? null : name.slice(0, m.index);
}

/** The median of a non-empty list of numbers. */
function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * The model's multiples, read out of the snapshot: for every category, the median market cap per
 * TVL dollar of the protocols in it that already trade, shrunk toward the global median so a thin
 * category borrows the market's centre instead of swinging on one or two names.
 */
export function categoryRatios(snapshot: Snapshot, model: ModelConstants = MODEL): { global: number; byCategory: Map<string, CategoryRatio> } {
  const live = snapshot.protocols.filter((p) => !isPreToken(p) && (p.mcap_usd ?? 0) > 0 && p.tvl_usd > 0);
  const global = live.length > 0 ? median(live.map((p) => p.mcap_usd! / p.tvl_usd)) : 0.2;
  const groups = new Map<string, number[]>();
  for (const p of live) {
    const key = p.category ?? '';
    const list = groups.get(key) ?? [];
    list.push(p.mcap_usd! / p.tvl_usd);
    groups.set(key, list);
  }
  const byCategory = new Map<string, CategoryRatio>();
  for (const [key, values] of groups) {
    const med = median(values);
    const shrunk = (values.length * med + model.ratio_prior_weight * global) / (values.length + model.ratio_prior_weight);
    byCategory.set(key, {
      category: key === '' ? 'Uncategorised' : key,
      live_count: values.length,
      median_ratio: round4(med),
      used_ratio: round4(Math.min(model.ratio_cap, Math.max(model.ratio_floor, shrunk))),
    });
  }
  return { global: round4(global), byCategory };
}

/** The five multipliers and the implied value one protocol gets under `model`, multipliers rounded first. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  ratio: CategoryRatio,
  parentListed: boolean,
  model: ModelConstants,
): { implied: number; momentumMult: number; seasoningMult: number; reachMult: number; deploymentFactor: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const growth = Math.min(model.momentum_cap, Math.max(model.momentum_floor, finite(protocol.change_7d, 0)));
  const momentumMult = round4(1 + (growth / 100) * model.momentum_weight);
  const ageForModel = age ?? model.unknown_age_days;
  const seasoningMult = round4(model.seasoning_base + model.seasoning_range * (1 - Math.exp(-Math.max(ageForModel, 0) / model.seasoning_tau_days)));
  const reachMult = round4(1 + model.reach_per_chain * Math.min(Math.max(protocol.chains.length - 1, 0), model.reach_max_extra_chains));
  const deploymentFactor = parentListed && VERSIONED.test(protocol.name) ? model.deployment_discount : 1;
  const implied = Math.max(1, Math.round(protocol.tvl_usd * ratio.used_ratio * momentumMult * seasoningMult * reachMult * deploymentFactor));
  return { implied, momentumMult, seasoningMult, reachMult, deploymentFactor, age };
}

// ------------------------------------------------------------------ farm plans
//
// A farm plan is derived from the protocol's own record: its category names the core action, its
// first chain names the ecosystem (the wallet, the fee level, whether a bridge stands in the way),
// its TVL sizes the position a reader is told to take, and its age sets the hold. Two phrasings of
// the wallet step and the cadence step rotate on a hash of the slug, so neighbouring rows do not
// read as one pasted paragraph; the numbers in every step are the row's own.

/** What one transaction costs on a chain, and the wallet its ecosystem uses. */
interface ChainProfile {
  wallet: string;
  gas: number;
}

const CHEAP_EVM = new Set([
  'Arbitrum', 'Base', 'Optimism', 'Polygon', 'Linea', 'Avalanche', 'Binance', 'Scroll', 'zkSync Era',
  'Mantle', 'Blast', 'Gnosis', 'Sonic', 'Fantom', 'Berachain', 'Monad', 'Plasma', 'Ink', 'Unichain',
  'Soneium', 'World Chain', 'Taiko', 'Mode', 'Celo', 'Moonbeam', 'Metis', 'Boba', 'Fraxtal', 'Zora',
]);

function chainProfile(chain: string): ChainProfile {
  if (chain === 'Ethereum') return { wallet: 'an Ethereum wallet such as MetaMask or Rabby', gas: 8 };
  if (chain === 'Solana') return { wallet: 'a Solana wallet such as Phantom or Solflare', gas: 0.05 };
  if (chain === 'Bitcoin') return { wallet: 'a Bitcoin wallet you control the keys to', gas: 2 };
  if (chain === 'Tron') return { wallet: 'a Tron wallet such as TronLink', gas: 1 };
  if (chain === 'Hyperliquid L1') return { wallet: 'a wallet funded on Hyperliquid', gas: 0.1 };
  if (CHEAP_EVM.has(chain)) return { wallet: 'an EVM wallet such as MetaMask or Rabby', gas: 0.25 };
  return { wallet: 'a wallet that supports the chain', gas: 1 };
}

/** A fee figure in words: cents stay cents, dollars round to a clean number. */
function feeText(usd: number): string {
  if (usd < 0.1) return 'a few cents';
  if (usd < 1) return `about $${usd.toFixed(2)}`;
  return `about $${Math.round(usd)}`;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 500;
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 250_000_000) return 150;
  if (p.tvl_usd >= 50_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** A stable small hash of a slug, for rotating phrasings deterministically. */
function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

/** The category's core action, in two sentences a farmer can follow. */
function coreAction(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const n = p.name;
  if (c.includes('curator') || c.includes('allocator') || c.includes('collateral management')) {
    return `Deposit $${capital} of USDC into a ${n} vault on ${chain} whose mandate you have read end to end. Keep the vault shares untouched; a curator vault is a managed position, so the farming is the deposit, the duration and the record of both.`;
  }
  if (c.includes('lend') || c.includes('cdp')) {
    return `Supply $${capital} of USDC to ${n} on ${chain}, then borrow a small amount (at most a quarter of the supply) against it and repay within the week. Working both sides of the market is what lending protocols count, and the borrow-repay loop is cheap proof of it.`;
  }
  if (c.includes('leveraged')) {
    return `Open a small leveraged position of $${capital} in ${n} on ${chain}, at the lowest leverage it offers, and rebalance it once a week. Keep the size small on purpose: the activity is the signal, and liquidation would end the farm and the capital with it.`;
  }
  if (c.includes('dex')) {
    return `Provide $${capital} of liquidity to a main ${n} pool on ${chain} (a stable pair if one is offered) and make two small swaps through the same interface. Liquidity that stays through several weekly snapshots is worth more than volume that flashes once.`;
  }
  if (c.includes('bridge')) {
    return `Route $${capital} of USDC through ${n} to ${chain} and back on a second day, then use the bridged funds in one app on the far side. Bridge farms are counted on completed transfers with real value, not on test amounts, so keep every transfer at a size that matters.`;
  }
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('options') || c.includes('basis') || c.includes('interest rate') || c.includes('synthetics')) {
    return `Deposit $${capital} of USDC as margin on ${n} and open one small hedged trade (a long and an offsetting position, or the basis trade the interface offers). The farm is margin held plus trades settled over time, so open and close on different days.`;
  }
  if (c.includes('staking') || c.includes('restak')) {
    return `Stake $${capital} of the chain's staking asset through ${n} and keep the receipt token in the same wallet. Do not sell or move the receipt: for staking protocols the receipt's age in one wallet is the whole record.`;
  }
  if (c.includes('yield') || c.includes('farm') || c.includes('liquidity manager')) {
    return `Deposit $${capital} of USDC into ${n}'s main vault on ${chain} and leave the shares in the wallet. If the vault offers a boosted or locked tier for a longer commitment, take the shortest lock first so the exit stays in your hands.`;
  }
  if (c.includes('rwa')) {
    return `Mint $${capital} of ${n}'s yield asset on ${chain} through its own mint page and hold it in the wallet. Complete any onboarding the mint asks for on the first visit; real-world-asset protocols gate their distributions on it.`;
  }
  if (c.includes('stable') || c.includes('algo') || c.includes('dual-token')) {
    return `Mint or deposit $${capital} of the stable asset ${n} issues, on ${chain}, and hold the position rather than trading it. Add one small second mint a week later so the wallet shows a pattern, not an event.`;
  }
  if (c.includes('launchpad')) {
    return `Register the wallet on ${n} and take part in one sale or allocation round with $${capital} or less. Between rounds, complete whatever whitelist or holding task the launchpad currently counts, since that record is usually the allocation key.`;
  }
  if (c.includes('prediction')) {
    return `Fund $${capital} on ${n} and place two small positions on markets that settle on different dates. Settled positions are the record that counts, so pick at least one market that resolves inside your hold window.`;
  }
  if (c.includes('insurance')) {
    return `Buy $${capital} of cover from ${n} on ${chain} for a position you actually hold, and keep the policy to expiry. A policy held to term is the activity an insurer can later reward; a cancelled one is not.`;
  }
  if (c.includes('index')) {
    return `Buy $${capital} of a ${n} basket token on ${chain} and hold it. If the basket rebalances on a schedule, keep the position through at least one rebalance so the holding spans the index's own cycle.`;
  }
  if (c.includes('privacy')) {
    return `Make a shielded deposit of $${capital} into ${n} on ${chain} and leave it for the full hold period before withdrawing to the same wallet. Privacy protocols measure deposits that stay shielded, so early withdrawals erase the point.`;
  }
  if (c === 'chain') {
    return `Put $${capital} to work inside the ${n} ecosystem: hold its gas asset, make one swap on its main exchange and deposit into one lending or yield app it lists. A new chain rewards wallets that look like residents, not tourists.`;
  }
  if (c.includes('nft')) {
    return `List one item for sale on ${n} and buy one small item with part of the $${capital} budget. Completed trades on both sides are what marketplaces count; wash-pattern repetition is what they exclude, so keep it to genuine trades.`;
  }
  if (c.includes('payment') || c.includes('card')) {
    return `Activate ${n} with the wallet and route $${capital} of ordinary spending or transfers through it over the hold period. Payment products count retained, transacting users, so spread the activity out instead of moving one lump sum.`;
  }
  if (c.includes('ai')) {
    return `Use ${n}'s product itself with $${capital} of credits or stake, on ${chain}: run the task or agent it is built for at least once a week. For AI protocols the usage record is the farm, so a wallet that only deposits and never uses the product is the weakest kind.`;
  }
  if (c.includes('locker')) {
    return `Lock $${capital} of liquidity or tokens through ${n} on ${chain} for the shortest term it offers. A lock that runs to its end date is the record; unlocking early cancels it.`;
  }
  if (c.includes('governance')) {
    return `Hold $${capital} of the governance asset ${n} tracks on ${chain} and delegate or vote in one live proposal. Governance farms are counted on participation snapshots, so the vote matters more than the balance.`;
  }
  return `Deposit $${capital} of USDC into ${n} on ${chain} through its own interface and keep the position open. Add one small repeat deposit a week later so the wallet's history is a pattern the protocol can count.`;
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/**
 * A protocol's farm plan: six steps (seven for a multi-chain or very large protocol), each derived
 * from the protocol's own category, chains, TVL and age, never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = p.chains.length > 0 ? p.chains[0]! : 'its main chain';
  const profile = chainProfile(chain);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const variant = slugHash(p.slug) % 2;
  const steps: FarmStep[] = [
    {
      text:
        variant === 0
          ? `Set up ${profile.wallet} that holds only the funds for this farm, and keep its recovery phrase on paper, offline.`
          : `Start with a dedicated wallet for this position (${profile.wallet}); write its recovery phrase down offline and do not reuse an exchange account.`,
      cost: `moving in the $${capital} position plus ${feeText(profile.gas)} of network fees`,
      time: '10 minutes',
    },
    {
      text:
        chain === 'Ethereum'
          ? `No bridge is needed: ${p.name} runs on Ethereum, so the deposit goes straight from the wallet you just funded.`
          : chain === 'Solana'
            ? `Fund the wallet with USDC on Solana; withdrawing from an exchange directly to a Solana address skips bridge fees entirely.`
            : `Move the USDC to ${chain} through the chain's official bridge or the deposit route ${p.name} documents, and wait for the arrival confirmation before doing anything else.`,
      cost: chain === 'Ethereum' || chain === 'Solana' ? `${feeText(profile.gas)} of network fees` : `${feeText(profile.gas + 1)} of bridge and network fees`,
      time: '15 minutes',
    },
    {
      text: coreAction(p, capital, chain),
      cost: `the $${capital} position plus ${feeText(profile.gas)} of network fees`,
      time: '20 minutes to set up',
    },
    {
      text:
        variant === 0
          ? `Repeat one small qualifying action every week (a top-up, a rebalance or a swap inside ${p.name}) so the wallet shows a history, not a single visit.`
          : `Once a week, return and make one more small action in ${p.name} (a top-up, a vote or a rebalance); a steady cadence is what separates a farmer from a drive-by deposit.`,
      cost: `${feeText(profile.gas * 8)} of network fees spread over eight weeks`,
      time: '10 minutes a week for eight weeks',
    },
    {
      text: `After the first week, open ${p.name}'s own points or rewards page from its official site and confirm this wallet's position is counted; save the transaction hashes and a dated note of the balance in a farm log.`,
      cost: 'nothing to check, and a real claim never charges a fee, so treat any page that asks you to pay to claim as a fake',
      time: '10 minutes',
    },
    {
      text: `Hold the position for at least ${hold} days, then unwind it in the reverse order you built it, and keep the farm log until any distribution window the protocol announces has closed.`,
      cost: `${feeText(profile.gas)} of network fees to exit`,
      time: `${hold} days in position, 15 minutes to unwind`,
    },
  ];
  if (p.chains.length >= 3) {
    steps.push({
      text: `Repeat the core action on ${p.chains[1]} as well: ${p.name} records activity per chain, and a second chain gives a distribution a second, independent history to measure.`,
      cost: `another $${Math.round(capital / 2)} of capital plus ${feeText(chainProfile(p.chains[1]!).gas)} of network fees`,
      time: '20 minutes',
    });
  } else if (p.tvl_usd >= 1_000_000_000) {
    steps.push({
      text: `Scale in a second tranche of $${Math.round(capital / 2)} after two weeks, once the rewards page shows the first position counted, rather than moving everything on the first day.`,
      cost: `the second tranche's capital, with fees as in the earlier steps`,
      time: '10 minutes in week three',
    });
  }
  return steps;
}

// ------------------------------------------------------------------ the board

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const { byCategory, global } = categoryRatios(snapshot, model);
  const names = new Set(snapshot.protocols.map((p) => p.name));
  const watchlist = new Set(snapshot.watchlist);
  const scored = snapshot.protocols.filter(isBoardable).map((p) => {
    const ratio = byCategory.get(p.category ?? '') ?? {
      category: p.category ?? 'Uncategorised',
      live_count: 0,
      median_ratio: global,
      used_ratio: global,
    };
    const parent = parentName(p.name);
    const parentListed = parent !== null && names.has(parent);
    const v = impliedValue(p, snapshot.as_of, ratio, parentListed, model);
    return { p, ratio, parentListed, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token' as const,
    age_days: s.age,
    watchlist: watchlist.has(s.p.slug),
    versioned: s.parentListed && VERSIONED.test(s.p.name),
    implied_value_usd: s.implied,
    model: {
      category_ratio: s.ratio.used_ratio,
      ratio_live_count: s.ratio.live_count,
      momentum_multiplier: s.momentumMult,
      seasoning_multiplier: s.seasoningMult,
      reach_multiplier: s.reachMult,
      deployment_factor: s.deploymentFactor,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's form for data.js: the same figures and the same farm plan board.json carries. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    watchlist: row.watchlist,
    versioned: row.versioned,
    implied_value_usd: row.implied_value_usd,
    category_ratio: row.model.category_ratio,
    ratio_live_count: row.model.ratio_live_count,
    momentum_multiplier: row.model.momentum_multiplier,
    seasoning_multiplier: row.model.seasoning_multiplier,
    reach_multiplier: row.model.reach_multiplier,
    deployment_factor: row.model.deployment_factor,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const { byCategory, global } = categoryRatios(snapshot, model);
  const boardCounts = new Map<string, number>();
  for (const r of board) boardCounts.set(r.category ?? '', (boardCounts.get(r.category ?? '') ?? 0) + 1);
  const ratios: CategoryRatio[] = [...boardCounts.entries()]
    .map(([key, count]) => {
      const found = byCategory.get(key);
      return {
        ratio: found ?? { category: key === '' ? 'Uncategorised' : key, live_count: 0, median_ratio: global, used_ratio: global },
        count,
      };
    })
    .sort((a, b) => b.count - a.count || (a.ratio.category < b.ratio.category ? -1 : 1))
    .map((x) => x.ratio);
  const early = board.filter((r) => !r.watchlist).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    global_ratio: global,
    ratios,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    set_aside_size: snapshot.protocols.filter((p) => !isPreToken(p)).length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  if (slugs.size !== board.length) return 'the board carries a slug twice';
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) {
      const t = s.trim();
      if (t.length < 20 || t.length > 600) return `${r.slug} has a farm step of ${t.length} characters`;
    }
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
