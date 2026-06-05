"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Timeframe = "5m" | "15m" | "1h" | "1d";
type Candle = { open: number; high: number; low: number; close: number; volume: number };
type ChartModel = { ticker: string; price: number; score: number; direction: "Bullish" | "Bearish" | "Neutral"; candles: Candle[]; contract: string };

const starters = ["AAPL", "NVDA", "MSFT", "TSLA"];
const timeframes: Timeframe[] = ["5m", "15m", "1h", "1d"];

function seed(ticker: string) { return ticker.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) || 65; }
function money(value: number) { return `$${value.toFixed(2)}`; }
function normalize(value: string) { return (value || "AAPL").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "AAPL"; }

function buildChart(raw: string, timeframe: Timeframe): ChartModel {
  const ticker = normalize(raw);
  const s = seed(ticker) + timeframe.length * 17;
  const base = 80 + (s % 260) + (s % 19) / 10;
  const bias = ((s % 9) - 4) / 100;
  const candles = Array.from({ length: 76 }, (_, index) => {
    const wave = Math.sin((index + s) / 5) * base * 0.012;
    const drift = index * bias * (timeframe === "1d" ? 0.9 : 0.28);
    const open = base + wave + drift;
    const close = open + Math.cos((index + s) / 4) * base * 0.006 + bias * base;
    const high = Math.max(open, close) + base * (0.006 + (index % 5) / 1200);
    const low = Math.min(open, close) - base * (0.006 + (index % 7) / 1400);
    const volume = 700000 + ((s * (index + 3)) % 4200000);
    return { open, high, low, close, volume };
  });
  const price = candles[candles.length - 1].close;
  const first = candles[0].close;
  const score = Math.round(50 + Math.min(45, Math.abs((price - first) / first) * 900 + (s % 24)));
  const direction = price > first * 1.012 ? "Bullish" : price < first * 0.988 ? "Bearish" : "Neutral";
  const strike = Math.round((price + (direction === "Bearish" ? -5 : 5)) / 5) * 5;
  return { ticker, price, score, direction, candles, contract: `${ticker} 2026-07-17 ${strike} ${direction === "Bearish" ? "PUT" : "CALL"}` };
}

function MiniChart({ model, timeframe }: { model: ChartModel; timeframe: Timeframe }) {
  const width = 760;
  const height = 280;
  const padding = 24;
  const visible = model.candles.slice(-64);
  const high = Math.max(...visible.map((candle) => candle.high));
  const low = Math.min(...visible.map((candle) => candle.low));
  const maxVolume = Math.max(...visible.map((candle) => candle.volume));
  const range = Math.max(0.01, high - low);
  const chartBottom = height - 58;
  const bodyWidth = Math.max(4, (width - padding * 2) / visible.length - 4);
  const x = (index: number) => padding + (index / Math.max(visible.length - 1, 1)) * (width - padding * 2);
  const y = (price: number) => padding + ((high - price) / range) * (chartBottom - padding);
  const volumeY = (volume: number) => height - padding - (volume / maxVolume) * 34;
  const last = visible[visible.length - 1];
  const previous = visible[visible.length - 2] || last;
  const change = last.close - previous.close;

  return <div style={{border:"1px solid rgba(103,232,249,.14)",background:"rgba(2,6,23,.45)",borderRadius:12,padding:10}}><svg viewBox={`0 0 ${width} ${height}`} style={{width:"100%",height:260,display:"block"}}>
    <rect x={padding} y={padding} width={width - padding * 2} height={chartBottom - padding} rx={12} fill="rgba(34,211,238,.06)" />
    {Array.from({ length: 5 }).map((_, index) => <line key={index} x1={padding} x2={width-padding} y1={padding + index * ((chartBottom-padding)/4)} y2={padding + index * ((chartBottom-padding)/4)} stroke="rgba(148,163,184,.12)" />)}
    {visible.map((candle, index) => {
      const rising = candle.close >= candle.open;
      const color = rising ? "#34d399" : "#fb7185";
      const top = y(Math.max(candle.open, candle.close));
      const bodyHeight = Math.max(2, Math.abs(y(candle.open) - y(candle.close)));
      return <g key={index}><rect x={x(index)-bodyWidth/2} y={volumeY(candle.volume)} width={bodyWidth} height={height-padding-volumeY(candle.volume)} rx={1} fill="rgba(59,130,246,.25)" /><line x1={x(index)} x2={x(index)} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth="1.3" /><rect x={x(index)-bodyWidth/2} y={top} width={bodyWidth} height={bodyHeight} rx={1.5} fill={color} /></g>;
    })}
    <text x={padding} y={18} fill="#94a3b8" fontSize="11">{timeframe} demo candles</text>
    <text x={width-padding} y={18} textAnchor="end" fill={change >= 0 ? "#86efac" : "#fda4af"} fontSize="11">{change >= 0 ? "+" : ""}{change.toFixed(2)}</text>
    <text x={width-padding} y={chartBottom - 10} textAnchor="end" fill="#67e8f9" fontSize="11">High {money(high)} · Low {money(low)}</text>
  </svg></div>;
}

