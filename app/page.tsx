"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Direction = "Bullish" | "Bearish" | "Neutral";
type MarketData = { ticker: string; price: number; dataMode: "live" | "demo"; provider: string; warning?: string; asOf?: string };

type Analysis = {
  ticker: string;
  price: number;
  direction: Direction;
  setup: string;
  rating: "Take" | "Wait" | "Avoid";
  confidence: number;
  entryLow: number;
  entryHigh: number;
  stop: number;
  target1: number;
  target2: number;
  rr: number;
  contract: string;
  premium: number;
  scores: Record<string, number>;
  dataMode: "live" | "demo";
  provider: string;
  warning?: string;
};

function seed(ticker: string) {
  return ticker.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) || 65;
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function analyzeTicker(raw: string, market?: MarketData | null): Analysis {
  const ticker = (raw || "AAPL").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "AAPL";
  const s = seed(ticker);
  const price = market?.price ?? 80 + (s % 260) + (s % 17) / 10;
  const trend = 48 + (s % 43);
  const momentum = 44 + ((s * 3) % 48);
  const volume = 42 + ((s * 7) % 50);
  const liquidity = 56 + ((s * 5) % 40);
  const ivRisk = 45 + ((s * 11) % 44);
  const spreadRisk = 52 + ((s * 13) % 39);
  const sr = 48 + ((s * 17) % 45);
  const confidence = Math.round(trend * .18 + momentum * .16 + volume * .12 + liquidity * .22 + ivRisk * .12 + spreadRisk * .1 + sr * .1);
  const direction: Direction = trend > 68 && momentum > 58 ? "Bullish" : trend < 58 && momentum < 60 ? "Bearish" : "Neutral";
  const bullish = direction !== "Bearish";
  const vol = Math.max(1.2, price * .018);
  const entryLow = bullish ? price - vol * .45 : price - vol * .1;
  const entryHigh = bullish ? price + vol * .15 : price + vol * .55;
  const stop = bullish ? price - vol * 1.7 : price + vol * 1.7;
  const target1 = bullish ? price + vol * 2.1 : price - vol * 2.1;
  const target2 = bullish ? price + vol * 3.5 : price - vol * 3.5;
  const rr = Math.abs(target2 - price) / Math.max(Math.abs(price - stop), .01);
  const rating = confidence >= 75 ? "Take" : confidence >= 58 ? "Wait" : "Avoid";
  const setup = direction === "Bullish" ? "Breakout calls" : direction === "Bearish" ? "Breakdown puts" : "Wait for confirmation";
  const strike = Math.round((price + (bullish ? 5 : -5)) / 5) * 5;
  return {
    ticker,
    price,
    direction,
    setup,
    rating,
    confidence,
    entryLow,
    entryHigh,
    stop,
    target1,
    target2,
    rr,
    contract: `${ticker} 2026-07-17 ${strike} ${bullish ? "CALL" : "PUT"}`,
    premium: Math.max(.65, price * (.018 + (s % 8) / 1000)),
    scores: { Trend: trend, Momentum: momentum, Volume: volume, "Support/Resistance": sr, Liquidity: liquidity, "IV Risk": ivRisk, "Spread Risk": spreadRisk, Final: confidence },
    dataMode: market?.dataMode ?? "demo",
    provider: market?.provider ?? "demo",
    warning: market?.warning
  };
}

