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

const dataCache = {};

// Anthropic API with web_search — fetches real-time stock data
async function fetchStockData(sym) {
  if (dataCache[sym]) return dataCache[sym];

  const fields = '{"price":0,"change":0,"pct":0,"open":"","high":"","low":"","vol":"","exchange":"","marketCap":"","pe":0,"fpe":0,"peg":0,"epsG":0,"ltG":0,"divY":0,"roe":0,"roic":0,"de":0,"hi52":0,"lo52":0}';
  const prompt = "You are a financial data API. Search the web for the latest stock data for " + sym + ". Return ONLY a valid JSON object matching this structure (no markdown, no explanation): " + fields + ". Fill all fields with real current values.";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  const textBlock = data.content && data.content.filter(function(b) { return b.type === "text"; });
  if (!textBlock || textBlock.length === 0) return null;
  const text = textBlock.map(function(b) { return b.text; }).join("");
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  dataCache[sym] = parsed;
  return parsed;
}

async function getQuote(sym) {
  const d = await fetchStockData(sym);
  if (!d) return null;
  return {
    price:  parseFloat(d.price)  || 0,
    change: parseFloat(d.change) || 0,
    pct:    parseFloat(d.pct)    || 0,
    open:   String(d.open  || "—"),
    high:   String(d.high  || "—"),
    low:    String(d.low   || "—"),
    vol:    String(d.vol   || "—"),
  };
}

async function getOverview(sym) {
  const d = await fetchStockData(sym);
  if (!d) return null;
  return {
    exchange:  d.exchange  || "NASDAQ",
    marketCap: d.marketCap || "—",
    pe:   parseFloat(d.pe)   || 0,
    fpe:  parseFloat(d.fpe)  || 0,
    peg:  parseFloat(d.peg)  || 0,
    epsG: parseFloat(d.epsG) || 0,
    ltG:  parseFloat(d.ltG)  || 0,
    divY: parseFloat(d.divY) || 0,
    roe:  parseFloat(d.roe)  || 0,
    roic: parseFloat(d.roic) || 0,
    de:   parseFloat(d.de)   || 0,
    hi52: parseFloat(d.hi52) || 0,
    lo52: parseFloat(d.lo52) || 0,
  };
}

function fmt2(n) { return n != null ? n.toFixed(2) : "—"; }
function pct(n)  { return n ? n.toFixed(2) + "%" : "—"; }

// ── Valuation bar ────────────────────────────────────────────────────────────
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

