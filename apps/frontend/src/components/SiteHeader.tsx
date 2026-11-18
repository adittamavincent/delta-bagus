import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function SiteHeader({ balance: currentBalance }: { balance?: number }) {
  const [storedBalance, setStoredBalance] = useState(1_000);

  useEffect(() => {
    if (currentBalance !== undefined) return;
    api<{ balance: number }>("/state")
      .then((state) => setStoredBalance(state.balance))
      .catch(() => undefined);
  }, [currentBalance]);

  const balance = currentBalance ?? storedBalance;

  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Playhouse home"><span className="brand-mark">p</span>playhouse</a>
      <a className="menu-link" href="/menu">Game menu</a>
      <span className="demo-label"><i /> FREE-PLAY DEMO</span>
      <div className="balance"><span>DEMO CREDITS</span><strong>{balance.toLocaleString()}</strong></div>
    </header>
  );
}
