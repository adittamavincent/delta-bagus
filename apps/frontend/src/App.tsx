import { useEffect, useState } from "react";

const BOARD_SIZE = 25;

type Round = {
  roundId: string;
  stake: number;
  mineCount: number;
  revealed: number[];
  status: "playing" | "lost" | "cashed_out";
  multiplier: number;
  payout: number;
  balance: number;
  mines?: number[];
};

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Something went wrong. Try again.");
  return result as T;
}

function App() {
  const [balance, setBalance] = useState(1_000);
  const [stake, setStake] = useState(25);
  const [mineCount, setMineCount] = useState(5);
  const [round, setRound] = useState<Round | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isPlaying = round?.status === "playing";

  useEffect(() => {
    api<{ balance: number }>("/state").then((state) => setBalance(state.balance)).catch((cause: Error) => setError(cause.message));
  }, []);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reach the demo server.");
    } finally {
      setBusy(false);
    }
  }

  function startRound() {
    return runAction(async () => {
      const next = await api<Round>("/mines/start", {
        method: "POST",
        body: JSON.stringify({ stake, mineCount }),
      });
      setBalance(next.balance);
      setRound(next);
    });
  }

  function reveal(tile: number) {
    if (!round) return;
    return runAction(async () => {
      const next = await api<Round>(`/mines/${round.roundId}/reveal`, {
        method: "POST",
        body: JSON.stringify({ tile }),
      });
      setBalance(next.balance);
      setRound(next);
    });
  }

  function cashOut() {
    if (!round) return;
    return runAction(async () => {
      const next = await api<Round>(`/mines/${round.roundId}/cashout`, { method: "POST" });
      setBalance(next.balance);
      setRound(next);
    });
  }

  function refill() {
    return runAction(async () => {
      const result = await api<{ balance: number }>("/demo/refill", { method: "POST" });
      setBalance(result.balance);
      setRound(null);
    });
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Playhouse home"><span className="brand-mark">p</span>playhouse</a>
        <span className="demo-label"><i /> FREE-PLAY DEMO</span>
        <div className="balance"><span>DEMO CREDITS</span><strong>{balance.toLocaleString()}</strong></div>
      </header>

      <section className="game-layout" aria-labelledby="game-title">
        <div className="intro">
          <p className="eyebrow">A LITTLE GEM OF A GAME</p>
          <h1 id="game-title">Hidden <em>Gems</em></h1>
          <p>Pick a gem. Build your multiplier. Collect whenever you like, but watch out for the bombs.</p>
          <div className="rule-note"><span>✳</span><p><strong>One rule:</strong> hit a bomb and the round ends. Your round stake is lost.</p></div>
          <div className="credit-note">Demo credits have no cash value and cannot be purchased or withdrawn.</div>
        </div>

        <section className="game-panel" aria-label="Hidden Gems game">
          <div className="panel-head">
            <div><span className="panel-kicker">HIDDEN GEMS</span><h2>{isPlaying ? "Make your next pick" : "Ready when you are"}</h2></div>
            <div className="bomb-setting"><label htmlFor="bomb-count">BOMBS</label><select id="bomb-count" value={mineCount} disabled={Boolean(isPlaying) || busy} onChange={(event) => setMineCount(Number(event.target.value))}><option value={3}>3</option><option value={5}>5</option><option value={8}>8</option><option value={12}>12</option><option value={18}>18</option></select></div>
          </div>

          <div className="board" aria-label="5 by 5 game board">
            {Array.from({ length: BOARD_SIZE }, (_, tile) => {
              const isMine = round?.mines?.includes(tile) ?? false;
              const isRevealed = round?.revealed.includes(tile) ?? false;
              const isSafeReveal = isRevealed && !isMine;
              return <button key={tile} className={`tile ${isSafeReveal ? "tile-gem" : ""} ${isMine ? "tile-bomb" : ""}`} disabled={!isPlaying || busy || isRevealed} onClick={() => reveal(tile)} aria-label={isRevealed ? (isMine ? `Tile ${tile + 1}, bomb` : `Tile ${tile + 1}, gem`) : `Reveal tile ${tile + 1}`}>
                {isSafeReveal ? <span>✦</span> : isMine ? <span>✹</span> : <span className="tile-dot" />}
              </button>;
            })}
          </div>

          <div className="round-status" aria-live="polite">
            {round?.status === "lost" ? <><strong>Bomb found.</strong><span>Round over. Your demo stake was {round.stake} credits.</span></> :
              round?.status === "cashed_out" ? <><strong>Collected {round.payout.toLocaleString()} credits.</strong><span>That round returned {round.multiplier.toFixed(2)}× your stake.</span></> :
                isPlaying ? <><strong>{round.revealed.length} gem{round.revealed.length === 1 ? "" : "s"} found</strong><span>Collect now or reveal another tile.</span></> :
                  <><strong>25 tiles. Hidden gems. Hidden bombs.</strong><span>Set your demo stake and choose how many bombs to hide.</span></>}
          </div>

          <div className="game-controls">
            <label className="stake-field"><span>DEMO STAKE</span><div><input type="number" min="1" max={balance} step="1" value={stake} disabled={Boolean(isPlaying) || busy} onChange={(event) => setStake(Number(event.target.value))} /><small>credits</small></div></label>
            {isPlaying ? <button className="primary-button collect-button" disabled={busy || round.revealed.length === 0} onClick={cashOut}><span>Collect demo credits</span><strong>{round.payout.toLocaleString()}</strong></button> :
              <button className="primary-button" disabled={busy || balance < 1} onClick={startRound}>{busy ? "Starting…" : "Start round"} <span>↗</span></button>}
          </div>
          {round && !isPlaying && <button className="new-round" onClick={() => setRound(null)}>Set up another round</button>}
          {balance < 100 && !isPlaying && <button className="refill-button" disabled={busy} onClick={refill}>Refill demo credits</button>}
          {error && <p className="error-message" role="alert">{error}</p>}
        </section>
      </section>

      <footer><span>PLAYHOUSE / HIDDEN GEMS</span><span>DEMO CREDITS ONLY · NO CASH VALUE</span></footer>
    </main>
  );
}

export default App;
