const analyzedTickers = ["AAPL", "NVDA", "MSFT", "TSLA"];
const watchlist = [
  { ticker: "NVDA", setup: "Bullish breakout calls", score: 86, direction: "Bullish" },
  { ticker: "MSFT", setup: "Pullback calls", score: 78, direction: "Bullish" },
  { ticker: "SPY", setup: "Momentum continuation", score: 74, direction: "Neutral" },
  { ticker: "TSLA", setup: "High IV wait", score: 58, direction: "Neutral" }
];

const metrics = [
  ["Entry Zone", "$198.40 - $201.20", "blue"],
  ["Stop Loss", "$194.10", "red"],
  ["Target 1", "$207.50", "green"],
  ["Target 2", "$214.80", "green"],
  ["Risk/Reward", "1 : 2.7", "amber"],
  ["Confidence", "82 / 100", "green"],
  ["Trade Rating", "Take", "green"],
  ["Data Mode", "Demo Data", "amber"]
];

const scores = [
  ["Trend", 84],
  ["Momentum", 78],
  ["Volume", 73],
  ["Support/Resistance", 81],
  ["Liquidity", 88],
  ["IV Risk", 64],
  ["Spread Risk", 79],
  ["Final", 82]
];

const contracts = [
  ["AAPL 2026-07-17 205 CALL", "$3.42", "Delta 0.51", "OI 18,420"],
  ["AAPL 2026-07-17 200 CALL", "$5.15", "Delta 0.62", "OI 24,118"],
  ["AAPL 2026-08-21 210 CALL", "$4.85", "Delta 0.44", "OI 12,806"]
];

export default function Dashboard() {
  return (
    <main className="page">
      <div className="shell">
        <header className="header">
          <div className="brand">
            <div className="logo">OP</div>
            <div>
              <h1>Option Pilot Dashboard</h1>
              <p className="subtle">AI options decision-support terminal. Demo data is active until market data keys are connected.</p>
            </div>
          </div>
          <div className="badges">
            <span className="badge">Using demo data</span>
            <span className="badge">Live trading disabled</span>
          </div>
        </header>

        <div className="main">
          <aside className="sidebar">
            <section className="card">
              <div className="kicker">Analyzer</div>
              <div className="search">
                <input aria-label="Ticker search" defaultValue="AAPL" />
                <button className="primary">Analyze</button>
              </div>
            </section>

            <section className="card">
              <div className="kicker">Recent analyzed</div>
              <div className="actions">
                {analyzedTickers.map((ticker) => <button key={ticker}>{ticker}</button>)}
              </div>
            </section>

            <section className="card">
              <div className="kicker">Watchlist</div>
              <div className="contracts">
                {watchlist.map((item) => (
                  <div className="contract" key={item.ticker}>
                    <div>
                      <h3>{item.ticker}</h3>
                      <p className="subtle">{item.setup}</p>
                    </div>
                    <strong className={item.score >= 75 ? "green" : "amber"}>{item.score}</strong>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="content">
            <section className="panel">
              <div className="kicker">Analysis result</div>
              <div className="row" style={{ alignItems: "end", justifyContent: "space-between" }}>
                <div>
                  <div className="ticker">AAPL</div>
                  <div className="price">$201.32</div>
                </div>
                <div className="badges">
                  <span className="badge">Bullish</span>
                  <span className="badge">Take</span>
                </div>
              </div>

              <div className="stats" style={{ marginTop: 18 }}>
                {metrics.map(([label, value, tone]) => (
                  <div className="stat" key={label}>
                    <div className="label">{label}</div>
                    <div className={`value ${tone}`}>{value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="kicker">AI breakdown</div>
              <p className="explain">
                AAPL is showing a bullish educational probability profile with trend support, acceptable option liquidity, and a defined risk zone. Best setup type is a breakout or continuation entry only if price confirms near the planned entry zone. This is not financial advice and does not guarantee an outcome.
              </p>
            </section>

            <section className="panel">
              <div className="kicker">Scoring engine</div>
              <div className="scoreGrid">
                {scores.map(([label, value]) => (
                  <div className="metric" key={label}>
                    <div className="label">{label}</div>
                    <div className="value">{value}</div>
                    <div className="bar"><div className="fill" style={{ width: `${value}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="kicker">Recommended contracts</div>
              <div className="contracts">
                {contracts.map(([contract, premium, delta, oi]) => (
                  <div className="contract" key={contract}>
                    <div>
                      <h3>{contract}</h3>
                      <p className="subtle">{delta} · {oi}</p>
                    </div>
                    <strong className="green">{premium}</strong>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </div>

        <footer className="footer">
          Educational tool only. Not financial advice. Options involve significant risk. This system is decision-support only and does not place trades.
        </footer>
      </div>
    </main>
  );
}
