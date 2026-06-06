import { NextResponse } from "next/server";

type OptionSide = "call" | "put" | "all";
type OptionRow = {
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

function normalizeTicker(value: string) {
  return value.toUpperCase().replace(/[^A-Z.]/g, "").slice(0, 8) || "AAPL";
}

function numberParam(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function futureIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function parseOccSymbol(symbol: string) {
  const match = symbol.match(/^([A-Z.]+)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/);
  if (!match) return null;
  const [, , yy, mm, dd, side, strikeRaw] = match;
  return {
    expiration: `20${yy}-${mm}-${dd}`,
    type: side === "C" ? "call" as const : "put" as const,
    strike: Number(strikeRaw) / 1000
  };
}

function scoreLiquidity(row: Pick<OptionRow, "bid" | "ask" | "volume" | "openInterest">) {
  const spread = row.bid && row.ask ? Math.max(0, row.ask - row.bid) : 1;
  const mid = row.bid && row.ask ? (row.bid + row.ask) / 2 : 1;
  const spreadPenalty = Math.min(45, (spread / Math.max(mid, 0.01)) * 120);
  const volumeScore = Math.min(35, Math.log10(row.volume + 1) * 12);
  const oiScore = Math.min(35, Math.log10(row.openInterest + 1) * 10);
  return Math.max(1, Math.round(35 + volumeScore + oiScore - spreadPenalty));
}

function demoChain(ticker: string, side: OptionSide, warning: string) {
  const base = 80 + ticker.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 260;
  const expirations = [futureIso(14), futureIso(28), futureIso(45)];
  const rows: OptionRow[] = [];
  for (const expiration of expirations) {
    for (let offset = -5; offset <= 5; offset += 1) {
      for (const type of ["call", "put"] as const) {
        if (side !== "all" && side !== type) continue;
        const strike = Math.round((base + offset * 5) / 5) * 5;
        const distance = Math.abs(strike - base) / Math.max(base, 1);
        const bid = Math.max(0.12, 3.4 - distance * 22 + (type === "call" ? offset : -offset) * 0.05);
        const ask = bid + 0.08 + Math.abs(offset) * 0.025;
        const volume = Math.max(0, 900 - Math.abs(offset) * 110 + (expiration.charCodeAt(9) % 7) * 30);
        const openInterest = Math.max(25, 2600 - Math.abs(offset) * 210);
        const row = {
          symbol: `${ticker}${expiration.replace(/-/g, "").slice(2)}${type === "call" ? "C" : "P"}${String(Math.round(strike * 1000)).padStart(8, "0")}`,
          type,
          expiration,
          strike,
          bid,
          ask,
          mid: (bid + ask) / 2,
          spread: ask - bid,
          last: bid + (ask - bid) * 0.45,
          delta: type === "call" ? Math.max(0.08, 0.52 - offset * 0.055) : Math.min(-0.08, -0.48 - offset * 0.055),
          gamma: 0.04,
          theta: -0.08,
          vega: 0.12,
          iv: 0.32 + Math.abs(offset) * 0.015,
          volume,
          openInterest,
          liquidityScore: 0
        };
        rows.push({ ...row, liquidityScore: scoreLiquidity(row) });
      }
    }
  }
  return {
    ticker,
    dataMode: "demo",
    provider: "demo",
    warning,
    expirations,
    contracts: rows.sort((a, b) => a.expiration.localeCompare(b.expiration) || a.strike - b.strike).slice(0, 80),
    asOf: new Date().toISOString()
  };
}

function readSnapshot(symbol: string, snapshot: any): OptionRow | null {
  const parsed = parseOccSymbol(symbol);
  if (!parsed) return null;
  const quote = snapshot?.latestQuote ?? snapshot?.latest_quote ?? {};
  const trade = snapshot?.latestTrade ?? snapshot?.latest_trade ?? {};
  const greeks = snapshot?.greeks ?? {};
  const dailyBar = snapshot?.dailyBar ?? snapshot?.daily_bar ?? {};
  const bid = Number.isFinite(Number(quote.bp ?? quote.bid_price)) ? Number(quote.bp ?? quote.bid_price) : null;
  const ask = Number.isFinite(Number(quote.ap ?? quote.ask_price)) ? Number(quote.ap ?? quote.ask_price) : null;
  const mid = bid !== null && ask !== null ? (bid + ask) / 2 : null;
  const spread = bid !== null && ask !== null ? Math.max(0, ask - bid) : null;
  const volume = Math.max(0, Number(dailyBar.v ?? dailyBar.volume ?? snapshot?.volume ?? 0) || 0);
  const openInterest = Math.max(0, Number(snapshot?.openInterest ?? snapshot?.open_interest ?? snapshot?.oi ?? 0) || 0);
  const row: OptionRow = {
    symbol,
    type: parsed.type,
    expiration: parsed.expiration,
    strike: parsed.strike,
    bid,
    ask,
    mid,
    spread,
    last: Number.isFinite(Number(trade.p ?? trade.price)) ? Number(trade.p ?? trade.price) : null,
    delta: Number.isFinite(Number(greeks.delta)) ? Number(greeks.delta) : null,
    gamma: Number.isFinite(Number(greeks.gamma)) ? Number(greeks.gamma) : null,
    theta: Number.isFinite(Number(greeks.theta)) ? Number(greeks.theta) : null,
    vega: Number.isFinite(Number(greeks.vega)) ? Number(greeks.vega) : null,
    iv: Number.isFinite(Number(snapshot?.impliedVolatility ?? snapshot?.implied_volatility ?? snapshot?.iv)) ? Number(snapshot?.impliedVolatility ?? snapshot?.implied_volatility ?? snapshot?.iv) : null,
    volume,
    openInterest,
    liquidityScore: 0
  };
  return { ...row, liquidityScore: scoreLiquidity(row) };
}

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker: rawTicker } = await context.params;
  const ticker = normalizeTicker(rawTicker);
  const params = new URL(request.url).searchParams;
  const side = (params.get("type") === "call" || params.get("type") === "put" ? params.get("type") : "all") as OptionSide;
  const expiration = params.get("expiration");
  const minStrike = numberParam(params.get("minStrike"));
  const maxStrike = numberParam(params.get("maxStrike"));
  const minDelta = numberParam(params.get("minDelta"));
  const maxDelta = numberParam(params.get("maxDelta"));
  const minVolume = numberParam(params.get("minVolume")) ?? 0;
  const minOpenInterest = numberParam(params.get("minOpenInterest")) ?? 0;
  const maxSpread = numberParam(params.get("maxSpread"));
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;

  if (!key || !secret) {
    return NextResponse.json(demoChain(ticker, side, "Alpaca credentials are missing in Vercel. Add ALPACA_API_KEY and ALPACA_SECRET_KEY to enable live option chain data."));
  }

  const url = new URL(`https://data.alpaca.markets/v1beta1/options/snapshots/${ticker}`);
  url.searchParams.set("feed", params.get("feed") || "indicative");
  url.searchParams.set("limit", "250");
  if (side !== "all") url.searchParams.set("type", side);
  if (expiration) url.searchParams.set("expiration_date", expiration);
  else {
    url.searchParams.set("expiration_date_gte", todayIso());
    url.searchParams.set("expiration_date_lte", futureIso(60));
  }
  if (minStrike !== null) url.searchParams.set("strike_price_gte", String(minStrike));
  if (maxStrike !== null) url.searchParams.set("strike_price_lte", String(maxStrike));

  try {
    const response = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const message = response.status === 401 || response.status === 403
        ? "Alpaca options data is not available for these credentials or subscription. Showing demo fallback."
        : "Alpaca option chain request failed. Showing demo fallback.";
      return NextResponse.json(demoChain(ticker, side, message));
    }

    const data = await response.json() as { snapshots?: Record<string, any>; next_page_token?: string };
    const rows = Object.entries(data.snapshots ?? {})
      .map(([symbol, snapshot]) => readSnapshot(symbol, snapshot))
      .filter((row): row is OptionRow => Boolean(row))
      .filter((row) => row.volume >= minVolume)
      .filter((row) => row.openInterest >= minOpenInterest)
      .filter((row) => maxSpread === null || row.spread === null || row.spread <= maxSpread)
      .filter((row) => minDelta === null || row.delta === null || row.delta >= minDelta)
      .filter((row) => maxDelta === null || row.delta === null || row.delta <= maxDelta)
      .sort((a, b) => a.expiration.localeCompare(b.expiration) || a.strike - b.strike)
      .slice(0, 100);

    if (!rows.length) {
      return NextResponse.json(demoChain(ticker, side, "No matching option contracts were returned for those filters. Showing demo fallback."));
    }

    const expirations = Array.from(new Set(rows.map((row) => row.expiration))).sort();
    return NextResponse.json({
      ticker,
      dataMode: "live",
      provider: "alpaca",
      expirations,
      contracts: rows,
      nextPageToken: data.next_page_token ?? null,
      asOf: new Date().toISOString()
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(demoChain(ticker, side, "Could not reach Alpaca option chain data. Showing demo fallback."));
  }
}
