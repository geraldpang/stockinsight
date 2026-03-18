import { useState, useEffect } from "react";

const FONT = "'Inter', system-ui, sans-serif";
const LIME = "#c8f000";
const BG   = "#0e0e0c";

const NAMES = {
  AAPL:"Apple Inc.",         MSFT:"Microsoft Corporation", GOOGL:"Alphabet Inc.",
  AMZN:"Amazon.com Inc.",    META:"Meta Platforms Inc.",   NVDA:"NVIDIA Corporation",
  TSLA:"Tesla Inc.",         NFLX:"Netflix Inc.",          AMD:"Advanced Micro Devices",
  INTC:"Intel Corporation",  CRM:"Salesforce Inc.",        ADBE:"Adobe Inc.",
  JPM:"JPMorgan Chase",      BAC:"Bank of America",        GS:"Goldman Sachs",
  XOM:"Exxon Mobil",         CVX:"Chevron Corporation",    LLY:"Eli Lilly",
  UNH:"UnitedHealth Group",  MRK:"Merck and Co.",          UBER:"Uber Technologies",
  SPOT:"Spotify Technology", NKE:"NIKE Inc.",              AVGO:"Broadcom Inc.",
  QCOM:"Qualcomm",           TXN:"Texas Instruments",      MU:"Micron Technology",
};

const qCache  = {};
const ovCache = {};

// Proxy runs on same domain (stock.colaboree.com/proxy) - no CORS issues
async function yfetch(url) {
  var r    = await fetch("/proxy?url=" + encodeURIComponent(url));
  var text = await r.text();
  return JSON.parse(text);
}

async function getQuote(sym) {
  if (qCache[sym]) return qCache[sym];
  var d    = await yfetch("https://query1.finance.yahoo.com/v8/finance/chart/" + sym + "?interval=1d&range=1d");
  var meta = d && d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta;
  if (!meta) return null;
  var price  = meta.regularMarketPrice || 0;
  var prev   = meta.chartPreviousClose || meta.previousClose || price;
  var change = parseFloat((price - prev).toFixed(2));
  var pct    = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;
  var out = {
    price, change, pct,
    open: String(meta.regularMarketOpen    || "-"),
    high: String(meta.regularMarketDayHigh || "-"),
    low:  String(meta.regularMarketDayLow  || "-"),
    vol:  meta.regularMarketVolume ? meta.regularMarketVolume.toLocaleString() : "-",
  };
  qCache[sym] = out;
  return out;
}

async function getOverview(sym) {
  if (ovCache[sym]) return ovCache[sym];
  var d   = await yfetch(
    "https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + sym +
    "?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile,earningsTrend,recommendationTrend,upgradeDowngradeHistory,balanceSheetHistory,earningsHistory,calendarEvents,majorHoldersBreakdown,institutionOwnership,insiderTransactions,secFilings"
  );
  var res = d && d.quoteSummary && d.quoteSummary.result && d.quoteSummary.result[0];
  if (!res) return null;
  var sd = res.summaryDetail        || {};
  var ks = res.defaultKeyStatistics || {};
  var fd = res.financialData        || {};
  var ap = res.assetProfile         || {};
  var mc = (sd.marketCap && sd.marketCap.raw) || 0;
  var mcStr = mc >= 1e12 ? "$" + (mc/1e12).toFixed(2) + "T"
            : mc >= 1e9  ? "$" + (mc/1e9).toFixed(1)  + "B"
            : mc >= 1e6  ? "$" + (mc/1e6).toFixed(0)  + "M" : "-";
  // Long-term EPS growth from earningsTrend (+5yr analyst estimate)
  var ltG = (function() {
    var et = res.earningsTrend;
    if (et && et.trend) {
      for (var i = 0; i < et.trend.length; i++) {
        if (et.trend[i].period === "+5y" && et.trend[i].growth && et.trend[i].growth.raw) {
          return et.trend[i].growth.raw * 100;
        }
      }
    }
    return ((fd.revenueGrowth && fd.revenueGrowth.raw) || 0) * 100;
  })();
  // Free Cash Flow formatting
  var fcfRaw = (fd.freeCashflow && fd.freeCashflow.raw) || 0;
  var fcfStr = fcfRaw >= 1e12 ? "$" + (fcfRaw/1e12).toFixed(2) + "T"
             : fcfRaw >= 1e9  ? "$" + (fcfRaw/1e9).toFixed(1)  + "B"
             : fcfRaw >= 1e6  ? "$" + (fcfRaw/1e6).toFixed(0)  + "M"
             : fcfRaw < 0     ? "-$" + Math.abs(fcfRaw/1e6).toFixed(0) + "M" : "-";
  var out = {
    exchange:     ap.exchange || sd.exchange || "NASDAQ",
    marketCap:    mcStr,
    // Valuation
    pe:           (sd.trailingPE && sd.trailingPE.raw)   || 0,
    fpe:          (sd.forwardPE  && sd.forwardPE.raw)    || 0,
    peg:          (ks.pegRatio   && ks.pegRatio.raw)     || 0,
    ps:           (ks.priceToSalesTrailing12Months && ks.priceToSalesTrailing12Months.raw) || 0,
    evEbitda:     (ks.enterpriseToEbitda && ks.enterpriseToEbitda.raw) || 0,
    pFcf:         (ks.priceToFreeCashflows && ks.priceToFreeCashflows.raw) || 0,
    epsG:         ((fd.earningsGrowth && fd.earningsGrowth.raw) || 0) * 100,
    ltG,
    divY:         ((sd.dividendYield  && sd.dividendYield.raw)  || 0) * 100,
    // Financial Health
    grossMargin:  ((fd.grossMargins    && fd.grossMargins.raw)    || 0) * 100,
    netMargin:    ((fd.profitMargins   && fd.profitMargins.raw)   || 0) * 100,
    opMargin:     ((fd.operatingMargins && fd.operatingMargins.raw) || 0) * 100,
    roe:          ((fd.returnOnEquity && fd.returnOnEquity.raw) || 0) * 100,
    roic:         ((fd.returnOnAssets && fd.returnOnAssets.raw) || 0) * 100,
    de:           ((fd.debtToEquity && fd.debtToEquity.raw) || 0) / 100,
    currentRatio: (fd.currentRatio && fd.currentRatio.raw) || 0,
    fcf:          fcfStr,
    // Financial Health extras
    netIncome:    (function() {
      var n = (fd.netIncomeToCommon && fd.netIncomeToCommon.raw) || 0;
      return n >= 1e12 ? "$" + (n/1e12).toFixed(2) + "T"
           : n >= 1e9  ? "$" + (n/1e9).toFixed(1)  + "B"
           : n >= 1e6  ? "$" + (n/1e6).toFixed(0)  + "M"
           : n < 0     ? "-$" + Math.abs(n/1e9).toFixed(1) + "B" : "-";
    })(),
    quickRatio:   (fd.quickRatio && fd.quickRatio.raw) || 0,
    revenue:      (function() {
      var r = (fd.totalRevenue && fd.totalRevenue.raw) || 0;
      return r >= 1e12 ? "$" + (r/1e12).toFixed(2) + "T"
           : r >= 1e9  ? "$" + (r/1e9).toFixed(1)  + "B"
           : r >= 1e6  ? "$" + (r/1e6).toFixed(0)  + "M" : "-";
    })(),
    revGrowth:    ((fd.revenueGrowth && fd.revenueGrowth.raw) || 0) * 100,
    // Growth & Profile
    beta:         (sd.beta && sd.beta.raw) || 0,
    pb:           (ks.priceToBook && ks.priceToBook.raw) || 0,
    // For DCF calcs
    hi52:             (sd.fiftyTwoWeekHigh && sd.fiftyTwoWeekHigh.raw) || 0,
    lo52:             (sd.fiftyTwoWeekLow  && sd.fiftyTwoWeekLow.raw)  || 0,
    sharesOut:        (ks.sharesOutstanding && ks.sharesOutstanding.raw) || 0,
    fcfRaw:           (fd.freeCashflow && fd.freeCashflow.raw) || 0,
    niRaw:            (fd.netIncomeToCommon && fd.netIncomeToCommon.raw) || 0,
    // Business profile from Yahoo assetProfile
    bizSummary:       ap.longBusinessSummary || "",
    industry:         ap.industry || "",
    sector:           ap.sector || "",
    country:          ap.country || "",
    employees:        ap.fullTimeEmployees || 0,
    website:          ap.website || "",
  };
  // ---- Additional data modules ----
  var rt  = res.recommendationTrend || {};
  var udh = res.upgradeDowngradeHistory || {};
  var bsh = res.balanceSheetHistory || {};
  var eh  = res.earningsHistory || {};
  var ce  = res.calendarEvents || {};

  // Recommendation trend (most recent period)
  var rtTrend = (rt.trend && rt.trend[0]) || {};
  out.recBuy        = rtTrend.strongBuy  ? (rtTrend.strongBuy  + (rtTrend.buy  || 0)) : 0;
  out.recHold       = rtTrend.hold       || 0;
  out.recSell       = rtTrend.strongSell ? (rtTrend.strongSell + (rtTrend.sell || 0)) : 0;
  out.recPeriod     = rtTrend.period     || "";

  // Upgrades/downgrades (last 5)
  var udhList = (udh.history || []).slice(0, 5);
  out.upgrades = udhList.map(function(u) {
    return { firm: u.firm, action: u.action, from: u.fromGrade, to: u.toGrade, date: u.epochGradeDate ? new Date(u.epochGradeDate * 1000).toISOString().slice(0,10) : "" };
  });

  // Balance sheet (most recent annual)
  var bs0 = (bsh.balanceSheetStatements && bsh.balanceSheetStatements[0]) || {};
  out.cash         = bs0.cash                    ? bs0.cash.raw                    : null;
  out.totalDebt    = bs0.longTermDebt            ? bs0.longTermDebt.raw            : null;
  out.totalAssets  = bs0.totalAssets             ? bs0.totalAssets.raw             : null;
  out.bookValue    = bs0.totalStockholderEquity  ? bs0.totalStockholderEquity.raw  : null;
  out.bsDate       = bs0.endDate                 ? bs0.endDate.fmt                 : "";

  // Earnings history (last 4 quarters)
  var ehList = (eh.history || []).slice().reverse().slice(0,4);
  out.earningsQ = ehList.map(function(e) {
    return {
      date:     e.quarter         ? e.quarter.fmt         : "",
      actual:   e.epsActual       ? e.epsActual.raw       : null,
      estimate: e.epsEstimate     ? e.epsEstimate.raw     : null,
      surprise: e.epsDifference   ? e.epsDifference.raw  : null,
      surprisePct: e.surprisePercent ? e.surprisePercent.raw : null,
    };
  });

  // Next earnings date
  var earnings = ce.earnings || {};
  var earningsDate = earnings.earningsDate && earnings.earningsDate[0] ? earnings.earningsDate[0].fmt : null;
  out.nextEarnings = earningsDate;

  // ---- Analyst targets & short interest from defaultKeyStatistics ----
  out.targetHigh   = (ks.targetHighPrice  && ks.targetHighPrice.raw)  || 0;
  out.targetLow    = (ks.targetLowPrice   && ks.targetLowPrice.raw)   || 0;
  out.targetMean   = (ks.targetMeanPrice  && ks.targetMeanPrice.raw)  || 0;
  out.targetMedian = (ks.targetMedianPrice && ks.targetMedianPrice.raw) || 0;
  out.numAnalysts  = (ks.numberOfAnalystOpinions && ks.numberOfAnalystOpinions.raw) || 0;
  out.recKey       = (ks.recommendationKey) || "";
  out.shortRatio   = (ks.shortRatio        && ks.shortRatio.raw)       || 0;
  out.shortPct     = (ks.shortPercentOfFloat && ks.shortPercentOfFloat.raw) || 0;
  out.payoutRatio  = (ks.payoutRatio       && ks.payoutRatio.raw)      || 0;
  out.bookValuePS  = (ks.bookValue         && ks.bookValue.raw)        || 0;
  out.lastFYEnd    = (ks.lastFiscalYearEnd && ks.lastFiscalYearEnd.fmt) || "";
  out.nextFYEnd    = (ks.nextFiscalYearEnd && ks.nextFiscalYearEnd.fmt) || "";
  out.mostRecentQ  = (ks.mostRecentQuarter && ks.mostRecentQuarter.fmt) || "";

  // ---- Major holders ----
  var mh = res.majorHoldersBreakdown || {};
  out.insiderPct       = (mh.insidersPercentHeld     && mh.insidersPercentHeld.raw)     || 0;
  out.institutionPct   = (mh.institutionsPercentHeld && mh.institutionsPercentHeld.raw) || 0;
  out.floatPct         = (mh.institutionsFloatPercentHeld && mh.institutionsFloatPercentHeld.raw) || 0;

  // ---- Top institutional holders ----
  var io = res.institutionOwnership || {};
  out.topHolders = ((io.ownershipList) || []).slice(0, 5).map(function(h) {
    return {
      name:  h.organization || "",
      pct:   h.pctHeld      ? (h.pctHeld.raw * 100).toFixed(2) + "%" : "-",
      shares: h.position    ? h.position.raw.toLocaleString() : "-",
      value:  h.value       ? "$" + (h.value.raw / 1e9).toFixed(2) + "B" : "-",
      date:   h.reportDate  ? h.reportDate.fmt : "",
    };
  });

  // ---- Insider transactions (last 5) ----
  var it = res.insiderTransactions || {};
  out.insiderTx = ((it.transactions) || []).slice(0, 5).map(function(t) {
    return {
      name:   t.filerName     || "",
      title:  t.filerRelation || "",
      action: t.transactionText || "",
      shares: t.shares        ? t.shares.raw : null,
      value:  t.value         ? t.value.raw  : null,
      date:   t.startDate     ? t.startDate.fmt : "",
    };
  });

  // ---- SEC Filings (last 5) ----
  var sf = res.secFilings || {};
  out.secFilings = ((sf.filings) || []).slice(0, 5).map(function(f) {
    return {
      date:  f.date  || "",
      type:  f.type  || "",
      title: f.title || "",
      url:   f.edgarUrl || "",
    };
  });

  ovCache[sym] = out;
  return out;
}

function fmt2(n) { return n != null ? n.toFixed(2) : "-"; }
function fpct(n) { return n ? n.toFixed(2) + "%" : "-"; }

