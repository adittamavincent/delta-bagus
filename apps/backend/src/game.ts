import { randomInt, randomUUID } from "node:crypto";

export const STARTING_CREDITS = 1_000;
export const BOARD_SIZE = 25;
const HOUSE_RETURN = 0.99;

export type RoundStatus = "playing" | "lost" | "cashed_out";

export type Round = {
  id: string;
  stake: number;
  mineCount: number;
  mines: Set<number>;
  revealed: Set<number>;
  status: RoundStatus;
  payout: number;
  multiplier: number;
};

export type Player = {
  balance: number;
  round: Round | null;
};

export function createPlayer(): Player {
  return { balance: STARTING_CREDITS, round: null };
}

export function startRound(player: Player, stake: number, mineCount: number): Round {
  if (player.round?.status === "playing") throw new Error("Finish your current round first.");
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

export function refillDemoCredits(player: Player): void {
  if (player.round?.status === "playing") throw new Error("Finish your current round first.");
  if (player.balance >= 100) throw new Error("Refill is available when your balance is below 100 credits.");
  player.balance = STARTING_CREDITS;
  player.round = null;
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
