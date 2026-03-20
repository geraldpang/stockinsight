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

// Parse AI Insight structured response
function parseAiInsight(text) {
  if (!text) return null;
  function vd(v) {
    if (!v) return 3;
    var vl = v.toLowerCase();
    if (vl.indexOf("strong buy")  >= 0) return 5;
    if (vl.indexOf("buy")         >= 0) return 4;
    if (vl.indexOf("strong avoid")>= 0) return 1;
    if (vl.indexOf("avoid")       >= 0) return 2;
    return 3;
  }
  function m(re) { var r = text.match(re); return r ? r[1].trim() : null; }
  function clean(s){ return s ? s.replace(/\*\*/g,"").replace(/\*/g,"").trim() : s; }
  var verdict = clean(m(/Overall Verdict:\s*(.+)/));
  return {
    body:        text,
    verdict:     verdict,
    dots:        vd(verdict),
    confidence:  clean(m(/Confidence:\s*(.+)/)),
    horizon:     clean(m(/Horizon:\s*(.+)/)),
    risk:        clean(m(/Key Risk:\s*(.+)/)),
    opportunity: clean(m(/Key Opportunity:\s*(.+)/)),
    summary:     clean(m(/AI Insight Summary[^:]*:\s*([\s\S]+)/)),
    fundScore:   m(/Fundamental:\s*([\d.]+)\/5/) ? parseFloat(m(/Fundamental:\s*([\d.]+)\/5/)) : null,
    techScore:   m(/Technical:\s*([\d.]+)\/5/)   ? parseFloat(m(/Technical:\s*([\d.]+)\/5/))   : null,
    sentScore:   m(/Sentiment:\s*([\d.]+)\/5/)   ? parseFloat(m(/Sentiment:\s*([\d.]+)\/5/))   : null,
  };
}

