"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const defaults = ["AAPL", "NVDA", "MSFT", "TSLA", "SPY", "QQQ", "AMD", "META"];
function score(ticker: string) { const s = ticker.split("").reduce((a,c)=>a+c.charCodeAt(0),0); return 50 + (s * 7) % 45; }
function setup(ticker: string) { const n = score(ticker); return n > 82 ? "Breakout calls" : n > 72 ? "Momentum continuation" : n > 62 ? "Pullback watch" : "Wait / avoid"; }

export default function Watchlist() {
  const [items, setItems] = useState(defaults);
  const [input, setInput] = useState("");
  const rows = useMemo(() => items.map((ticker) => ({ ticker, score: score(ticker), setup: setup(ticker), contract: `${ticker} 2026-07-17 ${(100 + score(ticker) * 2)} CALL`, confidence: score(ticker), direction: score(ticker) > 64 ? "Bullish" : "Neutral" })).sort((a,b)=>b.score-a.score), [items]);
  function add() { const clean = input.toUpperCase().replace(/[^A-Z]/g, "").slice(0,5); if (!clean) return; setItems((current)=>Array.from(new Set([clean,...current]))); setInput(""); }
  return <main className="page"><div className="shell"><header className="header"><div className="brand"><div className="logo">OP</div><div><h1>Watchlist Scanner</h1><p className="subtle">Rank demo option setups across your list.</p><nav className="nav"><Link href="/">Analyzer</Link><Link href="/market-radar">Market Radar</Link><Link href="/journal">Journal</Link></nav></div></div><span className="badge">No trade execution</span></header><section className="panel" style={{marginTop:16}}><div className="search"><input placeholder="Add ticker" value={input} onChange={(e)=>setInput(e.target.value.toUpperCase())} onKeyDown={(e)=>{if(e.key==='Enter')add()}}/><button className="primary" onClick={add}>Add</button></div></section><section className="panel" style={{marginTop:16}}><div className="kicker">Ranked setups</div><div className="table"><div className="tableHead"><span>Rank</span><span>Ticker</span><span>Score</span><span>Setup</span><span>Confidence</span><span>Contract</span></div>{rows.map((row,index)=><div className="scanRow" key={row.ticker}><strong>{index+1}</strong><strong>{row.ticker}</strong><span className={row.score>=75?"green":"amber"}>{row.score}</span><span>{row.setup}</span><span>{row.confidence}/100</span><span className="subtle">{row.contract}</span></div>)}</div></section><footer className="footer">Educational signal only. Review before making any trade.</footer></div></main>;
}
