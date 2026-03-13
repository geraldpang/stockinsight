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
    "?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile,earningsTrend"
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
  };
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

  useEffect(function() {
    setQ(null); setOv(null); setEpsHistory(null); setEpsError(false); setInsightCache({}); setInsightLoading(false); setInsightTab("business"); setMsg("Fetching live data for " + sym + "..."); delete ovCache[sym]; delete qCache[sym];

    getQuote(sym).then(function(res) {
      if (res) { setQ(res); setMsg(""); }
      else setMsg("Could not load quote for " + sym + ". Yahoo Finance may be unavailable.");
    }).catch(function() {
      setMsg("Network error loading quote for " + sym + ".");
    });

    getOverview(sym).then(function(res) {
      if (res) setOv(res);
    }).catch(function() {});

    // Auto-generate all 4 AI insight tabs in parallel
    var aiTabs = ["business", "moat", "financial", "technical"];
    aiTabs.forEach(function(tabId) {
      var prompts = {
        business: "You are a professional equity research analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), write a concise Business Overview covering: what the company does, how it makes money, key products or services, major competitors, and overall industry position. Be analytical and factual. Use plain text paragraphs, no markdown headers.",
        moat: "You are a professional equity research analyst trained in Warren Buffett and Morningstar-style analysis. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), write exactly 2 sentences for each of the following moat dimensions. Label each section clearly. Format: [Label]: [2 sentences]. Sections: 1. Network Effects 2. Switching Costs 3. Cost Advantage 4. Intangible Assets (brand, patents, licenses, regulatory approvals) 5. Efficient Scale 6. Ecosystem / Customer Lock-in. End with one line: Moat Classification: Wide / Narrow / None",
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

    // Fetch 10-year annual EPS + Revenue from Anthropic API (Claude)
    fetch("/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: "Return ONLY a valid JSON array, no markdown, no explanation. For stock symbol " + sym + ", provide annual data for the 10 most recent completed fiscal years up to and including " + (new Date().getFullYear() - 1) + ". Each item has three fields: year as a number, eps as a decimal number, revenue as a string like $XB or $XT. Use diluted EPS. Skip years with no data. Most recent year must be " + (new Date().getFullYear() - 1) + "."
        }]
      })
    }).then(function(r) { return r.json(); })
      .then(function(data) {
        var text = data && data.content && data.content[0] && data.content[0].text;
        if (!text) { setEpsError(true); return; }
        // Strip any accidental markdown fences
        text = text.split("\x60\x60\x60json").join("").split("\x60\x60\x60").join("").trim();
        var rows = JSON.parse(text);
        if (!Array.isArray(rows) || rows.length === 0) { setEpsError(true); return; }
        rows.sort(function(a, b) { return b.year - a.year; });
        setEpsHistory(rows);
      }).catch(function() { setEpsError(true); });


  }, [sym]);

  // -- Insight tab fetch -------------------------------------------------------
  function fetchInsight(tabId) {
    if (insightCache[tabId] || insightLoading) return;
    setInsightLoading(true);

    var prompts = {
      business: "You are a professional equity research analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), write a concise Business Overview covering: what the company does, how it makes money, key products or services, major competitors, and overall industry position. Be analytical and factual. Use plain text paragraphs, no markdown headers.",

      moat: "You are a professional equity research analyst trained in Warren Buffett and Morningstar-style analysis. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), write exactly 2 sentences for each of the following moat dimensions. Label each section clearly. Format: [Label]: [2 sentences]. Sections: 1. Network Effects 2. Switching Costs 3. Cost Advantage 4. Intangible Assets (brand, patents, licenses, regulatory approvals) 5. Efficient Scale 6. Ecosystem / Customer Lock-in. End with one line: Moat Classification: Wide / Narrow / None",

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

          {/* Badges */}
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            <span style={{ background:moatBg, color:moatFg, fontWeight:700, fontSize:12, padding:"4px 12px", borderRadius:6 }}>
              {moat} Moat
            </span>
            <div style={{ display:"flex", border:"1px solid #ccc", borderRadius:6, overflow:"hidden", fontSize:12 }}>
              <span style={{ background:"#111", color:"#f0ede6", fontWeight:700, padding:"4px 10px" }}>IntrinsicValue(TM)</span>
              <span style={{ background:"#e8e4dc", color:"#111", fontWeight:700, padding:"4px 10px" }}>{oracle}</span>
            </div>
          </div>

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
              <div style={{ fontSize:12, color:"#aaa" }}>Next Earnings Date: <span style={{ color:"#555" }}>-</span></div>
            </div>
          ) : (
            <div style={{ color:"#aaa", fontSize:14, marginBottom:16 }}>Loading price...</div>
          )}

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
            ];

            function handleTab(id) {
              setInsightTab(id);
            }

            // Parse moat section into named rows
            function parseMoat(text) {
              if (!text) return null;
              var sections = [
                "Network Effects","Switching Costs","Cost Advantage",
                "Intangible Assets","Efficient Scale","Ecosystem / Customer Lock-in"
              ];
              var result = [];
              sections.forEach(function(sec) {
                var re = new RegExp(sec + "[^:]*:\s*([\s\S]*?)(?=Network Effects|Switching Costs|Cost Advantage|Intangible Assets|Efficient Scale|Ecosystem|Moat Classification|$)");
                var m = text.match(re);
                if (m) result.push({ label: sec, body: m[1].trim() });
              });
              var classMatch = text.match(/Moat Classification:\s*(.+)/);
              return { sections: result, classification: classMatch ? classMatch[1].trim() : null };
            }

            // Parse technical into structured sections
            function parseTechnical(text) {
              if (!text) return null;
              var ratingMatch = text.match(/Technical Rating:\s*(.+)/);
              var entryMatch  = text.match(/Entry Timing View:\s*(.+)/);
              return {
                body:   text,
                rating: ratingMatch ? ratingMatch[1].trim() : null,
                entry:  entryMatch  ? entryMatch[1].trim()  : null,
              };
            }

            // Parse financial strength
            function parseFinancial(text) {
              if (!text) return null;
              var classMatch = text.match(/Financial Strength Classification:\s*(.+)/);
              return {
                body:           text,
                classification: classMatch ? classMatch[1].trim() : null,
              };
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
                      {!tabContent && (
                        <div style={{ textAlign:"center", padding:"40px 0" }}>
                          <div style={{ fontSize:12, color:"#888", marginBottom:14 }}>Generating {insightTab} analysis for {sym}...</div>
                          <div style={{ display:"inline-block", width:26, height:26, border:"3px solid #e0dbd0", borderTop:"3px solid " + LIME, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
                        </div>
                      )}

                      {/* Business Overview */}
                      {insightTab === "business" && tabContent && (
                        <div style={{ fontSize:13, color:"#333", lineHeight:1.8 }}>
                          {tabContent}
                        </div>
                      )}

                      {/* Economic MOAT */}
                      {insightTab === "moat" && tabContent && (function() {
                        var parsed = parseMoat(tabContent);
                        if (!parsed || parsed.sections.length === 0) {
                          return <div style={{ fontSize:13, color:"#333", lineHeight:1.8 }}>{tabContent}</div>;
                        }
                        return (
                          <div>
                            {parsed.sections.map(function(sec, i) {
                              return (
                                <div key={i} style={{ marginBottom:14, paddingBottom:14, borderBottom: i < parsed.sections.length-1 ? "1px solid #f0ede6" : "none" }}>
                                  <div style={{ fontSize:12, fontWeight:700, color:"#111", marginBottom:4 }}>{sec.label}</div>
                                  <div style={{ fontSize:13, color:"#444", lineHeight:1.7 }}>{sec.body}</div>
                                </div>
                              );
                            })}
                            {parsed.classification && (
                              <div style={{ marginTop:12, padding:"8px 14px", background:"#f5f2ec", borderRadius:8, display:"inline-block" }}>
                                <span style={{ fontSize:12, color:"#888" }}>Moat Classification: </span>
                                <span style={{ fontSize:13, fontWeight:700, color:ratingColor(parsed.classification) }}>{parsed.classification}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Financial Strength */}
                      {insightTab === "financial" && tabContent && (function() {
                        var parsed = parseFinancial(tabContent);
                        return (
                          <div>
                            <div style={{ fontSize:13, color:"#333", lineHeight:1.8, marginBottom:14 }}>
                              {parsed.body.replace(/Financial Strength Classification:.+/, "").trim()}
                            </div>
                            {parsed.classification && (
                              <div style={{ padding:"8px 14px", background:"#f5f2ec", borderRadius:8, display:"inline-block" }}>
                                <span style={{ fontSize:12, color:"#888" }}>Financial Strength: </span>
                                <span style={{ fontSize:13, fontWeight:700, color:ratingColor(parsed.classification) }}>{parsed.classification}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Technical Analysis */}
                      {insightTab === "technical" && tabContent && (function() {
                        var parsed = parseTechnical(tabContent);
                        return (
                          <div>
                            <div style={{ fontSize:13, color:"#333", lineHeight:1.8, marginBottom:14 }}>
                              {parsed.body.replace(/Technical Rating:.+/, "").replace(/Entry Timing View:.+/, "").trim()}
                            </div>
                            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                              {parsed.rating && (
                                <div style={{ padding:"8px 14px", background:"#f5f2ec", borderRadius:8 }}>
                                  <span style={{ fontSize:12, color:"#888" }}>Technical Rating: </span>
                                  <span style={{ fontSize:13, fontWeight:700, color:ratingColor(parsed.rating) }}>{parsed.rating}</span>
                                </div>
                              )}
                              {parsed.entry && (
                                <div style={{ padding:"8px 14px", background:"#f5f2ec", borderRadius:8 }}>
                                  <span style={{ fontSize:12, color:"#888" }}>Entry Timing: </span>
                                  <span style={{ fontSize:13, fontWeight:700, color:ratingColor(parsed.entry) }}>{parsed.entry}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}


                    </div>
                  )}

                </div>
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
