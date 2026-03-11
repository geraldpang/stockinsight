import { useState, useEffect } from "react";

var BG   = "#0e0e0c";
var FONT = "Inter, system-ui, sans-serif";

var NAMES = {
  AAPL:"Apple", MSFT:"Microsoft", GOOGL:"Alphabet", AMZN:"Amazon", META:"Meta",
  NVDA:"NVIDIA", TSLA:"Tesla", NFLX:"Netflix", AMD:"AMD", INTC:"Intel",
  CRM:"Salesforce", ADBE:"Adobe", JPM:"JPMorgan", BAC:"Bank of America",
  GS:"Goldman Sachs", XOM:"ExxonMobil", CVX:"Chevron", LLY:"Eli Lilly",
  UNH:"UnitedHealth", MRK:"Merck", UBER:"Uber", SPOT:"Spotify",
  NKE:"Nike", AVGO:"Broadcom", QCOM:"Qualcomm", TXN:"Texas Instruments", MU:"Micron"
};

async function yfetch(url) {
  var res = await fetch("/proxy?url=" + encodeURIComponent(url));
  return res.json();
}

async function getQuote(sym) {
  var d = await yfetch("https://query1.finance.yahoo.com/v8/finance/chart/" + sym + "?interval=1d&range=1d");
  var r = d && d.chart && d.chart.result && d.chart.result[0];
  if (!r) return null;
  var meta = r.meta || {};
  var price = meta.regularMarketPrice || 0;
  var prev  = meta.chartPreviousClose || meta.previousClose || price;
  var change = price - prev;
  var pct    = prev > 0 ? (change / prev) * 100 : 0;
  return {
    price,
    change,
    pct,
    open:     String(meta.regularMarketOpen    || "-"),
    high:     String(meta.regularMarketDayHigh || "-"),
    low:      String(meta.regularMarketDayLow  || "-"),
    vol:      meta.regularMarketVolume ? meta.regularMarketVolume.toLocaleString() : "-",
    exchange: meta.exchangeName || "NASDAQ"
  };
}

async function getOverview(sym) {
  var d = await yfetch("https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + sym +
    "?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile,earningsTrend");
  var res = d && d.quoteSummary && d.quoteSummary.result && d.quoteSummary.result[0];
  if (!res) return null;
  var sd = res.summaryDetail || {};
  var ks = res.defaultKeyStatistics || {};
  var fd = res.financialData || {};
  var et = res.earningsTrend || {};
  var mc = sd.marketCap && sd.marketCap.raw;
  var mcStr = mc >= 1e12 ? "$" + (mc/1e12).toFixed(2) + "T"
            : mc >= 1e9  ? "$" + (mc/1e9).toFixed(2) + "B"
            : mc >= 1e6  ? "$" + (mc/1e6).toFixed(2) + "M"
            : mc ? "$" + mc.toLocaleString() : "-";
  var ltGRaw = 0;
  if (et && et.trend) {
    var t5 = et.trend.find(function(t) { return t.period === "+5y"; });
    if (t5 && t5.growth && t5.growth.raw) ltGRaw = t5.growth.raw * 100;
  }
  var roic = fd.returnOnAssets && fd.returnOnAssets.raw ? fd.returnOnAssets.raw * 100 : 0;
  var de   = fd.debtToEquity && fd.debtToEquity.raw ? fd.debtToEquity.raw / 100 : 0;
  return {
    pe:      (sd.trailingPE  && sd.trailingPE.raw)  || 0,
    fpe:     (sd.forwardPE   && sd.forwardPE.raw)   || 0,
    pbRatio: (sd.priceToBook && sd.priceToBook.raw)  || 0,
    psRatio: (ks.priceToSalesTrailing12Months && ks.priceToSalesTrailing12Months.raw) || 0,
    peg:     (ks.pegRatio && ks.pegRatio.raw) || 0,
    hi52:    (sd.fiftyTwoWeekHigh && sd.fiftyTwoWeekHigh.raw) || 0,
    lo52:    (sd.fiftyTwoWeekLow  && sd.fiftyTwoWeekLow.raw)  || 0,
    epsG:    ((fd.revenueGrowth && fd.revenueGrowth.raw) || 0) * 100,
    ltG:     ltGRaw,
    roe:     (fd.returnOnEquity && fd.returnOnEquity.raw) ? fd.returnOnEquity.raw * 100 : 0,
    roic,
    de,
    div:     (sd.dividendYield && sd.dividendYield.raw) ? sd.dividendYield.raw * 100 : 0,
    mc:      mcStr,
    exchange: (res.assetProfile && res.assetProfile.country) || "US"
  };
}

