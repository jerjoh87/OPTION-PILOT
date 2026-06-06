import { NextResponse } from "next/server";

type Timeframe = "5m" | "15m" | "1h" | "1d";
type Candle = { timestamp: string; open: number; high: number; low: number; close: number; volume: number };

const timeframes: Record<Timeframe, { alpaca: string; lookbackDays: number }> = {
  "5m": { alpaca: "5Min", lookbackDays: 5 },
  "15m": { alpaca: "15Min", lookbackDays: 10 },
  "1h": { alpaca: "1Hour", lookbackDays: 45 },
  "1d": { alpaca: "1Day", lookbackDays: 220 }
};

function normalizeTicker(value: string) {
  return value.toUpperCase().replace(/[^A-Z.]/g, "").slice(0, 8) || "AAPL";
}

function normalizeTimeframe(value: string | null): Timeframe {
  return value === "5m" || value === "15m" || value === "1h" || value === "1d" ? value : "15m";
}

function seed(ticker: string) {
  return ticker.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) || 65;
}

function demoCandles(ticker: string, timeframe: Timeframe): Candle[] {
  const s = seed(ticker) + timeframe.length * 17;
  const base = 80 + (s % 260) + (s % 19) / 10;
  const bias = ((s % 9) - 4) / 100;
  return Array.from({ length: 76 }, (_, index) => {
    const wave = Math.sin((index + s) / 5) * base * 0.012;
    const drift = index * bias * (timeframe === "1d" ? 0.9 : 0.28);
    const open = base + wave + drift;
    const close = open + Math.cos((index + s) / 4) * base * 0.006 + bias * base;
    const high = Math.max(open, close) + base * (0.006 + (index % 5) / 1200);
    const low = Math.min(open, close) - base * (0.006 + (index % 7) / 1400);
    const volume = 700000 + ((s * (index + 3)) % 4200000);
    return { timestamp: new Date(Date.now() - (76 - index) * 60000).toISOString(), open, high, low, close, volume };
  });
}

function demoPayload(ticker: string, timeframe: Timeframe, warning: string) {
  const candles = demoCandles(ticker, timeframe);
  const last = candles[candles.length - 1];
  return {
    ticker,
    timeframe,
    dataMode: "demo",
    provider: "demo",
    warning,
    price: last.close,
    candles,
    asOf: last.timestamp
  };
}

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker: rawTicker } = await context.params;
  const ticker = normalizeTicker(rawTicker);
  const timeframe = normalizeTimeframe(new URL(request.url).searchParams.get("timeframe"));
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;

  if (!key || !secret) {
    return NextResponse.json(demoPayload(ticker, timeframe, "Alpaca credentials are missing in Vercel. Add ALPACA_API_KEY and ALPACA_SECRET_KEY to enable live data."));
  }

  const config = timeframes[timeframe];
  const start = new Date(Date.now() - config.lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL(`https://data.alpaca.markets/v2/stocks/${ticker}/bars`);
  url.searchParams.set("timeframe", config.alpaca);
  url.searchParams.set("start", start);
  url.searchParams.set("limit", "100");
  url.searchParams.set("adjustment", "raw");
  url.searchParams.set("feed", "iex");
  url.searchParams.set("sort", "desc");

  try {
    const response = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const message = response.status === 403 || response.status === 401
        ? "Alpaca rejected the credentials or data subscription. Check the API key, secret key, and market data access."
        : "Alpaca market data request failed. Showing demo fallback.";
      return NextResponse.json(demoPayload(ticker, timeframe, message), { status: 200 });
    }

    const data = await response.json() as { bars?: Array<{ t: string; o: number; h: number; l: number; c: number; v: number }> };
    const candles = (data.bars ?? [])
      .map((bar) => ({ timestamp: bar.t, open: bar.o, high: bar.h, low: bar.l, close: bar.c, volume: bar.v }))
      .reverse();

    if (!candles.length) {
      return NextResponse.json(demoPayload(ticker, timeframe, "Alpaca returned no bars for this ticker/timeframe. Showing demo fallback."));
    }

    const last = candles[candles.length - 1];
    return NextResponse.json({ ticker, timeframe, dataMode: "live", provider: "alpaca", price: last.close, candles, asOf: last.timestamp }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(demoPayload(ticker, timeframe, "Could not reach Alpaca market data. Showing demo fallback."));
  }
}
