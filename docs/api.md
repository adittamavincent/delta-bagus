# Demo API

All routes are served under `/api`. The frontend's Vite dev server proxies these requests to `http://localhost:4000`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health and demo-mode indicator |
| `GET` | `/state` | Current in-memory demo-credit balance |
| `POST` | `/mines/start` | Start a round with `{ "stake": 25, "mineCount": 5 }` |
| `POST` | `/mines/:roundId/reveal` | Reveal a tile with `{ "tile": 0 }` |
| `POST` | `/mines/:roundId/cashout` | Collect the current demo payout after a safe reveal |
| `POST` | `/spaceman/start` | Start a Spaceman-style flight with `{ "stake": 25 }` |
| `GET` | `/spaceman/:roundId/status` | Check the server-calculated multiplier and flight status |
| `POST` | `/spaceman/:roundId/cashout` | Attempt to collect before the hidden crash point |
| `POST` | `/demo/refill` | Refill demo credits when the balance is below 100 |

Game outcomes and the mine layout are generated and retained by the backend for the lifetime of the process. Mine locations are withheld from responses until a round ends. State is intentionally in-memory and shared by this local demo server; it is not suitable for multiple players or production deployment.

Spaceman crash points are generated on the backend from a 95% return model, capped at 5,000×. The crash point is not sent to the browser while a flight is active. The multiplier displayed by the client is a visual estimate; the server calculates the accepted cash-out multiplier and checks the crash point. Integer-credit payout rounding can make realized return slightly lower than 95%. This prototype is not cryptographically provably fair.