async function getHistory(sym) {
  var d = await yfetch("https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + sym +
    "?modules=incomeStatementHistory,balanceSheetHistory");
  var res = d && d.quoteSummary && d.quoteSummary.result && d.quoteSummary.result[0];
  if (!res) return {};
  var inc = (res.incomeStatementHistory && res.incomeStatementHistory.incomeStatementHistory) || [];
  var bal = (res.balanceSheetHistory && res.balanceSheetHistory.balanceSheetStatements) || [];
  var out = {};
  inc.forEach(function(stmt) {
    var yr = stmt.endDate && stmt.endDate.raw
      ? new Date(stmt.endDate.raw * 1000).getFullYear()
      : null;
    if (!yr) return;
    var eps    = stmt.dilutedEPS && stmt.dilutedEPS.raw;
    var rev    = stmt.totalRevenue && stmt.totalRevenue.raw;
    out[yr] = out[yr] || {};
    if (eps != null) out[yr].eps = eps;
    if (rev != null) out[yr].rev = rev;
  });
  bal.forEach(function(stmt) {
    var yr = stmt.endDate && stmt.endDate.raw
      ? new Date(stmt.endDate.raw * 1000).getFullYear()
      : null;
    if (!yr) return;
    var shares = stmt.commonStockSharesOutstanding && stmt.commonStockSharesOutstanding.raw;
    var equity = stmt.totalStockholderEquity && stmt.totalStockholderEquity.raw;
    out[yr] = out[yr] || {};
    if (shares != null) out[yr].shares = shares;
    if (equity != null) out[yr].equity = equity;
  });
  return out;
}

function fmt2(n) { return n != null ? n.toFixed(2) : "-"; }
function fpct(n) { return n ? n.toFixed(2) + "%" : "-"; }

function VBar(props) {
  var label = props.label;
  var value = props.value;
  var maxV  = props.maxV;
  var color = props.color;
  var bold  = props.bold;
  if (!value || !maxV) return null;
  var w = Math.min(value / maxV * 100, 100);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
      <div style={{ width:200, fontSize:11, color: bold ? "#222" : "#888", textAlign:"right", lineHeight:1.3, whiteSpace:"pre-line", flexShrink:0 }}>
        {label}
      </div>
      <div style={{ flex:1, height:17, background:"#e8e4dc", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width: w + "%", height:"100%", background: color }} />
      </div>
      <span style={{ width:58, textAlign:"right", fontSize:11, fontWeight:700, color: bold ? "#1a6a2a" : "#333" }}>
        {"$" + value.toFixed(2)}
      </span>
    </div>
  );
}

function calcDCF(eps0, growthRate, terminalRate, wacc, yrs) {
  var total = 0;
  var fcf = eps0;
  for (var y = 1; y <= yrs; y++) {
    fcf = fcf * (1 + (y <= 10 ? growthRate : terminalRate));
    total += fcf / Math.pow(1 + wacc, y);
  }
  return total;
}