// -- Valuation bar ------------------------------------------------------------
function VBar({ label, value, maxV, color, bold }) {
  if (!value || !maxV) return null;
  const w = Math.min(value / maxV * 100, 100);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
      <div style={{ width:200, fontSize:11, color:bold?"#222":"#888", textAlign:"right", lineHeight:1.3, whiteSpace:"pre-line", flexShrink:0 }}>
        {label}
      </div>
      <div style={{ flex:1, height:17, background:"#e8e4dc", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:w + "%", height:"100%", background:color }} />
      </div>
      <span style={{ width:58, textAlign:"right", fontSize:11, fontWeight:700, color:bold?"#1a6a2a":"#333" }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

// -- Detail page --------------------------------------------------------------
function Detail({ sym, name, onBack }) {
  const [q,        setQ]        = useState(null);
  const [ov,       setOv]       = useState(null);
  const [epsHistory, setEpsHistory] = useState(null);
  const [epsError,   setEpsError]   = useState(false);
  const [msg, setMsg] = useState("Loading...");
  const [insightTab,    setInsightTab]    = useState("business");
  const [insightCache,  setInsightCache]  = useState({});
  const [insightLoading,setInsightLoading]= useState(false);
  const [parsedInsights,setParsedInsights]= useState({});
  const [addlInfo,      setAddlInfo]      = useState(null);
  const [addlLoading,   setAddlLoading]   = useState(false);
  const [massiveInfo,   setMassiveInfo]   = useState(null);
  const [debugLog,      setDebugLog]      = useState([]);

  function parseAndStoreInsight(tabId, text) {
    if (!text) return;
    var result = {};
    if (tabId === "moat") {
      var m = text.match(/Economic Moat Rating[^0-9]*([0-9])/);
      var score = m ? parseInt(m[1], 10) : 0;
      if (!score) {
        if (text.indexOf("Wide") !== -1) score = 4;
        else if (text.indexOf("Narrow") !== -1) score = 3;
        else score = 1;
      }
      var expIdx = text.indexOf("Explanation");
      var explanation = expIdx !== -1 ? text.substring(expIdx).replace(/^Explanation[^:]*:\s*/, "").split("\n")[0].trim() : "";
      result = {
        score: score,
        classification: score >= 4 ? "Wide" : score >= 3 ? "Narrow" : "None",
        explanation: explanation,
      };
    } else if (tabId === "financial") {
      var mc = text.match(/Financial Strength Classification[^:]*:\s*(.+)/);
      var cls = mc ? mc[1].trim().split(/[\s,]/)[0] : null;
      if (!cls) {
        if (text.indexOf("Strong") !== -1) cls = "Strong";
        else if (text.indexOf("Moderate") !== -1) cls = "Moderate";
        else cls = "Weak";
      }
      var score2 = cls && cls.toLowerCase().includes("strong") ? 4 : cls && cls.toLowerCase().includes("moderate") ? 3 : 2;
      var rsn = null; var _clsIdx = text.indexOf("Financial Strength Classification"); if (_clsIdx !== -1) { var _lines = text.substring(_clsIdx).split("\n").filter(function(l){ return l.trim().length > 0; }); rsn = _lines.length > 1 ? [null, _lines[1]] : null; }
      result = {
        classification: cls,
        score: score2,
        reasoning: rsn ? rsn[1].trim() : "",
      };
    } else if (tabId === "technical") {
      var tr = text.match(/Technical Rating[^:]*:\s*(.+)/);
      var et = text.match(/Entry Timing[^:]*:\s*(.+)/);
      var rating = tr ? tr[1].trim() : null;
      if (!rating) {
        if (text.indexOf("Strong Bullish") !== -1) rating = "Strong Bullish";
        else if (text.indexOf("Bullish") !== -1) rating = "Bullish";
        else if (text.indexOf("Strong Bearish") !== -1) rating = "Strong Bearish";
        else if (text.indexOf("Bearish") !== -1) rating = "Bearish";
        else rating = "Neutral";
      }
      var tscore = rating.toLowerCase().includes("strong bullish") ? 5 : rating.toLowerCase().includes("bullish") ? 4 : rating.toLowerCase().includes("neutral") ? 3 : rating.toLowerCase().includes("strong bearish") ? 1 : 2;
      result = {
        rating: rating,
        score: tscore,
        entry: et ? et[1].trim() : null,
      };
    }
    setParsedInsights(function(prev) {
      var next = Object.assign({}, prev);
      next[tabId] = result;
      return next;
    });
  }

  useEffect(function() {
    setQ(null); setOv(null); setEpsHistory(null); setEpsError(false); setInsightCache({}); setInsightLoading(false); setInsightTab("business"); setParsedInsights({}); setAddlInfo(null); setAddlLoading(false); setMassiveInfo(null); setDebugLog([]); setMsg("Fetching live data for " + sym + "..."); delete ovCache[sym]; delete qCache[sym];

    getQuote(sym).then(function(res) {
      if (res) { setQ(res); setMsg(""); }
      else setMsg("Could not load quote for " + sym + ". Yahoo Finance may be unavailable.");
    }).catch(function() {
      setMsg("Network error loading quote for " + sym + ".");
    });

    getOverview(sym).then(function(res) {
      if (res) {
        setOv(res);
        setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Yahoo quoteSummary OK", data: { modules: "summaryDetail,financialData,assetProfile,earningsTrend,recommendationTrend,upgradeDowngradeHistory,balanceSheetHistory,earningsHistory,calendarEvents", recBuy: res.recBuy, recHold: res.recHold, recSell: res.recSell, earningsQ: (res.earningsQ || []).length, nextEarnings: res.nextEarnings } }]); });
      } else {
        setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Yahoo quoteSummary returned null" }]); });
      }
    }).catch(function(e) {
      setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Yahoo quoteSummary error", data: { error: String(e) } }]); });
    });

    // Auto-generate all 4 AI insight tabs in parallel
    var aiTabs = ["moat", "financial", "technical"];
    aiTabs.forEach(function(tabId) {
      var prompts = {
        moat: "You are a professional equity research analyst. Analyze the economic moat of " + sym + " (" + (NAMES[sym]||sym) + ") using only well-known business fundamentals and observable financial indicators. Do not fabricate statistics or unsupported claims. Most companies do not have strong moats - scores of 4 or 5 should be rare.\n\nReturn results in EXACTLY this format:\n\nNetwork Effects: X/5\nAssessment Criteria: The product or platform becomes more valuable as more users join.\nResult: One sentence explaining the score.\n\nSwitching Costs: X/5\nAssessment Criteria: Customers face difficulty, cost, or disruption when changing to competitors.\nResult: One sentence explaining the score.\n\nCost Advantage: X/5\nAssessment Criteria: The company can operate at lower cost or higher efficiency than competitors.\nResult: One sentence explaining the score.\n\nIntangible Assets: X/5\nAssessment Criteria: Brand, patents, intellectual property, regulatory licenses, or proprietary technology.\nResult: One sentence explaining the score.\n\nEfficient Scale: X/5\nAssessment Criteria: The market only supports a few profitable players due to high barriers to entry.\nResult: One sentence explaining the score.\n\nEcosystem Lock-in: X/5\nAssessment Criteria: Customers rely on multiple integrated products or services within the company ecosystem.\nResult: One sentence explaining the score.\n\nEconomic Moat Rating: X / 5\n\nExplanation (maximum 100 words): Summarize the main competitive advantages. Focus only on the most important moat drivers. Only assign 4-5 if advantages are clear, durable, and supported by financial performance.",
        financial: "You are a professional equity research analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), assess Financial Strength across these 7 dimensions in concise paragraphs: 1. Revenue Growth Trend 2. Gross Margin Stability 3. Operating Margin Trend 4. Free Cash Flow Consistency 5. Debt Level 6. Share Dilution or Buyback Discipline 7. Earnings Predictability. End with: Financial Strength Classification: Strong / Moderate / Weak and one sentence of reasoning.",
        technical: "You are a professional technical analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), provide a technical analysis covering: Trend (50-day MA, 200-day MA, direction), Momentum (RSI condition, MACD condition), Support and Resistance zones, Volume analysis (confirms move? accumulation or distribution?), Chart Patterns (breakout / consolidation / reversal / double bottom / head and shoulders / flag/pennant / no clear pattern). End with: Technical Rating: Strong Bullish / Bullish / Neutral / Bearish / Strong Bearish and Entry Timing View: Good Entry / Wait for Pullback / Breakout Watch / Avoid for Now. Be specific with price levels where possible."
      };
      fetch("/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 900,
          messages: [{ role: "user", content: prompts[tabId] }]
        })
      }).then(function(r) { return r.json(); })
        .then(function(data) {
          var text = data && data.content && data.content[0] && data.content[0].text;
          setInsightCache(function(prev) {
            var next = Object.assign({}, prev);
            next[tabId] = text || "Analysis unavailable.";
            parseAndStoreInsight(tabId, next[tabId]);
            return next;
          });
        }).catch(function() {
          setInsightCache(function(prev) {
            var next = Object.assign({}, prev);
            next[tabId] = "Analysis unavailable. Please try again.";
            return next;
          });
        });
    });

    // Fetch 10-year historical financials via Claude Haiku (GAAP figures)
    (function() {
      var currentYear = new Date().getFullYear();
      var years = [];
      for (var y = currentYear - 1; y >= currentYear - 10; y--) years.push(y);
      fetch("/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1000,
          messages: [{ role: "user", content: 'Return ONLY a valid JSON array, no markdown. For ' + sym + ' (' + (NAMES[sym]||sym) + '), provide annual financial data for fiscal years ' + years.join(', ') + '. Each item: {year:number, eps:number (GAAP diluted EPS from 10-K NOT non-GAAP), revenue:string (e.g. "$21B"), netIncome:string, fcf:string (free cash flow), debt:string (long-term debt)}. Use null for unknown eps. Use actual reported GAAP figures.' }]
        })
      }).then(function(r) { return r.json(); })
        .then(function(d) {
          var text = d && d.content && d.content[0] && d.content[0].text;
          if (!text) { setEpsError(true); return; }
          text = text.replace(/```json|```/g, "").trim();
          try {
            var rows = JSON.parse(text);
            if (rows && rows.length > 0) {
              rows.sort(function(a, b) { return b.year - a.year; });
              setEpsHistory(rows.slice(0, 10));
            } else { setEpsError(true); }
          } catch(e) { setEpsError(true); }
        }).catch(function() { setEpsError(true); });
    })()

    // Fetch Massive.com data (news + ticker reference + dividends + splits)
    setAddlLoading(true);
    var debugEntries = [];
    debugEntries.push({ time: new Date().toISOString(), label: "Fetching /massive?sym=" + sym });
    fetch("/massive?sym=" + sym)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        debugEntries.push({ time: new Date().toISOString(), label: "Massive response received", data: { newsCount: data && data.news ? data.news.length : 0, tickerName: data && data.ticker ? data.ticker.name : null, debug: data && data._debug } });
        // Set massiveInfo if we got any useful data back
        if (data && (data.news || data.ticker || data.dividends)) {
          setMassiveInfo(data);
        } else {
          debugEntries.push({ time: new Date().toISOString(), label: "Massive data empty or error", data: data });
        }
        setDebugLog(function(prev) { return prev.concat(debugEntries); });
        setAddlLoading(false);
      }).catch(function(e) {
        debugEntries.push({ time: new Date().toISOString(), label: "Massive fetch failed", data: { error: e.message } });
        setDebugLog(function(prev) { return prev.concat(debugEntries); });
        setAddlLoading(false);
      });

  }, [sym]);

  // -- Insight tab fetch -------------------------------------------------------
  function fetchInsight(tabId) {
    if (insightCache[tabId] || insightLoading) return;
    setInsightLoading(true);

    var prompts = {
      business: "You are a professional equity research analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), write a concise Business Overview covering: what the company does, how it makes money, key products or services, major competitors, and overall industry position. Be analytical and factual. Use plain text paragraphs, no markdown headers.",

      moat: "You are a professional equity research analyst. Analyze the economic moat of " + sym + " (" + (NAMES[sym]||sym) + ") using only well-known business fundamentals and observable financial indicators. Do not fabricate statistics or unsupported claims. Most companies do not have strong moats - scores of 4 or 5 should be rare.\n\nReturn results in EXACTLY this format:\n\nNetwork Effects: X/5\nAssessment Criteria: The product or platform becomes more valuable as more users join.\nResult: One sentence explaining the score.\n\nSwitching Costs: X/5\nAssessment Criteria: Customers face difficulty, cost, or disruption when changing to competitors.\nResult: One sentence explaining the score.\n\nCost Advantage: X/5\nAssessment Criteria: The company can operate at lower cost or higher efficiency than competitors.\nResult: One sentence explaining the score.\n\nIntangible Assets: X/5\nAssessment Criteria: Brand, patents, intellectual property, regulatory licenses, or proprietary technology.\nResult: One sentence explaining the score.\n\nEfficient Scale: X/5\nAssessment Criteria: The market only supports a few profitable players due to high barriers to entry.\nResult: One sentence explaining the score.\n\nEcosystem Lock-in: X/5\nAssessment Criteria: Customers rely on multiple integrated products or services within the company ecosystem.\nResult: One sentence explaining the score.\n\nEconomic Moat Rating: X / 5\n\nExplanation (maximum 100 words): Summarize the main competitive advantages. Focus only on the most important moat drivers. Only assign 4-5 if advantages are clear, durable, and supported by financial performance.",

      financial: "You are a professional equity research analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), assess Financial Strength across these 7 dimensions in concise paragraphs: 1. Revenue Growth Trend 2. Gross Margin Stability 3. Operating Margin Trend 4. Free Cash Flow Consistency 5. Debt Level 6. Share Dilution or Buyback Discipline 7. Earnings Predictability. End with: Financial Strength Classification: Strong / Moderate / Weak and one sentence of reasoning.",

      technical: "You are a professional technical analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), provide a technical analysis covering: Trend (50-day MA, 200-day MA, direction), Momentum (RSI condition, MACD condition), Support and Resistance zones, Volume analysis (confirms move? accumulation or distribution?), Chart Patterns (breakout / consolidation / reversal / double bottom / head and shoulders / flag/pennant / no clear pattern). End with: Technical Rating: Strong Bullish / Bullish / Neutral / Bearish / Strong Bearish and Entry Timing View: Good Entry / Wait for Pullback / Breakout Watch / Avoid for Now. Be specific with price levels where possible."
    };

    fetch("/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        messages: [{ role: "user", content: prompts[tabId] }]
      })
    }).then(function(r) { return r.json(); })
      .then(function(data) {
        var text = data && data.content && data.content[0] && data.content[0].text;
        setInsightCache(function(prev) {
          var next = {};
          Object.keys(prev).forEach(function(k) { next[k] = prev[k]; });
          next[tabId] = text || "Analysis unavailable.";
          return next;
        });
        setInsightLoading(false);
      }).catch(function() {
        setInsightCache(function(prev) {
          var next = {};
          Object.keys(prev).forEach(function(k) { next[k] = prev[k]; });
          next[tabId] = "Analysis unavailable. Please try again.";
          return next;
        });
        setInsightLoading(false);
      });
  }

    const price = q ? q.price : 0;
  const up    = q ? q.pct >= 0 : true;
  const sign  = up ? "+" : "";
  const chg   = q ? sign + q.change.toFixed(2) + " (" + sign + q.pct.toFixed(2) + "%)" : "-";

  const pe  = ov ? ov.pe  : 0;
  const fpe = ov ? ov.fpe : 0;
  const eps = (pe > 0 && price > 0) ? price / pe : 0;
  const gr  = Math.max(ov ? (ov.epsG || 5) : 5, 2) / 100;

  const moat   = !ov ? "-" : (pe > 0 && pe < 15) ? "Wide" : (pe > 0 && pe < 25) ? "Narrow" : "None";
  const moatBg = moat === "Wide" ? "#1a6a1a" : moat === "Narrow" ? "#b88000" : "#ccc";
  const moatFg = (moat === "Wide" || moat === "Narrow") ? "#fff" : "#555";

  function calcDCF(eps0, growthRate, terminalRate, wacc, years) {
    var total = 0, fcf = eps0;
    for (var y = 1; y <= years; y++) {
      fcf = fcf * (1 + (y <= 10 ? growthRate : terminalRate));
      total += fcf / Math.pow(1 + wacc, y);
    }
    return total;
  }

  // --- Improved base values ---
  // 1) Previous year EPS from historical data (most accurate base)
  var baseEps = eps; // fallback to TTM EPS derived from PE
  if (epsHistory && epsHistory.length > 0) {
    var prevYearRow = epsHistory[0]; // already sorted newest first
    if (prevYearRow && prevYearRow.eps && prevYearRow.eps > 0) {
      baseEps = prevYearRow.eps;
    }
  }

  // 2) Historical 5-year average EPS growth rate
  var histGrowthRate = gr; // fallback
  if (epsHistory && epsHistory.length >= 2) {
    var sorted = epsHistory.slice().sort(function(a, b) { return b.year - a.year; });
    var recent = sorted.slice(0, 5); // up to 5 most recent years
    var growthRates = [];
    for (var i = 0; i < recent.length - 1; i++) {
      var curr = recent[i].eps, prev = recent[i + 1].eps;
      if (prev > 0 && curr > 0) growthRates.push((curr - prev) / prev);
    }
    if (growthRates.length > 0) {
      var avgG = growthRates.reduce(function(s, v) { return s + v; }, 0) / growthRates.length;
      histGrowthRate = Math.max(Math.min(avgG, 0.40), 0.02); // cap 2%-40%
    }
  }

  // 3) Beta-adjusted WACC: risk-free 4.5% + beta x 5.5%
  var beta = ov ? (ov.beta || 1.0) : 1.0;
  var WACC_ADJ = Math.min(Math.max(0.045 + beta * 0.055, 0.06), 0.18); // clamp 6%-18%

  // 4) Real FCF per share = freeCashflow / sharesOutstanding
  var fcfPerShare = 0;
  if (ov && ov.fcfRaw && ov.sharesOut > 0) {
    fcfPerShare = ov.fcfRaw / ov.sharesOut;
  } else if (baseEps > 0) {
    fcfPerShare = baseEps * 0.85; // fallback
  }

  // 5) Real Net Income per share = netIncomeToCommon / sharesOutstanding
  var niPerShare = 0;
  if (ov && ov.niRaw && ov.sharesOut > 0) {
    niPerShare = ov.niRaw / ov.sharesOut;
  } else if (baseEps > 0) {
    niPerShare = baseEps * 0.90; // fallback
  }

  // Initial oracle estimate (overridden below once vals are built)
  var oracle = (baseEps > 0 && pe > 0)
    ? calcDCF(baseEps, histGrowthRate, 0.04, WACC_ADJ, 10).toFixed(2)
    : (price > 0 ? price.toFixed(2) : "-");

  // Build valuation rows
  const vals = [];
  if (ov && baseEps > 0 && price > 0) {
    const termGrowth = 0.04;
    const grCapped   = Math.min(histGrowthRate, 0.25);
    const maxVal     = price * 3;
    const cap        = function(v) { return Math.min(v, maxVal); };

    const dcf20  = cap(calcDCF(baseEps,   grCapped, termGrowth, WACC_ADJ, 20));
    const dcff20 = fcfPerShare > 0 ? cap(calcDCF(fcfPerShare, grCapped, termGrowth, WACC_ADJ, 20)) : 0;
    const dni20  = niPerShare  > 0 ? cap(calcDCF(niPerShare,  grCapped, termGrowth, WACC_ADJ, 20)) : 0;
    const dcffT  = fcfPerShare > 0 ? cap(
      calcDCF(fcfPerShare, grCapped, termGrowth, WACC_ADJ, 20) -
      calcDCF(fcfPerShare, grCapped, termGrowth, WACC_ADJ, 10)
    ) : 0;
    const peVal   = cap(fpe > 0 ? baseEps * fpe : baseEps * pe);
    const pb      = ov.hi52 > 0 ? (ov.hi52 + ov.lo52) / 2 : 0;
    const ps      = cap(peVal * Math.min(ov.roic > 0 ? ov.roic / 100 + 0.85 : 0.90, 1.0));
    const ltgRate = ov.ltG > 0 ? ov.ltG : grCapped * 100;
    const psg     = ltgRate > 0 ? Math.min(price / ltgRate, maxVal) : 0;
    const pegVal  = ov.peg > 0 ? Math.min(baseEps * 15, maxVal) : 0;

    vals.push({ label:"Discounted Cash Flow 20-year\n(DCF-20)",         value:dcf20,  color:"#d4a800" });
    if (dcff20 > 0) vals.push({ label:"Discounted Free Cash Flow 20-year\n(DCFF-20)",   value:dcff20, color:"#d4a800" });
    if (dni20  > 0) vals.push({ label:"Discounted Net Income 20-year\n(DNI-20)",        value:dni20,  color:"#d4a800" });
    if (dcffT  > 0) vals.push({ label:"DCF Free Cash Flow Terminal\n(DCFF-Terminal)",   value:dcffT,  color:"#d4a800" });
    vals.push({ label:"Mean Price to Sales\n(PS) Ratio",                value:ps,     color:"#d4a800" });
    vals.push({ label:"Mean Price to Earnings\n(PE) Ratio Without NRI", value:peVal,  color:"#d4a800" });
    if (pb > 0)     vals.push({ label:"Mean Price to Book\n(PB) Ratio",                        value:pb,     color:"#d4a800" });
    if (psg > 0)    vals.push({ label:"Price to Sales Growth\n(PSG) Ratio",                    value:psg,    color:"#c03030" });
    if (pegVal > 0) vals.push({ label:"Price to Earnings Growth\n(PEG) Ratio Without NRI",     value:pegVal, color:"#c03030" });

    const oracleAvg = vals.reduce(function(sum, v) { return sum + v.value; }, 0) / vals.length;
    oracle = oracleAvg.toFixed(2);
    vals.push({ label:"IntrinsicValue(TM)", value:oracleAvg, color:"#1a8a3a", bold:true });
  }

  const maxV = vals.length
    ? Math.max.apply(null, vals.map(function(v) { return v.value; })) * 1.08
    : price * 1.5 || 100;

  const valRows = ov ? [
    ["P/E Ratio (TTM)",         pe>0?fmt2(pe):"-",            "Price / Sales (TTM)",      ov.ps>0?fmt2(ov.ps):"-"],
    ["Forward P/E (Next Year)", fpe>0?fmt2(fpe):"-",          "EV / EBITDA",              ov.evEbitda>0?fmt2(ov.evEbitda):"-"],
    ["PEG Ratio",               ov.peg>0?fmt2(ov.peg):"-",   "Price / Free Cash Flow",   ov.pFcf>0?fmt2(ov.pFcf):"-"],
    ["Price / Book (P/B)",      ov.pb>0?fmt2(ov.pb):"-",     "Dividend Yield (TTM)",     ov.divY>0?fpct(ov.divY):"-"],
  ] : [];

  const healthRows = ov ? [
    ["Gross Margin",        ov.grossMargin?fpct(ov.grossMargin):"-", "Return on Equity",    ov.roe>0?fpct(ov.roe):"-"],
    ["Operating Margin",    ov.opMargin?fpct(ov.opMargin):"-",      "Current Ratio",       ov.currentRatio>0?fmt2(ov.currentRatio):"-"],
    ["Net Profit Margin",   ov.netMargin?fpct(ov.netMargin):"-",     "Quick Ratio",         ov.quickRatio>0?fmt2(ov.quickRatio):"-"],
    ["Free Cash Flow",      ov.fcf||"-",                              "Total Debt / Equity", ov.de>0?fmt2(ov.de):"-"],
    ["Net Income (TTM)",    ov.netIncome||"-",                        "Revenue Growth YoY",  ov.revGrowth?fpct(ov.revGrowth):"-"],
    ["Revenue (TTM)",       ov.revenue||"-",                          "",                    ""],
  ] : [];

  const growthRows = ov ? [
    ["EPS Growth (TTM)",          ov.epsG?fpct(ov.epsG):"-",   "Revenue Growth YoY",      ov.revGrowth?fpct(ov.revGrowth):"-"],
    ["LT EPS Growth (5yr Est.)",  ov.ltG?fpct(ov.ltG):"-",     "Beta",                    ov.beta>0?fmt2(ov.beta):"-"],
    ["Market Capitalization",     ov.marketCap||"-",            "Dividend Yield (TTM)",    ov.divY>0?fpct(ov.divY):"-"],
  ] : [];

  return (
    <div style={{ minHeight:"100vh", background:"#f5f2ec", fontFamily:FONT }}>

      {/* Nav */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e0dbd0", padding:"8px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onBack} style={{ border:"1px solid #ccc", borderRadius:6, padding:"5px 12px", background:"#f5f2ec", cursor:"pointer", fontSize:12, fontFamily:FONT }}>
            Back
          </button>
          <span style={{ fontWeight:800, fontSize:15 }}>
            Colabo<span style={{ color:"#ff5c3a" }}>ree</span>{" "}
            <span style={{ color:"#7abd00" }}>StockInsight</span>
          </span>
          <span style={{ color:"#aaa", fontSize:12 }}>/ {sym}</span>
        </div>
        <span style={{ fontSize:10, background:"#111", color:LIME, padding:"3px 12px", borderRadius:20, fontWeight:700, letterSpacing:"0.06em" }}>
          LIVE . YAHOO FINANCE
        </span>
      </div>

      {msg && (
        <div style={{
          background: msg.startsWith("Error") ? "#fff0f0" : "#f0f7ff",
          border: "1px solid " + (msg.startsWith("Error") ? "#ffaaaa" : "#aaccff"),
          margin:"10px 20px", padding:"9px 14px", borderRadius:8, fontSize:13,
          color: msg.startsWith("Error") ? "#990000" : "#003388",
        }}>
          {msg}
        </div>
      )}

      {/* Body grid */}
      <div style={{ display:"grid", gridTemplateColumns:"400px 1fr" }}>

        {/* LEFT PANEL */}
        <div style={{ padding:"24px 20px", borderRight:"1px solid #e0dbd0", background:"#faf8f4" }}>

          <h2 style={{ fontSize:21, fontWeight:900, color:"#111", margin:"0 0 3px" }}>({sym}) {name}</h2>
          <div style={{ fontSize:13, color:"#888", marginBottom:14 }}>{ov ? ov.exchange : "NASDAQ"}</div>



          {/* Price */}
          {price > 0 ? (
            <div style={{ marginBottom:16 }}>
              <div>
                <span style={{ fontSize:38, fontWeight:900, color:"#111", letterSpacing:"-1px" }}>
                  {price.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 })}
                </span>
                <span style={{ fontSize:13, color:"#999", marginLeft:8 }}>USD</span>
                <span style={{ fontSize:14, fontWeight:700, marginLeft:10, color:up?"#2a8a2a":"#c03030" }}>{chg}</span>
              </div>
              <div style={{ fontSize:12, color:"#aaa" }}>Next Earnings Date: <span style={{ color:"#555" }}>{ov && ov.nextEarnings ? ov.nextEarnings : "-"}</span></div>
            </div>
          ) : (
            <div style={{ color:"#aaa", fontSize:14, marginBottom:16 }}>Loading price...</div>
          )}

          {/* Analysis Summary -- 2x2 grid */}
          {(function() {
            function pillColor(text) {
              if (!text) return { bg:"#f5f2ec", fg:"#888", border:"#ddd", dot:"#ccc", dotEmpty:"#e8e4dc" };
              var v = text.toLowerCase();
              if (v.includes("wide") || v.includes("strong") || v.includes("strong bullish")) return { bg:"#e6f4e6", fg:"#1a6a1a", border:"#7abd00", dot:"#1a6a1a", dotEmpty:"#c8e8c0" };
              if (v.includes("narrow") || v.includes("moderate") || v.includes("bullish")) return { bg:"#f0f7e6", fg:"#2a7a2a", border:"#9ab800", dot:"#2a7a2a", dotEmpty:"#c8e8c0" };
              if (v.includes("neutral") || v.includes("fairly")) return { bg:"#fdf8e6", fg:"#b88000", border:"#d4a800", dot:"#b88000", dotEmpty:"#f5ddb0" };
              if (v.includes("none") || v.includes("weak") || v.includes("bearish") || v.includes("overvalued")) return { bg:"#fff0f0", fg:"#c03030", border:"#e08080", dot:"#c03030", dotEmpty:"#f5c0c0" };
              return { bg:"#f5f2ec", fg:"#555", border:"#ccc", dot:"#aaa", dotEmpty:"#e0e0e0" };
            }
            function Dots(props) {
              var dots = [];
              for (var d = 1; d <= 5; d++) {
                dots.push(
                  <span key={d} style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background: d <= props.score ? props.filled : props.empty, marginRight:2 }} />
                );
              }
              return <span style={{ display:"inline-flex", alignItems:"center" }}>{dots}</span>;
            }
            // Read directly from parsedInsights -- single source of truth
            var moatParsed  = parsedInsights["moat"]      || {};
            var finParsed   = parsedInsights["financial"]  || {};
            var techParsed  = parsedInsights["technical"]  || {};
            var moatRating  = moatParsed.classification || null;
            var moatScore   = moatParsed.score          || 0;
            var finRating   = finParsed.classification  || null;
            var finScore    = finParsed.score           || 0;
            var techRating  = techParsed.rating         || null;
            var techScore   = techParsed.score          || 0;
            var ivLabel       = vals.length > 0 ? (parseFloat(oracle) > price ? "Undervalued" : "Overvalued") : null;
            var ivColors      = ivLabel ? pillColor(ivLabel) : pillColor(null);
            var moatColors    = moatRating  ? pillColor(moatRating)  : pillColor(null);
            var finColors     = finRating   ? pillColor(finRating)   : pillColor(null);
            var techColors    = techRating  ? pillColor(techRating)  : pillColor(null);
            function Card(props) {
              var c = props.colors;
              var loading = !props.value;
              return (
                <div style={{ padding:"10px 12px", background: loading ? "#f9f7f4" : c.bg, border:"0.5px solid " + (loading ? "#e0dbd0" : c.border), borderRadius:8, opacity: loading ? 0.6 : 1 }}>
                  <div style={{ fontSize:10, color: loading ? "#aaa" : c.fg, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:5 }}>{props.label}</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ fontSize:14, fontWeight:700, color: loading ? "#ccc" : c.fg }}>{loading ? "..." : props.value}</div>
                    {!loading && props.score > 0 && (
                      <Dots score={props.score} filled={c.dot} empty={c.dotEmpty} />
                    )}
                    {!loading && props.sublabel && (
                      <span style={{ fontSize:10, fontWeight:600, color:c.fg }}>{props.sublabel}</span>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600, marginBottom:7 }}>Analysis Summary</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                  <Card label="Economic Moat"    value={moatRating}  score={moatScore}  colors={moatColors} />
                  <Card label="Financial Strength" value={finRating} score={finScore}   colors={finColors} />
                  <Card label="Intrinsic Value"  value={vals.length > 0 ? "$" + oracle : null} score={0} sublabel={ivLabel} colors={ivColors} />
                  <Card label="Technical Rating" value={techRating}  score={techScore}  colors={techColors} />
                </div>
              </div>
            );
          })()}

          {/* Valuation Section */}
          <div style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:12, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Valuation</div>
            {valRows.length > 0 ? (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <tbody>
                  {valRows.map(function(row, i) {
                    return (
                      <tr key={i} style={{ borderBottom:i < valRows.length-1 ? "1px solid #f0ede6" : "none" }}>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#888", width:"34%", lineHeight:1.4 }}>{row[0]}</td>
                        <td style={{ padding:"6px 8px", fontSize:13, fontWeight:700, color:"#111", width:"16%" }}>{row[1]}</td>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#888", width:"34%", lineHeight:1.4 }}>{row[2]}</td>
                        <td style={{ padding:"6px 0", fontSize:13, fontWeight:700, color:"#111", width:"16%", textAlign:"right" }}>{row[3]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ color:"#aaa", fontSize:13, textAlign:"center", padding:"12px 0" }}>
                {msg ? "Unavailable" : "Loading..."}
              </div>
            )}
          </div>

          {/* Financial Health Section */}
          <div style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:12, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Financial Health</div>
            {healthRows.length > 0 ? (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <tbody>
                  {healthRows.map(function(row, i) {
                    return (
                      <tr key={i} style={{ borderBottom:i < healthRows.length-1 ? "1px solid #f0ede6" : "none" }}>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#888", width:"34%", lineHeight:1.4 }}>{row[0]}</td>
                        <td style={{ padding:"6px 8px", fontSize:13, fontWeight:700, color:"#111", width:"16%" }}>{row[1]}</td>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#888", width:"34%", lineHeight:1.4 }}>{row[2]}</td>
                        <td style={{ padding:"6px 0", fontSize:13, fontWeight:700, color:"#111", width:"16%", textAlign:"right" }}>{row[3]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ color:"#aaa", fontSize:13, textAlign:"center", padding:"12px 0" }}>
                {msg ? "Unavailable" : "Loading..."}
              </div>
            )}
          </div>

          {/* Growth & Profile Section */}
          <div style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:12, padding:"16px" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Growth & Profile</div>
            {growthRows.length > 0 ? (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <tbody>
                  {growthRows.map(function(row, i) {
                    return (
                      <tr key={i} style={{ borderBottom:i < growthRows.length-1 ? "1px solid #f0ede6" : "none" }}>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#888", width:"34%", lineHeight:1.4 }}>{row[0]}</td>
                        <td style={{ padding:"6px 8px", fontSize:13, fontWeight:700, color:"#111", width:"16%" }}>{row[1]}</td>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#888", width:"34%", lineHeight:1.4 }}>{row[2]}</td>
                        <td style={{ padding:"6px 0", fontSize:13, fontWeight:700, color:"#111", width:"16%", textAlign:"right" }}>{row[3]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ color:"#aaa", fontSize:13, textAlign:"center", padding:"12px 0" }}>
                {msg ? "Unavailable" : "Loading..."}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ padding:"24px", background:"#fff" }}>

          {/* TradingView Chart */}
          <div style={{ border:"1px solid #e0dbd0", borderRadius:12, overflow:"hidden", marginBottom:20 }}>
            <div style={{ background:"#faf8f4", borderBottom:"1px solid #e0dbd0", padding:"8px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#444" }}>
                {name} . Daily . {ov ? ov.exchange : "NASDAQ"}
              </span>
              {q && (
                <span style={{ fontSize:11, color:"#999" }}>
                  O{q.open} H{q.high} L{q.low}{" "}
                  <span style={{ color:up?"#2a8a2a":"#c03030" }}>C{price.toFixed(2)} {chg}</span>
                </span>
              )}
            </div>
            <iframe
              key={sym}
              src={"https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=" + sym + "&interval=D&theme=light&style=1&timezone=Etc%2FUTC&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=0&save_image=0"}
              style={{ width:"100%", height:300, border:"none", display:"block" }}
              title="TradingView Chart"
            />
            <div style={{ background:"#faf8f4", borderTop:"1px solid #e0dbd0", padding:"6px 14px", display:"flex", gap:16 }}>
              {["1Y","3Y","5Y"].map(function(p) {
                return <span key={p} style={{ fontSize:12, color:"#444", cursor:"pointer", fontWeight:600 }}>{p}</span>;
              })}
            </div>
          </div>

          {/* Historical Data - EPS 10 years */}
          <div style={{ border:"1px solid #e0dbd0", borderRadius:12, padding:"20px 22px", background:"#faf8f4", marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#111", marginBottom:14 }}>Historical Data</div>
            {epsHistory && epsHistory.length > 0 ? (
              <>
              <div style={{ overflowX:"auto" }}>
                <table style={{ borderCollapse:"collapse", fontSize:12, width:"100%" }}>
                  <thead>
                    <tr style={{ borderBottom:"2px solid #e0dbd0" }}>
                      <td style={{ padding:"6px 10px", color:"#888", fontWeight:600, minWidth:160 }}>Metric</td>
                      <td style={{ padding:"6px 10px", textAlign:"right", color:"#1a6a1a", fontWeight:700, minWidth:65, borderRight:"2px solid #e0dbd0" }}>
                        {new Date().getFullYear()} *
                      </td>
                      {epsHistory.map(function(row) {
                        return (
                          <td key={row.year} style={{ padding:"6px 10px", textAlign:"right", color:"#888", fontWeight:600, minWidth:65 }}>
                            {row.year}
                          </td>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom:"1px solid #f0ede6" }}>
                      <td style={{ padding:"7px 10px", color:"#555", whiteSpace:"nowrap" }}>EPS (Diluted)</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#1a6a1a", fontWeight:700, borderRight:"2px solid #e0dbd0" }}>
                        {eps > 0 ? "$" + eps.toFixed(2) : "-"}
                      </td>
                      {epsHistory.map(function(row) {
                        return (
                          <td key={row.year} style={{ padding:"7px 10px", textAlign:"right", color:"#111", fontWeight:600 }}>
                            {"$" + (row.eps != null ? row.eps.toFixed(2) : "-")}
                          </td>
                        );
                      })}
                    </tr>
                    <tr style={{ borderBottom:"1px solid #f0ede6" }}>
                      <td style={{ padding:"7px 10px", color:"#555", whiteSpace:"nowrap" }}>EPS Growth YoY</td>
                      {(function() {
                        var prevEps = epsHistory[0] && epsHistory[0].eps;
                        if (!prevEps || !eps) return (
                          <td style={{ padding:"7px 10px", textAlign:"right", borderRight:"2px solid #e0dbd0", fontWeight:700, color:"#aaa" }}>-</td>
                        );
                        var g = (eps - prevEps) / Math.abs(prevEps) * 100;
                        var col = g >= 0 ? "#2a8a2a" : "#c03030";
                        return (
                          <td style={{ padding:"7px 10px", textAlign:"right", borderRight:"2px solid #e0dbd0", fontWeight:700, color:col }}>
                            {(g >= 0 ? "+" : "") + g.toFixed(1) + "%"}
                          </td>
                        );
                      })()}
                      {epsHistory.map(function(row, i) {
                        var prevRow = epsHistory[i+1];
                        if (!prevRow || !prevRow.eps) return <td key={row.year} style={{ padding:"7px 10px", textAlign:"right", color:"#aaa" }}>-</td>;
                        var growth = ((row.eps - prevRow.eps) / Math.abs(prevRow.eps)) * 100;
                        var color = growth >= 0 ? "#2a8a2a" : "#c03030";
                        return (
                          <td key={row.year} style={{ padding:"7px 10px", textAlign:"right", color:color, fontWeight:600 }}>
                            {(growth >= 0 ? "+" : "") + growth.toFixed(1) + "%"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td style={{ padding:"7px 10px", color:"#555", whiteSpace:"nowrap" }}>Revenue</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#1a6a1a", fontWeight:700, borderRight:"2px solid #e0dbd0" }}>
                        {ov && ov.revenue ? ov.revenue : "-"}
                      </td>
                      {epsHistory.map(function(row) {
                        return (
                          <td key={row.year} style={{ padding:"7px 10px", textAlign:"right", color:"#111", fontWeight:600 }}>
                            {row.revenue || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize:11, color:"#aaa", marginTop:8 }}>
                * {new Date().getFullYear()} figures are TTM estimates from Yahoo Finance
              </div>
            </>
            ) : (
              <div style={{ textAlign:"center", padding:"20px 0", color:"#aaa", fontSize:13 }}>
                {epsError ? "Historical EPS data unavailable for this symbol." : "Loading historical EPS data..."}
              </div>
            )}
          </div>

          {/* 5-Tab Insight Panel */}
          {(function() {
            var TABS = [
              { id:"business",  label:"Business Overview" },
              { id:"moat",      label:"Economic MOAT" },
              { id:"intrinsic", label:"Intrinsic Value" },
              { id:"financial", label:"Financial Strength" },
              { id:"technical", label:"Technical Analysis" },
              { id:"addlinfo",  label:"Additional Information" },
              { id:"debug",    label:"Debug" },
            ];

            function handleTab(id) {
              setInsightTab(id);
            }

            // Parse new structured moat format with scores
            function parseMoat(text) {
              if (!text) return null;
              var drivers = [
                "Network Effects","Switching Costs","Cost Advantage",
                "Intangible Assets","Efficient Scale","Ecosystem Lock-in"
              ];
              var result = [];
              drivers.forEach(function(drv) {
                var drvIdx = text.indexOf(drv);
                if (drvIdx === -1) return;
                var nextDrv = drivers[drivers.indexOf(drv) + 1];
                var block = nextDrv ? text.substring(drvIdx, text.indexOf(nextDrv)) : text.substring(drvIdx);
                var scoreMatch = block.match(/([0-9])\/5/);
                var lines = block.split("\n");
                var resultLine = "";
                for (var li = 0; li < lines.length; li++) {
                  if (lines[li].indexOf("Result:") !== -1) {
                    resultLine = lines[li].replace(/^.*Result:\s*/, "").trim();
                    break;
                  }
                }
                if (scoreMatch) {
                  result.push({
                    label: drv,
                    score: parseInt(scoreMatch[1], 10),
                    body: resultLine
                  });
                }
              });
              var ratingMatch = text.match(/Economic Moat Rating:\s*([0-9])\s*\/\s*5/);
              var expIdx = text.indexOf("Explanation");
              var explanation = expIdx !== -1 ? text.substring(expIdx).replace(/^Explanation[^:]*:\s*/, "").trim() : null;
              var rating = ratingMatch ? parseInt(ratingMatch[1], 10) : null;
              return {
                sections: result,
                rating: rating,
                explanation: explanation,
                classification: rating != null ? (rating >= 4 ? "Wide" : rating >= 3 ? "Narrow" : "None") : null,
              };
            }

            // Parse technical into structured sections
            function parseTechnical(text) {
              if (!text) return null;
              var ratingMatch = text.match(/Technical Rating[^:]*:\s*(.+)/);
              var entryMatch  = text.match(/Entry Timing[^:]*:\s*(.+)/);
              return {
                body:   text,
                rating: ratingMatch ? ratingMatch[1].trim() : null,
                entry:  entryMatch  ? entryMatch[1].trim()  : null,
              };
            }

            // Parse financial strength
            function parseFinancial(text) {
              if (!text) return null;
              var classMatch = text.match(/Financial Strength Classification[^:]*:\s*(.+)/);
              var classification = classMatch ? classMatch[1].trim() : null;
              if (!classification) {
                if (text.indexOf("Strong") !== -1) classification = "Strong";
                else if (text.indexOf("Moderate") !== -1) classification = "Moderate";
                else if (text.indexOf("Weak") !== -1) classification = "Weak";
              }
              return { body: text, classification: classification };
            }

            function ratingColor(val) {
              if (!val) return "#888";
              var v = val.toLowerCase();
              if (v.includes("wide") || v.includes("strong") || v.includes("good entry")) return "#1a6a1a";
              if (v.includes("narrow") || v.includes("bullish") || v.includes("breakout")) return "#2a8a2a";
              if (v.includes("neutral") || v.includes("moderate") || v.includes("pullback") || v.includes("fairly")) return "#b88000";
              if (v.includes("none") || v.includes("bearish") || v.includes("avoid") || v.includes("weak")) return "#c03030";
              return "#555";
            }

            var tabContent = insightCache[insightTab];
            var isLoading  = !tabContent;           return (
              <div style={{ border:"1px solid #e0dbd0", borderRadius:12, overflow:"hidden" }}>

                {/* Tab bar */}
                <div style={{ display:"flex", background:"#faf8f4", borderBottom:"1px solid #e0dbd0", overflowX:"auto" }}>
                  {TABS.map(function(tab) {
                    var active = insightTab === tab.id;
                    return (
                      <button key={tab.id} onClick={function() { handleTab(tab.id); }} style={{
                        flex:"0 0 auto", padding:"11px 16px", border:"none", background:"transparent",
                        cursor:"pointer", fontSize:12, fontWeight: active ? 700 : 500,
                        color: active ? "#111" : "#888",
                        borderBottom: active ? "2px solid #111" : "2px solid transparent",
                        fontFamily:FONT, whiteSpace:"nowrap",
                      }}>
                        {tab.id === "intrinsic" ? null : (
                          <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background: active ? LIME : "#ccc", marginRight:5, verticalAlign:"middle" }} />
                        )}
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div style={{ padding:"20px 22px", background:"#fff", minHeight:200 }}>

                  {/* Intrinsic Value tab - show existing valuation chart */}
                  {insightTab === "intrinsic" && (
                    <div>
                      {vals.length > 0 && (function() {
                        var iv = parseFloat(oracle);
                        var isUnder = iv > price;
                        var pct = price > 0 ? Math.round(Math.abs(iv - price) / price * 100) : 0;
                        return (
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background: isUnder ? "#e6f4e6" : "#fff0f0", borderRadius:8, marginBottom:16, border:"0.5px solid " + (isUnder ? "#7abd00" : "#e08080") }}>
                            <div>
                              <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Intrinsic Value</div>
                              <div style={{ fontSize:15, fontWeight:700, color: isUnder ? "#1a6a1a" : "#c03030" }}>{isUnder ? "Undervalued" : "Overvalued"} by {pct}%</div>
                              <div style={{ fontSize:11, color:"#555", marginTop:2 }}>Est. fair value ${oracle} vs current ${price.toFixed(2)}</div>
                            </div>
                            <div style={{ fontSize:22, fontWeight:900, color: isUnder ? "#1a6a1a" : "#c03030" }}>${oracle}</div>
                          </div>
                        );
                      })()}
                      <div style={{ borderBottom:"2px solid #e0dbd0", marginBottom:14 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:"#111", paddingBottom:6, borderBottom:"2px solid #111", display:"inline-block", marginBottom:"-2px" }}>
                          Summary
                        </span>
                      </div>
                      {vals.length > 0 ? (
                        <div>
                          <div style={{ textAlign:"right", marginBottom:8 }}>
                            <span style={{ fontSize:11, color:"#aaa" }}>IntrinsicValue(TM) {oracle}</span>
                          </div>
                          {vals.map(function(v, i) {
                            return <VBar key={i} label={v.label} value={v.value} maxV={maxV} color={v.color} bold={v.bold} />;
                          })}
                          <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid #e0dbd0", textAlign:"right" }}>
                            <span style={{ fontSize:11, color:"#aaa" }}>Stock price: ${price.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign:"center", padding:"28px 0", color:"#aaa", fontSize:13 }}>
                          {msg ? "Data unavailable" : "Loading valuation data..."}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI-powered tabs */}
                  {insightTab !== "intrinsic" && (
                    <div>
                      {!tabContent && insightTab !== "business" && insightTab !== "addlinfo" && insightTab !== "debug" && (
                        <div style={{ textAlign:"center", padding:"40px 0" }}>
                          <div style={{ fontSize:12, color:"#888", marginBottom:14 }}>Generating {insightTab} analysis for {sym}...</div>
                          <div style={{ display:"inline-block", width:26, height:26, border:"3px solid #e0dbd0", borderTop:"3px solid " + LIME, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
                        </div>
                      )}

                      {/* Business Overview - sourced from Yahoo Finance assetProfile */}
                      {insightTab === "business" && (
                        <div>
                          {ov && ov.bizSummary ? (
                            <div>
                              {/* Profile chips */}
                              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                                {ov.sector && (
                                  <span style={{ padding:"3px 10px", background:"#f0f7e6", border:"1px solid #c8f000", borderRadius:20, fontSize:11, fontWeight:600, color:"#3a6000" }}>
                                    {ov.sector}
                                  </span>
                                )}
                                {ov.industry && (
                                  <span style={{ padding:"3px 10px", background:"#f5f2ec", border:"1px solid #d0c8b8", borderRadius:20, fontSize:11, fontWeight:600, color:"#555" }}>
                                    {ov.industry}
                                  </span>
                                )}
                                {ov.country && (
                                  <span style={{ padding:"3px 10px", background:"#f5f2ec", border:"1px solid #d0c8b8", borderRadius:20, fontSize:11, fontWeight:600, color:"#555" }}>
                                    {ov.country}
                                  </span>
                                )}
                                {ov.employees > 0 && (
                                  <span style={{ padding:"3px 10px", background:"#f5f2ec", border:"1px solid #d0c8b8", borderRadius:20, fontSize:11, fontWeight:600, color:"#555" }}>
                                    {ov.employees.toLocaleString()} employees
                                  </span>
                                )}
                              </div>
                              {/* Business description */}
                              <p style={{ fontSize:13, color:"#333", lineHeight:1.85, margin:"0 0 16px 0" }}>
                                {ov.bizSummary}
                              </p>
                              {/* Key stats row */}
                              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
                                {[
                                  { label:"Market Cap",       value: ov.marketCap },
                                  { label:"Revenue (TTM)",    value: ov.revenue },
                                  { label:"Net Income (TTM)", value: ov.netIncome },
                                  { label:"Gross Margin",     value: ov.grossMargin ? ov.grossMargin.toFixed(1)+"%" : "-" },
                                  { label:"Operating Margin", value: ov.opMargin ? ov.opMargin.toFixed(1)+"%" : "-" },
                                  { label:"Free Cash Flow",   value: ov.fcf },
                                ].map(function(item, i) {
                                  return (
                                    <div key={i} style={{ background:"#f5f2ec", borderRadius:8, padding:"10px 12px" }}>
                                      <div style={{ fontSize:10, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{item.label}</div>
                                      <div style={{ fontSize:14, fontWeight:700, color:"#111" }}>{item.value || "-"}</div>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Website link */}
                              {ov.website && (
                                <a href={ov.website} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#888", textDecoration:"none" }}>
                                  {ov.website}
                                </a>
                              )}
                              <div style={{ fontSize:10, color:"#ccc", marginTop:10 }}>Business description sourced from Yahoo Finance</div>
                            </div>
                          ) : (
                            <div style={{ textAlign:"center", padding:"40px 0", color:"#aaa", fontSize:13 }}>
                              {ov ? "Business description unavailable for this symbol." : "Loading company data..."}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Economic MOAT */}
                      {insightTab === "moat" && tabContent && (function() {
                        var parsed = parseMoat(tabContent);
                        if (!parsed || parsed.sections.length === 0) {
                          return <div style={{ fontSize:13, color:"#333", lineHeight:1.8 }}>{tabContent}</div>;
                        }
                        function scoreColor(s) {
                          if (s >= 4) return "#1a6a1a";
                          if (s >= 3) return "#2a7a2a";
                          if (s >= 2) return "#b88000";
                          return "#c03030";
                        }
                        function scoreLabel(s) {
                          if (s >= 4) return "Strong";
                          if (s >= 3) return "Moderate";
                          if (s >= 2) return "Limited";
                          return "Weak";
                        }
                        function DotBar(props) {
                          var dots = [];
                          for (var d = 1; d <= 5; d++) {
                            dots.push(
                              <span key={d} style={{
                                display:"inline-block", width:8, height:8, borderRadius:"50%",
                                background: d <= props.score ? scoreColor(props.score) : "#ddd",
                                marginRight:3,
                              }} />
                            );
                          }
                          return (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:0 }}>
                              {dots}
                              <span style={{ fontSize:10, color:scoreColor(props.score), fontWeight:600, marginLeft:5 }}>{scoreLabel(props.score)}</span>
                            </span>
                          );
                        }
                        var pi = parsedInsights["moat"] || {};
                        return (
                          <div>
                            {pi.classification && (
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background: pi.score >= 4 ? "#e6f4e6" : pi.score >= 3 ? "#f0f7e6" : "#fff0f0", borderRadius:8, marginBottom:16, border:"0.5px solid " + (pi.score >= 4 ? "#7abd00" : pi.score >= 3 ? "#9ab800" : "#e08080") }}>
                                <div>
                                  <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Economic Moat Rating</div>
                                  <div style={{ fontSize:15, fontWeight:700, color: pi.score >= 4 ? "#1a6a1a" : pi.score >= 3 ? "#2a7a2a" : "#c03030" }}>{pi.classification}</div>
                                  {pi.explanation ? <div style={{ fontSize:11, color:"#555", marginTop:2, maxWidth:400 }}>{pi.explanation}</div> : null}
                                </div>
                                <DotBar score={pi.score} />
                              </div>
                            )}
                            {parsed.sections.map(function(sec, i) {
                              return (
                                <div key={i} style={{ marginBottom:12, paddingBottom:12, borderBottom: i < parsed.sections.length-1 ? "1px solid #f0ede6" : "none" }}>
                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                                    <div style={{ fontSize:12, fontWeight:700, color:"#111" }}>{sec.label}</div>
                                    <DotBar score={sec.score} />
                                  </div>
                                  <div style={{ fontSize:12, color:"#666", lineHeight:1.6 }}>{sec.body}</div>
                                </div>
                              );
                            })}
                            {parsed.rating != null && (
                              <div style={{ marginTop:14, padding:"12px 16px", background:"#f5f2ec", borderRadius:10 }}>
                                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: parsed.explanation ? 8 : 0 }}>
                                  <div>
                                    <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Economic Moat Rating</div>
                                    <div style={{ fontSize:14, fontWeight:700, color:scoreColor(parsed.rating) }}>{parsed.classification}</div>
                                  </div>
                                  <DotBar score={parsed.rating} />
                                </div>
                                {parsed.explanation && (
                                  <div style={{ fontSize:12, color:"#555", lineHeight:1.7, borderTop:"1px solid #e0dbd0", paddingTop:8 }}>{parsed.explanation}</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Financial Strength */}
                      {insightTab === "financial" && tabContent && (function() {
                        var parsed = parseFinancial(tabContent);
                        function fsColor(c) {
                          if (!c) return "#888";
                          var v = c.toLowerCase();
                          if (v.includes("strong")) return "#1a6a1a";
                          if (v.includes("moderate")) return "#b88000";
                          return "#c03030";
                        }
                        function fsScore(c) {
                          if (!c) return 0;
                          var v = c.toLowerCase();
                          if (v.includes("strong")) return 4;
                          if (v.includes("moderate")) return 3;
                          return 2;
                        }
                        function DotBar(props) {
                          var dots = [];
                          for (var d = 1; d <= 5; d++) {
                            dots.push(
                              <span key={d} style={{
                                display:"inline-block", width:8, height:8, borderRadius:"50%",
                                background: d <= props.score ? fsColor(props.label) : "#ddd",
                                marginRight:3,
                              }} />
                            );
                          }
                          return <span style={{ display:"inline-flex", alignItems:"center" }}>{dots}</span>;
                        }
                        var piF = parsedInsights["financial"] || {};
                        return (
                          <div>
                            {piF.classification && (
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background: piF.score >= 4 ? "#e6f4e6" : piF.score >= 3 ? "#fdf8e6" : "#fff0f0", borderRadius:8, marginBottom:16, border:"0.5px solid " + (piF.score >= 4 ? "#7abd00" : piF.score >= 3 ? "#d4a800" : "#e08080") }}>
                                <div>
                                  <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Financial Strength</div>
                                  <div style={{ fontSize:15, fontWeight:700, color:fsColor(piF.classification) }}>{piF.classification}</div>
                                </div>
                                <DotBar score={fsScore(piF.classification)} label={piF.classification} />
                              </div>
                            )}
                            <div style={{ fontSize:13, color:"#333", lineHeight:1.8, marginBottom:14 }}>
                              {parsed.body.replace(/Financial Strength Classification:.+/, "").trim()}
                            </div>
                            {parsed.classification && (
                              <div style={{ padding:"12px 16px", background:"#f5f2ec", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                                <div>
                                  <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Financial Strength</div>
                                  <div style={{ fontSize:14, fontWeight:700, color:fsColor(parsed.classification) }}>{parsed.classification}</div>
                                </div>
                                <DotBar score={fsScore(parsed.classification)} label={parsed.classification} />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Technical Analysis */}
                      {insightTab === "technical" && tabContent && (function() {
                        var parsed = parseTechnical(tabContent);
                        function techColor(r) {
                          if (!r) return "#888";
                          var v = r.toLowerCase();
                          if (v.includes("strong bullish")) return "#1a6a1a";
                          if (v.includes("bullish")) return "#2a7a2a";
                          if (v.includes("neutral")) return "#b88000";
                          if (v.includes("strong bearish")) return "#8b0000";
                          if (v.includes("bearish")) return "#c03030";
                          return "#888";
                        }
                        function techScore(r) {
                          if (!r) return 0;
                          var v = r.toLowerCase();
                          if (v.includes("strong bullish")) return 5;
                          if (v.includes("bullish")) return 4;
                          if (v.includes("neutral")) return 3;
                          if (v.includes("bearish") && !v.includes("strong")) return 2;
                          if (v.includes("strong bearish")) return 1;
                          return 3;
                        }
                        function DotBar(props) {
                          var dots = [];
                          for (var d = 1; d <= 5; d++) {
                            dots.push(
                              <span key={d} style={{
                                display:"inline-block", width:8, height:8, borderRadius:"50%",
                                background: d <= props.score ? techColor(props.label) : "#ddd",
                                marginRight:3,
                              }} />
                            );
                          }
                          return <span style={{ display:"inline-flex", alignItems:"center" }}>{dots}</span>;
                        }
                        var piT = parsedInsights["technical"] || {};
                        return (
                          <div>
                            {piT.rating && (
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background: piT.score >= 4 ? "#e6f4e6" : piT.score >= 3 ? "#fdf8e6" : "#fff0f0", borderRadius:8, marginBottom:16, border:"0.5px solid " + (piT.score >= 4 ? "#7abd00" : piT.score >= 3 ? "#d4a800" : "#e08080") }}>
                                <div>
                                  <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Technical Rating</div>
                                  <div style={{ fontSize:15, fontWeight:700, color:techColor(piT.rating) }}>{piT.rating}</div>
                                  {piT.entry && <div style={{ fontSize:11, color:"#555", marginTop:2 }}>Entry: {piT.entry}</div>}
                                </div>
                                <DotBar score={piT.score} label={piT.rating} />
                              </div>
                            )}
                            <div style={{ fontSize:13, color:"#333", lineHeight:1.8, marginBottom:14 }}>
                              {parsed.body.replace(/Technical Rating:.+/, "").replace(/Entry Timing View:.+/, "").trim()}
                            </div>
                            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                              {parsed.rating && (
                                <div style={{ flex:1, minWidth:180, padding:"12px 16px", background:"#f5f2ec", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                                  <div>
                                    <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Technical Rating</div>
                                    <div style={{ fontSize:13, fontWeight:700, color:techColor(parsed.rating) }}>{parsed.rating}</div>
                                  </div>
                                  <DotBar score={techScore(parsed.rating)} label={parsed.rating} />
                                </div>
                              )}
                              {parsed.entry && (
                                <div style={{ flex:1, minWidth:180, padding:"12px 16px", background:"#f5f2ec", borderRadius:10 }}>
                                  <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Entry Timing</div>
                                  <div style={{ fontSize:13, fontWeight:700, color:ratingColor(parsed.entry) }}>{parsed.entry}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}


                    </div>
                  )}

                  {/* Additional Information Tab */}
                  {insightTab === "addlinfo" && (function() {
                    function fmtB(v) {
                      if (v == null) return "-";
                      var a = Math.abs(v);
                      var s = a >= 1e12 ? "$" + (a/1e12).toFixed(2) + "T"
                            : a >= 1e9  ? "$" + (a/1e9).toFixed(1)  + "B"
                            : a >= 1e6  ? "$" + (a/1e6).toFixed(0)  + "M" : "$" + a.toFixed(0);
                      return v < 0 ? "-" + s : s;
                    }
                    var SectionTitle = function(props) {
                      return (
                        <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10, marginTop: props.top ? 0 : 20, paddingTop: props.top ? 0 : 16, borderTop: props.top ? "none" : "1px solid #f0ede6", display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ display:"inline-block", width:3, height:14, background: props.massive ? "#0066ff" : "#c8f000", borderRadius:2 }} />
                          {props.children}
                          <span style={{ fontSize:9, fontWeight:500, background: props.massive ? "#e6f0ff" : "#f0f7e0", color: props.massive ? "#0044cc" : "#3a6000", padding:"1px 6px", borderRadius:10 }}>{props.massive ? "Massive.com" : "Yahoo Finance"}</span>
                        </div>
                      );
                    };
                    return (
                      <div style={{ fontSize:13 }}>

                        {/* YAHOO SECTION */}
                        <SectionTitle top={true}>Analyst Recommendations</SectionTitle>
                        {ov && (ov.recBuy > 0 || ov.recHold > 0 || ov.recSell > 0) ? (
                          <div>
                            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                              {[["Buy", ov.recBuy, "#1a6a1a", "#e6f4e6"], ["Hold", ov.recHold, "#b88000", "#fdf8e6"], ["Sell", ov.recSell, "#c03030", "#fff0f0"]].map(function(r) {
                                return r[1] > 0 ? (
                                  <div key={r[0]} style={{ flex:1, textAlign:"center", padding:"10px 8px", background:r[3], borderRadius:8 }}>
                                    <div style={{ fontSize:20, fontWeight:700, color:r[2] }}>{r[1]}</div>
                                    <div style={{ fontSize:10, color:r[2], fontWeight:600, textTransform:"uppercase" }}>{r[0]}</div>
                                  </div>
                                ) : null;
                              })}
                            </div>
                            {ov.recPeriod && <div style={{ fontSize:11, color:"#aaa" }}>Period: {ov.recPeriod}</div>}
                          </div>
                        ) : <div style={{ color:"#aaa" }}>No analyst data available.</div>}

                        <SectionTitle>Recent Analyst Actions</SectionTitle>
                        {ov && ov.upgrades && ov.upgrades.length > 0 ? (
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                            <thead>
                              <tr style={{ borderBottom:"1px solid #e0dbd0" }}>
                                {["Date","Firm","Action","From","To"].map(function(h) {
                                  return <td key={h} style={{ padding:"4px 8px", color:"#888", fontWeight:600 }}>{h}</td>;
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {ov.upgrades.map(function(u, i) {
                                var ac = (u.action||"").toLowerCase();
                                var col = ac.includes("up") ? "#1a6a1a" : ac.includes("down") ? "#c03030" : "#888";
                                return (
                                  <tr key={i} style={{ borderBottom:"1px solid #f5f2ec" }}>
                                    <td style={{ padding:"5px 8px", color:"#888" }}>{u.date}</td>
                                    <td style={{ padding:"5px 8px", fontWeight:600 }}>{u.firm}</td>
                                    <td style={{ padding:"5px 8px", color:col, fontWeight:600, textTransform:"capitalize" }}>{u.action}</td>
                                    <td style={{ padding:"5px 8px", color:"#aaa" }}>{u.from || "-"}</td>
                                    <td style={{ padding:"5px 8px", color:"#333", fontWeight:600 }}>{u.to || "-"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : <div style={{ color:"#aaa" }}>No recent analyst actions.</div>}

                        <SectionTitle>Analyst Price Targets</SectionTitle>
                        {ov && ov.targetMean > 0 ? (
                          <div>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:7, marginBottom:8 }}>
                              {[
                                ["Mean Target",   "$" + ov.targetMean.toFixed(2),   ov.targetMean   > (q ? q.price : 0) ? "#1a6a1a" : "#c03030"],
                                ["High Target",   "$" + ov.targetHigh.toFixed(2),   "#1a6a1a"],
                                ["Low Target",    "$" + ov.targetLow.toFixed(2),    "#c03030"],
                                ["Median Target", "$" + ov.targetMedian.toFixed(2), "#b88000"],
                              ].map(function(row, i) {
                                return (
                                  <div key={i} style={{ background:"#f9f7f4", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                                    <div style={{ fontSize:10, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:2 }}>{row[0]}</div>
                                    <div style={{ fontSize:15, fontWeight:700, color:row[2] }}>{row[1]}</div>
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ fontSize:11, color:"#aaa" }}>
                              {ov.numAnalysts > 0 ? ov.numAnalysts + " analysts" : ""}{ov.recKey ? " | Consensus: " + ov.recKey.toUpperCase() : ""}
                            </div>
                          </div>
                        ) : <div style={{ color:"#aaa" }}>Analyst targets unavailable.</div>}

                        <SectionTitle>Short Interest & Ownership</SectionTitle>
                        {ov ? (
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7, marginBottom:8 }}>
                            {[
                              ["Short Ratio",       ov.shortRatio   > 0 ? ov.shortRatio.toFixed(2) + " days" : "-"],
                              ["Short % of Float",  ov.shortPct     > 0 ? (ov.shortPct * 100).toFixed(2) + "%" : "-"],
                              ["Insider Owned",     ov.insiderPct   > 0 ? (ov.insiderPct * 100).toFixed(2) + "%" : "-"],
                              ["Institution Owned", ov.institutionPct > 0 ? (ov.institutionPct * 100).toFixed(2) + "%" : "-"],
                              ["Payout Ratio",      ov.payoutRatio  > 0 ? (ov.payoutRatio * 100).toFixed(2) + "%" : "-"],
                              ["Book Value / Share", ov.bookValuePS  > 0 ? "$" + ov.bookValuePS.toFixed(2) : "-"],
                            ].map(function(row, i) {
                              return (
                                <div key={i} style={{ background:"#f9f7f4", borderRadius:8, padding:"8px 10px" }}>
                                  <div style={{ fontSize:10, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:2 }}>{row[0]}</div>
                                  <div style={{ fontSize:13, fontWeight:700, color:"#111" }}>{row[1]}</div>
                                </div>
                              );
                            })}
                          </div>
                        ) : <div style={{ color:"#aaa" }}>Ownership data unavailable.</div>}

                        <SectionTitle>Top Institutional Holders</SectionTitle>
                        {ov && ov.topHolders && ov.topHolders.length > 0 ? (
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                            <thead>
                              <tr style={{ borderBottom:"1px solid #e0dbd0" }}>
                                {["Institution","% Held","Shares","Value","Date"].map(function(h) {
                                  return <td key={h} style={{ padding:"4px 8px", color:"#888", fontWeight:600 }}>{h}</td>;
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {ov.topHolders.map(function(h, i) {
                                return (
                                  <tr key={i} style={{ borderBottom:"1px solid #f5f2ec" }}>
                                    <td style={{ padding:"5px 8px", fontWeight:600 }}>{h.name}</td>
                                    <td style={{ padding:"5px 8px", color:"#1a6a1a", fontWeight:600 }}>{h.pct}</td>
                                    <td style={{ padding:"5px 8px", color:"#888" }}>{h.shares}</td>
                                    <td style={{ padding:"5px 8px", color:"#555" }}>{h.value}</td>
                                    <td style={{ padding:"5px 8px", color:"#aaa" }}>{h.date}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : <div style={{ color:"#aaa" }}>Institutional holder data unavailable.</div>}

                        <SectionTitle>Insider Transactions</SectionTitle>
                        {ov && ov.insiderTx && ov.insiderTx.length > 0 ? (
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                            <thead>
                              <tr style={{ borderBottom:"1px solid #e0dbd0" }}>
                                {["Date","Name","Title","Transaction","Shares","Value"].map(function(h) {
                                  return <td key={h} style={{ padding:"4px 8px", color:"#888", fontWeight:600 }}>{h}</td>;
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {ov.insiderTx.map(function(t, i) {
                                var isBuy = t.action && t.action.toLowerCase().includes("buy");
                                return (
                                  <tr key={i} style={{ borderBottom:"1px solid #f5f2ec" }}>
                                    <td style={{ padding:"5px 8px", color:"#888" }}>{t.date}</td>
                                    <td style={{ padding:"5px 8px", fontWeight:600 }}>{t.name}</td>
                                    <td style={{ padding:"5px 8px", color:"#888", fontSize:11 }}>{t.title}</td>
                                    <td style={{ padding:"5px 8px", color: isBuy ? "#1a6a1a" : "#c03030", fontWeight:600 }}>{t.action}</td>
                                    <td style={{ padding:"5px 8px", textAlign:"right" }}>{t.shares ? t.shares.toLocaleString() : "-"}</td>
                                    <td style={{ padding:"5px 8px", textAlign:"right" }}>{t.value ? "$" + (t.value/1e6).toFixed(1) + "M" : "-"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : <div style={{ color:"#aaa" }}>Insider transaction data unavailable.</div>}

                        <SectionTitle>Recent SEC Filings</SectionTitle>
                        {ov && ov.secFilings && ov.secFilings.length > 0 ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                            {ov.secFilings.map(function(f, i) {
                              return (
                                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 10px", background:"#f9f7f4", borderRadius:6 }}>
                                  <span style={{ background:"#111", color:"#c8f000", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, flexShrink:0 }}>{f.type}</span>
                                  <span style={{ fontSize:12, color:"#555", flex:1 }}>{f.date}</span>
                                  {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#0044cc" }}>View Filing</a> : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : <div style={{ color:"#aaa" }}>SEC filing data unavailable.</div>}

                        <SectionTitle>Earnings Track Record (Last 4 Quarters)</SectionTitle>
                        {ov && ov.earningsQ && ov.earningsQ.length > 0 ? (
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                            <thead>
                              <tr style={{ borderBottom:"1px solid #e0dbd0" }}>
                                {["Quarter","Actual EPS","Est. EPS","Surprise","Surprise %"].map(function(h) {
                                  return <td key={h} style={{ padding:"4px 8px", color:"#888", fontWeight:600, textAlign: h==="Quarter" ? "left" : "right" }}>{h}</td>;
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {ov.earningsQ.map(function(q, i) {
                                var beat = q.surprise > 0;
                                return (
                                  <tr key={i} style={{ borderBottom:"1px solid #f5f2ec" }}>
                                    <td style={{ padding:"5px 8px", fontWeight:600 }}>{q.date}</td>
                                    <td style={{ padding:"5px 8px", textAlign:"right", fontWeight:700, color: beat ? "#1a6a1a" : "#c03030" }}>{q.actual != null ? "$" + q.actual.toFixed(2) : "-"}</td>
                                    <td style={{ padding:"5px 8px", textAlign:"right", color:"#888" }}>{q.estimate != null ? "$" + q.estimate.toFixed(2) : "-"}</td>
                                    <td style={{ padding:"5px 8px", textAlign:"right", color: beat ? "#1a6a1a" : "#c03030" }}>{q.surprise != null ? (beat ? "+" : "") + "$" + q.surprise.toFixed(2) : "-"}</td>
                                    <td style={{ padding:"5px 8px", textAlign:"right", fontWeight:600, color: beat ? "#1a6a1a" : "#c03030" }}>{q.surprisePct != null ? (beat ? "+" : "") + q.surprisePct.toFixed(1) + "%" : "-"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : <div style={{ color:"#aaa" }}>Earnings history unavailable.</div>}

                        <SectionTitle>Key Financial Metrics</SectionTitle>
                        {ov ? (
                          <div>
                            {[
                              { group: "Valuation", rows: [
                                ["P/E Ratio (TTM)",          ov.pe        > 0  ? ov.pe.toFixed(2)        : "-"],
                                ["Forward P/E",              ov.fpe       > 0  ? ov.fpe.toFixed(2)       : "-"],
                                ["PEG Ratio",                ov.peg       > 0  ? ov.peg.toFixed(2)       : "-"],
                                ["Price / Sales (TTM)",      ov.ps        > 0  ? ov.ps.toFixed(2)        : "-"],
                                ["Price / Book",             ov.pb        > 0  ? ov.pb.toFixed(2)        : "-"],
                                ["EV / EBITDA",              ov.evEbitda  > 0  ? ov.evEbitda.toFixed(2)  : "-"],
                                ["Price / FCF",              ov.pFcf      > 0  ? ov.pFcf.toFixed(2)      : "-"],
                                ["Dividend Yield",           ov.divY      > 0  ? ov.divY.toFixed(2) + "%" : "-"],
                              ]},
                              { group: "Profitability", rows: [
                                ["Gross Margin",             ov.grossMargin  ? ov.grossMargin.toFixed(2)  + "%" : "-"],
                                ["Operating Margin",         ov.opMargin     ? ov.opMargin.toFixed(2)     + "%" : "-"],
                                ["Net Profit Margin",        ov.netMargin    ? ov.netMargin.toFixed(2)    + "%" : "-"],
                                ["Return on Equity (ROE)",   ov.roe          ? ov.roe.toFixed(2)          + "%" : "-"],
                                ["Return on Assets (ROA)",   ov.roic         ? ov.roic.toFixed(2)         + "%" : "-"],
                              ]},
                              { group: "Growth", rows: [
                                ["EPS Growth (TTM)",         ov.epsG      ? ov.epsG.toFixed(2)      + "%" : "-"],
                                ["Revenue Growth YoY",       ov.revGrowth ? ov.revGrowth.toFixed(2) + "%" : "-"],
                                ["LT EPS Growth (5yr Est.)", ov.ltG       ? ov.ltG.toFixed(2)       + "%" : "-"],
                              ]},
                              { group: "Financial Health", rows: [
                                ["Current Ratio",            ov.currentRatio > 0 ? ov.currentRatio.toFixed(2) : "-"],
                                ["Quick Ratio",              ov.quickRatio   > 0 ? ov.quickRatio.toFixed(2)   : "-"],
                                ["Debt / Equity",            ov.de           > 0 ? ov.de.toFixed(2)           : "-"],
                                ["Free Cash Flow",           ov.fcf          || "-"],
                                ["Net Income (TTM)",         ov.netIncome    || "-"],
                                ["Revenue (TTM)",            ov.revenue      || "-"],
                              ]},
                              { group: "Market Data", rows: [
                                ["Market Cap",               ov.marketCap || "-"],
                                ["Beta",                     ov.beta > 0 ? ov.beta.toFixed(2) : "-"],
                                ["52-Week High",             ov.hi52 > 0 ? "$" + ov.hi52.toFixed(2) : "-"],
                                ["52-Week Low",              ov.lo52 > 0 ? "$" + ov.lo52.toFixed(2) : "-"],
                                ["Shares Outstanding",       ov.sharesOut > 0 ? (ov.sharesOut / 1e9).toFixed(3) + "B" : "-"],
                              ]},
                            ].map(function(section, si) {
                              return (
                                <div key={si} style={{ marginBottom:16 }}>
                                  <div style={{ fontSize:10, fontWeight:700, color:"#c8f000", background:"#1a1a14", padding:"3px 8px", borderRadius:4, display:"inline-block", marginBottom:8, letterSpacing:"0.06em" }}>{section.group}</div>
                                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                                    <tbody>
                                      {section.rows.map(function(row, ri) {
                                        return (
                                          <tr key={ri} style={{ borderBottom:"1px solid #f5f2ec" }}>
                                            <td style={{ padding:"5px 8px", fontSize:12, color:"#888", width:"55%" }}>{row[0]}</td>
                                            <td style={{ padding:"5px 8px", fontSize:13, fontWeight:600, color:"#111", textAlign:"right" }}>{row[1]}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })}
                          </div>
                        ) : <div style={{ color:"#aaa" }}>Financial data loading...</div>}

                        {/* MASSIVE SECTION */}
                        <SectionTitle massive={true}>Market Snapshot</SectionTitle>
                        {addlLoading ? (
                          <div style={{ color:"#aaa", fontSize:12 }}>Loading...</div>
                        ) : massiveInfo && massiveInfo.snapshot ? (function() {
                          var s = massiveInfo.snapshot;
                          var up = s.change >= 0;
                          return (
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7, marginBottom:4 }}>
                              {[
                                ["Open",       s.open      != null ? "$" + s.open.toFixed(2)      : "-"],
                                ["High",       s.high      != null ? "$" + s.high.toFixed(2)      : "-"],
                                ["Low",        s.low       != null ? "$" + s.low.toFixed(2)       : "-"],
                                ["Close",      s.close     != null ? "$" + s.close.toFixed(2)     : "-"],
                                ["VWAP",       s.vwap      != null ? "$" + s.vwap.toFixed(2)      : "-"],
                                ["Volume",     s.volume    != null ? s.volume.toLocaleString()     : "-"],
                                ["Prev Close", s.prevClose != null ? "$" + s.prevClose.toFixed(2) : "-"],
                                ["Change %",   s.change    != null ? (up ? "+" : "") + s.change.toFixed(2) + "%" : "-"],
                              ].map(function(row, i) {
                                var isChange = row[0] === "Change %";
                                return (
                                  <div key={i} style={{ background:"#f0f3ff", borderRadius:8, padding:"8px 10px" }}>
                                    <div style={{ fontSize:10, color:"#0044cc", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:2 }}>{row[0]}</div>
                                    <div style={{ fontSize:13, fontWeight:700, color: isChange ? (up ? "#1a6a1a" : "#c03030") : "#111" }}>{row[1]}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })() : <div style={{ color:"#aaa" }}>Snapshot unavailable.</div>}

                        <SectionTitle massive={true}>Technical Indicators</SectionTitle>
                        {addlLoading ? (
                          <div style={{ color:"#aaa", fontSize:12 }}>Loading...</div>
                        ) : massiveInfo && massiveInfo.indicators ? (function() {
                          var ind = massiveInfo.indicators;
                          var price = q ? q.price : 0;
                          function vsPrice(v) {
                            if (!v || !price) return "";
                            return price > v ? " (price above)" : " (price below)";
                          }
                          var macd = ind.macd;
                          return (
                            <div>
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:8 }}>
                                {[
                                  ["SMA 50-day",    ind.sma50   != null ? "$" + ind.sma50.toFixed(2)   + vsPrice(ind.sma50)   : "-"],
                                  ["SMA 200-day",   ind.sma200  != null ? "$" + ind.sma200.toFixed(2)  + vsPrice(ind.sma200)  : "-"],
                                  ["EMA 20-day",    ind.ema20   != null ? "$" + ind.ema20.toFixed(2)   + vsPrice(ind.ema20)   : "-"],
                                  ["Weekly SMA 10", ind.wsma10  != null ? "$" + ind.wsma10.toFixed(2)  + vsPrice(ind.wsma10)  : "-"],
                                  ["Weekly SMA 40", ind.wsma40  != null ? "$" + ind.wsma40.toFixed(2)  + vsPrice(ind.wsma40)  : "-"],
                                  ["RSI (14)",      ind.rsi14   != null ? ind.rsi14.toFixed(2) + (ind.rsi14 > 70 ? " -- Overbought" : ind.rsi14 < 30 ? " -- Oversold" : " -- Neutral") : "-"],
                                ].map(function(row, i) {
                                  var isRsi = row[0].includes("RSI");
                                  var rsiColor = isRsi && ind.rsi14 != null ? (ind.rsi14 > 70 ? "#c03030" : ind.rsi14 < 30 ? "#1a6a1a" : "#b88000") : "#111";
                                  return (
                                    <div key={i} style={{ background:"#f0f3ff", borderRadius:8, padding:"8px 10px" }}>
                                      <div style={{ fontSize:10, color:"#0044cc", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:2 }}>{row[0]}</div>
                                      <div style={{ fontSize:12, fontWeight:700, color: isRsi ? rsiColor : "#111" }}>{row[1]}</div>
                                    </div>
                                  );
                                })}
                              </div>
                              {macd && (
                                <div style={{ background:"#f0f3ff", borderRadius:8, padding:"10px 12px" }}>
                                  <div style={{ fontSize:10, color:"#0044cc", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6 }}>MACD (12/26/9)</div>
                                  <div style={{ display:"flex", gap:16 }}>
                                    {[
                                      ["MACD Line",  macd.macd      != null ? macd.macd.toFixed(4)      : "-"],
                                      ["Signal",     macd.signal    != null ? macd.signal.toFixed(4)    : "-"],
                                      ["Histogram",  macd.histogram != null ? macd.histogram.toFixed(4) : "-"],
                                    ].map(function(r, i) {
                                      var isHist = r[0] === "Histogram";
                                      var histColor = isHist && macd.histogram != null ? (macd.histogram > 0 ? "#1a6a1a" : "#c03030") : "#111";
                                      return (
                                        <div key={i}>
                                          <div style={{ fontSize:10, color:"#888" }}>{r[0]}</div>
                                          <div style={{ fontSize:13, fontWeight:700, color: isHist ? histColor : "#111" }}>{r[1]}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })() : <div style={{ color:"#aaa" }}>Technical indicators unavailable.</div>}

                        <SectionTitle massive={true}>Last Trade</SectionTitle>
                        {massiveInfo && massiveInfo.lastTrade ? (function() {
                          var lt = massiveInfo.lastTrade;
                          var tradeTime = lt.time ? new Date(lt.time).toLocaleTimeString() : "-";
                          return (
                            <div style={{ display:"flex", gap:10 }}>
                              {[
                                ["Price",  lt.price != null ? "$" + lt.price.toFixed(2) : "-"],
                                ["Size",   lt.size  != null ? lt.size.toLocaleString() + " shares" : "-"],
                                ["Time",   tradeTime],
                              ].map(function(row, i) {
                                return (
                                  <div key={i} style={{ flex:1, background:"#f0f3ff", borderRadius:8, padding:"8px 10px" }}>
                                    <div style={{ fontSize:10, color:"#0044cc", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:2 }}>{row[0]}</div>
                                    <div style={{ fontSize:13, fontWeight:700, color:"#111" }}>{row[1]}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })() : addlLoading ? null : <div style={{ color:"#aaa" }}>Last trade unavailable.</div>}

                        <SectionTitle massive={true}>Price History (Last 30 Days)</SectionTitle>
                        {massiveInfo && massiveInfo.aggs && massiveInfo.aggs.length > 0 ? (
                          <div style={{ overflowX:"auto" }}>
                            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                              <thead>
                                <tr style={{ borderBottom:"1px solid #e0dbd0" }}>
                                  {["Date","Open","High","Low","Close","Volume","VWAP"].map(function(h) {
                                    return <td key={h} style={{ padding:"4px 8px", color:"#888", fontWeight:600, textAlign: h==="Date" ? "left" : "right" }}>{h}</td>;
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {massiveInfo.aggs.map(function(bar, i) {
                                  var date = new Date(bar.t).toISOString().slice(0,10);
                                  var up   = bar.c >= bar.o;
                                  return (
                                    <tr key={i} style={{ borderBottom:"1px solid #f5f2ec" }}>
                                      <td style={{ padding:"4px 8px", fontWeight:600 }}>{date}</td>
                                      <td style={{ padding:"4px 8px", textAlign:"right", color:"#888" }}>${bar.o.toFixed(2)}</td>
                                      <td style={{ padding:"4px 8px", textAlign:"right", color:"#1a6a1a" }}>${bar.h.toFixed(2)}</td>
                                      <td style={{ padding:"4px 8px", textAlign:"right", color:"#c03030" }}>${bar.l.toFixed(2)}</td>
                                      <td style={{ padding:"4px 8px", textAlign:"right", fontWeight:700, color: up ? "#1a6a1a" : "#c03030" }}>${bar.c.toFixed(2)}</td>
                                      <td style={{ padding:"4px 8px", textAlign:"right", color:"#888" }}>{(bar.v / 1e6).toFixed(1)}M</td>
                                      <td style={{ padding:"4px 8px", textAlign:"right", color:"#555" }}>{bar.vw ? "$" + bar.vw.toFixed(2) : "-"}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : addlLoading ? <div style={{ color:"#aaa", fontSize:12 }}>Loading price history...</div> : <div style={{ color:"#aaa" }}>Price history unavailable.</div>}

                        <SectionTitle massive={true}>Company News</SectionTitle>
                        {addlLoading ? (
                          <div style={{ color:"#aaa", fontSize:12 }}>Loading Massive.com data...</div>
                        ) : massiveInfo && massiveInfo.news && massiveInfo.news.length > 0 ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                            {massiveInfo.news.map(function(article, i) {
                              var daysAgo = article.published_utc ? Math.floor((Date.now() - new Date(article.published_utc).getTime()) / 86400000) : null;
                              return (
                                <div key={i} style={{ padding:"10px 12px", background:"#f9f7f4", borderRadius:8, borderLeft:"3px solid #0066ff" }}>
                                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                                    <a href={article.article_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, fontWeight:600, color:"#111", textDecoration:"none", lineHeight:1.4, flex:1 }}>
                                      {article.title}
                                    </a>
                                    {article.image_url && (
                                      <img src={article.image_url} alt="" style={{ width:60, height:40, objectFit:"cover", borderRadius:4, flexShrink:0 }} />
                                    )}
                                  </div>
                                  <div style={{ display:"flex", gap:8, marginTop:5, fontSize:10, color:"#aaa" }}>
                                    <span style={{ fontWeight:600, color:"#0044cc" }}>{article.publisher && article.publisher.name}</span>
                                    <span>{daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : daysAgo + "d ago"}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : <div style={{ color:"#aaa" }}>News unavailable. Check MASSIVE_KEY in Cloudflare.</div>}

                        <SectionTitle massive={true}>Company Reference</SectionTitle>
                        {massiveInfo && massiveInfo.ticker ? (function() {
                          var t = massiveInfo.ticker;
                          return (
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                              {[
                                ["Listed",         t.list_date || "-"],
                                ["SIC Industry",   t.sic_description || "-"],
                                ["Shares Outstanding", t.share_class_shares_outstanding ? (t.share_class_shares_outstanding / 1e6).toFixed(0) + "M" : "-"],
                                ["Primary Exchange", t.primary_exchange || "-"],
                              ].map(function(row, i) {
                                return (
                                  <div key={i} style={{ background:"#f0f3ff", borderRadius:8, padding:"8px 12px" }}>
                                    <div style={{ fontSize:10, color:"#0044cc", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:2 }}>{row[0]}</div>
                                    <div style={{ fontSize:13, fontWeight:600, color:"#111" }}>{row[1]}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })() : addlLoading ? null : <div style={{ color:"#aaa" }}>Company reference unavailable.</div>}

                        <SectionTitle massive={true}>Dividends</SectionTitle>
                        {massiveInfo && massiveInfo.dividends && massiveInfo.dividends.length > 0 ? (
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                            <thead>
                              <tr style={{ borderBottom:"1px solid #e0dbd0" }}>
                                {["Ex-Date","Pay Date","Amount","Frequency"].map(function(h) {
                                  return <td key={h} style={{ padding:"4px 8px", color:"#888", fontWeight:600 }}>{h}</td>;
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {massiveInfo.dividends.slice(0,6).map(function(d, i) {
                                return (
                                  <tr key={i} style={{ borderBottom:"1px solid #f5f2ec" }}>
                                    <td style={{ padding:"5px 8px" }}>{d.ex_dividend_date || "-"}</td>
                                    <td style={{ padding:"5px 8px", color:"#888" }}>{d.pay_date || "-"}</td>
                                    <td style={{ padding:"5px 8px", fontWeight:700, color:"#1a6a1a" }}>${d.cash_amount ? d.cash_amount.toFixed(4) : "-"}</td>
                                    <td style={{ padding:"5px 8px", color:"#888", textTransform:"capitalize" }}>{d.frequency === 4 ? "Quarterly" : d.frequency === 2 ? "Semi-annual" : d.frequency === 1 ? "Annual" : "-"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : addlLoading ? null : <div style={{ color:"#aaa" }}>No dividend history found.</div>}

                        <SectionTitle massive={true}>10-K Risk Factors (Latest Filing)</SectionTitle>
                        {addlLoading ? (
                          <div style={{ color:"#aaa", fontSize:12 }}>Loading...</div>
                        ) : massiveInfo && massiveInfo.tenK && massiveInfo.tenK.riskFactors ? (
                          <div>
                            {massiveInfo.tenK.filingDate && <div style={{ fontSize:11, color:"#aaa", marginBottom:8 }}>Filing date: {massiveInfo.tenK.filingDate}</div>}
                            <div style={{ fontSize:12, color:"#333", lineHeight:1.8, maxHeight:400, overflowY:"auto", padding:"10px 12px", background:"#f9f7f4", borderRadius:8, whiteSpace:"pre-wrap" }}>
                              {massiveInfo.tenK.riskFactors.slice(0, 3000)}{massiveInfo.tenK.riskFactors.length > 3000 ? "..." : ""}
                            </div>
                          </div>
                        ) : <div style={{ color:"#aaa" }}>Risk factors unavailable. Requires Massive.com Stocks Starter plan.</div>}

                        <SectionTitle massive={true}>10-K Buffett Analysis (AI Summary)</SectionTitle>
                        {addlLoading ? (
                          <div style={{ color:"#aaa", fontSize:12 }}>Loading...</div>
                        ) : massiveInfo && massiveInfo.tenK && (massiveInfo.tenK.business || massiveInfo.tenK.riskFactors) ? (function() {
                          var [buffettSummary, setBuffettSummary] = [null, null];
                          // Use insightCache for buffett summary
                          var cacheKey = "buffett_" + sym;
                          var cached = insightCache[cacheKey];
                          if (!cached) {
                            return (
                              <div>
                                <div style={{ fontSize:12, color:"#555", marginBottom:10 }}>Analyse this 10-K filing from a Warren Buffett perspective -- looking for durable competitive advantages, predictable earnings, strong management, and fair value.</div>
                                <button onClick={function() {
                                  setInsightCache(function(prev) {
                                    var next = Object.assign({}, prev);
                                    next[cacheKey] = "loading";
                                    return next;
                                  });
                                  var bizText   = (massiveInfo.tenK.business    || "").slice(0, 2000);
                                  var riskText  = (massiveInfo.tenK.riskFactors || "").slice(0, 1500);
                                  fetch("/anthropic", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      model: "claude-haiku-4-5-20251001",
                                      max_tokens: 900,
                                      messages: [{ role: "user", content: "You are Warren Buffett analysing a 10-K annual report. For stock " + sym + ", based on the following 10-K excerpts, provide a Buffett-style investment analysis covering: 1. Business Quality (is the business simple and understandable?) 2. Competitive Moat (durable advantages?) 3. Management Quality (evidence from the filing) 4. Financial Strength (any red flags?) 5. Key Risks (from risk factors) 6. Buffett Verdict: Would Buffett buy, hold, or avoid this stock and why? Be concise and direct.

BUSINESS SECTION:
" + bizText + "

RISK FACTORS:
" + riskText }]
                                    })
                                  }).then(function(r) { return r.json(); })
                                    .then(function(d) {
                                      var text = d && d.content && d.content[0] && d.content[0].text;
                                      setInsightCache(function(prev) {
                                        var next = Object.assign({}, prev);
                                        next[cacheKey] = text || "Analysis unavailable.";
                                        return next;
                                      });
                                    }).catch(function() {
                                      setInsightCache(function(prev) {
                                        var next = Object.assign({}, prev);
                                        next[cacheKey] = "Analysis failed. Please try again.";
                                        return next;
                                      });
                                    });
                                }} style={{ padding:"8px 18px", background:"#111", color:"#c8f000", border:"none", borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
                                  Generate Buffett Analysis
                                </button>
                              </div>
                            );
                          }
                          if (cached === "loading") {
                            return (
                              <div style={{ textAlign:"center", padding:"20px 0" }}>
                                <div style={{ fontSize:12, color:"#888", marginBottom:10 }}>Generating Buffett-style analysis...</div>
                                <div style={{ display:"inline-block", width:22, height:22, border:"3px solid #e0dbd0", borderTop:"3px solid " + LIME, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                              </div>
                            );
                          }
                          return (
                            <div style={{ fontSize:13, color:"#333", lineHeight:1.85, padding:"12px 14px", background:"#f9f7f4", borderRadius:8, borderLeft:"3px solid #c8f000" }}>
                              {cached}
                            </div>
                          );
                        })() : <div style={{ color:"#aaa" }}>10-K data required. Available with Massive.com Stocks Starter plan.</div>}

                        <SectionTitle massive={true}>Stock Splits</SectionTitle>
                        {massiveInfo && massiveInfo.splits && massiveInfo.splits.length > 0 ? (
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                            <thead>
                              <tr style={{ borderBottom:"1px solid #e0dbd0" }}>
                                {["Date","Split Ratio"].map(function(h) {
                                  return <td key={h} style={{ padding:"4px 8px", color:"#888", fontWeight:600 }}>{h}</td>;
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {massiveInfo.splits.map(function(s, i) {
                                return (
                                  <tr key={i} style={{ borderBottom:"1px solid #f5f2ec" }}>
                                    <td style={{ padding:"5px 8px", fontWeight:600 }}>{s.execution_date}</td>
                                    <td style={{ padding:"5px 8px" }}>{s.split_to} for {s.split_from}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : addlLoading ? null : <div style={{ color:"#aaa" }}>No stock split history found.</div>}

                      </div>
                    );
                  })()}

                </div>
                  {/* Debug Tab */}
                  {insightTab === "debug" && (function() {
                    var envChecks = [
                      { key: "ANTHROPIC_KEY", note: "Required for AI tabs (Moat, Financial, Technical)" },
                      { key: "MASSIVE_KEY",   note: "Required for Company News, Reference, Dividends, Splits" },
                      { key: "FINNHUB_KEY",   note: "Optional - not currently used" },
                      { key: "FMP_KEY",       note: "Optional - Financial Modeling Prep" },
                      { key: "AV_KEY",        note: "Optional - Alpha Vantage" },
                    ];
                    return (
                      <div style={{ fontSize:12 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#111", marginBottom:12 }}>Debug Panel -- {sym}</div>

                        {/* API Endpoint Status */}
                        <div style={{ fontWeight:700, color:"#555", fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Quick Links -- test in browser</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:16 }}>
                          {[
                            { label: "Yahoo Quote",       url: "/proxy?url=" + encodeURIComponent("https://query1.finance.yahoo.com/v8/finance/chart/" + sym + "?interval=1d&range=1d") },
                            { label: "Yahoo quoteSummary",url: "/proxy?url=" + encodeURIComponent("https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + sym + "?modules=summaryDetail,financialData") },
                            { label: "Massive /massive",  url: "/massive?sym=" + sym },
                            { label: "Anthropic /anthropic (POST)", url: null },
                          ].map(function(item, i) {
                            return (
                              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:"#f5f2ec", borderRadius:6 }}>
                                <span style={{ fontSize:11, fontWeight:600, color:"#555", width:180, flexShrink:0 }}>{item.label}</span>
                                {item.url ? (
                                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#0044cc", wordBreak:"break-all" }}>{item.url}</a>
                                ) : (
                                  <span style={{ fontSize:11, color:"#aaa" }}>POST only -- use browser DevTools</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Cloudflare Env Vars */}
                        <div style={{ fontWeight:700, color:"#555", fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Cloudflare Environment Variables</div>
                        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:16 }}>
                          <thead>
                            <tr style={{ borderBottom:"1px solid #e0dbd0" }}>
                              {["Variable","Purpose","Check"].map(function(h) { return <td key={h} style={{ padding:"4px 8px", color:"#888", fontWeight:600, fontSize:11 }}>{h}</td>; })}
                            </tr>
                          </thead>
                          <tbody>
                            {envChecks.map(function(e, i) {
                              return (
                                <tr key={i} style={{ borderBottom:"1px solid #f5f2ec" }}>
                                  <td style={{ padding:"5px 8px", fontWeight:700, fontFamily:"monospace", color:"#111" }}>{e.key}</td>
                                  <td style={{ padding:"5px 8px", color:"#888" }}>{e.note}</td>
                                  <td style={{ padding:"5px 8px" }}>
                                    <a href={"https://stock.colaboree.com/massive?sym=" + sym} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:"#0044cc" }}>
                                      {e.key === "MASSIVE_KEY" ? "Test ->" : ""}
                                    </a>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* State Snapshot */}
                        <div style={{ fontWeight:700, color:"#555", fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Current State</div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:16 }}>
                          {[
                            ["Quote loaded",      q ? "YES" : "NO",       q ? "#1a6a1a" : "#c03030"],
                            ["Overview loaded",   ov ? "YES" : "NO",      ov ? "#1a6a1a" : "#c03030"],
                            ["EPS History",       epsHistory ? epsHistory.length + " rows" : "null", epsHistory ? "#1a6a1a" : "#c03030"],
                            ["Massive data",      massiveInfo ? "YES (news:" + (massiveInfo.news ? massiveInfo.news.length : 0) + ")" : "null", massiveInfo ? "#1a6a1a" : "#c03030"],
                            ["Moat insight",      insightCache["moat"]     ? "YES" : "pending", insightCache["moat"]     ? "#1a6a1a" : "#888"],
                            ["Financial insight", insightCache["financial"] ? "YES" : "pending", insightCache["financial"] ? "#1a6a1a" : "#888"],
                            ["Technical insight", insightCache["technical"] ? "YES" : "pending", insightCache["technical"] ? "#1a6a1a" : "#888"],
                            ["Addl loading",      addlLoading ? "YES" : "NO", addlLoading ? "#b88000" : "#1a6a1a"],
                          ].map(function(row, i) {
                            return (
                              <div key={i} style={{ padding:"6px 10px", background:"#f9f7f4", borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <span style={{ color:"#888", fontSize:11 }}>{row[0]}</span>
                                <span style={{ fontWeight:700, fontSize:12, color:row[2] }}>{row[1]}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Event Log */}
                        <div style={{ fontWeight:700, color:"#555", fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Event Log</div>
                        {debugLog.length === 0 ? (
                          <div style={{ color:"#aaa", fontSize:12 }}>No events logged yet. Switch to another tab and come back.</div>
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            {debugLog.map(function(entry, i) {
                              return (
                                <div key={i} style={{ background:"#1a1a14", borderRadius:6, padding:"8px 12px" }}>
                                  <div style={{ fontSize:10, color:"#7abd00", marginBottom:4 }}>{entry.time} -- {entry.label}</div>
                                  {entry.data && (
                                    <pre style={{ fontSize:10, color:"#c8f000", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-all", maxHeight:200, overflowY:"auto" }}>{JSON.stringify(entry.data, null, 2)}</pre>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div style={{ marginTop:14, padding:"8px 12px", background:"#fff8e6", borderRadius:6, fontSize:11, color:"#854F0B" }}>
                          Remove or hide this tab before going to production.
                        </div>
                      </div>
                    );
                  })()}

                <div style={{ padding:"6px 16px", background:"#faf8f4", borderTop:"1px solid #f0ede6", fontSize:10, color:"#ccc" }}>
                  AI analysis by Claude (Anthropic). For informational purposes only. Not financial advice.
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

// -- Landing page -------------------------------------------------------------
export default function App() {
  const [input,   setInput]   = useState("");
  const [focused, setFocused] = useState(false);

  function getHash() {
    var h = window.location.hash.replace("#", "").toUpperCase().trim();
    return h || null;
  }
  const [hashSym, setHashSym] = useState(getHash);

  useEffect(function() {
    var onHash = function() { setHashSym(getHash()); };
    window.addEventListener("hashchange", onHash);
    return function() { window.removeEventListener("hashchange", onHash); };
  }, []);

  function go(sym) {
    var s = (sym || input).toUpperCase().trim();
    if (!s) return;
    setFocused(false);
    window.location.hash = s;
  }

  if (hashSym) {
    return (
      <Detail
        sym={hashSym}
        name={NAMES[hashSym] || hashSym}
        onBack={function() { window.location.hash = ""; }}
      />
    );
  }

  const allStocks = Object.keys(NAMES).map(function(k) { return { symbol:k, name:NAMES[k] }; });
  const sugg = (input.length > 0 && focused)
    ? allStocks.filter(function(s) {
        return s.symbol.toLowerCase().startsWith(input.toLowerCase()) ||
               s.name.toLowerCase().includes(input.toLowerCase());
      }).slice(0, 6)
    : [];

  const QUICK = ["AAPL","NVDA","TSLA","MSFT","GOOGL","AMZN"];

  return (
    <div style={{ minHeight:"100vh", background:BG, fontFamily:FONT, position:"relative", overflow:"hidden" }}>

      {/* Grid overlay */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(200,240,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(200,240,0,0.05) 1px,transparent 1px)",
        backgroundSize:"52px 52px",
      }} />

      {/* Top glow */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 70% 50% at 50% -10%,rgba(200,240,0,0.07) 0%,transparent 70%)",
      }} />

      {/* Nav */}
      <nav style={{ position:"relative", zIndex:10, padding:"0 32px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center" }}>
          <span style={{ fontSize:17, fontWeight:800, color:"#ffffff" }}>Colabo</span>
          <span style={{ fontSize:17, fontWeight:800, color:"#ff5c3a" }}>ree</span>
          <span style={{ fontSize:17, fontWeight:700, color:LIME, marginLeft:4 }}>StockInsight</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(14,14,12,0.9)", border:"1px solid rgba(200,240,0,0.28)", borderRadius:20, padding:"5px 16px" }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:LIME, display:"inline-block" }} />
          <span style={{ fontSize:11, fontWeight:600, color:LIME }}>Live Market Data . Yahoo Finance</span>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ position:"relative", zIndex:5, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:70, paddingBottom:80 }}>

        {/* Eyebrow pill */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:BG, border:"1px solid rgba(200,240,0,0.28)", borderRadius:24, padding:"7px 20px", marginBottom:32 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:LIME, display:"inline-block" }} />
          <span style={{ fontSize:11, fontWeight:700, color:LIME, letterSpacing:"0.12em", textTransform:"uppercase" }}>Stock Intelligence Platform</span>
        </div>

        {/* Headline */}
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={{ fontSize:42, fontWeight:900, color:LIME, letterSpacing:"-1.5px" }}>Know your stocks.</div>
          <div style={{ fontSize:20, fontWeight:500, color:"#5a5450", marginTop:6 }}>Before you miss the move.</div>
        </div>

        <p style={{ fontSize:14, color:"#a09a8a", textAlign:"center", maxWidth:500, lineHeight:1.75, margin:"0 0 40px" }}>
          Live prices . P/E ratios . IntrinsicValue(TM) intrinsic estimates . Valuation charts
        </p>

        {/* Search bar */}
        <div style={{ position:"relative", width:"100%", maxWidth:540 }}>
          <div style={{
            display:"flex", alignItems:"center", background:"#1e1e18", borderRadius:50,
            border:"1.5px solid " + (focused ? LIME : "#2c2c26"),
            transition:"border-color 0.2s",
          }}>
            <input
              value={input}
              onChange={function(e) { setInput(e.target.value); }}
              onFocus={function() { setFocused(true); }}
              onBlur={function() { setTimeout(function() { setFocused(false); }, 180); }}
              onKeyDown={function(e) { if (e.key === "Enter") go(); }}
              placeholder="Enter ticker - e.g. AAPL, NVDA, TSLA"
              style={{ flex:1, border:"none", outline:"none", fontSize:14, padding:"15px 20px", color:"#f0ede6", background:"transparent", fontFamily:FONT }}
            />
            <button
              onMouseDown={function(e) { e.preventDefault(); go(); }}
              style={{
                margin:5, padding:"11px 24px", borderRadius:50, border:"none",
                background:input.trim() ? LIME : "#2c2c26",
                color:input.trim() ? "#0e0e0c" : "#6a6460",
                fontWeight:800, fontSize:14, fontFamily:FONT,
                cursor:input.trim() ? "pointer" : "default",
              }}>
              Assess Stock
            </button>
          </div>

          {/* Suggestions dropdown */}
          {sugg.length > 0 && (
            <div style={{ position:"absolute", top:"calc(100% + 8px)", left:0, right:0, background:"#1e1e18", border:"1px solid #2c2c26", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", zIndex:50, overflow:"hidden" }}>
              {sugg.map(function(s) {
                return (
                  <div key={s.symbol}
                    onMouseDown={function(e) { e.preventDefault(); setInput(s.symbol); }}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 18px", cursor:"pointer", borderBottom:"1px solid #2c2c26" }}
                    onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(200,240,0,0.10)"; }}
                    onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontWeight:800, fontSize:12, color:BG, background:LIME, padding:"2px 8px", borderRadius:4, minWidth:48, textAlign:"center" }}>{s.symbol}</span>
                      <span style={{ fontSize:13, color:"#a09a8a" }}>{s.name}</span>
                    </div>
                    <span style={{ color:"#6a6460", fontSize:12 }}>&gt;</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick-pick chips */}
        <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap", justifyContent:"center" }}>
          {QUICK.map(function(t) {
            return (
              <button key={t}
                onMouseDown={function(e) { e.preventDefault(); setInput(t); }}
                onClick={function() { setInput(t); }}
                style={{ padding:"6px 18px", borderRadius:20, border:"1px solid #2c2c26", background:"#1a1a16", fontSize:13, color:"#a09a8a", cursor:"pointer", fontFamily:FONT }}
                onMouseEnter={function(e) { e.currentTarget.style.background=BG; e.currentTarget.style.color=LIME; e.currentTarget.style.borderColor=LIME; }}
                onMouseLeave={function(e) { e.currentTarget.style.background="#1a1a16"; e.currentTarget.style.color="#a09a8a"; e.currentTarget.style.borderColor="#2c2c26"; }}>
                {t}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop:18, fontSize:12, color:"#6a6460" }}>Live data via Yahoo Finance</div>
      </div>

    </div>
  );
}
