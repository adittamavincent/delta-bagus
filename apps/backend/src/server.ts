import express, { type Response } from "express";
import {
  cashOut,
  cashOutSpaceman,
  createPlayer,
  getSpacemanStatus,
  refillDemoCredits,
  revealTile,
  startSpaceman,
  startRound,
  type SpacemanRound,
} from "./game.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const player = createPlayer();

app.use(express.json({ limit: "8kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", mode: "demo-only" });
});

app.get("/api/state", (_request, response) => {
  response.json({ balance: player.balance });
});

app.post("/api/mines/start", (request, response) => {
  respondWithGameAction(response, () => {
    const round = startRound(player, Number(request.body?.stake), Number(request.body?.mineCount));
    return publicRound(round, player.balance);
  });
});

app.post("/api/mines/:roundId/reveal", (request, response) => {
  respondWithGameAction(response, () => {
    const round = revealTile(player, request.params.roundId, Number(request.body?.tile));
    return {
      ...publicRound(round, player.balance),
      mines: round.status === "lost" ? [...round.mines] : undefined,
    };
  });
});

app.post("/api/mines/:roundId/cashout", (request, response) => {
  respondWithGameAction(response, () => {
    const round = cashOut(player, request.params.roundId);
    return { ...publicRound(round, player.balance), mines: [...round.mines] };
  });
});

app.post("/api/spaceman/start", (request, response) => {
  respondWithGameAction(response, () => {
    const round = startSpaceman(player, Number(request.body?.stake));
    return publicSpacemanRound(round, player.balance);
  });
});

app.get("/api/spaceman/:roundId/status", (request, response) => {
  respondWithGameAction(response, () => {
    const round = getSpacemanStatus(player, request.params.roundId);
    return publicSpacemanRound(round, player.balance);
  });
});

app.post("/api/spaceman/:roundId/cashout", (request, response) => {
  respondWithGameAction(response, () => {
    const round = cashOutSpaceman(player, request.params.roundId);
    return publicSpacemanRound(round, player.balance);
  });
});

app.post("/api/demo/refill", (_request, response) => {
  respondWithGameAction(response, () => {
    refillDemoCredits(player);
    return { balance: player.balance };
  });
});

app.use((_request, response) => response.status(404).json({ error: "Not found." }));
app.listen(port, () => console.log(`Playhouse demo API listening on http://localhost:${port}`));

function publicRound(round: ReturnType<typeof startRound>, balance: number) {
  return {
    roundId: round.id,
    stake: round.stake,
    mineCount: round.mineCount,
    revealed: [...round.revealed],
    status: round.status,
    multiplier: round.multiplier,
    payout: round.payout,
    balance,
  };
}

function publicSpacemanRound(round: SpacemanRound, balance: number) {
  return {
    roundId: round.id,
    stake: round.stake,
    startedAt: round.startedAt,
    status: round.status,
    multiplier: round.multiplier,
    payout: round.payout,
    balance,
  };
}

function respondWithGameAction(response: Response, action: () => unknown) {
  try {
    response.json(action());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the request.";
    response.status(400).json({ error: message });
  }
}