export default function Dashboard() {
  const [input, setInput] = useState("AAPL");
  const [ticker, setTicker] = useState("AAPL");
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [recent, setRecent] = useState(["AAPL", "NVDA", "MSFT", "TSLA"]);
  const [saved, setSaved] = useState(false);
  const analysis = useMemo(() => analyzeTicker(ticker, market), [ticker, market]);
  const watchlist = useMemo(() => ["NVDA", "MSFT", "SPY", "TSLA", ticker].map((item) => analyzeTicker(item)).sort((a, b) => b.confidence - a.confidence).slice(0, 5), [ticker]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMarket(true);
    fetch(`/api/market/${ticker}?timeframe=15m`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: MarketData) => { if (!cancelled) setMarket(data); })
      .catch(() => { if (!cancelled) setMarket(null); })
      .finally(() => { if (!cancelled) setLoadingMarket(false); });
    return () => { cancelled = true; };
  }, [ticker]);

  function run(next = input) {
    const clean = next.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "AAPL";
    setInput(clean);
    setTicker(clean);
    setRecent((items) => [clean, ...items.filter((item) => item !== clean)].slice(0, 6));
    setSaved(false);
  }

  function saveIdea() {
    const current = JSON.parse(localStorage.getItem("optionPilotJournal") || "[]");
    localStorage.setItem("optionPilotJournal", JSON.stringify([{ ...analysis, createdAt: new Date().toISOString(), status: "idea" }, ...current]));
    setSaved(true);
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="header">
          <div className="brand"><div className="logo">OP</div><div><h1>Option Pilot Dashboard</h1><p className="subtle">Interactive AI options decision-support terminal with Alpaca stock data when configured.</p><nav className="nav"><Link href="/">Analyzer</Link><Link href="/charts">Charts</Link><Link href="/options">Options Chain</Link><Link href="/watchlist">Watchlist Scanner</Link><Link href="/market-radar">Market Radar</Link><Link href="/journal">Journal</Link><Link href="/pricing">Pricing</Link></nav></div></div>
          <div className="badges"><span className="badge">{loadingMarket ? "Checking market data" : analysis.dataMode === "live" ? "Live Alpaca data" : "Using demo data"}</span><span className="badge">Live trading disabled</span></div>
        </header>
        <div className="main">
          <aside className="sidebar">
            <section className="card"><div className="kicker">Analyzer</div><div className="search"><input value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") run(); }} /><button className="primary" onClick={() => run()}>Analyze</button></div></section>
            <section className="card"><div className="kicker">Recent analyzed</div><div className="actions">{recent.map((item) => <button key={item} onClick={() => run(item)}>{item}</button>)}</div></section>
            <section className="card"><div className="kicker">Watchlist</div><div className="contracts">{watchlist.map((item) => <button className="contract" key={item.ticker} onClick={() => run(item.ticker)}><span><strong>{item.ticker}</strong><p className="subtle">{item.setup}</p></span><strong className={item.confidence >= 75 ? "green" : "amber"}>{item.confidence}</strong></button>)}</div></section>
          </aside>
          <section className="content">
            {analysis.warning ? <section className="panel"><div className="kicker">Market data status</div><p className="explain">{analysis.warning}</p></section> : null}
            <section className="panel"><div className="kicker">Analysis result</div><div className="row" style={{alignItems:"end",justifyContent:"space-between"}}><div><div className="ticker">{analysis.ticker}</div><div className="price">{money(analysis.price)}</div><p className="subtle">Stock price source: {analysis.provider === "alpaca" ? "Alpaca market data" : "Demo fallback"}</p></div><div className="badges"><span className="badge">{analysis.direction}</span><span className="badge">{analysis.rating}</span></div></div><div className="stats" style={{marginTop:18}}>{[["Entry Zone", `${money(analysis.entryLow)} - ${money(analysis.entryHigh)}`, "blue"],["Stop Loss", money(analysis.stop), "red"],["Target 1", money(analysis.target1), "green"],["Target 2", money(analysis.target2), "green"],["Risk/Reward", `1 : ${analysis.rr.toFixed(1)}`, "amber"],["Confidence", `${analysis.confidence} / 100`, "green"],["Trade Rating", analysis.rating, "green"],["Best Contract", analysis.contract, "blue"]].map(([label,value,tone]) => <div className="stat" key={label}><div className="label">{label}</div><div className={`value ${tone}`}>{value}</div></div>)}</div></section>
            <section className="panel"><div className="kicker">AI breakdown</div><p className="explain">{analysis.ticker} is showing a {analysis.direction.toLowerCase()} educational probability profile. The stock price is {analysis.dataMode === "live" ? "coming from Alpaca market data" : "using demo fallback data"}. The options contract and probability scoring remain educational estimates until the live options chain is connected.</p><div className="actions" style={{marginTop:14}}><button className="primary" onClick={saveIdea}>{saved ? "Saved" : "Save to Journal"}</button><Link className="pill" href="/journal">Open Journal</Link></div></section>
            <section className="panel"><div className="kicker">Scoring engine</div><div className="scoreGrid">{Object.entries(analysis.scores).map(([label,value]) => <div className="metric" key={label}><div className="label">{label}</div><div className="value">{value}</div><div className="bar"><div className="fill" style={{width:`${value}%`}} /></div></div>)}</div></section>
            <section className="panel"><div className="kicker">Recommended contract</div><div className="contract"><div><h3>{analysis.contract}</h3><p className="subtle">Estimated premium {money(analysis.premium)} · demo delta {(analysis.direction === "Bearish" ? -0.48 : 0.52).toFixed(2)} · OI {(12000 + seed(analysis.ticker) * 32).toLocaleString()}</p></div><strong className="green">{money(analysis.premium)}</strong></div></section>
          </section>
        </div>
        <footer className="footer">Educational tool only. Not financial advice. Options involve significant risk. This system is decision-support only and does not place trades.</footer>
      </div>
    </main>
  );
}
