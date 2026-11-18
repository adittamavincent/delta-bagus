import express, { type Response } from "express";
import {
  cashOut,
  createPlayer,
  refillDemoCredits,
  revealTile,
  startRound,
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

function respondWithGameAction(response: Response, action: () => unknown) {
  try {
    response.json(action());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the request.";
    response.status(400).json({ error: message });
  }
}

