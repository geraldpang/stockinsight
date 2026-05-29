Run 6 objective:
Create a new #SIMULATOR page to test Rule Based Analytics historical accuracy using Yahoo historical data.

Scope:
Only build:
- Run 6A: Yahoo historical data feasibility test
- Run 6B: Single ticker historical backtest

Do NOT build manual setup simulator.
Do NOT add manual Trend / Momentum / Reversal / Smart Money dropdowns.

Context:
Technical AI has been replaced by Rule Based Analytics.
The rule-based engine is in:

src/ruleBasedAnalytics.js

It exports:

generateRuleBasedAnalytics(snapshot)

Technical signal calculation should use:

src/technicalSignals.js

It exports:

calculateTechnicalSignalSnapshot()

Important:
- Do NOT use AI.
- Do NOT call /anthropic.
- Do NOT call /cache tab=ai-tech.
- Do NOT reintroduce Technical AI.
- Do NOT recalculate rule logic in App.jsx.
- Use calculateTechnicalSignalSnapshot() for technical factors.
- Use generateRuleBasedAnalytics() for Setup classification.
- Do not show internal scores in public simulator results unless inside a clearly marked debug-only area.
- The simulator is for research and validation only, not financial advice.

Add new route:
#SIMULATOR

Routing requirement:
Add the #SIMULATOR route before the generic ticker hash route.

Example:
if (hashSym === "SIMULATOR") {
  return <SimulatorPage />;
}

This must come before:
if (hashSym) {
  return <Detail ... />;
}

Page title:
Rule Based Setup Simulator

Subtitle:
Backtest how NervousGeek Setups performed historically using Yahoo daily price data.

Main user inputs:
- Ticker, default TSLA
- Start Date, default 2024-01-01
- End Date, default today
- Holding Period dropdown:
  5 trading days
  10 trading days
  20 trading days
  60 trading days
- Setup Filter dropdown:
  All
  Strong Bullish
  Bullish
  Bullish Watch
  Neutral
  Caution
  Bearish Watch
  Bearish
  Strong Bearish

Add button:
Run Backtest

Also add button:
Test Yahoo Data

Run 6A — Yahoo data feasibility test

When user clicks "Test Yahoo Data":

1. Fetch historical daily Yahoo chart data for the ticker.

Use the existing /proxy pattern already used in App.jsx.

Yahoo endpoint pattern:
https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&period1={unixStart}&period2={unixEnd}

Important:
Fetch enough lookback data before the selected Start Date.

Need at least 250 trading days before the first test date.

Simple approach:
- Convert selected Start Date to Date.
- Fetch from Start Date minus around 400 calendar days.
- Fetch until End Date plus 90 calendar days if needed for future return calculation.

Reason:
- 250 prior trading days are needed for SMA200 and 52-week context.
- Additional future days are needed to check 5D, 10D, 20D, or 60D returns.

2. Parse Yahoo response into oldest-first OHLCV bars:

{
  date,
  open,
  high,
  low,
  close,
  volume
}

Prefer adjusted close if available:
- Yahoo chart response may include indicators.adjclose[0].adjclose.
- If adjusted close exists, use it as close for return calculations.
- Keep OHLC as normal OHLC if adjusted OHLC is unavailable.
- If adjusted close is not available, use close.

3. Display feasibility result:

- Ticker
- Bars returned
- First date
- Last date
- Has open / high / low / close / volume?
- Has at least 250 bars before Start Date?
- Can calculate a setup for the Start Date?
- Can calculate a setup for the End Date?
- Data status:
  Ready
  Limited
  Failed

4. If data is limited, show clear explanation:

Examples:
- "Not enough lookback data to calculate SMA200 reliably."
- "Yahoo returned fewer than 250 prior trading days."
- "Some OHLCV fields are missing."
- "Backtest may be incomplete."

Run 6B — Single ticker historical backtest

When user clicks "Run Backtest":

