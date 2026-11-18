# Playhouse

A pnpm monorepo for a free-play arcade prototype. The current game, **Hidden Gems**, is a Mines-style game using nonredeemable demo credits only.

## Structure

- `apps/frontend` — React + Vite user interface
- `apps/backend` — Express API and server-owned round logic
- `docs` — setup, demo rules, and API reference

## Start the app

```sh
pnpm install
pnpm dev
```

Vite runs on `http://localhost:5173` and proxies API requests to the backend on port `4000`. See [docs/README.md](docs/README.md) for workspace details and limitations.

Demo credits have no cash value. The prototype has no deposits, withdrawals, or real-money wagering.
