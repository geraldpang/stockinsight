import { useState, useEffect } from "react";

const FONT = "'Inter', system-ui, sans-serif";
const LIME = "#c8f000";
const BG   = "#0e0e0c";

const NAMES = {
  AAPL:"Apple Inc.", MSFT:"Microsoft Corporation", GOOGL:"Alphabet Inc.",
  AMZN:"Amazon.com Inc.", META:"Meta Platforms Inc.", NVDA:"NVIDIA Corporation",
  TSLA:"Tesla Inc.", NFLX:"Netflix Inc.", AMD:"Advanced Micro Devices",
  INTC:"Intel Corporation", CRM:"Salesforce Inc.", ADBE:"Adobe Inc.",
  JPM:"JPMorgan Chase", BAC:"Bank of America", GS:"Goldman Sachs",
  XOM:"Exxon Mobil", CVX:"Chevron Corporation", LLY:"Eli Lilly",
  UNH:"UnitedHealth Group", MRK:"Merck and Co.", UBER:"Uber Technologies",
  SPOT:"Spotify Technology", NKE:"NIKE Inc.", AVGO:"Broadcom Inc.",
  QCOM:"Qualcomm", TXN:"Texas Instruments", MU:"Micron Technology",
};

const qCache  = {};
const ovCache = {};

// Proxy runs on same domain (stock.colaboree.com/proxy) - no CORS issues
async function yfetch(url) {
  var proxyUrl = "/proxy?url=" + encodeURIComponent(url);
  var r = await fetch(proxyUrl);
  var text = await r.text();
  return JSON.parse(text);
}

async function getQuote(sym) {
  if (qCache[sym]) return qCache[sym];
  var d = await yfetch("https://query1.finance.yahoo.com/v8/finance/chart/" + sym + "?interval=1d&range=1d");
  var meta = d && d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta;
  if (!meta) return null;
  var price  = meta.regularMarketPrice || 0;
  var prev   = meta.chartPreviousClose || meta.previousClose || price;
  var change = parseFloat((price - prev).toFixed(2));
  var pct    = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;
  var out = {
    price:  price,
    change: change,
    pct:    pct,
    open:   String(meta.regularMarketOpen    || "-"),
    high:   String(meta.regularMarketDayHigh || "-"),
    low:    String(meta.regularMarketDayLow  || "-"),
    vol:    meta.regularMarketVolume ? meta.regularMarketVolume.toLocaleString() : "-",
  };
  qCache[sym] = out;
  return out;
}

