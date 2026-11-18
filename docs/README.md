# Playhouse

Playhouse is a small pnpm monorepo containing a Vite frontend and a Node/Express backend. The current product is **Hidden Gems**, a free-play Mines-style demo that uses nonredeemable credits only.

## Workspace layout

```text
apps/
  backend/    Express API and server-owned round state
  frontend/   React + Vite web app
docs/         Product and API notes
```

## Run locally

From the repository root:

```sh
pnpm install
pnpm dev
```

The frontend is served by Vite and proxies `/api` calls to the backend on port `4000`. The backend can also be built and run separately with `pnpm --filter @playhouse/backend build` and `pnpm start`.

## Demo game

Each new backend process starts with 1,000 demo credits. A round reserves the chosen stake, places the selected number of bombs on a 5×5 board, and handles each reveal on the server. A bomb ends the round with no payout; collecting after at least one gem credits the displayed demo payout. Outcomes are random, and there is no guaranteed way to profit. If a player has fewer than 100 credits, they may refill to the demo starting balance.

These credits have no cash value and cannot be bought, transferred, or withdrawn. There is no payment, identity, wallet, or real-money wagering integration.

## Important limitations

This is a local prototype, not a production gambling service. Player and round state live in memory and reset whenever the backend restarts. The API has no accounts, authentication, persistence, rate limiting, or production security review. Do not connect real-money payments or expose it as a real-money gambling service.