function Detail({ sym, name, onBack }) {
  const [__err, set__err] = useState(null);

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
    if (tabId === "aiinsight") {
      result = parseAiInsight(text) || {};
    } else if (tabId === "moat") {
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
    var aiTabs = ["moat", "financial", "aiinsight"];
    aiTabs.forEach(function(tabId) {
      var prompts = {
        moat: "You are a professional equity research analyst. Analyze the economic moat of " + sym + " (" + (NAMES[sym]||sym) + ") using only well-known business fundamentals and observable financial indicators. Do not fabricate statistics or unsupported claims. Most companies do not have strong moats - scores of 4 or 5 should be rare.\n\nReturn results in EXACTLY this format:\n\nNetwork Effects: X/5\nAssessment Criteria: The product or platform becomes more valuable as more users join.\nResult: One sentence explaining the score.\n\nSwitching Costs: X/5\nAssessment Criteria: Customers face difficulty, cost, or disruption when changing to competitors.\nResult: One sentence explaining the score.\n\nCost Advantage: X/5\nAssessment Criteria: The company can operate at lower cost or higher efficiency than competitors.\nResult: One sentence explaining the score.\n\nIntangible Assets: X/5\nAssessment Criteria: Brand, patents, intellectual property, regulatory licenses, or proprietary technology.\nResult: One sentence explaining the score.\n\nEfficient Scale: X/5\nAssessment Criteria: The market only supports a few profitable players due to high barriers to entry.\nResult: One sentence explaining the score.\n\nEcosystem Lock-in: X/5\nAssessment Criteria: Customers rely on multiple integrated products or services within the company ecosystem.\nResult: One sentence explaining the score.\n\nEconomic Moat Rating: X / 5\n\nExplanation (maximum 100 words): Summarize the main competitive advantages. Focus only on the most important moat drivers. Only assign 4-5 if advantages are clear, durable, and supported by financial performance.",
        financial: "You are a professional equity research analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), assess Financial Strength across these 7 dimensions in concise paragraphs: 1. Revenue Growth Trend 2. Gross Margin Stability 3. Operating Margin Trend 4. Free Cash Flow Consistency 5. Debt Level 6. Share Dilution or Buyback Discipline 7. Earnings Predictability. End with: Financial Strength Classification: Strong / Moderate / Weak and one sentence of reasoning.",
        technical: "You are a professional technical analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), provide a technical analysis covering: Trend (50-day MA, 200-day MA, direction), Momentum (RSI condition, MACD condition), Support and Resistance zones, Volume analysis (confirms move? accumulation or distribution?), Chart Patterns (breakout / consolidation / reversal / double bottom / head and shoulders / flag/pennant / no clear pattern). End with: Technical Rating: Strong Bullish / Bullish / Neutral / Bearish / Strong Bearish and Entry Timing View: Good Entry / Wait for Pullback / Breakout Watch / Avoid for Now. Be specific with price levels where possible.",
        aiinsight: "You are a senior investment analyst. For " + sym + " (" + (NAMES[sym]||sym) + "), provide an AI Insight in EXACTLY this format:\\n\\nFundamental: X/5\\nResult: One sentence.\\n\\nTechnical: X/5\\nResult: One sentence.\\n\\nSentiment: X/5\\nResult: One sentence.\\n\\nOverall Verdict: Buy / Hold / Avoid / Strong Buy / Strong Avoid\\nConfidence: Low / Medium / High\\nHorizon: Short-term (1-3m) / Medium-term (3-12m) / Long-term (12m+)\\n\\nKey Risk: One sentence on the most important downside risk.\\nKey Opportunity: One sentence on the most important upside catalyst.\\n\\nAI Insight Summary (max 80 words): Concise investment conclusion."
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
      <div style={{ background:"#c8f000", padding:"8px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onBack} style={{ border:"1px solid rgba(0,0,0,0.2)", borderRadius:6, padding:"5px 12px", background:"rgba(0,0,0,0.08)", cursor:"pointer", fontSize:12, fontFamily:FONT, color:"#1a1a14", fontWeight:600 }}>
            Back
          </button>
          <span style={{ fontWeight:800, fontSize:15, color:"#1a1a14" }}>
            Colabo<span style={{ color:"#F05A1A" }}>ree</span>{" "}
            <span style={{ color:"#1a1a14" }}>StockInsight</span>
          </span>
          <span style={{ color:"rgba(0,0,0,0.4)", fontSize:12 }}>/ {sym}</span>
        </div>
        <span style={{ fontSize:10, background:"rgba(0,0,0,0.12)", color:"#1a1a14", padding:"3px 12px", borderRadius:20, fontWeight:700, letterSpacing:"0.06em" }}>
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
        <div style={{ padding:"24px 20px", borderRight:"1px solid #111", background:"#1c1c1e" }}>

          <h2 style={{ fontSize:21, fontWeight:900, color:"#f0ede6", margin:"0 0 3px" }}>({sym}) {name}</h2>
          <div style={{ fontSize:13, color:"#555", marginBottom:14 }}>{ov ? ov.exchange : "NASDAQ"}</div>



          {/* Price */}
          {price > 0 ? (
            <div style={{ marginBottom:16 }}>
              <div>
                <span style={{ fontSize:38, fontWeight:900, color:"#f0ede6", letterSpacing:"-1px" }}>
                  {price.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 })}
                </span>
                <span style={{ fontSize:13, color:"#555", marginLeft:8 }}>USD</span>
                <span style={{ fontSize:14, fontWeight:700, marginLeft:10, color:up?"#2a8a2a":"#c03030" }}>{chg}</span>
              </div>
              <div style={{ fontSize:12, color:"#555" }}>Next Earnings Date: <span style={{ color:"#888" }}>{ov && ov.nextEarnings ? ov.nextEarnings : "-"}</span></div>
            </div>
          ) : (
            <div style={{ color:"#aaa", fontSize:14, marginBottom:16 }}>Loading price...</div>
          )}

          {/* Analysis Summary -- 2x2 grid */}
          {(function() {
            function pillColor(text) {
              if (!text) return { bg:"#f5f2ec", fg:"#888", border:"#ddd", dot:"#ccc", dotEmpty:"#e8e4dc" };
              var v = (text+"").toLowerCase().replace(/[^a-z ]/g,"").trim();
              if (v.includes("strong buy"))                                                        return { bg:"#EAF3DE", fg:"#1a6a1a", border:"#7abd00", dot:"#1a6a1a", dotEmpty:"#c8e8c0" };
              if (v.includes("strong avoid"))                                                      return { bg:"#FCEBEB", fg:"#8b0000", border:"#c03030", dot:"#8b0000", dotEmpty:"#f5c0c0" };
              if (v === "buy" || v.startsWith("buy") || v === "strong" || v.startsWith("strong") || v.includes("wide") || v.includes("strong bullish"))               return { bg:"#EAF3DE", fg:"#2a7a2a", border:"#97C459", dot:"#2a7a2a", dotEmpty:"#c8e8c0" };
              if (v.includes("avoid"))                                                             return { bg:"#FCEBEB", fg:"#c03030", border:"#e08080", dot:"#c03030", dotEmpty:"#f5c0c0" };
              if (v.includes("narrow") || v.includes("moderate") || v.includes("bullish"))        return { bg:"#f0f7e6", fg:"#2a7a2a", border:"#9ab800", dot:"#2a7a2a", dotEmpty:"#c8e8c0" };
              if (v.includes("neutral") || v.includes("fairly") || v === "hold" || v.startsWith("hold"))                  return { bg:"#FAEEDA", fg:"#b88000", border:"#d4a800", dot:"#b88000", dotEmpty:"#f5ddb0" };
              if (v.includes("none") || v.includes("weak") || v.includes("bearish") || v.includes("overvalued")) return { bg:"#FCEBEB", fg:"#c03030", border:"#e08080", dot:"#c03030", dotEmpty:"#f5c0c0" };
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
            var moatRating  = moatParsed.classification || null;
            var moatScore   = moatParsed.score          || 0;
            var finRating   = finParsed.classification  || null;
            var finScore    = finParsed.score           || 0;

            var ivLabel       = vals.length > 0 ? (parseFloat(oracle) > price ? "Undervalued" : "Overvalued") : null;
            var ivColors      = ivLabel ? pillColor(ivLabel) : pillColor(null);
            var moatColors    = moatRating  ? pillColor(moatRating)  : pillColor(null);
            var finColors     = finRating   ? pillColor(finRating)   : pillColor(null);
            function darkify(c) {
              // Map light pill colours to dark sidebar equivalents
              var bg = c.bg;
              if (bg === "#EAF3DE" || bg === "#f0f7e6") return Object.assign({}, c, { bg:"#1e2a1e", border:"#2a4020" });
              if (bg === "#FAEEDA") return Object.assign({}, c, { bg:"#2a2010", border:"#3a3010" });
              if (bg === "#FCEBEB") return Object.assign({}, c, { bg:"#2a1e1e", border:"#4a2020" });
              return Object.assign({}, c, { bg:"#252525", border:"#333" });
            }
            function Card(props) {
              var c = darkify(props.colors);
              var loading = !props.value;
              return (
                <div style={{ padding:"10px 12px", background: loading ? "#252525" : c.bg, border:"0.5px solid " + (loading ? "#333" : c.border), borderRadius:8, opacity: loading ? 0.6 : 1 }}>
                  <div style={{ fontSize:10, color: loading ? "#aaa" : c.fg, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:5 }}>{props.label}</div>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color: loading ? "#555" : c.fg }}>{loading ? "..." : props.value}</div>
                      {!loading && props.sublabel && (
                        <div style={{ fontSize:10, fontWeight:600, color:c.fg, marginTop:2, opacity:0.85 }}>{props.sublabel}</div>
                      )}
                    </div>
                    {!loading && props.score > 0 && (
                      <Dots score={props.score} filled={c.dot} empty={c.dotEmpty} />
                    )}
                  </div>
                </div>
              );
            }
            //  Star rating computed inline (before JSX return) 
            var _aiP2 = insightCache["aiinsight"] ? parseAiInsight(insightCache["aiinsight"]) : null;
            var _aiD2 = _aiP2 ? (_aiP2.dots||0) : 0;
            var _msD2 = (typeof window.__msDots!=="undefined") ? window.__msDots : 0;
            var _ivD2 = ivLabel==="Undervalued"?5:ivLabel==="Overvalued"?2:0;
            var _ind2 = massiveInfo&&massiveInfo.indicators?massiveInfo.indicators:null;
            var _mcdH = _ind2?(_ind2.macdHistory||[]):[];
            var _rsiH = _ind2?(_ind2.rsiHistory||[]):[];
            var _mcdT = (function(){if(_mcdH.length<3)return false;var h0=_mcdH[0]&&_mcdH[0].histogram,h1=_mcdH[1]&&_mcdH[1].histogram,h2=_mcdH[2]&&_mcdH[2].histogram;return h0!=null&&h1!=null&&h2!=null&&h0<0&&h0>h1&&h1>h2;})();
            var _wCrs = _ind2&&_ind2.wsma10&&_ind2.wsma40?(_ind2.wsma10<_ind2.wsma40&&Math.abs(_ind2.wsma10-_ind2.wsma40)/_ind2.wsma40<0.05):false;
            var _rBas = _rsiH.length>=3?_rsiH.slice(0,5).every(function(v){return v!=null&&v>=28&&v<=52;}):false;
            var _lBas = (ov||{}).lo52>0&&price>0&&_ind2&&_ind2.rsi14!=null?((price-(ov||{}).lo52)/Math.max(((ov||{}).hi52-(ov||{}).lo52),1)<0.20&&_ind2.rsi14>20&&_ind2.rsi14<45):false;
            var _revC = [_mcdT,_wCrs,_rBas,_lBas].filter(Boolean).length;
            function _toStar(d){return d>=4?1:d===3?0.5:0;}
            var _core = [moatScore,finScore,_ivD2,_msD2,_aiD2].filter(function(d){return d>0;}).reduce(function(s,d){return s+_toStar(d);},0);
            var _bonus= _revC>=3?1:_revC>=1?0.5:0;
            var _star = Math.round(Math.min(5,_core+_bonus)*2)/2;
            var _lbl  = _star>=4.5?"Exceptional":_star>=4?"Strong Buy":_star>=3.5?"Buy":_star>=3?"Hold":_star>=2?"Caution":"Avoid";
            var _col  = _star>=4?"#1a6a1a":_star>=3?"#b88000":"#c03030";
            function _StarRow(rating){
              var spans=[];
              for(var i=1;i<=5;i++){
                var d=rating-(i-1);
                spans.push(<span key={i} style={{fontSize:20,color:d>=0.5?"#f5a623":"#d8d3ca",opacity:d>=0.5&&d<1?0.5:1,lineHeight:1,display:"inline-block"}}>{d>=0.5?String.fromCharCode(9733):String.fromCharCode(9734)}</span>);
              }
              return spans;
            }

            return (
              <div style={{ marginBottom:16 }}>
                {_star>0&&(
                  <div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em" }}>Analysis Rating</span>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <span style={{ display:"inline-flex" }}>{_StarRow(_star)}</span>
                        <span style={{ fontSize:12, fontWeight:500, color:_col }}>{_lbl}&nbsp;&nbsp;{_star.toFixed(1)}&nbsp;/&nbsp;5.0</span>
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ borderTop:"1px solid #2c2c2e", margin:"10px 0 16px" }}></div>
                <div style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600, marginBottom:7 }}>Analysis Summary</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                  <Card label="Economic Moat"    value={moatRating}  score={moatScore}  colors={moatColors} />
                  {(function(){ window.__moatDots=moatScore; window.__finDots=finScore; return null; })()}
                  <Card label="Financial Strength" value={finRating} score={finScore}   colors={finColors} />
                  {(function(){
                    var ivVal = vals.length > 0 ? "$" + oracle : null;
                    var ivScore = ivLabel==="Undervalued"?5:ivLabel==="Overvalued"?2:0;
                    var c = ivVal ? ivColors : pillColor(null);
                    var loading = !ivVal;
                    return (
                      <div style={{ padding:"10px 12px", background:loading?"#252525":darkify(c).bg, border:"0.5px solid "+(loading?"#333":darkify(c).border), borderRadius:8, opacity:loading?0.6:1 }}>
                        <div style={{ fontSize:10, color:loading?"#aaa":c.fg, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:5 }}>Intrinsic Value</div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <div style={{ fontSize:14, fontWeight:700, color:loading?"#ccc":c.fg }}>{loading?"...":ivVal}</div>
                          {!loading && <Dots score={ivScore} filled={c.dot} empty={c.dotEmpty} />}
                        </div>
                        {!loading && ivLabel && <div style={{ fontSize:10, color:c.fg, marginTop:3, opacity:0.85 }}>{ivLabel}</div>}
                      </div>
                    );
                  })()}
                  {(function() {
                    var ind2 = massiveInfo && massiveInfo.indicators ? massiveInfo.indicators : null;
                    var agg2 = massiveInfo && massiveInfo.aggs ? massiveInfo.aggs : [];
                    var p2   = q ? q.price : 0;
                    var hi2  = ov ? ov.hi52 : 0; var lo2 = ov ? ov.lo52 : 0;
                    var pos2 = (hi2 - lo2) > 0 ? (p2 - lo2) / (hi2 - lo2) : 0.5;
                    var vol5b  = agg2.slice(0,5).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(agg2.slice(0,5).length,1);
                    var vol20b = agg2.slice(0,20).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(agg2.slice(0,20).length,1);
                    var vr2 = vol20b > 0 ? vol5b/vol20b : 1;
                    if (!ind2 || !p2) return <Card label="Market Signal" value={null} score={0} colors={pillColor(null)} />;
                    function sc2(key) {
                      var wsmaG = ind2.wsma10 && ind2.wsma40 ? (ind2.wsma10-ind2.wsma40)/ind2.wsma40*100 : 0;
                      var s200g = ind2.sma200 ? (p2-ind2.sma200)/ind2.sma200*100 : 0;
                      var crsG  = ind2.sma50 && ind2.sma200 ? (ind2.sma50-ind2.sma200)/ind2.sma200*100 : 0;
                      var ema2g = ind2.ema20 ? (p2-ind2.ema20)/ind2.ema20*100 : 0;
                      var r2 = ind2.rsi14; var h2 = ind2.macd ? ind2.macd.histogram : null;
                      if (key==="wsma")   return !ind2.wsma10||!ind2.wsma40?3:wsmaG>5?5:wsmaG>1?4:wsmaG>-1?3:wsmaG>-5?2:1;
                      if (key==="sma200") return !ind2.sma200?3:s200g>10?5:s200g>2?4:s200g>-10?3:s200g>-20?2:1;
                      if (key==="cross")  return !ind2.sma50||!ind2.sma200?3:crsG>10?5:crsG>1?4:crsG>-1?3:crsG>-10?2:1;
                      if (key==="pos52")  return pos2>0.80?5:pos2>0.55?4:pos2>0.35?3:pos2>0.15?2:1;
                      if (key==="rsi")    return !r2?3:(r2>=50&&r2<=75)?5:(r2>=40&&r2<50)?4:(r2>=30&&r2<40||r2>75)?3:(r2>=20&&r2<30)?2:1;
                      if (key==="macd")   return !h2?3:h2>0.05?5:h2>0?4:h2>-0.05?3:h2>-0.5?2:1;
                      if (key==="ema20")  return !ind2.ema20?3:ema2g>5?5:ema2g>1?4:ema2g>-5?3:ema2g>-15?2:1;
                      if (key==="vol")    return vr2>1.4?5:vr2>1.1?4:vr2>0.9?3:vr2>0.7?2:1;
                      return 3;
                    }
                    var W2={wsma:25,sma200:15,cross:10,pos52:5,rsi:20,macd:15,ema20:5,vol:5};
                    var keys2=["wsma","sma200","cross","pos52","rsi","macd","ema20","vol"];
                    var base2=0; keys2.forEach(function(k){base2+=(sc2(k)/5)*W2[k];});
                    base2=Math.round(base2);
                    var macdH2=ind2&&ind2.macdHistory||[]; var mT2=macdH2.length>=3&&macdH2[0]&&macdH2[1]&&macdH2[2]&&macdH2[0].histogram<0&&macdH2[0].histogram>macdH2[1].histogram&&macdH2[1].histogram>macdH2[2].histogram;
                    var rsiH2=ind2&&ind2.rsiHistory||[]; var rsiB2=rsiH2.length>=3&&rsiH2.slice(0,5).every(function(v){return v!=null&&v>=28&&v<=52;});
                    var lb2=pos2<0.20&&ind2.rsi14!=null&&ind2.rsi14>20&&ind2.rsi14<45;
                    var rev2=[mT2,rsiB2,lb2].filter(Boolean).length;
                    var bonus2=base2<50?Math.min(rev2*4,12):0;
                    var final2=Math.min(base2+bonus2,base2<50?49:100);
                    var vl2=final2>=70?"Strong Bullish":final2>=55?"Bullish":final2>=40?"Neutral":final2>=25?"Bearish":"Strong Bearish";
                    var showRW=rev2>=2&&final2<50;
                    var sigLabel2=vl2+(showRW?" + Reversal Watch":"")+" ("+final2+")";
                    var msDots=final2>=70?5:final2>=55?4:final2>=40?3:final2>=25?2:1;
                    // Store for star rating access
                    if (typeof window.__msDots === "undefined" || window.__msDots !== msDots) window.__msDots = msDots;
                    if (typeof window.__msScore === "undefined" || window.__msScore !== final2) window.__msScore = final2;
                    return <Card label="Market Signal" value={sigLabel2} score={msDots} sublabel={null} colors={pillColor(vl2)} />;
                  })()}

                  {(function() {
                    var aiP = null; try { aiP = insightCache["aiinsight"] ? parseAiInsight(insightCache["aiinsight"]) : null; } catch(e) { aiP = null; }
                    if (!aiP || !aiP.verdict) return <Card label="AI Insight" value={insightLoading?"Generating...":"-"} score={0} colors={pillColor(null)} />;
                    var vl = aiP.verdict;
                    var aiDots = aiP.dots || 3;
                    var vlc = vl ? vl.toLowerCase().replace(/[^a-z ]/g,"").trim() : "";
                    var aiC = vlc==="strong buy"  ? {bg:"#EAF3DE",border:"#7abd00",fg:"#1a6a1a",dot:"#1a6a1a",dotEmpty:"#c8e8c0"}
                            : vlc==="buy"         ? {bg:"#EAF3DE",border:"#97C459",fg:"#2a7a2a",dot:"#2a7a2a",dotEmpty:"#c8e8c0"}
                            : vlc==="hold"        ? {bg:"#FAEEDA",border:"#d4a800",fg:"#b88000",dot:"#b88000",dotEmpty:"#faeeda"}
                            : vlc==="avoid"       ? {bg:"#FCEBEB",border:"#e08080",fg:"#c03030",dot:"#c03030",dotEmpty:"#f5c0c0"}
                            : vlc==="strong avoid" ? {bg:"#FCEBEB",border:"#c03030",fg:"#8b0000",dot:"#8b0000",dotEmpty:"#f5c0c0"}
                            :                       {bg:"#f5f2ec",border:"#ddd",   fg:"#888",   dot:"#ccc",   dotEmpty:"#e8e4dc"};
                    return (function(){
                      return (
                        <div style={{ padding:"10px 12px", background:aiC.bg, border:"0.5px solid "+aiC.border, borderRadius:8 }}>
                          <div style={{ fontSize:10, color:aiC.fg, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:5 }}>AI Insight</div>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <div style={{ fontSize:14, fontWeight:700, color:aiC.fg }}>{vl}</div>
                            <Dots score={aiDots} filled={aiC.dot} empty={aiC.dotEmpty} />
                          </div>
                          {aiP.confidence && <div style={{ fontSize:10, color:aiC.fg, marginTop:3, opacity:0.85 }}>Conf: {aiP.confidence}</div>}
                        </div>
                      );
                    })();
                  })()}                  
                </div>
                  {/* Reversal Detector */}
                  {(function() {
                    var ind3      = massiveInfo && massiveInfo.indicators ? massiveInfo.indicators : null;
                    var aggs3     = massiveInfo && massiveInfo.aggs        ? massiveInfo.aggs        : [];
                    var price3    = q ? q.price : 0;
                    var ov3       = ov || {};
                    var hi3       = ov3.hi52 || 0; var lo3 = ov3.lo52 || 0;
                    var pos3      = (hi3>0&&hi3-lo3) > 0 ? (price3-lo3)/(hi3-lo3) : 0.5;
                    var rsiH3     = ind3 ? (ind3.rsiHistory  || []) : [];
                    var macdH3    = ind3 ? (ind3.macdHistory || []) : [];

                    // Reversal signal detection
                    var rsiDiv3 = (function() {
                      if (!ind3 || rsiH3.length < 10 || aggs3.length < 10) return false;
                      var rPL = Math.min.apply(null, aggs3.slice(0,5).map(function(a){return a.l||0;}));
                      var pPL = Math.min.apply(null, aggs3.slice(5,10).map(function(a){return a.l||0;}));
                      var rRL = Math.min.apply(null, rsiH3.slice(0,5));
                      var pRL = Math.min.apply(null, rsiH3.slice(5,10));
                      return rPL < pPL && rRL > pRL;
                    })();
                    var macdTurn3 = (function() {
                      if (macdH3.length < 3) return false;
                      var h0=macdH3[0]&&macdH3[0].histogram, h1=macdH3[1]&&macdH3[1].histogram, h2=macdH3[2]&&macdH3[2].histogram;
                      return h0!=null&&h1!=null&&h2!=null&&h0<0&&h0>h1&&h1>h2;
                    })();
                    var weeklyCross3 = ind3&&ind3.wsma10&&ind3.wsma40 ? (ind3.wsma10<ind3.wsma40&&Math.abs(ind3.wsma10-ind3.wsma40)/ind3.wsma40<0.05) : false;
                    var rsiBase3     = rsiH3.length>=3 ? rsiH3.slice(0,5).every(function(v){return v!=null&&v>=28&&v<=52;}) : false;
                    var lowBase3     = pos3<0.20&&ind3&&ind3.rsi14!=null&&ind3.rsi14>20&&ind3.rsi14<45;

                    var revArr3   = [rsiDiv3, macdTurn3, weeklyCross3, rsiBase3, lowBase3];
                    var revCount3 = revArr3.filter(Boolean).length;

                    var isNone   = revCount3 === 0;
                    var isEarly  = revCount3 === 1;
                    var isWatch  = revCount3 >= 2 && revCount3 <= 3;
                    var isStrong = revCount3 >= 4;

                    var bg3, border3, label3Col, pulse3, verdict3, dotFilled3, dotEmpty3, sub3;
                    if (isNone) {
                      bg3="#f5f4f0"; border3="#d8d5ce";
                      label3Col="#999"; pulse3=null; verdict3=null;
                      dotFilled3="#C8C5BE"; dotEmpty3="rgba(200,197,190,0.3)"; sub3=null;
                    } else if (isEarly) {
                      bg3="#fdf5e6"; border3="#FAC775";
                      label3Col="#854F0B"; pulse3="#EF9F27"; verdict3="Early Signal";
                      dotFilled3="#EF9F27"; dotEmpty3="rgba(239,159,39,0.2)";
                      sub3=null;
                    } else if (isWatch) {
                      bg3="#EAF3DE"; border3="#7abd00";
                      label3Col="#173404"; pulse3="#2a7a2a"; verdict3="Reversal Watch";
                      dotFilled3="#2a7a2a"; dotEmpty3="rgba(42,122,42,0.2)";
                      sub3=null;
                    } else {
                      bg3="#EAF3DE"; border3="#1a6a1a";
                      label3Col="#173404"; pulse3="#1a6a1a"; verdict3="Strong Reversal";
                      dotFilled3="#1a6a1a"; dotEmpty3="rgba(26,106,26,0.2)";
                      sub3=null;
                    }

                    var sigNames3 = ["RSI Divergence","MACD Turning","Weekly SMA Cross","RSI Base","52-Wk Low Base"];
                    var activeNames3 = sigNames3.filter(function(_,i){ return revArr3[i]; });
                    if (!isNone) sub3 = activeNames3.join(" | ");

                    return (
                      <div style={{ marginTop:12 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:16, marginBottom:6 }}>Reversal Indicator</div>
                        <div style={{ padding:"9px 12px", background:bg3, borderRadius:8, border:"0.5px solid "+border3 }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              {pulse3 && <span style={{ width:7, height:7, borderRadius:"50%", background:pulse3, flexShrink:0, display:"inline-block" }} />}
                              <span style={{ fontSize:10, fontWeight:600, color:label3Col, textTransform:"uppercase", letterSpacing:"0.07em" }}>Reversal Indicator</span>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ display:"inline-flex", gap:3 }}>
                                {[1,2,3,4,5].map(function(i) {
                                  return <span key={i} style={{ width:8, height:8, borderRadius:"50%", background:i<=revCount3?dotFilled3:dotEmpty3, display:"inline-block" }} />;
                                })}
                              </span>
                              <span style={{ fontSize:11, fontWeight:600, color:label3Col, background:isNone?"#e8e6e0":dotFilled3+"33", padding:"2px 10px", borderRadius:20, border:"0.5px solid "+(isNone?"#c8c5be":border3) }}>
                                {verdict3 || "No signals"}
                              </span>
                            </div>
                          </div>
                          {!isNone && (
                            <div style={{ marginTop:6, paddingTop:6, borderTop:"0.5px solid "+border3+"44", display:"flex", flexWrap:"wrap", gap:4 }}>
                              {sigNames3.map(function(name, i) {
                                var active = revArr3[i];
                                return (
                                  <span key={i} style={{
                                    fontSize:10, fontWeight:500,
                                    color:active?label3Col:"#bbb",
                                    background:active?dotFilled3+"22":"transparent",
                                    border:"0.5px solid "+(active?dotFilled3+"88":"#e0dbd0"),
                                    padding:"2px 7px", borderRadius:10,
                                    textDecoration:active?"none":"none",
                                    opacity:active?1:0.5,
                                  }}>
                                    {active && <span style={{marginRight:3}}>&#10003;</span>}{name}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            );
          })()}

          {/* Analysis Rating */}
          {(function() {
            // Gather scores from all available sources -- recompute locally
            var mP2    = parsedInsights["moat"]      || {};
            var fP2    = parsedInsights["financial"]  || {};
            var ms2    = (typeof window.__moatDots !== 'undefined') ? window.__moatDots : (mP2.score||0);
            var fs2    = (typeof window.__finDots  !== 'undefined') ? window.__finDots  : (fP2.score||0);

            // IV dots: Undervalued=5, Overvalued=2, null=0
            var price2x2 = q ? q.price : 0;
            var oracle2  = (function() {
              var ov2x = ov || {};
              var vals2x = [];
              var eps0x = ov2x.epsForward || ov2x.epsTTM || 0;
              if (eps0x > 0) {
                var g = Math.min(ov2x.ltGrowth || 0.08, 0.25);
                var d = 0.09;
                var total = 0; var fcf = eps0x;
                for (var y = 1; y <= 10; y++) { fcf *= (1+g); total += fcf/Math.pow(1+d,y); }
                total += fcf*12/Math.pow(1+d,10);
                vals2x.push(Math.round(total*10)/10);
              }
              return vals2x.length > 0 ? vals2x[0] : 0;
            })();
            var ivD2 = oracle2 > 0 ? (oracle2 > price2x2 ? 5 : 2) : 0;

            // Market Signal dots: read from insightCache via signal score
            // We need to recompute from ind2 -- use ov and massiveInfo
            var ind2x = massiveInfo && massiveInfo.indicators ? massiveInfo.indicators : null;
            var aggs2x = massiveInfo && massiveInfo.aggs ? massiveInfo.aggs : [];
            var price2x = q ? q.price : 0;
            var vol5x  = aggs2x.slice(0,5).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(aggs2x.slice(0,5).length,1);
            var vol20x = aggs2x.slice(0,20).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(aggs2x.slice(0,20).length,1);
            var hi52x  = (ov||{}).hi52||0; var lo52x = (ov||{}).lo52||0;
            var pos52x = (hi52x-lo52x)>0?(price2x-lo52x)/(hi52x-lo52x):0.5;
            // Simple market signal proxy from available indicators
            var rsi2x  = ind2x ? ind2x.rsi14 : null;
            var sma50x = ind2x ? ind2x.sma50 : null;
            var sma200x= ind2x ? ind2x.sma200: null;
            var msProxy = 0; var msCount = 0;
            if (sma50x&&sma200x&&price2x) { msProxy += price2x>sma200x?1:0; msCount++; }
            if (sma50x&&sma200x) { msProxy += sma50x>sma200x?1:0; msCount++; }
            if (rsi2x!=null) { msProxy += rsi2x>=50&&rsi2x<=75?1:rsi2x>=40?0.5:0; msCount++; }
            var msScore2 = msCount>0 ? Math.round((msProxy/msCount)*4)+1 : 3;
            var msD2 = (typeof window.__msDots !== "undefined") ? window.__msDots : Math.max(1,Math.min(5,msScore2));

            // AI Insight dots
            var aiP2  = insightCache["aiinsight"] ? parseAiInsight(insightCache["aiinsight"]) : null;
            var aiD2  = aiP2 ? (aiP2.dots||3) : 0;

            // Reversal bonus dots
            var ind3x = ind2x;
            var rsiH3x = ind3x?(ind3x.rsiHistory||[]):[];
            var macdH3x= ind3x?(ind3x.macdHistory||[]):[];
            var ov3x   = ov||{};
            var hi3x   = ov3x.hi52||0; var lo3x=ov3x.lo52||0;
            var pos3x  = (hi3x>0&&hi3x-lo3x>0)?(price2x-lo3x)/(hi3x-lo3x):0.5;
            var macdTx = (function(){
              if(macdH3x.length<3) return false;
              var h0=macdH3x[0]&&macdH3x[0].histogram,h1=macdH3x[1]&&macdH3x[1].histogram,h2=macdH3x[2]&&macdH3x[2].histogram;
              return h0!=null&&h1!=null&&h2!=null&&h0<0&&h0>h1&&h1>h2;
            })();
            var wCross = ind3x&&ind3x.wsma10&&ind3x.wsma40?(ind3x.wsma10<ind3x.wsma40&&Math.abs(ind3x.wsma10-ind3x.wsma40)/ind3x.wsma40<0.05):false;
            var rBase  = rsiH3x.length>=3?rsiH3x.slice(0,5).every(function(v){return v!=null&&v>=28&&v<=52;}):false;
            var lBase  = pos3x<0.20&&ind3x&&ind3x.rsi14!=null&&ind3x.rsi14>20&&ind3x.rsi14<45;
            var revC2  = [macdTx,wCross,rBase,lBase].filter(Boolean).length;
            var revD2  = revC2>=4?5:revC2>=2?3:0;

            //  Star calculation 
            // Core inputs (each contributes up to 1 star): moat, financial, IV, marketSignal, AI
            // Reversal is bonus (up to 1 star)
            // Core: each signal = 1 star (4-5 dots), 0.5 star (3 dots), 0 (1-2 dots)
            function toStar(dots) {
              if (dots>=4) return 1;
              if (dots===3) return 0.5;
              return 0;
            }
            // Sum stars directly  max 5 core signals = max 5 stars
            var coreInputs = [ms2, fs2, ivD2, msD2, aiD2].filter(function(d){return d>0;});
            var coreStars  = coreInputs.reduce(function(s,d){return s+toStar(d);}, 0);

            // Reversal bonus: 1-2 signals = +0.5, 3-5 signals = +1.0
            var bonusStar  = revC2>=3 ? 1 : revC2>=1 ? 0.5 : 0;
            var rawStars   = Math.min(5, coreStars + bonusStar);
            // Round to nearest 0.5
            var starRating = Math.round(rawStars * 2) / 2;

            // Render star display
            function StarDisplay(props) {
              var stars = [];
              for (var i=1; i<=5; i++) {
                var diff = props.rating - (i-1);
                var fill = diff>=1?"full":diff>=0.5?"half":"empty";
                stars.push(
                  <span key={i} style={{fontSize:22,lineHeight:1,color:fill==="empty"?"#ddd":"#f5a623",display:"inline-block",marginRight:1,opacity:fill==="half"?0.5:1}}>
                    {fill==="empty"?String.fromCharCode(9734):String.fromCharCode(9733)}
                  </span>
                );
              }
              return <span>{stars}</span>;
            }

            var ratingLabel = starRating>=4.5?"Exceptional":starRating>=4?"Strong Buy":starRating>=3.5?"Buy":starRating>=3?"Hold":starRating>=2?"Caution":"Avoid";
            var ratingCol   = starRating>=4?"#1a6a1a":starRating>=3?"#b88000":"#c03030";
            var ratingBg    = starRating>=4?"#EAF3DE":starRating>=3?"#FAEEDA":"#FCEBEB";
            var ratingBd    = starRating>=4?"#7abd00":starRating>=3?"#d4a800":"#e08080";

            // Store rating for display above Analysis Summary
            window.__starRating  = starRating;
            window.__ratingLabel = ratingLabel;
            window.__ratingCol   = ratingCol;
            return null;
          })()}

          <div style={{ borderTop:"1px solid #2c2c2e", margin:"12px 0" }}></div>
          {/* Valuation Section */}
          <div style={{ background:"#252525", border:"1px solid #2c2c2e", borderRadius:12, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Valuation</div>
            {valRows.length > 0 ? (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <tbody>
                  {valRows.map(function(row, i) {
                    return (
                      <tr key={i} style={{ borderBottom:i < valRows.length-1 ? "1px solid #2c2c2e" : "none" }}>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#888", width:"34%", lineHeight:1.4 }}>{row[0]}</td>
                        <td style={{ padding:"6px 8px", fontSize:13, fontWeight:700, color:"#ddd", width:"16%" }}>{row[1]}</td>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#555", width:"34%", lineHeight:1.4 }}>{row[2]}</td>
                        <td style={{ padding:"6px 0", fontSize:13, fontWeight:700, color:"#ddd", width:"16%", textAlign:"right" }}>{row[3]}</td>
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
          <div style={{ background:"#252525", border:"1px solid #2c2c2e", borderRadius:12, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Financial Health</div>
            {healthRows.length > 0 ? (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <tbody>
                  {healthRows.map(function(row, i) {
                    return (
                      <tr key={i} style={{ borderBottom:i < healthRows.length-1 ? "1px solid #2c2c2e" : "none" }}>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#888", width:"34%", lineHeight:1.4 }}>{row[0]}</td>
                        <td style={{ padding:"6px 8px", fontSize:13, fontWeight:700, color:"#ddd", width:"16%" }}>{row[1]}</td>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#555", width:"34%", lineHeight:1.4 }}>{row[2]}</td>
                        <td style={{ padding:"6px 0", fontSize:13, fontWeight:700, color:"#ddd", width:"16%", textAlign:"right" }}>{row[3]}</td>
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
          <div style={{ background:"#252525", border:"1px solid #2c2c2e", borderRadius:12, padding:"16px" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Growth & Profile</div>
            {growthRows.length > 0 ? (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <tbody>
                  {growthRows.map(function(row, i) {
                    return (
                      <tr key={i} style={{ borderBottom:i < growthRows.length-1 ? "1px solid #2c2c2e" : "none" }}>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#888", width:"34%", lineHeight:1.4 }}>{row[0]}</td>
                        <td style={{ padding:"6px 8px", fontSize:13, fontWeight:700, color:"#ddd", width:"16%" }}>{row[1]}</td>
                        <td style={{ padding:"6px 0", fontSize:11, color:"#555", width:"34%", lineHeight:1.4 }}>{row[2]}</td>
                        <td style={{ padding:"6px 0", fontSize:13, fontWeight:700, color:"#ddd", width:"16%", textAlign:"right" }}>{row[3]}</td>
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

          {/* 5-Tab Insight Panel */}
          {(function() {
            var TABS = [
              { id:"business",  label:"Business Overview" },
              { id:"moat",      label:"Economic MOAT" },
              { id:"intrinsic", label:"Intrinsic Value" },
              { id:"financial", label:"Financial Strength" },
              { id:"signal",    label:"Market Signal" },
              { id:"aiinsight", label:"AI Insight" },
              { id:"addlinfo",  label:"Additional Information" },
              { id:"debug",     label:"Debug" },
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
                <div style={{ padding:"20px 22px", background:"#fff" }}>

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
                      {!tabContent && insightTab !== "business" && insightTab !== "addlinfo" && insightTab !== "debug" && insightTab !== "signal" && insightTab !== "aiinsight" && (
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
                      {insightTab === "technical" && (function() {
                        var ind  = massiveInfo && massiveInfo.indicators ? massiveInfo.indicators : null;
                        var aggs = massiveInfo && massiveInfo.aggs        ? massiveInfo.aggs        : [];
                        var price = q ? q.price : 0;
                        var hi52  = ov ? ov.hi52 : 0;
                        var lo52  = ov ? ov.lo52 : 0;
                        var rng52 = hi52 - lo52;
                        var pos52 = rng52 > 0 ? (price - lo52) / rng52 : 0.5;

                        // ---- reversal detection helpers (need history arrays) ----
                        var rsiHist  = ind ? (ind.rsiHistory  || []) : [];
                        var macdHist = ind ? (ind.macdHistory || []) : [];

                        function detectRsiDivergence() {
                          if (rsiHist.length < 10 || aggs.length < 10) return false;
                          var rPriceLow = Math.min.apply(null, aggs.slice(0,5).map(function(a){return a.l;}));
                          var pPriceLow = Math.min.apply(null, aggs.slice(5,10).map(function(a){return a.l;}));
                          var rRsiLow   = Math.min.apply(null, rsiHist.slice(0,5));
                          var pRsiLow   = Math.min.apply(null, rsiHist.slice(5,10));
                          return rPriceLow < pPriceLow && rRsiLow > pRsiLow;
                        }
                        function detectMacdTurning() {
                          if (macdHist.length < 3) return false;
                          var h0 = macdHist[0] && macdHist[0].histogram;
                          var h1 = macdHist[1] && macdHist[1].histogram;
                          var h2 = macdHist[2] && macdHist[2].histogram;
                          return h0 != null && h1 != null && h2 != null && h0 < 0 && h0 > h1 && h1 > h2;
                        }
                        function detectWeeklyCross() {
                          if (!ind || !ind.wsma10 || !ind.wsma40) return false;
                          var gap = Math.abs(ind.wsma10 - ind.wsma40) / ind.wsma40;
                          return ind.wsma10 < ind.wsma40 && gap < 0.05;
                        }
                        function detectRsiBase() {
                          if (rsiHist.length < 3) return false;
                          return rsiHist.slice(0,5).every(function(v){ return v != null && v >= 28 && v <= 52; });
                        }
                        function detect52wkBase() {
                          return pos52 < 0.20 && ind && ind.rsi14 != null && ind.rsi14 > 20 && ind.rsi14 < 45;
                        }

                        var macdTurning  = detectMacdTurning();
                        var rsiDivergence = detectRsiDivergence();
                        var weeklyCross  = detectWeeklyCross();
                        var rsiBase      = detectRsiBase();
                        var lowBase      = detect52wkBase();
                        var revSignals   = [
                          { label:"RSI Divergence",         active:rsiDivergence, note:"Price new low but RSI higher low" },
                          { label:"MACD Histogram Turning", active:macdTurning,   note:"Histogram negative but rising 3+ sessions" },
                          { label:"Weekly SMA Cross Ahead", active:weeklyCross,   note:"WSMA10 within 5% of WSMA40" },
                          { label:"RSI Base Forming",       active:rsiBase,       note:"RSI stabilising in 28-52 range" },
                          { label:"52-Wk Low Base",         active:lowBase,       note:"Price in bottom 20% of range, RSI steadying" },
                        ];
                        var revCount = revSignals.filter(function(r){ return r.active; }).length;

                        // ---- volume ratio from aggs ----
                        var vol5  = aggs.slice(0,5).reduce(function(s,a){ return s + (a.v||0); }, 0) / Math.max(aggs.slice(0,5).length,1);
                        var vol20 = aggs.slice(0,20).reduce(function(s,a){ return s + (a.v||0); }, 0) / Math.max(aggs.slice(0,20).length,1);
                        var volRatio = vol20 > 0 ? vol5 / vol20 : 1;

                        // ---- score each signal (1-5 scale, weekly/monthly relaxed thresholds) ----
                        function sigScore(key) {
                          if (!ind || !price) return 3;
                          var p = price, r = ind.rsi14, h = ind.macd ? ind.macd.histogram : null;
                          var wsmaGap, s200gap, crossGap, ema20gap, pct;
                          if (key === "wsma") {
                            if (!ind.wsma10 || !ind.wsma40) return 3;
                            wsmaGap = (ind.wsma10 - ind.wsma40) / ind.wsma40 * 100;
                            return wsmaGap > 5 ? 5 : wsmaGap > 1 ? 4 : wsmaGap > -1 ? 3 : wsmaGap > -5 ? 2 : 1;
                          }
                          if (key === "sma200") {
                            if (!ind.sma200) return 3;
                            s200gap = (p - ind.sma200) / ind.sma200 * 100;
                            return s200gap > 10 ? 5 : s200gap > 2 ? 4 : s200gap > -10 ? 3 : s200gap > -20 ? 2 : 1;
                          }
                          if (key === "cross") {
                            if (!ind.sma50 || !ind.sma200) return 3;
                            crossGap = (ind.sma50 - ind.sma200) / ind.sma200 * 100;
                            return crossGap > 10 ? 5 : crossGap > 1 ? 4 : crossGap > -1 ? 3 : crossGap > -10 ? 2 : 1;
                          }
                          if (key === "pos52") {
                            return pos52 > 0.80 ? 5 : pos52 > 0.55 ? 4 : pos52 > 0.35 ? 3 : pos52 > 0.15 ? 2 : 1;
                          }
                          if (key === "rsi") {
                            if (r == null) return 3;
                            return (r >= 50 && r <= 75) ? 5 : (r >= 40 && r < 50) ? 4 : (r >= 30 && r < 40) || r > 75 ? 3 : (r >= 20 && r < 30) ? 2 : 1;
                          }
                          if (key === "macd") {
                            if (h == null) return 3;
                            if (h > 0.05) return 5;
                            if (h > 0)    return 4;
                            if (h > -0.05 || macdTurning) return 3;
                            if (h > -0.50) return 2;
                            return 1;
                          }
                          if (key === "ema20") {
                            if (!ind.ema20) return 3;
                            ema20gap = (p - ind.ema20) / ind.ema20 * 100;
                            return ema20gap > 5 ? 5 : ema20gap > 1 ? 4 : ema20gap > -5 ? 3 : ema20gap > -15 ? 2 : 1;
                          }
                          if (key === "vol") {
                            return volRatio > 1.4 ? 5 : volRatio > 1.1 ? 4 : volRatio > 0.9 ? 3 : volRatio > 0.7 ? 2 : 1;
                          }
                          return 3;
                        }

                        var W = { wsma:25, sma200:15, cross:10, pos52:5, rsi:20, macd:15, ema20:5, vol:5 };
                        var trendKeys    = ["wsma","sma200","cross","pos52"];
                        var momentumKeys = ["rsi","macd","ema20","vol"];
                        var allKeys      = trendKeys.concat(momentumKeys);

                        var scores = {};
                        allKeys.forEach(function(k){ scores[k] = sigScore(k); });

                        var baseRaw = 0;
                        allKeys.forEach(function(k){ baseRaw += (scores[k]/5) * W[k]; });
                        var base   = Math.round(baseRaw);
                        var bonusPer = 4;
                        var bonusRaw = revCount * bonusPer;
                        var bonus    = base < 50 ? Math.min(bonusRaw, 12) : 0;
                        var finalScore = Math.min(base + bonus, base < 50 ? 49 : 100);

                        var trendRaw = trendKeys.reduce(function(s,k){ return s + scores[k]; }, 0);
                        var momRaw   = momentumKeys.reduce(function(s,k){ return s + scores[k]; }, 0);
                        var trendScore = Math.round((trendRaw / (trendKeys.length * 5)) * 100);
                        var momScore   = Math.round((momRaw   / (momentumKeys.length * 5)) * 100);

                        var showRevWatch = revCount >= 2 && finalScore < 50;

                        function getVerdict(s) {
                          return s >= 70 ? "Strong Bullish" : s >= 55 ? "Bullish" : s >= 40 ? "Neutral" : s >= 25 ? "Bearish" : "Strong Bearish";
                        }
                        var verdict = getVerdict(finalScore);

                        var vColMap = { "Strong Bullish":"#1a6a1a", "Bullish":"#2a7a2a", "Neutral":"#b88000", "Bearish":"#c03030", "Strong Bearish":"#8b0000" };
                        var vBgMap  = { "Strong Bullish":"#EAF3DE", "Bullish":"#EAF3DE",  "Neutral":"#FAEEDA",  "Bearish":"#FCEBEB",  "Strong Bearish":"#FCEBEB" };
                        var vDotMap = { "Strong Bullish":5, "Bullish":4, "Neutral":3, "Bearish":2, "Strong Bearish":1 };
                        var vCol = vColMap[verdict]; var vBg = vBgMap[verdict]; var vDot = vDotMap[verdict];

                        var scoreColMap = { 5:"#1a6a1a", 4:"#2a7a2a", 3:"#b88000", 2:"#c03030", 1:"#8b0000" };
                        var scoreEmMap  = { 5:"#c8e8c0", 4:"#c8e8c0", 3:"#faeeda", 2:"#f5c0c0", 1:"#f5c0c0" };
                        var scoreLbMap  = { 5:"Strong Bullish", 4:"Bullish", 3:"Neutral", 2:"Bearish", 1:"Strong Bearish" };

                        function Dots(props) {
                          var col = scoreColMap[props.score] || "#b88000";
                          var em  = scoreEmMap[props.score]  || "#faeeda";
                          var d = [];
                          for (var i = 1; i <= 5; i++) {
                            d.push(<span key={i} style={{ display:"inline-block", width:props.sz||8, height:props.sz||8, borderRadius:"50%", background: i <= props.score ? col : em, marginRight:2 }} />);
                          }
                          return <span style={{ display:"inline-flex", alignItems:"center" }}>{d}</span>;
                        }

                        var SIGNALS = [
                          { key:"wsma",  cat:"Trend",    w:25, label:"Weekly SMA10 vs 40",  val: ind && ind.wsma10 && ind.wsma40 ? "$" + ind.wsma10.toFixed(2) + " vs $" + ind.wsma40.toFixed(2) : "-",        note:"Primary signal" },
                          { key:"sma200",cat:"Trend",    w:15, label:"Price vs SMA 200",    val: ind && ind.sma200 ? "$" + price.toFixed(2) + " vs $" + ind.sma200.toFixed(2) : "-",                             note:"Long-term trend" },
                          { key:"cross", cat:"Trend",    w:10, label:"Golden/Death Cross",  val: ind && ind.sma50 && ind.sma200 ? (ind.sma50 > ind.sma200 ? "Golden Cross" : "Death Cross") + " ($" + (ind.sma50||0).toFixed(2) + " vs $" + (ind.sma200||0).toFixed(2) + ")" : "-", note:"Regime" },
                          { key:"pos52", cat:"Trend",    w:5,  label:"52-Week Position",    val: hi52 > 0 ? (pos52*100).toFixed(0) + "% of range ($" + lo52.toFixed(2) + " - $" + hi52.toFixed(2) + ")" : "-", note:"Relative strength" },
                          { key:"rsi",   cat:"Momentum", w:20, label:"RSI (14-day)",        val: ind && ind.rsi14 != null ? ind.rsi14.toFixed(1) : "-",                                                           note:"Best momentum" },
                          { key:"macd",  cat:"Momentum", w:15, label:"MACD Histogram",      val: ind && ind.macd && ind.macd.histogram != null ? ind.macd.histogram.toFixed(4) + (macdTurning ? " (turning)" : "") : "-", note:"Reversal detection" },
                          { key:"ema20", cat:"Momentum", w:5,  label:"Price vs EMA 20",     val: ind && ind.ema20 ? "$" + price.toFixed(2) + " vs $" + ind.ema20.toFixed(2) : "-",                               note:"Near-term" },
                          { key:"vol",   cat:"Momentum", w:5,  label:"Volume Ratio 5/20d",  val: aggs.length > 0 ? volRatio.toFixed(2) + "x avg volume" : "-",                                                   note:"New signal" },
                        ];

                        var trendSigs = SIGNALS.filter(function(s){ return s.cat === "Trend"; });
                        var momSigs   = SIGNALS.filter(function(s){ return s.cat === "Momentum"; });

                        // ---- if we have no Massive data, show AI-only fallback ----
                        var hasMassive = ind && price > 0;

                        // ---- AI section (from Haiku) ----
                        var parsed = parseTechnical(tabContent);
                        var aiRating = parsed ? parsed.rating : null;
                        var aiEntry  = parsed ? parsed.entry  : null;
                        var aiBody   = parsed ? parsed.body   : tabContent;
                        var aiRatingColors = { "Strong Bullish":["#1a6a1a","#EAF3DE","#7abd00"], "Bullish":["#2a7a2a","#EAF3DE","#9ab800"], "Neutral":["#b88000","#FAEEDA","#d4a800"], "Bearish":["#c03030","#FCEBEB","#e08080"], "Strong Bearish":["#8b0000","#FCEBEB","#c03030"] };
                        var aiColors = aiRating && aiRatingColors[aiRating] ? aiRatingColors[aiRating] : ["#888","#f5f5f5","#ccc"];
                        var aiDotScore = aiRating === "Strong Bullish" ? 5 : aiRating === "Bullish" ? 4 : aiRating === "Neutral" ? 3 : aiRating === "Bearish" ? 2 : aiRating === "Strong Bearish" ? 1 : 3;

                        return (
                          <div>
                            {/* AI verdict banner */}
                            {aiRating && (
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:aiColors[1], borderRadius:8, marginBottom:14, border:"0.5px solid " + aiColors[2] }}>
                                <div>
                                  <div style={{ fontSize:10, color:aiColors[0], fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Technical Rating (AI)</div>
                                  <div style={{ fontSize:15, fontWeight:700, color:aiColors[0] }}>{aiRating}</div>
                                  {aiEntry && <div style={{ fontSize:11, color:"#555", marginTop:2 }}>Entry: {aiEntry}</div>}
                                </div>
                                <Dots score={aiDotScore} sz={8} />
                              </div>
                            )}

                            {/* AI narrative */}
                            {aiBody && (
                              <div style={{ fontSize:13, color:"#333", lineHeight:1.85, marginBottom:16 }}>
                                {aiBody.split("Technical Rating:")[0].split("Entry Timing:")[0].trim()}
                              </div>
                            )}

                            {/* Market Signal block */}
                            {hasMassive ? (
                              <div style={{ border:"0.5px solid #e0dbd0", borderRadius:10, overflow:"hidden", marginBottom:4 }}>
                                <div style={{ padding:"7px 14px", background:"#1a1a14", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                  <span style={{ fontSize:11, fontWeight:700, color:"#c8f000", textTransform:"uppercase", letterSpacing:"0.07em" }}>Market Signal</span>
                                  <span style={{ fontSize:10, color:"#7abd00" }}>Weekly/monthly horizon / Massive.com</span>
                                </div>
                                <div style={{ padding:"14px 16px", background:"#fff" }}>

                                  {/* Overall score row */}
                                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:vBg, borderRadius:9, border:"0.5px solid " + vCol, marginBottom:14 }}>
                                    <div style={{ width:56, height:56, borderRadius:9, background:vCol, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", flexShrink:0 }}>
                                      <span style={{ fontSize:21, fontWeight:900, color:"#fff", lineHeight:1 }}>{finalScore}</span>
                                      <span style={{ fontSize:9, color:"rgba(255,255,255,0.65)" }}>/100</span>
                                    </div>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:10, color:vCol, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:2 }}>Overall Signal</div>
                                      <div style={{ fontSize:17, fontWeight:900, color:vCol, marginBottom:4 }}>{verdict}</div>
                                      {showRevWatch && (
                                        <div style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, color:"#633806", background:"#FAEEDA", padding:"2px 8px", borderRadius:10, border:"0.5px solid #EF9F27" }}>
                                          <span style={{ width:6, height:6, borderRadius:"50%", background:"#BA7517", display:"inline-block" }} />
                                          Reversal Watch &mdash; {revCount} signals
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ display:"flex", gap:7, flexShrink:0 }}>
                                      <div style={{ textAlign:"center", padding:"5px 10px", background:"rgba(255,255,255,0.45)", borderRadius:7 }}>
                                        <div style={{ fontSize:9, color:vCol }}>Trend</div>
                                        <div style={{ fontSize:15, fontWeight:700, color:vCol }}>{trendScore}</div>
                                      </div>
                                      <div style={{ textAlign:"center", padding:"5px 10px", background:"rgba(255,255,255,0.45)", borderRadius:7 }}>
                                        <div style={{ fontSize:9, color:vCol }}>Momentum</div>
                                        <div style={{ fontSize:15, fontWeight:700, color:vCol }}>{momScore}</div>
                                      </div>
                                    </div>
                                    <Dots score={vDot} sz={9} />
                                  </div>

                                  {/* Trend signals */}
                                  <div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                                    Trend &amp; Price Action <span style={{ fontWeight:400, color:"#bbb" }}>55%</span>
                                  </div>
                                  {trendSigs.map(function(sig) {
                                    var sc = scores[sig.key];
                                    var col = scoreColMap[sc]; var lbl = scoreLbMap[sc];
                                    var pts = Math.round((sc/5)*sig.w);
                                    return (
                                      <div key={sig.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"0.5px solid #f5f2ec" }}>
                                        <div style={{ flex:1, minWidth:0 }}>
                                          <div style={{ fontSize:11, fontWeight:700, color:"#111", marginBottom:1 }}>{sig.label}</div>
                                          <div style={{ fontSize:10, color:"#999" }}>{sig.val}</div>
                                        </div>
                                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, flexShrink:0 }}>
                                          <Dots score={sc} sz={7} />
                                          <span style={{ fontSize:9, fontWeight:600, color:col }}>{lbl}</span>
                                          <span style={{ fontSize:9, color:"#bbb" }}>{pts}/{sig.w}pts</span>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Momentum signals */}
                                  <div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8, marginTop:14, paddingTop:12, borderTop:"0.5px solid #f0ede6" }}>
                                    Momentum <span style={{ fontWeight:400, color:"#bbb" }}>45%</span>
                                  </div>
                                  {momSigs.map(function(sig) {
                                    var sc = scores[sig.key];
                                    var col = scoreColMap[sc]; var lbl = scoreLbMap[sc];
                                    var pts = Math.round((sc/5)*sig.w);
                                    var isNew = sig.key === "vol";
                                    return (
                                      <div key={sig.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"0.5px solid #f5f2ec" }}>
                                        <div style={{ flex:1, minWidth:0 }}>
                                          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:1 }}>
                                            <span style={{ fontSize:11, fontWeight:700, color:"#111" }}>{sig.label}</span>
                                            {isNew && <span style={{ fontSize:9, fontWeight:600, color:"#0C447C", background:"#E6F1FB", padding:"1px 5px", borderRadius:5 }}>new</span>}
                                          </div>
                                          <div style={{ fontSize:10, color:"#999" }}>{sig.val}</div>
                                        </div>
                                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, flexShrink:0 }}>
                                          <Dots score={sc} sz={7} />
                                          <span style={{ fontSize:9, fontWeight:600, color:col }}>{lbl}</span>
                                          <span style={{ fontSize:9, color:"#bbb" }}>{pts}/{sig.w}pts</span>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Reversal Detection */}
                                  <div style={{ marginTop:14, paddingTop:12, borderTop:"0.5px solid #f0ede6" }}>
                                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:9 }}>
                                      <div style={{ fontSize:10, fontWeight:700, color:"#854F0B", textTransform:"uppercase", letterSpacing:"0.07em" }}>Reversal Detection</div>
                                      {revCount > 0
                                        ? <div style={{ fontSize:10, color:"#633806", background:"#FAEEDA", padding:"2px 9px", borderRadius:8, border:"0.5px solid #EF9F27", fontWeight:600 }}>{revCount} active &mdash; total bonus <span style={{ color:"#1a6a1a" }}>+{bonus}pts</span></div>
                                        : <div style={{ fontSize:10, color:"#bbb" }}>0 active &mdash; 0 pts</div>
                                      }
                                    </div>

                                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:10 }}>
                                      {revSignals.map(function(rv, i) {
                                        var pts = rv.active ? bonusPer : 0;
                                        return (
                                          <div key={i} style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 9px", background: rv.active ? "#FAEEDA" : "#fafaf8", borderRadius:7, border:"0.5px solid " + (rv.active ? "#EF9F27" : "#e8e4dc") }}>
                                            <div style={{ width:17, height:17, borderRadius:"50%", background: rv.active ? "#BA7517" : "#d0ccc5", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                              <span style={{ fontSize:9, fontWeight:700, color:"#fff" }}>{rv.active ? "!" : "-"}</span>
                                            </div>
                                            <div style={{ flex:1, minWidth:0 }}>
                                              <div style={{ fontSize:10, fontWeight: rv.active ? 700 : 400, color: rv.active ? "#412402" : "#aaa" }}>{rv.label}</div>
                                              <div style={{ fontSize:9, color: rv.active ? "#633806" : "#bbb" }}>{rv.note}</div>
                                            </div>
                                            <div style={{ flexShrink:0 }}>
                                              {rv.active
                                                ? <span style={{ fontSize:10, fontWeight:700, color:"#27500A", background:"#EAF3DE", padding:"2px 7px", borderRadius:6, border:"0.5px solid #7abd00" }}>+{pts}pts</span>
                                                : <span style={{ fontSize:10, color:"#ccc" }}>0pts</span>
                                              }
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Calculation strip */}
                                    <div style={{ padding:"9px 12px", background:"#f9f7f4", borderRadius:8, border:"0.5px solid #e8e4dc" }}>
                                      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                        <div style={{ padding:"3px 9px", background:vBg, borderRadius:5, border:"0.5px solid " + vCol, fontSize:11, fontWeight:600, color:vCol }}>Base {base}</div>
                                        <span style={{ fontSize:11, color:"#bbb" }}>+</span>
                                        <div style={{ padding:"3px 9px", background: bonus > 0 ? "#EAF3DE" : "#f5f5f5", borderRadius:5, border:"0.5px solid " + (bonus > 0 ? "#7abd00" : "#ddd"), fontSize:11, fontWeight:600, color: bonus > 0 ? "#27500A" : "#bbb" }}>Bonus +{bonus}</div>
                                        <span style={{ fontSize:11, color:"#bbb" }}>=</span>
                                        <div style={{ padding:"3px 10px", background:vCol, borderRadius:5, fontSize:12, fontWeight:700, color:"#fff" }}>{finalScore}/100 {verdict}</div>
                                        {base >= 50 && bonus === 0 && <span style={{ fontSize:10, color:"#aaa" }}>(bonus only when base &lt; 50)</span>}
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            ) : (
                              <div style={{ padding:"12px 14px", background:"#fafaf8", borderRadius:8, border:"0.5px solid #e8e4dc", marginBottom:4, fontSize:12, color:"#aaa" }}>
                                Market Signal unavailable &mdash; requires Massive.com data.
                              </div>
                            )}

                            {/* AI badges */}
                            {(aiRating || aiEntry) && (
                              <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                                {aiRating && (
                                  <div style={{ flex:1, minWidth:160, padding:"10px 14px", background: vBg.replace ? aiColors[1] : "#f5f5f5", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                                    <div>
                                      <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>AI Technical Rating</div>
                                      <div style={{ fontSize:13, fontWeight:700, color:aiColors[0] }}>{aiRating}</div>
                                    </div>
                                    <Dots score={aiDotScore} sz={7} />
                                  </div>
                                )}
                                {aiEntry && (
                                  <div style={{ flex:1, minWidth:160, padding:"10px 14px", background:"#f9f7f4", borderRadius:10 }}>
                                    <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Entry Timing</div>
                                    <div style={{ fontSize:13, fontWeight:700, color:"#555" }}>{aiEntry}</div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div style={{ marginTop:10, fontSize:11, color:"#bbb" }}>
                              Market Signal uses Massive.com real-time data. AI analysis by Claude Haiku. Not financial advice.
                            </div>
                          </div>
                        );
                      })()}


                    </div>
                  )}

                  {/* AI Insight Tab */}
                  {insightTab === "aiinsight" && (function() {
                    var parsed    = insightCache["aiinsight"] ? parseAiInsight(insightCache["aiinsight"]) : null;
                    var ov2       = ov || {};
                    var massInf   = massiveInfo || {};
                    var ind2      = massInf.indicators || {};
                    var price2    = q ? q.price : 0;
                    var aggs2     = massInf.aggs || [];
                    var news2     = massInf.news || [];

                    // ---- dot renderer ----
                    function DI(props) {
                      var map = {5:{c:"#1a6a1a",e:"#c8e8c0"},4:{c:"#2a7a2a",e:"#c8e8c0"},3:{c:"#b88000",e:"#faeeda"},2:{c:"#c03030",e:"#f5c0c0"},1:{c:"#8b0000",e:"#f5c0c0"}};
                      var s = Math.max(1,Math.min(5,Math.round(parseFloat(props.score)||3)));
                      var cc = map[s]; var d = [];
                      for (var i=1;i<=5;i++) d.push(<span key={i} style={{display:"inline-block",width:props.sz||8,height:props.sz||8,borderRadius:"50%",background:i<=s?cc.c:cc.e,marginRight:2}}/>);
                      return <span style={{display:"inline-flex",alignItems:"center"}}>{d}</span>;
                    }

                    // ---- verdict colour helpers ----
                    function vCol(v){
                      if (!v) return "#b88000";
                      var vl=(v+"").trim().toLowerCase();
                      if(vl==="strong buy")   return "#1a6a1a";
                      if(vl==="buy")          return "#2a7a2a";
                      if(vl==="hold")         return "#b88000";
                      if(vl==="avoid")        return "#c03030";
                      if(vl==="strong avoid") return "#8b0000";
                      return "#b88000";
                    }
                    function vBg(v){
                      if (!v) return "#FAEEDA";
                      var vl=(v+"").trim().toLowerCase();
                      if(vl==="strong buy"||vl==="buy") return "#EAF3DE";
                      if(vl==="hold")                   return "#FAEEDA";
                      return "#FCEBEB";
                    }
                    function vBd(v){
                      if (!v) return "#d4a800";
                      var vl=(v+"").trim().toLowerCase();
                      if(vl==="strong buy") return "#7abd00";
                      if(vl==="buy")        return "#97C459";
                      if(vl==="hold")       return "#d4a800";
                      if(vl==="avoid")      return "#e08080";
                      return "#c03030";
                    }

                    // ---- free data signals ----
                    // Analyst momentum from upgradeDowngradeHistory
                    var upgHist = ov2.upgradeDowngradeHistory || [];
                    var recent90 = upgHist.filter(function(h){ return h.epochGradeDate && (Date.now()/1000 - h.epochGradeDate) < 90*86400; });
                    var upgrades   = recent90.filter(function(h){ return h.action && h.action.toLowerCase().includes("upgr"); }).length;
                    var downgrades = recent90.filter(function(h){ return h.action && h.action.toLowerCase().includes("downgr"); }).length;
                    var analystNet = upgrades - downgrades;
                    var analystDir = analystNet > 0 ? "Upgrading" : analystNet < 0 ? "Downgrading" : "Neutral";
                    var analystDots = analystNet > 2 ? 5 : analystNet > 0 ? 4 : analystNet === 0 ? 3 : analystNet > -3 ? 2 : 1;

                    // Insider net direction
                    var insiderTx = ov2.insiderTx || [];
                    var iBuys  = insiderTx.filter(function(t){ return t.action && t.action.toLowerCase().includes("buy"); }).length;
                    var iSells = insiderTx.filter(function(t){ return t.action && !t.action.toLowerCase().includes("buy"); }).length;
                    var insiderDir = iBuys > iSells ? "Net Buying" : iBuys < iSells ? "Net Selling" : "Neutral";
                    var insiderDots = iBuys > iSells ? 5 : iBuys === iSells ? 3 : 2;
                    var insiderVal = insiderTx.reduce(function(s,t){ var v = t.value; return s + (typeof v === "number" ? v : 0); }, 0);

                    // Earnings streak
                    var earningsQ = ov2.earningsQ || [];
                    var streak = 0;
                    for (var ei=0; ei<earningsQ.length; ei++) {
                      if (earningsQ[ei].actual != null && earningsQ[ei].estimate != null && earningsQ[ei].actual > earningsQ[ei].estimate) streak++;
                      else break;
                    }

                    // Short squeeze score (0-100)
                    var shortPct   = ov2.shortPct   || 0;
                    var shortRatio = ov2.shortRatio  || 0;
                    var sqScore    = Math.min(100, Math.round((shortPct * 100 * 0.5) + (shortRatio * 5)));

                    // Institutional trend
                    var instPct = ov2.institutionPct ? (ov2.institutionPct * 100).toFixed(1) : null;

                    // News sentiment count
                    var newsPos = 0, newsNeg = 0, newsNeu = 0;
                    news2.slice(0,10).forEach(function(n) {
                      var ins = n.insights || [];
                      ins.forEach(function(i) {
                        if (i.sentiment === "positive") newsPos++;
                        else if (i.sentiment === "negative") newsNeg++;
                        else newsNeu++;
                      });
                    });
                    var totalSent = newsPos + newsNeg + newsNeu;
                    var newsDir = totalSent > 0 ? (newsPos/totalSent > 0.6 ? "Bullish" : newsNeg/totalSent > 0.5 ? "Bearish" : "Neutral") : "Neutral";
                    var newsDots = newsDir === "Bullish" ? 4 : newsDir === "Bearish" ? 2 : 3;

                    // Volume ratio
                    var vol5  = aggs2.slice(0,5).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(aggs2.slice(0,5).length,1);
                    var vol20 = aggs2.slice(0,20).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(aggs2.slice(0,20).length,1);
                    var volRatio2 = vol20 > 0 ? vol5/vol20 : 1;

                    // Bollinger Bands from aggs
                    var bbPeriod = 20;
                    var bbData = aggs2.slice(0,bbPeriod).map(function(a){return a.c||0;}).reverse();
                    var bbMid = bbData.length >= bbPeriod ? bbData.reduce(function(s,v){return s+v;},0)/bbPeriod : 0;
                    var bbStd = bbData.length >= bbPeriod ? Math.sqrt(bbData.reduce(function(s,v){return s+Math.pow(v-bbMid,2);},0)/bbPeriod) : 0;
                    var bbUpper = bbMid + 2*bbStd;
                    var bbLower = bbMid - 2*bbStd;

                    // Fibonacci from 52wk
                    var hi52 = ov2.hi52 || 0; var lo52 = ov2.lo52 || 0;
                    var fibRange = hi52 - lo52;
                    var fib382 = fibRange > 0 ? Math.round(hi52 - fibRange*0.382) : 0;
                    var fib500 = fibRange > 0 ? Math.round(hi52 - fibRange*0.500) : 0;
                    var fib618 = fibRange > 0 ? Math.round(hi52 - fibRange*0.618) : 0;

                    return (
                      <div>
                        {/* == D: DATA SIGNALS == */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{width:20,height:20,borderRadius:"50%",background:"#1a6a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>D</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#111"}}>Data Signals</span>
                            <span style={{fontSize:9,fontWeight:600,color:"#1a6a1a",background:"#EAF3DE",padding:"1px 7px",borderRadius:7,border:"0.5px solid #7abd0040"}}>Free -- no AI cost</span>
                          </div>
                          <span style={{fontSize:10,color:"#bbb"}}>$0.00000/visit</span>
                        </div>

                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:8}}>
                          {[
                            { label:"Analyst Momentum", val:analystDir, sub:upgrades+" upgrades, "+downgrades+" downgrades (90d)", dots:analystDots, col:analystDots>=4?"#1a6a1a":analystDots===3?"#b88000":"#c03030", bg:analystDots>=4?"#EAF3DE":analystDots===3?"#FAEEDA":"#FCEBEB" },
                            { label:"Insider Activity",  val:insiderDir, sub:iBuys+" buys, "+iSells+" sells last 90d"+(insiderVal!==0?" | $"+(Math.abs(insiderVal)/1e6).toFixed(1)+"M":""), dots:insiderDots, col:insiderDots>=4?"#1a6a1a":insiderDots===3?"#b88000":"#c03030", bg:insiderDots>=4?"#EAF3DE":insiderDots===3?"#FAEEDA":"#FCEBEB" },
                            { label:"Earnings Streak",   val:streak+" Consecutive Beats", sub:earningsQ.slice(0,streak).map(function(e,i){return "Q"+(i+1);}).join(", "), dots:streak>=5?5:streak>=3?4:streak>=2?3:streak>=1?2:1, col:streak>=3?"#1a6a1a":streak>=1?"#b88000":"#c03030", bg:streak>=3?"#EAF3DE":streak>=1?"#FAEEDA":"#FCEBEB" },
                            { label:"Short Squeeze Score", val:(sqScore<30?"Low":sqScore<60?"Medium":"High")+" -- "+sqScore+"/100", sub:"Float "+(shortPct*100).toFixed(1)+"% -- Ratio "+shortRatio.toFixed(1)+" days", dots:sqScore<30?3:sqScore<60?2:1, col:sqScore<30?"#b88000":"#c03030", bg:sqScore<30?"#FAEEDA":"#FCEBEB" },
                            { label:"News Sentiment",     val:newsDir, sub:newsPos+" positive, "+newsNeu+" neutral, "+newsNeg+" negative", dots:newsDots, col:newsDots>=4?"#1a6a1a":newsDots===3?"#b88000":"#c03030", bg:newsDots>=4?"#EAF3DE":newsDots===3?"#FAEEDA":"#FCEBEB" },
                            { label:"Institutional Trend", val:instPct?""+instPct+"% held":"No data", sub:"Volume ratio "+volRatio2.toFixed(2)+"x 20-day avg", dots:3, col:"#b88000", bg:"#FAEEDA" },
                          ].map(function(card,i){
                            return (
                              <div key={i} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"9px 11px"}}>
                                <div style={{fontSize:9,color:"#999",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{card.label}</div>
                                <div style={{fontSize:12,fontWeight:700,color:card.col,marginBottom:3}}>{card.val}</div>
                                <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>{card.sub}</div>
                                <DI score={card.dots} sz={7} />
                              </div>
                            );
                          })}
                        </div>

                        {/* Analyst consensus */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
                          {[
                            { label:"Analyst Consensus", val:ov2.recKey?ov2.recKey.toUpperCase():"N/A", sub:(ov2.numAnalysts||0)+" analysts -- Target $"+(ov2.targetMean?ov2.targetMean.toFixed(2):"N/A"), dotScore: ov2.recKey&&ov2.recKey.toLowerCase().includes("buy")?4:ov2.recKey&&ov2.recKey.toLowerCase().includes("sell")?2:3 },
                            { label:"Short Interest",    val:(shortPct*100).toFixed(1)+"% float", sub:"Ratio "+shortRatio.toFixed(1)+" days to cover", dotScore:shortPct>0.15?1:shortPct>0.08?2:3 },
                            { label:"Dividend / Buyback", val:ov2.divYield&&ov2.divYield>0?((ov2.divYield*100).toFixed(2)+"% yield"):"No Dividend", sub:ov2.payoutRatio&&ov2.payoutRatio>0?"Payout "+(ov2.payoutRatio*100).toFixed(0)+"%":"Capital return via buybacks", dotScore:3 },
                          ].map(function(card,i){
                            return (
                              <div key={i} style={{background:"#EAF3DE",borderRadius:8,padding:"9px 11px",border:"0.5px solid #7abd00"}}>
                                <div style={{fontSize:9,color:"#27500A",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{card.label}</div>
                                <div style={{fontSize:12,fontWeight:700,color:"#1a6a1a",marginBottom:3}}>{card.val}</div>
                                <div style={{fontSize:10,color:"#3B6D11",marginBottom:4}}>{card.sub}</div>
                                <DI score={card.dotScore} sz={7} />
                              </div>
                            );
                          })}
                        </div>

                        {/* Sector relative performance */}
                        <div style={{marginBottom:10,padding:"9px 12px",background:"var(--color-background-secondary)",borderRadius:8,fontSize:11,color:"#555"}}>
                          <div style={{fontSize:9,color:"#999",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Technical indicators</div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                            {[
                              {label:"Bollinger Upper", val:bbUpper>0?"$"+bbUpper.toFixed(2):"-"},
                              {label:"Bollinger Mid",   val:bbMid>0?"$"+bbMid.toFixed(2):"-"},
                              {label:"Bollinger Lower", val:bbLower>0?"$"+bbLower.toFixed(2):"-"},
                              {label:"Fib 38.2%",       val:fib382>0?"$"+fib382:"-"},
                              {label:"Fib 50.0%",       val:fib500>0?"$"+fib500:"-"},
                              {label:"Fib 61.8%",       val:fib618>0?"$"+fib618:"-"},
                              {label:"Vol Ratio 5/20d", val:volRatio2.toFixed(2)+"x"},
                              {label:"52-wk range",     val:hi52>0?"$"+lo52.toFixed(2)+" - $"+hi52.toFixed(2):"-"},
                            ].map(function(item,i){
                              return (
                                <div key={i} style={{background:"var(--color-background-primary)",borderRadius:6,padding:"6px 8px"}}>
                                  <div style={{fontSize:9,color:"#aaa",marginBottom:2}}>{item.label}</div>
                                  <div style={{fontSize:11,fontWeight:700,color:"#111"}}>{item.val}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{borderTop:"0.5px solid #f0ede6",margin:"14px 0"}}></div>

                        {/* == 2: EARNINGS QUALITY == */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{width:20,height:20,borderRadius:"50%",background:"#3B6D11",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>2</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#111"}}>Earnings Quality</span>
                            <span style={{fontSize:9,fontWeight:600,color:"#3B6D11",background:"#EAF3DE",padding:"1px 7px",borderRadius:7}}>Auto-generated</span>
                          </div>
                          <span style={{fontSize:10,color:"#bbb"}}>$0.00300/visit</span>
                        </div>

                        {insightCache["aiinsight"] && parsed ? (
                          <div>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:8}}>
                              {(earningsQ||[]).slice(0,4).map(function(eq,i){
                                var beat = eq.actual != null && eq.estimate != null && eq.actual > eq.estimate;
                                var pct  = eq.actual && eq.estimate && eq.estimate !== 0 ? ((eq.actual-eq.estimate)/Math.abs(eq.estimate)*100).toFixed(1) : null;
                                return (
                                  <div key={i} style={{background:beat?"#EAF3DE":"#FCEBEB",borderRadius:6,padding:"7px 8px",textAlign:"center",border:"0.5px solid "+(beat?"#7abd00":"#e08080")}}>
                                    <div style={{fontSize:9,color:"#aaa",marginBottom:2}}>{eq.date||("Q"+(i+1))}</div>
                                    <div style={{fontSize:12,fontWeight:700,color:beat?"#1a6a1a":"#c03030"}}>{eq.actual!=null?"$"+eq.actual.toFixed(2):"-"}</div>
                                    <div style={{fontSize:9,color:"#aaa"}}>est {eq.estimate!=null?"$"+eq.estimate.toFixed(2):"-"}</div>
                                    {pct && <div style={{fontSize:11,fontWeight:700,color:beat?"#1a6a1a":"#c03030",marginTop:2}}>{beat?"+":""}{pct}%</div>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <div style={{borderTop:"0.5px solid #f0ede6",margin:"14px 0"}}></div>

                        {/* == 3: MARKET SENTIMENT == */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{width:20,height:20,borderRadius:"50%",background:"#185FA5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>3</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#111"}}>Market Sentiment</span>
                            <span style={{fontSize:9,fontWeight:600,color:"#185FA5",background:"#E6F1FB",padding:"1px 7px",borderRadius:7}}>Auto-generated</span>
                          </div>
                          <span style={{fontSize:10,color:"#bbb"}}>$0.00300/visit</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:8}}>
                          {[
                            {label:"News Sentiment",    val:newsDir,   sub:newsPos+" pos / "+newsNeu+" neu / "+newsNeg+" neg", dots:newsDots,    col:newsDots>=4?"#1a6a1a":"#b88000", bg:newsDots>=4?"#EAF3DE":"#FAEEDA", bd:newsDots>=4?"#7abd00":"#d4a800"},
                            {label:"Analyst Consensus", val:ov2.recKey?ov2.recKey.toUpperCase():"N/A", sub:(ov2.numAnalysts||0)+" analysts -- Target $"+(ov2.targetMean?ov2.targetMean.toFixed(2):"N/A"), dots:ov2.recKey&&ov2.recKey.toLowerCase().includes("buy")?4:3, col:"#1a6a1a",bg:"#EAF3DE",bd:"#7abd00"},
                            {label:"Short Interest",    val:(shortPct*100).toFixed(1)+"% float", sub:"Ratio "+shortRatio.toFixed(1)+" days", dots:shortPct>0.10?2:3, col:shortPct>0.10?"#c03030":"#b88000", bg:shortPct>0.10?"#FCEBEB":"#FAEEDA", bd:shortPct>0.10?"#e08080":"#d4a800"},
                          ].map(function(card,i){
                            return (
                              <div key={i} style={{background:card.bg,borderRadius:8,padding:"9px 11px",border:"0.5px solid "+card.bd}}>
                                <div style={{fontSize:9,color:card.col,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{card.label}</div>
                                <div style={{fontSize:12,fontWeight:700,color:card.col,marginBottom:2}}>{card.val}</div>
                                <div style={{fontSize:10,color:card.col,opacity:0.8,marginBottom:4}}>{card.sub}</div>
                                <DI score={card.dots} sz={7} />
                              </div>
                            );
                          })}
                        </div>
                        {/* Recent news headlines */}
                        {news2.slice(0,4).map(function(n,i){
                          var sentArr = n.insights||[];
                          var sent    = sentArr.length>0 ? sentArr[0].sentiment : "neutral";
                          var sentCol = sent==="positive"?"#1a6a1a":sent==="negative"?"#c03030":"#b88000";
                          var sentBg  = sent==="positive"?"#EAF3DE":sent==="negative"?"#FCEBEB":"#FAEEDA";
                          return (
                            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"var(--color-background-secondary)",borderRadius:6,marginBottom:4}}>
                              <span style={{fontSize:10,fontWeight:600,color:sentCol,background:sentBg,padding:"1px 6px",borderRadius:5,flexShrink:0,textTransform:"capitalize"}}>{sent}</span>
                              <div style={{flex:1,fontSize:11,color:"#333",lineHeight:1.4}}>{n.title||n.headline}</div>
                              <span style={{fontSize:10,color:"#bbb",flexShrink:0}}>{n.published_utc ? new Date(n.published_utc).toLocaleDateString() : ""}</span>
                            </div>
                          );
                        })}

                        <div style={{borderTop:"0.5px solid #f0ede6",margin:"14px 0"}}></div>

                        {/* == 4: ANALYSIS TECHNICAL NOTE == */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{width:20,height:20,borderRadius:"50%",background:"#0C447C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>4</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#111"}}>Analysis Technical Note</span>
                            <span style={{fontSize:9,fontWeight:600,color:"#0C447C",background:"#E6F1FB",padding:"1px 7px",borderRadius:7}}>Auto-generated</span>
                          </div>
                          <span style={{fontSize:10,color:"#bbb"}}>$0.00600/visit</span>
                        </div>
                        {insightCache["aiinsight"] && parsed ? (
                          <div style={{fontSize:12,color:"#333",lineHeight:1.85,padding:"10px 12px",background:"var(--color-background-secondary)",borderRadius:8}}>
                            {parsed.techScore != null && (
                              <div style={{marginBottom:8}}>
                                <strong style={{fontWeight:700}}>Technical Rating: </strong>
                                <DI score={Math.round(parsed.techScore)} sz={8} />
                                <span style={{fontSize:11,color:"#555",marginLeft:6}}>{parsed.techScore}/5</span>
                              </div>
                            )}
                            {ind2.sma50&&price2>0&&<span><strong style={{fontWeight:700}}>SMA50:</strong> ${(ind2.sma50).toFixed(2)} ({price2>ind2.sma50?"above":"below"}) &nbsp;</span>}
                            {ind2.sma200&&price2>0&&<span><strong style={{fontWeight:700}}>SMA200:</strong> ${(ind2.sma200).toFixed(2)} ({price2>ind2.sma200?"above":"below"}) &nbsp;</span>}
                            {ind2.rsi14!=null&&<span><strong style={{fontWeight:700}}>RSI:</strong> {ind2.rsi14!=null?ind2.rsi14.toFixed(1):"-"} &nbsp;</span>}
                            {ind2.macd&&ind2.macd.histogram!=null&&<span><strong style={{fontWeight:700}}>MACD Hist:</strong> {ind2.macd&&ind2.macd.histogram!=null?ind2.macd.histogram.toFixed(4):"-"} &nbsp;</span>}
                            {bbMid>0&&<span><strong style={{fontWeight:700}}>BB:</strong> {bbMid>0?"$"+bbLower.toFixed(2)+" / $"+bbMid.toFixed(2)+" / $"+bbUpper.toFixed(2):"-"} &nbsp;</span>}
                            {fib382>0&&<span><strong style={{fontWeight:700}}>Fib:</strong> 38.2%=${fib382} / 50%=${fib500} / 61.8%=${fib618}</span>}
                          </div>
                        ) : <div style={{color:"#aaa",fontSize:12}}>Technical data will appear after AI Insight generates.</div>}

                        <div style={{borderTop:"0.5px solid #f0ede6",margin:"14px 0"}}></div>

                        {/* == 1: 10-K ON-DEMAND == */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{width:20,height:20,borderRadius:"50%",background:"#854F0B",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>1</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#111"}}>10-K Analysis + Risk Assessment</span>
                            <span style={{fontSize:9,fontWeight:600,color:"#633806",background:"#FAEEDA",padding:"1px 7px",borderRadius:7,border:"0.5px solid #EF9F2740"}}>On-demand</span>
                          </div>
                          <span style={{fontSize:10,color:"#bbb"}}>$0.02380 when clicked</span>
                        </div>
                        {massiveInfo && massiveInfo.tenK && (massiveInfo.tenK.business || massiveInfo.tenK.riskFactors) ? (function() {
                          var cacheKey = "tenk_full_" + sym;
                          var cached   = insightCache[cacheKey];
                          if (!cached) {
                            return (
                              <div style={{padding:"14px 16px",background:"var(--color-background-secondary)",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",textAlign:"center"}}>
                                <div style={{fontSize:11,color:"#555",marginBottom:10,lineHeight:1.6}}>Reads 10-K Business section + Risk Factors. Business quality, moat evidence, management signals, top 5 risks rated Low/Medium/High, Buffett-style verdict.</div>
                                <button onClick={function() {
                                  setInsightCache(function(prev){ var n=Object.assign({},prev); n[cacheKey]="loading"; return n; });
                                  var bizText  = (massiveInfo.tenK.business||"").slice(0,2000);
                                  var riskText = (massiveInfo.tenK.riskFactors||"").slice(0,1500);
                                  fetch("/anthropic",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:1100,messages:[{role:"user",content:"You are a senior investment analyst. For "+sym+", analyse this 10-K filing covering TWO areas:\n\nPART A - 10-K ANALYSIS: Business quality, competitive moat evidence, management quality signals, financial health indicators, Buffett verdict (buy/hold/avoid).\n\nPART B - RISK ASSESSMENT: List top 3-5 risks. For each: name, category (Regulatory/Competitive/Macro/Execution/Financial), severity (Low/Medium/High), one-sentence explanation.\n\nBUSINESS:\n"+bizText+"\n\nRISK FACTORS:\n"+riskText}]})})
                                    .then(function(r){return r.json();})
                                    .then(function(d){
                                      var text=d&&d.content&&d.content[0]&&d.content[0].text;
                                      setInsightCache(function(prev){var n=Object.assign({},prev);n[cacheKey]=text||"Analysis unavailable.";return n;});
                                    }).catch(function(){
                                      setInsightCache(function(prev){var n=Object.assign({},prev);n[cacheKey]="Analysis failed.";return n;});
                                    });
                                }} style={{padding:"8px 20px",background:"#111",color:"#c8f000",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>
                                  Generate 10-K Analysis + Risk Assessment
                                </button>
                                <div style={{fontSize:10,color:"#bbb",marginTop:6}}>Requires 10-K data from Massive.com</div>
                              </div>
                            );
                          }
                          if (cached === "loading") return (
                            <div style={{textAlign:"center",padding:"20px 0"}}>
                              <div style={{fontSize:12,color:"#888",marginBottom:10}}>Generating 10-K analysis...</div>
                              <div style={{display:"inline-block",width:22,height:22,border:"3px solid #e0dbd0",borderTop:"3px solid "+LIME,borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
                            </div>
                          );
                          return (
                            <div style={{fontSize:12,color:"#333",lineHeight:1.85,padding:"12px 14px",background:"#FAEEDA",borderRadius:8,borderLeft:"3px solid #EF9F27"}}>
                              {cached}
                            </div>
                          );
                        })() : <div style={{color:"#aaa",fontSize:12,padding:"10px 14px",background:"var(--color-background-secondary)",borderRadius:8}}>10-K data unavailable. Requires Massive.com Starter plan.</div>}

                        <div style={{borderTop:"0.5px solid #f0ede6",margin:"14px 0"}}></div>

                        {/* == AI: AI INSIGHT == */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{width:20,height:20,borderRadius:"50%",background:"#1a1a14",border:"1px solid #c8f000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#c8f000",flexShrink:0}}>AI</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#111"}}>AI Insight</span>
                            <span style={{fontSize:9,fontWeight:600,color:"#27500A",background:"#EAF3DE",padding:"1px 7px",borderRadius:7}}>Auto-generated</span>
                          </div>
                          <span style={{fontSize:10,color:"#bbb"}}>$0.00200/visit</span>
                        </div>

                        {insightCache["aiinsight"] && parsed ? (
                          <div>
                            {/* Overall verdict card */}
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:vBg(parsed.verdict),borderRadius:10,border:"0.5px solid "+vBd(parsed.verdict),marginBottom:10}}>
                              <div>
                                <div style={{fontSize:10,color:vCol(parsed.verdict),fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>AI Insight -- {sym}</div>
                                <div style={{fontSize:20,fontWeight:900,color:vCol(parsed.verdict)}}>{parsed.verdict||"Hold"}</div>
                                <div style={{fontSize:11,color:vCol(parsed.verdict),opacity:0.8,marginTop:2}}>
                                  {parsed.confidence&&"Confidence: "+parsed.confidence}
                                  {parsed.confidence&&parsed.horizon&&" / "}
                                  {parsed.horizon&&"Horizon: "+parsed.horizon}
                                </div>
                              </div>
                              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                                <DI score={parsed.dots} sz={11} />
                                <div style={{fontSize:10,color:vCol(parsed.verdict),opacity:0.7}}>{parsed.dots} of 5</div>
                              </div>
                            </div>

                            {/* 3 sub-dimension scores */}
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
                              {[
                                {label:"Fundamental", score:parsed.fundScore||3},
                                {label:"Technical",   score:parsed.techScore||3},
                                {label:"Sentiment",   score:parsed.sentScore||3},
                              ].map(function(dim,i){
                                var dc={5:{c:"#1a6a1a",e:"#c8e8c0",l:"Strong"},4:{c:"#2a7a2a",e:"#c8e8c0",l:"Bullish"},3:{c:"#b88000",e:"#faeeda",l:"Neutral"},2:{c:"#c03030",e:"#f5c0c0",l:"Bearish"},1:{c:"#8b0000",e:"#f5c0c0",l:"Weak"}};
                                var sc=Math.max(1,Math.min(5,Math.round(dim.score)));
                                return (
                                  <div key={i} style={{background:sc>=4?"#EAF3DE":sc===3?"#FAEEDA":"#FCEBEB",borderRadius:8,padding:"9px 12px",textAlign:"center",border:"0.5px solid "+(sc>=4?"#7abd00":sc===3?"#d4a800":"#e08080")}}>
                                    <div style={{fontSize:10,color:dc[sc]?dc[sc].c:"#b88000",opacity:0.8,marginBottom:3}}>{dim.label}</div>
                                    <div style={{fontSize:13,fontWeight:700,color:dc[sc]?dc[sc].c:"#b88000",marginBottom:5}}>{dc[sc]?dc[sc].l:"Neutral"}</div>
                                    <DI score={sc} sz={7} />
                                  </div>
                                );
                              })}
                            </div>

                            {/* Risk / Opportunity */}
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10}}>
                              <div style={{padding:"10px 12px",background:"#FCEBEB",borderRadius:8,border:"0.5px solid #e08080"}}>
                                <div style={{fontSize:9,color:"#c03030",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Key Risk</div>
                                <div style={{fontSize:11,color:"#791F1F",lineHeight:1.65}}>{parsed.risk||"See full analysis above."}</div>
                              </div>
                              <div style={{padding:"10px 12px",background:"#EAF3DE",borderRadius:8,border:"0.5px solid #7abd00"}}>
                                <div style={{fontSize:9,color:"#1a6a1a",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Key Opportunity</div>
                                <div style={{fontSize:11,color:"#173404",lineHeight:1.65}}>{parsed.opportunity||"See full analysis above."}</div>
                              </div>
                            </div>

                            {/* Summary narrative */}
                            <div style={{padding:"12px 14px",background:"#1a1a14",borderRadius:8,borderLeft:"3px solid #c8f000"}}>
                              <div style={{fontSize:9,color:"#c8f000",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>AI Insight Summary</div>
                              <div style={{fontSize:12,color:"#aac4e8",lineHeight:1.85}}>{parsed.summary||insightCache["aiinsight"]}</div>
                            </div>
                          </div>
                        ) : (
                          <div style={{color:"#aaa",fontSize:12,textAlign:"center",padding:"20px 0"}}>AI Insight is generating...</div>
                        )}

                        <div style={{marginTop:10,fontSize:11,color:"#bbb"}}>
                          AI analysis by Claude Haiku. Data from Yahoo Finance + Massive.com. Not financial advice.
                        </div>
                      </div>
                    );
                  })()}

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
                                      messages: [{ role: "user", content: "You are Warren Buffett analysing a 10-K. For " + sym + ", analyse: 1. Business Quality 2. Competitive Moat 3. Management Quality 4. Financial Strength 5. Key Risks 6. Buffett Verdict (buy/hold/avoid and why). Be concise.\n\nBUSINESS SECTION:\n" + bizText + "\n\nRISK FACTORS:\n" + riskText }]
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
                  {/* Market Signal Tab */}
                  {insightTab === "signal" && (function() {
                    // Market Signal tab -- uses revised 8-signal scoring (weekly/monthly horizon)
                    // Same methodology as Technical Analysis scoring block
                    var ind   = massiveInfo && massiveInfo.indicators ? massiveInfo.indicators : null;
                    var aggs  = massiveInfo && massiveInfo.aggs        ? massiveInfo.aggs        : [];
                    var price = q ? q.price : 0;
                    var hi52  = ov ? ov.hi52 : 0;
                    var lo52  = ov ? ov.lo52 : 0;
                    var rng52 = hi52 - lo52;
                    var pos52 = rng52 > 0 ? (price - lo52) / rng52 : 0.5;

                    var rsiHist  = ind ? (ind.rsiHistory  || []) : [];
                    var macdHist = ind ? (ind.macdHistory || []) : [];

                    var vol5  = aggs.slice(0,5).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(aggs.slice(0,5).length,1);
                    var vol20 = aggs.slice(0,20).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(aggs.slice(0,20).length,1);
                    var volRatio = vol20 > 0 ? vol5/vol20 : 1;

                    function detectMacdTurning2() {
                      if (macdHist.length < 3) return false;
                      var h0=macdHist[0]&&macdHist[0].histogram, h1=macdHist[1]&&macdHist[1].histogram, h2=macdHist[2]&&macdHist[2].histogram;
                      return h0!=null&&h1!=null&&h2!=null&&h0<0&&h0>h1&&h1>h2;
                    }
                    function detectRsiDivergence2() {
                      if (rsiHist.length<10||aggs.length<10) return false;
                      var rPL=Math.min.apply(null,aggs.slice(0,5).map(function(a){return a.l;}));
                      var pPL=Math.min.apply(null,aggs.slice(5,10).map(function(a){return a.l;}));
                      var rRL=Math.min.apply(null,rsiHist.slice(0,5));
                      var pRL=Math.min.apply(null,rsiHist.slice(5,10));
                      return rPL<pPL&&rRL>pRL;
                    }
                    function detectWeeklyCross2()  { if(!ind||!ind.wsma10||!ind.wsma40) return false; return ind.wsma10<ind.wsma40&&Math.abs(ind.wsma10-ind.wsma40)/ind.wsma40<0.05; }
                    function detectRsiBase2()       { if(rsiHist.length<3) return false; return rsiHist.slice(0,5).every(function(v){return v!=null&&v>=28&&v<=52;}); }
                    function detect52wkBase2()      { return pos52<0.20&&ind&&ind.rsi14!=null&&ind.rsi14>20&&ind.rsi14<45; }

                    var macdTurning2   = detectMacdTurning2();
                    var revSignals2    = [
                      { label:"RSI Divergence",         active:detectRsiDivergence2(), note:"Price new low but RSI higher low" },
                      { label:"MACD Histogram Turning", active:macdTurning2,           note:"Histogram negative but rising 3+ sessions" },
                      { label:"Weekly SMA Cross Ahead", active:detectWeeklyCross2(),   note:"WSMA10 within 5% of WSMA40" },
                      { label:"RSI Base Forming",       active:detectRsiBase2(),       note:"RSI stabilising in 28-52 range" },
                      { label:"52-Wk Low Base",         active:detect52wkBase2(),      note:"Price in bottom 20% of range, RSI steadying" },
                    ];
                    var revCount2   = revSignals2.filter(function(r){return r.active;}).length;
                    var bonusPer2   = 4;

                    var W2 = { wsma:25, sma200:15, cross:10, pos52:5, rsi:20, macd:15, ema20:5, vol:5 };
                    var trendKeys2    = ["wsma","sma200","cross","pos52"];
                    var momentumKeys2 = ["rsi","macd","ema20","vol"];

                    function sigScore2(key) {
                      if (!ind || !price) return 3;
                      var p=price, r=ind.rsi14, h=ind.macd?ind.macd.histogram:null;
                      var g;
                      if (key==="wsma")   { if(!ind.wsma10||!ind.wsma40) return 3; g=(ind.wsma10-ind.wsma40)/ind.wsma40*100; return g>5?5:g>1?4:g>-1?3:g>-5?2:1; }
                      if (key==="sma200") { if(!ind.sma200) return 3; g=(p-ind.sma200)/ind.sma200*100; return g>10?5:g>2?4:g>-10?3:g>-20?2:1; }
                      if (key==="cross")  { if(!ind.sma50||!ind.sma200) return 3; g=(ind.sma50-ind.sma200)/ind.sma200*100; return g>10?5:g>1?4:g>-1?3:g>-10?2:1; }
                      if (key==="pos52")  { return pos52>0.80?5:pos52>0.55?4:pos52>0.35?3:pos52>0.15?2:1; }
                      if (key==="rsi")    { if(r==null) return 3; return (r>=50&&r<=75)?5:(r>=40&&r<50)?4:(r>=30&&r<40||r>75)?3:(r>=20&&r<30)?2:1; }
                      if (key==="macd")   { if(h==null) return 3; if(h>0.05) return 5; if(h>0) return 4; if(h>-0.05||macdTurning2) return 3; if(h>-0.50) return 2; return 1; }
                      if (key==="ema20")  { if(!ind.ema20) return 3; g=(p-ind.ema20)/ind.ema20*100; return g>5?5:g>1?4:g>-5?3:g>-15?2:1; }
                      if (key==="vol")    { return volRatio>1.4?5:volRatio>1.1?4:volRatio>0.9?3:volRatio>0.7?2:1; }
                      return 3;
                    }

                    var scores2 = {}; trendKeys2.concat(momentumKeys2).forEach(function(k){ scores2[k]=sigScore2(k); });
                    var base2=0; Object.keys(W2).forEach(function(k){base2+=(scores2[k]/5)*W2[k];}); base2=Math.round(base2);
                    var bonus2 = base2<50?Math.min(revCount2*bonusPer2,12):0;
                    var final2 = Math.min(base2+bonus2, base2<50?49:100);
                    var tScore2 = Math.round((trendKeys2.reduce(function(s,k){return s+scores2[k];},0)/(trendKeys2.length*5))*100);
                    var mScore2 = Math.round((momentumKeys2.reduce(function(s,k){return s+scores2[k];},0)/(momentumKeys2.length*5))*100);
                    var showRW2 = revCount2>=2&&final2<50;

                    function getVerdict2(s){return s>=70?"Strong Bullish":s>=55?"Bullish":s>=40?"Neutral":s>=25?"Bearish":"Strong Bearish";}
                    var verdict2=getVerdict2(final2);
                    var vColMap2={"Strong Bullish":"#1a6a1a","Bullish":"#2a7a2a","Neutral":"#b88000","Bearish":"#c03030","Strong Bearish":"#8b0000"};
                    var vBgMap2 ={"Strong Bullish":"#EAF3DE","Bullish":"#EAF3DE","Neutral":"#FAEEDA","Bearish":"#FCEBEB","Strong Bearish":"#FCEBEB"};
                    var vDotMap2={"Strong Bullish":5,"Bullish":4,"Neutral":3,"Bearish":2,"Strong Bearish":1};
                    var vCol2=vColMap2[verdict2]; var vBg2=vBgMap2[verdict2]; var vDot2=vDotMap2[verdict2];
                    var scColMap2={5:"#1a6a1a",4:"#2a7a2a",3:"#b88000",2:"#c03030",1:"#8b0000"};
                    var scEmMap2 ={5:"#c8e8c0",4:"#c8e8c0",3:"#faeeda",2:"#f5c0c0",1:"#f5c0c0"};
                    var scLbMap2 ={5:"Strong Bullish",4:"Bullish",3:"Neutral",2:"Bearish",1:"Strong Bearish"};

                    function Dots2(props) {
                      var col=scColMap2[props.score]||"#b88000", em=scEmMap2[props.score]||"#faeeda", d=[];
                      for(var i=1;i<=5;i++) d.push(<span key={i} style={{display:"inline-block",width:props.sz||8,height:props.sz||8,borderRadius:"50%",background:i<=props.score?col:em,marginRight:2}}/>);
                      return <span style={{display:"inline-flex",alignItems:"center"}}>{d}</span>;
                    }

                    if (!ind || !price) return (
                      <div style={{textAlign:"center",padding:"40px 0",color:"#aaa"}}>
                        {addlLoading?"Loading market signal data...":"Market signal data unavailable. Massive.com data required."}
                      </div>
                    );

                    var SIGS2 = [
                      {key:"wsma", cat:"Trend",    w:25, label:"Weekly SMA10 vs 40", val:ind.wsma10&&ind.wsma40?"$"+ind.wsma10.toFixed(2)+" vs $"+ind.wsma40.toFixed(2):"-"},
                      {key:"sma200",cat:"Trend",   w:15, label:"Price vs SMA 200",   val:ind.sma200?"$"+price.toFixed(2)+" vs $"+ind.sma200.toFixed(2):"-"},
                      {key:"cross",cat:"Trend",    w:10, label:"Golden/Death Cross", val:ind.sma50&&ind.sma200?(ind.sma50>ind.sma200?"Golden":"Death")+" ($"+ind.sma50.toFixed(2)+" vs $"+ind.sma200.toFixed(2)+")":"-"},
                      {key:"pos52",cat:"Trend",    w:5,  label:"52-Week Position",   val:hi52>0?(pos52*100).toFixed(0)+"% of range":"-"},
                      {key:"rsi",  cat:"Momentum", w:20, label:"RSI (14-day)",       val:ind.rsi14!=null?ind.rsi14.toFixed(1):"-"},
                      {key:"macd", cat:"Momentum", w:15, label:"MACD Histogram",     val:ind.macd&&ind.macd.histogram!=null?ind.macd.histogram.toFixed(4)+(macdTurning2?" (turning)":""):"-"},
                      {key:"ema20",cat:"Momentum", w:5,  label:"Price vs EMA 20",    val:ind.ema20?"$"+price.toFixed(2)+" vs $"+ind.ema20.toFixed(2):"-"},
                      {key:"vol",  cat:"Momentum", w:5,  label:"Volume Ratio 5/20d", val:aggs.length>0?volRatio.toFixed(2)+"x avg volume":"-"},
                    ];

                    return (
                      <div>
                        {/* Overall verdict */}
                        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:vBg2,borderRadius:9,border:"0.5px solid "+vCol2,marginBottom:16}}>
                          <div style={{width:58,height:58,borderRadius:9,background:vCol2,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",flexShrink:0}}>
                            <span style={{fontSize:22,fontWeight:900,color:"#fff",lineHeight:1}}>{final2}</span>
                            <span style={{fontSize:9,color:"rgba(255,255,255,0.65)"}}>/100</span>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:10,color:vCol2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>Market Signal -- {sym}</div>
                            <div style={{fontSize:18,fontWeight:900,color:vCol2,marginBottom:4}}>{verdict2}</div>
                            {showRW2&&<div style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#633806",background:"#FAEEDA",padding:"2px 8px",borderRadius:10,border:"0.5px solid #EF9F27"}}>
                              <span style={{width:6,height:6,borderRadius:"50%",background:"#BA7517",display:"inline-block"}}/>
                              Reversal Watch -- {revCount2} signals
                            </div>}
                          </div>
                          <div style={{display:"flex",gap:7,flexShrink:0}}>
                            <div style={{textAlign:"center",padding:"5px 10px",background:"rgba(255,255,255,0.45)",borderRadius:7}}>
                              <div style={{fontSize:9,color:vCol2}}>Trend</div>
                              <div style={{fontSize:15,fontWeight:700,color:vCol2}}>{tScore2}</div>
                            </div>
                            <div style={{textAlign:"center",padding:"5px 10px",background:"rgba(255,255,255,0.45)",borderRadius:7}}>
                              <div style={{fontSize:9,color:vCol2}}>Momentum</div>
                              <div style={{fontSize:15,fontWeight:700,color:vCol2}}>{mScore2}</div>
                            </div>
                          </div>
                          <Dots2 score={vDot2} sz={10}/>
                        </div>

                        {/* Trend signals */}
                        <div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Trend &amp; Price Action <span style={{fontWeight:400,color:"#bbb"}}>55%</span></div>
                        {SIGS2.filter(function(s){return s.cat==="Trend";}).map(function(sig){
                          var sc=scores2[sig.key],col=scColMap2[sc],lbl=scLbMap2[sc],pts=Math.round((sc/5)*sig.w);
                          return (<div key={sig.key} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"0.5px solid #f5f2ec"}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:11,fontWeight:700,color:"#111",marginBottom:1}}>{sig.label}</div>
                              <div style={{fontSize:10,color:"#999"}}>{sig.val}</div>
                            </div>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
                              <Dots2 score={sc} sz={7}/>
                              <span style={{fontSize:9,fontWeight:600,color:col}}>{lbl}</span>
                              <span style={{fontSize:9,color:"#bbb"}}>{pts}/{sig.w}pts</span>
                            </div>
                          </div>);
                        })}

                        {/* Momentum signals */}
                        <div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8,marginTop:14,paddingTop:12,borderTop:"0.5px solid #f0ede6"}}>Momentum <span style={{fontWeight:400,color:"#bbb"}}>45%</span></div>
                        {SIGS2.filter(function(s){return s.cat==="Momentum";}).map(function(sig){
                          var sc=scores2[sig.key],col=scColMap2[sc],lbl=scLbMap2[sc],pts=Math.round((sc/5)*sig.w);
                          return (<div key={sig.key} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"0.5px solid #f5f2ec"}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
                                <span style={{fontSize:11,fontWeight:700,color:"#111"}}>{sig.label}</span>
                                {sig.key==="vol"&&<span style={{fontSize:9,fontWeight:600,color:"#0C447C",background:"#E6F1FB",padding:"1px 5px",borderRadius:5}}>new</span>}
                              </div>
                              <div style={{fontSize:10,color:"#999"}}>{sig.val}</div>
                            </div>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
                              <Dots2 score={sc} sz={7}/>
                              <span style={{fontSize:9,fontWeight:600,color:col}}>{lbl}</span>
                              <span style={{fontSize:9,color:"#bbb"}}>{pts}/{sig.w}pts</span>
                            </div>
                          </div>);
                        })}

                        {/* Reversal Detection */}
                        <div style={{marginTop:14,paddingTop:12,borderTop:"0.5px solid #f0ede6"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}>
                            <div style={{fontSize:10,fontWeight:700,color:"#854F0B",textTransform:"uppercase",letterSpacing:"0.07em"}}>Reversal Detection</div>
                            {revCount2>0
                              ?<div style={{fontSize:10,color:"#633806",background:"#FAEEDA",padding:"2px 9px",borderRadius:8,border:"0.5px solid #EF9F27",fontWeight:600}}>{revCount2} active -- total bonus <span style={{color:"#1a6a1a"}}>+{bonus2}pts</span></div>
                              :<div style={{fontSize:10,color:"#bbb"}}>0 active -- 0 pts</div>
                            }
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                            {revSignals2.map(function(rv,i){
                              var pts=rv.active?bonusPer2:0;
                              return (<div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 9px",background:rv.active?"#FAEEDA":"#fafaf8",borderRadius:7,border:"0.5px solid "+(rv.active?"#EF9F27":"#e8e4dc")}}>
                                <div style={{width:17,height:17,borderRadius:"50%",background:rv.active?"#BA7517":"#d0ccc5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                  <span style={{fontSize:9,fontWeight:700,color:"#fff"}}>{rv.active?"!":"-"}</span>
                                </div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:10,fontWeight:rv.active?700:400,color:rv.active?"#412402":"#aaa"}}>{rv.label}</div>
                                  <div style={{fontSize:9,color:rv.active?"#633806":"#bbb"}}>{rv.note}</div>
                                </div>
                                <div style={{flexShrink:0}}>
                                  {rv.active?<span style={{fontSize:10,fontWeight:700,color:"#27500A",background:"#EAF3DE",padding:"2px 7px",borderRadius:6,border:"0.5px solid #7abd00"}}>+{pts}pts</span>:<span style={{fontSize:10,color:"#ccc"}}>0pts</span>}
                                </div>
                              </div>);
                            })}
                          </div>
                          {/* Calculation strip */}
                          <div style={{padding:"9px 12px",background:"#f9f7f4",borderRadius:8,border:"0.5px solid #e8e4dc"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                              <div style={{padding:"3px 9px",background:vBg2,borderRadius:5,border:"0.5px solid "+vCol2,fontSize:11,fontWeight:600,color:vCol2}}>Base {base2}</div>
                              <span style={{fontSize:11,color:"#bbb"}}>+</span>
                              <div style={{padding:"3px 9px",background:bonus2>0?"#EAF3DE":"#f5f5f5",borderRadius:5,border:"0.5px solid "+(bonus2>0?"#7abd00":"#ddd"),fontSize:11,fontWeight:600,color:bonus2>0?"#27500A":"#bbb"}}>Bonus +{bonus2}</div>
                              <span style={{fontSize:11,color:"#bbb"}}>=</span>
                              <div style={{padding:"3px 10px",background:vCol2,borderRadius:5,fontSize:12,fontWeight:700,color:"#fff"}}>{final2}/100 {verdict2}</div>
                              {base2>=50&&<span style={{fontSize:10,color:"#aaa"}}>(bonus only when base &lt; 50)</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{marginTop:10,fontSize:11,color:"#bbb"}}>
                          Powered by Massive.com real-time data. Weekly/monthly horizon. Not financial advice.
                        </div>
                      </div>
                    );
                  })()}

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


              </div>
            );
          })()}

        </div>
      </div>
      {/* Sticky disclaimer footer */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:100,
        background:"#111",
        borderTop:"1px solid #333",
      }}>
        {/* Expandable full disclaimer -- slides up above the bar */}
        <div id="disc-full" style={{
          display:"block",
          maxHeight:"50vh",
          overflowY:"auto",
          padding:"14px 20px",
          borderBottom:"0.5px solid #333",
          background:"#111",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:600, color:"#F05A1A", textTransform:"uppercase", letterSpacing:"0.06em" }}>Disclaimer</span>
            <button
              onClick={function(){ var d=document.getElementById("disc-full"); if(d) d.style.display="none"; var t=document.getElementById("disc-tap"); if(t) t.innerText="tap to read"; }}
              style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#666", lineHeight:1, padding:"0 2px" }}>
              &times;
            </button>
          </div>
          <div style={{ fontSize:11, color:"#aaa", lineHeight:1.8 }}>
            Colaboree StockInsight is a private, community-focused website created for friends and family who want to learn about investing. Any fees collected fund operating costs and time effort to refine the module. All analysis, ratings, and AI-generated insights are for general informational and educational purposes only. They do not constitute financial product advice, investment advice, or any form of professional advice.
          </div>
          <div style={{ fontSize:11, color:"#aaa", lineHeight:1.8, marginTop:8 }}>
            This website does not consider your personal financial situation. Before any investment decision, seek advice from a licensed financial adviser. Past performance is not a reliable indicator of future results. Data from Yahoo Finance and Massive.com may be delayed or inaccurate. Use at your own risk. AI analysis by Claude (Anthropic). &copy; Colaboree StockInsight 2026.
          </div>
        </div>
        {/* Slim always-visible bar */}
        <div
          style={{ padding:"7px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}
          onClick={function(){
            var d=document.getElementById("disc-full");
            var t=document.getElementById("disc-tap");
            if(d){
              var open=d.style.display!=="none";
              d.style.display=open?"none":"block";
              if(t) t.innerText=open?"tap to read":"tap to close";
            }
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:14, height:14, borderRadius:"50%", background:"#222", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#c8f000" strokeWidth="1.2"/>
                <path d="M6 5v4M6 3.5v.5" stroke="#c8f000" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize:10, fontWeight:600, color:"#c8f000", textTransform:"uppercase", letterSpacing:"0.06em" }}>General information only -- not financial advice</span>
          </div>
          <span id="disc-tap" style={{ fontSize:10, color:"#555" }}>tap to read</span>
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
      </div>
    </div>
  );
}
