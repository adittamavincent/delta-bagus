import { useEffect, useState } from "react";
import { SiteHeader } from "./components/SiteHeader";
import { api } from "./lib/api";

type Flight = {
  roundId: string;
  stake: number;
  startedAt: number;
  status: "playing" | "lost" | "cashed_out";
  multiplier: number;
  payout: number;
  balance: number;
};

function SpacemanPage() {
  const [balance, setBalance] = useState(1_000);
  const [stake, setStake] = useState(25);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [displayMultiplier, setDisplayMultiplier] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isPlaying = flight?.status === "playing";

  useEffect(() => {
    api<{ balance: number }>("/state").then((state) => setBalance(state.balance)).catch((cause: Error) => setError(cause.message));
  }, []);

  useEffect(() => {
    if (!flight || flight.status !== "playing") return;
    const tick = () => {
      const elapsedSeconds = Math.max(0, (Date.now() - flight.startedAt) / 1_000);
      const current = Math.min(5_000, Math.exp(0.16 * elapsedSeconds));
      setDisplayMultiplier(Math.floor(current * 100) / 100);
    };
    tick();
    const timer = window.setInterval(tick, 32);
    return () => window.clearInterval(timer);
  }, [flight?.roundId, flight?.startedAt, flight?.status]);

  useEffect(() => {
    if (!flight || flight.status !== "playing") return;
    let checking = false;
    const checkStatus = async () => {
      if (checking) return;
      checking = true;
      try {
        const state = await api<Flight>(`/spaceman/${flight.roundId}/status`);
        setBalance(state.balance);
        if (state.status !== "playing") setFlight(state);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to check the flight.");
      } finally {
        checking = false;
      }
    };
    const timer = window.setInterval(checkStatus, 250);
    return () => window.clearInterval(timer);
  }, [flight?.roundId, flight?.status]);

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

  function launch() {
    return runAction(async () => {
      const next = await api<Flight>("/spaceman/start", {
        method: "POST",
        body: JSON.stringify({ stake }),
      });
      setBalance(next.balance);
      setDisplayMultiplier(1);
      setFlight(next);
    });
  }

  function cashOut() {
    if (!flight) return;
    return runAction(async () => {
      const next = await api<Flight>(`/spaceman/${flight.roundId}/cashout`, { method: "POST" });
      setBalance(next.balance);
      setFlight(next);
      setDisplayMultiplier(next.multiplier);
    });
  }

  function startAgain() {
    setFlight(null);
    setDisplayMultiplier(1);
    setError("");
  }

  function refill() {
    return runAction(async () => {
      const next = await api<{ balance: number }>("/demo/refill", { method: "POST" });
      setBalance(next.balance);
      setFlight(null);
    });
  }

  const progress = isPlaying ? Math.min(88, Math.log(displayMultiplier) * 18) : flight?.status === "cashed_out" ? Math.min(88, Math.log(flight.multiplier) * 18) : 0;

  return (
    <main className="page">
      <SiteHeader balance={balance} />
      <section className="spaceman-layout" aria-labelledby="spaceman-title">
        <div className="spaceman-intro">
          <p className="eyebrow">THE MULTIPLIER IS IN MOTION</p>
          <h1 id="spaceman-title">Spaceman<span>.</span></h1>
          <p>Watch the multiplier climb. Collect your demo payout before the flight crashes.</p>
          <div className="edge-disclosure"><strong>95% RTP</strong><span>5% theoretical house edge over time. Any single flight can go either way.</span></div>
          <p className="credit-note">Demo credits only. No cash value, purchase, or withdrawal.</p>
        </div>

        <section className="spaceman-panel" aria-label="Spaceman crash game">
          <div className={`flight-stage ${isPlaying ? "flight-live" : ""} ${flight?.status === "lost" ? "flight-crashed" : ""}`} aria-live="polite">
            <div className="flight-stars star-a">✦</div><div className="flight-stars star-b">✧</div><div className="flight-stars star-c">·</div>
            <div className="flight-horizon" />
            <div className="flight-path" style={{ width: `${progress}%` }} />
            <div className="flight-ship" style={{ left: `${progress}%`, bottom: `${9 + progress * 0.37}%` }}><span>✦</span></div>
            <div className="flight-copy">
              <span className="flight-kicker">{isPlaying ? "FLIGHT IN PROGRESS" : flight?.status === "lost" ? "FLIGHT ENDED" : flight?.status === "cashed_out" ? "COLLECTED" : "READY FOR TAKEOFF"}</span>
              <strong>{(isPlaying ? displayMultiplier : flight?.multiplier ?? 1).toFixed(2)}<small>×</small></strong>
              {flight?.status === "lost" && <span className="flight-result">The flight crashed before you collected.</span>}
              {flight?.status === "cashed_out" && <span className="flight-result">Collected {flight.payout.toLocaleString()} demo credits.</span>}
            </div>
          </div>

          <div className="spaceman-controls">
            <label className="stake-field"><span>DEMO STAKE</span><div><input type="number" min="1" max={balance} step="1" value={stake} disabled={Boolean(isPlaying) || busy} onChange={(event) => setStake(Number(event.target.value))} /><small>credits</small></div></label>
            {isPlaying ? <button className="primary-button collect-button" disabled={busy} onClick={cashOut}><span>Collect now</span><strong>{Math.floor(stake * displayMultiplier).toLocaleString()}</strong></button> :
              <button className="primary-button" disabled={busy || balance < 1} onClick={launch}>{busy ? "Launching…" : "Launch flight"} <span>↗</span></button>}
          </div>
          {flight && !isPlaying && <button className="new-round" onClick={startAgain}>Prepare another flight</button>}
          {balance < 100 && !isPlaying && <button className="refill-button" disabled={busy} onClick={refill}>Refill demo credits</button>}
          {error && <p className="error-message" role="alert">{error}</p>}
          <p className="spaceman-history">Crash results are random and predetermined per flight. No cashout timing can remove the house edge.</p>
        </section>
      </section>
      <footer><span>PLAYHOUSE / SPACEMAN DEMO</span><span>95% RTP · DEMO CREDITS ONLY</span></footer>
    </main>
  );
}

export default SpacemanPage;
