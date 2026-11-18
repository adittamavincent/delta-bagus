import { randomInt, randomUUID } from "node:crypto";

export const STARTING_CREDITS = 1_000;
export const BOARD_SIZE = 25;
const HOUSE_RETURN = 0.99;
export const SPACEMAN_RETURN = 0.95;
export const SPACEMAN_MAX_MULTIPLIER = 5_000;
const SPACEMAN_GROWTH_PER_SECOND = 0.16;

export type RoundStatus = "playing" | "lost" | "cashed_out";

export type Round = {
  kind: "mines";
  id: string;
  stake: number;
  mineCount: number;
  mines: Set<number>;
  revealed: Set<number>;
  status: RoundStatus;
  payout: number;
  multiplier: number;
};

export type SpacemanRound = {
  kind: "spaceman";
  id: string;
  stake: number;
  crashMultiplier: number;
  startedAt: number;
  status: RoundStatus;
  payout: number;
  multiplier: number;
};

export type Player = {
  balance: number;
  round: Round | null;
  spacemanRound: SpacemanRound | null;
};

export function createPlayer(): Player {
  return { balance: STARTING_CREDITS, round: null, spacemanRound: null };
}

export function startRound(player: Player, stake: number, mineCount: number): Round {
  assertNoActiveRound(player);
  if (!Number.isSafeInteger(stake) || stake < 1 || stake > player.balance) {
    throw new Error("Choose a stake within your demo-credit balance.");
  }
  if (!Number.isSafeInteger(mineCount) || mineCount < 1 || mineCount > 24) {
    throw new Error("Choose between 1 and 24 bombs.");
  }

  const mines = new Set<number>();
  while (mines.size < mineCount) mines.add(randomInt(BOARD_SIZE));
  player.balance -= stake;
  player.round = {
    kind: "mines",
    id: randomUUID(),
    stake,
    mineCount,
    mines,
    revealed: new Set(),
    status: "playing",
    payout: 0,
    multiplier: 1,
  };
  return player.round;
}

export function revealTile(player: Player, roundId: string, tile: number): Round {
  const round = activeRound(player, roundId);
  if (!Number.isSafeInteger(tile) || tile < 0 || tile >= BOARD_SIZE) throw new Error("Choose a valid tile.");
  if (round.revealed.has(tile)) throw new Error("That tile has already been revealed.");

  round.revealed.add(tile);
  if (round.mines.has(tile)) {
    round.status = "lost";
    round.payout = 0;
    return round;
  }

  round.multiplier = multiplierFor(round.mineCount, round.revealed.size);
  round.payout = Math.floor(round.stake * round.multiplier);
  return round;
}

export function cashOut(player: Player, roundId: string): Round {
  const round = activeRound(player, roundId);
  if (round.revealed.size === 0) throw new Error("Reveal at least one gem before collecting.");
  round.status = "cashed_out";
  player.balance += round.payout;
  return round;
}

export function startSpaceman(player: Player, stake: number, now = Date.now()): SpacemanRound {
  assertNoActiveRound(player);
  validateStake(player, stake);

  const roll = randomInt(100_000_000) / 100_000_000;
  const crashMultiplier = calculateSpacemanCrashMultiplier(roll);
  player.balance -= stake;
  player.spacemanRound = {
    kind: "spaceman",
    id: randomUUID(),
    stake,
    crashMultiplier,
    startedAt: now,
    status: "playing",
    payout: 0,
    multiplier: 1,
  };
  return player.spacemanRound;
}

export function getSpacemanStatus(player: Player, roundId: string, now = Date.now()): SpacemanRound {
  const round = findSpacemanRound(player, roundId);
  if (round.status !== "playing") return round;

  round.multiplier = currentMultiplier(round, now);
  if (round.multiplier >= round.crashMultiplier) {
    if (round.crashMultiplier === SPACEMAN_MAX_MULTIPLIER) {
      round.multiplier = SPACEMAN_MAX_MULTIPLIER;
      round.payout = round.stake * SPACEMAN_MAX_MULTIPLIER;
      round.status = "cashed_out";
      player.balance += round.payout;
    } else {
      round.status = "lost";
    }
  }
  return round;
}

export function cashOutSpaceman(player: Player, roundId: string, now = Date.now()): SpacemanRound {
  const round = getSpacemanStatus(player, roundId, now);
  if (round.status !== "playing") return round;

  round.status = "cashed_out";
  round.payout = Math.floor(round.stake * round.multiplier);
  player.balance += round.payout;
  return round;
}

export function refillDemoCredits(player: Player): void {
  assertNoActiveRound(player);
  if (player.balance >= 100) throw new Error("Refill is available when your balance is below 100 credits.");
  player.balance = STARTING_CREDITS;
  player.round = null;
  player.spacemanRound = null;
}

function activeRound(player: Player, roundId: string): Round {
  const round = player.round;
  if (!round || round.id !== roundId || round.status !== "playing") {
    throw new Error("This round is no longer active.");
  }
  return round;
}

function multiplierFor(mineCount: number, safePicks: number): number {
  let survivalProbability = 1;
  for (let pick = 0; pick < safePicks; pick += 1) {
    survivalProbability *= (BOARD_SIZE - mineCount - pick) / (BOARD_SIZE - pick);
  }
  return Math.round((HOUSE_RETURN / survivalProbability) * 100) / 100;
}

function validateStake(player: Player, stake: number): void {
  if (!Number.isSafeInteger(stake) || stake < 1 || stake > player.balance) {
    throw new Error("Choose a stake within your demo-credit balance.");
  }
}

function assertNoActiveRound(player: Player): void {
  if (player.round?.status === "playing" || player.spacemanRound?.status === "playing") {
    throw new Error("Finish your current round first.");
  }
}

function findSpacemanRound(player: Player, roundId: string): SpacemanRound {
  const round = player.spacemanRound;
  if (!round || round.id !== roundId) throw new Error("This round does not exist.");
  return round;
}

function currentMultiplier(round: SpacemanRound, now: number): number {
  const seconds = Math.max(0, (now - round.startedAt) / 1_000);
  const current = Math.min(SPACEMAN_MAX_MULTIPLIER, Math.exp(SPACEMAN_GROWTH_PER_SECOND * seconds));
  return Math.floor(current * 100) / 100;
}

export function calculateSpacemanCrashMultiplier(roll: number): number {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error("The crash roll must be between 0 and 1.");
  }
  return Math.min(SPACEMAN_MAX_MULTIPLIER, SPACEMAN_RETURN / (1 - roll));
}