function Detail(props) {
  var sym    = props.sym;
  var name   = props.name;
  var onBack = props.onBack;

  var qState     = useState(null);
  var q          = qState[0];
  var setQ       = qState[1];

  var ovState    = useState(null);
  var ov         = ovState[0];
  var setOv      = ovState[1];

  var ratioState = useState(null);
  var ratios     = ratioState[0];
  var setRatios  = ratioState[1];

  var histState  = useState({});
  var hist       = histState[0];
  var setHist    = histState[1];

  var msgState   = useState("Loading...");
  var msg        = msgState[0];
  var setMsg     = msgState[1];

  useEffect(function() {
    setQ(null); setOv(null); setRatios(null); setHist({});
    setMsg("Fetching data for " + sym + "...");

    getQuote(sym).then(function(res) {
      if (res) { setQ(res); setMsg(""); }
      else setMsg("Could not load quote for " + sym + ".");
    }).catch(function() {
      setMsg("Network error loading " + sym + ".");
    });

    getOverview(sym).then(function(res) {
      if (res) setOv(res);
    }).catch(function() {});

    fetch("/proxy?url=" + encodeURIComponent(
      "https://query1.finance.yahoo.com/v8/finance/chart/" + sym + "?interval=1mo&range=5y"
    )).then(function(r) {
      return r.json();
    }).then(function(chartData) {
      var result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
      if (!result) return;
      var timestamps = result.timestamp || [];
      var adjclose = result.indicators && result.indicators.adjclose && result.indicators.adjclose[0];
      var closes = (adjclose && adjclose.adjclose)
        || (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close)
        || [];
      var yearPrices = {};
      timestamps.forEach(function(ts, i) {
        if (closes[i] == null) return;
        var yr = new Date(ts * 1000).getFullYear();
        yearPrices[yr] = closes[i];
      });
      var years = Object.keys(yearPrices).sort().slice(-6);
      setRatios(years.map(function(yr) {
        return { date: String(yr), price: yearPrices[yr] };
      }));
    }).catch(function() {});

    // Fetch historical income/balance statements with a delay to avoid crumb conflict
    setTimeout(function() {
      getHistory(sym).then(function(h) {
        if (h) setHist(h);
      }).catch(function() {});
    }, 800);

  }, [sym]);

  var price = q ? q.price : 0;
  var up    = q ? q.pct >= 0 : true;
  var sign  = up ? "+" : "";
  var chg   = q ? sign + q.change.toFixed(2) + " (" + sign + q.pct.toFixed(2) + "%)" : "-";

  var pe    = ov ? ov.pe  : 0;
  var fpe   = ov ? ov.fpe : 0;
  var eps   = (pe > 0 && price > 0) ? price / pe : 0;
  var rawGr = ov ? (ov.epsG || ov.ltG || 5) : 5;
  var gr    = Math.min(Math.max(rawGr, 2), 25) / 100;

  var moat   = !ov ? "..." : (pe > 0 && pe < 15) ? "Wide" : (pe > 0 && pe < 25) ? "Narrow" : "None";
  var moatBg = moat === "Wide" ? "#1a6a1a" : moat === "Narrow" ? "#b88000" : "#ccc";
  var moatFg = (moat === "Wide" || moat === "Narrow") ? "#fff" : "#555";

  var vals = [];
  var oracle = price > 0 ? price.toFixed(2) : "-";

  if (ov && eps > 0 && price > 0) {
    var cap    = price * 3;
    var dcf20  = Math.min(calcDCF(eps,        gr, 0.04, 0.10, 20), cap);
    var dcff20 = Math.min(calcDCF(eps * 0.85, gr, 0.04, 0.10, 20), cap);
    var dni20  = Math.min(calcDCF(eps * 0.90, gr, 0.04, 0.10, 20), cap);
    var dcffT  = Math.min(
      calcDCF(eps * 0.85, gr, 0.04, 0.10, 20) - calcDCF(eps * 0.85, gr, 0.04, 0.10, 10),
      cap
    );
    var ps     = Math.min(price * (1 + Math.min((ov.roic || 5) / 400, 0.15)), cap);
    var peVal  = Math.min(fpe > 0 ? eps * fpe : eps * pe, cap);
    var pb     = ov.hi52 > 0 ? Math.min((ov.hi52 + ov.lo52) / 2, cap) : 0;
    var psg    = gr > 0 ? Math.min(price / (gr * 100), cap) : 0;
    var pegVal = ov.peg > 0 ? Math.min(eps * ov.peg * 9.5, cap) : 0;

    vals.push({ label:"Discounted Cash Flow 20-year\n(DCF-20)",         value: dcf20,  color:"#d4a800" });
    vals.push({ label:"Discounted Free Cash Flow 20-year\n(DCFF-20)",   value: dcff20, color:"#d4a800" });
    vals.push({ label:"Discounted Net Income 20-year\n(DNI-20)",        value: dni20,  color:"#d4a800" });
    vals.push({ label:"DCF Free Cash Flow Terminal\n(DCFF-Terminal)",   value: dcffT,  color:"#d4a800" });
    vals.push({ label:"Mean Price to Sales\n(PS) Ratio",                value: ps,     color:"#d4a800" });
    vals.push({ label:"Mean Price to Earnings\n(PE) Ratio Without NRI", value: peVal,  color:"#d4a800" });
    if (pb > 0)     vals.push({ label:"Mean Price to Book\n(PB) Ratio",                 value: pb,     color:"#d4a800" });
    if (psg > 0)    vals.push({ label:"Price to Sales Growth\n(PSG) Ratio",             value: psg,    color:"#c03030" });
    if (pegVal > 0) vals.push({ label:"Price to Earnings Growth\n(PEG) Ratio Without NRI", value: pegVal, color:"#c03030" });

    var sum = 0;
    for (var i = 0; i < vals.length; i++) { sum += vals[i].value; }
    var oracleAvg = sum / vals.length;
    oracle = oracleAvg.toFixed(2);
    vals.push({ label:"OracleValue(TM)", value: oracleAvg, color:"#1a8a3a", bold:true });
  }

  var maxV = 100;
  if (vals.length > 0) {
    var mx = 0;
    for (var j = 0; j < vals.length; j++) { if (vals[j].value > mx) mx = vals[j].value; }
    maxV = mx * 1.1;
  }

  var fundRows = !ov ? [] : [
    ["P/E Ratio (TTM)",           pe > 0 ? fmt2(pe) : "-",          "Return on Equity (TTM)",    ov.roe  ? fpct(ov.roe)  : "-"],
    ["Forward P/E (Next Year)",   fpe > 0 ? fmt2(fpe) : "-",        "Return on Inv. Cap (TTM)",  ov.roic ? fpct(ov.roic) : "-"],
    ["EPS Growth (TTM)",          ov.epsG ? fpct(ov.epsG) : "-",    "Total Debt / Equity",       ov.de   ? fmt2(ov.de)   : "-"],
    ["LT EPS Growth (Projected)", ov.ltG  ? fpct(ov.ltG)  : "-",    "Market Capitalization",     ov.mc   || "-"],
    ["PEG Value without NRI",     ov.peg > 0 ? fmt2(ov.peg) : "-",  "Dividend Yield (TTM)",      ov.div  ? fpct(ov.div)  : "-"]
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#f5f2ec", fontFamily:FONT }}>

      <div style={{ background:"#111", padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontWeight:700, fontSize:16 }}>
          <span style={{ color:"#fff" }}>Colabo</span>
          <span style={{ color:"#ff5c3a" }}>ree</span>
          <span style={{ color:"#c8f000", marginLeft:8 }}>StockInsight</span>
        </span>
        <button onClick={onBack} style={{ background:"none", border:"1px solid #444", color:"#aaa", padding:"4px 14px", borderRadius:6, cursor:"pointer", fontSize:13 }}>
          Back
        </button>
      </div>

      <div style={{ display:"flex", maxWidth:1200, margin:"0 auto", padding:"24px 16px", gap:24 }}>

        <div style={{ width:380, flexShrink:0 }}>

          <div style={{ background:"#fff", borderRadius:12, padding:"20px", marginBottom:16, border:"1px solid #e0dbd0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ fontSize:26, fontWeight:800, color:"#111" }}>{sym}</div>
                <div style={{ fontSize:13, color:"#666", marginTop:2 }}>{name}</div>
              </div>
              <span style={{ background:moatBg, color:moatFg, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>
                {moat + " Moat"}
              </span>
            </div>

            <div style={{ background:"#111", borderRadius:8, padding:"10px 14px", marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:"#c8f000", fontSize:12, fontWeight:700 }}>OracleValue(TM)</span>
                <span style={{ color:"#fff", fontSize:20, fontWeight:800 }}>{"$" + oracle}</span>
              </div>
              <div style={{ color:"#aaa", fontSize:11, marginTop:4 }}>Avg of all valuation methods</div>
            </div>

            <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
              <span style={{ fontSize:32, fontWeight:800, color:"#111" }}>
                {q ? "$" + price.toFixed(2) : "---"}
              </span>
              <span style={{ fontSize:14, color: up ? "#2a8a2a" : "#c03030", fontWeight:600 }}>{chg}</span>
            </div>
            <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>
              {q ? "O " + q.open + "  H " + q.high + "  L " + q.low + "  Vol " + q.vol : ""}
            </div>

            {msg.length > 0 && (
              <div style={{ color:"#aaa", fontSize:12, marginTop:10 }}>{msg}</div>
            )}

            <div style={{ marginTop:10 }}>
              <span style={{ background:"#f0ede6", fontSize:10, fontWeight:700, color:"#888", padding:"2px 8px", borderRadius:10 }}>
                LIVE - YAHOO FINANCE
              </span>
            </div>
          </div>

          <div style={{ background:"#fff", borderRadius:12, padding:"16px 18px", border:"1px solid #e0dbd0" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#111", marginBottom:10 }}>My Favorites</div>
            {!ov ? (
              <div style={{ color:"#aaa", fontSize:12 }}>Loading fundamentals...</div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <tbody>
                  {fundRows.map(function(row, ri) {
                    return (
                      <tr key={ri} style={{ borderBottom:"1px solid #f0ede6" }}>
                        <td style={{ padding:"5px 4px", color:"#888", width:"30%" }}>{row[0]}</td>
                        <td style={{ padding:"5px 4px", color:"#111", fontWeight:600, width:"20%", textAlign:"right" }}>{row[1]}</td>
                        <td style={{ padding:"5px 8px", color:"#888", width:"30%" }}>{row[2]}</td>
                        <td style={{ padding:"5px 4px", color:"#111", fontWeight:600, width:"20%", textAlign:"right" }}>{row[3]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>

        <div style={{ flex:1, minWidth:0 }}>

          <div style={{ border:"1px solid #e0dbd0", borderRadius:12, overflow:"hidden", marginBottom:20 }}>
            <div style={{ background:"#faf8f4", borderBottom:"1px solid #e0dbd0", padding:"8px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#444" }}>
                {name + " - Daily - " + (ov ? ov.exchange : "NASDAQ")}
              </span>
            </div>
            <iframe
              key={sym}
              src={"https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=" + sym + "&interval=D&theme=light&style=1&timezone=Etc%2FUTC&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=0&save_image=0"}
              style={{ width:"100%", height:300, border:"none", display:"block" }}
              title="TradingView Chart"
            />
          </div>

          <div style={{ border:"1px solid #e0dbd0", borderRadius:12, padding:"20px 22px", background:"#faf8f4", marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#111", marginBottom:14 }}>Valuation Chart</div>
            {vals.length > 0 ? (
              <div>
                <div style={{ textAlign:"right", marginBottom:8 }}>
                  <span style={{ fontSize:11, color:"#aaa" }}>{"OracleValue(TM)  $" + oracle}</span>
                </div>
                {vals.map(function(v, vi) {
                  return <VBar key={vi} label={v.label} value={v.value} maxV={maxV} color={v.color} bold={v.bold} />;
                })}
                <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid #e0dbd0", textAlign:"right" }}>
                  <span style={{ fontSize:11, color:"#aaa" }}>{"Stock price: $" + price.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"28px 0", color:"#aaa", fontSize:13 }}>
                {msg.length > 0 ? "Data unavailable" : "Loading valuation data..."}
              </div>
            )}
          </div>

          <div style={{ border:"1px solid #e0dbd0", borderRadius:12, padding:"20px 22px", background:"#faf8f4" }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#111", marginBottom:10 }}>Historic Data</div>
            {ratios && ov ? (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:"2px solid #e0dbd0" }}>
                      <td style={{ padding:"6px 8px", color:"#888", fontWeight:600, minWidth:240 }}>Metric</td>
                      {ratios.map(function(r, ri) {
                        return <td key={ri} style={{ padding:"6px 8px", textAlign:"right", color:"#888", fontWeight:600, minWidth:70 }}>{r.date}</td>;
                      })}
                      <td style={{ padding:"6px 8px", textAlign:"right", color:"#111", fontWeight:700, minWidth:70 }}>Current</td>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label:"Price ($)",                             key:"price" },
                      { label:"Price to Earnings (PE) Ratio",          key:"pe" },
                      { label:"Price to Book (PB) Ratio",              key:"pb" },
                      { label:"Price to Sales (PS) Ratio",             key:"ps" },
                      { label:"PEG Ratio without NRI",                 key:"peg" }
                    ].map(function(row, ri) {
                      var curVal = "-";
                      if (row.key === "price") curVal = price > 0 ? "$" + price.toFixed(2) : "-";
                      if (row.key === "pe")    curVal = pe > 0 ? pe.toFixed(2) : "-";
                      if (row.key === "pb")    curVal = ov.pbRatio > 0 ? ov.pbRatio.toFixed(2) : "-";
                      if (row.key === "ps")    curVal = ov.psRatio > 0 ? ov.psRatio.toFixed(2) : "-";
                      if (row.key === "peg")   curVal = ov.peg > 0 ? ov.peg.toFixed(2) : "-";
                      return (
                        <tr key={ri} style={{ borderBottom:"1px solid #f0ede6" }}>
                          <td style={{ padding:"7px 8px", color:"#555", fontSize:12 }}>{row.label}</td>
                          {ratios.map(function(r, rj) {
                            var yr  = parseInt(r.date);
                            var h   = hist[yr] || hist[yr - 1] || {};
                            var val = "-";
                            if (row.key === "price" && r.price) {
                              val = "$" + r.price.toFixed(2);
                            } else if (row.key === "pe" && r.price && h.eps && h.eps > 0) {
                              val = (r.price / h.eps).toFixed(1);
                            } else if (row.key === "pb" && r.price && h.equity && h.shares && h.shares > 0) {
                              val = (r.price / (h.equity / h.shares)).toFixed(1);
                            } else if (row.key === "ps" && r.price && h.rev && h.shares && h.shares > 0) {
                              val = (r.price / (h.rev / h.shares)).toFixed(1);
                            } else if (row.key === "peg" && r.price && h.eps && h.eps > 0) {
                              var histPE = r.price / h.eps;
                              val = gr > 0 ? (histPE / (gr * 100)).toFixed(1) : "-";
                            }
                            return <td key={rj} style={{ padding:"7px 8px", textAlign:"right", color:"#999" }}>{val}</td>;
                          })}
                          <td style={{ padding:"7px 8px", textAlign:"right", color:"#111", fontWeight:700 }}>{curVal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"20px 0", color:"#aaa", fontSize:13 }}>Loading historical data...</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function App() {
  var inputState   = useState("");
  var input        = inputState[0];
  var setInput     = inputState[1];

  var focusedState = useState(false);
  var focused      = focusedState[0];
  var setFocused   = focusedState[1];

  function getHash() {
    var h = window.location.hash.replace("#", "").toUpperCase().trim();
    return h || null;
  }

  var hashState = useState(getHash);
  var hashSym   = hashState[0];
  var setHashSym = hashState[1];

  useEffect(function() {
    function onHash() { setHashSym(getHash()); }
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

  var allStocks = Object.keys(NAMES).map(function(k) { return { symbol:k, name:NAMES[k] }; });
  var sugg = (input.length > 0 && focused) ? allStocks.filter(function(s) {
    return s.symbol.toLowerCase().startsWith(input.toLowerCase()) ||
           s.name.toLowerCase().includes(input.toLowerCase());
  }).slice(0, 6) : [];

  var QUICK = ["AAPL","NVDA","TSLA","MSFT","GOOGL","AMZN"];

  return (
    <div style={{ minHeight:"100vh", background:BG, fontFamily:FONT, position:"relative", overflow:"hidden" }}>

      <div style={{ position:"absolute", top:"-120px", right:"-120px", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle, rgba(200,240,0,0.08) 0%, transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"-80px", left:"-80px", width:"300px", height:"300px", borderRadius:"50%", background:"radial-gradient(circle, rgba(255,92,58,0.06) 0%, transparent 70%)", pointerEvents:"none" }} />

      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 40px", borderBottom:"1px solid #1a1a18" }}>
        <div style={{ fontWeight:800, fontSize:20 }}>
          <span style={{ color:"#fff" }}>Colabo</span>
          <span style={{ color:"#ff5c3a" }}>ree</span>
          <span style={{ color:"#c8f000", marginLeft:8 }}>StockInsight</span>
        </div>
        <div style={{ display:"flex", gap:24 }}>
          {["Markets","Watchlist","Portfolio","Research"].map(function(item) {
            return <span key={item} style={{ color:"#666", fontSize:14, cursor:"pointer" }}>{item}</span>;
          })}
        </div>
      </nav>

      <div style={{ maxWidth:700, margin:"80px auto 0", padding:"0 24px", textAlign:"center" }}>
        <div style={{ fontSize:48, fontWeight:900, color:"#fff", lineHeight:1.1, marginBottom:20 }}>
          Intelligent
          <br />
          <span style={{ color:"#c8f000" }}>Stock Analysis</span>
        </div>
        <div style={{ fontSize:16, color:"#666", marginBottom:40 }}>
          Real-time prices, intrinsic value, and moat analysis powered by Yahoo Finance
        </div>

        <div style={{ position:"relative", maxWidth:520, margin:"0 auto" }}>
          <div style={{ display:"flex", background:"#1a1a18", border:"1px solid #2a2a28", borderRadius:12, overflow:"visible", position:"relative" }}>
            <input
              value={input}
              onChange={function(e) { setInput(e.target.value); }}
              onFocus={function() { setFocused(true); }}
              onBlur={function() { setTimeout(function() { setFocused(false); }, 200); }}
              onKeyDown={function(e) { if (e.key === "Enter") go(); }}
              placeholder="Enter ticker e.g. AAPL, NVDA, TSLA"
              style={{ flex:1, background:"none", border:"none", outline:"none", color:"#fff", fontSize:15, padding:"16px 20px" }}
            />
            <button
              onMouseDown={function(e) { e.preventDefault(); go(); }}
              style={{ background:"#c8f000", color:"#111", fontWeight:700, fontSize:14, padding:"0 24px", border:"none", cursor:"pointer", borderRadius:"0 10px 10px 0" }}>
              Assess Stock
            </button>
          </div>

          {sugg.length > 0 && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#1a1a18", border:"1px solid #2a2a28", borderRadius:8, zIndex:100, marginTop:4 }}>
              {sugg.map(function(s) {
                return (
                  <div
                    key={s.symbol}
                    onMouseDown={function(e) { e.preventDefault(); setInput(s.symbol); setFocused(false); }}
                    style={{ padding:"10px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", borderBottom:"1px solid #222" }}>
                    <span style={{ color:"#fff", fontWeight:600 }}>{s.symbol}</span>
                    <span style={{ color:"#666", fontSize:13 }}>{s.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:20, flexWrap:"wrap" }}>
          {QUICK.map(function(sym) {
            return (
              <span
                key={sym}
                onMouseDown={function(e) { e.preventDefault(); setInput(sym); }}
                style={{ background:"#1a1a18", border:"1px solid #2a2a28", color:"#aaa", fontSize:13, padding:"6px 16px", borderRadius:20, cursor:"pointer" }}>
                {sym}
              </span>
            );
          })}
        </div>
      </div>

    </div>
  );
}