1. Fetch Yahoo historical data using the same function from Run 6A.

2. Convert to oldest-first OHLCV bars.

3. For each trading date between selected Start Date and End Date:

- Find index i for that date.
- Require at least 250 prior bars before index i.
- Require enough future bars after index i for selected holding period.
- Slice bars from 0 to i inclusive.
- Use only data available on or before that date.
- Do NOT use future data to calculate the setup.

4. Build snapshot using calculateTechnicalSignalSnapshot():

calculateTechnicalSignalSnapshot({
  ticker: ticker,
  date: currentDate,
  ohlcv: historicalBarsUpToCurrentDate,
  indicators: generatedIndicators,
  meta: {
    price: closePrice,
    hi52: rolling52WeekHigh,
    lo52: rolling52WeekLow
  }
})

Important:
If calculateTechnicalSignalSnapshot() requires indicators such as ema20, sma50, sma200, rsiHistory, macdHistory, wsma10, wsma40:
- Generate these from the historical OHLCV data available up to that date only.
- Use existing helper functions from technicalSignals.js where available.
- Do not use future data.
- Do not fetch Massive historical indicators.
- Do not call AI.

Indicator generation requirement:
For each test date, generate from historicalBarsUpToCurrentDate:

- sma50
- sma200
- ema20
- rsi14
- rsiHistory if feasible
- macd and macdHistory if feasible
- wsma10 and wsma40 if feasible using weekly resampled closes

If some indicator cannot be generated, pass null and let calculateTechnicalSignalSnapshot() handle missing data.

Do not block the entire backtest because one indicator is missing.

5. Run Rule Based Analytics:

var ruleAnalytics = generateRuleBasedAnalytics({
  ...snapshot,
  close: closePrice,
  ohlcv: historicalBarsUpToCurrentDate,
  indicators: generatedIndicators,
  meta: {
    price: closePrice,
    hi52: rolling52WeekHigh,
    lo52: rolling52WeekLow
  }
});

6. Store result row:

{
  date,
  ticker,
  close,
  setup: shortRuleVerdict(ruleAnalytics.verdict),
  fullSetup: ruleAnalytics.verdict,
  scenarioId: ruleAnalytics.scenarioId,
  tone: ruleAnalytics.tone,
  trend: snapshot.trend.status,
  momentum: snapshot.momentum.status,
  reversal: snapshot.reversalWatch.status,
  smartMoney: snapshot.smartMoneyFlow.status,
  futureClose,
  futureReturnPct,
  result: futureReturnPct > 0 ? "Win" : "Loss"
}

7. Apply Setup Filter:
If Setup Filter is not "All", show only matching short setup.

Examples:
- Strong Bullish
- Bullish
- Bullish Watch
- Neutral
- Caution
- Bearish Watch
- Bearish
- Strong Bearish

8. Display summary cards:

- Total Signals
- Win Rate
- Average Return
- Median Return
- Best Return
- Worst Return
- Holding Period

9. Display Setup Performance table grouped by setup:

Columns:
- Setup
- Signals
- Win Rate
- Average Return
- Median Return
- Best Return
- Worst Return

Example rows:
Strong Bullish
Bullish
Bullish Watch
Neutral
Caution
Bearish Watch
Bearish
Strong Bearish

10. Display Historical Signal table:

Columns:
- Date
- Close
- Setup
- Trend
- Momentum
- Reversal
- Smart Money
- Future Return
- Result

Keep the table compact.

Suggested order:
Date
Close
Setup
Trend
Momentum
Reversal
Smart Money
Return
Result

Do not show internal scores in this table.

11. Add warnings / notes:

At bottom of simulator, show:

"Backtest uses historical Yahoo daily price data and NervousGeek rule-based technical logic. Results are for research only and are not financial advice. Historical performance does not guarantee future results."

Also show:
"Signals are calculated using only data available up to each historical date to reduce look-ahead bias."