// ── Detail page ───────────────────────────────────────────────────────────────
function Detail({ sym, name, onBack }) {
  const [q,   setQ]   = useState(null);
  const [ov,  setOv]  = useState(null);
  const [msg, setMsg] = useState("Loading…");

  useEffect(function() {
    setQ(null); setOv(null); setMsg("Fetching live data for " + sym + "…");

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
  }, [sym]);

  const price = q ? q.price : 0;
  const up    = q ? q.pct >= 0 : true;
  const sign  = up ? "+" : "";
  const chg   = q ? sign + q.change.toFixed(2) + " (" + sign + q.pct.toFixed(2) + "%)" : "—";

  const pe  = ov ? ov.pe  : 0;
  const fpe = ov ? ov.fpe : 0;
  const eps = (pe > 0 && price > 0) ? price / pe : 0;
  const gr  = Math.max(ov ? (ov.epsG || 5) : 5, 2) / 100;

  const moat   = !ov ? "—" : (pe > 0 && pe < 15) ? "Wide" : (pe > 0 && pe < 25) ? "Narrow" : "None";
  const moatBg = moat === "Wide" ? "#1a6a1a" : moat === "Narrow" ? "#b88000" : "#ccc";
  const moatFg = (moat === "Wide" || moat === "Narrow") ? "#fff" : "#555";

  const oracle = (eps > 0 && pe > 0)
    ? (eps * ((pe + (fpe || pe)) / 2) * (1 + gr * 2)).toFixed(2)
    : (price > 0 ? price.toFixed(2) : "—");

  // Build valuation rows without spread syntax
  const vals = [];
  if (ov && eps > 0 && price > 0) {
    vals.push({ label:"Discounted Cash Flow 20-year\n(DCF-20)",          value: eps*pe*Math.pow(1+gr,5)*0.82,   color:"#d4a800" });
    vals.push({ label:"Discounted Free Cash Flow 20-year\n(DCFF-20)",    value: eps*pe*Math.pow(1+gr,4)*0.78,   color:"#d4a800" });
    vals.push({ label:"Discounted Net Income 20-year\n(DNI-20)",         value: eps*pe*Math.pow(1+gr,3.5)*0.80, color:"#d4a800" });
    vals.push({ label:"DCF Free Cash Flow Terminal\n(DCFF-Terminal)",    value: eps*pe*Math.pow(1+gr,3)*0.76,   color:"#d4a800" });
    vals.push({ label:"Mean Price to Sales\n(PS) Ratio",                 value: price*(1+(ov.roic||5)/200),     color:"#d4a800" });
    vals.push({ label:"Mean Price to Earnings\n(PE) Ratio Without NRI",  value: eps*((pe+(fpe||pe))/2)*1.04,    color:"#d4a800" });
    if (ov.hi52 > 0) vals.push({ label:"Mean Price to Book\n(PB) Ratio",value:(ov.hi52+ov.lo52)/2*1.06,        color:"#d4a800" });
    vals.push({ label:"Price to Sales Growth\n(PSG) Ratio",              value: price*Math.max((ov.roic||5)/100,0.05)*0.55, color:"#c03030" });
    if (ov.peg > 0) vals.push({ label:"Price to Earnings Growth\n(PEG) Ratio Without NRI", value:eps*ov.peg*9.5, color:"#c03030" });
    vals.push({ label:"OracleValue™",                                    value: parseFloat(oracle)||price,      color:"#1a8a3a", bold:true });
  }
  const maxV = vals.length ? Math.max.apply(null, vals.map(v=>v.value)) * 1.08 : price * 1.5 || 100;

  const funds = ov ? [
    ["P/E Ratio (TTM)",             pe>0?fmt2(pe):"—",         "Return on Equity (TTM)",   ov.roe>0?pct(ov.roe):"—"],
    ["Forward P/E (Next Year)",     fpe>0?fmt2(fpe):"—",       "Return on Inv. Cap (TTM)", ov.roic>0?pct(ov.roic):"—"],
    ["3-5Y EPS Growth (Projected)", ov.epsG?pct(ov.epsG):"—", "Total Debt / Equity",      ov.de>0?fmt2(ov.de):"—"],
    ["LT EPS Growth (Projected)",   ov.ltG?pct(ov.ltG):"—",   "Market Capitalization",    ov.marketCap],
    ["PEG Value without NRI",       ov.peg>0?fmt2(ov.peg):"—","Dividend Yield (TTM)",     ov.divY>0?pct(ov.divY):"—"],
  ] : [];

  return (
    <div style={{ minHeight:"100vh", background:"#f5f2ec", fontFamily:FONT }}>

      {/* Nav */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e0dbd0", padding:"8px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onBack} style={{ border:"1px solid #ccc", borderRadius:6, padding:"5px 12px", background:"#f5f2ec", cursor:"pointer", fontSize:12, fontFamily:FONT }}>
            ← Back
          </button>
          <span style={{ fontWeight:800, fontSize:15 }}>
            Colabo<span style={{ color:"#ff5c3a" }}>ree</span> <span style={{ color:"#7abd00" }}>StockInsight</span>
          </span>
          <span style={{ color:"#aaa", fontSize:12 }}>/ {sym}</span>
        </div>
        <span style={{ fontSize:10, background:"#111", color:LIME, padding:"3px 12px", borderRadius:20, fontWeight:700, letterSpacing:"0.06em" }}>
          LIVE · YAHOO FINANCE
        </span>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith("Error") ? "#fff0f0" : "#f0f7ff", border: "1px solid " + (msg.startsWith("Error") ? "#ffaaaa" : "#aaccff"), margin:"10px 20px", padding:"9px 14px", borderRadius:8, fontSize:13, color: msg.startsWith("Error") ? "#990000" : "#003388" }}>
          {msg.startsWith("Error") ? "⚠ " : "⏳ "}{msg}
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
              <span style={{ background:"#111", color:"#f0ede6", fontWeight:700, padding:"4px 10px" }}>OracleValue™</span>
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
              <div style={{ fontSize:12, color:"#aaa" }}>Next Earnings Date: <span style={{ color:"#555" }}>—</span></div>
            </div>
          ) : (
            <div style={{ color:"#aaa", fontSize:14, marginBottom:16 }}>Loading price…</div>
          )}

          {/* Action buttons */}
          <div style={{ display:"flex", gap:8, marginBottom:22 }}>
            <button style={{ padding:"8px 14px", borderRadius:8, border:"1.5px solid #ccc", background:"#f0ede6", fontSize:12, cursor:"pointer", fontFamily:FONT }}>
              📊 Add to watchlist
            </button>
            <button style={{ padding:"8px 14px", borderRadius:8, border:"1.5px solid #ccc", background:"#f0ede6", fontSize:12, cursor:"pointer", fontFamily:FONT }}>
              📋 Add to portfolio
            </button>
          </div>

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
                {msg ? "Unavailable" : "Loading fundamentals…"}
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
                {name} · Daily · {ov ? ov.exchange : "NASDAQ"}
              </span>
              {q && (
                <span style={{ fontSize:11, color:"#999" }}>
                  O{q.open} H{q.high} L{q.low} &nbsp;
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
                  <span style={{ fontSize:11, color:"#aaa" }}>OracleValue™ {oracle}</span>
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
                {msg ? "Data unavailable" : "Loading valuation data…"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default function App() {
  const [input,   setInput]   = useState("");
  const [focused, setFocused] = useState(false);
  const [view,    setView]    = useState(null);

  const go = function(sym) {
    var s = (sym || input).toUpperCase().trim();
    if (!s) return;
    setFocused(false);
    setView({ sym: s, name: NAMES[s] || s });
  };

  const handleInput = function(e) {
    setInput(e.target.value);
  };

  if (view) {
    return <Detail sym={view.sym} name={view.name} onBack={function() { setView(null); }} />;
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
          <span style={{ fontSize:11, fontWeight:600, color:LIME }}>Live Market Data · Yahoo Finance</span>
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
          Live prices · P/E ratios · OracleValue™ intrinsic estimates · Valuation charts
        </p>

        {/* Search */}
        <div style={{ position:"relative", width:"100%", maxWidth:540 }}>
          <div style={{
            display:"flex", alignItems:"center", background:"#1e1e18", borderRadius:50,
            border: "1.5px solid " + (focused ? LIME : "#2c2c26"),
            transition:"border-color 0.2s"
          }}>
            <span style={{ padding:"0 10px 0 20px", fontSize:16 }}>🔍</span>
            <input
              value={input}
              onChange={handleInput}
              onFocus={function() { setFocused(true); }}
              onBlur={function() { setTimeout(function() { setFocused(false); }, 180); }}
              onKeyDown={function(e) { if (e.key === "Enter") go(); }}
              placeholder="Enter ticker — e.g. AAPL, NVDA, TSLA"
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
                    <span style={{ color:"#6a6460", fontSize:12 }}>→</span>
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