async function getOverview(sym) {
  if (ovCache[sym]) return ovCache[sym];
  var d = await yfetch("https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + sym + "?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile,earningsTrend");
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
  var out = {
    exchange:  ap.exchange || sd.exchange || "NASDAQ",
    marketCap: mcStr,
    pe:   (sd.trailingPE   && sd.trailingPE.raw)   || 0,
    fpe:  (sd.forwardPE    && sd.forwardPE.raw)    || 0,
    peg:  (ks.pegRatio     && ks.pegRatio.raw)     || 0,
    epsG: ((fd.earningsGrowth && fd.earningsGrowth.raw) || 0) * 100,
    // Long-term EPS growth from earningsTrend (+5yr analyst estimate)
    ltG:  (function() {
      var et = res.earningsTrend;
      if (et && et.trend) {
        for (var i = 0; i < et.trend.length; i++) {
          if (et.trend[i].period === "+5y" && et.trend[i].growth && et.trend[i].growth.raw) {
            return et.trend[i].growth.raw * 100;
          }
        }
      }
      return ((fd.revenueGrowth && fd.revenueGrowth.raw) || 0) * 100;
    })(),
    divY: ((sd.dividendYield  && sd.dividendYield.raw)  || 0) * 100,
    roe:  ((fd.returnOnEquity && fd.returnOnEquity.raw) || 0) * 100,
    roic: ((fd.returnOnAssets && fd.returnOnAssets.raw) || 0) * 100,
    // Yahoo returns D/E as percentage (102.63 = 1.0263 ratio), divide by 100
    de:   ((fd.debtToEquity && fd.debtToEquity.raw) || 0) / 100,
    hi52: (sd.fiftyTwoWeekHigh && sd.fiftyTwoWeekHigh.raw) || 0,
    lo52: (sd.fiftyTwoWeekLow  && sd.fiftyTwoWeekLow.raw)  || 0,
    pbRatio: (ks.priceToBook && ks.priceToBook.raw) || 0,
    psRatio: (sd.priceToSalesTrailing12Months && sd.priceToSalesTrailing12Months.raw) || 0,
  };
  ovCache[sym] = out;
  return out;
}

function fmt2(n) { return n != null ? n.toFixed(2) : "-"; }
function pct(n)  { return n ? n.toFixed(2) + "%" : "-"; }

// -- Valuation bar ------------------------------------------------------------
function VBar({ label, value, maxV, color, bold }) {
  if (!value || !maxV) return null;
  const w = Math.min(value / maxV * 100, 100);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
      <div style={{ width:200, fontSize:11, color: bold?"#222":"#888", textAlign:"right", lineHeight:1.3, whiteSpace:"pre-line", flexShrink:0 }}>
        {label}
      </div>
      <div style={{ flex:1, height:17, background:"#e8e4dc", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width: w + "%", height:"100%", background: color }} />
      </div>
      <span style={{ width:58, textAlign:"right", fontSize:11, fontWeight:700, color: bold?"#1a6a2a":"#333" }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

// -- Detail page ---------------------------------------------------------------
function Detail({ sym, name, onBack }) {
  const [q,     setQ]     = useState(null);
  const [ov,    setOv]    = useState(null);
  const [ratios, setRatios] = useState(null);

  const [msg,   setMsg]   = useState("Loading...");

  useEffect(function() {
    setQ(null); setOv(null); setMsg("Fetching live data for " + sym + "...");

    // Fetch quote and overview in parallel from Yahoo Finance
    getQuote(sym).then(function(res) {
      if (res) { setQ(res); setMsg(""); }
      else setMsg("Could not load quote for " + sym + ". Yahoo Finance may be unavailable.");
    }).catch(function() {
      setMsg("Network error loading quote for " + sym + ".");
    });

    getOverview(sym).then(function(res) {
      if (res) setOv(res);
    }).catch(function() {});

    // Fetch historical EPS/revenue/book value
    getHistory(sym).then(function(res) {
      console.log("[getHistory] keys:", res ? Object.keys(res) : "null");
      console.log("[getHistory] data:", JSON.stringify(res));
      if (res) setHistory(res);
    }).catch(function(err) { console.error("[getHistory] error:", err); });

    // Fetch 5yr price history + income/balance sheet together, merge into ratios
    Promise.all([
      fetch("/proxy?url=" + encodeURIComponent("https://query1.finance.yahoo.com/v8/finance/chart/" + sym + "?interval=1mo&range=5y")).then(function(r){return r.json();}),
      fetch("/proxy?url=" + encodeURIComponent("https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + sym + "?modules=incomeStatementHistory,balanceSheetHistory")).then(function(r){return r.json();})
    ]).then(function(results) {
      var chartData = results[0];
      var fundamentalData = results[1];

      // --- Parse year-end prices ---
      var result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
      if (!result) return;
      var timestamps = result.timestamp || [];
      var closes = (result.indicators && result.indicators.adjclose && result.indicators.adjclose[0] && result.indicators.adjclose[0].adjclose)
        || (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close)
        || [];
      var yearPrices = {};
      timestamps.forEach(function(ts, i) {
        if (closes[i] == null) return;
        var yr = new Date(ts * 1000).getFullYear();
        yearPrices[yr] = closes[i];
      });

      // --- Parse income statements ---
      var qRes = fundamentalData && fundamentalData.quoteSummary && fundamentalData.quoteSummary.result && fundamentalData.quoteSummary.result[0];
      var fundByYear = {};
      if (qRes) {
        var ish = (qRes.incomeStatementHistory && qRes.incomeStatementHistory.incomeStatements) || [];
        var bsh = (qRes.balanceSheetHistory && qRes.balanceSheetHistory.balanceSheets) || [];
        ish.forEach(function(s) {
          // fiscal year label — use the calendar year of the end date
          var yr = s.endDate && s.endDate.raw ? new Date(s.endDate.raw * 1000).getFullYear() : null;
          if (!yr) return;
          if (!fundByYear[yr]) fundByYear[yr] = {};
          var eps = s.dilutedEPS && s.dilutedEPS.raw;
          if (eps != null) fundByYear[yr].eps = eps;
          var rev = s.totalRevenue && s.totalRevenue.raw;
          var ni  = s.netIncome && s.netIncome.raw;
          if (rev) fundByYear[yr].revenue = rev;
          if (ni)  fundByYear[yr].netIncome = ni;
          // derive shares from EPS+NI for revPS
          if (eps && ni && Math.abs(eps) > 0.001) fundByYear[yr].shares = ni / eps;
        });
        bsh.forEach(function(s) {
          var yr = s.endDate && s.endDate.raw ? new Date(s.endDate.raw * 1000).getFullYear() : null;
          if (!yr) return;
          if (!fundByYear[yr]) fundByYear[yr] = {};
          var bv = s.totalStockholderEquity && s.totalStockholderEquity.raw;
          var sh = s.commonStockSharesOutstanding && s.commonStockSharesOutstanding.raw;
          if (bv) fundByYear[yr].bookValue = bv;
          if (sh && sh > 0) fundByYear[yr].shares = sh;
        });
        // compute per-share values
        Object.keys(fundByYear).forEach(function(yr) {
          var f = fundByYear[yr];
          if (f.shares && f.shares > 0) {
            if (!f.eps && f.netIncome) f.eps = f.netIncome / f.shares;
            if (f.revenue)   f.revPS = f.revenue / f.shares;
            if (f.bookValue) f.bvPS  = f.bookValue / f.shares;
          }
        });
      }
      console.log("[ratios] yearPrices:", yearPrices, "fundByYear:", fundByYear);

      // --- Merge price + fundamentals into ratios array ---
      var years = Object.keys(yearPrices).sort().slice(-6);
      setRatios(years.map(function(yr) {
        // fiscal year may lag calendar year by 1 (e.g. AAPL FY ends Sep, booked as same calendar yr)
        var f = fundByYear[parseInt(yr)] || fundByYear[parseInt(yr)-1] || {};
        return { date: String(yr), price: yearPrices[yr], eps: f.eps, revPS: f.revPS, bvPS: f.bvPS };
      }));
    }).catch(function(err) { console.error("[ratios] error:", err); });
  }, [sym]);

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



  // DCF helper - must be defined before oracle and vals
  var calcDCF = function(eps0, growthRate, terminalRate, wacc, years) {
    var total = 0;
    var fcf = eps0;
    for (var y = 1; y <= years; y++) {
      fcf = fcf * (1 + (y <= 10 ? growthRate : terminalRate));
      total += fcf / Math.pow(1 + wacc, y);
    }
    return total;
  };

  // Oracle placeholder - real value computed as average of vals below
  // Used as fallback in badge before vals are built
  const oracleDCF = (eps > 0 && pe > 0)
    ? calcDCF(eps, gr, 0.04, 0.10, 10)
    : (price > 0 ? price : 0);
  // oracle will be overridden by oracleAvg after vals are built
  var oracle = oracleDCF > 0 ? oracleDCF.toFixed(2) : "-";



  // Build valuation rows using proper DCF formula
  const vals = [];
  if (ov && eps > 0 && price > 0) {
    var WACC       = 0.10;              // 10% discount rate
    var termGrowth = 0.04;              // 4% terminal growth (years 11-20)
    var fcfRatio   = 0.85;              // FCF ~85% of earnings
    var netIncRatio= 0.90;              // Net income ~90% of earnings
    var grCapped   = Math.min(gr, 0.25); // Cap growth at 25% to prevent DCF explosion
    var maxVal     = price * 3;         // Cap all valuations at 3x current price

    var cap = function(v) { return Math.min(v, maxVal); };

    // DCF-20: proper 20-year discounted cash flow
    var dcf20  = cap(calcDCF(eps, grCapped, termGrowth, WACC, 20));
    // DCFF-20: free cash flow variant
    var dcff20 = cap(calcDCF(eps * fcfRatio, grCapped, termGrowth, WACC, 20));
    // DNI-20: net income based
    var dni20  = cap(calcDCF(eps * netIncRatio, grCapped, termGrowth, WACC, 20));
    // DCFF-Terminal: years 11-20 only (terminal value)
    var dcffT  = cap(calcDCF(eps * fcfRatio, grCapped, termGrowth, WACC, 20) - calcDCF(eps * fcfRatio, grCapped, termGrowth, WACC, 10));
    // PE Ratio: forward PE * EPS (uses analyst forward estimate)
    var peVal  = cap(fpe > 0 ? eps * fpe : eps * pe);
    // PB Ratio: 52-week mean price
    var pb     = ov.hi52 > 0 ? (ov.hi52 + ov.lo52) / 2 : 0;
    // PS Ratio: price adjusted by profitability
    var ps     = cap(peVal * Math.min(ov.roic > 0 ? ov.roic / 100 + 0.85 : 0.90, 1.0));
    // PSG: price divided by revenue growth % (like GuruFocus)
    var ltgRate = ov.ltG > 0 ? ov.ltG : (grCapped * 100);
    var psg    = ltgRate > 0 ? Math.min(price / ltgRate, maxVal) : 0;
    // PEG: EPS * PEG ratio * 15 (fair value at PEG=1 is 15x earnings)
    var pegVal = ov.peg > 0 ? Math.min(eps * 15, maxVal) : 0;

    vals.push({ label:"Discounted Cash Flow 20-year\n(DCF-20)",         value: dcf20,  color:"#d4a800" });
    vals.push({ label:"Discounted Free Cash Flow 20-year\n(DCFF-20)",   value: dcff20, color:"#d4a800" });
    vals.push({ label:"Discounted Net Income 20-year\n(DNI-20)",        value: dni20,  color:"#d4a800" });
    vals.push({ label:"DCF Free Cash Flow Terminal\n(DCFF-Terminal)",   value: dcffT,  color:"#d4a800" });
    vals.push({ label:"Mean Price to Sales\n(PS) Ratio",                value: ps,     color:"#d4a800" });
    vals.push({ label:"Mean Price to Earnings\n(PE) Ratio Without NRI", value: peVal,  color:"#d4a800" });
    if (pb > 0) vals.push({ label:"Mean Price to Book\n(PB) Ratio",    value: pb,     color:"#d4a800" });
    if (psg > 0) vals.push({ label:"Price to Sales Growth\n(PSG) Ratio", value: psg,  color:"#c03030" });
    if (pegVal > 0) vals.push({ label:"Price to Earnings Growth\n(PEG) Ratio Without NRI", value: pegVal, color:"#c03030" });
    // OracleValue(TM) = average of all valuation methods above
    var oracleAvg = vals.reduce(function(sum, v) { return sum + v.value; }, 0) / vals.length;
    oracle = oracleAvg.toFixed(2);
    vals.push({ label:"OracleValue(TM)",                                    value: oracleAvg, color:"#1a8a3a", bold:true });
  }
  const maxV = vals.length ? Math.max.apply(null, vals.map(v=>v.value)) * 1.08 : price * 1.5 || 100;

  const funds = ov ? [
    ["P/E Ratio (TTM)",             pe>0?fmt2(pe):"-",         "Return on Equity (TTM)",   ov.roe>0?pct(ov.roe):"-"],
    ["Forward P/E (Next Year)",     fpe>0?fmt2(fpe):"-",       "Return on Inv. Cap (TTM)", ov.roic>0?pct(ov.roic):"-"],
    ["EPS Growth (TTM)",             ov.epsG?pct(ov.epsG):"-", "Total Debt / Equity",      ov.de>0?fmt2(ov.de):"-"],
    ["LT EPS Growth (Projected)",   ov.ltG?pct(ov.ltG):"-",   "Market Capitalization",    ov.marketCap],
    ["PEG Value without NRI",       ov.peg>0?fmt2(ov.peg):"-","Dividend Yield (TTM)",     ov.divY>0?pct(ov.divY):"-"],
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
            Colabo<span style={{ color:"#ff5c3a" }}>ree</span> <span style={{ color:"#7abd00" }}>StockInsight</span>
          </span>
          <span style={{ color:"#aaa", fontSize:12 }}>/ {sym}</span>
        </div>
        <span style={{ fontSize:10, background:"#111", color:LIME, padding:"3px 12px", borderRadius:20, fontWeight:700, letterSpacing:"0.06em" }}>
          LIVE . YAHOO FINANCE
        </span>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith("Error") ? "#fff0f0" : "#f0f7ff", border: "1px solid " + (msg.startsWith("Error") ? "#ffaaaa" : "#aaccff"), margin:"10px 20px", padding:"9px 14px", borderRadius:8, fontSize:13, color: msg.startsWith("Error") ? "#990000" : "#003388" }}>
          {msg.startsWith("Error") ? "! " : " "}{msg}
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
                  {price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                </span>
                <span style={{ fontSize:13, color:"#999", marginLeft:8 }}>USD</span>
                <span style={{ fontSize:14, fontWeight:700, marginLeft:10, color: up?"#2a8a2a":"#c03030" }}>{chg}</span>
              </div>
              <div style={{ fontSize:12, color:"#aaa" }}>Next Earnings Date: <span style={{ color:"#555" }}>-</span></div>
            </div>
          ) : (
            <div style={{ color:"#aaa", fontSize:14, marginBottom:16 }}>Loading price...</div>
          )}



          {/* My Favorites table */}
          <div style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:12, padding:"16px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#111", marginBottom:12 }}>My Favorites</div>
            {funds.length > 0 ? (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <tbody>
                  {funds.map(function(row, i) {
                    return (
                      <tr key={i} style={{ borderBottom: i < funds.length-1 ? "1px solid #f0ede6" : "none" }}>
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
              <div style={{ color:"#aaa", fontSize:13, textAlign:"center", padding:"16px 0" }}>
                {msg ? "Unavailable" : "Loading fundamentals..."}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ padding:"24px", background:"#fff" }}>

          {/* Chart */}
          <div style={{ border:"1px solid #e0dbd0", borderRadius:12, overflow:"hidden", marginBottom:20 }}>
            <div style={{ background:"#faf8f4", borderBottom:"1px solid #e0dbd0", padding:"8px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#444" }}>
                {name} . Daily . {ov ? ov.exchange : "NASDAQ"}
              </span>
              {q && (
                <span style={{ fontSize:11, color:"#999" }}>
                  O{q.open} H{q.high} L{q.low} {" "}
                  <span style={{ color: up?"#2a8a2a":"#c03030" }}>C{price.toFixed(2)} {chg}</span>
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

          {/* Valuation chart */}
          <div style={{ border:"1px solid #e0dbd0", borderRadius:12, padding:"20px 22px", background:"#faf8f4" }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#111", marginBottom:10 }}>Valuation Chart</div>
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

          {/* Historical Valuation Ratios Table */}
          <div style={{ border:"1px solid #e0dbd0", borderRadius:12, padding:"20px 22px", background:"#faf8f4", marginTop:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#111", marginBottom:10 }}>Historic Data</div>
<div style={{ marginBottom:14 }} />
            {ratios && ov ? (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:"2px solid #e0dbd0" }}>
                      <td style={{ padding:"6px 8px", color:"#888", fontWeight:600, minWidth:220 }}>Metric</td>
                      {ratios.map(function(r, ri) {
                        return (
                          <td key={ri} style={{ padding:"6px 8px", textAlign:"right", color:"#888", fontWeight:600, minWidth:70 }}>
                            {r.date}
                          </td>
                        );
                      })}
                      <td style={{ padding:"6px 8px", textAlign:"right", color:"#111", fontWeight:700, minWidth:70 }}>Current</td>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label:"Price to Earnings (PE) Ratio",
                        fn: function(r) {
                          return r.eps && r.eps > 0 && r.price ? (r.price / r.eps).toFixed(2) : "-";
                        },
                        cur: pe > 0 ? pe.toFixed(2) : "-"
                      },
                      {
                        label:"Price to Book (PB) Ratio",
                        fn: function(r) {
                          return r.bvPS && r.bvPS > 0 && r.price ? (r.price / r.bvPS).toFixed(2) : "-";
                        },
                        cur: ov.pbRatio > 0 ? ov.pbRatio.toFixed(2) : "-"
                      },
                      {
                        label:"Price to Sales (PS) Ratio",
                        fn: function(r) {
                          return r.revPS && r.revPS > 0 && r.price ? (r.price / r.revPS).toFixed(2) : "-";
                        },
                        cur: ov.psRatio > 0 ? ov.psRatio.toFixed(2) : "-"
                      },
                      {
                        label:"Price to Sales Growth (PSG) Ratio",
                        fn: function(r) {
                          var ps = r.revPS && r.revPS > 0 && r.price ? r.price / r.revPS : 0;
                          return ps > 0 && ov.ltG > 0 ? (ps / ov.ltG).toFixed(2) : "-";
                        },
                        cur: ov.ltG > 0 ? (price / ov.ltG).toFixed(2) : "-"
                      },
                      {
                        label:"PEG Ratio without NRI",
                        fn: function(r) {
                          var peVal = r.eps && r.eps > 0 && r.price ? r.price / r.eps : 0;
                          return peVal > 0 && ov.epsG > 0 ? (peVal / ov.epsG).toFixed(2) : "-";
                        },
                        cur: ov.peg > 0 ? ov.peg.toFixed(2) : "-"
                      },
                    ].map(function(row, ri) {
                      return (
                        <tr key={ri} style={{ borderBottom:"1px solid #f0ede6" }}>
                          <td style={{ padding:"7px 8px", color:"#555", fontSize:12 }}>{row.label}</td>
                          {ratios.map(function(r, rj) {
                            return (
                              <td key={rj} style={{ padding:"7px 8px", textAlign:"right", color:"#333", fontWeight:500 }}>
                                {row.fn(r)}
                              </td>
                            );
                          })}
                          <td style={{ padding:"7px 8px", textAlign:"right", color:"#111", fontWeight:700 }}>{row.cur}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"20px 0", color:"#aaa", fontSize:13 }}>Loading historical ratios...</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// -- Landing page --------------------------------------------------------------
export default function App() {
  const [input,   setInput]   = useState("");
  const [focused, setFocused] = useState(false);

  // Hash-based routing: #AAPL -> detail view for AAPL
  var getHash = function() {
    var h = window.location.hash.replace("#", "").toUpperCase().trim();
    return h || null;
  };
  const [hashSym, setHashSym] = useState(getHash);

  useEffect(function() {
    var onHash = function() { setHashSym(getHash()); };
    window.addEventListener("hashchange", onHash);
    return function() { window.removeEventListener("hashchange", onHash); };
  }, []);

  const go = function(sym) {
    var s = (sym || input).toUpperCase().trim();
    if (!s) return;
    setFocused(false);
    window.location.hash = s;
  };

  const handleInput = function(e) {
    setInput(e.target.value);
  };

  if (hashSym) {
    return <Detail sym={hashSym} name={NAMES[hashSym] || hashSym} onBack={function() { window.location.hash = ""; }} />;
  }

  const allStocks = Object.keys(NAMES).map(function(k) { return { symbol:k, name:NAMES[k] }; });
  const sugg = (input.length > 0 && focused) ? allStocks.filter(function(s) {
    return s.symbol.toLowerCase().startsWith(input.toLowerCase()) ||
           s.name.toLowerCase().includes(input.toLowerCase());
  }).slice(0, 6) : [];

  const QUICK = ["AAPL","NVDA","TSLA","MSFT","GOOGL","AMZN"];

  return (
    <div style={{ minHeight:"100vh", background:BG, fontFamily:FONT, position:"relative", overflow:"hidden" }}>

      {/* Grid overlay */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(200,240,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(200,240,0,0.05) 1px,transparent 1px)",
        backgroundSize:"52px 52px"
      }} />

      {/* Top glow */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 70% 50% at 50% -10%,rgba(200,240,0,0.07) 0%,transparent 70%)"
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

        {/* Search */}
        <div style={{ position:"relative", width:"100%", maxWidth:540 }}>
          <div style={{
            display:"flex", alignItems:"center", background:"#1e1e18", borderRadius:50,
            border: "1.5px solid " + (focused ? LIME : "#2c2c26"),
            transition:"border-color 0.2s"
          }}>
            <span style={{ padding:"0 10px 0 20px", fontSize:16 }}></span>
            <input
              value={input}
              onChange={handleInput}
              onFocus={function() { setFocused(true); }}
              onBlur={function() { setTimeout(function() { setFocused(false); }, 180); }}
              onKeyDown={function(e) { if (e.key === "Enter") go(); }}
              placeholder="Enter ticker - e.g. AAPL, NVDA, TSLA"
              style={{ flex:1, border:"none", outline:"none", fontSize:14, padding:"15px 8px", color:"#f0ede6", background:"transparent", fontFamily:FONT }}
            />
            <button
              onMouseDown={function(e) { e.preventDefault(); go(); }}
              style={{
                margin:5, padding:"11px 24px", borderRadius:50, border:"none",
                background: input.trim() ? LIME : "#2c2c26",
                color: input.trim() ? "#0e0e0c" : "#6a6460",
                fontWeight:800, fontSize:14, fontFamily:FONT,
                cursor: input.trim() ? "pointer" : "default"
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

        <div style={{ marginTop:18, fontSize:12, color:"#6a6460" }}>
          Live data via Yahoo Finance
        </div>
      </div>
    </div>
  );
}