function ChartCard({ symbol, timeframe, onSymbol }: { symbol: string; timeframe: Timeframe; onSymbol: (value: string) => void }) {
  const model = useMemo(() => buildChart(symbol, timeframe), [symbol, timeframe]);
  const tone = model.direction === "Bearish" ? "red" : model.direction === "Bullish" ? "green" : "blue";
  return <section className="panel"><div className="search" style={{marginBottom:14}}><input value={symbol} onChange={(event)=>onSymbol(event.target.value.toUpperCase())} onKeyDown={(event)=>{if(event.key==='Enter')onSymbol(normalize(symbol))}} aria-label={`${model.ticker} chart symbol`} /><button onClick={()=>onSymbol(normalize(symbol))}>Load</button></div><div className="row" style={{alignItems:"end",justifyContent:"space-between",marginBottom:12}}><div><div className="kicker">Chart</div><h2 style={{fontSize:32}}>{model.ticker}</h2></div><div style={{textAlign:"right"}}><div className="price" style={{fontSize:26}}>{money(model.price)}</div><span className={`value ${tone}`}>{model.direction}</span></div></div><MiniChart model={model} timeframe={timeframe} /><div className="stats" style={{marginTop:12}}><div className="stat"><div className="label">Setup Score</div><div className={model.score >= 75 ? "value green" : "value amber"}>{model.score}/100</div></div><div className="stat"><div className="label">Best Contract</div><div className="value blue">{model.contract}</div></div><div className="stat"><div className="label">Mode</div><div className="value amber">Demo data</div></div></div></section>;
}

export default function ChartsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [symbols, setSymbols] = useState(starters);
  return <main className="page"><div className="shell"><header className="header"><div className="brand"><div className="logo">OP</div><div><h1>Four-Stock Charts</h1><p className="subtle">Compare four symbols at once with synchronized demo candle charts.</p><nav className="nav"><Link href="/">Analyzer</Link><Link href="/watchlist">Watchlist Scanner</Link><Link href="/market-radar">Market Radar</Link><Link href="/journal">Journal</Link><Link href="/pricing">Pricing</Link></nav></div></div><div className="badges"><span className="badge">Using demo data</span><span className="badge">No live trading</span></div></header><section className="panel" style={{marginTop:16}}><div className="row" style={{alignItems:"center",justifyContent:"space-between"}}><div><div className="kicker">Timeframe</div><p className="subtle">Switch all four charts together.</p></div><div className="actions">{timeframes.map((item)=><button key={item} className={timeframe===item?"primary":""} onClick={()=>setTimeframe(item)}>{item}</button>)}</div></div></section><section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,520px),1fr))",gap:16,marginTop:16}}>{symbols.map((symbol,index)=><ChartCard key={index} symbol={symbol} timeframe={timeframe} onSymbol={(value)=>setSymbols((current)=>current.map((item,itemIndex)=>itemIndex===index?normalize(value):item))} />)}</section><footer className="footer">Educational tool only. Not financial advice. Options involve significant risk. Charts are decision-support only and do not place trades.</footer></div></main>;
}
