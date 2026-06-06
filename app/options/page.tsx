"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OptionSide = "all" | "call" | "put";
type OptionContract = {
  symbol: string;
  type: "call" | "put";
  expiration: string;
  strike: number;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  spread: number | null;
  last: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  iv: number | null;
  volume: number;
  openInterest: number;
  liquidityScore: number;
};

type OptionPayload = {
  ticker: string;
  dataMode: "live" | "demo";
  provider: string;
  warning?: string;
  expirations: string[];
  contracts: OptionContract[];
  asOf?: string;
};

function normalize(value: string) {
  return (value || "AAPL").toUpperCase().replace(/[^A-Z.]/g, "").slice(0, 8) || "AAPL";
}

function money(value: number | null) {
  return value === null || Number.isNaN(value) ? "--" : `$${value.toFixed(2)}`;
}

function percent(value: number | null) {
  return value === null || Number.isNaN(value) ? "--" : `${(value * 100).toFixed(1)}%`;
}

function decimal(value: number | null) {
  return value === null || Number.isNaN(value) ? "--" : value.toFixed(2);
}

export default function OptionsPage() {
  const [input, setInput] = useState("AAPL");
  const [ticker, setTicker] = useState("AAPL");
  const [side, setSide] = useState<OptionSide>("all");
  const [expiration, setExpiration] = useState("");
  const [minStrike, setMinStrike] = useState("");
  const [maxStrike, setMaxStrike] = useState("");
  const [minDelta, setMinDelta] = useState("");
  const [maxDelta, setMaxDelta] = useState("");
  const [minVolume, setMinVolume] = useState("0");
  const [minOpenInterest, setMinOpenInterest] = useState("0");
  const [maxSpread, setMaxSpread] = useState("");
  const [payload, setPayload] = useState<OptionPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", side);
    if (expiration) params.set("expiration", expiration);
    if (minStrike) params.set("minStrike", minStrike);
    if (maxStrike) params.set("maxStrike", maxStrike);
    if (minDelta) params.set("minDelta", minDelta);
    if (maxDelta) params.set("maxDelta", maxDelta);
    if (minVolume) params.set("minVolume", minVolume);
    if (minOpenInterest) params.set("minOpenInterest", minOpenInterest);
    if (maxSpread) params.set("maxSpread", maxSpread);
    return params.toString();
  }, [side, expiration, minStrike, maxStrike, minDelta, maxDelta, minVolume, minOpenInterest, maxSpread]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/options/${ticker}?${query}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: OptionPayload) => { if (!cancelled) setPayload(data); })
      .catch(() => { if (!cancelled) setPayload(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticker, query]);

  function loadTicker(next = input) {
    const clean = normalize(next);
    setInput(clean);
    setTicker(clean);
    setExpiration("");
  }

  const contracts = payload?.contracts ?? [];
  const best = contracts.slice().sort((a, b) => b.liquidityScore - a.liquidityScore)[0];

  return <main className="page">
    <div className="shell">
      <header className="header">
        <div className="brand"><div className="logo">OP</div><div><h1>Option Chain</h1><p className="subtle">Look up calls and puts by ticker with live Alpaca option snapshots when available.</p><nav className="nav"><Link href="/">Analyzer</Link><Link href="/charts">Charts</Link><Link href="/options">Options Chain</Link><Link href="/watchlist">Watchlist Scanner</Link><Link href="/market-radar">Market Radar</Link><Link href="/journal">Journal</Link><Link href="/pricing">Pricing</Link></nav></div></div>
        <div className="badges"><span className="badge">{loading ? "Loading chain" : payload?.dataMode === "live" ? "Live Alpaca options" : "Using demo data"}</span><span className="badge">No trade execution</span></div>
      </header>

      <section className="panel" style={{marginTop:16}}>
        <div className="search" style={{marginBottom:14}}><input value={input} onChange={(event)=>setInput(event.target.value.toUpperCase())} onKeyDown={(event)=>{ if (event.key === "Enter") loadTicker(); }} aria-label="Ticker symbol" /><button className="primary" onClick={()=>loadTicker()}>{loading ? "Loading" : "Load Chain"}</button></div>
        <div className="grid3">
          <div><div className="label">Contract Type</div><select value={side} onChange={(event)=>setSide(event.target.value as OptionSide)}><option value="all">Calls and puts</option><option value="call">Calls only</option><option value="put">Puts only</option></select></div>
          <div><div className="label">Expiration</div><select value={expiration} onChange={(event)=>setExpiration(event.target.value)}><option value="">Next 60 days</option>{(payload?.expirations ?? []).map((date)=><option key={date} value={date}>{date}</option>)}</select></div>
          <div><div className="label">Max Spread</div><input value={maxSpread} onChange={(event)=>setMaxSpread(event.target.value)} placeholder="0.25" inputMode="decimal" /></div>
          <div><div className="label">Min Strike</div><input value={minStrike} onChange={(event)=>setMinStrike(event.target.value)} placeholder="Optional" inputMode="decimal" /></div>
          <div><div className="label">Max Strike</div><input value={maxStrike} onChange={(event)=>setMaxStrike(event.target.value)} placeholder="Optional" inputMode="decimal" /></div>
          <div><div className="label">Delta Range</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><input value={minDelta} onChange={(event)=>setMinDelta(event.target.value)} placeholder="Min" inputMode="decimal" /><input value={maxDelta} onChange={(event)=>setMaxDelta(event.target.value)} placeholder="Max" inputMode="decimal" /></div></div>
          <div><div className="label">Min Volume</div><input value={minVolume} onChange={(event)=>setMinVolume(event.target.value)} inputMode="numeric" /></div>
          <div><div className="label">Min Open Interest</div><input value={minOpenInterest} onChange={(event)=>setMinOpenInterest(event.target.value)} inputMode="numeric" /></div>
          <div><div className="label">Quick Symbols</div><div className="actions">{["AAPL","TSLA","NVDA","SPY"].map((item)=><button key={item} onClick={()=>loadTicker(item)}>{item}</button>)}</div></div>
        </div>
      </section>

      {payload?.warning ? <section className="panel" style={{marginTop:16}}><div className="kicker">Data status</div><p className="explain">{payload.warning}</p></section> : null}

      <section className="panel" style={{marginTop:16}}>
        <div className="row" style={{justifyContent:"space-between",alignItems:"end",marginBottom:14}}>
          <div><div className="kicker">Chain summary</div><div className="ticker" style={{fontSize:48}}>{payload?.ticker ?? ticker}</div><p className="subtle">{contracts.length} contracts shown {payload?.asOf ? `as of ${new Date(payload.asOf).toLocaleString()}` : ""}</p></div>
          {best ? <div className="stat" style={{maxWidth:320}}><div className="label">Highest Liquidity Match</div><div className="value blue">{best.symbol}</div><p className="subtle">Score {best.liquidityScore}/100 · {best.type.toUpperCase()} {money(best.strike)}</p></div> : null}
        </div>
        <div style={{overflowX:"auto"}}>
          <div style={{minWidth:1060,display:"grid",gap:8}}>
            <div style={{display:"grid",gridTemplateColumns:"1.4fr .65fr .75fr .75fr .65fr .65fr .65fr .65fr .65fr .65fr .65fr .75fr .75fr",gap:10,padding:"0 13px"}} className="tableHead"><span>Contract</span><span>Type</span><span>Expiration</span><span>Strike</span><span>Bid</span><span>Ask</span><span>Mid</span><span>Spread</span><span>Delta</span><span>IV</span><span>Volume</span><span>OI</span><span>Liquidity</span></div>
            {contracts.map((contract)=><div key={contract.symbol} className="scanRow" style={{gridTemplateColumns:"1.4fr .65fr .75fr .75fr .65fr .65fr .65fr .65fr .65fr .65fr .65fr .75fr .75fr",minWidth:1060}}>
              <strong className="blue">{contract.symbol}</strong><span className={contract.type === "call" ? "green" : "red"}>{contract.type.toUpperCase()}</span><span>{contract.expiration}</span><span>{money(contract.strike)}</span><span>{money(contract.bid)}</span><span>{money(contract.ask)}</span><span>{money(contract.mid)}</span><span className={contract.spread !== null && contract.spread <= 0.25 ? "green" : "amber"}>{money(contract.spread)}</span><span>{decimal(contract.delta)}</span><span>{percent(contract.iv)}</span><span>{contract.volume.toLocaleString()}</span><span>{contract.openInterest.toLocaleString()}</span><strong className={contract.liquidityScore >= 70 ? "green" : contract.liquidityScore >= 50 ? "amber" : "red"}>{contract.liquidityScore}</strong>
            </div>)}
            {!contracts.length ? <div className="empty">No option contracts loaded yet.</div> : null}
          </div>
        </div>
      </section>

      <footer className="footer">Educational tool only. Not financial advice. Options involve significant risk. Review contracts before making any trade. This page does not place orders.</footer>
    </div>
  </main>;
}