12. Helper functions to add

Add:

function shortRuleVerdict(verdict) {
  if (!verdict) return "N/A";
  return verdict.split("—")[0].trim();
}

function median(values) {
  if (!values || values.length === 0) return null;
  var sorted = values.slice().sort(function(a,b){ return a-b; });
  var mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pctReturn(start, end) {
  if (!start || !end || start <= 0) return null;
  return ((end - start) / start) * 100;
}

function formatPct(v) {
  if (v == null || isNaN(v)) return "-";
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

13. Data fetch helper

Add helper:

async function fetchYahooHistoricalBars(ticker, startDate, endDate, holdingPeriod) {
  // Convert dates to UNIX seconds.
  // Fetch from startDate minus 400 calendar days.
  // Fetch to endDate plus holdingPeriod buffer.
  // Use /proxy.
  // Return oldest-first bars.
}

Handle BRKB:
If ticker is BRKB, convert to BRK-B for Yahoo request.

14. Indicator helper

Add helper:

function buildHistoricalIndicators(barsUpToDate) {
  // Returns:
  // {
  //   sma50,
  //   sma200,
  //   ema20,
  //   rsi14,
  //   rsiHistory,
  //   macd,
  //   macdHistory,
  //   wsma10,
  //   wsma40
  // }
}

Use existing technical helper functions where possible:
- calcSMA
- calcEMA
- calcRSI

If MACD helper does not exist, create a small local MACD calculation helper inside SimulatorPage or near helper functions.
Keep it local and simple.

Do not alter technicalSignals.js unless absolutely necessary.

15. Rolling 52-week helper

Add helper:

function rolling52WeekHighLow(barsUpToDate) {
  var last252 = barsUpToDate.slice(-252);
  return {
    hi52: Math.max(...last252.map(b => b.high)),
    lo52: Math.min(...last252.map(b => b.low))
  };
}

Use ES5-compatible syntax if needed in this project style.

16. Visual design

Use existing NervousGeek dark theme:
- background #0e0e0c
- cards #161614 or #1c1c1e
- lime #c8f000
- muted text #888 / #666
- compact table styling similar to Screener / Journal

Do not make the page too wide or too bright.

17. Error handling

If Yahoo fetch fails:
Show:
"Yahoo historical data could not be loaded for this ticker."

If not enough bars:
Show:
"Not enough historical data to run a reliable backtest. Try an earlier start date or a ticker with more trading history."

If no signals after filtering:
Show:
"No matching setup signals found for the selected period and filter."

18. Performance guardrails

Start with single ticker only.
Do not build multi-ticker backtest yet.
Do not backtest all S&P 500 tickers.
Limit max backtest rows to avoid browser freezing.

Suggested:
- If date range produces more than 1,000 test dates, show warning and allow only first 1,000 valid dates or ask user to narrow date range.
- Use state loading message:
  "Running backtest..."
- Disable button while running.

19. Testing

Run:

npm run build

Report:
1. Whether build succeeded.
2. Whether #SIMULATOR route loads.
3. Whether Test Yahoo Data works for TSLA.
4. Whether Run Backtest works for TSLA.
5. Whether the page calculates Setup using generateRuleBasedAnalytics().
6. Whether the page calculates technical factors using calculateTechnicalSignalSnapshot().
7. Whether no AI calls are used.
8. Whether no /anthropic call is made.
9. Whether no /cache tab=ai-tech call is made.
10. Whether internal scores are not shown publicly.

Test case:
Ticker: TSLA
Start Date: 2024-01-01
End Date: 2026-05-28
Holding Period: 20 trading days
Setup Filter: All

Expected:
- Yahoo data feasibility should show Ready or Limited.
- Backtest should produce historical rows.
- Each row should have Setup, Trend, Momentum, Reversal, Smart Money, Future Return, and Result.
- Summary cards should show win rate and average return.
