import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'

type DocsTab = 'methodology' | 'metrics' | 'technicals' | 'source'

export default function MetricsPage() {
  const [activeTab, setActiveTab] = useState<DocsTab>(() => {
    const saved = sessionStorage.getItem('docs-tab')
    if (saved && ['methodology', 'metrics', 'technicals', 'source'].includes(saved)) {
      sessionStorage.removeItem('docs-tab')
      return saved as DocsTab
    }
    return 'methodology'
  })

  const tabs: { key: DocsTab; label: string }[] = [
    { key: 'methodology', label: 'Methodology' },
    { key: 'metrics', label: 'Metrics' },
    { key: 'technicals', label: 'Technicals' },
    { key: 'source', label: 'Source Code' },
  ]

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50">
        <div className="bg-black">
          <div className="max-w-7xl mx-auto flex items-center justify-between py-1.5 px-3 md:px-4">
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Activity className="h-6 w-6" style={{ color: '#0D9488' }} />
                <span className="text-2xl md:text-3xl font-bold tracking-tight text-white">QREP</span>
                <span className="hidden xl:inline text-base font-medium tracking-wide uppercase text-slate-300 ml-3">
                  Security Analytics &amp; Tearsheets
                </span>
              </Link>
            </div>

            <div className="flex items-center shrink-0">
              <span className="hidden sm:inline text-base font-medium text-slate-400">Powered by</span>
              <a
                href="https://github.com/ranaroussi/quantstats"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 ml-2 hover:opacity-80 transition-opacity"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                <span className="hidden sm:inline text-lg font-bold text-white">QuantStats</span>
              </a>
              <a href="https://www.tigzig.com" target="_blank" rel="noopener noreferrer" className="text-2xl md:text-3xl font-bold tracking-tight text-white ml-4 md:ml-8 hover:opacity-80 transition-opacity">TIGZIG</a>
            </div>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-3 md:px-4 flex items-center gap-2 md:gap-4 py-0">
            <Link to="/" className="text-base md:text-lg font-semibold text-blue-600 hover:text-blue-800 px-3 md:px-4 py-1.5 border-b-2 border-transparent hover:border-blue-300 transition-all">
              Multi Security
            </Link>
            <Link to="/tearsheet" className="text-base md:text-lg font-semibold text-blue-600 hover:text-blue-800 px-3 md:px-4 py-1.5 border-b-2 border-transparent hover:border-blue-300 transition-all">
              Tearsheet
            </Link>
            <span className="text-base md:text-lg font-semibold text-blue-700 bg-blue-50 px-3 md:px-4 py-1.5 border-b-2 border-blue-600">
              Docs
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-3 md:px-4 py-4 flex-1">
        <div className="bg-white border border-slate-200 rounded-lg max-w-6xl mx-auto overflow-hidden">
          {/* Sub-tabs */}
          <div className="border-b border-slate-200 px-2 md:px-4 pt-3 flex items-center gap-0 md:gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 md:px-4 py-2 text-sm md:text-base font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-black hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ height: 'calc(100vh - 220px)' }} className="overflow-y-auto">
            {activeTab === 'methodology' && <MethodologyTab />}
            {activeTab === 'metrics' && (
              <iframe
                src="/metrics.html"
                className="w-full border-0"
                style={{ height: 'calc(100vh - 220px)' }}
                title="Metrics Reference"
              />
            )}
            {activeTab === 'technicals' && <TechnicalsTab />}
            {activeTab === 'source' && <SourceCodeTab />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}


// ─── METHODOLOGY TAB ─────────────────────────────────────────────────────────

function MethodologyTab() {
  return (
    <div className="p-6 max-w-4xl mx-auto text-base text-black leading-relaxed space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black mb-2">Methodology</h1>
        <p>
          QREP computes portfolio analytics using the open-source <a href="https://github.com/ranaroussi/quantstats" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline font-semibold">QuantStats</a> Python library (v0.0.81).
          This page explains how data flows through the system and any modifications applied.
        </p>
        <p className="mt-2">
          For detailed metric formulas and interpretation, see the <span className="font-semibold text-teal-700">Metrics</span> tab.
          For technical indicator formulas, see the <span className="font-semibold text-teal-700">Technicals</span> tab.
          For source code references, see the <span className="font-semibold text-teal-700">Source Code</span> tab.
        </p>
      </div>

      {/* Section 1: KPI Computation */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">1. KPI Computation</h2>
        <p>
          All key performance indicators (90+ KPIs) are computed by the <strong>QuantStats</strong> Python package running on the backend.
          The computation pipeline is:
        </p>
        <ol className="list-decimal ml-6 mt-3 space-y-2">
          <li>
            <strong>Data Fetch:</strong> Historical adjusted close prices are downloaded from Yahoo Finance using <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">yfinance</code>.
          </li>
          <li>
            <strong>Returns Calculation:</strong> Daily percentage returns are computed using <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">prices.pct_change().dropna()</code>.
          </li>
          <li>
            <strong>Metrics Generation:</strong> Returns are passed to <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">qs.reports.metrics()</code> with <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">prepare_returns=False</code>, meaning QuantStats uses the returns as-is without additional preprocessing.
          </li>
          <li>
            <strong>Benchmark Alignment:</strong> QuantStats internally aligns strategy and benchmark dates using forward-fill, ensuring matching date indices.
          </li>
        </ol>
        <p className="mt-3">
          The backend is a FastAPI service deployed at <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">qpulse-api.tigzig.com</code>. All API calls from the frontend are proxied through Vercel serverless functions to avoid CORS issues.
        </p>
      </section>

      {/* Section 2: Metrics Override Fix */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">2. Metrics Override (dropna Adjustment)</h2>
        <p>
          When QuantStats computes certain metrics for a multi-column DataFrame (strategy + benchmark),
          the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">.dropna()</code> call drops entire rows where <em>any</em> column has NaN, causing cross-column contamination.
        </p>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-base font-bold text-black mb-2">Affected Metrics (6 out of 90+)</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div><code className="bg-white px-1.5 py-0.5 rounded text-sm border">Avg. Return</code></div>
            <div><code className="bg-white px-1.5 py-0.5 rounded text-sm border">Avg. Win</code></div>
            <div><code className="bg-white px-1.5 py-0.5 rounded text-sm border">Avg. Loss</code></div>
            <div><code className="bg-white px-1.5 py-0.5 rounded text-sm border">Payoff Ratio</code></div>
            <div><code className="bg-white px-1.5 py-0.5 rounded text-sm border">Win/Loss Ratio</code></div>
            <div><code className="bg-white px-1.5 py-0.5 rounded text-sm border">CPC Index</code></div>
          </div>
        </div>

        <h3 className="text-base font-bold text-black mt-4 mb-2">Example of the Issue</h3>
        <p>
          When comparing AAPL vs SPY: if AAPL is +1.5% but SPY is -0.8% on a given day, that day gets <em>excluded</em> from
          Avg. Win calculation because SPY's column doesn't qualify. This biases the result toward days where both move in the same direction.
        </p>

        <h3 className="text-base font-bold text-black mt-4 mb-2">QREP Override</h3>
        <p>
          For these 6 metrics only, QREP overrides the multi-column result with direct single-Series calls:
        </p>
        <pre className="bg-slate-100 text-sm p-3 rounded-lg mt-2 overflow-x-auto">
{`# Instead of relying on multi-column dropna():
avg_return = qs.stats.avg_return(returns)      # Series-level call
avg_win    = qs.stats.avg_win(returns)          # No cross-column contamination
avg_loss   = qs.stats.avg_loss(returns)
payoff     = qs.stats.payoff_ratio(returns)
cpc        = qs.stats.cpc_index(returns)`}
        </pre>
        <p className="mt-3">
          <strong>Impact:</strong> Minor — affects only these 6 metrics, and only when strategy and benchmark have different trading calendars
          (e.g., stock vs crypto, cross-market comparisons). All other 84+ metrics (Sharpe, Sortino, Calmar, CAGR, drawdowns, etc.)
          are unaffected because they use <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">.sum()</code> or column-independent operations.
        </p>
        <p className="mt-2">
          Validated by comparing API metrics against the native QuantStats HTML tearsheet output.
        </p>
      </section>

      {/* Section 3: Price Data */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">3. Price Data (CSV Download)</h2>
        <p>
          The downloadable CSV contains <strong>adjusted close prices</strong> — the same raw data that feeds into QuantStats'
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">pct_change()</code> computation.
          These prices are captured in-memory during backend processing, before any transformation is applied.
        </p>
        <p className="mt-2">
          <strong>Why some dates have blank cells:</strong> Stocks and commodities don't trade on weekends and market holidays,
          so those cells are empty. Crypto assets (BTC-USD, ETH-USD) trade 24/7 and will have prices on those dates.
          This is the raw data from Yahoo Finance, unmodified.
        </p>
      </section>

      {/* Section 4: Technical Indicators */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">4. Technical Indicators</h2>
        <p>
          Technical indicators (EMA, SMA, Bollinger Bands, MACD, RSI, ROC, TRIX, Historical Volatility) are computed <strong>entirely in the frontend</strong> using
          plain JavaScript — no external libraries, no backend calls. The computations use standard textbook formulas
          implemented in <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">src/lib/technicals.ts</code>. All parameters are configurable via gear icons on each chart panel.
        </p>

        <h3 className="text-base font-bold text-black mt-4 mb-2">Validation</h3>
        <p>
          A parallel validation was run comparing our JavaScript implementation against an identical Python implementation
          using the same algorithms. Results across 251 AAPL data points:
        </p>
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="font-bold text-green-800 mb-2">All 10 indicators: EXACT MATCH (0.000000 max difference)</p>
          <div className="grid grid-cols-5 gap-2 text-sm">
            {['EMA 12', 'EMA 26', 'BB Upper', 'BB Middle', 'BB Lower', 'MACD', 'Signal', 'Histogram', 'RSI', 'ROC'].map(ind => (
              <span key={ind} className="bg-white px-2 py-1 rounded border border-green-200 text-center font-medium text-black">{ind}</span>
            ))}
          </div>
        </div>

        <h3 className="text-base font-bold text-black mt-4 mb-2">Note on EMA Initialization</h3>
        <p>
          Our implementation uses the <strong>SMA-seeded EMA</strong> approach: the first EMA value equals the Simple Moving Average
          of the first N data points, and subsequent values use the standard EMA formula <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">EMA = Price × k + EMA_prev × (1-k)</code> where <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">k = 2/(period+1)</code>.
        </p>
        <p className="mt-2">
          This is the method used by TradingView, StockCharts, and most charting platforms. Note that the Python <strong>Finta</strong> library
          uses <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">pandas.ewm(adjust=True)</code> by default, which applies a different correction factor to early values.
          Both methods are mathematically valid and converge after the warmup period (typically 2-3x the EMA period).
          Early data points may differ, but the steady-state values are identical.
        </p>
        <p className="mt-2">
          For detailed formulas and examples, see the <span className="font-semibold text-teal-700">Technicals</span> tab.
        </p>
      </section>
    </div>
  )
}


// ─── TECHNICALS TAB ──────────────────────────────────────────────────────────

function TechnicalsTab() {
  return (
    <div className="p-6 max-w-4xl mx-auto text-base text-black leading-relaxed space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black mb-2">Technical Indicator Formulas</h1>
        <p>
          All technical indicators are computed in the frontend using the adjusted close prices from the backend.
          Below are the exact formulas and worked examples.
        </p>
      </div>

      {/* EMA */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">Exponential Moving Average (EMA)</h2>
        <p><strong>Purpose:</strong> Smooths price data with more weight on recent prices. Used as EMA(12) and EMA(26).</p>

        <pre className="bg-slate-100 text-sm p-3 rounded-lg mt-3 overflow-x-auto">
{`Smoothing factor:  k = 2 / (period + 1)

Initialization:    EMA[period-1] = SMA of first 'period' values
                   EMA[period-1] = (P[0] + P[1] + ... + P[period-1]) / period

Subsequent:        EMA[i] = Price[i] × k + EMA[i-1] × (1 - k)`}
        </pre>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">Example: EMA(3) with prices [10, 11, 12, 13, 14]</h3>
          <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`k = 2 / (3 + 1) = 0.5

Index 0: null (warmup)
Index 1: null (warmup)
Index 2: SMA = (10 + 11 + 12) / 3 = 11.0000
Index 3: EMA = 13 × 0.5 + 11.0 × 0.5 = 12.0000
Index 4: EMA = 14 × 0.5 + 12.0 × 0.5 = 13.0000`}
          </pre>
        </div>
      </section>

      {/* Bollinger Bands */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">Bollinger Bands (20, 2)</h2>
        <p><strong>Purpose:</strong> Shows price volatility as bands around a moving average. When price touches the upper band, the security may be overbought; lower band, oversold.</p>

        <pre className="bg-slate-100 text-sm p-3 rounded-lg mt-3 overflow-x-auto">
{`Middle Band = SMA(20) = average of last 20 closing prices
Std Dev     = Population standard deviation of last 20 prices (ddof=0)
              σ = √( Σ(Pi - SMA)² / N )

Upper Band  = SMA(20) + 2 × σ
Lower Band  = SMA(20) - 2 × σ`}
        </pre>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">Example: BB(5, 2) with prices [10, 12, 11, 13, 14]</h3>
          <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`SMA = (10 + 12 + 11 + 13 + 14) / 5 = 12.0
σ   = √((4 + 0 + 1 + 1 + 4) / 5) = √(2.0) = 1.4142

Upper = 12.0 + 2 × 1.4142 = 14.8284
Middle = 12.0
Lower = 12.0 - 2 × 1.4142 = 9.1716`}
          </pre>
          <p className="mt-2 text-sm text-slate-600">
            Note: We use population standard deviation (ddof=0), not sample (ddof=1). This matches TradingView and most charting platforms.
          </p>
        </div>
      </section>

      {/* MACD */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">MACD (12, 26, 9)</h2>
        <p><strong>Purpose:</strong> Moving Average Convergence Divergence — shows trend direction and momentum. MACD crossing above the signal line is bullish; below is bearish.</p>

        <pre className="bg-slate-100 text-sm p-3 rounded-lg mt-3 overflow-x-auto">
{`MACD Line  = EMA(12) - EMA(26)
Signal Line = EMA(9) of the MACD Line
Histogram   = MACD Line - Signal Line

Histogram > 0: MACD above signal (bullish momentum)
Histogram < 0: MACD below signal (bearish momentum)`}
        </pre>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">How it works</h3>
          <ol className="list-decimal ml-6 space-y-1 text-sm">
            <li>Compute EMA(12) and EMA(26) of close prices (both start producing values at their respective warmup periods)</li>
            <li>MACD line starts from index 25 (when both EMAs are available)</li>
            <li>Signal line = EMA(9) of MACD values, starts 8 values after MACD begins (index 33)</li>
            <li>Histogram starts when both MACD and Signal are available</li>
          </ol>
        </div>
      </section>

      {/* RSI */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">RSI (14) — Relative Strength Index</h2>
        <p><strong>Purpose:</strong> Measures speed and magnitude of price changes on a 0-100 scale. RSI above 70 = overbought, below 30 = oversold.</p>

        <pre className="bg-slate-100 text-sm p-3 rounded-lg mt-3 overflow-x-auto">
{`Step 1: Calculate daily price changes
        change[i] = close[i] - close[i-1]

Step 2: Separate gains and losses
        gain = max(change, 0)
        loss = |min(change, 0)|

Step 3: First average (SMA of first 14 changes)
        avg_gain = sum(gains[0..13]) / 14
        avg_loss = sum(losses[0..13]) / 14

Step 4: Subsequent averages (Wilder's smoothing)
        avg_gain = (prev_avg_gain × 13 + current_gain) / 14
        avg_loss = (prev_avg_loss × 13 + current_loss) / 14

Step 5: RSI calculation
        RS  = avg_gain / avg_loss
        RSI = 100 - (100 / (1 + RS))`}
        </pre>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">Example: RSI(3) with prices [44, 44.5, 44.2, 43.8, 44.6]</h3>
          <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`Changes: [+0.5, -0.3, -0.4, +0.8]

First avg_gain = (0.5 + 0 + 0) / 3 = 0.1667
First avg_loss = (0 + 0.3 + 0.4) / 3 = 0.2333
RS = 0.1667 / 0.2333 = 0.7143
RSI = 100 - 100/(1 + 0.7143) = 41.67

Next: gain=0.8, loss=0
avg_gain = (0.1667 × 2 + 0.8) / 3 = 0.3778
avg_loss = (0.2333 × 2 + 0) / 3 = 0.1556
RS = 0.3778 / 0.1556 = 2.4286
RSI = 100 - 100/(1 + 2.4286) = 70.83`}
          </pre>
          <p className="mt-2 text-sm text-slate-600">
            This uses Wilder's smoothing method (not a standard EMA). The smoothing factor is 1/period, which gives more weight to historical averages.
          </p>
        </div>
      </section>

      {/* ROC */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">ROC (12) — Rate of Change</h2>
        <p><strong>Purpose:</strong> Shows the percentage change in price over a fixed lookback period. Positive = upward momentum, negative = downward.</p>

        <pre className="bg-slate-100 text-sm p-3 rounded-lg mt-3 overflow-x-auto">
{`ROC = ((Price_today - Price_12_days_ago) / Price_12_days_ago) × 100`}
        </pre>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">Example</h3>
          <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`Today's price: $150
Price 12 days ago: $145
ROC = ((150 - 145) / 145) × 100 = 3.45%`}
          </pre>
          <p className="mt-2 text-sm text-slate-600">
            ROC is the simplest momentum indicator. No warmup ambiguity — it's a direct percentage calculation.
          </p>
        </div>
      </section>

      {/* SMA */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">Simple Moving Average (SMA)</h2>
        <p><strong>Purpose:</strong> Unweighted average of the last N closing prices. Smoother than EMA, slower to react. Common periods: 50, 200 (used for golden/death cross signals).</p>

        <pre className="bg-slate-100 text-sm p-3 rounded-lg mt-3 overflow-x-auto">
{`SMA[i] = (Close[i] + Close[i-1] + ... + Close[i-N+1]) / N`}
        </pre>
      </section>

      {/* TRIX */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">TRIX (15) — Triple Exponential Average</h2>
        <p><strong>Purpose:</strong> Rate of change of a triple-smoothed EMA. Extremely smooth — filters out minor price fluctuations and highlights major trend reversals. Crossing zero is the primary signal.</p>

        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">Intuitive explanation</h3>
          <p>
            Think of TRIX as a "noise filter for trends." A regular EMA reacts to every small price wiggle.
            TRIX applies EMA <strong>three times in succession</strong> — like running a photo through a blur filter three times.
            After triple smoothing, only the major trend direction remains. Then it measures the <strong>rate of change</strong> of
            that ultra-smooth line. When TRIX crosses above zero, the underlying trend is turning up. When it crosses below, the trend is turning down.
          </p>
        </div>

        <pre className="bg-slate-100 text-sm p-3 rounded-lg mt-3 overflow-x-auto">
{`Step 1: EMA1 = EMA(Close, period)            — first smoothing
Step 2: EMA2 = EMA(EMA1, period)             — second smoothing (smoother)
Step 3: EMA3 = EMA(EMA2, period)             — third smoothing (ultra-smooth)
Step 4: TRIX = ((EMA3[i] - EMA3[i-1]) / EMA3[i-1]) × 100`}
        </pre>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">What the Period parameter means</h3>
          <p className="text-sm">
            The period (default: 15) is the EMA lookback used at <strong>each</strong> of the three smoothing stages.
            A larger period (e.g. 20, 30) makes TRIX even smoother and slower — it will only react to very large trend shifts.
            A smaller period (e.g. 9, 12) makes it more responsive but introduces more noise.
            The same period is applied all three times, so the effective smoothing is much greater than a single EMA of the same length.
          </p>
        </div>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">Example: TRIX(3) with prices [10, 11, 12, 13, 14, 15, 16, 17, 18]</h3>
          <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`EMA1 (period 3):  null, null, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0
EMA2 (period 3):  —, —, —, —, 12.0, 13.0, 14.0, 15.0, 16.0
EMA3 (period 3):  —, —, —, —, —, —, 13.33, 14.33, 15.33

TRIX at index 7:  ((14.33 - 13.33) / 13.33) × 100 = 7.50%
TRIX at index 8:  ((15.33 - 14.33) / 14.33) × 100 = 6.98%`}
          </pre>
          <p className="mt-2 text-sm text-black">
            Notice how TRIX produces values much later than a single EMA (needs 3× warmup periods). The trade-off: very clean signals, but delayed.
          </p>
        </div>

        <p className="mt-3 text-sm text-black">
          <strong>Comparison with MACD:</strong> MACD uses two EMAs (fast and slow) and reacts relatively quickly. TRIX triple-smooths a single EMA,
          producing a much smoother line with fewer false signals. Use MACD for shorter-term momentum, TRIX for confirming major trend direction.
        </p>
      </section>

      {/* Historical Volatility */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">Historical Volatility (20)</h2>
        <p><strong>Purpose:</strong> Annualized standard deviation of log returns over a rolling window. Shows realized risk — higher values indicate larger price swings.</p>

        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">Intuitive explanation</h3>
          <p>
            Historical Volatility answers the question: <strong>"How much has this stock been jumping around recently?"</strong> It measures
            the size of daily price movements over the last N days and expresses it as an annual percentage.
            For example, HV = 25% means the stock's daily movements, if they continued for a year, would result in roughly ±25% annual price range.
            A low HV (say 10-15%) means calm, steady trading. A high HV (40%+) means wild swings — more risk, but also more opportunity.
          </p>
        </div>

        <pre className="bg-slate-100 text-sm p-3 rounded-lg mt-3 overflow-x-auto">
{`Step 1: Daily log returns = ln(Close[i] / Close[i-1])
Step 2: σ = standard deviation of last N log returns (population, ddof=0)
Step 3: HV = σ × √252 × 100   (annualized, as percentage)

Why √252? There are ~252 trading days in a year.
Daily volatility × √252 converts to annual volatility.`}
        </pre>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">What the Period parameter means</h3>
          <p className="text-sm">
            The period (default: 20, roughly one trading month) is the rolling window of daily returns used to calculate volatility.
            A shorter period (e.g. 10) reacts faster to recent volatility spikes but is noisier.
            A longer period (e.g. 60, 90) gives a more stable reading of the stock's typical volatility regime.
          </p>
        </div>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-base font-bold mb-2">Example: HV(5) with prices [100, 102, 99, 101, 103, 100]</h3>
          <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`Log returns: [ln(102/100), ln(99/102), ln(101/99), ln(103/101), ln(100/103)]
           = [0.0198, -0.0299, 0.0201, 0.0196, -0.0296]

Mean = 0.0000
σ = √(Σ(r - mean)² / 5) = 0.0246

HV = 0.0246 × √252 × 100 = 39.0%

Interpretation: This stock has been moving ~39% annualized — quite volatile.`}
          </pre>
        </div>
      </section>

      {/* Indicator Summary Table */}
      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 border border-slate-200 font-bold text-black">Indicator</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-bold text-black">Default Params</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-bold text-black">Location</th>
                <th className="text-left px-3 py-2 border border-slate-200 font-bold text-black">Configurable</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="px-3 py-2 border border-slate-200">EMA (×3)</td><td className="px-3 py-2 border border-slate-200">12, 26, 50</td><td className="px-3 py-2 border border-slate-200">Price overlay</td><td className="px-3 py-2 border border-slate-200">Period per EMA</td></tr>
              <tr className="bg-slate-50"><td className="px-3 py-2 border border-slate-200">SMA (×2)</td><td className="px-3 py-2 border border-slate-200">50, 200</td><td className="px-3 py-2 border border-slate-200">Price overlay</td><td className="px-3 py-2 border border-slate-200">Period per SMA</td></tr>
              <tr><td className="px-3 py-2 border border-slate-200">Bollinger Bands</td><td className="px-3 py-2 border border-slate-200">20, 2σ</td><td className="px-3 py-2 border border-slate-200">Price overlay</td><td className="px-3 py-2 border border-slate-200">Period, Std Dev</td></tr>
              <tr className="bg-slate-50"><td className="px-3 py-2 border border-slate-200">MACD</td><td className="px-3 py-2 border border-slate-200">12, 26, 9</td><td className="px-3 py-2 border border-slate-200">Panel 2</td><td className="px-3 py-2 border border-slate-200">Fast, Slow, Signal</td></tr>
              <tr><td className="px-3 py-2 border border-slate-200">RSI</td><td className="px-3 py-2 border border-slate-200">14</td><td className="px-3 py-2 border border-slate-200">Panel 3</td><td className="px-3 py-2 border border-slate-200">Period</td></tr>
              <tr className="bg-slate-50"><td className="px-3 py-2 border border-slate-200">ROC</td><td className="px-3 py-2 border border-slate-200">12</td><td className="px-3 py-2 border border-slate-200">Panel 3</td><td className="px-3 py-2 border border-slate-200">Period</td></tr>
              <tr><td className="px-3 py-2 border border-slate-200">TRIX</td><td className="px-3 py-2 border border-slate-200">15</td><td className="px-3 py-2 border border-slate-200">Extra panel</td><td className="px-3 py-2 border border-slate-200">Period</td></tr>
              <tr className="bg-slate-50"><td className="px-3 py-2 border border-slate-200">Historical Volatility</td><td className="px-3 py-2 border border-slate-200">20</td><td className="px-3 py-2 border border-slate-200">Extra panel</td><td className="px-3 py-2 border border-slate-200">Period</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          All parameters are configurable via the gear icon (⚙) on each panel. All indicators use close prices only — no volume, high, or low data required.
        </p>
      </section>
    </div>
  )
}


// ─── SOURCE CODE TAB ─────────────────────────────────────────────────────────

function SourceCodeTab() {
  return (
    <div className="p-6 max-w-4xl mx-auto text-base text-black leading-relaxed space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black mb-2">Source Code</h1>
        <p>
          QREP is open source. For detailed documentation, refer to the README files in each repository.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">Frontend</h2>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <p><strong>Repository:</strong> <a href="https://github.com/amararun/qrep-security-analytics" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline">github.com/amararun/qrep-security-analytics</a></p>
          <p><strong>Stack:</strong> React + Vite + Tailwind CSS + Recharts</p>
          <p><strong>Deployment:</strong> Vercel (auto-deploy on push to main)</p>
          <p className="mt-2"><strong>Key files:</strong></p>
          <ul className="list-disc ml-6 space-y-1 text-sm">
            <li><code className="bg-white px-1.5 py-0.5 rounded border">src/lib/technicals.ts</code> — Technical indicator computations</li>
            <li><code className="bg-white px-1.5 py-0.5 rounded border">src/components/charts/TechnicalChart.tsx</code> — Multi-panel chart component</li>
            <li><code className="bg-white px-1.5 py-0.5 rounded border">src/lib/backend-service.ts</code> — Backend API integration</li>
            <li><code className="bg-white px-1.5 py-0.5 rounded border">api/qpulse-proxy.js</code> — Vercel serverless proxy</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">Backend</h2>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <p><strong>Repository:</strong> <a href="https://github.com/amararun/qrep-backend-fastapi" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline">github.com/amararun/qrep-backend-fastapi</a></p>
          <p><strong>Stack:</strong> Python FastAPI + QuantStats 0.0.81 + yfinance</p>
          <p><strong>Deployment:</strong> Coolify (Docker on Hetzner)</p>
          <p className="mt-2"><strong>Key files:</strong></p>
          <ul className="list-disc ml-6 space-y-1 text-sm">
            <li><code className="bg-white px-1.5 py-0.5 rounded border">main.py</code> — All API endpoints and metrics override logic</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-700 mb-3 pb-1 border-b border-teal-200">QuantStats Library</h2>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <p><strong>Repository:</strong> <a href="https://github.com/ranaroussi/quantstats" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline">github.com/ranaroussi/quantstats</a></p>
          <p><strong>Version:</strong> 0.0.81</p>
          <p><strong>Author:</strong> Ran Aroussi</p>
          <p><strong>License:</strong> Apache License 2.0</p>
          <p>QuantStats is the core analytics engine. QREP uses it as-is, with a small drop-in override described in the Methodology tab.</p>
        </div>
      </section>

      <section>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-base text-black">
          <p><strong>License:</strong> QREP is licensed under the Apache License 2.0. See the LICENSE file in each repository.</p>
          <p className="mt-1">QREP is an independent project. It is not affiliated with or endorsed by the QuantStats project or its authors.</p>
        </div>
      </section>

    </div>
  )
}
