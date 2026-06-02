import { useState, useEffect } from "react";
import { calculateTechnicalSignalSnapshot, calcRSI,
         calcReversalWatch,
         getReversalDirectionStatus, getOverallReversalStatus,
         validateSmfOHLCV, getSmfScoreLabel, calcSmfVolPriceDivergence,
         calcSmfTodaySignal, calcSmfFiveDaySignal, calcSmfThirtyDaySignal,
         getSmfOverallStatus, calcSmfSummaryCard,
         isPositiveReversal, isPositiveMoneyFlow,
         buildWeeklyBars, buildMonthlyBars,
         calcWeeklyMomentum, calcMonthlyMomentum,
         classifyMomentumProfile, classifyMonthlyRegime } from "./technicalSignals.js";
import { generateRuleBasedAnalytics } from "./ruleBasedAnalytics.js";

// ─── Central signal colour system ─────────────────────────────────────────────
var _CLR = {
  green: { main:"#7abd00", subtle:"#5a8a00", bg:"#e6f4e6", bd:"#7abd00" },
  red:   { main:"#e05050", subtle:"#c03030", bg:"#fff0f0", bd:"#e08080" },
  amber: { main:"#EF9F27", subtle:"#b88000", bg:"#fdf8e6", bd:"#d4a800" },
  blue:  { main:"#6090d0", subtle:"#4870a8", bg:"#eaf0fa", bd:"#90b8e8" },
  grey:  { main:"#777",   subtle:"#555",    bg:"#f5f5f5", bd:"#e0dbd0" },
};
function revStatusColor(status, variant) {
  var v = variant||"main";
  if (!status||status==="Not Enough Data"||status==="No Clear Reversal") return v==="darkbg"?"#1a1a1a":_CLR.grey[v];
  if (v==="darkbg") return summaryCardDark(status).bg;
  if (status.startsWith("Bullish")&&(status.includes("Confirmed")||status.includes("Triggered")||status.includes("Forming")||status.includes("Confirming"))) return _CLR.green[v];
  if (status.startsWith("Bullish")&&(status.includes("Watch")||status.includes("Spark")||status.includes("Setup"))) return _CLR.blue[v];
  if (status.startsWith("Bearish")&&(status.includes("Confirmed")||status.includes("Triggered")||status.includes("Forming")||status.includes("Confirming"))) return _CLR.red[v];
  if (status.startsWith("Bearish")&&(status.includes("Watch")||status.includes("Setup"))) return _CLR.amber[v];
  if (status==="Mixed Reversal Signals") return _CLR.amber[v];
  return _CLR.grey[v];
}
function revDirLabelColor(lbl, isBullish, variant) {
  var v = variant||"main";
  if (!lbl||lbl==="N/A"||lbl==="Not enough data"||lbl==="Not Enough Data"||lbl==="No Signal") return _CLR.grey[v];
  if (isBullish) {
    if (lbl==="Watch"||lbl==="Spark"||lbl==="Setup") return _CLR.blue[v];
    if (lbl==="Forming"||lbl==="Triggered"||lbl==="Confirmed"||lbl==="Confirming") return _CLR.green[v];
  } else {
    if (lbl==="Watch"||lbl==="Setup") return _CLR.amber[v];
    if (lbl==="Forming"||lbl==="Triggered"||lbl==="Confirmed"||lbl==="Confirming") return _CLR.red[v];
  }
  return _CLR.grey[v];
}
function smfStatusColor(status, variant) {
  var v = variant||"main";
  if (!status||status==="Not Enough Data"||status==="No Clear Signal"||status==="No Sustained Flow") return v==="darkbg"?"#1a1a1a":_CLR.grey[v];
  if (v==="darkbg") return summaryCardDark(status).bg;
  // Green: Strong Accumulation (all prefixes); Steady Accumulation with Spike or Support prefix
  if (status.indexOf("Strong Accumulation")>-1) return _CLR.green[v];
  if ((status.indexOf("Daily Spike")===0||status.indexOf("Daily Support")===0)&&status.indexOf("Steady Accumulation")>-1) return _CLR.green[v];
  // Blue: Quiet Day + Steady Accumulation, Long-Term Accumulation, Early Accumulation
  if (status.indexOf("Steady Accumulation")>-1||status.indexOf("Long-Term Accumulation")>-1||status.indexOf("Early Accumulation")>-1) return _CLR.blue[v];
  // Amber: Mixed Flow, Cooling Accumulation, Short-Term Flow*, No Sustained Flow variants
  if (status.indexOf("Mixed Flow")>-1||status.indexOf("Cooling Accumulation")>-1||status.indexOf("Short-Term Flow")>-1||status.indexOf("No Sustained Flow")>-1) return _CLR.amber[v];
  // Legacy statuses (journal / snapshot compat)
  if (status==="Strong Multi-Timeframe Flow"||status==="Accumulation Trend Positive") return _CLR.green[v];
  if (status==="Constructive but Cooling"||status==="Early Accumulation") return _CLR.blue[v];
  if (status==="Short-Term Spike") return _CLR.amber[v];
  return _CLR.grey[v];
}
function smfLabelColor(lbl, variant) {
  var v = variant||"main";
  if (!lbl||lbl==="N/A"||lbl==="Not enough data") return _CLR.grey[v];
  if (lbl==="Very High"||lbl==="High") return _CLR.green[v];
  if (lbl==="Moderate") return _CLR.blue[v];
  if (lbl==="Mild") return _CLR.amber[v];
  return _CLR.grey[v];
}

const FONT = "'Inter', system-ui, sans-serif";
const LIME = "#c8f000";
const BG   = "#0e0e0c";

const NAMES = window.NAMES = {
  "A":"Agilent Technologies",
  "AAL":"American Airlines",
  "AAPL":"Apple",
  "ABBV":"AbbVie",
  "ABNB":"Airbnb",
  "ABT":"Abbott Laboratories",
  "ACGL":"Arch Capital Group",
  "ACN":"Accenture",
  "ADBE":"Adobe",
  "ADI":"Analog Devices",
  "ADM":"Archer Daniels Midland",
  "ADP":"Automatic Data Processing",
  "ADSK":"Autodesk",
  "AEE":"Ameren",
  "AEP":"American Electric Power",
  "AES":"AES Corporation",
  "AFG":"American Financial",
  "AFL":"Aflac",
  "AIG":"American International Group",
  "AIZ":"Assurant",
  "AJG":"Arthur J. Gallagher",
  "AKAM":"Akamai",
  "ALB":"Albemarle",
  "ALGN":"Align Technology",
  "ALL":"Allstate",
  "ALLE":"Allegion",
  "AMAT":"Applied Materials",
  "AMCR":"Amcor",
  "AMD":"Advanced Micro Devices",
  "AME":"Ametek",
  "AMGN":"Amgen",
  "AMP":"Ameriprise Financial",
  "AMT":"American Tower",
  "AMZN":"Amazon",
  "ANET":"Arista Networks",
  "ANSS":"Ansys",
  "AON":"Aon",
  "AOS":"A.O. Smith",
  "APA":"APA Corporation",
  "APD":"Air Products",
  "APH":"Amphenol",
  "APO":"Apollo Global",
  "APTV":"Aptiv",
  "ARE":"Alexandria RE",
  "ATO":"Atmos Energy",
  "AVB":"AvalonBay Communities",
  "AVGO":"Broadcom",
  "AVY":"Avery Dennison",
  "AWK":"American Water Works",
  "AXON":"Axon Enterprise",
  "AXP":"American Express",
  "AZO":"AutoZone",
  "BA":"Boeing",
  "BAC":"Bank of America",
  "BALL":"Ball Corporation",
  "BAX":"Baxter International",
  "BBY":"Best Buy",
  "BDX":"Becton Dickinson",
  "BEN":"Franklin Resources",
  "BF.B":"Brown-Forman",
  "BG":"Bunge Global",
  "BIIB":"Biogen",
  "BK":"BNY Mellon",
  "BKNG":"Booking Holdings",
  "BKR":"Baker Hughes",
  "BLDR":"Builders FirstSource",
  "BLK":"BlackRock",
  "BMY":"Bristol-Myers Squibb",
  "BR":"Broadridge Financial",
  "BRK.B":"Berkshire Hathaway B",
  "BRKB":"Berkshire Hathaway B",
  "BRO":"Brown & Brown",
  "BSX":"Boston Scientific",
  "BX":"Blackstone",
  "C":"Citigroup",
  "CAG":"Conagra Brands",
  "CAH":"Cardinal Health",
  "CARR":"Carrier Global",
  "CAT":"Caterpillar",
  "CB":"Chubb",
  "CBOE":"Cboe Global Markets",
  "CBRE":"CBRE Group",
  "CCI":"Crown Castle",
  "CCL":"Carnival",
  "CDNS":"Cadence Design Systems",
  "CDW":"CDW Corporation",
  "CE":"Celanese",
  "CEG":"Constellation Energy",
  "CF":"CF Industries",
  "CFG":"Citizens Financial",
  "CHD":"Church & Dwight",
  "CHTR":"Charter Communications",
  "CI":"Cigna",
  "CINF":"Cincinnati Financial",
  "CL":"Colgate-Palmolive",
  "CLX":"Clorox",
  "CMCSA":"Comcast",
  "CME":"CME Group",
  "CMG":"Chipotle Mexican Grill",
  "CMI":"Cummins",
  "CMS":"CMS Energy",
  "CNC":"Centene",
  "CNP":"CenterPoint Energy",
  "COF":"Capital One",
  "COO":"Cooper Companies",
  "COP":"ConocoPhillips",
  "COR":"Cencora",
  "COST":"Costco",
  "CPAY":"Corpay",
  "CPB":"Campbells Company",
  "CPRT":"Copart",
  "CPT":"Camden Property Trust",
  "CRL":"Charles River Labs",
  "CRM":"Salesforce",
  "CRWD":"CrowdStrike",
  "CSCO":"Cisco",
  "CSGP":"CoStar Group",
  "CSX":"CSX",
  "CTAS":"Cintas",
  "CTLT":"Catalent",
  "CTRA":"Coterra Energy",
  "CTSH":"Cognizant",
  "CTVA":"Corteva",
  "CVS":"CVS Health",
  "CVX":"Chevron",
  "CZR":"Caesars Entertainment",
  "D":"Dominion Energy",
  "DAL":"Delta Air Lines",
  "DAY":"Dayforce",
  "DD":"DuPont",
  "DE":"Deere & Company",
  "DECK":"Deckers Brands",
  "DELL":"Dell Technologies",
  "DFS":"Discover Financial",
  "DG":"Dollar General",
  "DGX":"Quest Diagnostics",
  "DHI":"DR Horton",
  "DHR":"Danaher",
  "DIS":"Walt Disney",
  "DLR":"Digital Realty",
  "DLTR":"Dollar Tree",
  "DOC":"Healthpeak Properties",
  "DOV":"Dover",
  "DOW":"Dow",
  "DPZ":"Dominos Pizza",
  "DRI":"Darden Restaurants",
  "DTE":"DTE Energy",
  "DUK":"Duke Energy",
  "DVA":"DaVita",
  "DVN":"Devon Energy",
  "DXCM":"Dexcom",
  "EA":"Electronic Arts",
  "EBAY":"eBay",
  "ECL":"Ecolab",
  "ED":"Consolidated Edison",
  "EFX":"Equifax",
  "EG":"Everest Group",
  "EIX":"Edison International",
  "EL":"Estee Lauder",
  "ELV":"Elevance Health",
  "EMN":"Eastman Chemical",
  "EMR":"Emerson Electric",
  "ENB":"Enbridge",
  "ENPH":"Enphase Energy",
  "EOG":"EOG Resources",
  "EPAM":"EPAM Systems",
  "EQIX":"Equinix",
  "EQR":"Equity Residential",
  "EQT":"EQT Corporation",
  "ES":"Eversource Energy",
  "ESS":"Essex Property Trust",
  "ETN":"Eaton",
  "ETR":"Entergy",
  "ETSY":"Etsy",
  "EVRG":"Evergy",
  "EW":"Edwards Lifesciences",
  "EXC":"Exelon",
  "EXPD":"Expeditors International",
  "EXPE":"Expedia",
  "EXR":"Extra Space Storage",
  "F":"Ford Motor",
  "FANG":"Diamondback Energy",
  "FAST":"Fastenal",
  "FCX":"Freeport-McMoRan",
  "FDS":"FactSet Research",
  "FDX":"FedEx",
  "FE":"FirstEnergy",
  "FFIV":"F5 Networks",
  "FI":"Fiserv",
  "FICO":"Fair Isaac",
  "FIS":"Fidelity National Info",
  "FITB":"Fifth Third Bancorp",
  "FOX":"Fox Corporation A",
  "FOXA":"Fox Corporation B",
  "FRT":"Federal Realty",
  "FSLR":"First Solar",
  "FTNT":"Fortinet",
  "FTV":"Fortive",
  "GD":"General Dynamics",
  "GE":"GE Aerospace",
  "GEHC":"GE HealthCare",
  "GEN":"Gen Digital",
  "GEV":"GE Vernova",
  "GILD":"Gilead Sciences",
  "GIS":"General Mills",
  "GL":"Globe Life",
  "GLW":"Corning",
  "GM":"General Motors",
  "GNRC":"Generac Holdings",
  "GOOG":"Alphabet Class C",
  "GOOGL":"Alphabet Class A",
  "GPC":"Genuine Parts",
  "GPN":"Global Payments",
  "GRMN":"Garmin",
  "GS":"Goldman Sachs",
  "GWW":"WW Grainger",
  "HAL":"Halliburton",
  "HAS":"Hasbro",
  "HBAN":"Huntington Bancshares",
  "HCA":"HCA Healthcare",
  "HD":"Home Depot",
  "HES":"Hess",
  "HIG":"Hartford Financial",
  "HII":"Huntington Ingalls",
  "HLT":"Hilton Worldwide",
  "HOLX":"Hologic",
  "HON":"Honeywell",
  "HPE":"Hewlett Packard Enterprise",
  "HPQ":"HP Inc",
  "HRL":"Hormel Foods",
  "HSIC":"Henry Schein",
  "HST":"Host Hotels",
  "HUBB":"Hubbell",
  "HUM":"Humana",
  "HWM":"Howmet Aerospace",
  "IBM":"IBM",
  "ICE":"Intercontinental Exchange",
  "IDXX":"Idexx Laboratories",
  "IEX":"IDEX Corporation",
  "INCY":"Incyte",
  "INTC":"Intel",
  "INVH":"Invitation Homes",
  "IQV":"IQVIA Holdings",
  "IR":"Ingersoll Rand",
  "IRM":"Iron Mountain",
  "IT":"Gartner",
  "ITW":"Illinois Tool Works",
  "IVZ":"Invesco",
  "J":"Jacobs Solutions",
  "JBAL":"Jabil",
  "JBL":"Jabil",
  "JCI":"Johnson Controls",
  "JKHY":"Jack Henry",
  "JNJ":"Johnson & Johnson",
  "JNPR":"Juniper Networks",
  "JPM":"JPMorgan Chase",
  "K":"Kellanova",
  "KDP":"Keurig Dr Pepper",
  "KEY":"KeyCorp",
  "KEYS":"Keysight Technologies",
  "KHC":"Kraft Heinz",
  "KIM":"Kimco Realty",
  "KKR":"KKR & Co",
  "KLAC":"KLA Corporation",
  "KMB":"Kimberly-Clark",
  "KMI":"Kinder Morgan",
  "KMX":"CarMax",
  "KO":"Coca-Cola",
  "KR":"Kroger",
  "KVUE":"Kenvue",
  "L":"Loews",
  "LDOS":"Leidos Holdings",
  "LEN":"Lennar",
  "LH":"Laboratory Corp",
  "LHX":"L3Harris Technologies",
  "LII":"Lennox International",
  "LIN":"Linde",
  "LKQ":"LKQ Corporation",
  "LLY":"Eli Lilly",
  "LMT":"Lockheed Martin",
  "LNT":"Alliant Energy",
  "LOW":"Lowes",
  "LRCX":"Lam Research",
  "LULU":"Lululemon",
  "LUV":"Southwest Airlines",
  "LVS":"Las Vegas Sands",
  "LW":"Lamb Weston",
  "LYB":"LyondellBasell",
  "LYV":"Live Nation",
  "MA":"Mastercard",
  "MAA":"Mid-America Apartment",
  "MAR":"Marriott",
  "MAS":"Masco",
  "MCD":"McDonalds",
  "MCHP":"Microchip Technology",
  "MCK":"McKesson",
  "MCO":"Moodys",
  "MDLZ":"Mondelez",
  "MDT":"Medtronic",
  "MET":"MetLife",
  "META":"Meta Platforms",
  "MGM":"MGM Resorts",
  "MHK":"Mohawk Industries",
  "MKC":"McCormick",
  "MKTX":"MarketAxess",
  "MLM":"Martin Marietta Materials",
  "MMC":"Marsh McLennan",
  "MMM":"3M",
  "MNST":"Monster Beverage",
  "MO":"Altria",
  "MOH":"Molina Healthcare",
  "MOS":"Mosaic",
  "MPC":"Marathon Petroleum",
  "MPWR":"Monolithic Power",
  "MRK":"Merck",
  "MRNA":"Moderna",
  "MRO":"Marathon Oil",
  "MS":"Morgan Stanley",
  "MSCI":"MSCI Inc",
  "MSFT":"Microsoft",
  "MSI":"Motorola Solutions",
  "MTB":"M&T Bank",
  "MTCH":"Match Group",
  "MTD":"Mettler-Toledo",
  "MU":"Micron Technology",
  "NCLH":"Norwegian Cruise Line",
  "NDAQ":"Nasdaq",
  "NEE":"NextEra Energy",
  "NEM":"Newmont",
  "NFLX":"Netflix",
  "NI":"NiSource",
  "NKE":"Nike",
  "NOC":"Northrop Grumman",
  "NOW":"ServiceNow",
  "NRG":"NRG Energy",
  "NSC":"Norfolk Southern",
  "NSCSC":"Norfolk Southern",
  "NTAP":"NetApp",
  "NUE":"Nucor",
  "NVDA":"Nvidia",
  "NVR":"NVR Inc",
  "NWS":"News Corp B",
  "NWSA":"News Corp A",
  "NXPI":"NXP Semiconductors",
  "O":"Realty Income",
  "OC":"Owens Corning",
  "ODFL":"Old Dominion Freight",
  "OKE":"Oneok",
  "OMC":"Omnicom Group",
  "ON":"ON Semiconductor",
  "ORCL":"Oracle",
  "ORLY":"OReilly Automotive",
  "OTIS":"Otis Worldwide",
  "OXY":"Occidental Petroleum",
  "PANW":"Palo Alto Networks",
  "PARA":"Paramount Global",
  "PAYC":"Paycom Software",
  "PAYX":"Paychex",
  "PCAR":"PACCAR",
  "PCG":"PG&E",
  "PEG":"Public Service Enterprise",
  "PEP":"PepsiCo",
  "PFE":"Pfizer",
  "PFG":"Principal Financial",
  "PG":"Procter & Gamble",
  "PGR":"Progressive",
  "PH":"Parker Hannifin",
  "PHM":"PulteGroup",
  "PKG":"Packaging Corp",
  "PLD":"Prologis",
  "PLTR":"Palantir",
  "PM":"Philip Morris",
  "PNC":"PNC Financial",
  "PNR":"Pentair",
  "PNW":"Pinnacle West Capital",
  "PODD":"Insulet",
  "POOL":"Pool Corporation",
  "PPG":"PPG Industries",
  "PPL":"PPL Corporation",
  "PRU":"Prudential",
  "PSA":"Public Storage",
  "PSX":"Phillips 66",
  "PWR":"Quanta Services",
  "PYPL":"PayPal",
  "QCOM":"Qualcomm",
  "QRVO":"Qorvo",
  "RCL":"Royal Caribbean",
  "REG":"Regency Centers",
  "REGN":"Regeneron",
  "RF":"Regions Financial",
  "RJF":"Raymond James",
  "RL":"Ralph Lauren",
  "RMD":"ResMed",
  "ROK":"Rockwell Automation",
  "ROL":"Rollins",
  "ROP":"Roper Technologies",
  "ROST":"Ross Stores",
  "RSG":"Republic Services",
  "RTX":"Raytheon Technologies",
  "RVTY":"Revvity",
  "SBAC":"SBA Communications",
  "SBUX":"Starbucks",
  "SCHW":"Charles Schwab",
  "SHW":"Sherwin-Williams",
  "SLB":"Schlumberger",
  "SMCI":"Super Micro Computer",
  "SNA":"Snap-on",
  "SNPS":"Synopsys",
  "SO":"Southern Company",
  "SOLV":"Solventum",
  "SPG":"Simon Property Group",
  "SPGI":"S&P Global",
  "SPOT":"Spotify",
  "SRE":"Sempra",
  "STE":"Steris",
  "STLD":"Steel Dynamics",
  "STT":"State Street",
  "STX":"Seagate Technology",
  "STZ":"Constellation Brands",
  "SWK":"Stanley Black & Decker",
  "SWKS":"Skyworks Solutions",
  "SYF":"Synchrony Financial",
  "SYK":"Stryker",
  "SYY":"Sysco",
  "T":"AT&T",
  "TAN":"Invesco Solar",
  "TAP":"Molson Coors",
  "TDG":"TransDigm",
  "TDY":"Teledyne Technologies",
  "TECH":"Bio-Techne",
  "TEL":"TE Connectivity",
  "TER":"Teradyne",
  "TFC":"Truist Financial",
  "TFX":"Teleflex",
  "TGT":"Target",
  "TJX":"TJX Companies",
  "TMO":"Thermo Fisher Scientific",
  "TMUS":"T-Mobile",
  "TPR":"Tapestry",
  "TRGP":"Targa Resources",
  "TRMB":"Trimble",
  "TROW":"T. Rowe Price",
  "TRV":"Travelers",
  "TSCO":"Tractor Supply",
  "TSLA":"Tesla",
  "TSN":"Tyson Foods",
  "TT":"Trane Technologies",
  "TTWO":"Take-Two Interactive",
  "TXN":"Texas Instruments",
  "TXT":"Textron",
  "TYL":"Tyler Technologies",
  "UAL":"United Airlines",
  "UBER":"Uber Technologies",
  "UDR":"UDR Inc",
  "UHS":"Universal Health Services",
  "ULTA":"Ulta Beauty",
  "UNH":"UnitedHealth Group",
  "UNP":"Union Pacific",
  "UPS":"United Parcel Service",
  "URI":"United Rentals",
  "USB":"US Bancorp",
  "V":"Visa",
  "VFC":"VF Corporation",
  "VICI":"VICI Properties",
  "VLO":"Valero Energy",
  "VLTO":"Veralto",
  "VMC":"Vulcan Materials",
  "VRSK":"Verisk Analytics",
  "VRSN":"VeriSign",
  "VRTX":"Vertex Pharmaceuticals",
  "VTR":"Ventas",
  "VTRS":"Viatris",
  "VZ":"Verizon",
  "WAB":"Wabtec",
  "WAT":"Waters Corporation",
  "WBA":"Walgreens Boots Alliance",
  "WBD":"Warner Bros Discovery",
  "WDC":"Western Digital",
  "WEC":"WEC Energy Group",
  "WELL":"Welltower",
  "WFC":"Wells Fargo",
  "WHR":"Whirlpool",
  "WMB":"Williams Companies",
  "WMT":"Walmart",
  "WRK":"WestRock",
  "WST":"West Pharmaceutical",
  "WTW":"Willis Towers Watson",
  "WY":"Weyerhaeuser",
  "WYNN":"Wynn Resorts",
  "XEL":"Xcel Energy",
  "XOM":"Exxon Mobil",
  "XYL":"Xylem",
  "YUM":"Yum Brands",
  "ZBH":"Zimmer Biomet",
  "ZBRA":"Zebra Technologies",
  "ZTS":"Zoetis"
};

var FREE_TICKERS  = ["NVDA","AAPL","MSFT","AMZN","GOOGL","AVGO","META","TSLA","LLY","BRKB"];
window.FREE_TICKERS = FREE_TICKERS;
var CACHE_VERSION = "v1";

const qCache  = {};
const ovCache = {};

// Proxy runs on same domain (nervousgeek.com/proxy) - no CORS issues
async function yfetch(url) {
  var r    = await fetch("/proxy?url=" + encodeURIComponent(url));
  var text = await r.text();
  return JSON.parse(text);
}

async function getQuote(sym) {
  if (qCache[sym]) return qCache[sym];
  var ySym = sym === "BRKB" ? "BRK-B" : sym;
  var d    = await yfetch("https://query1.finance.yahoo.com/v8/finance/chart/" + ySym + "?interval=1d&range=1d");
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
  var ySym = sym === "BRKB" ? "BRK-B" : sym;
  var d   = await yfetch(
    "https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + ySym +
    "?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile,earningsTrend,recommendationTrend,upgradeDowngradeHistory,balanceSheetHistory,balanceSheetHistoryQuarterly,earningsHistory,calendarEvents,majorHoldersBreakdown,institutionOwnership,insiderTransactions,secFilings"
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
  // EPS growth from earningsTrend
  var ltG = 0;   // +5yr analyst estimate
  var ltG1Y = 0; // +1yr analyst estimate
  (function() {
    var et = res.earningsTrend;
    if (et && et.trend) {
      for (var i = 0; i < et.trend.length; i++) {
        var t = et.trend[i];
        if (t.period === "+5y" && t.growth && t.growth.raw) ltG   = t.growth.raw * 100;
        if (t.period === "+1y" && t.growth && t.growth.raw) ltG1Y = t.growth.raw * 100;
      }
    }
    if (!ltG) ltG = ((fd.revenueGrowth && fd.revenueGrowth.raw) || 0) * 100;
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
    ps:           (function() {
      var psYahoo = (ks.priceToSalesTrailing12Months && ks.priceToSalesTrailing12Months.raw) || 0;
      if (psYahoo > 0) return psYahoo;
      // Fallback: derive from market cap / total revenue
      var revRaw = (fd.totalRevenue && fd.totalRevenue.raw) || 0;
      return (mc > 0 && revRaw > 0) ? mc / revRaw : 0;
    })(),
    evEbitda:     (ks.enterpriseToEbitda && ks.enterpriseToEbitda.raw) || 0,
    pFcf:         (ks.priceToFreeCashflows && ks.priceToFreeCashflows.raw) || 0,
    epsG:         ((fd.earningsGrowth && fd.earningsGrowth.raw) || 0) * 100,
    ltG,
    ltG1Y,
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
    sharesOut:        (function() {
      // impliedSharesOutstanding covers all share classes (A+B+C for GOOGL, A+B for META/BRKB)
      // sharesOutstanding may only return one class -- use implied as primary
      var implied = (ks.impliedSharesOutstanding && ks.impliedSharesOutstanding.raw) || 0;
      var basic   = (ks.sharesOutstanding        && ks.sharesOutstanding.raw)        || 0;
      return implied > 0 ? implied : basic;
    })(),
    fcfRaw:           (fd.freeCashflow && fd.freeCashflow.raw) || 0,
    ocfRaw:           (fd.operatingCashflow && fd.operatingCashflow.raw) || 0,
    ebitda:           (fd.ebitda && fd.ebitda.raw) || 0,
    niRaw:            (fd.netIncomeToCommon && fd.netIncomeToCommon.raw)
                       || (fd.netIncome && fd.netIncome.raw)
                       || 0,
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
  var bsh  = res.balanceSheetHistory || {};
  var bshq = res.balanceSheetHistoryQuarterly || {};
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

  // Try defaultKeyStatistics for debt (more reliable)
  var ksTotalDebt = (ks.totalDebt && ks.totalDebt.raw) || null;
  var fdTotalCash = (fd.totalCash && fd.totalCash.raw) || null;

  // Balance sheet: try annual first, then quarterly
  var bs0  = (bsh.balanceSheetStatements  && bsh.balanceSheetStatements[0])  || {};
  var bsq0 = (bshq.balanceSheetStatements && bshq.balanceSheetStatements[0]) || {};

  // Cash: annual -> quarterly -> financialData
  out.cash = (bs0.cashAndCashEquivalents  && bs0.cashAndCashEquivalents.raw)
          || (bs0.cashAndShortTermInvestments && bs0.cashAndShortTermInvestments.raw)
          || (bs0.cash && bs0.cash.raw)
          || (bsq0.cashAndCashEquivalents && bsq0.cashAndCashEquivalents.raw)
          || (bsq0.cashAndShortTermInvestments && bsq0.cashAndShortTermInvestments.raw)
          || (bsq0.cash && bsq0.cash.raw)
          || fdTotalCash
          || 0;

  // Total debt: annual -> ks -> quarterly -> 0 (not null -- show $0M not -)
  out.totalDebt = (bs0.totalDebt && bs0.totalDebt.raw)
               || ksTotalDebt
               || (bs0.longTermDebt && bs0.longTermDebt.raw
                   ? (bs0.longTermDebt.raw + ((bs0.shortLongTermDebt && bs0.shortLongTermDebt.raw) || 0))
                   : null)
               || (bsq0.totalDebt && bsq0.totalDebt.raw)
               || (bsq0.longTermDebt && bsq0.longTermDebt.raw
                   ? (bsq0.longTermDebt.raw + ((bsq0.shortLongTermDebt && bsq0.shortLongTermDebt.raw) || 0))
                   : null)
               || null; // calculated below from D/E ratio if still null
  out.totalAssets  = bs0.totalAssets             ? bs0.totalAssets.raw             : null;
  out.bookValue = (bs0.totalStockholderEquity  && bs0.totalStockholderEquity.raw)
               || (bsq0.totalStockholderEquity && bsq0.totalStockholderEquity.raw)
               || (bs0.totalEquityGrossMinorityInterest && bs0.totalEquityGrossMinorityInterest.raw)
               || (bsq0.totalEquityGrossMinorityInterest && bsq0.totalEquityGrossMinorityInterest.raw)
               // Fallback: ks.bookValue - try as total first, then per-share * shares
               || (ks.bookValue && ks.bookValue.raw
                   ? (ks.bookValue.raw > 1e9  // if > $1B, it's total equity
                      ? ks.bookValue.raw
                      : (ks.sharesOutstanding && ks.sharesOutstanding.raw
                         ? ks.bookValue.raw * ks.sharesOutstanding.raw
                         : null))
                   : null)
               || null;
  out.bsDate       = bs0.endDate                 ? bs0.endDate.fmt                 : "";
  // Extra fallback: derive book value from P/B ratio if still null
  // bookValue per share = ks.bookValue.raw (already tried above)
  // We store pb for later use in Detail where we have price
  out.pbRatio = (ks.priceToBook && ks.priceToBook.raw) || 0;

  // Store raw diagnostic values before D/E fallback
  out._debtDiag = {
    bs0_totalDebt:      bs0.totalDebt      ? bs0.totalDebt.raw      : null,
    bs0_longTermDebt:   bs0.longTermDebt   ? bs0.longTermDebt.raw   : null,
    bs0_shortDebt:      bs0.shortLongTermDebt ? bs0.shortLongTermDebt.raw : null,
    bsq0_totalDebt:     bsq0.totalDebt     ? bsq0.totalDebt.raw     : null,
    bsq0_longTermDebt:  bsq0.longTermDebt  ? bsq0.longTermDebt.raw  : null,
    ksTotalDebt:        ksTotalDebt,
    de:                 out.de,
    bookValue:          out.bookValue,
    totalDebtBeforeDe:  out.totalDebt,
  };
  // Fallback: calculate total debt from D/E ratio x book value if not found in balance sheet
  if (!out.totalDebt && out.de > 0 && out.bookValue && out.bookValue > 0) {
    out.totalDebt = out.de * out.bookValue;
    out.totalDebtSource = "de_x_equity";
  } else if (out.totalDebt === null || out.totalDebt === undefined) {
    out.totalDebt = 0;
    out.totalDebtSource = "default_zero";
  } else {
    out.totalDebtSource = "balance_sheet";
  }

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


function CalcPanel({ currentPrice, onClose }) {
  var _cp = currentPrice > 0 ? currentPrice.toFixed(2) : "";
  var [bp, setBp] = useState(_cp);
  var [sl, setSl] = useState("8");
  var [sz, setSz] = useState("1");
  var _b = parseFloat(bp)||0;
  var _s = parseFloat(sl)||8;
  var _sz = parseFloat(sz)||1;
  var _targets = [
    { label:"Stop Loss",   pct:-_s,  col:"#c03030" },
    { label:"Target 15%",  pct:15,   col:"#1a6a1a" },
    { label:"Target 25%",  pct:25,   col:"#1a6a1a" },
    { label:"Target 35%",  pct:35,   col:"#1a7a1a" },
    { label:"Target 45%",  pct:45,   col:"#1a7a1a" },
    { label:"Target 60%",  pct:60,   col:"#1a8a1a" },
    { label:"Target 100%", pct:100,  col:"#0a6a0a" },
  ];
  return (
    <div style={{position:"fixed",bottom:24,right:24,width:290,background:"#1c1c1e",border:"0.5px solid #333",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",zIndex:999,overflow:"hidden"}}>
      <div style={{background:"#c8f000",padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:12,fontWeight:800,color:"#1a1a14",letterSpacing:"-0.2px"}}>{"$ Trade Calculator"}</span>
        <span onClick={onClose} style={{cursor:"pointer",fontSize:16,color:"#1a1a14",lineHeight:1,fontWeight:700}}>{"\u00D7"}</span>
      </div>
      <div style={{padding:"14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <div>
            <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{"Buy Price ($)"}</div>
            <input value={bp} onChange={function(e){setBp(e.target.value);}} placeholder={"e.g. "+_cp}
              style={{width:"100%",background:"#2a2a2a",border:"0.5px solid #444",borderRadius:6,padding:"5px 7px",fontSize:14,fontWeight:700,color:"#f0f0f0",fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} />
          </div>
          <div>
            <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{"Size (shares)"}</div>
            <input value={sz} onChange={function(e){setSz(e.target.value);}} placeholder={"e.g. 100"}
              style={{width:"100%",background:"#2a2a2a",border:"0.5px solid #444",borderRadius:6,padding:"5px 7px",fontSize:14,fontWeight:700,color:"#f0f0f0",fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} />
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{"Stop Loss %"}</div>
          <div style={{display:"flex",gap:6}}>
            {["5","8","10","15"].map(function(v){
              return <span key={v} onClick={function(){setSl(v);}}
                style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:4,cursor:"pointer",background:sl===v?"#c8f000":"#2a2a2a",color:sl===v?"#1a1a14":"#888",border:"0.5px solid "+(sl===v?"#c8f000":"#444")}}>
                {v+"%"}
              </span>;
            })}
            <input value={sl} onChange={function(e){setSl(e.target.value);}}
              style={{width:40,background:"#2a2a2a",border:"0.5px solid #444",borderRadius:4,padding:"3px 6px",fontSize:11,color:"#f0f0f0",fontFamily:"monospace",outline:"none",textAlign:"center"}} />
          </div>
        </div>
        {_b > 0 ? (
          <div style={{borderTop:"0.5px solid #2c2c2e",paddingTop:10}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <td style={{fontSize:9,color:"#555",paddingBottom:4}}>{"Target"}</td>
                  <td style={{fontSize:9,color:"#555",paddingBottom:4,textAlign:"right"}}>{"Price"}</td>
                  <td style={{fontSize:9,color:"#555",paddingBottom:4,textAlign:"right"}}>{"P&L/sh"}</td>
                  {_sz>1&&<td style={{fontSize:9,color:"#555",paddingBottom:4,textAlign:"right"}}>{"Total"}</td>}
                </tr>
              </thead>
              <tbody>
                {_targets.map(function(t,i){
                  var _tp=_b*(1+t.pct/100); var _diff=_tp-_b; var _isStop=t.pct<0; var _total=_diff*_sz;
                  return (
                    <tr key={i} style={{borderBottom:i<_targets.length-1?"0.5px solid #242424":"none"}}>
                      <td style={{padding:"5px 0",fontSize:11,color:"#666"}}>{t.label}</td>
                      <td style={{padding:"5px 0",fontSize:12,fontWeight:700,color:t.col,textAlign:"right"}}>${_tp.toFixed(2)}</td>
                      <td style={{padding:"5px 0",fontSize:10,color:t.col,textAlign:"right",opacity:0.9}}>{_isStop?"-$"+Math.abs(_diff).toFixed(2):"+$"+_diff.toFixed(2)}</td>
                      {_sz>1&&<td style={{padding:"5px 0",fontSize:10,color:t.col,textAlign:"right",fontWeight:600}}>{_isStop?"-$"+Math.abs(_total).toFixed(0):"+$"+_total.toFixed(0)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"16px 0",color:"#444",fontSize:12}}>{"Enter a buy price to see targets"}</div>
        )}
      </div>
    </div>
  );
}

// ── Data adapter: converts Massive data to technicalSignals.js snapshot format ──
// This is a data adapter only — no technical calculations performed here.
// ── Unified dark summary card colour helper ──────────────────────────────────
// Maps any verdict/status string to a consistent dark-bg/border/text triplet.
// Used by all 7 tab summary cards.
function summaryCardDark(verdict) {
  if (!verdict) return { bg:'#1a1a1a', bd:'#333', text:'#666' };
  var v = verdict.toLowerCase();
  // ── Explicit overrides BEFORE broad keyword checks ───────────────────────────
  // Prevents "Caution — Uptrend Losing Strength" matching 'uptrend' → green
  // Prevents "Strong Bearish" matching 'strong' → green
  // Prevents "Bullish Watch — Recovery Setup Forming" matching 'forming' → green
  if (v.indexOf('strong bearish')!==-1)                          return { bg:'#200808', bd:'#e05050', text:'#e05050' };
  if (v.indexOf('strong bullish')!==-1)                          return { bg:'#0d200d', bd:'#7abd00', text:'#7abd00' };
  if (v.indexOf('bullish watch')!==-1)                           return { bg:'#1e1800', bd:'#EF9F27', text:'#EF9F27' };
  if (v.indexOf('caution')!==-1 || v.indexOf('uptrend losing')!==-1)
                                                                 return { bg:'#241800', bd:'#b87820', text:'#b87820' };
  if (v.indexOf('bearish watch')!==-1 || v.indexOf('breakdown risk')!==-1)
                                                                 return { bg:'#1e1008', bd:'#c86820', text:'#c86820' };
  // ── Reversal: Bearish active statuses must return red before generic keyword checks ──
  if (v.indexOf('bearish reversal')!==-1 &&
      (v.indexOf('triggered')!==-1||v.indexOf('confirmed')!==-1||v.indexOf('confirming')!==-1||v.indexOf('forming')!==-1))
                                                                 return { bg:'#200808', bd:'#e05050', text:'#e05050' };
  // ── Reversal: Bullish early statuses (Setup, Spark) should be blue, not green ──
  if (v.indexOf('bullish reversal setup')!==-1 || v.indexOf('bullish reversal spark')!==-1)
                                                                 return { bg:'#0a1828', bd:'#6090d0', text:'#6090d0' };
  // ── Smart Money Flow: combined status overrides ──────────────────────────────
  // Green: strong or steady accumulation (with any prefix)
  if (v.indexOf('strong accumulation')!==-1 || v.indexOf('steady accumulation')!==-1)
                                                                 return { bg:'#0d200d', bd:'#7abd00', text:'#7abd00' };
  // Blue: long-term or early accumulation (with any prefix)
  if (v.indexOf('long-term accumulation')!==-1 || v.indexOf('early accumulation')!==-1)
                                                                 return { bg:'#0a1828', bd:'#6090d0', text:'#6090d0' };
  // Amber: cooling, mixed flow, short-term flow, or no-sustained-flow prefix variants
  if (v.indexOf('cooling accumulation')!==-1 || v.indexOf('mixed flow')!==-1 ||
      v.indexOf('short-term flow')!==-1 ||
      v.indexOf('no sustained flow')!==-1 || v.indexOf('but no sustained')!==-1)
                                                                 return { bg:'#2a1800', bd:'#EF9F27', text:'#EF9F27' };
  // Grey: no clear signal / not enough data
  if (v==='no clear signal' || v==='no sustained flow' || v==='not enough data')
                                                                 return { bg:'#1a1a1a', bd:'#333', text:'#555' };
  // Tier 1 — exceptional / wide / strong uptrend / strong (momentum) / confirmed
  if (v.indexOf('exceptional')!==-1 || v.indexOf('wide')!==-1 ||
      v.indexOf('strong uptrend')!==-1 || v.indexOf('strong multi')!==-1 ||
      v.indexOf('accumulation trend')!==-1 ||
      (v.indexOf('confirmed')!==-1 && v.indexOf('bullish')!==-1))
    return { bg:'#0d200d', bd:'#7abd00', text:'#7abd00' };
  // Tier 2 — strong / uptrend / building / undervalued / triggered / forming / confirming / good (fundamental) / bullish (plain)
  if (v.indexOf('strong')!==-1 || v.indexOf('uptrend')!==-1 ||
      v.indexOf('building')!==-1 || v.indexOf('undervalued')!==-1 ||
      v.indexOf('triggered')!==-1 || v.indexOf('forming')!==-1 ||
      v.indexOf('confirming')!==-1 || v.indexOf('good')!==-1 ||
      v.indexOf('bullish')!==-1)
    return { bg:'#0f2010', bd:'#9acd50', text:'#9acd50' };
  // Tier 3 — moderate / neutral / sideways / watch / spark / early / constructive / fair / premium / stretched (fundamental)
  if (v.indexOf('moderate')!==-1 || v.indexOf('neutral')!==-1 ||
      v.indexOf('sideways')!==-1 || v.indexOf('mixed')!==-1 ||
      v.indexOf('watch')!==-1 || v.indexOf('spark')!==-1 ||
      v.indexOf('constructive')!==-1 || v.indexOf('early')!==-1 ||
      v.indexOf('fair')!==-1 || v.indexOf('premium')!==-1 ||
      v.indexOf('short-term spike')!==-1 || v.indexOf('stretched')!==-1)
    return { bg:'#1e1800', bd:'#EF9F27', text:'#EF9F27' };
  // Tier 4 — weak / fading / downtrend / narrow / poor / avoid (fundamental)
  if (v.indexOf('weak')!==-1 || v.indexOf('fading')!==-1 ||
      v.indexOf('downtrend')!==-1 || v.indexOf('narrow')!==-1 ||
      v.indexOf('poor')!==-1 || v.indexOf('overvalued')!==-1 ||
      v.indexOf('avoid')!==-1 || (v.indexOf('bearish')!==-1))
    return { bg:'#200808', bd:'#e05050', text:'#e05050' };
  return { bg:'#1a1a1a', bd:'#333', text:'#666' };
}

// ── Run 5: Rule Based Analytics Setup helpers ─────────────────────────────────

function shortRuleVerdict(verdict) {
  if (!verdict) return 'N/A';
  return verdict.split('—')[0].trim();
}

function ruleVerdictSubtitle(verdict) {
  if (!verdict || verdict.indexOf('—') === -1) return '';
  return verdict.split('—').slice(1).join('—').trim();
}

function ruleSetupColor(scenarioId) {
  if (scenarioId === 'strong_bullish_alignment')  return summaryCardDark('Strong Uptrend');
  if (scenarioId === 'healthy_bullish_trend')      return summaryCardDark('Uptrend');
  if (scenarioId === 'sideways_recovery_setup')    return summaryCardDark('Bullish Reversal Watch');
  if (scenarioId === 'early_bullish_reversal')     return summaryCardDark('Bullish Reversal Watch');
  if (scenarioId === 'risky_bounce')               return summaryCardDark('Neutral');
  if (scenarioId === 'uptrend_losing_strength')    return summaryCardDark('Caution');
  if (scenarioId === 'neutral_no_clear_edge')      return summaryCardDark('Neutral');
  if (scenarioId === 'bearish_watch')              return summaryCardDark('Bearish Watch');
  if (scenarioId === 'bearish_control')            return summaryCardDark('Bearish');
  if (scenarioId === 'strong_bearish_alignment')   return summaryCardDark('Strong Bearish');
  return summaryCardDark('Neutral');
}

function buildRuleSnapshotFromRow(row) {
  return {
    ticker: row.ticker,
    close:  row.close || row.close_price || row.price || row.currentPrice,
    trend: (row.trend && row.trend.status) ? row.trend : {
      status: row.trendStatus  || row.trend_status  || row.trend,
      score:  row.trendScore   || row.trend_score,
    },
    momentum: (row.momentum && row.momentum.status) ? row.momentum : {
      status: row.momentumStatus  || row.momentum_status  || row.momentum,
      score:  row.momentumScore   || row.momentum_score,
    },
    reversalWatch: (row.reversalWatch && row.reversalWatch.status) ? row.reversalWatch : {
      status: row.reversalStatus  || row.reversal_status  || row.reversalWatch || row.reversal,
      score:  row.reversalScore   || row.reversal_score,
    },
    smartMoneyFlow: (row.smartMoneyFlow && row.smartMoneyFlow.status) ? row.smartMoneyFlow : {
      status: row.smartMoneyStatus  || row.smart_money_status  || row.moneyFlow,
      score:  row.smartMoneyScore   || row.smart_money_score   || row.moneyFlowScore,
    },
  };
}

function enrichRowWithRuleSetup(row) {
  try {
    var snap = buildRuleSnapshotFromRow(row);
    var ra   = generateRuleBasedAnalytics(snap);
    return Object.assign({}, row, {
      ruleScenarioId:  ra ? ra.scenarioId : null,
      ruleVerdict:     ra ? ra.verdict    : null,
      ruleShortVerdict:ra && ra.verdict ? shortRuleVerdict(ra.verdict)     : 'N/A',
      ruleSubtitle:    ra && ra.verdict ? ruleVerdictSubtitle(ra.verdict)  : '',
      ruleTone:        ra ? ra.tone       : null,
    });
  } catch(e) {
    return Object.assign({}, row, {
      ruleScenarioId: null, ruleVerdict: null,
      ruleShortVerdict: 'N/A', ruleSubtitle: '', ruleTone: null,
    });
  }
}

// ── Run 6: Simulator helpers ───────────────────────────────────────────────────

// ── Run 6C: Combination Performance helpers ────────────
function groupByCombination(rows) {
  var map = {};
  rows.forEach(function(row) {
    var key = [row.trend||'N/A',row.momentum||'N/A',row.reversal||'N/A',row.smartMoney||'N/A'].join(' | ');
    if (!map[key]) map[key] = { key:key, trend:row.trend||'N/A', momentum:row.momentum||'N/A',
      reversal:row.reversal||'N/A', smartMoney:row.smartMoney||'N/A', setupCounts:{}, returns:[], wins:0 };
    var g = map[key];
    var s = row.setup||'N/A';
    g.setupCounts[s] = (g.setupCounts[s]||0) + 1;
    if (row.futureReturn != null && !isNaN(row.futureReturn)) {
      g.returns.push(row.futureReturn);
      if (row.futureReturn > 0) g.wins++;
    }
  });
  return Object.keys(map).map(function(key) {
    var g = map[key]; var sigs = g.returns.length;
    var avg = sigs > 0 ? g.returns.reduce(function(a,b){return a+b;},0)/sigs : null;
    var mostSetup = 'N/A'; var maxC = 0;
    Object.keys(g.setupCounts).forEach(function(s){ if(g.setupCounts[s]>maxC){maxC=g.setupCounts[s];mostSetup=s;} });
    return { key:g.key, trend:g.trend, momentum:g.momentum, reversal:g.reversal, smartMoney:g.smartMoney,
      setup:mostSetup, signals:sigs, winRate:sigs>0?(g.wins/sigs)*100:null,
      avgReturn:avg, medianReturn:simMedian(g.returns),
      bestReturn:sigs>0?Math.max.apply(null,g.returns):null,
      worstReturn:sigs>0?Math.min.apply(null,g.returns):null };
  });
}
function combinationQualityLabel(row) {
  if (!row || row.signals < 5) return '';
  if (row.winRate >= 60 && row.avgReturn > 0) return 'Worked Well';
  if (row.winRate <= 40 && row.avgReturn < 0) return 'Weak';
  return 'Mixed';
}
function sortCombinationRows(rows, sortBy) {
  return rows.slice().sort(function(a,b){
    if (sortBy === 'Signals')       return b.signals - a.signals;
    if (sortBy === 'Win Rate')      return (b.winRate||0) - (a.winRate||0);
    if (sortBy === 'Median Return') return (b.medianReturn||0) - (a.medianReturn||0);
    if (sortBy === 'Worst Return')  return (b.worstReturn||-999) - (a.worstReturn||-999);
    return (b.avgReturn||0) - (a.avgReturn||0);
  });
}

function simMedian(values) {
  if (!values || !values.length) return null;
  var s = values.slice().sort(function(a,b){ return a-b; });
  var m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
}
function simPctReturn(start, end) {
  if (!start || !end || start <= 0) return null;
  return ((end - start) / start) * 100;
}
function simFmtPct(v) {
  if (v == null || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}
function simSMA(arr, period) {
  if (!arr || arr.length < period) return null;
  var sl = arr.slice(-period);
  return sl.reduce(function(a,b){return a+b;},0) / period;
}
function simEMAHistory(arr, period) {
  if (!arr || arr.length < period) return [];
  var k = 2 / (period + 1);
  var seed = 0;
  for (var i = 0; i < period; i++) seed += arr[i];
  seed /= period;
  var result = [seed];
  for (var i = period; i < arr.length; i++) {
    seed = arr[i] * k + seed * (1 - k);
    result.push(seed);
  }
  return result;
}
function simWeekKey(dateStr) {
  var d = new Date(dateStr);
  // ISO week: days since Jan 4 (always in week 1) ÷ 7
  var jan4 = new Date(d.getFullYear(), 0, 4);
  var diff = (d - jan4) / 86400000;
  return d.getFullYear() + '-W' + (Math.floor(diff / 7) + 1);
}
function buildHistoricalIndicators(bars) {
  var closes = bars.map(function(b){ return b.close; });
  // EMA histories
  var ema12h = simEMAHistory(closes, 12);
  var ema26h = simEMAHistory(closes, 26);
  var ema20h = simEMAHistory(closes, 20);
  // MACD line (align by right edge)
  var minM = Math.min(ema12h.length, ema26h.length);
  var macdLine = [];
  for (var i = 0; i < minM; i++) {
    macdLine.push(ema12h[ema12h.length - minM + i] - ema26h[ema26h.length - minM + i]);
  }
  var signalH = simEMAHistory(macdLine, 9);
  var macdHistory = [];
  var sigOff = macdLine.length - signalH.length;
  for (var i = Math.max(0, signalH.length - 50); i < signalH.length; i++) {
    var mv = macdLine[sigOff + i], sv = signalH[i];
    macdHistory.push({ macd: mv, signal: sv, histogram: mv - sv });
  }
  // RSI history (efficient: use last 65 bars)
  var rsiHistory = [];
  var rsiBuf = closes.slice(-65);
  for (var i = 15; i <= rsiBuf.length; i++) {
    var rv = calcRSI(rsiBuf.slice(0, i), 14);
    if (rv != null) rsiHistory.push(rv);
  }
  // Weekly closes (last close of each ISO week)
  var weekMap = {};
  var weekOrder = [];
  bars.forEach(function(b) {
    var wk = simWeekKey(b.date);
    if (!weekMap[wk]) weekOrder.push(wk);
    weekMap[wk] = b.close;
  });
  var weeklyCloses = weekOrder.map(function(wk){ return weekMap[wk]; });
  return {
    sma50:       simSMA(closes, 50),
    sma200:      simSMA(closes, 200),
    ema20:       ema20h.length ? ema20h[ema20h.length-1] : null,
    rsi14:       calcRSI(closes, 14),
    rsiHistory:  rsiHistory,
    macd:        macdHistory.length ? macdHistory[macdHistory.length-1].macd : null,
    macdHistory: macdHistory,
    wsma10:      simSMA(weeklyCloses, 10),
    wsma40:      simSMA(weeklyCloses, 40),
  };
}
function simRolling52(bars) {
  var last = bars.slice(-252);
  if (!last.length) return { hi52: null, lo52: null };
  var hi = last[0].high, lo = last[0].low;
  for (var i = 1; i < last.length; i++) {
    if (last[i].high > hi) hi = last[i].high;
    if (last[i].low  < lo) lo = last[i].low;
  }
  return { hi52: hi, lo52: lo };
}
async function fetchYahooHistoricalBars(ticker, startDate, endDate, holdingPeriod) {
  // Yahoo ticker normalisation
  var yhTicker = ticker.toUpperCase() === 'BRKB' ? 'BRK-B' : ticker.toUpperCase();
  // Extend lookback: 400 calendar days before start for SMA200; extend end for future returns
  var sd = new Date(startDate);
  sd.setDate(sd.getDate() - 400);
  var ed = new Date(endDate);
  ed.setDate(ed.getDate() + Math.max(holdingPeriod * 2, 90));
  var p1 = Math.floor(sd.getTime() / 1000);
  var p2 = Math.floor(ed.getTime() / 1000);
  var url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + yhTicker
          + '?interval=1d&period1=' + p1 + '&period2=' + p2 + '&includeAdjustedClose=true';
  var resp = await fetch('/proxy?url=' + encodeURIComponent(url));
  if (!resp.ok) throw new Error('Yahoo fetch failed: ' + resp.status);
  var json = await resp.json();
  var result = json && json.chart && json.chart.result && json.chart.result[0];
  if (!result) throw new Error('Yahoo returned no data for ' + yhTicker);
  var timestamps = result.timestamp || [];
  var quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
  var adjClose = result.indicators && result.indicators.adjclose && result.indicators.adjclose[0] && result.indicators.adjclose[0].adjclose;
  if (!quote || !timestamps.length) throw new Error('Yahoo data missing OHLCV for ' + yhTicker);
  var bars = [];
  for (var i = 0; i < timestamps.length; i++) {
    var c = (adjClose && adjClose[i] != null) ? adjClose[i] : quote.close[i];
    if (c == null || quote.open[i] == null) continue;  // skip null bars
    var d = new Date(timestamps[i] * 1000);
    var dateStr = d.toISOString().split('T')[0];
    bars.push({
      date:   dateStr,
      open:   quote.open[i],
      high:   quote.high[i],
      low:    quote.low[i],
      close:  c,
      volume: quote.volume[i] || 0,
    });
  }
  // Oldest-first (Yahoo already returns oldest-first for v8)
  bars.sort(function(a,b){ return a.date < b.date ? -1 : 1; });
  return bars;
}

// ── Run 6D: Best Bet Signal Research helpers ────────────
var BB_DRIVER_LABELS = {
  priceAboveSma50:'Price above SMA50', priceAboveSma200:'Price above SMA200',
  sma50AboveSma200:'SMA50 above SMA200', priceReclaimedSma50:'Price reclaimed SMA50',
  priceLostSma50:'Price lost SMA50', priceNear52wHigh:'Near 52W high',
  priceFarBelow52wHigh:'Far below 52W high', priceAboveEma20:'Price above EMA20',
  ema20AboveSma50:'EMA20 above SMA50', rsiAbove50:'RSI above 50',
  rsiBetween45And65:'RSI 45–65', rsiAbove70:'RSI above 70', rsiRising:'RSI rising',
  rsiFalling:'RSI falling', macdAboveSignal:'MACD above signal',
  macdBelowSignal:'MACD below signal', macdImproving:'MACD improving',
  macdDeteriorating:'MACD deteriorating', macdHistogramPositive:'MACD histogram positive',
  macdHistogramImproving:'MACD histogram improving', volumeAbove20dAvg:'Volume above 20D avg',
  volumeAbove50dAvg:'Volume above 50D avg', volumeRising5d:'Volume rising 5D',
  smartMoneyConstructive:'Smart money constructive', smartMoneyCooling:'Smart money cooling',
  smartMoneyPositive:'Smart money positive', smartMoneyNoClearSignal:'No clear SMF signal',
  trendStrongUptrend:'Strong Uptrend', trendUptrend:'Uptrend',
  trendSideways:'Sideways', trendDowntrend:'Downtrend',
  momentumBuilding:'Momentum Building', momentumFading:'Momentum Fading',
  momentumNeutral:'Momentum Neutral', reversalBullishConfirming:'Bullish Reversal Confirming',
  reversalBullishSpark:'Bullish Reversal Spark', reversalBullishWatch:'Bullish Reversal Watch',
  reversalBearishWatch:'Bearish Reversal Watch', reversalMixed:'Mixed Reversal',
  smartMoneyConstructiveCooling:'Constructive but Cooling',
  smartMoneyAccumulationPositive:'Accumulation Positive', smartMoneyNoClear:'No clear SMF',
};

function buildSignalDrivers(ctx) {
  var bars = ctx.barsUpToDate || []; var ind = ctx.indicators || {};
  var snap = ctx.snapshot || {}; var bar = ctx.currentBar || {};
  var close = bar.close || 0; var volume = bar.volume || 0;
  var closes = bars.map(function(b){ return b.close; });
  var sma50 = ind.sma50 || 0; var sma200 = ind.sma200 || 0; var ema20 = ind.ema20 || 0;
  var rsi14 = ind.rsi14 || 0;
  var rsiH = ind.rsiHistory || []; var macdH = ind.macdHistory || [];
  var prevRsi  = rsiH.length >= 2 ? rsiH[rsiH.length-2] : rsi14;
  var curHist  = macdH.length >= 1 ? macdH[macdH.length-1].histogram : 0;
  var prevHist = macdH.length >= 2 ? macdH[macdH.length-2].histogram : curHist;
  var curMacd  = macdH.length >= 1 ? macdH[macdH.length-1].macd   : 0;
  var curSig   = macdH.length >= 1 ? macdH[macdH.length-1].signal : 0;
  // Previous SMA50 from prior day closes
  var prevSma50 = closes.length >= 51 ? simSMA(closes.slice(0,-1), 50) : sma50;
  var prevClose = closes.length >= 2 ? closes[closes.length-2] : close;
  // Volume averages
  var vols20 = bars.slice(-21,-1).map(function(b){ return b.volume||0; });
  var vols50 = bars.slice(-51,-1).map(function(b){ return b.volume||0; });
  var last5v  = bars.slice(-5).map(function(b){ return b.volume||0; });
  var prior5v = bars.slice(-10,-5).map(function(b){ return b.volume||0; });
  var avg20v = vols20.length ? vols20.reduce(function(a,b){return a+b;},0)/vols20.length : 0;
  var avg50v = vols50.length ? vols50.reduce(function(a,b){return a+b;},0)/vols50.length : 0;
  var avgL5 = last5v.length ? last5v.reduce(function(a,b){return a+b;},0)/last5v.length : 0;
  var avgP5 = prior5v.length ? prior5v.reduce(function(a,b){return a+b;},0)/prior5v.length : 0;
  var hi52 = snap.meta && snap.meta.hi52 ? snap.meta.hi52 : 0;
  var lo52 = snap.meta && snap.meta.lo52 ? snap.meta.lo52 : 0;
  var range52 = (hi52 > lo52 && lo52 > 0) ? hi52 - lo52 : 0;
  var pos52   = range52 > 0 ? ((close - lo52) / range52) * 100 : -1;
  var mid52   = lo52 > 0 ? (hi52 + lo52) / 2 : 0;
  // ── Smart Money: prefer new decision object, fall back to status string ────
  var smfS  = snap.smartMoneyFlow ? (snap.smartMoneyFlow.status||'') : '';
  var smd   = snap.smartMoneyFlow && snap.smartMoneyFlow.smartMoneyDecision ? snap.smartMoneyFlow.smartMoneyDecision : null;
  var smBase= smd && smd.baseStatus ? smd.baseStatus : smfS;
  // New SMF driver flags using decision object (handles all combined statuses)
  var smfBullish = smd ? (smd.baseStatus && (
    smd.baseStatus.indexOf('Accumulation') !== -1 && smd.baseStatus !== 'Cooling Accumulation' && smd.baseStatus !== 'Short-Term Flow Spike' && smd.baseStatus !== 'Short-Term Flow Watch'
  )) : (smfS.indexOf('Constructive')!==-1||smfS.indexOf('Accumulation')!==-1||smfS.indexOf('Positive')!==-1||smfS.indexOf('Strong')!==-1);
  var smfStatus = ctx.rbaDecisionTrace && ctx.rbaDecisionTrace.smartMoney ? ctx.rbaDecisionTrace.smartMoney.status : null;
  var smfStrength = ctx.rbaDecisionTrace && ctx.rbaDecisionTrace.smartMoney ? ctx.rbaDecisionTrace.smartMoney.strength : null;
  var tS   = snap.trend           ? (snap.trend.status||'')           : '';
  var mS   = snap.momentum        ? (snap.momentum.status||'')        : '';
  var rS   = snap.reversalWatch   ? (snap.reversalWatch.status||'')   : '';
  return {
    priceAboveSma50: sma50>0&&close>sma50, priceAboveSma200: sma200>0&&close>sma200,
    sma50AboveSma200: sma50>0&&sma200>0&&sma50>sma200,
    priceReclaimedSma50: prevSma50>0&&prevClose<=prevSma50&&close>sma50,
    priceLostSma50: prevSma50>0&&prevClose>=prevSma50&&close<sma50,
    priceNear52wHigh: hi52>0&&close>=hi52*0.90,
    priceFarBelow52wHigh: hi52>0&&close<=hi52*0.75,
    priceAboveEma20: ema20>0&&close>ema20, ema20AboveSma50: ema20>0&&sma50>0&&ema20>sma50,
    rsiAbove50: rsi14>50, rsiBetween45And65: rsi14>=45&&rsi14<=65, rsiAbove70: rsi14>=70,
    rsiRising: rsi14>prevRsi, rsiFalling: rsi14<prevRsi,
    macdAboveSignal: curMacd>curSig, macdBelowSignal: curMacd<curSig,
    macdImproving: curHist>prevHist, macdDeteriorating: curHist<prevHist,
    macdHistogramPositive: curHist>0, macdHistogramImproving: curHist>prevHist,
    volumeAbove20dAvg: avg20v>0&&volume>avg20v, volumeAbove50dAvg: avg50v>0&&volume>avg50v,
    volumeRising5d: avgP5>0&&avgL5>avgP5,
    smartMoneyConstructive: smfStatus === 'bullish' || smBase.indexOf('Accumulation') !== -1,
    smartMoneyCooling: smBase.indexOf('Cooling') !== -1 || smfS.indexOf('Cooling') !== -1,
    smartMoneyPositive: (smfStatus === 'bullish' && (smfStrength === 'strong' || smfStrength === 'normal')) || smfS.indexOf('Positive') !== -1 || smfS.indexOf('Strong Multi') !== -1,
    smartMoneyNoClearSignal: smBase === 'No Clear Signal' || smBase === 'No Sustained Flow' || smfS === 'No Clear Signal' || smfS.indexOf('No Clear') !== -1,
    trendStrongUptrend: tS==='Strong Uptrend', trendUptrend: tS==='Uptrend',
    trendSideways: tS==='Sideways', trendDowntrend: tS==='Downtrend'||tS==='Strong Downtrend',
    momentumBuilding: mS==='Building', momentumFading: mS==='Fading'||mS==='Weak',
    momentumNeutral: mS==='Neutral',
    reversalBullishConfirming: rS.indexOf('Confirming')!==-1||rS.indexOf('Confirmed')!==-1,
    reversalBullishSpark: rS.indexOf('Spark')!==-1,
    reversalBullishWatch: rS.indexOf('Watch')!==-1&&rS.indexOf('Bullish')!==-1,
    reversalBearishWatch: rS.indexOf('Bearish')!==-1,
    reversalMixed: rS.indexOf('Mixed')!==-1,
    smartMoneyConstructiveCooling: smBase === 'Cooling Accumulation' || smfS.indexOf('Constructive but Cooling') !== -1,
    smartMoneyAccumulationPositive: (smfStatus === 'bullish' && smfStrength === 'strong') || smfS.indexOf('Accumulation Trend Positive') !== -1,
    smartMoneyNoClear: smBase === 'No Clear Signal' || smBase === 'No Sustained Flow' || smfS.indexOf('No Clear') !== -1,
    smartMoneyStrongMultiTimeframe: smBase === 'Strong Accumulation' || smfS.indexOf('Strong Multi-Timeframe Flow') !== -1,
    // RSI buckets
    rsiBelow30:       rsi14 < 30,
    rsi30To40:        rsi14 >= 30 && rsi14 < 40,
    rsi40To50:        rsi14 >= 40 && rsi14 < 50,
    rsi50To60:        rsi14 >= 50 && rsi14 < 60,
    rsi60To70:        rsi14 >= 60 && rsi14 < 70,
    // MACD extended
    macdHistogramNegative: curHist < 0,
    // Price vs MAs (below variants)
    priceBelowSma50:  sma50  > 0 && close < sma50,
    priceBelowSma200: sma200 > 0 && close < sma200,
    priceBelowEma20:  ema20  > 0 && close < ema20,
    // 52W range buckets
    price52wRange0To25:   pos52 >= 0  && pos52 <  25,
    price52wRange25To50:  pos52 >= 25 && pos52 <  50,
    price52wRange50To75:  pos52 >= 50 && pos52 <  75,
    price52wRange75To90:  pos52 >= 75 && pos52 <  90,
    price52wRange90To100: pos52 >= 90,
    priceBelow52wMidpoint: mid52 > 0 && close < mid52,
    priceAbove52wMidpoint: mid52 > 0 && close >= mid52,
  };
}
function matchesSelected(value, selectedValues) {
  if (!selectedValues || selectedValues.length === 0) return true;
  if (selectedValues.indexOf('Any') >= 0) return true;
  return selectedValues.indexOf(value || 'N/A') >= 0;
}
function matchesDriverGroup(row, selectedDriverKeys) {
  if (!selectedDriverKeys || selectedDriverKeys.length === 0) return true;
  var d = row && row.drivers ? row.drivers : {};
  return selectedDriverKeys.some(function(k){ return d[k] === true; });
}
function matchesDriverFilters(row, driverFilters) {
  return matchesDriverGroup(row, driverFilters.trendDrivers)
      && matchesDriverGroup(row, driverFilters.momentumDrivers)
      && matchesDriverGroup(row, driverFilters.reversalDrivers)
      && matchesDriverGroup(row, driverFilters.smartMoneyDrivers);
}
function filterCustomSignalRows(rows, filters) {
  return rows.filter(function(row) {
    return matchesSelected(row.trend,      filters.trend)
        && matchesSelected(row.momentum,   filters.momentum)
        && matchesSelected(row.reversal,   filters.reversal)
        && matchesSelected(row.smartMoney, filters.smartMoney)
        && matchesSelected(row.setup,      filters.setup)
        && matchesDriverFilters(row, filters.driverFilters);
  });
}
function summarizeCustomSignalRows(rows) {
  var signals = rows.length;
  var rets = rows.map(function(r){ return Number(r.futureReturn); }).filter(function(v){ return !isNaN(v); });
  var wins = rets.filter(function(v){ return v > 0; }).length;
  var avg  = rets.length ? rets.reduce(function(a,b){ return a+b; },0)/rets.length : null;
  return {
    signals: signals, wins: wins, losses: signals - wins,
    winRate:  signals ? (wins/signals)*100 : null,
    avgReturn: avg, medianReturn: simMedian(rets),
    bestReturn:  rets.length ? Math.max.apply(null,rets) : null,
    worstReturn: rets.length ? Math.min.apply(null,rets) : null,
  };
}
function customSignalQuality(s) {
  if (!s || s.signals < 10) return 'Low Sample';
  if (s.winRate >= 70 && s.medianReturn > 0 && s.avgReturn > 0) return 'Strong';
  if (s.winRate >= 60 && s.medianReturn > 0 && s.avgReturn > 0) return 'Promising';
  if (s.winRate < 45 || s.medianReturn < 0) return 'Weak';
  return 'Mixed';
}
function buildCustomConditionText(trend, momentum, reversal, smartMoney, setup, tDrv, mDrv, rDrv, sDrv) {
  var lines = [];
  if (trend.length)      lines.push('Trend: '       + trend.join(' OR '));
  if (momentum.length)   lines.push('Momentum: '    + momentum.join(' OR '));
  if (reversal.length)   lines.push('Reversal: '    + reversal.join(' OR '));
  if (smartMoney.length) lines.push('Smart Money: ' + smartMoney.join(' OR '));
  if (setup.length)      lines.push('Setup: '       + setup.join(' OR '));
  function drvLabel(k){ return BB_DRIVER_LABELS[k]||k; }
  if (tDrv.length)  lines.push('Trend Driver: '      + tDrv.map(drvLabel).join(' OR '));
  if (mDrv.length)  lines.push('Momentum Driver: '   + mDrv.map(drvLabel).join(' OR '));
  if (rDrv.length)  lines.push('Reversal Driver: '   + rDrv.map(drvLabel).join(' OR '));
  if (sDrv.length)  lines.push('Smart Money Driver: '+ sDrv.map(drvLabel).join(' OR '));
  return lines.length ? lines.join('\n') : 'No filters selected (showing all signals).';
}


// ── Run 6I: Weekly Momentum helpers ───────────────────────────────────────────
// Shared groupBy for A/B test sections
function simGroupBy(rows, keyFn) {
  var map = {};
  rows.forEach(function(r){
    var k=keyFn(r)||'—';
    if (!map[k]) map[k]={ returns:[], wins:0 };
    if (r.futureReturn!=null){ map[k].returns.push(r.futureReturn); if(r.futureReturn>0) map[k].wins++; }
  });
  return Object.keys(map).map(function(k){
    var g=map[k], sigs=g.returns.length;
    var avg=sigs?g.returns.reduce(function(a,b){return a+b;},0)/sigs:null;
    var wr=sigs?(g.wins/sigs)*100:null;
    return { label:k, signals:sigs, winRate:wr, avgReturn:avg,
      medianReturn:simMedian(g.returns),
      bestReturn:sigs?Math.max.apply(null,g.returns):null,
      worstReturn:sigs?Math.min.apply(null,g.returns):null };
  });
}
function simAbQuality(r, minSig) {
  if (!r||r.signals<(minSig||3)) return 'Low Sample';
  if (r.winRate>=65&&r.medianReturn>0) return 'Strong';
  if (r.winRate>=55&&r.medianReturn>0) return 'Watch';
  if (r.winRate>=50&&r.medianReturn>=0) return 'Mixed';
  return 'Weak';
}



// ── Run 6L: Overall Momentum Result helpers ────────────────────────────────────
function summarizeRows(rows) {
  if (!rows || !rows.length) return { signals:0, wins:0, losses:0, winRate:null, avgReturn:null, medianReturn:null, bestReturn:null, worstReturn:null };
  var rets = rows.map(function(r){ return Number(r.futureReturn); }).filter(function(v){ return !isNaN(v); });
  var wins = rets.filter(function(v){ return v > 0; }).length;
  var avg  = rets.length ? rets.reduce(function(a,b){ return a+b; },0)/rets.length : null;
  return { signals:rets.length, wins:wins, losses:rets.length-wins,
    winRate:  rets.length ? (wins/rets.length)*100 : null,
    avgReturn: avg, medianReturn: simMedian(rets),
    bestReturn:  rets.length ? Math.max.apply(null,rets) : null,
    worstReturn: rets.length ? Math.min.apply(null,rets) : null };
}
function classifyMomentumResult(summary, minSignals) {
  if (!summary || summary.signals < (minSignals||10)) return 'Low Confidence';
  if (summary.winRate >= 65 && summary.medianReturn > 0)  return 'Favourable';
  if (summary.winRate >= 55 && summary.medianReturn > 0)  return 'Watch';
  if (summary.winRate >= 50 && summary.medianReturn >= 0) return 'Mixed';
  return 'Unfavourable';
}
function calculateOverallMomentumResult(row, allRows, minSignals) {
  var mp = row && row.momentumProfile;
  var profile       = mp && mp.profile;
  var monthlyRegime = mp && mp.monthlyRegime;
  var empty = { result:'Low Confidence', source:'No Profile', profile:profile, monthlyRegime:monthlyRegime, signals:0, winRate:null, medianReturn:null, avgReturn:null, bestReturn:null, worstReturn:null };
  if (!profile) return empty;
  // 1. Try exact Profile + Monthly Regime
  var exactRows = allRows.filter(function(r){ return r&&r.momentumProfile&&r.momentumProfile.profile===profile&&r.momentumProfile.monthlyRegime===monthlyRegime; });
  var exact = summarizeRows(exactRows);
  if (exact.signals >= (minSignals||10)) return Object.assign({}, exact, { result:classifyMomentumResult(exact,minSignals), source:'Profile + Monthly Regime', profile:profile, monthlyRegime:monthlyRegime, medianReturn:exact.medianReturn });
  // 2. Fall back to broader profile
  var profRows = allRows.filter(function(r){ return r&&r.momentumProfile&&r.momentumProfile.profile===profile; });
  var prof = summarizeRows(profRows);
  if (prof.signals >= (minSignals||10)) return Object.assign({}, prof, { result:classifyMomentumResult(prof,minSignals), source:'Momentum Profile', profile:profile, monthlyRegime:monthlyRegime, medianReturn:prof.medianReturn });
  // 3. Not enough data
  return Object.assign({}, prof, { result:'Low Confidence', source:'Insufficient Historical Samples', profile:profile, monthlyRegime:monthlyRegime });
}


// ── Run 6M: Momentum tab Historical Confidence ────────────────────────────────
function classifyHistoricalConfidence(summary, minSignals) {
  if (!summary || summary.signals < (minSignals||10)) return 'Insufficient Data';
  if (summary.signals >= 30 && summary.winRate >= 65 && summary.medianReturn > 0) return 'High Confidence';
  if (summary.signals >= 20 && summary.winRate >= 55 && summary.medianReturn > 0) return 'Moderate Confidence';
  if (summary.signals >= 10 && summary.winRate >= 50 && summary.medianReturn >= 0) return 'Low Confidence';
  return 'Unfavourable';
}
function calcDailyMomentumApprox(closesArr) {
  if (!closesArr || closesArr.length < 14) return { status:'Neutral', score:50 };
  var rsi = calcRSI(closesArr, 14) || 50;
  var sma5 = simSMA(closesArr, 5) || closesArr[closesArr.length-1];
  var price = closesArr[closesArr.length-1];
  var roc = sma5 > 0 ? (price-sma5)/sma5*100 : 0;
  var e12 = simEMAHistory(closesArr,12), e26 = simEMAHistory(closesArr,26);
  var ml=[], mn=Math.min(e12.length,e26.length);
  for(var i=0;i<mn;i++) ml.push(e12[e12.length-mn+i]-e26[e26.length-mn+i]);
  var sg = simEMAHistory(ml,9);
  var hist = ml.length&&sg.length ? ml[ml.length-1]-sg[sg.length-1] : 0;
  var phist = ml.length>1&&sg.length>1 ? ml[ml.length-2]-sg[sg.length-2] : null;
  var imp = phist!=null&&hist>phist;
  var rsiS = rsi>=70?5:rsi>=60?4:rsi>=50?3:rsi>=40?2:1;
  var macdS = (hist>0&&imp)?5:hist>0?4:imp?3:hist>-0.5?2:1;
  var rocS = roc>5?5:roc>2?4:roc>-2?3:roc>-5?2:1;
  var score = (rsiS*0.40+macdS*0.40+rocS*0.20)*20;
  return { status:score>=80?'Strong':score>=65?'Building':score>=50?'Neutral':score>=35?'Fading':'Weak', score:score };
}


function exportRowsToCsv(filename, rows, columns) {
  if (!rows || !rows.length) return;
  function esc(v) {
    if (v === null || v === undefined) return '';
    var s = String(v);
    if (s.indexOf('"') >= 0) s = s.replace(/"/g, '""');
    if (s.indexOf(',') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('"') >= 0) s = '"' + s + '"';
    return s;
  }
  var header = columns.map(function(c){ return esc(c.label); }).join(',');
  var body = rows.map(function(row){
    return columns.map(function(c){
      var v = typeof c.value === 'function' ? c.value(row) : row[c.key];
      return esc(v);
    }).join(',');
  }).join('\n');
  var blob = new Blob([header + '\n' + body], { type:'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function buildTechnicalSnapshotFromMassive(sym, massiveInfo, q, ov, crossData) {
  if (!massiveInfo || !q) return null;
  var rawAggs = massiveInfo.aggs || [];
  var ind     = massiveInfo.indicators || {};
  var price   = q.price || 0;
  var hi52    = ov ? (ov.hi52 || 0) : 0;
  var lo52    = ov ? (ov.lo52 || 0) : 0;
  // Convert newest-first Massive aggs to oldest-first OHLCV bars
  var ohlcv = rawAggs
    .filter(function(b) { return b && b.c > 0 && b.h > 0 && b.l > 0 && b.v >= 0; })
    .slice()
    .reverse()
    .map(function(b) {
      return { date: b.t ? new Date(b.t).toISOString().split('T')[0] : '',
               open: b.o||0, high: b.h||0, low: b.l||0, close: b.c||0, volume: b.v||0 };
    });
  var snap = calculateTechnicalSignalSnapshot({
    ticker:     sym,
    date:       new Date().toISOString().split('T')[0],
    ohlcv:      ohlcv,
    indicators: ind,
    crossData:  crossData && crossData.sym === sym ? crossData : null,
    meta:       { price: price, hi52: hi52, lo52: lo52 },
  });
  // Enrich snapshot so ruleBasedAnalytics can calculate real support/resistance
  return Object.assign({}, snap, {
    ohlcv:      ohlcv,
    indicators: ind,
    meta:       { price: price, hi52: hi52, lo52: lo52 },
  });
}

// ── Data adapter: converts Yahoo Finance closing price array to snapshot format ──
// Used by AI Favourites. Partial indicators (SMA50/200 + RSI only).
// No technical outcomes calculated here — calls calculateTechnicalSignalSnapshot.
function buildTechSnapshotFromYahoo(sym, vc, vv, price, sma50, sma200) {
  if (!vc || vc.length < 15) return null;
  var bars = vc.map(function(c, i) {
    return { date: '', open: c, high: c, low: c, close: c, volume: (vv && vv[i]) || 0 };
  });
  // Compute RSI from closing prices using the shared calcRSI function
  var rsiArr = null;
  try { rsiArr = calcRSI(vc, 14); } catch(e) {}
  var rsi14 = (rsiArr && rsiArr.length > 0) ? rsiArr[rsiArr.length - 1] : null;
  var ind = { sma50: sma50||0, sma200: sma200||0, rsi14: rsi14 };
  return calculateTechnicalSignalSnapshot({
    ticker:     sym,
    date:       new Date().toISOString().split('T')[0],
    ohlcv:      bars,
    indicators: ind,
    meta:       { price: price||0, hi52: 0, lo52: 0 },
  });
}

// ── Screener: data adapter — converts Massive data to snapshot (no tech calc) ──
function buildScreenerSnapshot(sym, massiveInfo) {
  if (!massiveInfo || !massiveInfo.aggs || massiveInfo.aggs.length < 10) return null;
  var rawAggs = massiveInfo.aggs;
  var ind     = massiveInfo.indicators || {};
  var mSnap   = massiveInfo.snapshot   || {};
  var price   = mSnap.close || (rawAggs[0] && rawAggs[0].c) || 0;
  var hi52 = 0, lo52 = Infinity;
  rawAggs.forEach(function(b){ if (b.h>hi52) hi52=b.h; if (b.l>0&&b.l<lo52) lo52=b.l; });
  if (lo52===Infinity) lo52=0;
  var ohlcv = rawAggs.filter(function(b){ return b&&b.c>0; }).slice().reverse()
    .map(function(b){ return { date:'',open:b.o||0,high:b.h||0,low:b.l||0,close:b.c||0,volume:b.v||0 }; });
  try {
    return calculateTechnicalSignalSnapshot({ ticker:sym, date:new Date().toISOString().split('T')[0],
      ohlcv:ohlcv, indicators:ind, meta:{ price:price, hi52:hi52, lo52:lo52 } });
  } catch(e) { return null; }
}

// ── Screener component ────────────────────────────────────────────────────────
function Screener() {
  var [scanStatus, setScanStatus] = useState('loading');
  var [results,    setResults]    = useState(null);
  var [scanMsg,    setScanMsg]    = useState('');

  useEffect(function() {
    // Read 12-hour KV cache on mount
    fetch('/cache?sym=__SCREENER&tab=results')
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (d && d.hit && d.value) {
          var parsed = JSON.parse(d.value);
          var ageHrs = (Date.now() - new Date(parsed.cachedAt).getTime()) / 3600000;
          if (ageHrs < 12 && parsed.results) { setResults(parsed); setScanStatus('done'); return; }
        }
        setScanStatus('idle');
      })
      .catch(function(){ setScanStatus('idle'); });
  }, []);

  async function runScan() {
    if (scanStatus==='scanning') return;
    setScanStatus('scanning'); setScanMsg('Fetching most active tickers...');
    try {
      // Step 1: Yahoo Finance most-active screener (via existing /proxy route)
      var candidates = [];
      try {
        var sUrl = 'https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&start=0&count=100&lang=en-US&region=US';
        var sRes = await fetch('/proxy?url='+encodeURIComponent(sUrl));
        var sData = await sRes.json();
        var quotes = (sData.finance&&sData.finance.result&&sData.finance.result[0]&&sData.finance.result[0].quotes)||[];
        candidates = quotes.filter(function(q){
          return q.regularMarketPrice>5 && q.regularMarketChangePercent>0 &&
                 q.regularMarketVolume>1000000 && q.quoteType==='EQUITY';
        }).slice(0,50).map(function(q){
          return { sym:q.symbol, name:q.longName||q.shortName||q.symbol,
                   price:q.regularMarketPrice, changePct:q.regularMarketChangePercent, volume:q.regularMarketVolume };
        });
      } catch(e) {
        // Fallback: curated top-US ticker universe
        ['NVDA','AAPL','MSFT','AMZN','GOOGL','META','TSLA','AMD','AVGO','PLTR',
         'COIN','MARA','RIOT','HOOD','SOFI','NFLX','DIS','INTL','NOW','SNOW']
          .forEach(function(s){ candidates.push({ sym:s, name:s, price:0, changePct:0, volume:0 }); });
      }

      if (!candidates.length){ setScanMsg('No candidates after pre-filter.'); setScanStatus('done'); setResults({ cachedAt:new Date().toISOString(), results:[] }); return; }
      setScanMsg('Scanning '+candidates.length+' candidates...');

      // Step 2: Batch technical scans, 5 at a time — max 50 tickers
      var hdrs = window.__clerkToken ? { Authorization:'Bearer '+window.__clerkToken } : {};
      var matched = [];
      var BATCH = 5;
      for (var i=0; i<candidates.length; i+=BATCH) {
        var batch = candidates.slice(i, i+BATCH);
        setScanMsg('Scanning '+(Math.min(i+BATCH,candidates.length))+' / '+candidates.length+'...');
        var bRes = await Promise.all(batch.map(async function(c) {
          try {
            var mRes = await fetch('/massive?sym='+c.sym, { headers:hdrs });
            if (!mRes.ok) return null;
            var mData = await mRes.json();
            if (!mData||!mData.aggs||mData.aggs.length<10) return null;
            var snap = buildScreenerSnapshot(c.sym, mData);
            if (!snap) return null;
            // Screen using technicalSignals.js pure helper functions
            // Store all results — criteria applied client-side for flexible filtering
            var ms = mData.snapshot||{};
            return { ticker:c.sym, company:(mData.ticker&&mData.ticker.name)||c.name||c.sym,
                     price:c.price||ms.close||0, changePct:c.changePct||ms.change||0, volume:c.volume||ms.volume||0,
                     reversal:snap.reversalWatch.status, reversalScore:snap.reversalWatch.score||0,
                     moneyFlow:snap.smartMoneyFlow.status, moneyFlowScore:snap.smartMoneyFlow.score||0,
                     trend:snap.trend.status, trendScore:snap.trend.score||0,
                     momentum:snap.momentum.status, momentumScore:snap.momentum.score||0 };
          } catch(e){ return null; }
        }));
        matched = matched.concat(bRes.filter(Boolean));
      }

      // Sort by combined reversal + money flow score
      matched.sort(function(a,b){ return (b.reversalScore+b.moneyFlowScore)-(a.reversalScore+a.moneyFlowScore); });

      var cacheObj = { cachedAt:new Date().toISOString(), results:matched };
      // Write to KV cache (12h enforced on read via cachedAt check above)
      var postHdrs = { 'Content-Type':'text/plain' };
      if (window.__clerkToken) postHdrs['Authorization']='Bearer '+window.__clerkToken;
      fetch('/cache?sym=__SCREENER&tab=results', { method:'POST', headers:postHdrs, body:JSON.stringify(cacheObj) }).catch(function(){});

      setResults(cacheObj); setScanStatus('done'); setScanMsg('');
    } catch(e) { setScanStatus('error'); setScanMsg('Scan failed: '+(e.message||'Unknown error')); }
  }

  // Add ticker snapshot to journal — must use nested structure matching worker expectation
  async function addToJournal(row) {
    var adminKey = localStorage.getItem('journal_admin_key');
    if (!adminKey) {
      setScanMsg('Open the Signal Journal first, then try again.');
      window.location.hash = 'JOURNAL';
      return;
    }
    if (!row.price || row.price <= 0) { setScanMsg('Cannot add '+row.ticker+' — price not available.'); return; }
    try {
      var today = new Date().toISOString().split('T')[0];
      // Worker reads snap.trend.status, snap.reversalWatch.status etc. (nested structure)
      var body = {
        ticker: row.ticker, snapshotDate: today, close: row.price,
        trend:         { status: row.trend,     score: row.trendScore },
        momentum:      { status: row.momentum,  score: row.momentumScore },
        reversalWatch: { status: row.reversal,  score: row.reversalScore,
                         bullishScore: row.reversalScore, bearishScore: 0 },
        smartMoneyFlow:{ status: row.moneyFlow, score: row.moneyFlowScore },
      };
      var res = await fetch('/journal?action=upsertSnapshot', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-Admin-Key':adminKey },
        body: JSON.stringify(body)
      });
      setScanMsg(res.ok ? row.ticker+' added to Journal for '+today+'.' : 'Failed to add '+row.ticker+'. Please try again.');
    } catch(e) { setScanMsg('Error: '+e.message); }
  }

  var LIME  = '#c8f000';
  var [filterTrend,    setFilterTrend]    = useState([]);
  var [filterMomentum, setFilterMomentum] = useState([]);
  var [filterReversal, setFilterReversal] = useState([]);
  var [filterSMF,      setFilterSMF]      = useState([]);
  var [filterSetupSc,  setFilterSetupSc]  = useState([]);
  var [scSortCol,      setScSortCol]      = useState('');
  var [scSortDir,      setScSortDir]      = useState('desc');
  // Scan criteria — applied client-side on cached results
  var items = (results&&results.results)||[];

  function fmtVol(v){ if(!v||v===0) return String.fromCharCode(0x2014); if(v>=1e9) return (v/1e9).toFixed(1)+'B'; if(v>=1e6) return (v/1e6).toFixed(1)+'M'; return (v/1e3).toFixed(0)+'K'; }
  function fmtDate(iso){ if(!iso) return ''; var d=new Date(iso); return d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})+', '+d.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}); }

  return (
    <div style={{ minHeight:'100vh', background:'#0e0e0c', color:'#f0ede6', padding:'32px 24px', fontFamily:"'Inter','SF Pro',sans-serif" }}>
      <button onClick={function(){ window.location.hash=''; }} style={{ background:'none', border:'none', color:'#666', fontSize:12, cursor:'pointer', marginBottom:20, padding:0 }}>
        {'← Back'}
      </button>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, color:'#555', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Screener</div>
        <div style={{ fontSize:22, fontWeight:800, color:LIME, marginBottom:8 }}>Bullish Reversal + Money Flow</div>
        <div style={{ fontSize:13, color:'#666', lineHeight:1.7, maxWidth:620 }}>
          {'Screens top active US stocks for early or positive bullish reversal signals appearing together with useful money flow.'}
        </div>
        <div style={{ fontSize:11, color:'#444', marginTop:6, lineHeight:1.6 }}>
          {'Bullish Reversal Spark is an early-interest signal — not confirmation. Results cached for 12 hours. Research use only, not financial advice.'}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24, flexWrap:'wrap' }}>
        <button onClick={runScan} disabled={scanStatus==='scanning'}
          style={{ background:scanStatus==='scanning'?'#1a1a18':LIME, color:scanStatus==='scanning'?'#555':'#0e0e0c', fontWeight:700, fontSize:12, border:'none', borderRadius:8, padding:'9px 18px', cursor:scanStatus==='scanning'?'not-allowed':'pointer' }}>
          {scanStatus==='scanning' ? String.fromCharCode(0x23f3)+' Scanning...' : String.fromCharCode(0x1f50d)+' Refresh Scan'}
        </button>
        {scanMsg && <span style={{ fontSize:11, color:'#666' }}>{scanMsg}</span>}
        {results&&results.cachedAt && <span style={{ fontSize:11, color:'#444' }}>{'Showing cached scan. Last scanned: '+fmtDate(results.cachedAt)}</span>}
      </div>

      {scanStatus==='loading' && <div style={{ color:'#444', fontSize:12 }}>{'Loading cached results...'}</div>}

      {scanStatus==='idle' && (
        <div style={{ background:'#161614', border:'0.5px solid #2a2a28', borderRadius:10, padding:32, textAlign:'center', color:'#555', fontSize:13 }}>
          {'No cached scan available. Click '}<strong style={{ color:LIME }}>{'Refresh Scan'}</strong>{' to screen top active US tickers.'}
        </div>
      )}

      {(scanStatus==='done'||scanStatus==='scanning') && results && (
        <div>

          {/* Multi-select pill filters */}
          {(function(){
            var SETUP_OPTS = ['Strong Bullish','Bullish','Bullish Watch','Neutral','Caution','Bearish Watch','Bearish','Strong Bearish'];
            var FILTER_GROUPS = [
              ['Trend',      filterTrend,    setFilterTrend,    ['Strong Uptrend','Uptrend','Sideways','Downtrend','Strong Downtrend']],
              ['Momentum',   filterMomentum, setFilterMomentum, ['Strong','Building','Neutral','Fading','Weak']],
              ['Setup',      filterSetupSc,  setFilterSetupSc,  SETUP_OPTS],
              ['Reversal',   filterReversal, setFilterReversal, ['Bull Spark','Bull Watch','Bull Forming','Bull Triggered','Bull Confirming','Bull Confirmed','Bear Watch','Mixed']],
              ['Money Flow', filterSMF,      setFilterSMF,      ['Strong Flow','Accumulating','Early Accum.','Constructive','ST Spike']],
            ];
            // Map display labels back to actual values for filtering
            var REV_MAP = {'Bull Spark':'Bullish Reversal Spark','Bull Watch':'Bullish Reversal Watch','Bull Forming':'Bullish Reversal Forming','Bull Triggered':'Bullish Reversal Triggered','Bull Confirming':'Bullish Reversal Confirming','Bull Confirmed':'Bullish Reversal Confirmed','Bear Watch':'Bearish Reversal Watch','Mixed':'Mixed Reversal Signals'};
            var SMF_MAP = {'Strong Flow':'Strong Multi-Timeframe Flow','Accumulating':'Accumulation Trend Positive','Early Accum.':'Early Accumulation','Constructive':'Constructive but Cooling','ST Spike':'Short-Term Spike'};
            var anyActive = filterTrend.length||filterMomentum.length||filterReversal.length||filterSMF.length||filterSetupSc.length;
            function toggle(arr, setArr, v) { setArr(arr.indexOf(v)!==-1 ? arr.filter(function(x){return x!==v;}) : arr.concat([v])); }
            return (
              <div style={{ background:'#151513', border:'0.5px solid #222', borderRadius:8, padding:'10px 14px', marginBottom:14 }}>
                {FILTER_GROUPS.map(function(fg){
                  var lbl=fg[0], arr=fg[1], setArr=fg[2], opts=fg[3];
                  return (
                    <div key={lbl} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                      <span style={{ fontSize:9, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.06em', minWidth:70, paddingTop:3, flexShrink:0 }}>{lbl}</span>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                        {opts.map(function(v){
                          var sel = arr.indexOf(v)!==-1;
                          var sc = summaryCardDark(lbl==='Setup'?v:lbl==='Trend'?v:lbl==='Momentum'?v:'Neutral');
                          var ac = lbl==='Setup' ? summaryCardDark(v).text : '#c8f000';
                          return <button key={v} onClick={function(){ toggle(arr,setArr,v); }}
                            style={{ fontSize:9, padding:'2px 8px', borderRadius:10, cursor:'pointer', fontWeight:sel?700:400,
                              background:sel?'#1e2a10':'#1a1a18', color:sel?ac:'#555',
                              border:'0.5px solid '+(sel?ac:'#2a2a28'), outline:'none' }}>{v}</button>;
                        })}
                      </div>
                    </div>
                  );
                })}
                {anyActive ? <button onClick={function(){ setFilterTrend([]); setFilterMomentum([]); setFilterReversal([]); setFilterSMF([]); setFilterSetupSc([]); }}
                  style={{ fontSize:10, padding:'3px 10px', background:'none', border:'0.5px solid #444', borderRadius:5, color:'#666', cursor:'pointer', marginTop:2 }}>Clear all filters</button> : null}
              </div>
            );
          })()}
          {(function(){
            // Compact display labels for long status strings
            function cRev(s){ if(!s) return String.fromCharCode(0x2014); var l=s.toLowerCase(); if(l.indexOf('no clear')!==-1) return String.fromCharCode(0x2014); if(l.indexOf('spark')!==-1) return 'Spark'; if(l.indexOf('confirming')!==-1) return 'Confirming'; if(l.indexOf('confirmed')!==-1) return 'Confirmed'; if(l.indexOf('triggered')!==-1) return 'Triggered'; if(l.indexOf('forming')!==-1) return 'Forming'; if(l.indexOf('watch')!==-1&&l.indexOf('bull')!==-1) return 'Bull Watch'; if(l.indexOf('watch')!==-1&&l.indexOf('bear')!==-1) return 'Bear Watch'; if(l.indexOf('confirmed')!==-1&&l.indexOf('bear')!==-1) return 'Bear Conf.'; if(l.indexOf('forming')!==-1&&l.indexOf('bear')!==-1) return 'Bear Form.'; if(l.indexOf('mixed')!==-1) return 'Mixed'; return s; }
            function cSmf(s){ if(!s) return String.fromCharCode(0x2014); var l=s.toLowerCase(); if(l.indexOf('no clear')!==-1) return String.fromCharCode(0x2014); if(l.indexOf('strong multi')!==-1) return 'Strong Flow'; if(l.indexOf('accumulation trend')!==-1) return 'Accumulating'; if(l.indexOf('early')!==-1) return 'Early Accum.'; if(l.indexOf('constructive')!==-1) return 'Constructive'; if(l.indexOf('short-term')!==-1) return 'ST Spike'; return s; }
            function isPosRev(s){ return s && s.indexOf('Bullish')===0; }
            function isPosSMF(s){ return ['Strong Multi-Timeframe Flow','Accumulation Trend Positive','Early Accumulation','Constructive but Cooling'].indexOf(s)!==-1; }
            function isPosT(s)  { return s==='Uptrend'||s==='Strong Uptrend'; }
            function isPosMom(s){ return s==='Building'||s==='Strong'; }

            // Apply specific value filters (array multi-select)
            var REV_MAP2 = {'Bull Spark':'Bullish Reversal Spark','Bull Watch':'Bullish Reversal Watch','Bull Forming':'Bullish Reversal Forming','Bull Triggered':'Bullish Reversal Triggered','Bull Confirming':'Bullish Reversal Confirming','Bull Confirmed':'Bullish Reversal Confirmed','Bear Watch':'Bearish Reversal Watch','Mixed':'Mixed Reversal Signals'};
            var SMF_MAP2 = {'Strong Flow':'Strong Multi-Timeframe Flow','Accumulating':'Accumulation Trend Positive','Early Accum.':'Early Accumulation','Constructive':'Constructive but Cooling','ST Spike':'Short-Term Spike'};
            var filterRevFull = filterReversal.map(function(v){ return REV_MAP2[v]||v; });
            var filterSMFFull = filterSMF.map(function(v){ return SMF_MAP2[v]||v; });

            var filtered = items.filter(function(row){
              if (filterTrend.length    && filterTrend.indexOf(row.trend)    ===-1) return false;
              if (filterMomentum.length && filterMomentum.indexOf(row.momentum)===-1) return false;
              if (filterRevFull.length  && filterRevFull.indexOf(row.reversal)===-1) return false;
              if (filterSMFFull.length  && filterSMFFull.indexOf(row.moneyFlow)===-1) return false;
              return true;
            });

            if (filtered.length===0) return (
              <div style={{ background:'#161614', border:'0.5px solid #2a2a28', borderRadius:10, padding:32, textAlign:'center', color:'#555', fontSize:13 }}>
                {items.length===0 ? 'Scan returned no results. Try Refresh Scan.' : 'No tickers match the selected criteria. Try relaxing your filters.'}
              </div>
            );

            // Enrich + Setup filter + sort
            var enriched = filtered.map(enrichRowWithRuleSetup);
            if (filterSetupSc.length) enriched = enriched.filter(function(row){ return filterSetupSc.indexOf(row.ruleShortVerdict)!==-1; });
            var SC_KEY = {ticker:'ticker',company:'company',price:'price',chg:'changePct',vol:'volume',trend:'trend',momentum:'momentum',reversal:'reversal',moneyFlow:'moneyFlow',setup:'ruleShortVerdict'};
            if (scSortCol && SC_KEY[scSortCol]) {
              var _sk = SC_KEY[scSortCol];
              enriched = enriched.slice().sort(function(a,b){
                var av=a[_sk],bv=b[_sk];
                if(av==null)return 1; if(bv==null)return -1;
                var cmp=av<bv?-1:av>bv?1:0; return scSortDir==='asc'?cmp:-cmp;
              });
            }
            function ScTh(col,label,rightPad){
              var active=scSortCol===col;
              return <div style={{fontSize:9,fontWeight:700,color:active?'#c8f000':'#555',textTransform:'uppercase',letterSpacing:'0.06em',cursor:'pointer',userSelect:'none',paddingRight:rightPad||0}}
                onClick={function(){setScSortCol(col);setScSortDir(active&&scSortDir==='asc'?'desc':'asc');}}>
                {label}{active?(scSortDir==='asc'?' ▲':' ▼'):''}
              </div>;
            }
            // Column order: Ticker|Company|Price|Chg%|Volume|Trend|Momentum|Reversal|Money Flow|Setup|View|+Journal
            var GRID = '65px 150px 70px 58px 68px 90px 85px minmax(80px,130px) minmax(80px,110px) 110px 48px 70px';
            return (
              <div style={{ border:'0.5px solid #2a2a28', borderRadius:10, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:GRID, columnGap:12, padding:'8px 14px', borderBottom:'1px solid #222', background:'#1a1a18' }}>
                  {ScTh('ticker','Ticker')}{ScTh('company','Company')}{ScTh('price','Price')}{ScTh('chg','Chg%')}
                  {ScTh('vol','Volume')}{ScTh('trend','Trend')}{ScTh('momentum','Momentum')}
                  {ScTh('reversal','Reversal')}{ScTh('moneyFlow','Money Flow')}{ScTh('setup','Setup')}
                  <div></div><div></div>
                </div>
                {enriched.map(function(row,i){
                  var revC   = revStatusColor(row.reversal,'main');
                  var smfC   = smfStatusColor(row.moneyFlow,'main');
                  var tC     = row.trendScore>=55?'#7abd00':row.trendScore>=40?'#EF9F27':'#e05050';
                  var mC     = row.momentumScore>=65?'#7abd00':row.momentumScore>=50?'#EF9F27':'#e05050';
                  var setupC = ruleSetupColor(row.ruleScenarioId);
                  return (
                    <div key={row.ticker} style={{ display:'grid', gridTemplateColumns:GRID, columnGap:12, padding:'10px 14px', borderBottom:i<enriched.length-1?'1px solid #1a1a16':'none', background:i%2===0?'#111':'#131311', alignItems:'center' }}>
                      <div style={{ fontSize:13, fontWeight:800, color:LIME }}>{row.ticker}</div>
                      <div style={{ fontSize:11, color:'#666', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.company}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:'#f0ede6' }}>{'$'+row.price.toFixed(2)}</div>
                      <div style={{ fontSize:11, fontWeight:600, color:row.changePct>=0?'#7abd00':'#e05050' }}>{(row.changePct>=0?'+':'')+row.changePct.toFixed(2)+'%'}</div>
                      <div style={{ fontSize:11, color:'#888' }}>{fmtVol(row.volume)}</div>
                      <div style={{ fontSize:11, fontWeight:600, color:tC }}>{row.trend}</div>
                      <div style={{ fontSize:11, fontWeight:600, color:mC }}>{row.momentum}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:revC, lineHeight:1.3 }} title={row.reversal}>{cRev(row.reversal)}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:smfC, lineHeight:1.3 }} title={row.moneyFlow}>{cSmf(row.moneyFlow)}</div>
                      <div title={row.ruleVerdict||''}>
                        <div style={{ fontSize:11, fontWeight:700, color:setupC.text, lineHeight:1.3 }}>{row.ruleShortVerdict}</div>
                        {row.ruleSubtitle && <div style={{ fontSize:9, color:setupC.text+'99', lineHeight:1.3, marginTop:2 }}>{row.ruleSubtitle}</div>}
                      </div>
                      <button onClick={function(){ window.location.hash=row.ticker; }}
                        style={{ background:'none', border:'0.5px solid #333', borderRadius:6, color:'#888', fontSize:10, cursor:'pointer', padding:'4px 6px' }}>View</button>
                      <button onClick={function(){ addToJournal(row); }}
                        title={'Add '+row.ticker+' to Signal Journal'}
                        style={{ background:'none', border:'0.5px solid #1a3a1a', borderRadius:6, color:'#5a9a40', fontSize:10, cursor:'pointer', padding:'4px 6px', whiteSpace:'nowrap' }}>+Journal</button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div style={{ fontSize:10, color:'#444', marginTop:10 }}>
            {items.length+' tickers scanned \u2022 Sorted by combined reversal + money flow score \u2022 Research use only. Not financial advice.'}
          </div>
        </div>
      )}

      {scanStatus==='error' && <div style={{ color:'#e05050', fontSize:12 }}>{scanMsg}</div>}
    </div>
  );
}


// ── Run 6: SimulatorPage ────────────────────────────────────────────────────────
export function SimulatorPage() {
  var today = new Date().toISOString().split('T')[0];
  var [ticker,      setTicker]      = useState('TSLA');
  var [startDate,   setStartDate]   = useState('2024-01-01');
  var [endDate,     setEndDate]     = useState(today);
  var [holdingPeriod,setHoldingPeriod]=useState('20');
  var [setupFilter, setSetupFilter] = useState('All');
  var [loading,     setLoading]     = useState(false);
  var [loadingMsg,  setLoadingMsg]  = useState('');
  var [feasibility, setFeasibility] = useState(null);
  var [results,     setResults]     = useState(null);
  var [error,       setError]       = useState(null);
  var [progress,    setProgress]    = useState(0);
  var [minSignals,  setMinSignals]  = useState('3');
  var [combSortBy,  setCombSortBy]  = useState('Avg Return');
  var [mbMinSig,    setMbMinSig]    = useState('10');
  var [mbSortBy,    setMbSortBy]    = useState('Win Rate');
  // Custom Signal Tester — weekly momentum/alignment filters
  var [cstWeeklyMom, setCstWeeklyMom] = useState([]);
  var [cstMomProfile, setCstMomProfile] = useState([]);
  var [cstMonthlyRegime, setCstMonthlyRegime] = useState([]);
  var [cstOverallResult, setCstOverallResult] = useState([]);
  // Custom Signal Tester state
  var [cstTrend,     setCstTrend]     = useState([]);
  var [cstMomentum,  setCstMomentum]  = useState([]);
  var [cstReversal,  setCstReversal]  = useState([]);
  var [cstSmartMoney,setCstSmartMoney]= useState([]);
  var [cstSetup,     setCstSetup]     = useState([]);
  var [cstTrendDrv,  setCstTrendDrv]  = useState([]);
  var [cstMomDrv,    setCstMomDrv]    = useState([]);
  var [cstRevDrv,    setCstRevDrv]    = useState([]);
  var [cstSmfDrv,    setCstSmfDrv]    = useState([]);
  var [cstDrvOpen,   setCstDrvOpen]   = useState(false);
  var [cstSubSigOpen,setCstSubSigOpen]= useState(false);
  var [cstRsiFilter, setCstRsiFilter] = useState([]);
  var [cstMacdFilter,setCstMacdFilter]= useState([]);
  var [cst52wFilter, setCst52wFilter] = useState([]);
  var [cstMaFilter,  setCstMaFilter]  = useState([]);

  var SETUP_OPTS = ['All','Strong Bullish','Bullish','Bullish Watch','Neutral','Caution','Bearish Watch','Bearish','Strong Bearish'];
  var HP_OPTS    = [['5','5 trading days'],['10','10 trading days'],['20','20 trading days'],['60','60 trading days']];

  async function testData() {
    setLoading(true); setError(null); setFeasibility(null); setResults(null);
    try {
      var bars = await fetchYahooHistoricalBars(ticker, startDate, endDate, parseInt(holdingPeriod));
      var startTs = new Date(startDate).getTime();
      var endTs   = new Date(endDate).getTime();
      var priorBars = bars.filter(function(b){ return new Date(b.date).getTime() < startTs; });
      var rangeBars = bars.filter(function(b){ var t=new Date(b.date).getTime(); return t>=startTs&&t<=endTs; });
      var hasOHLCV  = bars.length > 0 && bars.every(function(b){ return b.open&&b.high&&b.low&&b.close; });
      var has250    = priorBars.length >= 250;
      var status    = !hasOHLCV ? 'Failed' : !has250 ? 'Limited' : 'Ready';
      setFeasibility({
        ticker: ticker.toUpperCase(),
        totalBars: bars.length,
        firstDate: bars[0] ? bars[0].date : '—',
        lastDate: bars[bars.length-1] ? bars[bars.length-1].date : '—',
        hasOHLCV: hasOHLCV,
        priorBars: priorBars.length,
        rangeBars: rangeBars.length,
        has250: has250,
        status: status,
      });
    } catch(e) { setError('Yahoo data error: ' + e.message); }
    setLoading(false);
  }

  async function runBacktest() {
    setLoading(true); setLoadingMsg('Fetching historical data from Yahoo...'); setResults(null); setError(null); setProgress(0);
    try {
      var bars = await fetchYahooHistoricalBars(ticker, startDate, endDate, parseInt(holdingPeriod));
      setLoadingMsg('Running backtest...');
      await new Promise(function(r){ setTimeout(r, 20); });
      var hp = parseInt(holdingPeriod);
      var startTs = new Date(startDate).getTime();
      var endTs   = new Date(endDate).getTime();
      var rows = [];
      var processed = 0;
      var LIMIT = 1000;
      var inRangeCount = bars.filter(function(b){ var t=new Date(b.date).getTime(); return t>=startTs&&t<=endTs; }).length;
      for (var i = 0; i < bars.length; i++) {
        var bar = bars[i];
        var barTs = new Date(bar.date).getTime();
        if (barTs < startTs || barTs > endTs) continue;
        if (i < 250) continue;                      // need 250 prior bars
        if (i + hp >= bars.length) continue;        // need future bars
        processed++;
        if (processed > LIMIT) break;
        if (processed % 50 === 0) {
          setProgress(Math.round(processed / Math.min(inRangeCount, LIMIT) * 100));
          await new Promise(function(r){ setTimeout(r, 0); });
        }
        var futureBar = bars[i + hp];
        var slice = bars.slice(0, i + 1);
        var ind    = buildHistoricalIndicators(slice);
        var hw     = simRolling52(slice);
        var ohlcv  = slice.map(function(b){ return { date:b.date, open:b.open, high:b.high, low:b.low, close:b.close, volume:b.volume }; });
        var snap;
        try {
          snap = calculateTechnicalSignalSnapshot({ ticker:ticker, date:bar.date, ohlcv:ohlcv, indicators:ind, crossData:null, meta:{ price:bar.close, hi52:hw.hi52, lo52:hw.lo52 } });
        } catch(e){ continue; }
        // Inject smartMoneyDecision so RBA uses the new SMF model
        try {
          var smfBars2 = ohlcv;
          var smfVal2  = validateSmfOHLCV(smfBars2);
          var tSig2 = smfVal2.hasMinBars       ? calcSmfTodaySignal(smfBars2)     : null;
          var fSig2 = smfBars2.length >= 6      ? calcSmfFiveDaySignal(smfBars2)   : null;
          var dSig2 = smfVal2.hasThirtyDays     ? calcSmfThirtyDaySignal(smfBars2) : null;
          var smCard2 = calcSmfSummaryCard(tSig2?tSig2.score:0, fSig2?fSig2.score:0, dSig2?dSig2.score:0, tSig2, fSig2, dSig2);
          if (smCard2 && smCard2.smartMoneyDecision) {
            snap = Object.assign({}, snap);
            snap.smartMoneyFlow = Object.assign({}, snap.smartMoneyFlow, {
              smartMoneyDecision: smCard2.smartMoneyDecision,
              status:             smCard2.status || (snap.smartMoneyFlow && snap.smartMoneyFlow.status),
              todayLabel:         smCard2.todayLabel,
              fiveDayLabel:       smCard2.fiveDayLabel,
              thirtyDayLabel:     smCard2.thirtyDayLabel,
            });
          }
        } catch(e) { /* non-fatal — snap.smartMoneyFlow unchanged */ }
        // Build full snap for RBA (with ohlcv, indicators, meta for key levels)
        var rbaFullSnap = Object.assign({}, snap, { ohlcv:ohlcv, indicators:ind, meta:{ price:bar.close, hi52:hw.hi52, lo52:hw.lo52 } });
        var rba;
        try {
          rba = generateRuleBasedAnalytics(rbaFullSnap);
        } catch(e){ continue; }
        if (!rba) continue;
        var sv = shortRuleVerdict(rba.verdict);
        if (setupFilter !== 'All' && sv !== setupFilter) continue;
        var ret = simPctReturn(bar.close, futureBar.close);
        // Multi-period forward returns
        var ret5d  = (i+5  < bars.length) ? simPctReturn(bar.close, bars[i+5].close)  : null;
        var ret10d = (i+10 < bars.length) ? simPctReturn(bar.close, bars[i+10].close) : null;
        var ret20d = (i+20 < bars.length) ? simPctReturn(bar.close, bars[i+20].close) : null;
        var ret30d = (i+30 < bars.length) ? simPctReturn(bar.close, bars[i+30].close) : null;
        // Safe RBA field extraction
        var fg  = (rba && rba.factorGroups)  || {};
        var dt  = (rba && rba.decisionTrace) || {};
        var dtM = dt.momentum   || {};
        var dtR = dt.reversal   || {};
        var dtS = dt.smartMoney || {};
        var rwd = snap.reversalWatch && snap.reversalWatch.reversalDecision;
        var smd = snap.smartMoneyFlow && snap.smartMoneyFlow.smartMoneyDecision;
        var drv = {};
        try { drv = buildSignalDrivers({ barsUpToDate:slice, indicators:ind,
          snapshot:Object.assign({},snap,{meta:{price:bar.close,hi52:hw.hi52,lo52:hw.lo52}}),
          currentBar:bar,
          rbaDecisionTrace: dt }); } catch(e) {}
        // Raw indicator values for table display
        var drvV = {};
        try {
          var _mh = ind.macdHistory||[]; var _rh = ind.rsiHistory||[];
          var _hi52 = hw.hi52||0; var _lo52 = hw.lo52||0;
          var _r52 = (_hi52>_lo52&&_lo52>0)?_hi52-_lo52:0;
          var _pos52 = _r52>0 ? ((bar.close-_lo52)/_r52)*100 : null;
          var _bkt52 = _pos52!=null ? (_pos52<25?'0-25%':_pos52<50?'25-50%':_pos52<75?'50-75%':_pos52<90?'75-90%':'90-100%') : '—';
          drvV = {
            rsi14:   ind.rsi14!=null?parseFloat(ind.rsi14.toFixed(1)):null,
            macdHistogram: _mh.length?parseFloat(_mh[_mh.length-1].histogram.toFixed(3)):null,
            macdAboveSig:  _mh.length?(_mh[_mh.length-1].macd>_mh[_mh.length-1].signal):null,
            macdImproving: _mh.length>=2?(_mh[_mh.length-1].histogram>_mh[_mh.length-2].histogram):null,
            pos52w:  _pos52!=null?parseFloat(_pos52.toFixed(1)):null,
            bucket52w: _bkt52,
          };
        } catch(e) {}
        // Weekly + Monthly Momentum (derived from weekly/monthly bars)
        var wMom = { status:'Not Enough Data', score:50, rsi14:null, macdHistogram:null, macdDirection:'—', priceVsSma10Pct:null, roc4wPct:null };
        try { wMom = calcWeeklyMomentum(buildWeeklyBars(slice)); } catch(e) {}
        var mMom = { status:'Not Enough Data', score:50, rsi14:null, macdHistogram:null, macdDirection:'—', priceVsSma10Pct:null, roc3mPct:null };
        try { mMom = calcMonthlyMomentum(buildMonthlyBars(slice)); } catch(e) {}
        var nm = {
          daily: snap.momentum ? snap.momentum.status : '—',
          weekly: wMom.status,
          monthly: mMom.status,
          profile: classifyMomentumProfile(snap.momentum ? snap.momentum.status : '—', wMom.status),
          monthlyRegime: classifyMonthlyRegime(mMom.status),
          overallResult: null, // computed dynamically in UI render
          dailyScore: snap.momentum ? snap.momentum.score : null,
          weeklyScore: wMom.score,
          monthlyScore: mMom.score,
        };
        var _mhDrv = ind.macdHistory||[];
        var nmDrv = {
          dailyRsi14: ind.rsi14, dailyMacdHistogram: _mhDrv.length?_mhDrv[_mhDrv.length-1].histogram:null,
          weeklyRsi14: wMom.rsi14, weeklyPrevRsi14: wMom.previousRsi14, weeklyRsiDirection: wMom.rsiDirection,
          weeklyMacdHistogram: wMom.macdHistogram, weeklyPrevMacdHistogram: wMom.previousMacdHistogram,
          weeklyMacdDirection: wMom.macdDirection, weeklyPriceVsSma10Pct: wMom.priceVsSma10Pct, weeklyRoc4wPct: wMom.roc4wPct,
          monthlyRsi14: mMom.rsi14, monthlyPrevRsi14: mMom.previousRsi14, monthlyRsiDirection: mMom.rsiDirection,
          monthlyMacdHistogram: mMom.macdHistogram, monthlyPrevMacdHistogram: mMom.previousMacdHistogram,
          monthlyMacdDirection: mMom.macdDirection, monthlyPriceVsSma10Pct: mMom.priceVsSma10Pct, monthlyRoc3mPct: mMom.roc3mPct,
        };
        rows.push({
          date: bar.date,
          close: bar.close,
          setup: sv,
          fullSetup: rba.verdict,
          scenarioId: rba.scenarioId,
          tone: rba.tone,
          trend:      snap.trend       ? snap.trend.status       : '—',
          momentum:   snap.momentum    ? snap.momentum.status    : '—',
          reversal:   snap.reversalWatch ? snap.reversalWatch.status : '—',
          smartMoney: snap.smartMoneyFlow ? snap.smartMoneyFlow.status : '—',
          futureClose: futureBar.close,
          futureReturn: ret,
          futureReturn5d:  ret5d,
          futureReturn10d: ret10d,
          futureReturn20d: ret20d,
          futureReturn30d: ret30d,
          result: ret != null ? (ret >= 0 ? 'Win' : 'Loss') : '—',
          drivers: drv,
          driverValues: drvV,
          oldMomentum:    snap.momentum ? snap.momentum.status : '—',
          momentumProfile: nm,
          momentumDrivers: nmDrv,
          // ── New RBA fields ──────────────────────────────────────────────────
          rawResult:         fg.rawResult          || sv    || null,
          finalResult:       fg.finalResult        || (rba && rba.verdict) || null,
          trendCondition:    fg.trendCondition     || null,
          momentumStatus:    fg.momentumStatus     || null,
          reversalStatus:    fg.reversalStatus     || null,
          smartMoneyStatus:  fg.smartMoneyStatus   || null,
          momentumStrength:  dtM.strength          || null,
          reversalStrength:  dtR.strength          || null,
          smartMoneyStrength:dtS.strength          || null,
          momentumCause:     dtM.cause             || null,
          reversalCause:     dtR.cause             || null,
          smartMoneyCause:   dtS.cause             || null,
          reversalDecision:  rwd ? {
            outcome:   rwd.outcome   || null,
            ruleId:    rwd.ruleId    || null,
            stage:     rwd.stage     || null,
            direction: rwd.direction || null,
          } : null,
          smartMoneyDecision: smd ? {
            outcome:    smd.outcome    || null,
            baseStatus: smd.baseStatus || null,
            dailyPrefix:smd.dailyPrefix|| null,
            ruleId:     smd.ruleId     || null,
          } : null,
        });
      }
      // Post-process: compute overallResult for each row using full rows array
      var mbMin2 = parseInt(mbMinSig)||10;
      rows.forEach(function(r) {
        if (!r.momentumProfile) return;
        var res = calculateOverallMomentumResult(r, rows, mbMin2);
        r.momentumProfile.overallResult        = res.result;
        r.momentumProfile.overallResultSource  = res.source;
        r.momentumProfile.overallResultSignals = res.signals;
        r.momentumProfile.overallResultWinRate = res.winRate!=null?parseFloat(res.winRate.toFixed(1)):null;
        r.momentumProfile.overallResultMedian  = res.medianReturn!=null?parseFloat(res.medianReturn.toFixed(2)):null;
        r.momentumProfile.overallResultAvg     = res.avgReturn!=null?parseFloat(res.avgReturn.toFixed(2)):null;
        r.momentumProfile.overallResultBest    = res.bestReturn!=null?parseFloat(res.bestReturn.toFixed(2)):null;
        r.momentumProfile.overallResultWorst   = res.worstReturn!=null?parseFloat(res.worstReturn.toFixed(2)):null;
      });
      setResults({ rows:rows, hp:hp, wasLimited: processed >= LIMIT });
    } catch(e){ setError('Backtest failed: ' + e.message); }
    setLoading(false); setLoadingMsg(''); setProgress(0);
  }

  // ── Stats helpers ───────────────────────────────────────────────────────────
  function calcStats(rows) {
    if (!rows || !rows.length) return null;
    var rets = rows.filter(function(r){ return r.futureReturn != null; }).map(function(r){ return r.futureReturn; });
    if (!rets.length) return null;
    var wins = rets.filter(function(r){ return r >= 0; }).length;
    return {
      total: rows.length,
      winRate: (wins / rets.length * 100).toFixed(1),
      avg: (rets.reduce(function(a,b){return a+b;},0) / rets.length).toFixed(2),
      median: (simMedian(rets) || 0).toFixed(2),
      best: Math.max.apply(null, rets).toFixed(2),
      worst: Math.min.apply(null, rets).toFixed(2),
    };
  }


  // ── Styles ─────────────────────────────────────────────────────────────────
  var card   = { background:'#161614', border:'0.5px solid #2a2a28', borderRadius:10, padding:'16px 18px', marginBottom:14 };
  var inp    = { background:'#111', border:'0.5px solid #333', borderRadius:6, padding:'7px 10px', color:'#f0ede6', fontSize:12, outline:'none', width:'100%', boxSizing:'border-box' };
  var btn    = { background:'#c8f000', color:'#111', fontWeight:700, fontSize:12, border:'none', borderRadius:7, padding:'9px 18px', cursor:'pointer' };
  var btnGhost = { background:'none', color:'#888', fontWeight:600, fontSize:11, border:'0.5px solid #333', borderRadius:7, padding:'7px 14px', cursor:'pointer' };
  var lbl    = { fontSize:9, color:'#555', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:4, display:'block' };
  var stat   = { background:'#0e0e0c', borderRadius:8, padding:'12px 14px', textAlign:'center' };

  return (
    <div style={{ fontFamily:FONT, background:BG, minHeight:'100vh', padding:'24px 28px', color:'#f0ede6', maxWidth:1200, margin:'0 auto' }}>
      {/* Header */}
      <button onClick={function(){ window.location.hash=''; }} style={{ background:'none', border:'none', color:'#555', fontSize:12, cursor:'pointer', marginBottom:16, padding:0 }}>{'← Back'}</button>
      <div style={{ fontSize:10, color:LIME, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Simulator</div>
      <div style={{ fontSize:22, fontWeight:800, color:'#f0ede6', marginBottom:4 }}>Rule Based Setup Simulator</div>
      <div style={{ fontSize:12, color:'#666', marginBottom:24 }}>Backtest how NervousGeek Setups performed historically using Yahoo daily price data.</div>

      {/* Inputs */}
      <div style={Object.assign({},card,{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:12,alignItems:'end'})}>
        <div>
          <span style={lbl}>Ticker</span>
          <input value={ticker} onChange={function(e){setTicker(e.target.value.toUpperCase());}} style={inp} placeholder="e.g. TSLA" />
        </div>
        <div>
          <span style={lbl}>Start Date</span>
          <input type="date" value={startDate} onChange={function(e){setStartDate(e.target.value);}} style={inp} />
        </div>
        <div>
          <span style={lbl}>End Date</span>
          <input type="date" value={endDate} onChange={function(e){setEndDate(e.target.value);}} style={inp} />
        </div>
        <div>
          <span style={lbl}>Holding Period</span>
          <select value={holdingPeriod} onChange={function(e){setHoldingPeriod(e.target.value);}} style={Object.assign({},inp,{cursor:'pointer'})}>
            {HP_OPTS.map(function(o){ return <option key={o[0]} value={o[0]}>{o[1]}</option>; })}
          </select>
        </div>
        <div>
          <span style={lbl}>Setup Filter</span>
          <select value={setupFilter} onChange={function(e){setSetupFilter(e.target.value);}} style={Object.assign({},inp,{cursor:'pointer'})}>
            {SETUP_OPTS.map(function(o){ return <option key={o} value={o}>{o}</option>; })}
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <button style={btn} disabled={loading} onClick={runBacktest}>{loading&&loadingMsg?loadingMsg:'Run Backtest'}</button>
        <button style={btnGhost} disabled={loading} onClick={testData}>{loading&&!loadingMsg?'Testing...':'Test Yahoo Data'}</button>
      </div>

      {/* Progress */}
      {loading && progress > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ background:'#1a1a18', borderRadius:4, height:4, marginBottom:6 }}>
            <div style={{ background:LIME, borderRadius:4, height:4, width:progress+'%', transition:'width 0.2s' }}></div>
          </div>
          <div style={{ fontSize:11, color:'#555' }}>{progress}% complete</div>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ background:'#200808', border:'0.5px solid #e05050', borderRadius:8, padding:'12px 16px', color:'#e05050', fontSize:12, marginBottom:14 }}>{error}</div>}

      {/* Feasibility */}
      {feasibility && (
        <div style={card}>
          <div style={{ fontSize:10, color:'#555', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.07em', marginBottom:12 }}>Yahoo Data Check — {feasibility.ticker}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12 }}>
            {[
              ['Total Bars', feasibility.totalBars],
              ['First Date', feasibility.firstDate],
              ['Last Date',  feasibility.lastDate],
              ['In-Range Bars', feasibility.rangeBars],
            ].map(function(f){ return (
              <div key={f[0]} style={stat}>
                <div style={{ fontSize:9, color:'#555', textTransform:'uppercase', marginBottom:3 }}>{f[0]}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#f0ede6' }}>{f[1]}</div>
              </div>
            ); })}
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
            {[
              ['Prior bars',    feasibility.priorBars + ' (need 250)', feasibility.has250 ? '#7abd00' : '#e05050'],
              ['OHLCV complete',feasibility.hasOHLCV ? 'Yes' : 'Partial', feasibility.hasOHLCV ? '#7abd00' : '#EF9F27'],
              ['Status',        feasibility.status, feasibility.status==='Ready'?'#7abd00':feasibility.status==='Limited'?'#EF9F27':'#e05050'],
            ].map(function(f){ return (
              <div key={f[0]} style={{ background:'#0e0e0c', borderRadius:6, padding:'7px 12px' }}>
                <div style={{ fontSize:9, color:'#555', textTransform:'uppercase', marginBottom:2 }}>{f[0]}</div>
                <div style={{ fontSize:13, fontWeight:700, color:f[2] }}>{f[1]}</div>
              </div>
            ); })}
          </div>
          {!feasibility.has250 && <div style={{ fontSize:11, color:'#EF9F27', marginTop:6 }}>⚠ Not enough lookback data to calculate SMA200 reliably. Try an earlier start date.</div>}
        </div>
      )}

      {/* Results */}
      {results && results.rows.length === 0 && (
        <div style={{ ...card, color:'#555', fontSize:13, textAlign:'center', padding:32 }}>No matching setup signals found for the selected period and filter.</div>
      )}

      {results && results.rows.length > 0 && (function(){
        var stats = calcStats(results.rows);
        return (
          <div>
            {results.wasLimited && <div style={{ background:'#1e1800', border:'0.5px solid #EF9F27', borderRadius:7, padding:'8px 14px', color:'#EF9F27', fontSize:11, marginBottom:14 }}>⚠ Date range produced more than 1,000 test dates. Showing first 1,000 only. Narrow your date range for full coverage.</div>}

            {/* Summary stats */}
            <div style={card}>
              <div style={{ fontSize:10, color:'#555', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.07em', marginBottom:12 }}>{'Summary — ' + ticker.toUpperCase() + ' · ' + results.hp + 'D Holding · ' + results.rows.length + ' signals'}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:10 }}>
                {[
                  ['Signals',     stats.total,           '#f0ede6'],
                  ['Win Rate',    stats.winRate+'%',      parseFloat(stats.winRate)>=55?'#7abd00':parseFloat(stats.winRate)>=45?'#EF9F27':'#e05050'],
                  ['Avg Return',  simFmtPct(parseFloat(stats.avg)),   parseFloat(stats.avg)>=0?'#7abd00':'#e05050'],
                  ['Median',      simFmtPct(parseFloat(stats.median)),parseFloat(stats.median)>=0?'#7abd00':'#e05050'],
                  ['Best',        '+'+stats.best+'%',    '#7abd00'],
                  ['Worst',       stats.worst+'%',       '#e05050'],
                  ['Hold Period', results.hp+'D',         '#888'],
                ].map(function(f){ return (
                  <div key={f[0]} style={stat}>
                    <div style={{ fontSize:9, color:'#555', textTransform:'uppercase', marginBottom:4 }}>{f[0]}</div>
                    <div style={{ fontSize:15, fontWeight:800, color:f[2] }}>{f[1]}</div>
                  </div>
                ); })}
              </div>
            </div>


            {/* Combination Performance */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:10 }}>
                <div style={{ fontSize:10, color:'#555', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.07em' }}>{'Combination Performance'}</div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button onClick={function(){
                    var minS2 = parseInt(minSignals)||3;
                    var exp6c = sortCombinationRows(groupByCombination(results.rows).filter(function(r){ return r.signals>=minS2; }), combSortBy);
                    if (!exp6c.length) return;
                    exportRowsToCsv(ticker+'-combination-performance-'+results.hp+'D.csv', exp6c, [
                      { label:'Trend',        key:'trend' },
                      { label:'Momentum',     key:'momentum' },
                      { label:'Reversal',     key:'reversal' },
                      { label:'Smart Money',  key:'smartMoney' },
                      { label:'Setup',        key:'setup' },
                      { label:'Signals',      key:'signals' },
                      { label:'Win Rate %',   value:function(r){ return r.winRate!=null?r.winRate.toFixed(1):''; } },
                      { label:'Avg Return %', value:function(r){ return r.avgReturn!=null?r.avgReturn.toFixed(2):''; } },
                      { label:'Median %',     value:function(r){ return r.medianReturn!=null?r.medianReturn.toFixed(2):''; } },
                      { label:'Best %',       value:function(r){ return r.bestReturn!=null?r.bestReturn.toFixed(2):''; } },
                      { label:'Worst %',      value:function(r){ return r.worstReturn!=null?r.worstReturn.toFixed(2):''; } },
                    ]);
                  }} style={{ fontSize:10, padding:'3px 10px', background:'none', border:'0.5px solid #333', borderRadius:5, color:'#888', cursor:'pointer' }}>Export CSV</button>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:9, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em' }}>{'Min Signals'}</span>
                    <select value={minSignals} onChange={function(e){setMinSignals(e.target.value);}}
                      style={{ background:'#111', border:'0.5px solid #333', borderRadius:5, padding:'4px 8px', color:'#f0ede6', fontSize:10, outline:'none', cursor:'pointer' }}>
                      {['1','3','5','10'].map(function(v){ return <option key={v} value={v}>{v}</option>; })}
                    </select>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:9, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em' }}>{'Sort By'}</span>
                    <select value={combSortBy} onChange={function(e){setCombSortBy(e.target.value);}}
                      style={{ background:'#111', border:'0.5px solid #333', borderRadius:5, padding:'4px 8px', color:'#f0ede6', fontSize:10, outline:'none', cursor:'pointer' }}>
                      {['Avg Return','Signals','Win Rate','Median Return','Worst Return'].map(function(v){ return <option key={v} value={v}>{v}</option>; })}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ fontSize:11, color:'#555', lineHeight:1.6, marginBottom:8 }}>
                {'Combination Performance groups each historical signal by the exact Trend, Momentum, Reversal, and Smart Money values. This helps reveal which combinations worked better than the broader Setup label.'}
              </div>
              {(function(){
                var minS = parseInt(minSignals) || 3;
                var combRows = groupByCombination(results.rows);
                var filtered6c = combRows.filter(function(r){ return r.signals >= minS; });
                var sorted6c   = sortCombinationRows(filtered6c, combSortBy);
                if (!sorted6c.length) return (
                  <div style={{ color:'#555', fontSize:11, padding:'16px 0', textAlign:'center' }}>
                    {'No combinations with ' + minS + '+ signals. Lower the Minimum Signals filter.'}
                  </div>
                );
                return (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                      <thead>
                        <tr style={{ borderBottom:'1px solid #2a2a28' }}>
                          {['Trend','Momentum','Reversal','Smart Money','Setup','Signals','Win Rate','Avg Return','Median','Best','Worst',''].map(function(h){
                            return <th key={h} style={{ padding:'5px 8px', fontSize:9, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'left', background:'#1a1a18', whiteSpace:'nowrap' }}>{h}</th>;
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted6c.map(function(row, i){
                          var sc   = summaryCardDark(row.setup);
                          var wr   = row.winRate;
                          var wrC  = wr==null?'#555':wr>=60?'#7abd00':wr>=45?'#EF9F27':'#e05050';
                          var avgC = row.avgReturn==null?'#555':row.avgReturn>=0?'#7abd00':'#e05050';
                          var medC = row.medianReturn==null?'#555':row.medianReturn>=0?'#7abd00':'#e05050';
                          var qlbl = combinationQualityLabel(row);
                          var qlblStyle = qlbl==='Worked Well'
                            ? { fontSize:8, fontWeight:700, color:'#7abd00', background:'#0d200d', border:'0.5px solid #7abd00', borderRadius:3, padding:'1px 5px' }
                            : qlbl==='Weak'
                            ? { fontSize:8, fontWeight:700, color:'#e05050', background:'#200808', border:'0.5px solid #e05050', borderRadius:3, padding:'1px 5px' }
                            : { fontSize:8, color:'#555', background:'#111', border:'0.5px solid #333', borderRadius:3, padding:'1px 5px' };
                          return (
                            <tr key={row.key+i} style={{ background:i%2===0?'#181816':'#141412', borderBottom:'1px solid #1a1a16' }}>
                              <td style={{ padding:'5px 8px', color:'#aaa', fontSize:9, whiteSpace:'nowrap' }}>{row.trend}</td>
                              <td style={{ padding:'5px 8px', color:'#aaa', fontSize:9 }}>{row.momentum}</td>
                              <td style={{ padding:'5px 8px', color:'#aaa', fontSize:9, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={row.reversal}>{row.reversal}</td>
                              <td style={{ padding:'5px 8px', color:'#aaa', fontSize:9, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={row.smartMoney}>{row.smartMoney}</td>
                              <td style={{ padding:'5px 8px', fontWeight:700, color:sc.text, whiteSpace:'nowrap', fontSize:10 }}>{row.setup}</td>
                              <td style={{ padding:'5px 8px', color:'#f0ede6', fontWeight:600, textAlign:'right' }}>{row.signals}</td>
                              <td style={{ padding:'5px 8px', fontWeight:700, color:wrC, textAlign:'right' }}>{wr!=null?wr.toFixed(1)+'%':'—'}</td>
                              <td style={{ padding:'5px 8px', fontWeight:700, color:avgC, textAlign:'right' }}>{simFmtPct(row.avgReturn)}</td>
                              <td style={{ padding:'5px 8px', color:medC, textAlign:'right' }}>{simFmtPct(row.medianReturn)}</td>
                              <td style={{ padding:'5px 8px', color:'#7abd00', textAlign:'right' }}>{simFmtPct(row.bestReturn)}</td>
                              <td style={{ padding:'5px 8px', color:'#e05050', textAlign:'right' }}>{simFmtPct(row.worstReturn)}</td>
                              <td style={{ padding:'5px 8px' }}>
                                {qlbl && <span style={qlblStyle}>{qlbl}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              <div style={{ fontSize:9, color:'#444', marginTop:10 }}>{'Small sample sizes can be misleading. Use combinations with higher signal counts for stronger conclusions.'}</div>
            </div>





            {/* Momentum Model A/B Test */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                <div style={{ fontSize:10, color:'#555', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.07em' }}>{'Momentum Profile Backtest'}</div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  {[['Min Signals',mbMinSig,setMbMinSig,['1','3','5','10','20']],
                    ['Sort By',mbSortBy,setMbSortBy,['Win Rate','Avg Return','Median Return','Signals','Worst Return']],
                  ].map(function(ctrl){
                    return <div key={ctrl[0]} style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontSize:9, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em' }}>{ctrl[0]}</span>
                      <select value={ctrl[1]} onChange={function(e){ ctrl[2](e.target.value); }}
                        style={{ background:'#111', border:'0.5px solid #333', borderRadius:5, padding:'4px 8px', color:'#f0ede6', fontSize:10, outline:'none', cursor:'pointer' }}>
                        {ctrl[3].map(function(v){ return <option key={v} value={v}>{v}</option>; })}
                      </select>
                    </div>;
                  })}
                  <button onClick={function(){
                    if (!results||!results.rows.length) return;
                    exportRowsToCsv(ticker+'-momentum-ab-test-'+results.hp+'D.csv', results.rows, [
                      { label:'Date',          key:'date' },
                      { label:'Old Momentum',  key:'oldMomentum' },
                      { label:'Daily Momentum',value:function(r){ return r.momentumProfile?r.momentumProfile.daily:''; } },
                      { label:'Weekly Momentum',value:function(r){ return r.momentumProfile?r.momentumProfile.weekly:''; } },
                      { label:'Alignment',     value:function(r){ return r.momentumProfile?r.momentumProfile.profile:''; } },
                      { label:'Weekly RSI',    value:function(r){ return r.momentumDrivers&&r.momentumDrivers.weeklyRsi14!=null?r.momentumDrivers.weeklyRsi14.toFixed(1):''; } },
                      { label:'Weekly MACD Hist',value:function(r){ return r.momentumDrivers&&r.momentumDrivers.weeklyMacdHistogram!=null?r.momentumDrivers.weeklyMacdHistogram.toFixed(3):''; } },
                      { label:'Weekly 4W ROC', value:function(r){ return r.momentumDrivers&&r.momentumDrivers.weeklyRoc4wPct!=null?r.momentumDrivers.weeklyRoc4wPct.toFixed(2)+'%':''; } },
                      { label:'Future Return %',value:function(r){ return r.futureReturn!=null?r.futureReturn.toFixed(2):''; } },
                      { label:'Result',        key:'result' },
                    ]);
                  }} style={{ fontSize:10, padding:'3px 10px', background:'none', border:'0.5px solid #333', borderRadius:5, color:'#888', cursor:'pointer' }}>Export CSV</button>
                </div>
              </div>
              <div style={{ fontSize:11, color:'#555', marginBottom:6, lineHeight:1.6 }}>
                {'Momentum Profile is based mainly on Daily + Weekly momentum. Monthly Regime is used as ticker-specific historical context. When enough samples exist, Overall Momentum Result uses the exact Momentum Profile + Monthly Regime result. Otherwise, it falls back to the broader Momentum Profile result.'}
              </div>
              <div style={{ fontSize:10, color:'#3a3a38', marginBottom:14, lineHeight:1.6, fontStyle:'italic' }}>
                {'Monthly Regime is not automatically good or bad — it is evaluated based on this ticker\'s own historical behaviour.'}
              </div>
              {(function(){
                var minS = parseInt(mbMinSig)||10;
                function sortG(groups) {
                  return groups.filter(function(r){return r.signals>=minS;}).sort(function(a,b){
                    if (mbSortBy==='Avg Return')    return (b.avgReturn||0)-(a.avgReturn||0);
                    if (mbSortBy==='Median Return') return (b.medianReturn||0)-(a.medianReturn||0);
                    if (mbSortBy==='Signals')       return b.signals-a.signals;
                    if (mbSortBy==='Worst Return')  return (b.worstReturn||-999)-(a.worstReturn||-999);
                    return (b.winRate||0)-(a.winRate||0);
                  });
                }
                var rows = results.rows;
                var oldG   = sortG(simGroupBy(rows, function(r){ return r.oldMomentum; }));
                var weekG  = sortG(simGroupBy(rows, function(r){ return r.momentumProfile&&r.momentumProfile.weekly; }));
                var profG  = sortG(simGroupBy(rows, function(r){ return r.momentumProfile&&r.momentumProfile.profile; }));
                var monthG = sortG(simGroupBy(rows, function(r){ return r.momentumProfile&&r.momentumProfile.monthlyRegime; }));
                var combG  = sortG(simGroupBy(rows, function(r){ return r.momentumProfile?(r.momentumProfile.daily+' / '+r.momentumProfile.weekly+' / '+r.momentumProfile.profile+' / '+r.momentumProfile.monthlyRegime):'—'; }));

                var bestOld   = oldG[0];
                var bestWeek  = weekG[0];
                var bestProf  = profG[0];
                var bestMonth = monthG.filter(function(r){ return r.label!=='Not Enough Data'; })[0];
                // Best Profile + Monthly combined
                var combGAll = simGroupBy(rows, function(r){ return r.momentumProfile?(r.momentumProfile.profile+'  ·  '+r.momentumProfile.monthlyRegime):'—'; });
                var bestCombPM = combGAll.filter(function(r){ return r.signals>=minS && r.label!=='—'; }).sort(function(a,b){ return (b.winRate||0)-(a.winRate||0); })[0];
                var wDiff = (bestProf&&bestOld&&bestProf.winRate!=null&&bestOld.winRate!=null)?(bestProf.winRate-bestOld.winRate).toFixed(1):null;
                var mDiff = (bestProf&&bestOld&&bestProf.medianReturn!=null&&bestOld.medianReturn!=null)?(bestProf.medianReturn-bestOld.medianReturn).toFixed(2):null;

                function qlC(q){ return q==='Strong'?'#7abd00':q==='Watch'?'#6090d0':q==='Weak'?'#e05050':q==='Mixed'?'#EF9F27':'#555'; }
                function ATH(h){ return <th key={h} style={{ padding:'4px 8px', fontSize:8, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'left', background:'#1a1a18', whiteSpace:'nowrap' }}>{h}</th>; }
                function ARow(r, i) {
                  var q=simAbQuality(r,minS), wrC=(r.winRate||0)>=60?'#7abd00':(r.winRate||0)>=45?'#EF9F27':'#e05050';
                  return <tr key={r.label+i} style={{ background:i%2===0?'#181816':'#141412', borderBottom:'1px solid #1a1a16' }}>
                    <td style={{ padding:'5px 8px', color:'#d0a060', fontSize:10, fontWeight:600, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.label}>{r.label}</td>
                    <td style={{ padding:'5px 8px', color:'#f0ede6', textAlign:'right', fontWeight:600 }}>{r.signals}</td>
                    <td style={{ padding:'5px 8px', color:wrC, textAlign:'right', fontWeight:700 }}>{r.winRate!=null?r.winRate.toFixed(1)+'%':'—'}</td>
                    <td style={{ padding:'5px 8px', color:(r.avgReturn||0)>=0?'#7abd00':'#e05050', textAlign:'right', fontWeight:700 }}>{simFmtPct(r.avgReturn)}</td>
                    <td style={{ padding:'5px 8px', color:(r.medianReturn||0)>=0?'#7abd00':'#e05050', textAlign:'right' }}>{simFmtPct(r.medianReturn)}</td>
                    <td style={{ padding:'5px 8px', color:'#7abd00', textAlign:'right' }}>{simFmtPct(r.bestReturn)}</td>
                    <td style={{ padding:'5px 8px', color:'#e05050', textAlign:'right' }}>{simFmtPct(r.worstReturn)}</td>
                    <td style={{ padding:'5px 8px' }}><span style={{ fontSize:8, fontWeight:700, color:qlC(q), background:'#111', border:'0.5px solid '+qlC(q)+'55', borderRadius:3, padding:'1px 5px' }}>{q}</span></td>
                  </tr>;
                }
                function ATable(groups, col1label) {
                  if (!groups.length) return <div style={{ color:'#555', fontSize:11, padding:'6px 0' }}>No groups with {minS}+ signals.</div>;
                  return <div style={{ overflowX:'auto', marginBottom:14 }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                      <thead><tr style={{ borderBottom:'1px solid #2a2a28' }}>{[col1label,'Signals','Win Rate','Avg Return','Median','Best','Worst','Quality'].map(ATH)}</tr></thead>
                      <tbody>{groups.map(function(r,i){ return ARow(r,i); })}</tbody>
                    </table>
                  </div>;
                }
                function CombTable(groups) {
                  if (!groups.length) return <div style={{ color:'#555', fontSize:11, padding:'6px 0' }}>No groups with {minS}+ signals.</div>;
                  return <div style={{ overflowX:'auto', marginBottom:14 }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                      <thead><tr style={{ borderBottom:'1px solid #2a2a28' }}>{['Daily','Weekly','Profile','Monthly Regime','Signals','Win Rate','Avg Return','Median','Best','Worst','Quality'].map(ATH)}</tr></thead>
                      <tbody>{groups.map(function(r,i){
                        var pts=r.label.split(' / '), q=simAbQuality(r,minS);
                        var wrC=(r.winRate||0)>=60?'#7abd00':(r.winRate||0)>=45?'#EF9F27':'#e05050';
                        return <tr key={r.label+i} style={{ background:i%2===0?'#181816':'#141412', borderBottom:'1px solid #1a1a16' }}>
                          <td style={{ padding:'5px 8px', color:'#9acd50', fontSize:9, whiteSpace:'nowrap' }}>{pts[0]||'—'}</td>
                          <td style={{ padding:'5px 8px', color:'#6090d0', fontSize:9, whiteSpace:'nowrap' }}>{pts[1]||'—'}</td>
                          <td style={{ padding:'5px 8px', color:'#d0a060', fontSize:9, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={pts[2]||''}>{pts[2]||'—'}</td>
                          <td style={{ padding:'5px 8px', color:'#c890d0', fontSize:9, whiteSpace:'nowrap' }}>{pts[3]||'—'}</td>
                          <td style={{ padding:'5px 8px', color:'#f0ede6', textAlign:'right', fontWeight:600 }}>{r.signals}</td>
                          <td style={{ padding:'5px 8px', color:wrC, textAlign:'right', fontWeight:700 }}>{r.winRate!=null?r.winRate.toFixed(1)+'%':'—'}</td>
                          <td style={{ padding:'5px 8px', color:(r.avgReturn||0)>=0?'#7abd00':'#e05050', textAlign:'right', fontWeight:700 }}>{simFmtPct(r.avgReturn)}</td>
                          <td style={{ padding:'5px 8px', color:(r.medianReturn||0)>=0?'#7abd00':'#e05050', textAlign:'right' }}>{simFmtPct(r.medianReturn)}</td>
                          <td style={{ padding:'5px 8px', color:'#7abd00', textAlign:'right' }}>{simFmtPct(r.bestReturn)}</td>
                          <td style={{ padding:'5px 8px', color:'#e05050', textAlign:'right' }}>{simFmtPct(r.worstReturn)}</td>
                          <td style={{ padding:'5px 8px' }}><span style={{ fontSize:8, fontWeight:700, color:qlC(q), background:'#111', border:'0.5px solid '+qlC(q)+'55', borderRadius:3, padding:'1px 5px' }}>{q}</span></td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>;
                }
                function SCard(label, val, col) {
                  return <div key={label} style={{ background:'#0e0e0c', borderRadius:7, padding:'10px 12px' }}>
                    <div style={{ fontSize:8, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:11, fontWeight:800, color:col||'#f0ede6', lineHeight:1.4 }}>{val||'—'}</div>
                  </div>;
                }
                return (
                  <div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:18 }}>
                      {SCard('Best Daily Momentum',   bestOld   ?(bestOld.label  +' ('+bestOld.winRate.toFixed(1)  +'% WR)'):'—', '#9acd50')}
                      {SCard('Best Weekly Momentum',  bestWeek  ?(bestWeek.label +' ('+bestWeek.winRate.toFixed(1) +'% WR)'):'—', '#6090d0')}
                      {SCard('Best Momentum Profile', bestProf  ?(bestProf.label +' ('+bestProf.winRate.toFixed(1) +'% WR)'):'—', '#d0a060')}
                      {SCard('Best Monthly Regime',   bestMonth ?(bestMonth.label+' ('+bestMonth.winRate.toFixed(1)+'% WR)'):'—', '#c890d0')}
                      {SCard('Best Profile + Monthly',bestCombPM?(bestCombPM.label+' ('+bestCombPM.winRate.toFixed(1)+'% WR)'):'—', '#7ab8d0')}
                      {SCard('vs Daily Momentum', wDiff!=null?(wDiff>0?'+':'')+wDiff+'% WR '+(mDiff!=null?'/ '+(mDiff>0?'+':'')+mDiff+'% med':''):'—', wDiff!=null&&parseFloat(wDiff)>0?'#7abd00':'#e05050')}
                    </div>
                    <div style={{ fontSize:9, color:'#555', lineHeight:1.7, marginBottom:14, background:'#0c0c0a', borderRadius:6, padding:'8px 10px' }}>
                      {'Overall Momentum Result uses a fallback: (1) checks Profile + Monthly Regime exact combination first; (2) if not enough samples, falls back to Momentum Profile; (3) if still insufficient, shows Low Confidence.'}
                    </div>
                    <div style={{ fontSize:9, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Daily Momentum Performance</div>
                    {ATable(oldG, 'Daily Momentum')}
                    <div style={{ fontSize:9, fontWeight:700, color:'#6090d0', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Weekly Momentum Performance</div>
                    {ATable(weekG, 'Weekly Momentum')}
                    <div style={{ fontSize:9, fontWeight:700, color:'#d0a060', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Momentum Profile Performance</div>
                    {ATable(profG, 'Momentum Profile')}
                    <div style={{ fontSize:9, fontWeight:700, color:'#c890d0', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Monthly Regime Performance</div>
                    {ATable(monthG, 'Monthly Regime')}
                    <div style={{ fontSize:9, fontWeight:700, color:'#EF9F27', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Combined Momentum Profile</div>
                    {CombTable(combG)}
                    <div style={{ fontSize:9, fontWeight:700, color:'#7ab8d0', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Overall Momentum Result — Source Breakdown</div>
                    {(function(){
                      var srcG = sortG(simGroupBy(rows, function(r){ return r.momentumProfile?(r.momentumProfile.overallResult+' / '+(r.momentumProfile.overallResultSource||'—')):'—'; }));
                      if (!srcG.length) return <div style={{ color:'#555', fontSize:11, padding:'6px 0' }}>No groups with {minS}+ signals.</div>;
                      return <div style={{ overflowX:'auto', marginBottom:14 }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                          <thead><tr style={{ borderBottom:'1px solid #2a2a28' }}>{['Overall Result','Source','Signals','Win Rate','Avg Return','Median','Best','Worst','Quality'].map(ATH)}</tr></thead>
                          <tbody>{srcG.map(function(r,i){
                            var pts=r.label.split(' / '), q=simAbQuality(r,minS);
                            var wrC=(r.winRate||0)>=60?'#7abd00':(r.winRate||0)>=45?'#EF9F27':'#e05050';
                            var resC = pts[0]==='Favourable'?'#7abd00':pts[0]==='Watch'?'#6090d0':pts[0]==='Mixed'?'#EF9F27':pts[0]==='Unfavourable'?'#e05050':'#555';
                            return <tr key={r.label+i} style={{ background:i%2===0?'#181816':'#141412', borderBottom:'1px solid #1a1a16' }}>
                              <td style={{ padding:'5px 8px', color:resC, fontSize:9, fontWeight:700 }}>{pts[0]||'—'}</td>
                              <td style={{ padding:'5px 8px', color:'#7ab8d0', fontSize:9 }}>{pts[1]||'—'}</td>
                              <td style={{ padding:'5px 8px', color:'#f0ede6', textAlign:'right', fontWeight:600 }}>{r.signals}</td>
                              <td style={{ padding:'5px 8px', color:wrC, textAlign:'right', fontWeight:700 }}>{r.winRate!=null?r.winRate.toFixed(1)+'%':'—'}</td>
                              <td style={{ padding:'5px 8px', color:(r.avgReturn||0)>=0?'#7abd00':'#e05050', textAlign:'right', fontWeight:700 }}>{simFmtPct(r.avgReturn)}</td>
                              <td style={{ padding:'5px 8px', color:(r.medianReturn||0)>=0?'#7abd00':'#e05050', textAlign:'right' }}>{simFmtPct(r.medianReturn)}</td>
                              <td style={{ padding:'5px 8px', color:'#7abd00', textAlign:'right' }}>{simFmtPct(r.bestReturn)}</td>
                              <td style={{ padding:'5px 8px', color:'#e05050', textAlign:'right' }}>{simFmtPct(r.worstReturn)}</td>
                              <td style={{ padding:'5px 8px' }}><span style={{ fontSize:8, fontWeight:700, color:qlC(q), background:'#111', border:'0.5px solid '+qlC(q)+'55', borderRadius:3, padding:'1px 5px' }}>{q}</span></td>
                            </tr>;
                          })}</tbody>
                        </table>
                      </div>;
                    })()}
                  </div>
                );
              })()}
            </div>

            {/* Custom Signal Tester */}
            {(function(){
              var CST_TREND_OPTS = ['Strong Uptrend','Uptrend','Sideways','Downtrend','Strong Downtrend'];
              var CST_MOM_OPTS   = ['Strong','Building','Neutral','Fading','Weak'];
              var CST_REV_OPTS   = ['Bullish Reversal Spark','Bullish Reversal Watch','Bullish Reversal Confirming','Mixed Reversal Signals','Bearish Reversal Watch','Bearish Reversal Forming','No Signal','No Clear Reversal'];
              var CST_SMF_OPTS   = ['Strong Multi-Timeframe Flow','Accumulation Trend Positive','Constructive but Cooling','No Clear Signal','Early Accumulation','Short-Term Spike'];
              var CST_SETUP_OPTS = ['Strong Bullish','Bullish','Bullish Watch','Neutral','Caution','Bearish Watch','Bearish','Strong Bearish'];

              var CST_TREND_DRVS = [['priceAboveSma50','Price above SMA50'],['priceAboveSma200','Price above SMA200'],['sma50AboveSma200','SMA50 above SMA200'],['priceReclaimedSma50','Price reclaimed SMA50'],['priceLostSma50','Price lost SMA50'],['priceAboveEma20','Price above EMA20'],['ema20AboveSma50','EMA20 above SMA50'],['priceNear52wHigh','Near 52W high'],['priceFarBelow52wHigh','Far below 52W high']];
              var CST_MOM_DRVS   = [['rsiAbove50','RSI above 50'],['rsiBetween45And65','RSI 45–65'],['rsiAbove70','RSI above 70'],['rsiRising','RSI rising'],['rsiFalling','RSI falling'],['macdAboveSignal','MACD above signal'],['macdBelowSignal','MACD below signal'],['macdImproving','MACD improving'],['macdDeteriorating','MACD deteriorating'],['macdHistogramPositive','MACD histogram +'],['macdHistogramImproving','MACD histogram improving']];
              var CST_REV_DRVS   = [['trendSideways','Trend Sideways'],['trendDowntrend','Trend Downtrend'],['momentumBuilding','Momentum Building'],['reversalBullishSpark','Bull Reversal Spark'],['reversalBullishWatch','Bull Reversal Watch'],['reversalBullishConfirming','Bull Reversal Confirming'],['reversalMixed','Mixed Reversal'],['reversalBearishWatch','Bear Reversal Watch'],['priceReclaimedSma50','Price reclaimed SMA50'],['rsiRising','RSI rising'],['macdImproving','MACD improving'],['volumeAbove20dAvg','Volume above 20D avg']];
              var CST_SMF_DRVS   = [['volumeAbove20dAvg','Volume above 20D avg'],['volumeAbove50dAvg','Volume above 50D avg'],['volumeRising5d','Volume rising 5D'],['smartMoneyConstructive','SM constructive'],['smartMoneyCooling','SM cooling'],['smartMoneyPositive','SM positive'],['smartMoneyNoClearSignal','No clear signal'],['smartMoneyAccumulationPositive','Accumulation positive'],['smartMoneyStrongMultiTimeframe','Strong multi-TF flow']];

              function toggle(arr, setter, v) { setter(arr.indexOf(v)!==-1 ? arr.filter(function(x){return x!==v;}) : arr.concat([v])); }
              function pillSel(v, arr, setter, colorFn) {
                var sel = arr.indexOf(v)!==-1;
                var ac = colorFn ? colorFn(v) : LIME;
                return <button key={v} onClick={function(){ toggle(arr, setter, v); }}
                  style={{ fontSize:9, padding:'3px 9px', borderRadius:10, cursor:'pointer', fontWeight:sel?700:400, outline:'none',
                    background:sel?'#1a2a0a':'#141412', color:sel?ac:'#666',
                    border:'0.5px solid '+(sel?ac:'#2a2a28') }}>{v}</button>;
              }
              function drvChk(key, label, arr, setter) {
                var sel = arr.indexOf(key)!==-1;
                return <button key={key} onClick={function(){ toggle(arr, setter, key); }}
                  style={{ fontSize:9, padding:'2px 8px', borderRadius:4, cursor:'pointer', fontWeight:sel?700:400, outline:'none',
                    background:sel?'#0f2010':'#111', color:sel?'#9acd50':'#555',
                    border:'0.5px solid '+(sel?'#9acd50':'#2a2a28'), marginRight:4, marginBottom:4 }}>{label}</button>;
              }

              var cstFilters = { trend:cstTrend, momentum:cstMomentum, reversal:cstReversal, smartMoney:cstSmartMoney, setup:cstSetup,
                weeklyMom:cstWeeklyMom, momProfile:cstMomProfile, monthlyRegime:cstMonthlyRegime, overallResult:cstOverallResult,
                driverFilters:{ trendDrivers:cstTrendDrv, momentumDrivers:cstMomDrv, reversalDrivers:cstRevDrv, smartMoneyDrivers:cstSmfDrv } };
              var matchRows = results ? results.rows.filter(function(row){
                return filterCustomSignalRows([row], { trend:cstFilters.trend, momentum:cstFilters.momentum, reversal:cstFilters.reversal, smartMoney:cstFilters.smartMoney, setup:cstFilters.setup, driverFilters:cstFilters.driverFilters }).length > 0
                  && matchesSelected(row.momentumProfile ? row.momentumProfile.weekly : 'Not Enough Data', cstFilters.weeklyMom)
                  && matchesSelected(row.momentumProfile ? row.momentumProfile.profile : 'Not Enough Data', cstFilters.momProfile)
                  && matchesSelected(row.momentumProfile ? row.momentumProfile.monthlyRegime : 'Not Enough Data', cstFilters.monthlyRegime)
                  && matchesSelected(row.momentumProfile ? (row.momentumProfile.overallResult||'Low Confidence') : 'Low Confidence', cstFilters.overallResult);
              }) : [];

              // Sub-signal chip → driver key mappings
              var SS_RSI  = {'RSI below 30':'rsiBelow30','RSI 30 to 40':'rsi30To40','RSI 40 to 50':'rsi40To50','RSI 50 to 60':'rsi50To60','RSI 60 to 70':'rsi60To70','RSI above 70':'rsiAbove70','RSI rising':'rsiRising','RSI falling':'rsiFalling','RSI between 45 and 65':'rsiBetween45And65'};
              var SS_MACD = {'MACD above signal':'macdAboveSignal','MACD below signal':'macdBelowSignal','MACD histogram positive':'macdHistogramPositive','MACD histogram negative':'macdHistogramNegative','MACD improving':'macdImproving','MACD deteriorating':'macdDeteriorating'};
              var SS_52W  = {'52W range 0 to 25%':'price52wRange0To25','52W range 25 to 50%':'price52wRange25To50','52W range 50 to 75%':'price52wRange50To75','52W range 75 to 90%':'price52wRange75To90','52W range 90 to 100%':'price52wRange90To100','Below 52W midpoint':'priceBelow52wMidpoint','Above 52W midpoint':'priceAbove52wMidpoint','Near 52W high':'priceNear52wHigh','Far below 52W high':'priceFarBelow52wHigh'};
              var SS_MA   = {'Price above SMA50':'priceAboveSma50','Price below SMA50':'priceBelowSma50','Price above SMA200':'priceAboveSma200','Price below SMA200':'priceBelowSma200','Price above EMA20':'priceAboveEma20','Price below EMA20':'priceBelowEma20','SMA50 above SMA200':'sma50AboveSma200','Price reclaimed SMA50':'priceReclaimedSma50','Price lost SMA50':'priceLostSma50'};

              // Apply sub-signal filters (OR within group, AND across groups)
              function applySubFilter(rows, chips, map) {
                if (!chips.length) return rows;
                return rows.filter(function(r){ var d=r.drivers||{}; return chips.some(function(lbl){ return d[map[lbl]]===true; }); });
              }
              if (cstRsiFilter.length||cstMacdFilter.length||cst52wFilter.length||cstMaFilter.length) {
                matchRows = applySubFilter(matchRows, cstRsiFilter,  SS_RSI);
                matchRows = applySubFilter(matchRows, cstMacdFilter, SS_MACD);
                matchRows = applySubFilter(matchRows, cst52wFilter,  SS_52W);
                matchRows = applySubFilter(matchRows, cstMaFilter,   SS_MA);
              }
              var cstStat   = summarizeCustomSignalRows(matchRows);
              var cstQual   = customSignalQuality(cstStat);
              var cstCond   = buildCustomConditionText(cstTrend,cstMomentum,cstReversal,cstSmartMoney,cstSetup,cstTrendDrv,cstMomDrv,cstRevDrv,cstSmfDrv);
              var showTop50 = matchRows.slice(-50).reverse();

              function qualColor(q) {
                if (q==='Strong')    return '#7abd00';
                if (q==='Promising') return '#6090d0';
                if (q==='Weak')      return '#e05050';
                if (q==='Mixed')     return '#EF9F27';
                return '#555';
              }
              function resetCST() {
                setCstTrend([]); setCstMomentum([]); setCstReversal([]); setCstSmartMoney([]); setCstSetup([]);
                setCstTrendDrv([]); setCstMomDrv([]); setCstRevDrv([]); setCstSmfDrv([]);
                setCstRsiFilter([]); setCstMacdFilter([]); setCst52wFilter([]); setCstMaFilter([]);
                setCstWeeklyMom([]); setCstMomProfile([]); setCstMonthlyRegime([]); setCstOverallResult([]);
              }

              return (
                <div style={card}>
                  <div style={{ fontSize:10, color:'#555', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.07em', marginBottom:8 }}>{'Custom Signal Tester'}</div>
                  <div style={{ fontSize:11, color:'#555', lineHeight:1.6, marginBottom:14 }}>
                    {'Select signal conditions below to see how those combinations performed historically. Within each filter is OR logic; across filters is AND logic.'}
                  </div>

                  {!results ? (
                    <div style={{ color:'#555', fontSize:12, padding:'20px 0' }}>{'Run a backtest first, then use Custom Signal Tester to test your own signal combinations.'}</div>
                  ) : (
                    <div>
                      {/* Main Filters */}
                      {[
                        ['Trend',       cstTrend,      setCstTrend,      CST_TREND_OPTS, null],
                        ['Momentum',    cstMomentum,   setCstMomentum,   CST_MOM_OPTS,   null],
                        ['Reversal',    cstReversal,   setCstReversal,   CST_REV_OPTS,   null],
                        ['Smart Money', cstSmartMoney, setCstSmartMoney, CST_SMF_OPTS,   null],
                        ['Setup',       cstSetup,      setCstSetup,      CST_SETUP_OPTS, function(v){ return summaryCardDark(v).text; }],
                        ['Weekly Mom',  cstWeeklyMom,  setCstWeeklyMom,  ['Strong','Building','Neutral','Fading','Weak','Not Enough Data'], null],
                        ['Mom Profile',  cstMomProfile, setCstMomProfile, ['Momentum Continuation','Early Recovery Attempt','Weak Weekly Bounce','Waiting for Daily Trigger','Pullback in Larger Momentum','Bearish Momentum','No Clear Momentum Profile','Not Enough Data'], null],
                        ['Monthly Regime',cstMonthlyRegime,setCstMonthlyRegime,['Supportive','Neutral','Weak','Not Enough Data'], null],
                        ['Overall Result',cstOverallResult,setCstOverallResult,['Favourable','Watch','Mixed','Unfavourable','Low Confidence'], null],
                      ].map(function(row){
                        return (
                          <div key={row[0]} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                            <span style={{ fontSize:9, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.06em', minWidth:74, paddingTop:3, flexShrink:0 }}>{row[0]}</span>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                              {row[3].map(function(v){ return pillSel(v, row[1], row[2], row[4]); })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Driver Filters collapsible */}
                      <div style={{ borderTop:'0.5px solid #2a2a28', marginTop:8, paddingTop:8 }}>
                        <button onClick={function(){ setCstDrvOpen(!cstDrvOpen); }}
                          style={{ background:'none', border:'none', color:'#888', fontSize:11, cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:10, color:cstDrvOpen?LIME:'#555', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>{'Driver Filters'}</span>
                          <span style={{ fontSize:12, color:'#555' }}>{cstDrvOpen?'▲':'▼'}</span>
                          {(cstTrendDrv.length+cstMomDrv.length+cstRevDrv.length+cstSmfDrv.length)>0 && <span style={{ fontSize:8, color:LIME, background:'#1a2a0a', border:'0.5px solid '+LIME, borderRadius:8, padding:'1px 5px' }}>{cstTrendDrv.length+cstMomDrv.length+cstRevDrv.length+cstSmfDrv.length}</span>}
                        </button>
                        {cstDrvOpen && (
                          <div style={{ marginTop:10 }}>
                            <div style={{ fontSize:9, color:'#555', marginBottom:10, lineHeight:1.6 }}>
                              {'Within each driver group: OR logic. Across driver groups: AND logic. Empty group = ignored.'}
                            </div>
                            {[
                              ['Trend Driver',       cstTrendDrv, setCstTrendDrv, CST_TREND_DRVS],
                              ['Momentum Driver',    cstMomDrv,   setCstMomDrv,   CST_MOM_DRVS],
                              ['Reversal Driver',    cstRevDrv,   setCstRevDrv,   CST_REV_DRVS],
                              ['Smart Money Driver', cstSmfDrv,   setCstSmfDrv,   CST_SMF_DRVS],
                            ].map(function(grp){
                              return (
                                <div key={grp[0]} style={{ marginBottom:12 }}>
                                  <div style={{ fontSize:9, fontWeight:700, color:grp[1].length?'#9acd50':'#444', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{grp[0]}</div>
                                  <div style={{ display:'flex', flexWrap:'wrap' }}>
                                    {grp[3].map(function(d){ return drvChk(d[0], d[1], grp[1], grp[2]); })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Sub-Signal Filters */}
                      <div style={{ borderTop:'0.5px solid #2a2a28', marginTop:8, paddingTop:8 }}>
                        <button onClick={function(){ setCstSubSigOpen(!cstSubSigOpen); }}
                          style={{ background:'none', border:'none', fontSize:11, cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:10, color:cstSubSigOpen?LIME:'#555', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>{'Sub-Signal Filters'}</span>
                          <span style={{ fontSize:12, color:'#555' }}>{cstSubSigOpen?'▲':'▼'}</span>
                          {(cstRsiFilter.length+cstMacdFilter.length+cst52wFilter.length+cstMaFilter.length)>0 &&
                            <span style={{ fontSize:8, color:LIME, background:'#1a2a0a', border:'0.5px solid '+LIME, borderRadius:8, padding:'1px 5px' }}>
                              {cstRsiFilter.length+cstMacdFilter.length+cst52wFilter.length+cstMaFilter.length}
                            </span>}
                        </button>
                        {cstSubSigOpen && (function(){
                          function ssPill(v, arr, setter) {
                            var sel = arr.indexOf(v)!==-1;
                            return <button key={v} onClick={function(){ toggle(arr,setter,v); }}
                              style={{ fontSize:9, padding:'3px 8px', borderRadius:8, cursor:'pointer', fontWeight:sel?700:400, outline:'none',
                                background:sel?'#0f2010':'#111', color:sel?'#9acd50':'#666',
                                border:'0.5px solid '+(sel?'#9acd50':'#2a2a28'), marginRight:4, marginBottom:4 }}>{v}</button>;
                          }
                          var SS_GROUPS = [
                            ['RSI',              cstRsiFilter,  setCstRsiFilter,  ['RSI below 30','RSI 30 to 40','RSI 40 to 50','RSI 50 to 60','RSI 60 to 70','RSI above 70','RSI rising','RSI falling','RSI between 45 and 65']],
                            ['MACD',             cstMacdFilter, setCstMacdFilter, ['MACD above signal','MACD below signal','MACD histogram positive','MACD histogram negative','MACD improving','MACD deteriorating']],
                            ['52-Week Range',    cst52wFilter,  setCst52wFilter,  ['52W range 0 to 25%','52W range 25 to 50%','52W range 50 to 75%','52W range 75 to 90%','52W range 90 to 100%','Below 52W midpoint','Above 52W midpoint','Near 52W high','Far below 52W high']],
                            ['Price / Moving Avg',cstMaFilter,  setCstMaFilter,   ['Price above SMA50','Price below SMA50','Price above SMA200','Price below SMA200','Price above EMA20','Price below EMA20','SMA50 above SMA200','Price reclaimed SMA50','Price lost SMA50']],
                          ];
                          return (
                            <div style={{ marginTop:10 }}>
                              <div style={{ fontSize:9, color:'#555', marginBottom:10, lineHeight:1.6 }}>{'Within each group: OR logic. Across groups: AND logic. Empty group = ignored.'}</div>
                              {SS_GROUPS.map(function(grp){
                                return (
                                  <div key={grp[0]} style={{ marginBottom:10 }}>
                                    <div style={{ fontSize:9, fontWeight:700, color:grp[1].length?'#9acd50':'#444', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{grp[0]}</div>
                                    <div style={{ display:'flex', flexWrap:'wrap' }}>
                                      {grp[3].map(function(v){ return ssPill(v, grp[1], grp[2]); })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                      <div style={{ borderTop:'0.5px solid #2a2a28', marginTop:14, paddingTop:14 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:8, marginBottom:14 }}>
                          {[
                            ['Matching',  cstStat.signals,                                       '#f0ede6'],
                            ['Wins',      cstStat.wins,                                          '#7abd00'],
                            ['Losses',    cstStat.losses,                                        '#e05050'],
                            ['Win Rate',  cstStat.winRate!=null?cstStat.winRate.toFixed(1)+'%':'—', cstStat.winRate!=null?(cstStat.winRate>=60?'#7abd00':cstStat.winRate>=45?'#EF9F27':'#e05050'):'#555'],
                            ['Avg Return',simFmtPct(cstStat.avgReturn),                          cstStat.avgReturn!=null?(cstStat.avgReturn>=0?'#7abd00':'#e05050'):'#555'],
                            ['Median',    simFmtPct(cstStat.medianReturn),                       cstStat.medianReturn!=null?(cstStat.medianReturn>=0?'#7abd00':'#e05050'):'#555'],
                            ['Best',      simFmtPct(cstStat.bestReturn),                         '#7abd00'],
                            ['Worst',     simFmtPct(cstStat.worstReturn),                        '#e05050'],
                            ['Quality',   cstQual,                                               qualColor(cstQual)],
                          ].map(function(f){ return (
                            <div key={f[0]} style={{ background:'#0e0e0c', borderRadius:7, padding:'8px 10px', textAlign:'center' }}>
                              <div style={{ fontSize:8, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{f[0]}</div>
                              <div style={{ fontSize:12, fontWeight:800, color:f[2] }}>{f[1]}</div>
                            </div>
                          ); })}
                        </div>

                        {/* Overall Momentum Result panel */}
                        {matchRows.length > 0 && (function(){
                          var resMap = {};
                          matchRows.forEach(function(r) {
                            var mp = r.momentumProfile;
                            var k = (mp&&mp.overallResult)||'Low Confidence';
                            var src = (mp&&mp.overallResultSource)||'—';
                            var key = k+'|'+src;
                            if (!resMap[key]) resMap[key] = { result:k, source:src, count:0, wr:mp&&mp.overallResultWinRate, med:mp&&mp.overallResultMedian, sigs:mp&&mp.overallResultSignals };
                            resMap[key].count++;
                          });
                          var items = Object.values(resMap).sort(function(a,b){ return b.count-a.count; });
                          function resColor(r){ return r==='Favourable'?'#7abd00':r==='Watch'?'#6090d0':r==='Mixed'?'#EF9F27':r==='Unfavourable'?'#e05050':'#555'; }
                          return <div style={{ background:'#0c0c0a', borderRadius:6, padding:'10px 12px', marginBottom:12 }}>
                            <div style={{ fontSize:9, color:'#555', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:8 }}>Overall Momentum Result</div>
                            {items.map(function(g,i){
                              return <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                                <span style={{ fontSize:10, fontWeight:800, color:resColor(g.result), minWidth:90 }}>{g.result}</span>
                                <span style={{ fontSize:9, color:'#7ab8d0' }}>{g.source}</span>
                                <span style={{ fontSize:9, color:'#555' }}>{'('+g.count+' rows)'}</span>
                                {g.sigs!=null&&<span style={{ fontSize:9, color:'#666' }}>{'| '+g.sigs+' hist. signals'}</span>}
                                {g.wr!=null&&<span style={{ fontSize:9, color:(g.wr||0)>=60?'#7abd00':'#EF9F27' }}>{g.wr.toFixed(1)+'% WR'}</span>}
                                {g.med!=null&&<span style={{ fontSize:9, color:(g.med||0)>=0?'#7abd00':'#e05050' }}>{(g.med>=0?'+':'')+g.med.toFixed(2)+'% med'}</span>}
                              </div>;
                            })}
                          </div>;
                        })()}
                        {/* Selected Condition */}
                        <div style={{ background:'#0e0e0c', borderRadius:7, padding:'10px 12px', marginBottom:12 }}>
                          <div style={{ fontSize:9, color:'#555', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6, fontWeight:700 }}>{'Selected Condition'}</div>
                          <pre style={{ fontSize:10, color:'#888', lineHeight:1.8, whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0, fontFamily:'monospace' }}>{cstCond}</pre>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                          <button onClick={resetCST}
                            style={{ fontSize:10, padding:'5px 12px', background:'none', border:'0.5px solid #444', borderRadius:5, color:'#888', cursor:'pointer' }}>Reset Filters</button>
                          <button onClick={function(){
                            var txt = cstCond;
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              navigator.clipboard.writeText(txt);
                            } else {
                              var el = document.createElement('textarea'); el.value = txt;
                              document.body.appendChild(el); el.select(); document.execCommand('copy');
                              document.body.removeChild(el);
                            }
                          }} style={{ fontSize:10, padding:'5px 12px', background:'none', border:'0.5px solid #444', borderRadius:5, color:'#888', cursor:'pointer' }}>Copy Condition</button>
                          <button onClick={function(){
                            if (!matchRows.length) return;
                            exportRowsToCsv(ticker+'-custom-signal-matches-'+results.hp+'D.csv', matchRows, [
                              { label:'Date',            key:'date' },
                              { label:'Close',           value:function(r){ return '$'+r.close.toFixed(2); } },
                              { label:'Setup',           key:'setup' },
                              { label:'Trend',           key:'trend' },
                              { label:'Momentum',        key:'momentum' },
                              { label:'Weekly Momentum', value:function(r){ return r.momentumProfile?r.momentumProfile.weekly:''; } },
                              { label:'Mom Profile',     value:function(r){ return r.momentumProfile?r.momentumProfile.profile:''; } },
                              { label:'Monthly Regime',  value:function(r){ return r.momentumProfile?r.momentumProfile.monthlyRegime:''; } },
                              { label:'Overall Result',  value:function(r){ return r.momentumProfile?r.momentumProfile.overallResult||'':''; } },
                              { label:'Result Source',   value:function(r){ return r.momentumProfile?r.momentumProfile.overallResultSource||'':''; } },
                              { label:'Result Signals',  value:function(r){ return r.momentumProfile&&r.momentumProfile.overallResultSignals!=null?r.momentumProfile.overallResultSignals:''; } },
                              { label:'Result WR %',     value:function(r){ return r.momentumProfile&&r.momentumProfile.overallResultWinRate!=null?r.momentumProfile.overallResultWinRate.toFixed(1):''; } },
                              { label:'Result Median %', value:function(r){ return r.momentumProfile&&r.momentumProfile.overallResultMedian!=null?r.momentumProfile.overallResultMedian.toFixed(2):''; } },
                      { label:'Weekly Momentum', value:function(r){ return r.momentumProfile?r.momentumProfile.weekly:''; } },
                      { label:'Mom Profile',     value:function(r){ return r.momentumProfile?r.momentumProfile.profile:''; } },
                      { label:'Monthly Regime',  value:function(r){ return r.momentumProfile?r.momentumProfile.monthlyRegime:''; } },
                      { label:'Overall Result',  value:function(r){ return r.momentumProfile?r.momentumProfile.overallResult||'':''; } },
                      { label:'Result Source',   value:function(r){ return r.momentumProfile?r.momentumProfile.overallResultSource||'':''; } },
                      { label:'Result Signals',  value:function(r){ return r.momentumProfile&&r.momentumProfile.overallResultSignals!=null?r.momentumProfile.overallResultSignals:''; } },
                      { label:'Result WR %',     value:function(r){ return r.momentumProfile&&r.momentumProfile.overallResultWinRate!=null?r.momentumProfile.overallResultWinRate.toFixed(1):''; } },
                      { label:'Result Median %', value:function(r){ return r.momentumProfile&&r.momentumProfile.overallResultMedian!=null?r.momentumProfile.overallResultMedian.toFixed(2):''; } },
                      { label:'Result Avg %',    value:function(r){ return r.momentumProfile&&r.momentumProfile.overallResultAvg!=null?r.momentumProfile.overallResultAvg.toFixed(2):''; } },
                      { label:'Result Best %',   value:function(r){ return r.momentumProfile&&r.momentumProfile.overallResultBest!=null?r.momentumProfile.overallResultBest.toFixed(2):''; } },
                      { label:'Result Worst %',  value:function(r){ return r.momentumProfile&&r.momentumProfile.overallResultWorst!=null?r.momentumProfile.overallResultWorst.toFixed(2):''; } },
                              { label:'Reversal',        key:'reversal' },
                              { label:'Smart Money',     key:'smartMoney' },
                              { label:'RSI',             value:function(r){ return r.driverValues&&r.driverValues.rsi14!=null?r.driverValues.rsi14.toFixed(1):''; } },
                              { label:'MACD Hist',       value:function(r){ return r.driverValues&&r.driverValues.macdHistogram!=null?r.driverValues.macdHistogram.toFixed(3):''; } },
                              { label:'MACD State',      value:function(r){ var dv=r.driverValues; if(!dv) return ''; return (dv.macdAboveSig?'Above Sig':'Below Sig')+(dv.macdImproving!=null?(dv.macdImproving?' Improving':' Deteriorating'):''); } },
                              { label:'52W %',           value:function(r){ return r.driverValues&&r.driverValues.pos52w!=null?r.driverValues.pos52w.toFixed(1)+'%':''; } },
                              { label:'52W Bucket',      value:function(r){ return r.driverValues&&r.driverValues.bucket52w||''; } },
                              { label:'Future Return %', value:function(r){ return r.futureReturn!=null?r.futureReturn.toFixed(2):''; } },
                              { label:'Result',          key:'result' },
                            ]);
                          }} style={{ fontSize:10, padding:'5px 12px', background:'none', border:'0.5px solid #444', borderRadius:5, color:'#888', cursor:'pointer',
                            opacity: matchRows.length ? 1 : 0.4 }}>Export CSV</button>
                        </div>

                        {/* Matching Historical Signals */}
                        <div style={{ fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
                          {'Matching Historical Signals (' + matchRows.length + ' rows' + (matchRows.length>50?', showing latest 50':'')+')'}
                        </div>
                        {matchRows.length === 0
                          ? <div style={{ color:'#555', fontSize:11, padding:'16px 0', textAlign:'center' }}>{'No rows match the selected conditions.'}</div>
                          : <div style={{ overflowX:'auto', maxHeight:400, overflowY:'auto' }}>
                              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                                <thead style={{ position:'sticky', top:0, zIndex:1 }}>
                                  <tr style={{ borderBottom:'1px solid #2a2a28' }}>
                                    {['Date','Close','Setup','Trend','Daily Mom','Weekly Mom','Mom Profile','Monthly Regime','Overall Result','Src','R.Sigs','R.WR','R.Med','Reversal','Smart Money','RSI','MACD Hist','52W%','W.RSI','W.Hist','W.ROC','M.RSI','M.Hist','M.ROC','Return','Result'].map(function(h){
                                      return <th key={h} style={{ padding:'4px 7px', fontSize:9, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'left', background:'#1a1a18', whiteSpace:'nowrap' }}>{h}</th>;
                                    })}
                                  </tr>
                                </thead>
                                <tbody>
                                  {showTop50.map(function(r, i){
                                    var sc  = summaryCardDark(r.setup);
                                    var ret = r.futureReturn;
                                    var retC = ret==null?'#555':ret>=5?'#7abd00':ret>=0?'#5a9a40':ret>-5?'#e08050':'#e05050';
                                    return (
                                      <tr key={r.date+i} style={{ background:i%2===0?'#181816':'#141412' }}>
                                        <td style={{ padding:'4px 7px', color:'#888', whiteSpace:'nowrap' }}>{r.date}</td>
                                        <td style={{ padding:'4px 7px', color:'#f0ede6', fontWeight:600 }}>{'$'+r.close.toFixed(2)}</td>
                                        <td style={{ padding:'4px 7px', fontWeight:700, color:sc.text, whiteSpace:'nowrap' }} title={r.fullSetup}>{r.setup}</td>
                                        <td style={{ padding:'4px 7px', color:'#888', fontSize:9 }}>{r.trend}</td>
                                        <td style={{ padding:'4px 7px', color:'#888', fontSize:9 }}>{r.momentum}</td>
                                        <td style={{ padding:'4px 7px', color: r.momentumProfile&&r.momentumProfile.weekly==='Strong'?'#7abd00':r.momentumProfile&&r.momentumProfile.weekly==='Building'?'#9acd50':r.momentumProfile&&r.momentumProfile.weekly==='Fading'?'#e08050':r.momentumProfile&&r.momentumProfile.weekly==='Weak'?'#e05050':'#666', fontSize:9, whiteSpace:'nowrap' }}>{r.momentumProfile?r.momentumProfile.weekly:'—'}</td>
                                        <td style={{ padding:'4px 7px', color:'#d0a060', fontSize:8, maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.momentumProfile?r.momentumProfile.profile:''}>{r.momentumProfile?r.momentumProfile.profile:'—'}</td>
                                        <td style={{ padding:'4px 7px', color:'#c890d0', fontSize:8, whiteSpace:'nowrap' }}>{r.momentumProfile?r.momentumProfile.monthlyRegime:'—'}</td>
                                        <td style={{ padding:'4px 7px', fontSize:8, fontWeight:700, whiteSpace:'nowrap', color: r.momentumProfile&&r.momentumProfile.overallResult==='Favourable'?'#7abd00':r.momentumProfile&&r.momentumProfile.overallResult==='Watch'?'#6090d0':r.momentumProfile&&r.momentumProfile.overallResult==='Mixed'?'#EF9F27':r.momentumProfile&&r.momentumProfile.overallResult==='Unfavourable'?'#e05050':'#555' }}>{r.momentumProfile&&r.momentumProfile.overallResult||'—'}</td>
                                        <td style={{ padding:'4px 7px', color:'#7ab8d0', fontSize:8, maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.momentumProfile&&r.momentumProfile.overallResultSource||''}>{r.momentumProfile&&r.momentumProfile.overallResultSource||'—'}</td>
                                        <td style={{ padding:'4px 7px', color:'#666', fontSize:8 }}>{r.momentumProfile&&r.momentumProfile.overallResultSignals!=null?r.momentumProfile.overallResultSignals:'—'}</td>
                                        <td style={{ padding:'4px 7px', fontSize:8, color:r.momentumProfile&&r.momentumProfile.overallResultWinRate!=null?(r.momentumProfile.overallResultWinRate>=60?'#7abd00':r.momentumProfile.overallResultWinRate>=45?'#EF9F27':'#e05050'):'#555' }}>{r.momentumProfile&&r.momentumProfile.overallResultWinRate!=null?r.momentumProfile.overallResultWinRate.toFixed(1)+'%':'—'}</td>
                                        <td style={{ padding:'4px 7px', fontSize:8, color:r.momentumProfile&&r.momentumProfile.overallResultMedian!=null?(r.momentumProfile.overallResultMedian>=0?'#7abd00':'#e05050'):'#555' }}>{r.momentumProfile&&r.momentumProfile.overallResultMedian!=null?simFmtPct(r.momentumProfile.overallResultMedian):'—'}</td>
                                        <td style={{ padding:'4px 7px', color:'#888', fontSize:9, maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.reversal}>{r.reversal}</td>
                                        <td style={{ padding:'4px 7px', color:'#888', fontSize:9, maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.smartMoney}>{r.smartMoney}</td>
                                        <td style={{ padding:'4px 7px', color: r.driverValues&&r.driverValues.rsi14!=null?(r.driverValues.rsi14>70?'#e05050':r.driverValues.rsi14<30?'#7abd00':'#aaa'):'#555', fontSize:9, whiteSpace:'nowrap' }}>{r.driverValues&&r.driverValues.rsi14!=null?r.driverValues.rsi14.toFixed(1):'—'}</td>
                                        <td style={{ padding:'4px 7px', color: r.driverValues&&r.driverValues.macdHistogram!=null?(r.driverValues.macdHistogram>0?'#7abd00':'#e05050'):'#555', fontSize:9, whiteSpace:'nowrap' }}>{r.driverValues&&r.driverValues.macdHistogram!=null?r.driverValues.macdHistogram.toFixed(3):'—'}</td>
                                        <td style={{ padding:'4px 7px', fontSize:9, whiteSpace:'nowrap' }}>
                                          {r.driverValues ? (
                                            <span style={{ color: r.driverValues.macdAboveSig?'#7abd00':'#e05050' }}>
                                              {(r.driverValues.macdAboveSig?'↑Sig':'↓Sig')+(r.driverValues.macdImproving!=null?(r.driverValues.macdImproving?' ↑':' ↓'):'  ')}
                                            </span>
                                          ) : '—'}
                                        </td>
                                        <td style={{ padding:'4px 7px', color:'#aaa', fontSize:9 }}>{r.driverValues&&r.driverValues.pos52w!=null?r.driverValues.pos52w.toFixed(1)+'%':'—'}</td>
                                        <td style={{ padding:'4px 7px', color:'#666', fontSize:9, whiteSpace:'nowrap' }}>{r.driverValues&&r.driverValues.bucket52w||'—'}</td>
                                        <td style={{ padding:'4px 7px', color:'#888', fontSize:9 }}>{r.momentumDrivers&&r.momentumDrivers.weeklyRsi14!=null?r.momentumDrivers.weeklyRsi14.toFixed(1):'—'}</td>
                                        <td style={{ padding:'4px 7px', color: r.momentumDrivers&&r.momentumDrivers.weeklyMacdHistogram!=null?(r.momentumDrivers.weeklyMacdHistogram>0?'#7abd00':'#e05050'):'#555', fontSize:9 }}>{r.momentumDrivers&&r.momentumDrivers.weeklyMacdHistogram!=null?r.momentumDrivers.weeklyMacdHistogram.toFixed(3):'—'}</td>
                                        <td style={{ padding:'4px 7px', color: r.momentumDrivers&&r.momentumDrivers.weeklyRoc4wPct!=null?(r.momentumDrivers.weeklyRoc4wPct>=0?'#7abd00':'#e05050'):'#555', fontSize:9 }}>{r.momentumDrivers&&r.momentumDrivers.weeklyRoc4wPct!=null?r.momentumDrivers.weeklyRoc4wPct.toFixed(1)+'%':'—'}</td>
                                        <td style={{ padding:'4px 7px', color:'#888', fontSize:9 }}>{r.momentumDrivers&&r.momentumDrivers.monthlyRsi14!=null?r.momentumDrivers.monthlyRsi14.toFixed(1):'—'}</td>
                                        <td style={{ padding:'4px 7px', color: r.momentumDrivers&&r.momentumDrivers.monthlyMacdHistogram!=null?(r.momentumDrivers.monthlyMacdHistogram>0?'#7abd00':'#e05050'):'#555', fontSize:9 }}>{r.momentumDrivers&&r.momentumDrivers.monthlyMacdHistogram!=null?r.momentumDrivers.monthlyMacdHistogram.toFixed(3):'—'}</td>
                                        <td style={{ padding:'4px 7px', color: r.momentumDrivers&&r.momentumDrivers.monthlyRoc3mPct!=null?(r.momentumDrivers.monthlyRoc3mPct>=0?'#7abd00':'#e05050'):'#555', fontSize:9 }}>{r.momentumDrivers&&r.momentumDrivers.monthlyRoc3mPct!=null?r.momentumDrivers.monthlyRoc3mPct.toFixed(1)+'%':'—'}</td>
                                        <td style={{ padding:'4px 7px', fontWeight:700, color:retC, whiteSpace:'nowrap' }}>{simFmtPct(ret)}</td>
                                        <td style={{ padding:'4px 7px' }}>
                                          <span style={{ fontSize:8, fontWeight:700, color:r.result==='Win'?'#7abd00':r.result==='Loss'?'#e05050':'#555',
                                            background:r.result==='Win'?'#0d200d':r.result==='Loss'?'#200808':'#111', padding:'1px 5px', borderRadius:3 }}>{r.result}</span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                        }
                        <div style={{ fontSize:9, color:'#333', marginTop:10 }}>{'Custom Signal Tester is for historical research only. It does not guarantee future performance and is not financial advice.'}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Historical signal table */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ fontSize:10, color:'#555', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.07em' }}>{'Historical Signals ('+results.rows.length+' rows)'}</div>
                {results.rows.length > 0
                  ? <button onClick={function(){
                      exportRowsToCsv(ticker+'-historical-signals-'+results.hp+'D.csv', results.rows, [
                        { label:'Date',             key:'date' },
                        { label:'Close',            value:function(r){ return '$'+r.close.toFixed(2); } },
                        { label:'Setup',            key:'setup' },
                        { label:'Full Setup',       key:'fullSetup' },
                        { label:'Trend',            key:'trend' },
                        { label:'Momentum',         key:'momentum' },
                        { label:'Reversal',         key:'reversal' },
                        { label:'Smart Money',      key:'smartMoney' },
                        { label:'Future Return %',  value:function(r){ return r.futureReturn!=null?r.futureReturn.toFixed(2):''; } },
                        { label:'Result',           key:'result' },
                      ]);
                    }} style={{ fontSize:10, padding:'3px 10px', background:'none', border:'0.5px solid #333', borderRadius:5, color:'#888', cursor:'pointer' }}>Export CSV</button>
                  : <button disabled style={{ fontSize:10, padding:'3px 10px', background:'none', border:'0.5px solid #2a2a28', borderRadius:5, color:'#444', cursor:'default' }}>No rows to export</button>}
              </div>
              <div style={{ overflowX:'auto', maxHeight:480, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                  <thead style={{ position:'sticky', top:0, zIndex:1 }}>
                    <tr style={{ borderBottom:'1px solid #2a2a28' }}>
                      {['Date','Close','Setup','Trend','Momentum','Reversal','Smart Money','Return','Result'].map(function(h){
                        return <th key={h} style={{ padding:'5px 8px', fontSize:9, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'left', background:'#1a1a18', whiteSpace:'nowrap' }}>{h}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.map(function(r, i){
                      var sc  = summaryCardDark(r.setup);
                      var ret = r.futureReturn;
                      var retCol = ret==null?'#555':ret>=5?'#7abd00':ret>=0?'#5a9a40':ret>-5?'#e08050':'#e05050';
                      return (
                        <tr key={r.date+i} style={{ background:i%2===0?'#181816':'#141412' }}>
                          <td style={{ padding:'4px 8px', color:'#888', whiteSpace:'nowrap' }}>{r.date}</td>
                          <td style={{ padding:'4px 8px', color:'#f0ede6', fontWeight:600 }}>{'$'+r.close.toFixed(2)}</td>
                          <td style={{ padding:'4px 8px', fontWeight:700, color:sc.text, whiteSpace:'nowrap' }} title={r.fullSetup}>{r.setup}</td>
                          <td style={{ padding:'4px 8px', color:'#888', fontSize:9, whiteSpace:'nowrap' }}>{r.trend}</td>
                          <td style={{ padding:'4px 8px', color:'#888', fontSize:9 }}>{r.momentum}</td>
                          <td style={{ padding:'4px 8px', color:'#888', fontSize:9, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.reversal}</td>
                          <td style={{ padding:'4px 8px', color:'#888', fontSize:9, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.smartMoney}</td>
                          <td style={{ padding:'4px 8px', fontWeight:700, color:retCol, whiteSpace:'nowrap' }}>{simFmtPct(ret)}</td>
                          <td style={{ padding:'4px 8px' }}>
                            <span style={{ fontSize:9, fontWeight:700, color:r.result==='Win'?'#7abd00':r.result==='Loss'?'#e05050':'#555',
                              background:r.result==='Win'?'#0d200d':r.result==='Loss'?'#200808':'#111',
                              padding:'2px 6px', borderRadius:4 }}>{r.result}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ fontSize:10, color:'#444', lineHeight:1.7, padding:'0 4px' }}>
              Backtest uses historical Yahoo daily price data and NervousGeek rule-based technical logic. Results are for research only and are not financial advice. Historical performance does not guarantee future results.
              <br />Signals are calculated using only data available up to each historical date to reduce look-ahead bias.
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Detail({ sym, name, onBack, clerkUser, supported, isPaid, isCancelling, periodEnd }) {
  var isAdmin = !!(clerkUser && clerkUser.publicMetadata && clerkUser.publicMetadata.role === "admin");
  var showCancelBanner = isCancelling || window.__isCancelling;
  var cancelEnd = periodEnd || window.__periodEnd;
  window.__clerkUser = clerkUser || null;
  // Unsupported ticker -- show friendly message
  if (supported === false) {
    return (
      <div style={{ minHeight:"100vh", background:"#0e0e0c", fontFamily:FONT, display:"flex", flexDirection:"column" }}>
        <nav style={{ height:52, padding:"0 24px", display:"flex", alignItems:"center", gap:12, background:LIME }}>
          <button onClick={onBack} style={{ background:"none", border:"0.5px solid #2c2c2e", cursor:"pointer", color:"#0e0e0c", fontWeight:800, fontSize:13, fontFamily:FONT }}>
            {"< Back"}
          </button>
          <span style={{ fontWeight:800, fontSize:15, color:"#0e0e0c" }}>nervousgeek.com</span>
        </nav>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
          <div style={{ maxWidth:480, width:"100%", background:"#1c1c1e", border:"1px solid #2c2c26", borderRadius:20, padding:"48px 40px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:800, color:"#f0ede6", marginBottom:12 }}>{sym}</div>
            <div style={{ fontSize:14, color:"#a09a8a", lineHeight:1.7, marginBottom:32 }}>
              {sym + " is not in the S&P 500 index."}
              <br />
              {"nervousgeek.com covers all S&P 500 companies. Try a different ticker."}
            </div>
            <button onClick={onBack} style={{ width:"100%", padding:"14px", borderRadius:50, border:"0.5px solid #2c2c2e", background:LIME, color:"#0e0e0c", fontWeight:800, fontSize:14, fontFamily:FONT, cursor:"pointer" }}>
              Back to search
            </button>
          </div>
        </div>
      </div>
    );
  }
  const [__err, set__err] = useState(null);

  const [navInput,  setNavInput]  = useState("");
  const [showCalc, setShowCalc] = useState(false);
  const [navFocus,  setNavFocus]  = useState(false);
  const [q,        setQ]        = useState(null);
  const [ov,       setOv]       = useState(null);
  const [epsHistory, setEpsHistory] = useState(null);
  const [epsError,   setEpsError]   = useState(false);
  const [msg, setMsg] = useState("Loading...");
  const [insightTab,    setInsightTab]    = useState("business");
  const [momConfResult, setMomConfResult] = useState(null);   // Run 6M
  const [momConfLoading,setMomConfLoading]= useState(false);
  const [momConfError,  setMomConfError]  = useState(null);
  const [momConfSym,    setMomConfSym]    = useState(null);
  // Run 6N: live current momentum profile (auto-computed on tab open)
  const [momLiveProfile, setMomLiveProfile] = useState(null);
  const [momLiveLoading, setMomLiveLoading] = useState(false);
  const [momLiveSym,     setMomLiveSym]     = useState(null);
  const [momYahooBars,   setMomYahooBars]   = useState(null); // cached bars shared between live + confidence
  const [insightCache,  setInsightCache]  = useState({});
  const [insightLoading,setInsightLoading]= useState(false);
  const [parsedInsights,setParsedInsights]= useState({});
  const [addlInfo,      setAddlInfo]      = useState(null);
  const [addlLoading,   setAddlLoading]   = useState(false);
  const [massiveInfo,   setMassiveInfo]   = useState(null);
  const [crossData,     setCrossData]     = useState(null);
  const [whaleData,     setWhaleData]     = useState(null);
  const [whaleLoading,  setWhaleLoading]  = useState(false);
  const [debugLog,      setDebugLog]      = useState([]);
  const [adminCfg,      setAdminCfg]      = useState(null);
  const [adminStats,    setAdminStats]    = useState({});
  const [mobilePanel,   setMobilePanel]   = useState("left"); // "left" | "right"
  const [chartCollapsed, setChartCollapsed] = useState(false);
  const [aiFundResult,  setAiFundResult]  = useState(null); // { verdict, confidence, strength, risk, summary, dataSnapshot }
  const [aiFundLoading, setAiFundLoading] = useState(false);
  const [aiFundCachedAt,setAiFundCachedAt]= useState(null);
  const [aiTechResult,  setAiTechResult]  = useState(null); // { verdict, stVerdict, confidence, keyLevel, summary, dataSnapshot }
  const [aiTechLoading, setAiTechLoading] = useState(false);
  const [ruleAnalytics, setRuleAnalytics] = useState(null); // Rule Based Analytics output
  const [aiTechRefreshing, setAiTechRefreshing] = useState(false);
  const [aiTechCachedAt,setAiTechCachedAt]= useState(null);

  // Expose computed financial strength for left panel pill
  // Will be set by financial tab when it renders
  if (!window.__computedFinStrength) window.__computedFinStrength = {};

  // -- AI Analysis (Fundamental + Technical) -----------------------------
  // Only for paid members. Two separate calls with different TTLs.
  function runFundAi(symA, ovA, parsedA, valsA, oracleA, priceA, insightCacheA) {
    if (!symA) return;
    if (window.__aiFundRunning === symA) return;
    window.__aiFundRunning = symA;
    setAiFundLoading(true);
    fetch("/cache?sym=" + symA + "&tab=ai-fund")
      .then(function(r){ return r.json(); })
      .then(function(d) {
        if (d && d.hit && d.value) {
          try {
            var cached = JSON.parse(d.value);
            setAiFundResult(cached);
            setAiFundCachedAt(d.cachedAt||null);
            setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Fund HIT: "+symA }]); });
          } catch(e) { setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Fund cache parse error: "+e }]); }); }
          setAiFundLoading(false);
          window.__aiFundRunning = null;
          window.__aiFundDone = symA;
          return;
        }
        var _ov = ovA;
        if (!_ov) { setAiFundLoading(false); window.__aiFundRunning = null; setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Fund ABORT: no ov for "+symA }]); }); return; }
        var moatR = Object.assign({}, parsedA["moat"]||{});
        var finR  = Object.assign({}, parsedA["financial"]||{});
        var _moatRaw = (insightCacheA&&insightCacheA["moat"])||"";
        var _finRaw  = ""; // financial AI removed -- raw numbers sent directly
        if (_moatRaw && !moatR.sections) {
          var _drvNames = ["Network Effects","Switching Costs","Cost Advantage","Intangible Assets","Efficient Scale","Ecosystem Lock-in"];
          var _sects = [];
          _drvNames.forEach(function(drv){
            var idx = _moatRaw.indexOf(drv); if (idx===-1) return;
            var block = _moatRaw.substring(idx,idx+300);
            var sm = block.match(/([0-9])\/5/);
            var rl = block.split("\n"); var body="";
            for (var li=0;li<rl.length;li++){ if(rl[li].indexOf("Result:")!==-1){body=rl[li].replace(/^.*Result:\s*/,"").trim();break;} }
            if (sm) _sects.push({label:drv,score:parseInt(sm[1],10),body:body});
          });
          if (_sects.length>0) moatR.sections = _sects;
        }
        if (_finRaw && !finR.body) finR.body = _finRaw;
        setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Fund data check: "+symA, data:{ hasOv:!!_ov, hasMoat:!!moatR.classification, hasFinR:!!finR.classification, priceA:priceA, valsLen:valsA.length, moatDrivers:(moatR.sections||[]).length } }]); });
        var ivLab = (function(){
          if (!valsA.length||!valsA[valsA.length-1].bold) return "Not computable";
          var iv=parseFloat(oracleA); var p=priceA;
          if (!iv||!p) return "Not computable";
          var pct=Math.abs((iv-p)/p*100);
          return (iv>p?"Undervalued ":"Overvalued ")+pct.toFixed(1)+"% (IV $"+Math.round(iv)+" vs price $"+Math.round(p)+")";
        })();
        var _ivNum=parseFloat(oracleA);
        var _ivPct=priceA>0&&_ivNum>0?((_ivNum-priceA)/priceA*100):0;
        var ivPctStr=(_ivNum>0&&priceA>0)?(_ivPct>0?"Undervalued "+Math.abs(_ivPct).toFixed(1)+"% (IV $"+Math.round(_ivNum)+" vs price $"+Math.round(priceA)+")":_ivPct<0?"Overvalued "+Math.abs(_ivPct).toFixed(1)+"% (IV $"+Math.round(_ivNum)+" vs price $"+Math.round(priceA)+")":" At fair value (IV $"+Math.round(_ivNum)+")"):"Not computable";
        // Safe field helpers - never throw, return "N/A" if missing
        function sfn(v,dec){ return (v!==null&&v!==undefined&&!isNaN(v)&&v!==0)?v.toFixed(dec||2):"N/A"; }
        function sfp(v){ return (v!==null&&v!==undefined&&!isNaN(v))?v.toFixed(1)+"%":"N/A"; }
        function sfx(v){ return (v!==null&&v!==undefined&&!isNaN(v)&&v>0)?v.toFixed(2)+"x":"N/A"; }
        function sfb(v){ return (v!==null&&v!==undefined&&!isNaN(v)&&v!==0)?"$"+(Math.abs(v)/1e9).toFixed(1)+"B "+(v<0?"(negative)":""):"N/A"; }
        function sfi(v){ return (v!==null&&v!==undefined&&!isNaN(v)&&v!==0)?Math.round(v).toString():"N/A"; }
        // Build IV model breakdown from valsA
        var _ivModels=(valsA||[]).filter(function(v){return !v.bold;}).map(function(v){
          var _ivv=parseFloat(v.value||0); var _pct=priceA>0&&_ivv>0?((_ivv-priceA)/priceA*100):null;
          return "- "+v.label+": "+(_ivv>0?"$"+Math.round(_ivv):"N/A")+(_pct!==null?" ("+(_pct>0?"undervalued ":"overvalued ")+Math.abs(_pct).toFixed(1)+"%)":"");
        }).join("\n");
        var _finMetrics=
          "- Gross Margin: "+sfp(_ov.grossMargin)+"\n"+
          "- Operating Margin: "+sfp(_ov.opMargin)+"\n"+
          "- Net Profit Margin: "+sfp(_ov.netMargin)+"\n"+
          "- Return on Equity: "+sfp(_ov.roe)+"\n"+
          "- Free Cash Flow: "+sfb(_ov.fcfRaw)+"\n"+
          "- Operating Cash Flow: "+sfb(_ov.ocfRaw)+"\n"+
          "- Revenue Growth YoY: "+sfp(_ov.revGrowth)+"\n"+
          "- Debt/Equity: "+sfx(_ov.de)+"\n"+
          "- Current Ratio: "+sfx(_ov.currentRatio)+"\n"+
          "- Quick Ratio: "+sfx(_ov.quickRatio)+"\n"+
          "- Total Debt: "+sfb(_ov.totalDebt)+"\n"+
          "- Cash: "+sfb(_ov.cash);
        var prompt=
          "You are a senior investment analyst assessing "+symA+(window.NAMES&&window.NAMES[symA]?" ("+window.NAMES[symA]+")":"")+".\n\n"+
          "Below is data from our app tabs. Use as primary source; fill gaps from your knowledge where N/A.\n\n"+
          "COMPANY: "+(_ov.sector||"N/A")+" | "+(_ov.industry||"N/A")+" | Cap: "+sfb(_ov.mc)+"\n\n"+
          "--- ECONOMIC MOAT TAB ---\n"+
          "Overall: "+(moatR.classification||"Unknown")+" ("+(moatR.score||0)+"/5)\n"+
          (moatR.sections&&moatR.sections.length>0?moatR.sections.map(function(s){return "- "+s.label+": "+s.score+"/5"+(s.body?" -- "+s.body:"");}).join("\n")+"\n":"")+
          (moatR.explanation?"Explanation: "+moatR.explanation+"\n":"")+"\n"+
          "--- INTRINSIC VALUE TAB ---\n"+
          "Current Price: $"+(priceA>0?priceA.toFixed(2):"N/A")+"\n"+
          "Consensus IV: "+ivPctStr+"\n"+
          (_ivModels?"Individual model results:\n"+_ivModels+"\n":"")+
          "Note: Review each model. If they diverge, explain why and give your view on the most reasonable valuation for this business model.\n\n"+
          "Market Multiples: P/E "+sfx(_ov.pe)+" | Fwd P/E "+sfx(_ov.fpe)+" | EV/EBITDA "+sfx(_ov.evEbitda)+" | P/S "+sfx(_ov.ps)+" | P/B "+sfx(_ov.pb)+" | PEG "+sfn(_ov.peg)+"\n"+
          "Dividend: "+(_ov.divY>0?_ov.divY.toFixed(2)+"%":"None")+"\n\n"+
          "--- FINANCIAL STRENGTH TAB ---\n"+
          "Overall: "+(finR.classification||"Unknown")+" ("+(finR.score||0)+"/5)\n"+
          _finMetrics+"\n"+
          "EPS Growth: "+sfp(_ov.epsG)+" | LT EPS Est: "+sfp(_ov.ltG)+" | Beta: "+sfn(_ov.beta)+"\n\n"+
          "ANALYST CONSENSUS: Buy "+sfi(_ov.recBuy)+" | Hold "+sfi(_ov.recHold)+" | Sell "+sfi(_ov.recSell)+" | Target $"+(_ov.targetMedian?_ov.targetMedian.toFixed(2):"N/A")+"\n"+
          "\nRespond in EXACTLY this format. Plain English, no jargon without explanation:\n"+
          "Fundamental (Invest): Exceptional / Good / Fair / Stretched / Avoid\n"+
          "Key Strength: 1-3 sentences plain English.\n"+
          "Key Risk: 1-3 sentences plain English.\n"+
          "Summary (2-3 sentences): Explain to a friend with some finance knowledge. Include your view on whether the intrinsic value models seem reasonable and what that means for whether the stock is cheap or expensive right now.";
        setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Fund MISS: "+symA+" -- calling Claude" }]); });
        fetch("/anthropic",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:1200, messages:[{role:"user",content:prompt}] }) })
          .then(function(r){ return r.json(); })
          .then(function(d2){
            var text=d2.content&&d2.content[0]?d2.content[0].text:"";
            function ex(re){var m=text.match(re);return m?m[1].trim():"";}
            var result={ verdict:ex(/Fundamental[^:]*:\s*(.+)/), confidence:ex(/Confidence:\s*(.+)/),
              strength:ex(/Key Strength:\s*([\s\S]+?)(?=Key Risk:|Summary|$)/).trim().slice(0,400),
              risk:ex(/Key Risk:\s*([\s\S]+?)(?=Summary|$)/).trim().slice(0,400),
              summary:ex(/Summary[^:]*:\s*([\s\S]+)/).slice(0,1200), promptSent:prompt };
            setAiFundResult(result);
            setAiFundLoading(false);
            window.__aiFundRunning = null;
            window.__aiFundDone = symA;
            fetch("/cache?sym="+symA+"&tab=ai-fund",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result)})
              .then(function(r){return r.json();})
              .then(function(wr){setAiFundCachedAt(wr.cachedAt||null);setDebugLog(function(p){return p.concat([{time:new Date().toISOString(),label:"AI Fund WRITE: "+symA+(wr.ok?" OK":" FAIL")}]);});});
          }).catch(function(e){ setAiFundLoading(false); window.__aiFundRunning = null; setDebugLog(function(p){return p.concat([{time:new Date().toISOString(),label:"AI Fund ERROR: "+e}]);}); });
      }).catch(function(e){ setAiFundLoading(false); window.__aiFundRunning = null; setDebugLog(function(p){return p.concat([{time:new Date().toISOString(),label:"AI Fund fetch error: "+e}]);}); });
  }

  // DEPRECATED — Technical analysis is now fully rule-based via generateRuleBasedAnalytics().
  // runTechAi() is preserved here for reference only. It is never called.
  // eslint-disable-next-line no-unused-vars
  function runTechAi(symA, massiveA, priceA, msDots2, msLabel2) { return; // DISABLED
    if (!symA) return;
    if (window.__aiTechRunning === symA) return;
    window.__aiTechRunning = symA;
    setAiTechLoading(true);
    setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Tech: checking cache for "+symA }]); });
    fetch("/cache?sym=" + symA + "&tab=ai-tech")
      .then(function(r){ return r.json(); })
      .then(function(d) {
        setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Tech cache result: "+symA, data:{hit:!!(d&&d.hit), ok:!!(d&&d.ok)} }]); });
        if (d && d.hit && d.value) {
          try {
            var cached = JSON.parse(d.value);
            setAiTechResult(cached);
            setAiTechCachedAt(d.cachedAt||null);
            setAiTechLoading(false);
            setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Tech HIT: "+symA }]); });
            // Stale check — if older than 1 day, refresh silently in background
            var techAge = d.cachedAt ? Date.now() - new Date(d.cachedAt).getTime() : 0;
            var isStale = techAge > 24 * 60 * 60 * 1000;
            if (!isStale || window.__aiTechRunning) {
              window.__aiTechRunning = null;
              window.__aiTechDone = symA;
              return;
            }
            // Stale — fall through to regeneration as background refresh
            setAiTechRefreshing(true);
            window.__aiTechRunning = symA;
          } catch(e) {
            setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Tech cache parse error: "+String(e) }]); });
          }
        }
        // Safe helpers -- nothing here can throw
        function _sf(v,dec){ try{ return (v!=null&&!isNaN(v)&&isFinite(v))?parseFloat(v).toFixed(dec||2):"N/A"; }catch(e){return "N/A";} }
        function _sn(v){ try{ return (v!=null&&!isNaN(v)&&isFinite(v))?parseFloat(v):" N/A"; }catch(e){return null;} }
        var _ind={}; try{ _ind=massiveA.indicators||{}; }catch(e){}
        var _aggs2=[]; try{ _aggs2=massiveA.aggs||[]; }catch(e){}
        var rsi=null; try{ rsi=_ind.rsi14!=null?parseFloat(_ind.rsi14):null; }catch(e){}
        var rsiCond=rsi==null?"N/A":rsi>70?"Overbought":rsi<30?"Oversold":"Neutral";
        var sma50=null; try{ sma50=_ind.sma50>0?_ind.sma50:null; }catch(e){}
        var sma200=null; try{ sma200=_ind.sma200>0?_ind.sma200:null; }catch(e){}
        var ema20=null; try{ ema20=_ind.ema20>0?_ind.ema20:null; }catch(e){}
        var wsma10=null; try{ wsma10=_ind.wsma10>0?_ind.wsma10:null; }catch(e){}
        var wsma40=null; try{ wsma40=_ind.wsma40>0?_ind.wsma40:null; }catch(e){}
        var macdHist=null; try{ macdHist=_ind.macd&&_ind.macd.histogram!=null?parseFloat(_ind.macd.histogram):null; }catch(e){}
        var macdHistArr=[]; try{ macdHistArr=Array.isArray(_ind.macdHistory)?_ind.macdHistory:[]; }catch(e){}
        var rsiHistArr=[]; try{ rsiHistArr=Array.isArray(_ind.rsiHistory)?_ind.rsiHistory:[]; }catch(e){}
        var pSma50=null; try{ pSma50=(sma50&&priceA>0)?((priceA-sma50)/sma50*100).toFixed(1):null; }catch(e){}
        var pSma200=null; try{ pSma200=(sma200&&priceA>0)?((priceA-sma200)/sma200*100).toFixed(1):null; }catch(e){}
        var _wsmaG2=null; try{ _wsmaG2=(wsma10&&wsma40)?((wsma10-wsma40)/wsma40*100).toFixed(1):null; }catch(e){}
        var _crsG2=null; try{ _crsG2=(sma50&&sma200)?((sma50-sma200)/sma200*100).toFixed(1):null; }catch(e){}
        var _ema20g2=null; try{ _ema20g2=(ema20&&priceA>0)?((priceA-ema20)/ema20*100).toFixed(1):null; }catch(e){}
        var _hi52=0; try{ _hi52=massiveA._hi52||ov&&ov.hi52||0; }catch(e){}
        var _lo52=0; try{ _lo52=massiveA._lo52||ov&&ov.lo52||0; }catch(e){}
        var _pos52pct=null; try{ _pos52pct=(_hi52>_lo52&&priceA>0)?Math.round((priceA-_lo52)/(_hi52-_lo52)*100):null; }catch(e){}
        var _macdDir2="unknown"; try{ _macdDir2=macdHistArr.length>=2&&macdHistArr[0]&&macdHistArr[1]&&macdHistArr[0].histogram!=null&&macdHistArr[1].histogram!=null?(parseFloat(macdHistArr[0].histogram)>parseFloat(macdHistArr[1].histogram)?"rising (buying pressure increasing)":"falling (buying pressure decreasing)"):"unknown"; }catch(e){}
        var _volR2=null; try{ var _v5=_aggs2.slice(0,5).reduce(function(s,a){return s+((a&&a.v)||0);},0)/Math.max(_aggs2.slice(0,5).length,1); var _v20=_aggs2.slice(0,20).reduce(function(s,a){return s+((a&&a.v)||0);},0)/Math.max(_aggs2.slice(0,20).length,1); _volR2=_v20>0?(_v5/_v20*100).toFixed(0)+"% of normal":null; }catch(e){}
        var macdDir="Unknown"; try{ macdDir=macdHist!=null?(macdHist>0?"Bullish":"Bearish"):"Unknown"; }catch(e){}
        var activeRevs=[]; try{
          var _rArr=[
            rsiHistArr.length>=5&&rsiHistArr[0]>rsiHistArr[1]&&rsiHistArr[1]<35,
            macdHistArr.length>=2&&macdHistArr[0]&&macdHistArr[1]&&parseFloat(macdHistArr[0].histogram)>0&&parseFloat(macdHistArr[1].histogram)<0,
            _aggs2.length>=2&&_aggs2[0]&&_aggs2[1]&&_aggs2[0].v>_aggs2[1].v*1.5,
            sma50&&priceA>sma50&&_aggs2.length>=2&&_aggs2[1]&&_aggs2[1].l<sma50,
            _aggs2.length>=5&&_aggs2[0]&&_aggs2[0].h>Math.max.apply(null,_aggs2.slice(1,5).map(function(a){return a&&a.h||0;})),
          ];
          activeRevs=["RSI Base","MACD Turning","Volume Surge","MA Reclaim","Price Structure"].filter(function(_,i){return _rArr[i];});
        }catch(e){}
        // Tech prompt -- built as array to avoid string escaping issues
        var _ind2=massiveA.indicators||{};
        var _agg2=massiveA.aggs||[];
        var _snap2=massiveA.snapshot||{};
        var _vwap2=_snap2.vwap||0;
        var _vwapDiff2=_vwap2>0&&priceA>0?(((priceA-_vwap2)/_vwap2)*100).toFixed(2):null;
        var _ema20g3=_ind2.ema20&&priceA>0?(((priceA-_ind2.ema20)/_ind2.ema20)*100).toFixed(1):null;
        var _s50g3=_ind2.sma50&&priceA>0?(((priceA-_ind2.sma50)/_ind2.sma50)*100).toFixed(1):null;
        var _s200g3=_ind2.sma200&&priceA>0?(((priceA-_ind2.sma200)/_ind2.sma200)*100).toFixed(1):null;
        var _wsmaG3=_ind2.wsma10&&_ind2.wsma40?(((_ind2.wsma10-_ind2.wsma40)/_ind2.wsma40)*100).toFixed(1):null;
        var _crsG3=_ind2.sma50&&_ind2.sma200?(((_ind2.sma50-_ind2.sma200)/_ind2.sma200)*100).toFixed(1):null;
        var _rsi3=_ind2.rsi14!=null?parseFloat(_ind2.rsi14):null;
        var _mH3=_ind2.macdHistory||[];
        var _macdH3=_mH3[0]&&_mH3[0].histogram!=null?parseFloat(_mH3[0].histogram):null;
        var _macdDir3=_mH3.length>=2&&_mH3[0]&&_mH3[1]&&_mH3[0].histogram!=null&&_mH3[1].histogram!=null?(parseFloat(_mH3[0].histogram)>parseFloat(_mH3[1].histogram)?"rising":"falling"):"unknown";
        var _roc103=_agg2.length>=10&&_agg2[9]&&_agg2[9].c&&priceA>0?(((priceA-_agg2[9].c)/_agg2[9].c)*100).toFixed(1):null;
        var _momScore3=window.__momScore||0;
        var _momLabel3=window.__momLabel||"N/A";
        var _trendScore3=window.__trendScore||0;
        var _trendLabel3=window.__trendLabel||"N/A";
        // Reversal arrays from pre-compute useEffect via technicalSignals.js calcReversalSignalArray
        var _bullRevArr3 = window.__revArr3     || [false,false,false,false,false];
        var _bearRevArr3 = window.__revBearArr3 || [false,false,false,false,false];
        var _bullRevNames=["RSI Price Divergence","MACD Turning Up","Weekly SMA Cross Approaching","RSI Base Forming","52W Low Base"];
        var _bearRevNames=["RSI Bearish Divergence","MACD Turning Down","Weekly SMA Cross (Bear)","RSI Overbought Stalling","52W High Topping"];
        var _bullRevActive=_bullRevNames.filter(function(_,i){return _bullRevArr3[i];});
        var _bearRevActive=_bearRevNames.filter(function(_,i){return _bearRevArr3[i];});
        var _vBull=window.__volBull||[false,false,false,false,false];
        var _vBear=window.__volBear||[false,false,false,false,false];
        var _vBullNames=["Volume Spike","Bullish Surge","Accumulation","Volume Rising","Consistent Up Days"];
        var _vBearNames=["Dry-Up on Rally","Distribution","Bearish Surge","Volume Falling","Consistent Down Days"];
        var _vBullActive=_vBullNames.filter(function(_,i){return _vBull[i];});
        var _vBearActive=_vBearNames.filter(function(_,i){return _vBear[i];});
        // Caution flags from pre-compute useEffect via technicalSignals.js calcCautionFlags
        var _tCaution = window.__trendCaution || false;
        var _mCaution = window.__momCaution   || false;
        var _rsiDesc=_rsi3==null?"N/A":_rsi3>=65?"strong healthy":_rsi3>=55?"good":_rsi3>=45?"neutral":_rsi3>=35?"weak":"very weak/oversold";
        var _rsiWarn=_rsi3!=null&&_rsi3>75?" -- OVERBOUGHT CAUTION":_rsi3!=null&&_rsi3<35?" -- OVERSOLD CAUTION":"";
        var _tLines=[
          "You are a senior technical analyst assessing "+symA+". Data below mirrors our app tabs exactly. Write for a layman investor.",
          "",
          "--- TREND TAB ("+_trendScore3+"/100 -- "+_trendLabel3+(_tCaution?" -- CAUTION extended":"")+") ---",
          "Short-term:",
          _vwapDiff2!=null?"  VWAP: "+(_vwapDiff2>0?"+":"")+_vwapDiff2+"% (buyers "+((parseFloat(_vwapDiff2)>0)?"in control":"not in control")+" today)":"  VWAP: N/A",
          _ema20g3!=null?"  EMA20: "+(_ema20g3>0?"+":"")+_ema20g3+"% (short-term "+(parseFloat(_ema20g3)>1?"uptrend":"flat/down")+")":"  EMA20: N/A",
          "Medium-term:",
          _s50g3!=null?"  SMA50: "+(_s50g3>0?"+":"")+_s50g3+"% ("+(parseFloat(_s50g3)>1?"uptrend intact":"trend weak")+")":"  SMA50: N/A",
          "Long-term:",
          _s200g3!=null?"  SMA200: "+(_s200g3>0?"+":"")+_s200g3+"% ("+(parseFloat(_s200g3)>2?"bullish":"bearish/flat")+")":"  SMA200: N/A",
          _wsmaG3!=null?"  Weekly WSMA: "+(_wsmaG3>0?"+":"")+_wsmaG3+"% ("+(parseFloat(_wsmaG3)>1?"weekly uptrend":"weekly downtrend")+")":"  Weekly WSMA: N/A",
          _crsG3!=null?"  Cross: "+(parseFloat(_crsG3)>0?"Golden Cross +"+_crsG3+"%":"Death Cross -"+Math.abs(_crsG3)+"%"):"  Cross: N/A",
          "",
          "--- MOMENTUM TAB ("+_momScore3+"/100 -- "+_momLabel3+(_mCaution?" -- CAUTION":"")+") ---",
          _rsi3!=null?"  RSI: "+_rsi3.toFixed(1)+" -- "+_rsiDesc+_rsiWarn:"  RSI: N/A",
          _macdH3!=null?"  MACD histogram: "+(parseFloat(_macdH3)>0?"positive":"negative")+" and "+_macdDir3+" (value: "+_macdH3.toFixed(4)+")":"  MACD: N/A",
          _roc103!=null?"  ROC 10-day: "+(_roc103>0?"+":"")+_roc103+"% (momentum "+(parseFloat(_roc103)>3?"positive":parseFloat(_roc103)>-3?"neutral":"negative")+")":"  ROC: N/A",
          "",
          "--- REVERSAL DETECTION TAB ---",
          "  Reversal Status: "+(window.__revWatchStatus&&window.__revWatchStatus[symA]?window.__revWatchStatus[symA].status:"Not computed"),
          "  Bullish signals ("+_bullRevActive.length+"/5): "+(_bullRevActive.length>0?_bullRevActive.join(", "):"none active"),
          "  Bearish signals ("+_bearRevActive.length+"/5): "+(_bearRevActive.length>0?_bearRevActive.join(", "):"none active"),
          "",
          "--- VOLUME SPIKE TAB ---",
          "  Bullish volume ("+_vBullActive.length+"/5): "+(_vBullActive.length>0?_vBullActive.join(", "):"none active"),
          "  Bearish volume ("+_vBearActive.length+"/5): "+(_vBearActive.length>0?_vBearActive.join(", "):"none active"),
          "",
          "Respond in EXACTLY this format. Plain English only -- no jargon without explanation:",
          "Technical (Trade): Strong Bullish / Bullish / Neutral / Bearish / Strong Bearish",
          "Key Level: 1-3 sentences -- what price level to watch and why.",
          "Key Strength: 1-3 sentences -- what the signals say is positive.",
          "Key Risk: 1-3 sentences -- what the signals say is a concern.",
          "Summary (2-3 sentences): Trend direction, what key signals mean simply, and whether now is a good or risky time to buy.",
        ];
        var tprompt=_tLines.join("\n");
        setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Tech MISS: "+symA+" -- calling Claude" }]); });
        fetch("/anthropic",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:600,messages:[{role:"user",content:tprompt}]})})
          .then(function(r){return r.json();})
          .then(function(d2){
            var text=d2.content&&d2.content[0]?d2.content[0].text:"";
            function ex(re){var m=text.match(re);return m?m[1].trim():"";}
            var result={
              verdict:ex(/Technical[^:]*:\s*(.+)/),
              stVerdict:null,
              confidence:ex(/Confidence:\s*(.+)/),
              keyLevel:ex(/Key Level:\s*([\s\S]+?)(?=Key Strength:|Key Risk:|Summary|$)/).trim().slice(0,300),
              strength:ex(/Key Strength:\s*([\s\S]+?)(?=Key Risk:|Summary|$)/).trim().slice(0,300),
              risk:ex(/Key Risk:\s*([\s\S]+?)(?=Summary|$)/).trim().slice(0,300),
              summary:ex(/Summary[^:]*:\s*([\s\S]+)/).slice(0,600),
              promptSent:tprompt
            };
            setAiTechResult(result);
            setAiTechLoading(false);
            setAiTechRefreshing(false);
            window.__aiTechRunning = null;
            window.__aiTechDone = symA;
            fetch("/cache?sym="+symA+"&tab=ai-tech",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result)})
              .then(function(r){return r.json();})
              .then(function(wr){setAiTechCachedAt(wr.cachedAt||null);setDebugLog(function(p){return p.concat([{time:new Date().toISOString(),label:"AI Tech WRITE: "+symA+(wr.ok?" OK":" FAIL")}]);});});
          }).catch(function(e){
            setAiTechLoading(false); window.__aiTechRunning=null;
            setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Tech Claude ERROR: "+String(e) }]); });
          });
      }).catch(function(e){
        setAiTechLoading(false); window.__aiTechRunning=null;
        setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Tech cache fetch ERROR: "+String(e) }]); });
      });
  }

  function runAiAnalysis(symA, ovA, massiveA, parsedA, valsA, oracleA, priceA, msDots2, msLabel2, insightCacheA) {
    runFundAi(symA, ovA, parsedA, valsA, oracleA, priceA, insightCacheA);
    // Technical analysis is now rule-based via generateRuleBasedAnalytics() in pre-compute useEffect.
  }
  window.__goToPaywall = function() {
    if (!window.__clerkUser) {
      // Not signed in -- open Clerk sign-in first, then upgrade page after
      if (window.Clerk) {
        try {
          window.Clerk.openSignIn({
            afterSignInUrl: window.location.href,
            afterSignUpUrl: window.location.href,
          });
        } catch(e) {
          window.location.href = "https://accounts.nervousgeek.com/sign-in";
        }
      } else {
        window.location.href = "https://accounts.nervousgeek.com/sign-in";
      }
    } else {
      // Signed in -- go straight to upgrade page
      window.__showUpgrade && window.__showUpgrade();
    }
  };

  window.__goToTab = function(id) {
    var adminTabs = ["addlinfo", "debug", "admin"];
    if (adminTabs.indexOf(id) !== -1) return;
    setInsightTab(id);
    setChartCollapsed(true);
    if (window.innerWidth <= 768) setMobilePanel("right");
  };

  // Mount Clerk UserButton when signed in
  useEffect(function() {
    if (!clerkUser || !window.Clerk) return;
    var t = setTimeout(function() {
      var el = document.getElementById("clerk-user-button-detail");
      if (el) {
        el.dataset.mounted = "";
        try { window.Clerk.mountUserButton(el); el.dataset.mounted = "1"; }
        catch(e) { console.warn("UserButton mount failed:", e); }
      }
    }, 50);
    return function() { clearTimeout(t); };
  }, [clerkUser]);

  function parseAndStoreInsight(tabId, text) {
    if (!text) return;
    var result = {};
    if (tabId === "aiinsight") {
      result = parseAiInsight(text) || {};
    } else if (tabId === "moat") {
      // v1.13 Option C: compute weighted score from individual driver scores
      // Weights based on Dorsey/Morningstar moat durability research:
      // Switching Costs 25%, Network Effects 25%, Intangible Assets 20%,
      // Cost Advantage 15%, Ecosystem Lock-in 10%, Efficient Scale 5%
      var driverWeights = {
        "Switching Costs":   0.25,
        "Network Effects":   0.25,
        "Intangible Assets": 0.20,
        "Cost Advantage":    0.15,
        "Ecosystem Lock-in": 0.10,
        "Efficient Scale":   0.05
      };
      var weightedSum = 0;
      var weightUsed = 0;
      var driverNames = Object.keys(driverWeights);
      for (var di = 0; di < driverNames.length; di++) {
        var dName = driverNames[di];
        var dMatch = text.match(new RegExp(dName + "[^0-9]*([1-5])/5"));
        if (dMatch) {
          var dScore = parseInt(dMatch[1], 10);
          weightedSum += dScore * driverWeights[dName];
          weightUsed  += driverWeights[dName];
        }
      }
      var floatScore = weightUsed >= 0.5 ? weightedSum / weightUsed : 0;
      var score = Math.round(floatScore);
      score = Math.max(1, Math.min(5, score));
      // Use float for classification so 4.3+ reaches Wide (not just 5.0)
      var classification = floatScore >= 4.3 ? "Wide" : floatScore >= 3.5 ? "Strong" : floatScore >= 2.5 ? "Moderate" : floatScore >= 1.5 ? "Narrow" : "Weak";
      var expIdx = text.indexOf("Explanation");
      var explanation = expIdx !== -1 ? text.substring(expIdx).replace(/^Explanation[^:]*:\s*/, "").split("\n")[0].trim() : "";
      result = {
        score: score,
        classification: classification,
        explanation: explanation,
      };
    } else if (tabId === "financial") {
      var mc = text.match(/Financial Strength Classification[^:]*:\s*(.+)/);
      var cls = mc ? mc[1].trim().replace(/[*_#]/g,"").split(/[\s,]/)[0] : null;
      if (!cls || cls.length < 2) {
        if (text.match(/Strong/i)) cls = "Strong";
        else if (text.match(/Moderate/i)) cls = "Moderate";
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
      window.__parsedInsights = next;
      return next;
    });
  }

  useEffect(function() {
    setQ(null); setOv(null); setEpsHistory(null); setEpsError(false); setInsightCache({}); setInsightLoading(false); setInsightTab("business"); setParsedInsights({}); setAddlInfo(null); setAddlLoading(false); setMassiveInfo(null); setCrossData(null); setWhaleData(null); setWhaleLoading(false); setDebugLog([]); setAiFundResult(null); setAiFundLoading(false); setAiFundCachedAt(null); setAiTechResult(null); setAiTechLoading(false); setAiTechRefreshing(false); setAiTechCachedAt(null); setRuleAnalytics(null); window.__aiFundRunning=null; window.__aiTechRunning=null; window.__aiFundDone=null; window.__aiTechDone=null; window.__momScore=null; window.__momScoreSym=null; window.__trendScore=null; window.__trendScoreSym=null; window.__revCount3=null; window.__revArr3=null; window.__revSym3=null; window.__volBull=null; window.__volBear=null; window.__volSym=null; if(window.__computedFinStrength)delete window.__computedFinStrength[sym]; if(window.__ivStore)delete window.__ivStore[sym]; if(window.__signalWritten)delete window.__signalWritten[sym]; if(window.__trendSignalWritten)delete window.__trendSignalWritten[sym]; window.__curOracle="0"; window.__curVals=[]; window.__curOv=null; window.__curMassive=null; if(window.__rbaFullSnap)delete window.__rbaFullSnap[sym]; setMsg("Fetching live data for " + sym + "..."); delete ovCache[sym]; delete qCache[sym];
    // Clear SimFin cache for this ticker so it re-fetches fresh data
    if (window.__simfinData)   { delete window.__simfinData[sym]; }
    if (window.__simfinLoading){ delete window.__simfinLoading[sym]; }

    getQuote(sym).then(function(res) {
      if (res) { setQ(res); setMsg(""); }
      else setMsg("Could not load quote for " + sym + ". Yahoo Finance may be unavailable.");
    }).catch(function() {
      setMsg("Network error loading quote for " + sym + ".");
    });

    getOverview(sym).then(function(res) {
      if (res) {
        setOv(res);
        setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Yahoo quoteSummary OK", data: { modules: "summaryDetail,financialData,assetProfile,earningsTrend,recommendationTrend,upgradeDowngradeHistory,balanceSheetHistory,earningsHistory,calendarEvents", recBuy: res.recBuy, recHold: res.recHold, recSell: res.recSell, earningsQ: (res.earningsQ || []).length, nextEarnings: res.nextEarnings, cash: res.cash, totalDebt: res.totalDebt, totalDebtSource: res.totalDebtSource, debtDiag: res._debtDiag, fcfRaw: res.fcfRaw, ocfRaw: res.ocfRaw, niRaw: res.niRaw, sharesOut: res.sharesOut, ltG: res.ltG, ltG1Y: res.ltG1Y } }]); });
      } else {
        setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Yahoo quoteSummary returned null" }]); });
      }

      // Auto-generate all 4 AI insight tabs in parallel
      // v1.13 Option B: use resolved res (not ov state) so financial context is always populated
      var _ovSnap = res || null;
      var _moatFinCtx = (function() {
        if (!_ovSnap) return "";
        var lines = [];
        if (_ovSnap.grossMargin > 0)   lines.push("Gross margin: " + _ovSnap.grossMargin.toFixed(1) + "%");
        if (_ovSnap.opMargin > 0)      lines.push("Operating margin: " + _ovSnap.opMargin.toFixed(1) + "%");
        if (_ovSnap.revGrowth !== 0)   lines.push("Revenue growth YoY: " + _ovSnap.revGrowth.toFixed(1) + "%");
        if (_ovSnap.beta > 0)          lines.push("Beta: " + _ovSnap.beta.toFixed(2));
        if (_ovSnap.recBuy > 0 || _ovSnap.recHold > 0 || _ovSnap.recSell > 0)
          lines.push("Analyst consensus: " + _ovSnap.recBuy + " buy / " + _ovSnap.recHold + " hold / " + _ovSnap.recSell + " sell");
        if (_ovSnap.fcfRaw && _ovSnap.sharesOut > 0) {
          var _fcfM = (_ovSnap.fcfRaw / 1e6).toFixed(0);
          lines.push("Free cash flow: $" + _fcfM + "M");
        }
        if (lines.length === 0) return "";
        return "\n\nFinancial context (use these figures to ground your scores, do not contradict them):\n" + lines.join("\n");
      })();
      var aiTabs = ["moat"];

      // Load KV config fresh, then run tab fetches
      fetch("/cache?action=config")
        .then(function(r) { return r.json(); })
        .then(function(cfgData) {
          if (cfgData && Array.isArray(cfgData.value)) {
            window.__adminCfg = cfgData.value;
          } else if (!window.__adminCfg) {
            window.__adminCfg = [];
          }
          runAiTabs();
        })
        .catch(function() {
          if (!window.__adminCfg) {
            window.__adminCfg = [];
          }
          runAiTabs();
        });

      function runAiTabs() {
      setInsightLoading(true);
      aiTabs.forEach(function(tabId) {
      var prompts = {
        moat: "You are a professional equity research analyst. Analyze the economic moat of " + sym + " (" + (NAMES[sym]||sym) + ") using only well-known business fundamentals and observable financial indicators. Do not fabricate statistics or unsupported claims. Scoring guide: 5/5 = world-class dominant moat (e.g. Microsoft, Visa, Moody's level). 4/5 = strong durable advantage. 3/5 = moderate. 2/5 = narrow. 1/5 = weak or none. Be objective -- top companies deserve high scores." + _moatFinCtx + "\n\nReturn results in EXACTLY this format:\n\nNetwork Effects: X/5\nAssessment Criteria: The product or platform becomes more valuable as more users join.\nResult: One sentence explaining the score.\n\nSwitching Costs: X/5\nAssessment Criteria: Customers face difficulty, cost, or disruption when changing to competitors.\nResult: One sentence explaining the score.\n\nCost Advantage: X/5\nAssessment Criteria: The company can operate at lower cost or higher efficiency than competitors.\nResult: One sentence explaining the score.\n\nIntangible Assets: X/5\nAssessment Criteria: Brand, patents, intellectual property, regulatory licenses, or proprietary technology.\nResult: One sentence explaining the score.\n\nEfficient Scale: X/5\nAssessment Criteria: The market only supports a few profitable players due to high barriers to entry.\nResult: One sentence explaining the score.\n\nEcosystem Lock-in: X/5\nAssessment Criteria: Customers rely on multiple integrated products or services within the company ecosystem.\nResult: One sentence explaining the score.\n\nEconomic Moat Rating: X / 5\n\nExplanation (maximum 100 words): Summarize the main competitive advantages. Focus only on the most important moat drivers. Assign 5/5 generously where the advantage is genuinely world-class and durable.",
        financial: "You are a professional equity research analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), assess Financial Strength across these 7 dimensions in concise paragraphs: 1. Revenue Growth Trend 2. Gross Margin Stability 3. Operating Margin Trend 4. Free Cash Flow Consistency 5. Debt Level 6. Share Dilution or Buyback Discipline 7. Earnings Predictability. End with: Financial Strength Classification: Strong / Moderate / Weak and one sentence of reasoning.",
        technical: "You are a professional technical analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), provide a technical analysis covering: Trend (50-day MA, 200-day MA, direction), Momentum (RSI condition, MACD condition), Support and Resistance zones, Volume analysis (confirms move? accumulation or distribution?), Chart Patterns (breakout / consolidation / reversal / double bottom / head and shoulders / flag/pennant / no clear pattern). End with: Technical Rating: Strong Bullish / Bullish / Neutral / Bearish / Strong Bearish and Entry Timing View: Good Entry / Wait for Pullback / Breakout Watch / Avoid for Now. Be specific with price levels where possible.",
        aiinsight: "You are a senior investment analyst. For " + sym + " (" + (NAMES[sym]||sym) + "), provide an AI Insight in EXACTLY this format:\\n\\nFundamental: X/5\\nResult: One sentence.\\n\\nTechnical: X/5\\nResult: One sentence.\\n\\nSentiment: X/5\\nResult: One sentence.\\n\\nOverall Verdict: Buy / Hold / Avoid / Strong Buy / Strong Avoid\\nConfidence: Low / Medium / High\\nHorizon: Short-term (1-3m) / Medium-term (3-12m) / Long-term (12m+)\\n\\nKey Risk: One sentence on the most important downside risk.\\nKey Opportunity: One sentence on the most important upside catalyst.\\n\\nAI Insight Summary (max 80 words): Concise investment conclusion."
      };
      // Cache-first for all S&P 500 tickers (Option A)
      // Only LIVE if admin explicitly toggled ticker to live mode
      var _kvCfg = window.__adminCfg || null;
      var _isLiveMode = _kvCfg && _kvCfg.indexOf(sym) !== -1;

      function _callClaude(onResult) {
        var _anth1Hdrs = Object.assign({"Content-Type":"application/json"}, window.__clerkToken ? {"Authorization":"Bearer "+window.__clerkToken} : {});
        fetch("/anthropic", {
          method: "POST",
          headers: _anth1Hdrs,
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 900,
            messages: [{ role: "user", content: prompts[tabId] }]
          })
        }).then(function(r) { return r.json(); })
          .then(function(data) {
            var text = data && data.content && data.content[0] && data.content[0].text;
            onResult(text || "Analysis unavailable.");
          }).catch(function() {
            onResult("Analysis unavailable. Please try again.");
          });
      }

      function _storeResult(text) {
        setInsightCache(function(prev) {
          var next = Object.assign({}, prev);
          next[tabId] = text;
          parseAndStoreInsight(tabId, next[tabId]);
          return next;
        });
        setInsightLoading(false);
      }

      if (_isLiveMode) {
        // LIVE: call Claude directly, no caching
        setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "LIVE mode: calling Claude for " + sym + ":" + tabId + " (live ticker -- no cache)" }]); });
        _callClaude(function(text) {
          if (!window.__cacheStatus) window.__cacheStatus = {};
          window.__cacheStatus[sym + ":" + tabId] = "live";
          if (!window.__aiCallCount) window.__aiCallCount = 0;
          window.__aiCallCount++;
          _storeResult(text);
        });
      } else {
        // CACHED: try KV first
        fetch("/cache?sym=" + sym + "&tab=" + tabId)
          .then(function(r) { return r.json(); })
          .then(function(d) {
            if (d && d.hit && d.value) {
              // Cache hit -- use stored result
              if (!window.__cacheStatus) window.__cacheStatus = {};
              window.__cacheStatus[sym + ":" + tabId] = "hit";
              // Update admin stats with cachedAt from response
              setAdminStats(function(prev) {
                var next = Object.assign({}, prev);
                next["insight:" + sym + ":" + tabId] = { cachedAt: d.cachedAt || null, size: d.value ? d.value.length : 0, exists: true };
                return next;
              });
              setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Cache HIT: " + sym + ":" + tabId, data: { cachedAt: d.cachedAt || "none", size: d.value ? d.value.length : 0 } }]); });
              _storeResult(d.value);
            } else {
              // Cache miss -- call Claude then write to KV
              if (!window.__cacheStatus) window.__cacheStatus = {};
              window.__cacheStatus[sym + ":" + tabId] = "miss";
              setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Cache MISS: " + sym + ":" + tabId + " -- calling Claude (no KV entry)" }]); });
              _callClaude(function(text) {
                window.__cacheStatus[sym + ":" + tabId] = "written";
                if (!window.__aiCallCount) window.__aiCallCount = 0;
                window.__aiCallCount++;
                _storeResult(text);
                // Write to KV cache
                fetch("/cache?sym=" + sym + "&tab=" + tabId, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: text,
                }).then(function(r) { return r.json(); })
                  .then(function(wr) {
                    setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Cache WRITE: " + sym + ":" + tabId + " -- " + (wr.ok ? "OK cachedAt=" + (wr.cachedAt || "?") : "FAIL"), data: wr }]); });
                    // Update admin stats with write response
                    setAdminStats(function(prev) {
                      var next = Object.assign({}, prev);
                      next["insight:" + sym + ":" + tabId] = { cachedAt: wr.cachedAt || null, size: text ? text.length : 0, exists: true };
                      return next;
                    });
                  }).catch(function() {});
              });
            }
          }).catch(function(err) {
            // KV read failed -- fall back to Claude (log this!)
            if (!window.__cacheStatus) window.__cacheStatus = {};
            window.__cacheStatus[sym + ":" + tabId] = "kv-error";
            setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "WARN: KV read FAILED for " + sym + ":" + tabId + " -- falling back to live Claude call. Error: " + String(err), data: { error: String(err) } }]); });
            _callClaude(function(text) {
              window.__cacheStatus[sym + ":" + tabId] = "kv-error-fallback";
              _storeResult(text);
              // Still try to write to KV after recovery
              fetch("/cache?sym=" + sym + "&tab=" + tabId, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: text,
              }).then(function(r){ return r.json(); }).then(function(wr){
                setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Cache WRITE (after KV error recovery): " + sym + ":" + tabId + " -- " + (wr.ok?"OK":"FAIL"), data: wr }]); });
              }).catch(function(){});
            });
          });
      }
    }); // end aiTabs.forEach
      } // end runAiTabs
    }).catch(function(e) {
      setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Yahoo quoteSummary error", data: { error: String(e) } }]); });
    });

    // Fetch 10-year historical financials via Claude Haiku (GAAP figures)
    (function() {
      var currentYear = new Date().getFullYear();
      var years = [];
      for (var y = currentYear - 1; y >= currentYear - 10; y--) years.push(y);
      fetch("/eps?sym=" + sym)
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d && d.ok && d.rows && d.rows.length > 0) {
            setEpsHistory(d.rows.slice(0, 10));
            setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "EPS history: Polygon " + d.rows.length + " years (split-adjusted)", data: { splits: d.splits, eps: d.rows.map(function(r){ return r.year + ": $" + r.eps.toFixed(2) + (r.adjFactor !== 1 ? " (adj " + r.adjFactor + "x from $" + r.epsRaw.toFixed(2) + ")" : ""); }) } }]); });
          } else {
            // Fallback: Claude Haiku AI-estimated EPS
            setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "EPS Polygon failed, falling back to Claude Haiku", data: d }]); });
            fetch("/anthropic", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1000,
                messages: [{ role: "user", content: "Return ONLY a valid JSON array, no markdown. For " + sym + " (" + (NAMES[sym]||sym) + "), provide annual EPS for the last 10 fiscal years. Each item: {year:number, eps:number (GAAP diluted EPS)}. Use null for unknown. Actual reported figures only." }]
              })
            }).then(function(r) { return r.json(); })
              .then(function(d2) {
                var text = d2 && d2.content && d2.content[0] && d2.content[0].text;
                if (!text) { setEpsError(true); return; }
                text = text.replace(/```json|```/g, "").trim();
                try {
                  var rows = JSON.parse(text);
                  if (rows && rows.length > 0) {
                    rows.sort(function(a, b) { return b.year - a.year; });
                    setEpsHistory(rows.slice(0, 10));
                  } else { setEpsError(true); }
                } catch(e2) { setEpsError(true); }
              }).catch(function() { setEpsError(true); });
          }
        })
        .catch(function() { setEpsError(true); });
    })();

    // Prefetch SimFin balance sheet + income data for DCF accuracy
    // Runs on ticker load so DCF has data even before Additional Info tab is opened
    // Log SimFin prefetch start immediately
    setDebugLog(function(prev) { return prev.concat([{
      time:  new Date().toISOString(),
      label: "SimFin prefetch -- starting for " + sym,
      data:  null
    }]); });
    (function() {
      if (!window.__simfinData) window.__simfinData = {};
      if (!window.__simfinLoading) window.__simfinLoading = {};
      if (window.__simfinLoading[sym]) {
        setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "SimFin prefetch -- already loading, skipped", data: null }]); });
        return;
      }
      window.__simfinLoading[sym] = true;
      var simfinHdrs = window.__clerkToken ? { "Authorization": "Bearer " + window.__clerkToken } : {};
      fetch("/simfin?sym=" + sym, { headers: simfinHdrs })
        .then(function(r) {
          setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "SimFin prefetch -- HTTP " + r.status, data: null }]); });
          return r.text();
        })
        .then(function(txt) {
          var d;
          try { d = JSON.parse(txt); } catch(e) { d = { error: "JSON parse failed: " + String(e), raw: txt.slice(0, 200) }; }
          window.__simfinData[sym]    = d;
          window.__simfinLoading[sym] = false;
          // Build detailed log entries matching the old addlinfo tab logs
          // Log raw structure for debugging
          setDebugLog(function(prev) { return prev.concat([{
            time:  new Date().toISOString(),
            label: "SimFin raw structure check",
            data:  {
              balanceType:      typeof d.balance,
              balanceIsArray:   Array.isArray(d.balance),
              balanceLen:       Array.isArray(d.balance) ? d.balance.length : "n/a",
              balance0keys:     d.balance && d.balance[0] ? Object.keys(d.balance[0]).join(",") : "n/a",
              hasStatements:    d.balance && d.balance[0] && d.balance[0].statements ? "YES len=" + d.balance[0].statements.length : "NO",
              incomeType:       typeof d.income,
              incomeIsArray:    Array.isArray(d.income),
              rawBalPreview:    JSON.stringify(d.balance).slice(0, 300),
              diag_url_bs:      d.diag ? d.diag.url_bs : "no diag",
              diag_status_bs:   d.diag ? d.diag.status_bs : "no diag",
              diag_rawPreview_bs: d.diag ? d.diag.rawPreview_bs : "no diag",
              diag_rawLen_bs:   d.diag ? d.diag.rawLen_bs : "no diag",
              diag_url_pl:      d.diag ? d.diag.url_pl : "no diag",
              diag_rawPreview_pl: d.diag ? d.diag.rawPreview_pl : "no diag",
            }
          }]); });
          var sfBsCols = d.balance && Array.isArray(d.balance) && d.balance[0] && d.balance[0].statements ? d.balance[0].statements[0].columns : [];
          var sfPlCols = d.income  && Array.isArray(d.income)  && d.income[0]  && d.income[0].statements  ? d.income[0].statements[0].columns   : [];
          var sfBsData = d.balance && Array.isArray(d.balance) && d.balance[0] && d.balance[0].statements ? d.balance[0].statements[0].data      : [];
          var sfPlData = d.income  && Array.isArray(d.income)  && d.income[0]  && d.income[0].statements  ? d.income[0].statements[0].data       : [];
          // Latest BS row (last = newest since SimFin returns oldest first)
          var sfBsLatest = sfBsData.length > 0 ? (function() {
            var row = sfBsData[sfBsData.length - 1];
            var obj = {};
            sfBsCols.forEach(function(k, i) { obj[k] = row[i]; });
            return obj;
          })() : null;
          var sfPlLatest = sfPlData.length > 0 ? (function() {
            var row = sfPlData[sfPlData.length - 1];
            var obj = {};
            sfPlCols.forEach(function(k, i) { obj[k] = row[i]; });
            return obj;
          })() : null;
          setDebugLog(function(prev) { return prev.concat([
            {
              time:  new Date().toISOString(),
              label: "SimFin prefetch -- " + (d.ok ? "OK" : "FAILED: " + (d.error || JSON.stringify(d).slice(0,100))),
              data:  { status_pl: d.diag ? d.diag.status_pl : null, status_bs: d.diag ? d.diag.status_bs : null,
                       incomeRows: sfPlData.length + " rows", balanceRows: sfBsData.length + " rows",
                       url_bs: d.diag ? d.diag.url_bs : null,
                       rawPreview_bs: d.diag ? d.diag.rawPreview_bs : null,
                       rawLen_bs: d.diag ? d.diag.rawLen_bs : null,
                       url_pl: d.diag ? d.diag.url_pl : null,
                       rawPreview_pl: d.diag ? d.diag.rawPreview_pl : null }
            },
            {
              time:  new Date().toISOString(),
              label: "SimFin BS columns (" + sfBsCols.length + " total)",
              data:  sfBsCols
            },
            {
              time:  new Date().toISOString(),
              label: "SimFin PL columns (" + sfPlCols.length + " total)",
              data:  sfPlCols
            },
            {
              time:  new Date().toISOString(),
              label: "SimFin BS latest row (most recent year)",
              data:  sfBsLatest
            },
            {
              time:  new Date().toISOString(),
              label: "SimFin PL latest row (most recent year)",
              data:  sfPlLatest
            }
          ]); });
          // Trigger re-render so DCF breakdown picks up SimFin data
          setOv(function(prev) { return prev ? Object.assign({}, prev, { _sfLoaded: Date.now() }) : prev; });
          setMassiveInfo(function(prev) { return prev ? Object.assign({}, prev, { _sfLoaded: Date.now() }) : prev; });
        })
        .catch(function(e) {
          window.__simfinLoading[sym] = false;
          setDebugLog(function(prev) { return prev.concat([{
            time:  new Date().toISOString(),
            label: "SimFin prefetch -- CATCH ERROR: " + String(e),
            data:  null
          }]); });
        });
    })();

    // Fetch Massive.com data (news + ticker reference + dividends + splits)
    setAddlLoading(true);
    var debugEntries = [];
    debugEntries.push({ time: new Date().toISOString(), label: "Fetching /massive?sym=" + sym });
    var massiveHdrs = window.__clerkToken ? { "Authorization": "Bearer " + window.__clerkToken } : {};
    fetch("/massive?sym=" + (sym === "BRKB" ? "BRK-B" : sym), { headers: massiveHdrs })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        debugEntries.push({ time: new Date().toISOString(), label: "Massive response received", data: { newsCount: data && data.news ? data.news.length : 0, tickerName: data && data.ticker ? data.ticker.name : null, debug: data && data._debug } });
        // Set massiveInfo if we got any useful data back
        if (data && (data.news || data.ticker || data.dividends || data.indicators || data.aggs)) {
          setMassiveInfo(data);
          window.__curMassive = data;
          // Rule Based Analytics runs from the pre-compute useEffect instead.
          // Technical AI no longer auto-fires. runTechAi() is preserved but not called.
          /*
          var _tSym = sym; var _tData = data;
          var _techWait = 0;
          var _techWaitInterval = setInterval(function() {
            _techWait++;
            if (_techWait > 15) { clearInterval(_techWaitInterval); return; }
            if (window.__aiTechDone === _tSym || window.__aiTechRunning === _tSym) { clearInterval(_techWaitInterval); return; }
            var _isFT=FREE_TICKERS.indexOf(_tSym)!==-1;
            if (!window.__isPaid && !_isFT) return;
            clearInterval(_techWaitInterval);
            setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Tech TRIGGER (massive): "+_tSym, data:{price:window.__curPrice||0, waitAttempts:_techWait} }]); });
            runTechAi(_tSym, _tData, window.__curPrice||0, window.__msDots2||0, window.__msLabel2||"");
          }, 2000);
          */
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

  // -- Pre-fetch moat + financial for AI Analysis --
  useEffect(function() {
    if (!ov || !sym) return;
    var _isFTF=FREE_TICKERS.indexOf(sym)!==-1;
    if (!window.__isPaid && !_isFTF) return;
    // Pre-load moat — only if not already cached in state OR window cache
    var _alreadyCached = insightCache["moat"] || (window.__insightCache && window.__insightCache["moat"] && window.__insightCache["moat"].length > 10);
    if (!_alreadyCached && !insightLoading) fetchInsight("moat");
  }, [ov, sym]);

  // -- AI Analysis trigger: poll every 2s until all data ready --
  // -- AI Analysis triggers: independent polling for fund and tech ----------------
  useEffect(function() {
    if (!sym) return;
    var symSnap = sym; // snapshot sym so interval closure doesn't get stale

    // Fund AI: poll every 2s for up to 60s
    var fundAttempts = 0;
    var fundDone = false;
    var fundInterval = setInterval(function() {
      if (fundDone) { clearInterval(fundInterval); return; }
      fundAttempts++;
      if (fundAttempts > 30) { clearInterval(fundInterval); return; }
      // Wait for isPaid or free ticker
      var _isFTP=FREE_TICKERS.indexOf(symSnap)!==-1;
      if (!window.__isPaid && !_isFTP) return;
      // Stop if already running or done
      if (window.__aiFundRunning === symSnap) return;
      if (window.__aiFundDone === symSnap) { clearInterval(fundInterval); return; }
      // Technical AI fallback removed — analysis is now rule-based.
      var _ov2  = window.__curOv || null;
      var _mass = window.__curMassive || null;
      if (!_ov2 || !_mass) return;
      var _ic = window.__insightCache || {};
      var _pi = window.__parsedInsights || {};
      var moatReady  = _pi["moat"] && _pi["moat"].classification;
      var moatCached = _ic["moat"] && _ic["moat"].length > 10;
      // allReady: moat classification is sufficient — raw cache used only to enrich driver
      // sections if not already parsed, so don't block on it
      var allReady   = moatReady;
      if (!allReady && fundAttempts < 8) return; // max ~16s fallback instead of 40s
      fundDone = true;
      clearInterval(fundInterval);
      var curVals   = window.__curOracleSym === symSnap ? (window.__curVals||[]) : [];
      var curOracle = window.__curOracleSym === symSnap ? (window.__curOracle||"0") : "0";
      var curPrice  = window.__curPrice || (_ov2?_ov2._price:0) || 0;
      setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Fund TRIGGER: "+symSnap, data:{allReady:allReady,attempts:fundAttempts,price:curPrice} }]); });
      runFundAi(symSnap, _ov2, _pi, curVals, curOracle, curPrice, _ic);
    }, 2000);

    return function() {
      fundDone = true;
      clearInterval(fundInterval);
    };
  }, [sym]);

  // -- Write signal cache when ov + key values are ready -----------------------
  useEffect(function() {
    if (!ov || !q || !sym || !massiveInfo) return; // wait for massiveInfo so trend/mom are computed
    if (!window.__clerkToken) return;
    if (!window.__signalWritten) window.__signalWritten = {};
    if (window.__signalWritten[sym]) return; // only write once per session per ticker
    // Delay 2s to allow left-panel renders to compute window globals
    var t = setTimeout(function() {
      var ivStore  = window.__ivStore && window.__ivStore[sym];
      var finStr   = window.__computedFinStrength && window.__computedFinStrength[sym];
      var ivOracle = ivStore ? parseFloat(ivStore.oracle) : null;
      var price    = q.price || 0;
      var ivDiscount = (ivOracle && price > 0) ? ((ivOracle - price) / price * 100) : null;
      var moatData = parsedInsights && parsedInsights["moat"];
      var payload  = {
        moat:       moatData  ? moatData.classification : null,
        moatScore:  moatData  ? moatData.score          : null,
        fin:        finStr    ? finStr.classification   : null,
        finScore:   finStr    ? finStr.score            : null,
        iv:         ivOracle,
        ivDiscount: ivDiscount,
        trend:      window.__trendLabel  || null,
        trendScore: window.__trendScore  || null,
        mom:        window.__momLabel    || null,
        momScore:   window.__momScore    || null,
        updatedAt:  new Date().toISOString()
      };
      if (!payload.moat && !payload.fin && !payload.iv && !payload.trend) return;
      window.__signalWritten[sym] = true;
      fetch("/cache?sym=" + sym + "&tab=signal", {
        method:  "POST",
        headers: { "Content-Type": "text/plain", "Authorization": "Bearer " + window.__clerkToken },
        body:    JSON.stringify(payload)
      }).catch(function(){});
    }, 2000);
    return function() { clearTimeout(t); };
  }, [ov, parsedInsights, q, sym, massiveInfo]);

  // -- Fetch 1y candles for SMA cross detection after Massive loads -----------
  useEffect(function() {
    if (!massiveInfo || !sym) return;
    if (crossData && crossData.sym === sym) return;
    var ySym = sym === "BRKB" ? "BRK-B" : sym;
    fetch("/proxy?url=" + encodeURIComponent("https://query1.finance.yahoo.com/v8/finance/chart/" + ySym + "?interval=1d&range=2y"))
      .then(function(r){ return r.json(); })
      .then(function(data){
        var allC = data&&data.chart&&data.chart.result&&data.chart.result[0]&&data.chart.result[0].indicators&&data.chart.result[0].indicators.quote&&data.chart.result[0].indicators.quote[0]&&data.chart.result[0].indicators.quote[0].close||[];
        var closes = allC.filter(function(c){ return c!=null; });
        var n = closes.length;
        if (n < 201) { setCrossData({ sym:sym, type:"unknown", ageDays:null, gapDir:"unknown" }); return; }
        var s50n  = closes.slice(n-50).reduce(function(s,v){return s+v;},0)/50;
        var s200n = closes.slice(n-200).reduce(function(s,v){return s+v;},0)/200;
        var gapNow = (s50n-s200n)/s200n*100;
        var s50_10  = closes.slice(n-60,n-10).reduce(function(s,v){return s+v;},0)/50;
        var s200_10 = closes.slice(n-210,n-10).reduce(function(s,v){return s+v;},0)/200;
        var gap10   = (s50_10-s200_10)/s200_10*100;
        var gapDir  = gapNow>gap10+0.5?"improving":gapNow<gap10-0.5?"worsening":"stable";
        var crossType=null, crossAge=null;
        for (var i=n-1; i>=50; i--) {
          var s50t  = closes.slice(i-50, i).reduce(function(s,v){return s+v;},0)/50;
          var s200t = i>=200 ? closes.slice(i-200,i).reduce(function(s,v){return s+v;},0)/200 : null;
          var s50p  = closes.slice(i-51, i-1).reduce(function(s,v){return s+v;},0)/50;
          var s200p = (i-201>=0) ? closes.slice(i-201,i-1).reduce(function(s,v){return s+v;},0)/200 : null;
          if (s200t===null||s200p===null) continue; // not enough data for 200-SMA comparison
          if (s50p>s200p&&s50t<=s200t){ crossType="death";  crossAge=n-i; break; }
          if (s50p<s200p&&s50t>=s200t){ crossType="golden"; crossAge=n-i; break; }
        }
        // If no cross found in window, infer from current state
        if (!crossType) {
          crossType = gapNow < -0.5 ? "death" : gapNow > 0.5 ? "golden" : "none";
          crossAge  = null; // happened before our 1-year data window
        }
        // Gap direction for price vs SMA200 (today vs 10 days ago)
        var priceNow   = closes[n-1];
        var price10    = closes[n-11] || closes[n-1];
        var sma200_t0  = closes.slice(n-200).reduce(function(s,v){return s+v;},0)/200;
        var sma200_t10 = n>=210 ? closes.slice(n-210,n-10).reduce(function(s,v){return s+v;},0)/200 : sma200_t0;
        var s200gNow   = (priceNow - sma200_t0) / sma200_t0 * 100;
        var s200g10    = (price10  - sma200_t10) / sma200_t10 * 100;
        var sma200GapDir = s200gNow > s200g10 + 0.5 ? "improving" : s200gNow < s200g10 - 0.5 ? "worsening" : "stable";

        setCrossData({ sym:sym, type:crossType||"none", ageDays:crossAge, gapDir:gapDir, gapNow:gapNow, sma200GapDir:sma200GapDir });
        window.__crossDataDebug = { sym:sym, type:crossType||"none", ageDays:crossAge, gapDir:gapDir, gapNow:gapNow, sma200GapDir:sma200GapDir };
      })
      .catch(function(){ setCrossData({ sym:sym, type:"unknown", ageDays:null, gapDir:"unknown" }); });
  }, [massiveInfo, sym]);

  // -- Pre-compute all 4 sidebar signals via technicalSignals.js snapshot (single source of truth) --
  useEffect(function() {
    if (!massiveInfo || !sym || !q) return;
    try {
      // Build snapshot from Massive data — all technical calculations in technicalSignals.js
      var snap = buildTechnicalSnapshotFromMassive(sym, massiveInfo, q, ov, crossData);
      if (!snap) return;

      // Trend globals
      window.__trendScore    = snap.trend.score;
      window.__trendLabel    = snap.trend.status;
      window.__trendDots     = snap.trend.score>=70?5:snap.trend.score>=55?4:snap.trend.score>=40?3:snap.trend.score>=25?2:1;
      window.__trendScoreSym = sym;
      window.__trendCaution  = snap.cautionFlags.trendCaution;

      // Momentum globals
      window.__momScore    = snap.momentum.score;
      window.__momLabel    = snap.momentum.status;
      window.__momScoreSym = sym;
      window.__momCaution  = snap.cautionFlags.momCaution;

      // Reversal globals — sidebar status from calcReversalWatch via snapshot
      var rw = snap.reversalWatch;
      var bLbl  = getReversalDirectionStatus(rw.bullishSetupScore, rw.bullishTriggerScore, rw.bullishConfirmationScore, 'Bullish').label.replace('Reversal ','');
      var beLbl = getReversalDirectionStatus(rw.bearishSetupScore, rw.bearishTriggerScore, rw.bearishConfirmationScore, 'Bearish').label.replace('Reversal ','');
      if (!window.__revWatchStatus) window.__revWatchStatus = {};
      window.__revWatchStatus[sym] = { status: rw.status, bullScore: rw.bullishScore, bearScore: rw.bearishScore, reversalDecision: rw.reversalDecision || null };

      // Legacy reversal signal arrays (supporting detail for sidebar + AI prompt)
      var sa = rw.signalArray || {};
      var bArr  = sa.bullSignals || [false,false,false,false,false];
      var beArr = sa.bearSignals || [false,false,false,false,false];
      window.__revArr3     = bArr;
      window.__revBearArr3 = beArr;
      window.__revCount3   = sa.bullCount || 0;
      window.__revSym3     = sym;
      var wB = [3,2,2,1,1];
      var bSc  = bArr.reduce(function(s,v,i){return s+(v?wB[i]:0);},0);
      var beSc = beArr.reduce(function(s,v,i){return s+(v?wB[i]:0);},0);
      window.__revNetScore3 = bSc - beSc;

      // Volume signal globals
      var vs = snap.volumeSignals || {};
      window.__volBull     = vs.bullSignals || [false,false,false,false,false];
      window.__volBear     = vs.bearSignals || [false,false,false,false,false];
      window.__volSym      = sym;
      window.__volNetScore = vs.netScore || 0;

      // Massive composite score globals
      var ms = snap.massiveScore || {};
      window.__msDots2  = ms.dots  || 0;
      window.__msLabel2 = ms.label || '';
      window.__msDots   = ms.dots  || 0;
      window.__msScore  = ms.score || 0;

      // SMF tab-specific globals (calcSmf* functions — different from OBV-based calcSmartMoneyFlow)
      var rawAggs = massiveInfo.aggs || [];
      var smfVal  = validateSmfOHLCV(rawAggs);
      var smfBars = smfVal.validBars ? smfVal.validBars.slice().reverse() : [];
      var tSig = smfVal.canCalculateTodaySignal ? calcSmfTodaySignal(smfBars) : null;
      var fSig = smfBars.length >= 6  ? calcSmfFiveDaySignal(smfBars)   : null;
      var dSig = smfVal.hasThirtyDays ? calcSmfThirtyDaySignal(smfBars) : null;
      var smCard = calcSmfSummaryCard(tSig?tSig.score:0, fSig?fSig.score:0, dSig?dSig.score:0, tSig, fSig, dSig);
      if (smCard.primaryScore !== null) {
        if (!window.__smfScore) window.__smfScore = {};
        window.__smfScore[sym] = smCard;
      }

      // ── Rule Based Analytics — computed from enriched snapshot ─────────────
      // Augment snap with smCard.smartMoneyDecision so RBA uses new SMF model
      try {
        var rbaSnap = Object.assign({}, snap);
        if (smCard && smCard.smartMoneyDecision) {
          rbaSnap.smartMoneyFlow = Object.assign({}, rbaSnap.smartMoneyFlow, {
            smartMoneyDecision: smCard.smartMoneyDecision,
            todayLabel:         smCard.todayLabel,
            fiveDayLabel:       smCard.fiveDayLabel,
            thirtyDayLabel:     smCard.thirtyDayLabel,
          });
        }
        // Store the full enriched snap so the momLiveProfile re-run can augment it
        window.__rbaFullSnap = window.__rbaFullSnap || {};
        window.__rbaFullSnap[sym] = rbaSnap;
        // momentumProfile will be injected when momLiveProfile loads (separate useEffect)
        var rba = generateRuleBasedAnalytics(rbaSnap);
        if (rba) setRuleAnalytics(rba);
      } catch(rbaErr) { /* non-fatal */ }

    } catch(e) { /* pre-compute error — non-fatal */ }
  }, [massiveInfo, crossData, ov, q, sym]);

  // -- Write trend-signal cache (1-day TTL) using exact detail page formula ----
  useEffect(function() {
    if (!massiveInfo || !sym || !q) return;
    if (!window.__clerkToken) return;
    if (!window.__trendSignalWritten) window.__trendSignalWritten = {};
    if (window.__trendSignalWritten[sym]) return;
    var t = setTimeout(function() {
      var tLabel = window.__trendLabel;
      var tScore = window.__trendScore;
      var mLabel = window.__momLabel;
      var mScore = window.__momScore;
      if (!tLabel && !mLabel) return;
      // Also include Reversal and SMF status for AI Favourites table (set by pre-compute useEffect)
      var revSt  = window.__revWatchStatus && window.__revWatchStatus[sym] ? window.__revWatchStatus[sym].status : null;
      var revSc  = window.__revWatchStatus && window.__revWatchStatus[sym] ? (window.__revWatchStatus[sym].bullScore || 0) : null;
      var smfSt  = window.__smfScore && window.__smfScore[sym] ? window.__smfScore[sym].status : null;
      window.__trendSignalWritten[sym] = true;
      fetch("/cache?sym=" + sym + "&tab=trend-signal", {
        method:  "POST",
        headers: { "Content-Type": "text/plain", "Authorization": "Bearer " + window.__clerkToken },
        body:    JSON.stringify({ trendLabel:tLabel, trendScore:tScore, momLabel:mLabel, momScore:mScore,
                                  revStatus:revSt, revScore:revSc, smfStatus:smfSt,
                                  revSource:'massive',
                                  updatedAt:new Date().toISOString() })
      }).catch(function(){});
    }, 3000);
    return function() { clearTimeout(t); };
  }, [massiveInfo, sym, q]);

  // -- Admin tab data load -----------------------------------------------------
  useEffect(function() {
    if (insightTab !== "admin") return;
    var t0 = Date.now();
    setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Admin tab -- fetching config + stats" }]); });
    fetch("/cache?action=config")
      .then(function(r) { return r.json(); })
      .then(function(cfg) {
        setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Config fetched", data: cfg }]); });
        var newCfg = (cfg && cfg.ok && Array.isArray(cfg.value)) ? cfg.value : ["NVDA","AAPL","MSFT","AMZN","GOOGL","AVGO","META","TSLA","LLY","BRKB"];
        setAdminCfg(newCfg);
        window.__adminCfg = newCfg;
      })
      .catch(function(e) {
        setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Config fetch ERROR: " + String(e) }]); });
      });
    fetch("/cache?action=stats")
      .then(function(r) { return r.json(); })
      .then(function(stats) {
        var newStats = {};
        if (stats && Array.isArray(stats.keys)) {
          stats.keys.forEach(function(k) {
            newStats[k.key] = { cachedAt: k.cachedAt, size: k.size, exists: true };
          });
        }
        // Merge: preserve any entries populated by cache HITs not yet in KV stats
        setAdminStats(function(prev) {
          return Object.assign({}, prev, newStats);
        });
        // Build per-ticker cache summary for debug log
        var FREE_LOG = ["NVDA","AAPL","MSFT","AMZN","GOOGL","AVGO","META","TSLA","LLY","BRKB"];
        var AI_TABS_LOG = ["moat"];
        var summary = FREE_LOG.map(function(t) {
          var tabs = AI_TABS_LOG.map(function(tab) {
            var meta = newStats["insight:" + t + ":" + tab];
            if (!meta || (!meta.exists && !meta.cachedAt)) return tab + ":NO";
            if (!meta.cachedAt) return tab + ":EXISTS(no date)";
            var age = Math.round((Date.now() - new Date(meta.cachedAt).getTime()) / 60000);
            return tab + ":OK(" + (age < 60 ? age + "m" : Math.round(age/60) + "h") + ")";
          });
          return t + " [" + tabs.join(" ") + "]";
        });
        setDebugLog(function(prev) { return prev.concat([
          { time: new Date().toISOString(), label: "Stats fetched in " + (Date.now()-t0) + "ms -- " + (stats.count || 0) + " entries" },
          { time: new Date().toISOString(), label: "Cache status per ticker", data: summary }
        ]); });
      })
      .catch(function(e) {
        setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "Stats fetch ERROR: " + String(e) }]); });
      });
  }, [insightTab]);

  // ── Run 6N: auto-compute current Momentum Profile (runs on stock load) ──────
  useEffect(function() {
    if (!sym || !massiveInfo) return;
    if (momLiveSym === sym && momLiveProfile) return; // already have it
    setMomLiveLoading(true);
    var endMs = Date.now();
    var startMs = endMs - 2 * 365 * 24 * 3600 * 1000;
    var fmt = function(d){ var dd=new Date(d); return dd.getFullYear()+'-'+('0'+(dd.getMonth()+1)).slice(-2)+'-'+('0'+dd.getDate()).slice(-2); };
    fetchYahooHistoricalBars(sym, fmt(startMs), fmt(endMs), 20)
      .then(function(bars) {
        if (!bars || bars.length < 70) throw new Error('Not enough data');
        setMomYahooBars(bars);
        var wMom = calcWeeklyMomentum(buildWeeklyBars(bars));
        var mMom = calcMonthlyMomentum(buildMonthlyBars(bars));
        var daily = window.__momLabel || 'Neutral';
        var dailyScore = window.__momScore != null ? window.__momScore : 50;
        var profile = classifyMomentumProfile(daily, wMom.status);
        var monthlyRegime = classifyMonthlyRegime(mMom.status);
        setMomLiveProfile({
          daily: daily, dailyScore: dailyScore,
          weekly: wMom.status, weeklyScore: wMom.score,
          weeklyRsi: wMom.rsi14, weeklyRsiDir: wMom.rsiDirection,
          weeklyMacdHist: wMom.macdHistogram, weeklyMacdDir: wMom.macdDirection,
          weeklyPrevMacdHist: wMom.previousMacdHistogram,
          weeklyPriceVsSma10: wMom.priceVsSma10Pct, weeklyRoc: wMom.roc4wPct,
          monthly: mMom.status, monthlyScore: mMom.score,
          monthlyRsi: mMom.rsi14, monthlyRsiDir: mMom.rsiDirection,
          monthlyMacdHist: mMom.macdHistogram, monthlyMacdDir: mMom.macdDirection,
          monthlyPrevMacdHist: mMom.previousMacdHistogram,
          monthlyPriceVsSma10: mMom.priceVsSma10Pct, monthlyRoc: mMom.roc3mPct,
          profile: profile, monthlyRegime: monthlyRegime,
        });
        setMomLiveSym(sym);
      })
      .catch(function(e) {
        setMomLiveProfile({
          daily: window.__momLabel||'Neutral', dailyScore: window.__momScore||50,
          weekly:'Not Enough Data', monthly:'Not Enough Data',
          profile:'Not Enough Data', monthlyRegime:'Not Enough Data',
        });
        setMomLiveSym(sym);
      })
      .then(function(){ setMomLiveLoading(false); });
  }, [sym, massiveInfo]);

  // ── Re-run Rule Based Analytics when Momentum Profile loads ───────────────
  // momLiveProfile is fetched async; when it arrives, re-run RBA so momentum
  // classification uses the Momentum Profile rather than daily-only status.
  useEffect(function() {
    if (!sym || !momLiveProfile || momLiveSym !== sym) return;
    // Use the full augmented snap stored by the massiveInfo useEffect, so
    // calculateKeyLevels has access to ohlcv, indicators, meta, and price.
    var fullSnap = window.__rbaFullSnap && window.__rbaFullSnap[sym];
    if (!fullSnap) return; // full snap not yet ready — massiveInfo runs first
    var smfCard2  = window.__smfScore && window.__smfScore[sym] ? window.__smfScore[sym] : null;
    var revGlobal = window.__revWatchStatus && window.__revWatchStatus[sym];
    try {
      var rbaSnap2 = Object.assign({}, fullSnap, {
        momentumProfile: momLiveProfile,
      });
      // Patch in latest reversal global (may have updated since massiveInfo ran)
      if (revGlobal) {
        rbaSnap2.reversalWatch = Object.assign({}, rbaSnap2.reversalWatch, {
          status: revGlobal.status,
          reversalDecision: revGlobal.reversalDecision || rbaSnap2.reversalWatch && rbaSnap2.reversalWatch.reversalDecision || null,
        });
      }
      // Patch in latest smCard
      if (smfCard2 && smfCard2.smartMoneyDecision) {
        rbaSnap2.smartMoneyFlow = Object.assign({}, rbaSnap2.smartMoneyFlow, {
          smartMoneyDecision: smfCard2.smartMoneyDecision,
        });
      }
      var rba2 = generateRuleBasedAnalytics(rbaSnap2);
      if (rba2) setRuleAnalytics(rba2);
    } catch(e) { /* non-fatal */ }
  }, [momLiveProfile, momLiveSym]);

  // -- Insight tab fetch -------------------------------------------------------
  function fetchInsight(tabId) {
    // Guard: don't fetch if already in React state OR window cache
    if (insightCache[tabId] || insightLoading) return;
    if (window.__insightCache && window.__insightCache[tabId] && window.__insightCache[tabId].length > 10) return;
    setInsightLoading(true);

    var prompts = {
      business: "You are a professional equity research analyst. For the stock " + sym + " (" + (NAMES[sym]||sym) + "), write a concise Business Overview covering: what the company does, how it makes money, key products or services, major competitors, and overall industry position. Be analytical and factual. Use plain text paragraphs, no markdown headers.",

      moat: (function() {
        var _fc2 = (function() {
          if (!ov) return "";
          var _l2 = [];
          if (ov.grossMargin > 0)   _l2.push("Gross margin: " + ov.grossMargin.toFixed(1) + "%");
          if (ov.opMargin > 0)      _l2.push("Operating margin: " + ov.opMargin.toFixed(1) + "%");
          if (ov.revGrowth !== 0)   _l2.push("Revenue growth YoY: " + ov.revGrowth.toFixed(1) + "%");
          if (ov.beta > 0)          _l2.push("Beta: " + ov.beta.toFixed(2));
          if (ov.recBuy > 0 || ov.recHold > 0 || ov.recSell > 0)
            _l2.push("Analyst consensus: " + ov.recBuy + " buy / " + ov.recHold + " hold / " + ov.recSell + " sell");
          if (ov.fcfRaw && ov.sharesOut > 0)
            _l2.push("Free cash flow: $" + (ov.fcfRaw / 1e6).toFixed(0) + "M");
          if (_l2.length === 0) return "";
          return "\n\nFinancial context (use these figures to ground your scores, do not contradict them):\n" + _l2.join("\n");
        })();
        return "You are a professional equity research analyst. Analyze the economic moat of " + sym + " (" + (NAMES[sym]||sym) + ") using only well-known business fundamentals and observable financial indicators. Do not fabricate statistics or unsupported claims. Scoring guide: 5/5 = world-class dominant moat (e.g. Microsoft, Visa, Moody's level). 4/5 = strong durable advantage. 3/5 = moderate. 2/5 = narrow. 1/5 = weak or none. Be objective -- top companies deserve high scores." + _fc2 + "\n\nReturn results in EXACTLY this format:\n\nNetwork Effects: X/5\nAssessment Criteria: The product or platform becomes more valuable as more users join.\nResult: One sentence explaining the score.\n\nSwitching Costs: X/5\nAssessment Criteria: Customers face difficulty, cost, or disruption when changing to competitors.\nResult: One sentence explaining the score.\n\nCost Advantage: X/5\nAssessment Criteria: The company can operate at lower cost or higher efficiency than competitors.\nResult: One sentence explaining the score.\n\nIntangible Assets: X/5\nAssessment Criteria: Brand, patents, intellectual property, regulatory licenses, or proprietary technology.\nResult: One sentence explaining the score.\n\nEfficient Scale: X/5\nAssessment Criteria: The market only supports a few profitable players due to high barriers to entry.\nResult: One sentence explaining the score.\n\nEcosystem Lock-in: X/5\nAssessment Criteria: Customers rely on multiple integrated products or services within the company ecosystem.\nResult: One sentence explaining the score.\n\nEconomic Moat Rating: X / 5\n\nExplanation (maximum 100 words): Summarize the main competitive advantages. Focus only on the most important moat drivers. Assign 5/5 generously where the advantage is genuinely world-class and durable.";
      })(),

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
        // Don't overwrite existing good content with a failed/empty response
        if (!text || text.length < 20) {
          setInsightLoading(false);
          return;
        }
        setInsightCache(function(prev) {
          // Don't overwrite if already has good content
          if (prev[tabId] && prev[tabId].length > 20 && !prev[tabId].includes("unavailable")) return prev;
          var next = {};
          Object.keys(prev).forEach(function(k) { next[k] = prev[k]; });
          next[tabId] = text;
          window.__insightCache = next;
          return next;
        });
        setInsightLoading(false);
      }).catch(function() {
        setInsightLoading(false); // Don't write "unavailable" — silently fail
      });
  }

    const price = q ? q.price : 0;
  window.__curPrice = price;
  if (ov) { window.__curOv = ov; window.__curOv._price = price; window.__curOv._sym = sym; }
  const up    = q ? q.pct >= 0 : true;
  const sign  = up ? "+" : "";
  const chg   = q ? sign + q.change.toFixed(2) + " (" + sign + q.pct.toFixed(2) + "%)" : "-";

  const pe  = ov ? ov.pe  : 0;
  const fpe = ov ? ov.fpe : 0;
  const eps = (pe > 0 && price > 0) ? price / pe : 0;
  const gr  = Math.max(ov ? (ov.epsG || 5) : 5, 2) / 100;

  // v1.13 Option A: moat classification derived from AI weighted score, not PE ratio
  var _aiMoat  = parsedInsights["moat"] || {};
  const moat   = _aiMoat.classification || "-";
  const moatBg = moat === "Wide" ? "#1a6a1a" : moat === "Narrow" ? "#b88000" : "#444";
  const moatFg = (moat === "Wide" || moat === "Narrow") ? "#fff" : "#888";

  // Get Clerk auth header for premium API calls
  function getAuthHeaders() {
    var headers = { "Content-Type": "application/json" };
    if (window.Clerk && window.Clerk.session) {
      window.Clerk.session.getToken().then(function(token) {
        if (token) headers["Authorization"] = "Bearer " + token;
      });
    }
    return headers;
  }

  async function getAuthHeadersAsync() {
    var headers = { "Content-Type": "application/json" };
    try {
      if (window.Clerk && window.Clerk.session) {
        var token = await window.Clerk.session.getToken();
        if (token) headers["Authorization"] = "Bearer " + token;
      }
    } catch(e) {}
    return headers;
  }

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

  // 2) Growth rate logic:
  // Y1-5: positive-streak CAGR (primary)
  //   -> if CAGR > 25%: fallback to analyst ltG (capped 25%)
  //   -> if streak < 3yr: fallback to analyst ltG (capped 25%)
  //   -> if no analyst: use capped CAGR
  // Y6-10: analyst ltG1Y (capped 25%), fallback Y1-5 x 50%
  var GROWTH_CAP = 0.25;
  var histGrowthRate = gr; // will be overridden below
  var histCagrYears  = 0;
  var histCagrRaw    = 0;  // raw uncapped streak CAGR (for reference)
  var histG1Source   = ""; // label for Y1-5
  var histG2Rate     = 0;
  var histG2Source   = "";
  if (epsHistory && epsHistory.length >= 2) {
    var sorted = epsHistory.slice().sort(function(a, b) { return b.year - a.year; });
    // Build consecutive positive streak from newest backwards
    var streak = [];
    for (var si = 0; si < sorted.length; si++) {
      if (sorted[si].eps > 0) { streak.push(sorted[si]); }
      else { break; }
    }
    if (streak.length >= 3) {
      var streakNewest = streak[0].eps;
      var streakOldest = streak[streak.length - 1].eps;
      var streakYears  = streak.length - 1;
      var streakCagr   = Math.pow(streakNewest / streakOldest, 1 / streakYears) - 1;
      histCagrRaw      = streakCagr;
      histCagrYears    = streakYears;
      if (streakCagr <= GROWTH_CAP) {
        // CAGR <= 25% -- use directly
        histGrowthRate = streakCagr;
        histG1Source   = streakYears + "-yr positive CAGR)";
      } else {
        // CAGR > 25% -- fall back to analyst ltG, hard cap 25% regardless
        if (ov && ov.ltG > 0) {
          var analystG1  = ov.ltG / 100;
          histGrowthRate = Math.min(analystG1, GROWTH_CAP);
          histG1Source   = analystG1 > GROWTH_CAP
            ? "CAGR>" + (streakCagr*100).toFixed(0) + "%, analyst>" + (analystG1*100).toFixed(0) + "%, capped 25%)"
            : "CAGR>" + (streakCagr*100).toFixed(0) + "%, analyst est.)";
        } else {
          // No analyst -- hard cap
          histGrowthRate = GROWTH_CAP;
          histG1Source   = "CAGR capped 25%)";
        }
      }
    } else {
      // Streak < 3yr -- fall back to analyst ltG, hard cap 25%
      if (ov && ov.ltG > 0) {
        var analystG1sc  = ov.ltG / 100;
        histGrowthRate   = Math.min(analystG1sc, GROWTH_CAP);
        histG1Source     = analystG1sc > GROWTH_CAP
          ? "streak<3yr, analyst capped 25%)"
          : "streak<3yr, analyst est.)";
        histCagrYears    = -1;
      } else {
        histGrowthRate = Math.min(gr, GROWTH_CAP);
        histG1Source   = "streak<3yr, capped 25%)";
        histCagrYears  = -1;
      }
    }
  } else if (ov && ov.ltG > 0) {
    // No EPS history -- analyst ltG, hard cap 25%
    var analystG1nh  = ov.ltG / 100;
    histGrowthRate   = Math.min(analystG1nh, GROWTH_CAP);
    histG1Source     = analystG1nh > GROWTH_CAP ? "analyst capped 25%)" : "analyst est.)";
    histCagrYears    = -1;
  }
  // Y6-10: analyst ltG1Y if available, hard cap 25%; else Y1-5 x 50%
  if (ov && ov.ltG1Y > 0) {
    var analystG2  = ov.ltG1Y / 100;
    histG2Rate     = Math.min(analystG2, GROWTH_CAP);
    histG2Source   = analystG2 > GROWTH_CAP ? "linear decay 25%->4%)" : "linear decay " + (histG2Rate*100).toFixed(0) + "%->4%)";
  } else {
    histG2Rate   = histGrowthRate * 0.50;
    histG2Source = "linear decay " + (histG2Rate*100).toFixed(0) + "%->4%)";
  }

  // 3) Beta-adjusted WACC: risk-free 4.2% + beta x 3.5%, clamped 6%-10%
  var beta = ov ? (ov.beta || 1.0) : 1.0;
  var WACC_ADJ = Math.min(Math.max(0.042 + beta * 0.035, 0.06), 0.10); // clamp 6%-10%

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
  // Hoist shared vars so breakdown IIFE can access them even when vals block doesn't run
  // g1Sum = Y1-5 growth %; g2Sum = Y6-10 growth % -- both already capped at 25%
  var g1Sum = histGrowthRate * 100;  // as percentage e.g. 19.0
  var g2Sum = histG2Rate * 100;      // as percentage e.g. 13.5
  var rawCagrSum = g1Sum;            // kept for breakdown label compatibility
  var histCagrLabel = histG1Source || (histCagrYears > 0 ? histCagrYears + "-yr positive CAGR)" : "analyst est.)");
  // Safe defaults for shared calc objects (null = breakdown section won't render)
  var dcf20Calc = null; var dcff20Calc = null; var dni20Calc = null; var ggCalc = null;
  var psCalcIV = price || 0; var psCalcRatio = 0; var psCalcRevPS = 0; var psCalcRevSrc = "";
  const vals = [];
  var pegVal = 0;
  var _pegGrowth = 0;
  var _pegFairPE = 0;
  if (ov && baseEps > 0 && price > 0) {
    const termGrowth = 0.04;
    const grCapped   = Math.min(histGrowthRate, 0.25);
    const maxVal     = price * 3;
    const cap        = function(v) { return Math.min(v, maxVal); };

    // Get SimFin debt and cash for accurate DCF
    var sfDebtSum = 0; var sfCashSum = ov.cash || 0;
    var sfBalSum = window.__simfinData && window.__simfinData[sym];
    if (sfBalSum && sfBalSum.balance && Array.isArray(sfBalSum.balance) && sfBalSum.balance[0]) {
      var sfStmtSum = sfBalSum.balance[0].statements && sfBalSum.balance[0].statements[0];
      if (sfStmtSum && sfStmtSum.columns && sfStmtSum.data && sfStmtSum.data.length > 0) {
        var sfColsSum = sfStmtSum.columns;
        var sfRowSum  = sfStmtSum.data[sfStmtSum.data.length - 1];
        function sfGetSum(n) { var ci = sfColsSum.indexOf(n); return (ci !== -1 && sfRowSum[ci] !== null) ? sfRowSum[ci] : null; }
        var ltd = sfGetSum("Long Term Debt") || 0;
        var std = sfGetSum("Short Term Debt") || 0;
        if (ltd + std > 0) sfDebtSum = ltd + std;
        var sc = sfGetSum("Cash, Cash Equivalents & Short Term Investments");
        if (sc !== null) sfCashSum = sc;
      }
    }

    // Single source of truth: compute all IV methods once, shared by bar + breakdown
    var ocfSum    = ov.ocfRaw > 0 ? ov.ocfRaw : ov.fcfRaw;
    var sharesSum = ov.sharesOut || 1;
    var g1r = g1Sum / 100; var g2r = g2Sum / 100;

    // Shared NI base (Yahoo then SimFin fallback)
    var niBaseSum = ov.niRaw > 0 ? ov.niRaw : 0;
    var niSrcSum  = niBaseSum > 0 ? "Yahoo" : "SimFin";
    if (!niBaseSum && sfBalSum && sfBalSum.income && Array.isArray(sfBalSum.income) && sfBalSum.income[0]) {
      var sfIncS = sfBalSum.income[0].statements && sfBalSum.income[0].statements[0];
      if (sfIncS && sfIncS.columns && sfIncS.data && sfIncS.data.length > 0) {
        var sfICols = sfIncS.columns; var sfIRow = sfIncS.data[sfIncS.data.length - 1];
        function sfGetI(n) { var ci = sfICols.indexOf(n); return (ci !== -1 && sfIRow[ci] !== null) ? sfIRow[ci] : null; }
        var sfNIS = sfGetI("Net Income") || sfGetI("Net Income Available to Common Shareholders");
        if (sfNIS && sfNIS > 0) { niBaseSum = sfNIS; niSrcSum = "SimFin"; }
      }
    }

    // Helper: DCF EV over 20 years
    // Y1-5: flat g1p
    // Y6-10: linear decay from g2p (start) to termGrowth (end)
    //   Y6=g2p, Y7=g2p-step, Y8=g2p-2*step, Y9=g2p-3*step, Y10=termGrowth
    //   where step = (g2p - termGrowth) / 4
    // Y11-20: flat termGrowth
    // disc: WACC_ADJ (beta-adjusted, 6%-10%)
    function calcEVSum(base, g1p, g2p, disc) {
      var ev = 0; var f = base;
      var decayStep = (g2p - termGrowth) / 4;
      for (var y = 1; y <= 20; y++) {
        var g;
        if (y <= 5) {
          g = g1p;
        } else if (y <= 10) {
          g = g2p - decayStep * (y - 6);
        } else {
          g = termGrowth;
        }
        f *= (1 + g); ev += f / Math.pow(1 + disc, y);
      }
      return ev;
    }

    // DCF-20 (OCF based, debt/cash bridge)
    var dcf20Calc = (function() {
      if (!ocfSum || !sharesSum) return null;
      var ev     = calcEVSum(ocfSum, g1r, g2r, WACC_ADJ);
      var equity = ev - sfDebtSum + sfCashSum;
      return { ocf: ocfSum, debt: sfDebtSum, cash: sfCashSum, shares: sharesSum,
               ev: ev, equity: equity, perShare: equity / sharesSum, disc: WACC_ADJ };
    })();
    const dcf20 = dcf20Calc ? cap(dcf20Calc.perShare) : 0;

    // DCFF-20 (NI based, debt/cash bridge)
    var dcff20Calc = (function() {
      if (!niBaseSum || !sharesSum) return null;
      var ev     = calcEVSum(niBaseSum, g1r, g2r, WACC_ADJ);
      var equity = ev - sfDebtSum + sfCashSum;
      return { niBase: niBaseSum, niSrc: niSrcSum, debt: sfDebtSum, cash: sfCashSum, shares: sharesSum,
               ev: ev, equity: equity, perShare: equity / sharesSum, disc: WACC_ADJ };
    })();
    const dcff20 = dcff20Calc ? cap(dcff20Calc.perShare) : 0;

    // DNI-20 (NI per share, no debt bridge)
    var niDNISum = niBaseSum > 0 ? niBaseSum / sharesSum
                : ov.niRaw > 0  ? ov.niRaw  / sharesSum
                : baseEps > 0   ? baseEps * 0.90 : 0;
    var dni20Calc = (function() {
      if (!niDNISum) return null;
      var ev = 0; var f = niDNISum;
      var dniDecayStep = (g2r - termGrowth) / 4;
      for (var y = 1; y <= 20; y++) {
        var g;
        if (y <= 5) { g = g1r; }
        else if (y <= 10) { g = g2r - dniDecayStep * (y - 6); }
        else { g = termGrowth; }
        f *= (1 + g); ev += f / Math.pow(1 + WACC_ADJ, y);
      }
      return { niPerShare: niDNISum, niSrc: niSrcSum, shares: sharesSum, perShare: ev, disc: WACC_ADJ };
    })();
    const dni20 = dni20Calc ? cap(dni20Calc.perShare) : 0;

    // Gordon Growth / DCFF-Terminal (FCF per share, PV explicit + terminal)
    var ggCalc = (function() {
      if (!sharesSum) return null;
      var fcfBase = ov.fcfRaw > 0 ? ov.fcfRaw : (ocfSum > 0 ? ocfSum * 0.6 : 0);
      if (!fcfBase) return null;
      var fcfPS = fcfBase / sharesSum;
      var pvExp = 0; var fGG = fcfPS;
      var ggDecayStep = (g2r - termGrowth) / 4;
      for (var gy = 1; gy <= 20; gy++) {
        var ggy;
        if (gy <= 5) { ggy = g1r; }
        else if (gy <= 10) { ggy = g2r - ggDecayStep * (gy - 6); }
        else { ggy = termGrowth; }
        fGG *= (1 + ggy); pvExp += fGG / Math.pow(1 + WACC_ADJ, gy);
      }
      var tv   = fGG * (1 + termGrowth) / (WACC_ADJ - termGrowth);
      var pvTv = tv / Math.pow(1 + WACC_ADJ, 20);
      return { fcfBase: fcfBase, fcfPS: fcfPS, pvExplicit: pvExp,
               fcfAt20: fGG, tv: tv, pvTv: pvTv, total: pvExp + pvTv, disc: WACC_ADJ };
    })();
    const dcffT = ggCalc ? cap(ggCalc.total) : 0;
    // PS: compute once here, shared by both bar chart and breakdown IIFE
    // 1) SimFin Revenue / sharesOut  2) Price / ov.ps  3) price
    var psCalcSimfinRev = 0;
    if (sfBalSum && sfBalSum.income && Array.isArray(sfBalSum.income) && sfBalSum.income[0]) {
      var sfPSIncC = sfBalSum.income[0].statements && sfBalSum.income[0].statements[0];
      if (sfPSIncC && sfPSIncC.columns && sfPSIncC.data && sfPSIncC.data.length > 0) {
        var sfPSRIC = sfPSIncC.columns.indexOf("Revenue");
        var sfPSRRC = sfPSIncC.data[sfPSIncC.data.length - 1];
        if (sfPSRIC !== -1 && sfPSRRC[sfPSRIC] !== null && sfPSRRC[sfPSRIC] > 0) psCalcSimfinRev = sfPSRRC[sfPSRIC];
      }
    }
    var psCalcShares  = ov.sharesOut || 1;
    var psCalcRevPS   = psCalcSimfinRev > 0 && psCalcShares > 0
      ? psCalcSimfinRev / psCalcShares
      : (ov.ps > 0 && price > 0) ? price / ov.ps
      : 0;
    var psCalcRevSrc  = psCalcSimfinRev > 0 ? "SimFin Rev / Shares" : ov.ps > 0 ? "Price / PS" : "";
    var psCalcIV      = psCalcRevPS > 0 && ov.ps > 0 ? cap(ov.ps * psCalcRevPS) : price > 0 ? cap(price) : 0;
    var psCalcRatio   = ov.ps > 0 ? ov.ps : 0;
    const ps = psCalcIV;
    // PEG-based IV: fair P/E = EPS growth rate (Peter Lynch rule)
    // IV = EPS x fair P/E, where fair P/E = growth rate (capped at 25)
    _pegGrowth = ov.epsG > 0 ? ov.epsG : (ov.ltG > 0 ? ov.ltG : 0);
    _pegFairPE = Math.min(_pegGrowth, 25);  // cap fair P/E at 25x
    pegVal = (ov.peg > 0 && baseEps > 0 && _pegFairPE > 0)
      ? Math.min(baseEps * _pegFairPE, maxVal)
      : 0;

    // --- Sector detection ---
    var _ivSector = ov.sector || "";
    var _ivIsTech     = _ivSector.includes("Technology") || _ivSector.includes("Communication");
    var _ivIsHealth   = _ivSector.includes("Healthcare") || _ivSector.includes("Health");
    var _ivIsFinancial= _ivSector.includes("Financial");
    var _ivIsEnergy   = _ivSector.includes("Energy") || _ivSector.includes("Basic Materials");
    var _ivIsUtility  = _ivSector.includes("Utilities") || _ivSector.includes("Real Estate");
    var _ivIsConsumer = _ivSector.includes("Consumer") || _ivSector.includes("Retail");
    var _ivIsIndustrial = _ivSector.includes("Industrial");

    // Is the company profitable? (at least one DCF base is positive)
    var _ivIsProfitable = (dcf20 > 0 || dcff20 > 0 || dni20 > 0);

    // --- Sector model applicability map ---
    // true = include in average, false = grey out as "not applicable for sector"
    var MODEL_APPLICABLE = {
      "Cash Flow Model":   !_ivIsFinancial && !_ivIsUtility,
      "Earnings Model":    !_ivIsUtility,
      "Net Income Model":  true,
      "Gordon Growth":     true,
      "Revenue PS":        _ivIsTech || _ivIsConsumer || _ivSector === "",

      "EV/Revenue":        !_ivIsProfitable,
      "Revenue DCF":       !_ivIsProfitable,
      "Price/Book":        _ivIsFinancial || (!_ivIsProfitable),
    };

    // --- Compute new models ---

    // EV/Revenue model (for unprofitable companies)
    var evRevVal = 0;
    var evRevMultiple = _ivIsHealth ? 6 : _ivIsTech ? 10 : _ivIsConsumer ? 2 : _ivIsFinancial ? 3 : _ivIsUtility ? 2 : 3;
    var revTotal = (function(){
      // Try to get total revenue from simfin, then yahoo
      if (sfBalSum && sfBalSum.income && Array.isArray(sfBalSum.income) && sfBalSum.income[0]) {
        var sfInc = sfBalSum.income[0].statements && sfBalSum.income[0].statements[0];
        if (sfInc && sfInc.columns && sfInc.data && sfInc.data.length > 0) {
          var ri = sfInc.columns.indexOf("Revenue");
          var rr = sfInc.data[sfInc.data.length-1];
          if (ri !== -1 && rr[ri] > 0) return rr[ri];
        }
      }
      if (ov.fcfRaw && ov.ps > 0 && price > 0) return (price / ov.ps) * sharesSum;
      return 0;
    })();
    if (MODEL_APPLICABLE["EV/Revenue"] && revTotal > 0 && sharesSum > 0) {
      var revPS = revTotal / sharesSum;
      evRevVal = cap(evRevMultiple * revPS);
    }

    // Revenue DCF model (for unprofitable companies)
    var revDcfVal = 0;
    var targetMargin = _ivIsTech ? 0.25 : _ivIsHealth ? 0.08 : _ivIsConsumer ? 0.05 : _ivIsFinancial ? 0.15 : 0.08;
    if (MODEL_APPLICABLE["Revenue DCF"] && revTotal > 0 && sharesSum > 0) {
      var revGrR  = ov.revGrowth > 0 ? Math.min(ov.revGrowth / 100, 0.40) : 0.10;
      var revDecStep = (revGrR * 0.5 - termGrowth) / 4;
      var revPerSh = revTotal / sharesSum;
      var evRev = 0; var fRev = revPerSh * targetMargin;
      for (var ry = 1; ry <= 20; ry++) {
        var rg;
        if (ry <= 5) rg = revGrR;
        else if (ry <= 10) rg = revGrR * 0.5 - revDecStep * (ry - 6);
        else rg = termGrowth;
        fRev *= (1 + rg); evRev += fRev / Math.pow(1 + WACC_ADJ, ry);
      }
      revDcfVal = cap(evRev);
    }

    // Price/Book model
    var pbVal = 0;
    var sectorPB = _ivIsFinancial ? 1.2 : _ivIsHealth ? 3.0 : _ivIsConsumer ? 2.0 : 1.5;
    if (MODEL_APPLICABLE["Price/Book"] && ov.bookValue > 0 && sharesSum > 0) {
      var bvps = ov.bookValue / sharesSum;
      pbVal = cap(sectorPB * bvps);
    }

    // --- Build vals with sector awareness ---
    // Each entry: { label, value, color, applicable, reason }
    // applicable = true -> include in chart + average
    // applicable = false -> grey out as "not applicable for sector"
    // value = 0 AND applicable = true -> show as "N/A - insufficient data"

    var ALL_MODELS = [
      { key:"Cash Flow Model",  label:"Cash Flow Model (20Y)",       value:dcf20,   color:"#d4a800" },
      { key:"Earnings Model",   label:"Earnings Model (20Y)",        value:dcff20,  color:"#d4a800" },
      { key:"Net Income Model", label:"Net Income Model (20Y)",      value:dni20,   color:"#d4a800" },
      { key:"Gordon Growth",    label:"Gordon Growth Model",         value:dcffT,   color:"#d4a800" },
      { key:"Revenue PS",       label:"Revenue Valuation (PS)",      value:ps,      color:"#d4a800" },

      { key:"EV/Revenue",       label:"EV / Revenue Model",          value:evRevVal,color:"#5b8dde" },
      { key:"Revenue DCF",      label:"Revenue DCF Model",           value:revDcfVal,color:"#5b8dde" },
      { key:"Price/Book",       label:"Price / Book Model",          value:pbVal,   color:"#5b8dde" },
    ];

    // Filter: applicable + has value -> include in average
    ALL_MODELS.forEach(function(m) {
      m.applicable = MODEL_APPLICABLE[m.key] !== false;
    });

    // Push only applicable + valid models into vals for bar chart + average
    var modelsMeta = []; // full list for display
    ALL_MODELS.forEach(function(m) {
      if (m.applicable && m.value > 0) {
        vals.push({ label:m.label, value:m.value, color:m.color });
        modelsMeta.push({ label:m.label, value:m.value, status:"ok", color:m.color });
      } else if (m.applicable && m.value <= 0) {
        modelsMeta.push({ label:m.label, value:0, status:"nodata", color:m.color });
      } else {
        modelsMeta.push({ label:m.label, value:0, status:"na", color:m.color });
      }
    });

    // Average only over valid applicable models
    const oracleAvg = vals.length > 0
      ? vals.reduce(function(sum, v) { return sum + v.value; }, 0) / vals.length
      : 0;
    oracle = oracleAvg.toFixed(2);
    window.__curOracle = oracle;
    window.__curOracleSym = sym;
    window.__curVals = vals;
    if (oracleAvg > 0) {
      vals.push({ label:"Intrinsic Value", value:oracleAvg, color:"#1a8a3a", bold:true, modelsMeta:modelsMeta, sectorLabel:_ivSector, modelApplicable:MODEL_APPLICABLE });
      // Persist for re-renders
      if (!window.__ivStore) window.__ivStore = {};
      window.__ivStore[sym] = { oracle:oracle, vals:vals.slice() };
    }
  }

  // If this render couldn't compute IV but a previous one did, restore from store
  if (vals.length === 0 && window.__ivStore && window.__ivStore[sym]) {
    var _stored = window.__ivStore[sym];
    oracle = _stored.oracle;
    _stored.vals.forEach(function(v){ vals.push(v); });
    window.__curOracle = oracle;
    window.__curOracleSym = sym;
    window.__curVals = vals;
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
    <div style={{ minHeight:"100vh", background:"#f5f2ec", fontFamily:FONT, overflowX:"hidden", width:"100%" }}>

      {/* Nav */}
      {(function() {
        var allStocks2 = Object.keys(NAMES).map(function(k){ return {symbol:k, name:NAMES[k]}; });
        var navSugg = (navInput.length > 0 && navFocus)
          ? allStocks2.filter(function(s){ var q = navInput.toLowerCase(); return s.symbol.toLowerCase().startsWith(q) || (q.length >= 3 && s.name.toLowerCase().includes(q)); }).slice(0,6)
          : [];
        function navGo(s) {
          var ticker = (s || navInput).toUpperCase().trim();
          if (!ticker) return;
          setNavInput("");
          setNavFocus(false);
          window.location.hash = ticker;
        }
        var SearchPill = (
          <div style={{ position:"relative", width:280, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", background:"#fff", borderRadius:22, padding:"5px 12px", gap:8, border: navFocus ? "2px solid #1a1a14" : "2px solid transparent" }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                <circle cx="6.5" cy="6.5" r="5" stroke="#bbb" strokeWidth="1.5"/>
                <path d="M10.5 10.5L14 14" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                value={navInput}
                onChange={function(e){ setNavInput(e.target.value); }}
                onFocus={function(){ setNavFocus(true); }}
                onBlur={function(){ setTimeout(function(){ setNavFocus(false); }, 180); }}
                onKeyDown={function(e){ if(e.key==="Enter") navGo(); }}
                placeholder="Search ticker or company..."
                style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:12, color:"#333", fontFamily:FONT }}
              />
              {navInput && <span onClick={function(){ setNavInput(""); }} style={{ cursor:"pointer", color:"#bbb", fontSize:15, lineHeight:1, flexShrink:0 }}>{String.fromCharCode(0xD7)}</span>}
            </div>
            {navSugg.length > 0 && (
              <div style={{ position:"absolute", top:"calc(100% + 5px)", left:0, right:0, background:"#1c1c1e", border:"0.5px solid #333", borderRadius:10, zIndex:200, overflow:"hidden" }}>
                {navSugg.map(function(s) {
                  return (
                    <div key={s.symbol}
                      onMouseDown={function(e){ e.preventDefault(); navGo(s.symbol); }}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", cursor:"pointer", borderBottom:"0.5px solid #222" }}
                      onMouseEnter={function(e){ e.currentTarget.style.background="#252525"; }}
                      onMouseLeave={function(e){ e.currentTarget.style.background="transparent"; }}>
                      <span style={{ fontSize:10, fontWeight:700, color:"#1a1a14", background:"#c8f000", padding:"2px 7px", borderRadius:4, minWidth:40, textAlign:"center" }}>{s.symbol}</span>
                      <span style={{ fontSize:12, color:"#aaa" }}>{s.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
        return (
          <div>
            {/* Desktop nav: 1 row - Back / Logo / centred search / Live badge */}
            <style>{"*{box-sizing:border-box}.nav-desktop{display:flex}.nav-mobile{display:none}.tab-scroll::-webkit-scrollbar{height:4px}.tab-scroll::-webkit-scrollbar-track{background:#e8e4de}.tab-scroll::-webkit-scrollbar-thumb{background:#aaa;border-radius:4px}.tab-scroll{scrollbar-width:thin;scrollbar-color:#aaa #e8e4de}@media(max-width:1100px){.body-grid{grid-template-columns:260px 1fr!important}}@media(max-width:900px){.body-grid{grid-template-columns:220px 1fr!important}}@media(max-width:768px){.nav-desktop{display:none!important}.nav-mobile{display:block!important}.body-grid{display:block!important}.panel-left{width:100%!important;border-right:none!important}.panel-right{width:100%!important;padding:16px!important}.view-analysis-btn{display:block!important}.mobile-back-btn{display:block!important}.show-right .panel-left{display:none!important}.show-right .panel-right{display:block!important}.show-left .panel-right{display:none!important}.show-left .panel-left{display:block!important}}"}</style>

            {/* DESKTOP */}
            <div className="nav-desktop" style={{ background:"#c8f000", padding:"7px 20px", display:"grid", gridTemplateColumns:"minmax(0,200px) 1fr auto", alignItems:"center", gap:0, minWidth:0 }}>
              {/* Left cell -- Logo + ticker (mirrors 400px left panel) */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                  <span style={{ fontWeight:900, fontSize:15, color:"#1a1a14", whiteSpace:"nowrap", letterSpacing:"-0.3px", lineHeight:1.2 }}>NervousGeek</span>
                  <span style={{ fontSize:9, color:"rgba(0,0,0,0.35)", fontWeight:500, letterSpacing:"0.02em", lineHeight:1 }}>v2.66</span>
                </div>
                <span style={{ color:"rgba(0,0,0,0.35)", fontSize:12 }}>/ {sym}</span>
              </div>
              {/* Right panel cell -- Back + Search aligned to chart panel edge */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <button onClick={onBack} style={{ border:"1px solid rgba(0,0,0,0.2)", borderRadius:6, padding:"5px 12px", background:"rgba(0,0,0,0.08)", cursor:"pointer", fontSize:12, fontFamily:FONT, color:"#1a1a14", fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                  {"< Back"}
                </button>
                {SearchPill}
              </div>
              {/* Far right -- Watchlist (admin) + Avatar or Sign In */}
              <div style={{ paddingLeft:10, display:"flex", alignItems:"center", gap:10 }}>

                <button onClick={function(){ setShowCalc(function(v){return !v;}); }}
                  style={{ border:"1px solid rgba(0,0,0,0.3)", borderRadius:6, padding:"5px 10px", background:showCalc?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.08)", cursor:"pointer", fontSize:14, fontFamily:FONT, color:"#1a1a14", fontWeight:700, whiteSpace:"nowrap", lineHeight:1 }}
                  title="Trade Calculator">
                  {"$"}
                </button>
                <div>
                {clerkUser
                  ? <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {isPaid ? (
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer" }}
                            onClick={function(){
                              var hdrs = window.__clerkToken ? { "Authorization": "Bearer " + window.__clerkToken } : {};
                              fetch("/stripe?action=portal", { headers: hdrs })
                                .then(function(r){ return r.json(); })
                                .then(function(d){ if (d.url) window.location.href = d.url; });
                            }}>
                            <span style={{ fontSize:10, fontWeight:700, color:"#1a1a14", background:LIME, padding:"3px 10px", borderRadius:10 }}>PREMIUM</span>
                            <span style={{ fontSize:9, color:"#1a1a14", opacity:0.6 }}>Manage Plan</span>
                          </div>
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer" }}
                            onClick={function(){ window.__showUpgrade && window.__showUpgrade(); }}>
                            <span style={{ fontSize:10, fontWeight:700, color:"#1a1a14", background:"#ffffff", padding:"3px 10px", borderRadius:10 }}>MEMBER</span>
                            <span style={{ fontSize:9, color:"#1a1a14", opacity:0.6 }}>Upgrade</span>
                          </div>
                        )}
                      <div id="clerk-user-button-detail"></div>
                    </div>
                  : <button onClick={function(){ if(window.Clerk){ try{ window.Clerk.openSignIn({}); } catch(e){ window.location.href="https://accounts.nervousgeek.com/sign-in"; } } }} style={{ border:"1px solid rgba(0,0,0,0.2)", borderRadius:20, padding:"5px 16px", background:"rgba(0,0,0,0.08)", cursor:"pointer", fontSize:12, fontFamily:FONT, color:"#1a1a14", fontWeight:700, whiteSpace:"nowrap" }}>Sign In</button>
                }
                </div>
              </div>
            </div>

            {/* MOBILE */}
            <div className="nav-mobile" style={{ background:"#c8f000", padding:"8px 14px 7px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                    <span style={{ fontWeight:900, fontSize:14, color:"#1a1a14", letterSpacing:"-0.3px", lineHeight:1.2 }}>NervousGeek</span>
                    <span style={{ fontSize:9, color:"rgba(0,0,0,0.35)", fontWeight:500, letterSpacing:"0.02em", lineHeight:1 }}>v2.66</span>
                  </div>
                  <span style={{ color:"rgba(0,0,0,0.35)", fontSize:11 }}>/ {sym}</span>
                </div>
                <button onClick={function(){ setMobilePanel("left"); onBack(); }} style={{ border:"1px solid rgba(0,0,0,0.2)", borderRadius:6, padding:"4px 10px", background:"rgba(0,0,0,0.08)", cursor:"pointer", fontSize:11, fontFamily:FONT, color:"#1a1a14", fontWeight:600 }}>
                  Back
                </button>

              </div>
              {/* Full-width white search on row 2 */}
              <div style={{ position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", background:"#fff", borderRadius:20, padding:"7px 12px", gap:8, border: navFocus ? "2px solid #1a1a14" : "2px solid transparent" }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                    <circle cx="6.5" cy="6.5" r="5" stroke="#bbb" strokeWidth="1.5"/>
                    <path d="M10.5 10.5L14 14" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input
                    value={navInput}
                    onChange={function(e){ setNavInput(e.target.value); }}
                    onFocus={function(){ setNavFocus(true); }}
                    onBlur={function(){ setTimeout(function(){ setNavFocus(false); }, 180); }}
                    onKeyDown={function(e){ if(e.key==="Enter") navGo(); }}
                    placeholder="Search company or ticker..."
                    style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:13, color:"#333", fontFamily:FONT }}
                  />
                  {navInput && <span onClick={function(){ setNavInput(""); }} style={{ cursor:"pointer", color:"#bbb", fontSize:15, lineHeight:1 }}>{String.fromCharCode(0xD7)}</span>}
                </div>
                {navSugg.length > 0 && (
                  <div style={{ position:"absolute", top:"calc(100% + 5px)", left:0, right:0, background:"#1c1c1e", border:"0.5px solid #333", borderRadius:10, zIndex:200, overflow:"hidden" }}>
                    {navSugg.map(function(s) {
                      return (
                        <div key={s.symbol}
                          onMouseDown={function(e){ e.preventDefault(); navGo(s.symbol); }}
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", cursor:"pointer", borderBottom:"0.5px solid #222" }}
                          onMouseEnter={function(e){ e.currentTarget.style.background="#252525"; }}
                          onMouseLeave={function(e){ e.currentTarget.style.background="transparent"; }}>
                          <span style={{ fontSize:10, fontWeight:700, color:"#1a1a14", background:"#c8f000", padding:"2px 7px", borderRadius:4, minWidth:40, textAlign:"center" }}>{s.symbol}</span>
                          <span style={{ fontSize:12, color:"#aaa" }}>{s.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
      <div className={"body-grid" + (mobilePanel === "right" ? " show-right" : " show-left")} style={{ display:"grid", gridTemplateColumns:"minmax(280px,400px) 1fr", minWidth:0 }}>

        {/* LEFT PANEL */}
        <div className="panel-left" style={{ padding:"24px 20px", borderRight:"1px solid #111", background:"#1c1c1e" }}>

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

          {/* Analysis Summary -- grouped */}
          {(function() {
            function pillColor(text) {
              if (!text) return { bg:"#222", fg:"#555", border:"#333", dot:"#444", dotEmpty:"#2a2a2a" };
              var v = (text+"").toLowerCase().replace(/[^a-z ]/g,"").trim();
              if (v.includes("strong buy")||v==="buy"||v.startsWith("buy")||v.includes("wide")||v.includes("strong bullish")||v.startsWith("strong"))
                return { bg:"#1e2a1e", fg:"#7abd00", border:"#2a5020", dot:"#7abd00", dotEmpty:"#2a5020" };
              if (v==="exceptional"||v==="undervalued")
                return { bg:"#1e2a1e", fg:"#7abd00", border:"#2a5020", dot:"#7abd00", dotEmpty:"#2a5020" };
              if (v.includes("moderate")||v.includes("narrow")||v.includes("bullish")||v==="fairlyvalued"||v==="fair"||v.includes("fairly"))
                return { bg:"#2a2010", fg:"#EF9F27", border:"#4a3810", dot:"#EF9F27", dotEmpty:"#4a3810" };
              if (v.includes("neutral")||v==="hold"||v.startsWith("hold")||v==="premium")
                return { bg:"#2a2010", fg:"#EF9F27", border:"#4a3810", dot:"#EF9F27", dotEmpty:"#4a3810" };
              if (v.includes("avoid")||v.includes("weak")||v.includes("bearish")||v.includes("overvalued")||v.includes("none")||v.includes("poor"))
                return { bg:"#2a1e1e", fg:"#e05050", border:"#4a2020", dot:"#e05050", dotEmpty:"#4a2020" };
              return { bg:"#222", fg:"#555", border:"#333", dot:"#444", dotEmpty:"#2a2a2a" };
            }
            function Dots(props) {
              var dots = [];
              for (var d = 1; d <= 5; d++) {
                dots.push(<span key={d} style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background: d <= props.score ? props.filled : props.empty, marginRight:2 }} />);
              }
              return <span style={{ display:"inline-flex", alignItems:"center" }}>{dots}</span>;
            }
            function SectionLabel(props) {
              return (
                <div style={{ fontSize:9, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6, marginTop: props.top ? 0 : 14, paddingBottom:5, borderBottom:"1px solid #2c2c2e" }}>
                  {props.label}
                </div>
              );
            }
            function Card(props) {
              var c = props.colors;
              var loading = !props.value;
              var flat = props.flat; // flat=true: no background, just border
              var bg     = flat ? "transparent" : (loading ? "#222" : c.bg);
              var border = flat ? "#2c2c2e" : (loading ? "#333" : c.border);
              var fg     = loading ? "#555" : c.fg;
              return (
                <div onClick={props.tabId ? function(){ window.__goToTab && window.__goToTab(props.tabId); } : undefined} style={{ padding:"9px 12px", background:bg, border:"0.5px solid "+border, borderRadius:8, opacity:loading?0.6:1, boxSizing:"border-box", minHeight:72, display:"flex", flexDirection:"column", cursor:props.tabId?"pointer":"default" }}>
                  <div style={{ fontSize:9, color:fg, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5, opacity:0.8 }}>{props.label}</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flex:1 }}>
                    {props.loading
                      ? <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ width:7, height:7, borderRadius:"50%", border:"1.5px solid #333", borderTop:"1.5px solid #c8f000", animation:"spin 0.8s linear infinite" }}></div>
                          <span style={{ fontSize:10, color:"#555" }}>Loading...</span>
                        </div>
                      : <span style={{ fontSize:13, fontWeight:700, color:fg }}>{loading?"---":props.value}</span>
                    }
                    {!loading && props.score > 0 && <Dots score={props.score} filled={c.dot} empty={c.dotEmpty} />}
                  </div>
                  {!loading && props.sublabel && <div style={{ fontSize:10, color:fg, marginTop:3, opacity:0.75, lineHeight:1.3 }}>{props.sublabel}</div>}
                  {loading && !props.loading && <div style={{ fontSize:10, color:"#555", marginTop:3 }}>&nbsp;</div>}
                </div>
              );
            }

            // -- Moat + Financial --
            var moatParsed = parsedInsights["moat"]     || {};
            var finParsed  = parsedInsights["financial"] || {};
            var moatRating = moatParsed.classification || null;
            var moatScore  = moatParsed.score || 0;
            // Financial Strength: use window value if available (set by Financial tab)
            // Otherwise compute inline using same sector-aware thresholds so pill always shows
            var finRating = null; var finScore = 0;
            var _cfs = window.__computedFinStrength && window.__computedFinStrength[sym];
            if (_cfs) {
              finRating = _cfs.classification||null; finScore = _cfs.score||0;
            } else if (ov) {
              // Inline fallback using same 11-metric sector-aware logic as Financial tab
              var _sec=ov.sector||"";
              var _isTF=_sec.includes("Technology")||_sec.includes("Communication");
              var _isFF=_sec.includes("Financial"); var _isHF=_sec.includes("Health");
              var _isRF=_sec.includes("Consumer")||_sec.includes("Retail");
              var _isUF=_sec.includes("Utilities")||_sec.includes("Real Estate");
              var _isEF=_sec.includes("Energy")||_sec.includes("Materials");
              function _ft(v,t){ if(!v||v===0) return 0; for(var i=0;i<t.length;i++){if(v>=t[i])return t.length-i;} return 1; }
              var _fgs=[
                _ft(ov.grossMargin, _isTF?[60,40,25,10]:_isFF?[40,25,15,5]:_isHF?[25,15,8,3]:_isRF?[35,20,10,5]:_isUF?[50,35,20,10]:_isEF?[45,30,15,5]:[45,30,15,5]),
                _ft(ov.opMargin,    _isTF?[30,15,5,0]:_isFF?[30,20,10,5]:_isHF?[8,5,3,0]:_isRF?[8,4,2,0]:_isUF?[20,12,6,2]:_isEF?[20,10,5,0]:[15,8,3,0]),
                _ft(ov.netMargin,   _isTF?[20,10,5,0]:_isFF?[20,12,6,0]:_isHF?[6,3,2,0]:_isRF?[5,3,1,0]:_isUF?[15,8,4,0]:_isEF?[15,8,3,0]:[10,5,2,0]),
                _ft(ov.roe,         _isTF?[25,15,8,0]:_isFF?[12,8,5,0]:_isHF?[15,10,6,0]:_isRF?[20,12,6,0]:_isUF?[12,8,4,0]:[18,10,5,0]),
                _ft(ov.currentRatio,(_isFF||_isHF||_isUF)?[1.2,1.0,0.8,0.5]:[1.8,1.3,1.0,0.5]),
                _ft(ov.quickRatio,  (_isFF||_isHF)?[1.0,0.8,0.6,0.3]:[1.2,0.8,0.5,0.3]),
                _ft(ov.revGrowth,   _isTF?[20,10,5,0]:_isUF?[8,5,2,0]:_isFF?[10,6,3,0]:_isEF?[15,8,3,0]:[12,7,3,0]),
                ov.fcfRaw>0?(ov.fcfRaw>10e9?5:ov.fcfRaw>1e9?4:3):0,
                ov.de>0?(ov.de<0.5?5:ov.de<1?4:ov.de<2?3:ov.de<3?2:1):0,
                // Debt/EBITDA -- same as Financial tab
                (function(){ var eb=ov.ebitda; var td=ov.totalDebt; if(!eb||!td||eb<=0) return 0; var r=td/eb; return r<1?5:r<2?4:r<3?3:r<4?2:1; })(),
                // Debt/OCF -- same as Financial tab
                (function(){ var ocf=ov.ocfRaw; var td=ov.totalDebt; if(!ocf||!td||ocf<=0) return 0; var r=td/ocf; return r<1?5:r<2?4:r<3?3:r<5?2:1; })(),
              ].filter(function(s){return s>0;});
              var _fa=_fgs.length>0?_fgs.reduce(function(a,b){return a+b;},0)/_fgs.length:0;
              finRating=_fa>=4?"Exceptional":_fa>=3?"Strong":_fa>=2?"Moderate":_fa>=1?"Weak":_fa>0?"Poor":null;
              finScore=_fa>=4?5:_fa>=3?4:_fa>=2?3:_fa>=1?2:_fa>0?1:0;
              if(finRating){ if(!window.__computedFinStrength)window.__computedFinStrength={}; window.__computedFinStrength[sym]={classification:finRating,score:finScore}; }
            }
            var moatColors = pillColor(moatRating || null);
            var finColors  = pillColor(finRating  || null);
            window.__moatDots = moatScore; window.__finDots = finScore;
  window.__parsedInsights = parsedInsights;

            // -- Intrinsic Value --
            var ivOracle  = vals.length > 0 ? parseFloat(oracle) : 0;
            var ivPct     = (price > 0 && ivOracle > 0) ? Math.round(Math.abs(ivOracle - price) / price * 100) : 0;
            var ivIsUnder = ivOracle > price;
            var ivLabel = null; var ivScore = 0; var ivSublabel = null;
            if (ivOracle > 0 && price > 0) {
              if (ivIsUnder && ivPct > 20)       { ivLabel = "Exceptional"; ivScore = 5; }
              else if (ivIsUnder && ivPct >= 5)   { ivLabel = "Undervalued"; ivScore = 4; }
              else if (ivIsUnder)                 { ivLabel = "Fair";        ivScore = 3; }
              else if (!ivIsUnder && ivPct <= 10) { ivLabel = "Premium";     ivScore = 2; }
              else                                { ivLabel = "Overvalued";  ivScore = 1; }
              ivSublabel = ivPct + "% " + (ivIsUnder ? "discount" : "premium") + " ($" + Math.round(parseFloat(oracle)) + ")";
            }
            var ivColors = pillColor(ivLabel ? ivLabel.toLowerCase() : null);

            // -- Market Signal --
            var ind2 = massiveInfo && massiveInfo.indicators ? massiveInfo.indicators : null;
            var agg2 = massiveInfo && massiveInfo.aggs ? massiveInfo.aggs : [];
            var p2   = q ? q.price : 0;
            var hi2  = ov ? ov.hi52 : 0; var lo2 = ov ? ov.lo52 : 0;
            var pos2 = (hi2-lo2) > 0 ? (p2-lo2)/(hi2-lo2) : 0.5;
            // Massive composite score — from pre-compute useEffect via technicalSignals.js calcMassiveScore
            var msDots   = (ind2 && p2 && window.__msDots2)  ? window.__msDots2  : 0;
            var msLabel  = (ind2 && p2 && window.__msLabel2) ? window.__msLabel2 : null;
            var msColors = pillColor(msLabel);

            // -- Reversal signal array — from pre-compute useEffect via technicalSignals.js --
            var revArr3   = window.__revArr3   && window.__revSym3===sym ? window.__revArr3   : [false,false,false,false,false];
            var revCount3 = window.__revCount3 && window.__revSym3===sym ? window.__revCount3 : 0;
            var revBg3=revCount3>=3?"#1e2a1e":revCount3>=1?"#1e2a1e":"#222";
            var revBorder3=revCount3>=1?"#2a5020":"#333";
            var revCol3=revCount3>=1?"#7abd00":"#555";
            var revDot3=revCount3>=1?"#7abd00":"#444";
            var revEmpty3=revCount3>=1?"#2a5020":"#2a2a2a";
            var revLabel3=revCount3>=4?"Strong Signal":revCount3>=3?"Moderate Signal":revCount3>=1?"Weak Signal":"No Signal";
            var sigNames3=["RSI Divergence","MACD Turning","Weekly Cross","RSI Base","52W Low Base"];

            // -- AI Insight --
            var aiP = null; try { aiP = insightCache["aiinsight"] ? parseAiInsight(insightCache["aiinsight"]) : null; } catch(e) {}
            var aiLabel  = aiP && aiP.verdict ? aiP.verdict : null;
            var aiConf   = aiP && aiP.confidence ? aiP.confidence : null;
            var aiDots   = aiP ? (aiP.dots||3) : 0;
            var aiColors = aiLabel ? pillColor(aiLabel.toLowerCase()) : pillColor(null);

            // -- Analyst from ov --
            var recBuy  = ov ? (ov.recBuy  || 0) : 0;
            var recHold = ov ? (ov.recHold || 0) : 0;
            var recSell = ov ? (ov.recSell || 0) : 0;
            var recTotal = recBuy + recHold + recSell;
            var recKey  = ov ? (ov.recKey  || "") : "";
            var recKeyN = recKey.toLowerCase().replace(/_/g," ").trim();
            var recDisplay = recKeyN ? recKeyN.split(" ").map(function(w){ return w.charAt(0).toUpperCase()+w.slice(1); }).join(" ") : "";
            var recLabel = recTotal > 0 ? (recBuy + "B / " + recHold + "H / " + recSell + "S") : null;
            var recDots = recKeyN.includes("strong buy")?5:recKeyN.includes("buy")?4:recKeyN.includes("hold")?3:recKeyN.includes("sell")?2:0;
            var recColors = pillColor(recKeyN.includes("buy")?"buy":recKeyN.includes("sell")?"avoid":"hold");

            // -- Star rating --
            var _aiD2=aiDots||0; var _msD2=msDots||0; var _ivD2=ivScore||0;
            var _revC=revCount3;
            function _toStar(d){return d>=4?1:d===3?0.5:0;}
            var _core=[moatScore,finScore,_ivD2,_msD2,_aiD2].filter(function(d){return d>0;}).reduce(function(s,d){return s+_toStar(d);},0);
            var _bonus=_revC>=3?1:_revC>=1?0.5:0;
            var _star=Math.round(Math.min(5,_core+_bonus)*2)/2;
            var _lbl=_star>=4.5?"Exceptional":_star>=4?"Strong Buy":_star>=3.5?"Buy":_star>=3?"Hold":_star>=2?"Caution":"Avoid";
            var _col=_star>=4?"#7abd00":_star>=3?"#EF9F27":"#e05050";
            function _StarRow(rating){
              var spans=[];
              for(var i=1;i<=5;i++){
                var d=rating-(i-1);
                spans.push(<span key={i} style={{fontSize:18,color:d>=0.5?"#f5a623":"#333",opacity:d>=0.5&&d<1?0.5:1,lineHeight:1}}>{d>=0.5?String.fromCharCode(9733):String.fromCharCode(9734)}</span>);
              }
              return spans;
            }

            return (
              <div style={{ marginBottom:16 }}>



                {/* AI ANALYSIS -- prominent header + 2 colored pills */}
                <div style={{ background:"#1e1e1e", border:"1px solid #2c2c2e", borderRadius:12, overflow:"hidden", marginBottom:8 }}>
                  <div style={{ background:"#c8f000", padding:"6px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:"#0e0e0c" }}></div>
                      <span style={{ fontSize:10, fontWeight:800, color:"#0e0e0c", textTransform:"uppercase", letterSpacing:"0.1em" }}>AI Analysis</span>
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, color:"#0e0e0c", background:"rgba(0,0,0,0.15)", padding:"2px 8px", borderRadius:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>Premium</span>
                  </div>
                  <div style={{ padding:"8px" }}>
                <div style={{ display:"none" }}></div>
                {(function() {
                  function aiVerdictColor(v) {
                    if (!v) return pillColor(null);
                    var vl = v.toLowerCase().replace(/\*/g,"").trim();
                    if (vl.includes("exceptional"))              return pillColor("buy");
                    if (vl.includes("good"))                     return pillColor("buy");
                    if (vl.includes("fair"))                     return pillColor("hold");
                    if (vl.includes("stretched"))                return pillColor("hold");
                    if (vl.includes("avoid"))                    return pillColor("avoid");
                    // Legacy fallback for old cached verdicts
                    if (vl.includes("strong buy")||vl.includes("strong bull")) return pillColor("buy");
                    if (vl.includes("buy")||vl.includes("bull"))               return pillColor("buy");
                    if (vl.includes("caution")||vl.includes("bear"))           return pillColor("hold");
                    if (vl.includes("strong bear"))                            return pillColor("avoid");
                    return pillColor("hold");
                  }
                  function aiVerdictScore(v) {
                    if (!v) return 0;
                    var vl = v.toLowerCase().replace(/\*/g,"").trim();
                    if (vl.includes("exceptional"))              return 5;
                    if (vl.includes("good"))                     return 4;
                    if (vl.includes("fair"))                     return 3;
                    if (vl.includes("stretched"))                return 2;
                    if (vl.includes("avoid"))                    return 1;
                    // Legacy fallback for old cached verdicts
                    if (vl.includes("strong buy")||vl.includes("strong bull")) return 5;
                    if (vl.includes("buy")||vl.includes("bull"))               return 4;
                    if (vl.includes("hold")||vl.includes("neutral"))           return 3;
                    if (vl.includes("caution")||vl.includes("bear"))           return 2;
                    return 0;
                  }
                  var fundC  = summaryCardDark(aiFundResult ? aiFundResult.verdict : null);
                  // Map summaryCardDark { bg, bd, text } to the field names used below
                  fundC = fundC ? { bg:fundC.bg, fg:fundC.text, border:fundC.bd } : { bg:'#222', fg:'#555', border:'#333' };
                  var _isFreeTickerAI = FREE_TICKERS.indexOf(sym) !== -1;
                  if (!window.__isPaid && !_isFreeTickerAI) {
                    return (
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                        {["Fundamental (Invest)","Technical (Trade)"].map(function(lbl,i){
                          return (
                            <div key={i} onClick={function(){ window.__goToPaywall && window.__goToPaywall(); }}
                              style={{ padding:"9px 12px", background:"#1a1a10", border:"0.5px solid #2c2c14", borderRadius:8, minHeight:72, display:"flex", flexDirection:"column", cursor:"pointer", justifyContent:"center", alignItems:"center" }}>
                              <div style={{ fontSize:9, color:"#555", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>{lbl}</div>
                              <div style={{ fontSize:10, color:"#c8f000", fontWeight:700 }}>Upgrade</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                      {/* Fundamental AI pill */}
                      <div onClick={function(){ window.__goToTab && window.__goToTab("aianalysis"); }}
                        style={{ padding:"9px 12px", background:aiFundResult?fundC.bg:"#222", border:"0.5px solid "+(aiFundResult?fundC.border:"#333"), borderRadius:8, minHeight:72, display:"flex", flexDirection:"column", cursor:"pointer" }}>
                        <div style={{ fontSize:9, color:aiFundResult?fundC.fg:"#555", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5, opacity:0.8 }}>Fundamental (Invest)</div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flex:1 }}>
                          {aiFundLoading
                            ? <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:7, height:7, borderRadius:"50%", border:"1.5px solid #333", borderTop:"1.5px solid #c8f000", animation:"spin 0.8s linear infinite" }}></div><span style={{ fontSize:10, color:"#555" }}>Analysing...</span></div>
                            : <span style={{ fontSize:13, fontWeight:700, color:aiFundResult?fundC.fg:"#555" }}>{aiFundResult?aiFundResult.verdict:"--"}</span>
                          }
                        </div>
                      </div>
                      {/* Technical (Trade) pill — Rule Based Analytics */}
                      <div onClick={function(){ window.__goToTab && window.__goToTab("technical"); }}
                        style={{ padding:"9px 12px", background: ruleAnalytics ? summaryCardDark(ruleAnalytics.verdict).bg : "#222", border:"0.5px solid "+(ruleAnalytics ? summaryCardDark(ruleAnalytics.verdict).bd : "#333"), borderRadius:8, minHeight:72, display:"flex", flexDirection:"column", cursor:"pointer" }}>
                        <div style={{ fontSize:9, color: ruleAnalytics ? summaryCardDark(ruleAnalytics.verdict).text : "#555", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5, opacity:0.8 }}>
                          Technical (Trade)
                        </div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flex:1 }}>
                          {!ruleAnalytics
                            ? <span style={{ fontSize:10, color:"#555" }}>{"Loading..."}</span>
                            : <span style={{ fontSize:13, fontWeight:700, color: summaryCardDark(ruleAnalytics.verdict).text }}>
                                {ruleAnalytics.verdict.split("—")[0].trim()}
                              </span>
                          }
                        </div>

                      </div>
                    </div>
                  );
                })()}
                  </div>
                </div>

                {/* FUNDAMENTAL ANALYSIS -- compact rows */}
                <div style={{ background:"#1e1e1e", border:"0.5px solid #2c2c2e", borderRadius:10, overflow:"hidden", marginBottom:8 }}>
                  <div style={{ background:"#242424", padding:"5px 12px", borderBottom:"0.5px solid #2c2c2e" }}>
                    <span style={{ fontSize:9, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.1em" }}>Fundamental Analysis</span>
                  </div>
                  {(function(){
                    function FRow(p){
                      // Use classification to determine dot count if provided (e.g. "Wide" = 5 even if score rounds to 4)
                      var dotCount = p.classification ?
                        (p.classification==="Wide"?5:p.classification==="Strong"?4:p.classification==="Moderate"?3:p.classification==="Narrow"?2:1)
                        : (p.score||0);
                      var _d=[]; for(var i=1;i<=5;i++) _d.push(<span key={i} style={{display:"inline-block",width:5,height:5,borderRadius:"50%",background:i<=dotCount?(p.dotCol||"#7abd00"):"#2a2a2a",marginRight:2}}/>);
                      return (
                        <div onClick={function(){ window.__goToTab && window.__goToTab(p.tab); }}
                          style={{display:"flex",alignItems:"center",padding:"11px 12px",borderBottom:"0.5px solid #242424",cursor:"pointer",minHeight:44}}
                          onMouseEnter={function(e){e.currentTarget.style.background="#252525";}}
                          onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
                          <span style={{fontSize:11,color:"#666",width:115,flexShrink:0}}>{p.label}</span>
                          <span style={{fontSize:12,fontWeight:600,color:p.loading?"#444":(p.valCol||"#aaa"),flex:1}}>{p.loading?"--":(p.value||"--")}</span>
                          {!p.loading&&dotCount>0&&<span style={{display:"inline-flex",alignItems:"center",marginRight:8}}>{_d}</span>}
                          <span style={{fontSize:11,color:"#444"}}>{"\u203A"}</span>
                        </div>
                      );
                    }
                    return (
                      <div>
                        <FRow label="Economic Moat" value={moatRating} score={moatScore} classification={parsedInsights&&parsedInsights["moat"]?parsedInsights["moat"].classification:null} dotCol={moatColors.dot} valCol={moatColors.fg} loading={!moatRating&&insightLoading} tab="moat" />
                        <FRow label="Financial Strength" value={finRating} score={finScore} dotCol={finColors.dot} valCol={finColors.fg} loading={false} tab="financial" />
                        <FRow label="Intrinsic Value" value={ivSublabel||ivLabel||"--"} score={ivScore} dotCol={ivColors.dot} valCol={ivColors.fg} loading={!ivOracle&&!ov} tab="intrinsic" />
                      </div>
                    );
                  })()}
                </div>
                {/* TECHNICAL ANALYSIS -- compact rows */}
                <div style={{ background:"#1e1e1e", border:"0.5px solid #2c2c2e", borderRadius:10, overflow:"hidden", marginBottom:8 }}>
                  <div style={{ background:"#242424", padding:"5px 12px", borderBottom:"0.5px solid #2c2c2e" }}>
                    <span style={{ fontSize:9, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.1em" }}>Technical Analysis</span>
                  </div>
                  <div style={{ padding:"0" }}>
                <div style={{ display:"none" }}>Technical Analysis</div>
                {(function() {
                  // All values from pre-compute useEffect via technicalSignals.js (no inline calc)
                  var _hasTech = !!(ind2 && p2);
                  var _trendScore  = (_hasTech && window.__trendScoreSym===sym && window.__trendScore!=null) ? window.__trendScore  : 0;
                  var _trendLabel  = (_hasTech && window.__trendLabel)  ? window.__trendLabel  : '--';
                  var _trendDots   = _trendScore>=70?5:_trendScore>=55?4:_trendScore>=40?3:_trendScore>=25?2:1;
                  var _trendCol    = pillColor(_trendScore>=55?"buy":_trendScore>=40?"hold":"avoid");
                  var _trendCaution= _hasTech ? (window.__trendCaution || false) : false;

                  var _momScore    = (_hasTech && window.__momScoreSym===sym && window.__momScore!=null) ? window.__momScore  : 0;
                  var _momLabel    = (_hasTech && window.__momLabel)    ? window.__momLabel    : '--';
                  var _momDots     = _momScore>=80?5:_momScore>=65?4:_momScore>=50?3:_momScore>=35?2:1;
                  var _momCol      = pillColor(_momScore>=65?"buy":_momScore>=50?"hold":"avoid");
                  var _momCaution  = _hasTech ? (window.__momCaution || false) : false;

                  // TechRow — UI display component only (no technical calculations)
                  function TechRow(p){
                    var _barPct=Math.min((p.score||0)/5*100,100);
                    return (
                      <div onClick={function(){ window.__goToTab && window.__goToTab(p.tab); }}
                        style={{display:"flex",alignItems:"center",padding:"11px 12px",borderBottom:"0.5px solid #242424",cursor:"pointer",minHeight:44}}
                        onMouseEnter={function(e){e.currentTarget.style.background="#252525";}}
                        onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
                        <span style={{fontSize:11,color:"#666",width:110,flexShrink:0}}>{p.label}</span>
                        <span style={{fontSize:12,fontWeight:600,color:p.loading?"#444":(p.valCol||"#aaa"),flex:1}}>{p.loading?"--":(p.value||"--")}</span>
                        {!p.loading&&(p.score||0)>0&&<span style={{width:52,height:3,background:"#2a2a2a",borderRadius:2,overflow:"hidden",display:"inline-block",marginRight:p.caution?4:8,flexShrink:0}}>
                          <span style={{display:"block",height:"100%",width:_barPct.toFixed(0)+"%",background:p.dotCol||"#7abd00",borderRadius:2}}></span>
                        </span>}
                        {p.caution&&<span style={{fontSize:9,color:"#b88000",marginRight:6,flexShrink:0}}>{"\u26A0"}</span>}
                        <span style={{fontSize:11,color:"#444"}}>{"\u203A"}</span>
                      </div>
                    );
                  }

                  return (
                    <div style={{display:"flex",flexDirection:"column"}}>
                      {(function(){
                        var _trendSubMap = {
                          "Strong Uptrend":"Price trend is strong","Uptrend":"Trend is positive",
                          "Weak Uptrend":"Trend is mildly positive","Sideways":"No clear trend direction",
                          "Weak Downtrend":"Trend is mildly weak","Downtrend":"Trend is weak",
                          "Strong Downtrend":"Strong downward trend","Not Enough Data":"Insufficient data"
                        };
                        var _tl = _hasTech ? _trendLabel : "--";
                        var _tsub = _hasTech ? (_trendSubMap[_trendLabel] || null) : null;
                        var _tcol = _hasTech ? _trendCol.fg : "#555";
                        return (
                          <div onClick={function(){ window.__goToTab && window.__goToTab("trend"); }}
                            style={{display:"flex",alignItems:"center",padding:"11px 12px",borderBottom:"0.5px solid #242424",cursor:"pointer",minHeight:44}}
                            onMouseEnter={function(e){e.currentTarget.style.background="#252525";}}
                            onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
                            <span style={{fontSize:11,color:"#666",width:110,flexShrink:0}}>Trend</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:600,color:_tcol,lineHeight:1.3}}>{_tl}</div>
                              {_tsub&&<div style={{fontSize:9,color:"#555",marginTop:1}}>{_tsub}</div>}
                            </div>
                            {_trendCaution&&<span style={{fontSize:8,fontWeight:700,color:"#b88000",background:"#2a2010",border:"0.5px solid #4a3810",borderRadius:3,padding:"1px 5px",flexShrink:0,marginRight:6}}>{"CAUTION"}</span>}
                            <span style={{fontSize:11,color:"#444",flexShrink:0}}>{"›"}</span>
                          </div>
                        );
                      })()}
                      {(function(){
                        var _lp = momLiveSym===sym ? momLiveProfile : null;
                        function _sp(p){if(p==='Momentum Continuation') return 'Continuation';if(p==='Early Recovery Attempt') return 'Recovery';if(p==='Weak Weekly Bounce') return 'Weak Bounce';if(p==='Waiting for Daily Trigger') return 'Waiting';if(p==='Pullback in Larger Momentum') return 'Pullback';if(p==='Bearish Momentum') return 'Bearish';if(p==='No Clear Momentum Profile') return 'Unclear';if(p==='Not Enough Data') return 'No Data';return 'No Data';}
                        function _sc(s){return s==='Strong'||s==='Supportive'?'#7abd00':s==='Building'?'#6090d0':s==='Neutral'?'#b88000':s==='Fading'||s==='Weak'?'#c03030':'#555';}
                        var _sp2 = _lp ? _sp(_lp.profile) : (momLiveLoading ? '...' : 'No Data');
                        var _spc = _sp2==='Continuation'?'#7abd00':_sp2==='Recovery'?'#6090d0':_sp2==='Pullback'?'#6090d0':_sp2==='Waiting'?'#b88000':_sp2==='Weak Bounce'?'#b88000':_sp2==='Bearish'?'#c03030':'#aaa';
                        var _d = _hasTech && _momLabel && _momLabel!=='--' ? _momLabel : '--';
                        var _w = _lp ? (_lp.weekly==='Not Enough Data'?'No data':_lp.weekly||'--') : 'No data';
                        var _m = _lp ? (_lp.monthlyRegime==='Not Enough Data'?'No data':_lp.monthlyRegime||'--') : 'No data';
                        // Build compact subtitle: "D Strong · W Building · M Neutral"
                        var _momSub = _lp
                          ? ('D '+(_d||'--')+((_w&&_w!=='No data')?' \u00b7 W '+_w:'')+((_m&&_m!=='No data')?' \u00b7 M '+_m:''))
                          : null;
                        return (
                          <div onClick={function(){ window.__goToTab && window.__goToTab('momentum'); }}
                            style={{display:'flex',alignItems:'center',padding:'11px 12px',borderBottom:'0.5px solid #242424',cursor:'pointer',minHeight:44}}
                            onMouseEnter={function(e){e.currentTarget.style.background='#252525';}}
                            onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}>
                            <span style={{fontSize:11,color:'#666',width:110,flexShrink:0}}>Momentum</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:600,color:_spc,lineHeight:1.3}}>{_sp2}</div>
                              {_momSub&&<div style={{fontSize:9,color:'#555',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{_momSub}</div>}
                            </div>
                            <span style={{fontSize:11,color:'#444',flexShrink:0}}>{'›'}</span>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

              </div>
                  </div>
                </div>
            );
          })()}

                {/* SIGNALS -- separate card, hidden when no signals */}
                {(function(){
                  var _hasTechCheck=!!(massiveInfo&&massiveInfo.indicators&&q&&q.price);
                  // Show loading spinner while massive data is loading
                  if (!massiveInfo && q && q.price) return (
                    <div style={{ background:"#1e1e1e", border:"0.5px solid #2c2c2e", borderRadius:10, padding:"12px 16px", marginBottom:8, marginTop:8, display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", border:"1.5px solid #333", borderTop:"1.5px solid #c8f000", animation:"spin 0.8s linear infinite", flexShrink:0 }}></div>
                      <span style={{ fontSize:10, color:"#555" }}>Loading signals...</span>
                    </div>
                  );
                  if(!_hasTechCheck) return null;
                  // Early exit — use pre-computed globals from technicalSignals.js snapshot
                  var _netRevC = window.__revNetScore3 || 0;
                  var _netVolC = window.__volNetScore   || 0;
                  // Also show card if revWatchStatus or smfScore has meaningful data
                  var _hasRevWatch = !!(window.__revWatchStatus && window.__revWatchStatus[sym] &&
                    window.__revWatchStatus[sym].status && window.__revWatchStatus[sym].status !== 'Not Enough Data');
                  var _hasSmf = !!(window.__smfScore && window.__smfScore[sym] &&
                    window.__smfScore[sym].primaryScore !== null && window.__smfScore[sym].primaryScore !== undefined);
                  if (_netRevC===0 && _netVolC===0 && !_hasRevWatch && !_hasSmf) return null;
                  return (
                <div style={{ background:"#1e1e1e", border:"0.5px solid #2c2c2e", borderRadius:10, overflow:"hidden", marginBottom:8, marginTop:8 }}>
                  <div style={{ background:"#242424", padding:"5px 12px", borderBottom:"0.5px solid #2c2c2e" }}>
                    <span style={{ fontSize:9, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.1em" }}>Signals</span>
                  </div>
                  {(function(){
                    var _hasTech=!!(massiveInfo&&massiveInfo.indicators&&q&&q.price);
                    var _ind3=massiveInfo&&massiveInfo.indicators?massiveInfo.indicators:{};
                    var _aggs3=massiveInfo&&massiveInfo.aggs?massiveInfo.aggs:[];
                    var _rsiH3=_ind3.rsiHistory||[]; var _mH3=_ind3.macdHistory||[];
                    var _hi52p=ov?ov.hi52:0; var _lo52p=ov?ov.lo52:0; var _prP=q?q.price:0;
                    var _pos52p=(_hi52p>_lo52p&&_prP>0)?(_prP-_lo52p)/(_hi52p-_lo52p):0.5;
                    // Bear/bull reversal arrays from pre-compute useEffect via technicalSignals.js
                    var _bearArr3 = window.__revBearArr3 || [false,false,false,false,false];
                    var _wBull=[3,2,2,1,1]; var _wBear=[3,2,2,1,1]; var _maxRev=9;
                    var _revArr=window.__revArr3&&window.__revSym3===sym?window.__revArr3:[false,false,false,false,false];
                    var _bullScore3=_revArr.reduce(function(s,v,i){return s+(v?_wBull[i]:0);},0);
                    var _bearScore3=_bearArr3.reduce(function(s,v,i){return s+(v?_wBear[i]:0);},0);
                    var _netRev3=_bullScore3-_bearScore3;
                    window.__revNetScore3=_netRev3;
                    var _absRev=Math.abs(_netRev3);
                    var _revDir=_netRev3>0?"bull":_netRev3<0?"bear":"none";
                    var _revStrength=_absRev>=5?"Strong":_absRev>=3?"Moderate":_absRev>=1?"Weak":"";
                    var _revBarPct=Math.min(_absRev/_maxRev,1)*100;
                    // Volume signals from pre-compute useEffect via technicalSignals.js calcVolumeSignals
                    var _bSigs4 = window.__volBull&&window.__volSym===sym ? window.__volBull : [false,false,false,false,false];
                    var _rSigs4 = window.__volBear&&window.__volSym===sym ? window.__volBear : [false,false,false,false,false];
                    var _wVolB=[2,3,3,2,1]; var _wVolR=[2,3,3,2,1]; var _maxVol=11;
                    var _volBullScore=_bSigs4.reduce(function(s,v,i){return s+(v?_wVolB[i]:0);},0);
                    var _volBearScore=_rSigs4.reduce(function(s,v,i){return s+(v?_wVolR[i]:0);},0);
                    var _netVol=_volBullScore-_volBearScore;
                    window.__volNetScore=_netVol;
                    var _absVol=Math.abs(_netVol);
                    var _volDir=_netVol>0?"bull":_netVol<0?"bear":"none";
                    var _volStrength=_absVol>=5?"Strong":_absVol>=3?"Moderate":_absVol>=1?"Weak":"";
                    var _volBarPct=Math.min(_absVol/_maxVol,1)*100;
                    function SigRow2(tab, label, netScore, dir, barPct, strength){
                      var _det=_hasTech&&netScore!==0;
                      if (!_det) return null;
                      var _bull=dir==="bull";
                      var _fg2=_det?(_bull?"#7abd00":"#e05050"):"#555"; var _dot2=_fg2;
                      var _arrow=_bull?String.fromCharCode(0x25B2):String.fromCharCode(0x25BC);
                      var _valText=!_hasTech?"--":!_det?"Not Detected":(_arrow+" Detected");
                      return (
                        <div onClick={function(){ window.__goToTab && window.__goToTab(tab); }}
                          style={{display:"flex",alignItems:"center",padding:"11px 12px",borderBottom:"0.5px solid #242424",cursor:"pointer",minHeight:44}}
                          onMouseEnter={function(e){e.currentTarget.style.background="#252525";}}
                          onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
                          <span style={{fontSize:11,color:"#666",width:110,flexShrink:0}}>{label}</span>
                          <span style={{fontSize:12,fontWeight:600,color:_fg2,flex:1}}>{_valText}</span>
                          {_det&&strength&&<span style={{fontSize:10,color:_fg2,marginRight:6,flexShrink:0,opacity:0.85}}>{strength}</span>}
                          {_det&&<span style={{width:52,height:3,background:"#2a2a2a",borderRadius:2,overflow:"hidden",display:"inline-block",marginRight:8,flexShrink:0}}>
                            <span style={{display:"block",height:"100%",width:barPct.toFixed(0)+"%",background:_dot2,borderRadius:2}}></span>
                          </span>}
                          <span style={{fontSize:11,color:"#444"}}>{"\u203A"}</span>
                        </div>
                      );
                    }
                    return (
                      <div>
                        {(function(){
                          // ── Reversal row ──────────────────────────────────────────────────────
                          var _rw = window.__revWatchStatus && window.__revWatchStatus[sym];
                          var _revShortMap = {
                            "Bullish Reversal Confirmed":"Bullish Confirmed","Bullish Reversal Triggered":"Bullish Triggered",
                            "Bullish Reversal Setup":"Bullish Setup","Bullish Reversal Watch":"Bullish Watch",
                            "Bullish Reversal Spark":"Bullish Spark","Bullish Reversal Forming":"Bullish Forming",
                            "Bullish Reversal Confirming":"Bullish Confirming",
                            "Bearish Reversal Confirmed":"Bearish Confirmed","Bearish Reversal Triggered":"Bearish Triggered",
                            "Bearish Reversal Setup":"Bearish Setup","Bearish Reversal Watch":"Bearish Watch",
                            "Bearish Reversal Forming":"Bearish Forming","Bearish Reversal Confirming":"Bearish Confirming",
                            "Mixed Reversal Signals":"Mixed Signals","No Clear Reversal":"No Clear Signal","Not Enough Data":"No Data"
                          };
                          var _revSubMap = {
                            "Bullish Confirmed":"Price confirmation is strong","Bullish Triggered":"Momentum has turned bullish",
                            "Bullish Setup":"Early bullish setup forming","Bullish Watch":"Early bullish signal, not confirmed",
                            "Bullish Spark":"Early bullish momentum spark","Bullish Forming":"Setup and trigger are building",
                            "Bullish Confirming":"Price action is validating",
                            "Bearish Confirmed":"Bearish confirmation is strong","Bearish Triggered":"Momentum has turned bearish",
                            "Bearish Setup":"Early bearish risk forming","Bearish Watch":"Early bearish warning",
                            "Bearish Forming":"Bearish setup and trigger are building","Bearish Confirming":"Bearish price action is validating",
                            "Mixed Signals":"Bullish and bearish evidence conflict",
                            "No Clear Signal":"No clear reversal signal","No Data":"Insufficient data"
                          };
                          var _rwStatus  = _rw ? (_revShortMap[_rw.status]||_rw.status) : "No Data";
                          var _rwSub     = _revSubMap[_rwStatus] || null;
                          var _rwMainCol = revStatusColor(_rw ? _rw.status : null, "main");
                          return (
                            <div onClick={function(){ window.__goToTab&&window.__goToTab("reversal"); }}
                              style={{display:"flex",alignItems:"center",padding:"11px 12px",borderBottom:"0.5px solid #242424",cursor:"pointer",minHeight:44}}
                              onMouseEnter={function(e){e.currentTarget.style.background="#252525";}}
                              onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
                              <span style={{fontSize:11,color:"#666",width:110,flexShrink:0}}>Reversal</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:600,color:_rwMainCol,lineHeight:1.3}}>{_rwStatus}</div>
                                {_rwSub&&<div style={{fontSize:9,color:"#555",marginTop:1}}>{_rwSub}</div>}
                              </div>
                              <span style={{fontSize:11,color:"#444",flexShrink:0}}>{"›"}</span>
                            </div>
                          );
                        })()}
                        {(function(){
                          // ── Money Flow row ────────────────────────────────────────────────────
                          var _smf = window.__smfScore && window.__smfScore[sym] ? window.__smfScore[sym] : null;
                          var _smd = _smf && _smf.smartMoneyDecision ? _smf.smartMoneyDecision : null;
                          // Main label: use baseStatus if available, else shorten full status
                          function _smfMain(smf, smd) {
                            if (!smf) return "No Data";
                            if (smd && smd.baseStatus && smd.baseStatus !== "Not Enough Data") return smd.baseStatus;
                            var s = smf.status;
                            if (!s) return "No Data";
                            if (s.indexOf("Strong Accumulation")>-1) return "Strong Accumulation";
                            if (s.indexOf("Steady Accumulation")>-1) return "Steady Accumulation";
                            if (s.indexOf("Long-Term Accumulation")>-1) return "Long-Term Accum.";
                            if (s.indexOf("Early Accumulation")>-1) return "Early Accumulation";
                            if (s.indexOf("Mixed Flow")>-1) return "Mixed Flow";
                            if (s.indexOf("Cooling Accumulation")>-1) return "Cooling Accumulation";
                            if (s.indexOf("Short-Term Flow Spike")>-1) return "ST Flow Spike";
                            if (s.indexOf("Short-Term Flow Watch")>-1) return "ST Flow Watch";
                            if (s.indexOf("Daily Spike but")>-1) return "Daily Spike";
                            if (s.indexOf("Daily Support but")>-1) return "Daily Support";
                            if (s==="No Clear Signal") return "No Signal";
                            if (s==="No Sustained Flow") return "No Sustained Flow";
                            if (s==="Not Enough Data") return "No Data";
                            return s;
                          }
                          // Subtitle: "Daily spike · 5D Moderate · 30D Very High"
                          function _smfSub(smf, smd) {
                            if (!smf) return null;
                            var dp = smd ? smd.dailyPrefix : null;
                            var tLbl = smf.todayLabel || "N/A";
                            var fLbl = smf.fiveDayLabel || "N/A";
                            var dLbl = smf.thirtyDayLabel || "N/A";
                            var parts = [];
                            if (dp && dp !== "No Daily Data") parts.push(dp);
                            else if (tLbl && tLbl !== "N/A") parts.push("Today "+tLbl);
                            if (fLbl && fLbl !== "N/A") parts.push("5D "+fLbl);
                            if (dLbl && dLbl !== "N/A") parts.push("30D "+dLbl);
                            return parts.length ? parts.join(" \u00b7 ") : null;
                          }
                          var _smfLabel   = _smfMain(_smf, _smd);
                          var _smfSub2    = _smfSub(_smf, _smd);
                          var _smfMainCol = smfStatusColor(_smf ? _smf.status : null, "main");
                          return (
                            <div onClick={function(){ window.__goToTab&&window.__goToTab("whale"); }}
                              style={{display:"flex",alignItems:"center",padding:"11px 12px",borderBottom:"0.5px solid #242424",cursor:"pointer",minHeight:44}}
                              onMouseEnter={function(e){e.currentTarget.style.background="#252525";}}
                              onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
                              <span style={{fontSize:11,color:"#666",width:110,flexShrink:0}}>Money Flow</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:600,color:_smfMainCol,lineHeight:1.3}}>{_smfLabel}</div>
                                {_smfSub2&&<div style={{fontSize:9,color:"#555",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{_smfSub2}</div>}
                              </div>
                              <span style={{fontSize:11,color:"#444",flexShrink:0}}>{"›"}</span>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
                  );
                })()}

                    {/* Metric color helpers */}
                    {(function() {
                      window.__mc = function(val, good, warn, bad, reverse) {
                        // reverse=true means lower is better (e.g. P/E, debt)
                        if (val === null || val === undefined || val === 0 || val === "-") return "#ddd";
                        if (reverse) {
                          if (val <= good) return "#7abd00";
                          if (val <= warn) return "#EF9F27";
                          return "#e05050";
                        }
                        if (val >= good) return "#7abd00";
                        if (val >= warn) return "#EF9F27";
                        return "#e05050";
                      };
                    })()}
                  </div>

        {/* RIGHT PANEL */}
        <div className="panel-right" style={{ padding:"24px", paddingBottom:80, background:"#fff", minHeight:"100vh", minWidth:0 }}>
          {/* Mobile back button */}
          <div style={{ display:"none" }} className="mobile-back-btn">
            <button
              onClick={function(){ setMobilePanel("left"); setChartCollapsed(false); }}
              style={{ display:"flex", alignItems:"center", gap:8, background:LIME, border:"none", borderRadius:20, cursor:"pointer", color:"#0e0e0c", fontSize:12, fontFamily:FONT, fontWeight:800, marginBottom:14, padding:"8px 18px" }}>
              <span style={{ fontSize:14, lineHeight:1 }}>{"<"}</span>
              {"Summary"}
            </button>
          </div>

          {/* TradingView Chart */}
          <div style={{ border:"1px solid #e0dbd0", borderRadius:12, overflow:"hidden", marginBottom:20 }}>
            <div
              onClick={function(){ setChartCollapsed(function(v){ return !v; }); }}
              style={{ background:"#faf8f4", borderBottom:chartCollapsed?"none":"1px solid #e0dbd0", padding:"8px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", userSelect:"none" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#444" }}>
                {name} . Daily . {ov ? ov.exchange : "NASDAQ"}
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {q && !chartCollapsed && <span style={{ fontSize:11, color:up?"#2a8a2a":"#c03030" }}>C{price.toFixed(2)} {chg}</span>}
                <span style={{ fontSize:11, color:"#aaa", fontWeight:600, display:"inline-block", transform:chartCollapsed?"rotate(0deg)":"rotate(180deg)" }}>
                  {String.fromCharCode(0x25B2)}
                </span>
              </div>
            </div>
            {!chartCollapsed && (
              <div>
                <iframe
                  key={sym}
                  src={"https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=" + (sym==="BRKB"?"BRK.B":sym) + "&interval=D&theme=light&style=1&timezone=Etc%2FUTC&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=0&save_image=0"}
                  style={{ width:"100%", height:300, border:"none", display:"block" }}
                  title="TradingView Chart"
                />
                <div style={{ background:"#faf8f4", borderTop:"1px solid #e0dbd0", padding:"6px 14px", display:"flex", gap:16 }}>
                  {["1Y","3Y","5Y"].map(function(p) {
                    return <span key={p} style={{ fontSize:12, color:"#444", cursor:"pointer", fontWeight:600 }}>{p}</span>;
                  })}
                </div>
              </div>
            )}
          </div>

    {showCancelBanner && cancelEnd && (

    <div style={{ background:"#2a1a00", borderBottom:"1px solid #5a3a00", padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
    <span style={{ fontSize:13, color:"#ffb347" }}>
    {"⚠️ Your subscription is cancelled — premium access continues until " + cancelEnd + "."}

    </span>
    <a href="mailto:billing@nervousgeek.com" style={{ fontSize:12, color:"#ffb347", textDecoration:"underline" }}>
      {"Billing issue? Contact us"}
    </a>
  </div>
  )}

                    {/* 5-Tab Insight Panel */}
          {(function() {
            var ALL_TABS = [
              { id:"aianalysis", label:"AI Analysis" },
              { id:"business",  label:"Business Overview" },
              { id:"moat",      label:"Economic MOAT" },
              { id:"intrinsic", label:"Intrinsic Value" },
              { id:"financial", label:"Financial Strength" },

              { id:"trend",     label:"Trend" },
              { id:"momentum",  label:"Momentum" },
              { id:"reversal",  label:"Reversal Watch" },
              { id:"whale",     label:"Smart Money Flow" },
              { id:"addlinfo",  label:"Additional Information" },
              { id:"debug",     label:"Debug" },
              { id:"admin",     label:"Admin" },
            ];
            var ADMIN_TABS = ["addlinfo", "debug", "admin"];
            var TABS = isAdmin ? ALL_TABS : ALL_TABS.filter(function(t) { return ADMIN_TABS.indexOf(t.id) === -1; });

            function handleTab(id) {
              if (ADMIN_TABS.indexOf(id) !== -1 && !isAdmin) return;
              setInsightTab(id);
            }
            // Redirect if non-admin somehow lands on admin tab
            if (ADMIN_TABS.indexOf(insightTab) !== -1 && !isAdmin) {
              setInsightTab("business");
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
                classification: rating != null ? (rating >= 5 ? "Wide" : rating >= 4 ? "Strong" : rating >= 3 ? "Moderate" : rating >= 2 ? "Narrow" : "Weak") : null,
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
            var _noFetch   = ["business","addlinfo","debug","signal","admin","financial","intrinsic","aianalysis","aiinsight","trend","momentum","reversal","whale"];
            var isLoading  = !tabContent && _noFetch.indexOf(insightTab) === -1;           return (
              <div style={{ border:"1px solid #e0dbd0", borderRadius:12, overflow:"hidden" }}>

                {/* Tab bar */}
                <div style={{ position:"relative" }}><div className="tab-scroll" style={{ display:"flex", background:"#faf8f4", borderBottom:"1px solid #e0dbd0", overflowX:"auto", WebkitOverflowScrolling:"touch", paddingRight:8, paddingBottom:4 }}>
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
                </div><div style={{ position:"absolute", right:0, top:0, bottom:0, width:40, background:"linear-gradient(to right, transparent, #faf8f4)", pointerEvents:"none", zIndex:1 }}></div></div>

                {/* Cache status strip -- admin only */}
                {isAdmin && (function() {
                  var _cs = window.__cacheStatus && window.__cacheStatus[sym + ":" + insightTab];
                  if (!_cs) return null;
                  var _cfg = {
                    hit:     { bg:"#1e2a1e", border:"#2a5020", dot:"#7abd00", label:"Served from cache", icon:"" },
                    written: { bg:"#1e2a1e", border:"#2a5020", dot:"#7abd00", label:"Cached and saved", icon:"" },
                    miss:    { bg:"#2a2010", border:"#4a3810", dot:"#EF9F27", label:"Cache miss -- calling Claude", icon:"" },
                    live:    { bg:"#111",    border:"#222",     dot:"#555",    label:"Live -- Claude generated", icon:"" },
                  }[_cs] || null;
                  if (!_cfg) return null;
                  return (
                    <div style={{ padding:"5px 16px", background:_cfg.bg, borderBottom:"1px solid " + _cfg.border, display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:_cfg.dot, flexShrink:0 }}></div>
                      <span style={{ fontSize:10, fontWeight:600, color:_cfg.dot, textTransform:"uppercase", letterSpacing:"0.08em" }}>{_cfg.label}</span>
                      {_cs === "hit" && <span style={{ fontSize:10, color:"#2a5020", marginLeft:"auto" }}>{"No Claude call -- $0.00"}</span>}
                      {_cs === "live" && <span style={{ fontSize:10, color:"#444", marginLeft:"auto" }}>{"~$0.03 per visit"}</span>}
                    </div>
                  );
                })()}

                {/* Tab content */}
                <div style={{ padding:"20px 22px", background:"#fff" }}>

                  {/* Intrinsic Value tab - show existing valuation chart */}
                  {insightTab === "intrinsic" && (
                    <div>
                      {vals.length > 0 && (function() {
                        var iv = parseFloat(oracle);
                        var isUnder = iv > price;
                        var pct = price > 0 ? Math.round(Math.abs(iv - price) / price * 100) : 0;
                        // Same 5-tier logic as summary pill
                        var bannerLabel, bannerBg, bannerBorder, bannerFg;
                        if (isUnder && pct > 20)      { bannerLabel="Exceptional"; bannerBg="#EAF3DE"; bannerBorder="#7abd00"; bannerFg="#1a6a1a"; }
                        else if (isUnder && pct >= 5) { bannerLabel="Undervalued"; bannerBg="#EAF3DE"; bannerBorder="#7abd00"; bannerFg="#1a6a1a"; }
                        else if (isUnder)              { bannerLabel="Fair";        bannerBg="#f0f7e6"; bannerBorder="#5a9020"; bannerFg="#3a6a1a"; }
                        else if (!isUnder && pct <= 10){ bannerLabel="Premium";     bannerBg="#FAEEDA"; bannerBorder="#d4a800"; bannerFg="#b88000"; }
                        else                           { bannerLabel="Overvalued";  bannerBg="#FCEBEB"; bannerBorder="#e08080"; bannerFg="#c03030"; }
                        var bannerSub = pct + "% " + (isUnder ? "discount" : "premium") + " ($" + Math.round(iv) + ")";
                        var _ivc = summaryCardDark(bannerLabel);
                        return (
                          <div style={{ background:_ivc.bg, border:"0.5px solid "+_ivc.bd, borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{"Intrinsic Value"}</div>
                                <div style={{ fontSize:15, fontWeight:700, color:_ivc.text, marginBottom:4 }}>{bannerLabel}</div>
                                <div style={{ fontSize:11, color:"#888", lineHeight:1.4 }}>{bannerSub}</div>
                              </div>
                              <div style={{ flexShrink:0, paddingLeft:16, textAlign:"right" }}>
                                <div style={{ fontSize:28, fontWeight:800, color:_ivc.text, lineHeight:1 }}>{"$"+oracle}</div>
                                <div style={{ fontSize:10, color:"#888", marginTop:2 }}>{"avg IV"}</div>
                              </div>
                            </div>
                            <div style={{ borderTop:"0.5px solid "+_ivc.bd+"44", paddingTop:8 }}>
                              <details>
                                <summary style={{ fontSize:10, color:"#777", cursor:"pointer", outline:"none", listStyle:"none", display:"flex", alignItems:"center", gap:4 }}>
                                  <span style={{ fontSize:9 }}>{"▶"}</span><span>{"How is this scored?"}</span>
                                </summary>
                                <div style={{ fontSize:10, color:"#666", lineHeight:1.8, padding:"6px 0", whiteSpace:"pre-line" }}>{"Intrinsic value = average of applicable models:\n\n  Cash Flow Model (20Y) — based on Operating Cash Flow\n  Earnings Model (20Y) — based on Net Income\n  Net Income Model (20Y) — per-share NI, no debt bridge\n  Gordon Growth Model — FCF per share + terminal value\n  Revenue Valuation (P/S) — Revenue per share × P/S ratio\n  Price/Book Model — Sector P/B × Book Value per share\n    (Financial, Healthcare, Consumer sectors only)\n\nGrowth rate uses longest positive EPS streak CAGR (capped 25%).\nDiscount rate = WACC adjusted for sector and debt.\n\nDiscount / Premium = (IV − Price) ÷ IV × 100:\n  Exceptional > +20%  ·  Undervalued +5–20%  ·  Fair 0–5%\n  Premium 0–10%  ·  Overvalued > +10%"}</div>
                              </details>
                            </div>
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
                            <span style={{ fontSize:11, color:"#aaa" }}>Intrinsic Value {oracle}</span>
                          </div>
                          {/* Bar chart - applicable + valid models only */}
                          {vals.filter(function(v){ return !v.bold; }).map(function(v, i) {
                            return <VBar key={i} label={v.label} value={v.value} maxV={maxV} color={v.color} bold={v.bold} />;
                          })}

                          {/* Model status list */}
                          {vals.length > 0 && vals[vals.length-1].modelsMeta && (function() {
                            var meta = vals[vals.length-1].modelsMeta;
                            var naData  = meta.filter(function(m){ return m.status === "nodata"; });
                            var naSect  = meta.filter(function(m){ return m.status === "na"; });
                            var okCount = meta.filter(function(m){ return m.status === "ok"; }).length;
                            return (
                              <div>
                                {naData.length > 0 && (
                                  <div style={{ marginTop:6 }}>
                                    {naData.map(function(m, i) {
                                      return (
                                        <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 10px", borderBottom:"1px solid #f5f2ec" }}>
                                          <span style={{ fontSize:11, color:"#bbb" }}>{m.label}</span>
                                          <span style={{ fontSize:10, color:"#ccc", fontStyle:"italic" }}>N/A  --  insufficient data</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {naSect.length > 0 && (
                                  <div style={{ marginTop:4 }}>
                                    {naSect.map(function(m, i) {
                                      return (
                                        <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 10px", borderBottom:"1px solid #f5f2ec", background:"#fafafa" }}>
                                          <span style={{ fontSize:11, color:"#ddd", textDecoration:"line-through" }}>{m.label}</span>
                                          <span style={{ fontSize:10, color:"#ddd", fontStyle:"italic" }}>Not applicable for this sector</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {/* Average note */}
                                <div style={{ marginTop:8, padding:"6px 10px", background:"#f5f2ec", borderRadius:6, fontSize:10, color:"#888" }}>
                                  {"Average of " + okCount + " applicable model" + (okCount !== 1 ? "s" : "") + " = $" + oracle}
                                  {vals[vals.length-1].sectorLabel ? "  (sector: " + vals[vals.length-1].sectorLabel + ")" : ""}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Intrinsic value bar */}
                          {vals.filter(function(v){ return v.bold; }).map(function(v, i) {
                            return <VBar key={"iv"+i} label={v.label} value={v.value} maxV={maxV} color={v.color} bold={v.bold} />;
                          })}
                          <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid #e0dbd0", textAlign:"right" }}>
                            <span style={{ fontSize:11, color:"#aaa" }}>Stock price: ${price.toFixed(2)}</span>
                          </div>

                          {/* Calculation Breakdowns - read from shared Calc objects, no recomputation */}
                          {ov && (function() {
                            function fmtM(v) { return v !== null && v !== undefined ? "$" + (v/1e6).toFixed(0) + "M" : "-"; }

                            function BdRow(props) {
                              return (
                                <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom: props.last ? "none" : "0.5px solid #e8e4de" }}>
                                  <span style={{ fontSize:11, color: props.bold ? "#333" : "#888" }}>{props.label}</span>
                                  <span style={{ fontSize:11, color: props.highlight ? "#1a6a1a" : "#333", fontWeight: props.bold || props.highlight ? 700 : 600 }}>{props.val}</span>
                                </div>
                              );
                            }
                            function BdDivider() {
                              return <div style={{ borderTop:"1px solid #c8c0b0", margin:"6px 0" }}></div>;
                            }
                            function BdSection(props) {
                              return (
                                <div style={{ marginBottom:12, background:"#f8f6f2", borderRadius:8, border:"0.5px solid #e0dbd0", overflow:"hidden" }}>
                                  <div style={{ padding:"7px 12px", background:"#ede9e1", borderBottom:"0.5px solid #e0dbd0", fontSize:11, fontWeight:700, color:"#555" }}>
                                    {props.title}
                                  </div>
                                  <div style={{ padding:"6px 12px" }}>{props.children}</div>
                                </div>
                              );
                            }

                            return (
                              <div style={{ marginTop:20, borderTop:"2px solid #e0dbd0", paddingTop:14 }}>
                                <div style={{ fontSize:12, fontWeight:700, color:"#111", marginBottom:12 }}>Calculation Details</div>

                                {/* DCF-20 - reads from dcf20Calc */}
                                {dcf20Calc && vals.length>0 && vals[vals.length-1].modelApplicable && vals[vals.length-1].modelApplicable["Cash Flow Model"] && (
                                  <BdSection title="Cash Flow Model (20Y)">
                                    <BdRow label="Operating Cash Flow"        val={fmtM(dcf20Calc.ocf)} />
                                    <BdRow label="Total Debt (SimFin)"        val={fmtM(dcf20Calc.debt)} />
                                    <BdRow label="Cash & ST Investments"      val={fmtM(dcf20Calc.cash)} />
                                    <BdRow label="Shares Outstanding"         val={(dcf20Calc.shares/1e6).toFixed(0) + "M"} />
                                    <BdRow label={"Growth Y1-5 (" + histCagrLabel} val={(g1Sum).toFixed(1) + "%"} />
                                    <BdRow label={"Growth Y6-10 (" + histG2Source} val={(g2Sum).toFixed(1) + "% -> 4%"} />
                                    <BdRow label="Growth Y11-20"              val="4%" />
                                    <BdRow label="Discount Rate"              val={(dcf20Calc.disc * 100).toFixed(2) + "%"} />
                                    <BdDivider />
                                    <BdRow label="Enterprise Value"           val={"$" + (dcf20Calc.ev/1e6).toFixed(0) + "M"} />
                                    <BdRow label="- Debt + Cash"              val={"$" + ((dcf20Calc.cash - dcf20Calc.debt)/1e6).toFixed(0) + "M"} />
                                    <BdRow label="/ Shares"                   val={(dcf20Calc.shares/1e6).toFixed(0) + "M"} />
                                    <BdDivider />
                                    <BdRow label="= Intrinsic Value"          val={"$" + dcf20Calc.perShare.toFixed(2)} bold={true} highlight={true} last={true} />
                                  </BdSection>
                                )}

                                {/* DCFF-20 - reads from dcff20Calc */}
                                {dcff20Calc && vals.length>0 && vals[vals.length-1].modelApplicable && vals[vals.length-1].modelApplicable["Earnings Model"] && (
                                  <BdSection title="Earnings Model (20Y)">
                                    <BdRow label={"Net Income (" + dcff20Calc.niSrc + ")"}  val={fmtM(dcff20Calc.niBase)} />
                                    <BdRow label="Total Debt (SimFin)"        val={fmtM(dcff20Calc.debt)} />
                                    <BdRow label="Cash & ST Investments"      val={fmtM(dcff20Calc.cash)} />
                                    <BdRow label="Shares Outstanding"         val={(dcff20Calc.shares/1e6).toFixed(0) + "M"} />
                                    <BdRow label={"Growth Y1-5 (" + histCagrLabel} val={(g1Sum).toFixed(1) + "%"} />
                                    <BdRow label={"Growth Y6-10 (" + histG2Source} val={(g2Sum).toFixed(1) + "% -> 4%"} />
                                    <BdRow label="Growth Y11-20"              val="4%" />
                                    <BdRow label="Discount Rate"              val={(dcff20Calc.disc * 100).toFixed(2) + "%"} />
                                    <BdDivider />
                                    <BdRow label="Enterprise Value"           val={"$" + (dcff20Calc.ev/1e6).toFixed(0) + "M"} />
                                    <BdRow label="- Debt + Cash"              val={"$" + ((dcff20Calc.cash - dcff20Calc.debt)/1e6).toFixed(0) + "M"} />
                                    <BdRow label="/ Shares"                   val={(dcff20Calc.shares/1e6).toFixed(0) + "M"} />
                                    <BdDivider />
                                    <BdRow label="= Intrinsic Value"          val={"$" + dcff20Calc.perShare.toFixed(2)} bold={true} highlight={true} last={true} />
                                  </BdSection>
                                )}

                                {/* DNI-20 - reads from dni20Calc */}
                                {dni20Calc && vals.length>0 && vals[vals.length-1].modelApplicable && vals[vals.length-1].modelApplicable["Net Income Model"] && (
                                  <BdSection title="Net Income Model (20Y)">
                                    <BdRow label={"Net Income per Share (" + dni20Calc.niSrc + ")"} val={"$" + dni20Calc.niPerShare.toFixed(4)} />
                                    <BdRow label="Shares Outstanding"         val={(dni20Calc.shares/1e6).toFixed(0) + "M"} />
                                    <BdRow label={"Growth Y1-5 (" + histCagrLabel} val={(g1Sum).toFixed(1) + "%"} />
                                    <BdRow label={"Growth Y6-10 (" + histG2Source} val={(g2Sum).toFixed(1) + "% -> 4%"} />
                                    <BdRow label="Growth Y11-20"              val="4%" />
                                    <BdRow label="Discount Rate"              val={(dni20Calc.disc * 100).toFixed(2) + "%"} />
                                    <BdDivider />
                                    <BdRow label="= Intrinsic Value"          val={"$" + dni20Calc.perShare.toFixed(2)} bold={true} highlight={true} last={true} />
                                  </BdSection>
                                )}

                                {/* FCF-GG - reads from ggCalc */}
                                {ggCalc && vals.length>0 && vals[vals.length-1].modelApplicable && vals[vals.length-1].modelApplicable["Gordon Growth"] && (
                                  <BdSection title="Gordon Growth Model">
                                    <BdRow label="Free Cash Flow (Yahoo)"         val={fmtM(ggCalc.fcfBase)} />
                                    <BdRow label="FCF per Share"                  val={"$" + ggCalc.fcfPS.toFixed(4)} />
                                    <BdRow label={"Growth Y1-5 (" + histCagrLabel} val={(g1Sum).toFixed(1) + "%"} />
                                    <BdRow label={"Growth Y6-10 (" + histG2Source} val={(g2Sum).toFixed(1) + "% -> 4%"} />
                                    <BdRow label="Growth Y11-20"                  val="4%" />
                                    <BdRow label="Discount Rate"                  val={(ggCalc.disc * 100).toFixed(2) + "%"} />
                                    <BdDivider />
                                    <BdRow label="Part 1: PV of Years 1-20"       val={"$" + ggCalc.pvExplicit.toFixed(2) + "/sh"} />
                                    <BdRow label="FCF at Year 20"                 val={"$" + ggCalc.fcfAt20.toFixed(4) + "/sh"} />
                                    <BdRow label="Terminal Value at Yr 20"        val={"$" + ggCalc.tv.toFixed(2) + "/sh  [FCF21/(10%-4%)]"} />
                                    <BdRow label="Part 2: PV of Terminal Value"   val={"$" + ggCalc.pvTv.toFixed(2) + "/sh  [TV/(1.10)^20]"} />
                                    <BdDivider />
                                    <BdRow label="= Intrinsic Value (Pt1 + Pt2)"  val={"$" + ggCalc.total.toFixed(2)} bold={true} highlight={true} last={true} />
                                  </BdSection>
                                )}

                                {/* PS Breakdown - reads from psCalc* computed once in vals block above */}
                                {price > 0 && vals.length>0 && vals[vals.length-1].modelApplicable && vals[vals.length-1].modelApplicable["Revenue PS"] && (
                                  <BdSection title="Revenue Valuation (PS)">
                                    <BdRow label="Current Price"                                  val={"$" + price.toFixed(2)} />
                                    <BdRow label="TTM Price / Sales (PS)"                         val={psCalcRatio > 0 ? psCalcRatio.toFixed(2) + "x" : "N/A"} />
                                    <BdRow label={"Revenue per Share  [" + (psCalcRevSrc || "N/A") + "]"} val={psCalcRevPS > 0 ? "$" + psCalcRevPS.toFixed(4) : "N/A"} />
                                    <BdRow label="Mean PS Ratio (TTM)"                            val={psCalcRatio > 0 ? psCalcRatio.toFixed(2) + "x" : "N/A"} />
                                    <BdDivider />
                                    <BdRow label="= Intrinsic Value  [Rev/sh x PS]"               val={"$" + psCalcIV.toFixed(2)} bold={true} highlight={true} last={true} />
                                  </BdSection>
                                )}



                              </div>
                            );
                          })()}

                        </div>
                      ) : (
                        <div>
                          {!ov ? (
                            <div style={{ textAlign:"center", padding:"28px 0" }}>
                              <div style={{ width:24, height:24, border:"3px solid #e0dbd0", borderTop:"3px solid "+LIME, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
                              <div style={{ color:"#aaa", fontSize:13 }}>Loading valuation data...</div>
                            </div>
                          ) : (
                            <div style={{ padding:"20px 16px", background:"#faf8f4", borderRadius:10, border:"1px solid #e8e4de" }}>
                              <div style={{ fontSize:14, fontWeight:600, color:"#888", marginBottom:8 }}>Intrinsic Value Not Available</div>
                              <div style={{ fontSize:13, color:"#aaa", lineHeight:1.7 }}>
                                {"None of the 6 valuation models could be computed. This typically means the company has negative or zero earnings, free cash flow, and no P/S ratio available  --  common for early-stage or loss-making companies."}
                              </div>
                              <div style={{ marginTop:10, fontSize:11, color:"#ccc", lineHeight:1.6 }}>
                                <div style={{ marginBottom:4, fontWeight:600, color:"#bbb" }}>Models attempted:</div>
                                {["Cash Flow Model (20Y)", "Earnings Model (20Y)", "Net Income Model (20Y)", "Gordon Growth Model", "Revenue Valuation (PS)", "PEG Ratio", "EV / Revenue Model", "Revenue DCF Model", "Price / Book Model"].map(function(m,i) {
                                  return <div key={i} style={{ padding:"3px 0", borderBottom:"1px solid #f0ede6", display:"flex", justifyContent:"space-between" }}>
                                    <span>{m}</span><span style={{ color:"#ddd", fontStyle:"italic" }}>N/A</span>
                                  </div>;
                                })}
                              </div>
                              <div style={{ marginTop:12, fontSize:12, color:"#bbb", lineHeight:1.6 }}>
                                {"Consider P/S ratio, EV/Revenue, or sector-specific metrics for growth-stage companies."}
                              </div>
                              {ov.ps > 0 && (
                                <div style={{ marginTop:12, display:"flex", gap:12, flexWrap:"wrap" }}>
                                  <div style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:8, padding:"8px 14px" }}>
                                    <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>P/S Ratio</div>
                                    <div style={{ fontSize:15, fontWeight:700, color:"#333" }}>{ov.ps.toFixed(1)+"x"}</div>
                                  </div>
                                  {ov.pb > 0 && (
                                    <div style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:8, padding:"8px 14px" }}>
                                      <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>P/B Ratio</div>
                                      <div style={{ fontSize:15, fontWeight:700, color:"#333" }}>{ov.pb.toFixed(1)+"x"}</div>
                                    </div>
                                  )}
                                  {ov.evEbitda > 0 && (
                                    <div style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:8, padding:"8px 14px" }}>
                                      <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>EV/EBITDA</div>
                                      <div style={{ fontSize:15, fontWeight:700, color:"#333" }}>{ov.evEbitda.toFixed(1)+"x"}</div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI-powered tabs */}
                  {insightTab !== "intrinsic" && (
                    <div>
                      {!tabContent && insightTab !== "business" && insightTab !== "addlinfo" && insightTab !== "debug" && insightTab !== "signal" && insightTab !== "trend" && insightTab !== "momentum" && insightTab !== "reversal" && insightTab !== "aianalysis" && insightTab !== "financial" && insightTab !== "admin" && insightTab !== "whale" && (
                        <div style={{ textAlign:"center", padding:"40px 0" }}>
                          <div style={{ fontSize:12, color:"#888", marginBottom:14 }}>Generating {insightTab} analysis for {sym}...</div>
                          <div style={{ display:"inline-block", width:26, height:26, border:"3px solid #e0dbd0", borderTop:"3px solid " + LIME, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
                        </div>
                      )}

                    {ov && insightTab==="intrinsic" && (function(){
                      var _mc=window.__mc||function(){return "#888";};
                      var fmt2=function(v){return v>0?v.toFixed(2)+"x":"-";};
                      var fpct=function(v){return v?(v>0?"+":"")+v.toFixed(2)+"%":"-";};
                      var fB=function(v){if(!v)return "-"; var a=Math.abs(v); return (v<0?"-$":"$")+(a>=1e12?(a/1e12).toFixed(2)+"T":a>=1e9?(a/1e9).toFixed(1)+"B":a>=1e6?(a/1e6).toFixed(0)+"M":""+a);};
                      var rows=[
                        {label:"P/E Ratio (TTM)",val:ov.pe>0?ov.pe.toFixed(1)+"x":"-",col:_mc(ov.pe,15,25,40,true),tip:"Price-to-Earnings: how much you pay for $1 of profit."},
                        {label:"Forward P/E",val:ov.fpe>0?ov.fpe.toFixed(1)+"x":"-",col:_mc(ov.fpe,15,25,40,true),tip:"Based on next year estimated earnings."},
                        {label:"Price / Sales (TTM)",val:ov.ps>0?fmt2(ov.ps):"-",col:_mc(ov.ps,2,6,12,true),tip:"How much you pay per $1 of revenue."},
                        {label:"EV / EBITDA",val:ov.evEbitda>0?fmt2(ov.evEbitda):"-",col:_mc(ov.evEbitda,10,20,30,true),tip:"Enterprise Value vs operating profit."},
                        {label:"Price / Book (P/B)",val:ov.pb>0?fmt2(ov.pb):"-",col:_mc(ov.pb,3,8,20,true),tip:"How much you pay vs net asset value."},
                        {label:"Price / Free Cash Flow",val:ov.pFcf>0?fmt2(ov.pFcf):"-",col:_mc(ov.pFcf,15,30,50,true),tip:"How much you pay per $1 of free cash."},
                        {label:"PEG Ratio",val:ov.peg>0?ov.peg.toFixed(2):"-",col:_mc(ov.peg,1,2,3,true),tip:"P/E divided by earnings growth rate."},
                        {label:"Dividend Yield",val:ov.divY>0?fpct(ov.divY):"None",col:"#888",tip:"Annual dividend as % of stock price."},
                      ];
                      return (
                        <div style={{marginTop:20,borderTop:"1px solid #e0dbd0",paddingTop:16}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Market Multiples</div>
                          <table style={{width:"100%",borderCollapse:"collapse"}}>
                            <tbody>
                              {rows.map(function(m,i){return (
                                <tr key={i} style={{borderBottom:i<rows.length-1?"1px solid #f0ede8":"none"}} title={m.tip}>
                                  <td style={{padding:"6px 0",fontSize:11,color:"#888",width:"60%",cursor:"help"}}>{m.label}<span style={{fontSize:9,color:"#bbb",marginLeft:3}}>{"?"}</span></td>
                                  <td style={{padding:"6px 0",fontSize:12,fontWeight:700,color:m.col||"#555",textAlign:"right",cursor:"help"}}>{m.val}</td>
                                </tr>
                              );})}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

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

                    {ov && insightTab==="business" && (function(){
                      var _mc=window.__mc||function(){return "#888";};
                      var fmt2=function(v){return v>0?v.toFixed(2)+"x":"-";};
                      var fpct=function(v){return v?(v>0?"+":"")+v.toFixed(2)+"%":"-";};
                      var fB=function(v){if(!v)return "-"; var a=Math.abs(v); return (v<0?"-$":"$")+(a>=1e12?(a/1e12).toFixed(2)+"T":a>=1e9?(a/1e9).toFixed(1)+"B":a>=1e6?(a/1e6).toFixed(0)+"M":""+a);};
                      var rows=[
                        {label:"EPS Growth (TTM)",val:ov.epsG?fpct(ov.epsG):"-",col:_mc(ov.epsG,15,5,0),tip:"Earnings per share growth over the trailing twelve months."},
                        {label:"Revenue Growth YoY",val:ov.revGrowth?fpct(ov.revGrowth):"-",col:_mc(ov.revGrowth,10,3,0),tip:"Year-over-year revenue growth rate."},
                        {label:"LT EPS Growth (5yr Est.)",val:ov.ltG?fpct(ov.ltG):"-",col:_mc(ov.ltG,10,5,0),tip:"Analyst consensus estimate for long-term earnings growth."},
                        {label:"Beta",val:ov.beta>0?ov.beta.toFixed(2):"-",col:_mc(ov.beta,0,1.5,2,true),tip:"Measures how much the stock moves relative to the market."},
                        {label:"Market Cap",val:fB(ov.mc),col:"#888",tip:"Total market value of all shares outstanding."},
                        {label:"Dividend Yield (TTM)",val:ov.divY>0?fpct(ov.divY):"None",col:"#888",tip:"Annual dividend paid as a percentage of current stock price."},
                      ];
                      return (
                        <div style={{marginTop:20,borderTop:"1px solid #e0dbd0",paddingTop:16}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Growth & Profile</div>
                          <table style={{width:"100%",borderCollapse:"collapse"}}>
                            <tbody>
                              {rows.map(function(m,i){return (
                                <tr key={i} style={{borderBottom:i<rows.length-1?"1px solid #f0ede8":"none"}} title={m.tip}>
                                  <td style={{padding:"6px 0",fontSize:11,color:"#888",width:"60%",cursor:"help"}}>{m.label}<span style={{fontSize:9,color:"#bbb",marginLeft:3}}>{"?"}</span></td>
                                  <td style={{padding:"6px 0",fontSize:12,fontWeight:700,color:m.col||"#555",textAlign:"right",cursor:"help"}}>{m.val}</td>
                                </tr>
                              );})}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                      {/* Economic MOAT */}
                      {insightTab === "moat" && tabContent && (function() {
                        var parsed = parseMoat(tabContent);
                        if (!parsed || parsed.sections.length === 0) {
                          return <div style={{ fontSize:13, color:"#333", lineHeight:1.8 }}>{tabContent}</div>;
                        }
                        function scoreColor(s) {
                          if (s >= 4) return "#1a6a1a";
                          if (s >= 3) return "#b88000";
                          if (s >= 2) return "#b88000";
                          return "#c03030";
                        }
                        function scoreLabel(s) {
                          if (s >= 5) return "Wide";
                          if (s >= 4) return "Strong";
                          if (s >= 3) return "Moderate";
                          if (s >= 2) return "Narrow";
                          return "Weak";
                        }
                        function fsCol(col) {
                          if (!col) return { text:"#888", bg:"#f5f5f5", border:"#ddd" };
                          var v = col.toLowerCase();
                          if (v.includes("exceptional")||v.includes("wide")) return { text:"#0d4f0d", bg:"#d4edda", border:"#7abd00" };
                          if (v.includes("strong"))      return { text:"#1a6a1a", bg:"#e6f4e6", border:"#7abd00" };
                          if (v.includes("moderate")||v.includes("narrow")) return { text:"#b88000", bg:"#fdf8e6", border:"#d4a800" };
                          if (v.includes("weak"))        return { text:"#b84000", bg:"#fff4ee", border:"#e08050" };
                          if (v.includes("poor"))        return { text:"#c03030", bg:"#fff0f0", border:"#e08080" };
                          return { text:"#888", bg:"#f5f5f5", border:"#ddd" };
                        }
                        function DotBar(props) {
                          var displayScore = props.score || 0;
                          // If classification provided, use it to determine dot count and label
                          var label = props.classification || scoreLabel(displayScore);
                          var dotCount = props.classification ?
                            (props.classification==="Wide"?5:props.classification==="Strong"?4:props.classification==="Moderate"?3:props.classification==="Narrow"?2:1)
                            : displayScore;
                          var col = props.classification ?
                            (props.classification==="Wide"||props.classification==="Strong"?"#1a6a1a":props.classification==="Moderate"||props.classification==="Narrow"?"#b88000":"#c03030")
                            : scoreColor(displayScore);
                          var dots = [];
                          for (var d = 1; d <= 5; d++) {
                            dots.push(<span key={d} style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background: d <= dotCount ? col : "#ddd", marginRight:3 }} />);
                          }
                          return (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:0 }}>
                              {dots}
                              <span style={{ fontSize:10, color:col, fontWeight:600, marginLeft:5 }}>{label}</span>
                            </span>
                          );
                        }
                        var pi = parsedInsights["moat"] || {};
                        return (
                          <div>
                            {pi.classification && (function(){
                              var _mc = summaryCardDark(pi.classification);
                              return (
                                  <div style={{ background:_mc.bg, border:"0.5px solid "+_mc.bd, borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: pi.explanation ? 10 : 0 }}>
                                      <div>
                                        <div style={{ fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Economic Moat</div>
                                        <div style={{ fontSize:15, fontWeight:700, color:_mc.text }}>{pi.classification}</div>
                                      </div>
                                      <div style={{ flexShrink:0, paddingLeft:16, textAlign:"right" }}>
                                        <DotBar score={pi.score} classification={pi.classification} />
                                      </div>
                                    </div>
                                    {(function(){ var _exp = (pi.explanation||"").replace(/^\*+|\*+$/g,"").trim(); return _exp.length > 5 ? <div style={{ fontSize:12, color:"#aaa", lineHeight:1.7, marginBottom:10 }}>{_exp}</div> : null; })()}
                                    <div style={{ borderTop:"0.5px solid "+_mc.bd+"44", paddingTop:8 }}>
                                      <details>
                                        <summary style={{ fontSize:10, color:"#777", cursor:"pointer", outline:"none", listStyle:"none", display:"flex", alignItems:"center", gap:4 }}>
                                          <span style={{ fontSize:9 }}>{"▶"}</span><span>{"How is this scored?"}</span>
                                        </summary>
                                        <div style={{ fontSize:10, color:"#666", lineHeight:1.8, padding:"6px 0", whiteSpace:"pre-line" }}>{"Each moat driver is scored 0–5 by the AI model and combined into an overall rating.\n\nDrivers assessed:\n  Network Effects · Switching Costs · Cost Advantage\n  Intangible Assets · Efficient Scale · Ecosystem Lock-in\n\nFinal rating = weighted average of all driver scores (equal weight):\n  Wide (4.3–5.0)  ·  Strong (3.5–4.2)  ·  Moderate (2.5–3.4)\n  Narrow (1.5–2.4)  ·  Weak (0–1.4)"}</div>
                                      </details>
                                    </div>
                                  </div>
                                  );
                            })()}
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
                          </div>
                        );
                      })()}

                      {/* Financial Strength */}
                      {insightTab === "financial" && (function() {
                        var piF = parsedInsights["financial"] || {};
                        var _sector = ov ? (ov.sector || "") : "";
                        var _isFinancial  = _sector.includes("Financial");
                        var _isHealthcare = _sector.includes("Healthcare") || _sector.includes("Health");
                        var _isEnergy     = _sector.includes("Energy") || _sector.includes("Mining") || _sector.includes("Basic Materials");
                        var _isRetail     = _sector.includes("Consumer") || _sector.includes("Retail");
                        var _isUtility    = _sector.includes("Utilities") || _sector.includes("Real Estate");
                        var _isTech       = _sector.includes("Technology") || _sector.includes("Communication");
                        // Default = S&P 500 broad market medians (used when sector unknown)
                        var DEFAULT_T = {
                          grossMargin:  [45, 30, 15, 5 ],
                          opMargin:     [15, 8,  3,  0 ],
                          netMargin:    [10, 5,  2,  0 ],
                          roe:          [18, 10, 5,  0 ],
                          currentRatio: [1.8, 1.3, 1.0, 0.5],
                          quickRatio:   [1.2, 0.8, 0.5, 0.3],
                          revGrowth:    [12, 7,  3,  0 ],
                        };
                        var _hasSector = !!_sector;
                        var THRESHOLDS = {
                          grossMargin:  !_hasSector?DEFAULT_T.grossMargin:_isHealthcare?[25,15,8,3]:_isFinancial?[40,25,15,5]:_isEnergy?[45,30,15,5]:_isRetail?[35,20,10,5]:_isUtility?[50,35,20,10]:_isTech?[60,40,25,10]:DEFAULT_T.grossMargin,
                          opMargin:     !_hasSector?DEFAULT_T.opMargin:_isHealthcare?[8,5,3,0]:_isFinancial?[30,20,10,5]:_isEnergy?[20,10,5,0]:_isRetail?[8,4,2,0]:_isUtility?[20,12,6,2]:_isTech?[30,15,5,0]:DEFAULT_T.opMargin,
                          netMargin:    !_hasSector?DEFAULT_T.netMargin:_isHealthcare?[6,3,2,0]:_isFinancial?[20,12,6,0]:_isEnergy?[15,8,3,0]:_isRetail?[5,3,1,0]:_isUtility?[15,8,4,0]:_isTech?[20,10,5,0]:DEFAULT_T.netMargin,
                          roe:          !_hasSector?DEFAULT_T.roe:_isHealthcare?[15,10,6,0]:_isFinancial?[12,8,5,0]:_isEnergy?[15,10,5,0]:_isRetail?[20,12,6,0]:_isUtility?[12,8,4,0]:_isTech?[25,15,8,0]:DEFAULT_T.roe,
                          currentRatio: !_hasSector?DEFAULT_T.currentRatio:(_isFinancial||_isHealthcare||_isUtility)?[1.2,1.0,0.8,0.5]:DEFAULT_T.currentRatio,
                          quickRatio:   !_hasSector?DEFAULT_T.quickRatio:(_isFinancial||_isHealthcare)?[1.0,0.8,0.6,0.3]:DEFAULT_T.quickRatio,
                          revGrowth:    !_hasSector?DEFAULT_T.revGrowth:_isUtility?[8,5,2,0]:_isEnergy?[15,8,3,0]:_isFinancial?[10,6,3,0]:_isTech?[20,10,5,0]:DEFAULT_T.revGrowth,
                        };
                        function metricScore(val, key) {
                          if (!val || val === 0) return 0;
                          var t = THRESHOLDS[key] || [60,40,20,10];
                          for (var i=0; i<t.length; i++) { if (val >= t[i]) return t.length-i; }
                          return 1;
                        }
                        function fsCol(col) {
                          if (!col) return { text:"#888", bg:"#f5f5f5", border:"#ddd" };
                          var v = col.toLowerCase();
                          if (v.includes("exceptional")) return { text:"#0d4f0d", bg:"#d4edda", border:"#7abd00" };
                          if (v.includes("strong"))      return { text:"#1a6a1a", bg:"#e6f4e6", border:"#7abd00" };
                          if (v.includes("moderate")||v.includes("narrow"))
                                                         return { text:"#b88000", bg:"#fdf8e6", border:"#d4a800" };
                          if (v.includes("weak"))        return { text:"#b84000", bg:"#fff4ee", border:"#e08050" };
                          if (v.includes("poor"))        return { text:"#c03030", bg:"#fff0f0", border:"#e08080" };
                          return { text:"#888", bg:"#f5f5f5", border:"#ddd" };
                        }
                        function MetricDots(props) {
                          if (!props.score) return null;
                          var col = props.score>=4?"#1a6a1a":props.score>=3?"#b88000":"#c03030";
                          var dots = [];
                          for (var d=1;d<=5;d++) dots.push(<span key={d} style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:d<=props.score?col:"#ddd", marginRight:2 }} />);
                          return <span style={{ display:"inline-flex", alignItems:"center" }}>{dots}</span>;
                        }
                        function getCommentary(label, val, score) {
                          if (!val || val === "-") return null;
                          var s = score || 0;
                          var sn = !_hasSector ? "" : (_isHealthcare||_isFinancial||_isRetail||_isUtility) ? " (typical for this sector)" : "";
                          var map = {
                            "Gross Margin":      s>=5?"Exceptional pricing power  -  keeps most of each dollar earned":s>=4?"Strong margins  -  efficient at converting sales to profit":s>=3?"Adequate margins  -  covers costs with reasonable profit"+sn:s>=2?"Thin margins  -  limited pricing power"+sn:"Very low margins"+sn,
                            "Operating Margin":  s>=5?"Highly efficient operations":s>=4?"Strong operational efficiency":s>=3?"Reasonable operational control"+sn:s>=2?"Tight operations  -  limited room for error"+sn:"Very slim operating margin"+sn,
                            "Net Profit Margin": s>=5?"Exceptional profitability  -  keeps a large share of every dollar":s>=4?"Strong bottom line after all expenses and taxes":s>=3?"Profitable  -  reasonable earnings after all costs"+sn:s>=2?"Slim profits  -  little room after all expenses"+sn:"Very thin net margin"+sn,
                            "Return on Equity":  s>=5?"Outstanding  -  exceptional returns for shareholders":s>=4?"Strong returns on shareholder investment":s>=3?"Decent returns  -  earns adequately on equity"+sn:s>=2?"Below average returns for shareholders"+sn:"Low returns on equity"+sn,
                            "Current Ratio":     s>=5?"Very liquid  -  easily covers short-term obligations":s>=4?"Comfortable liquidity  -  healthy buffer":s>=3?"Adequate  -  can meet short-term obligations"+sn:s>=2?"Tight liquidity  -  near minimum safe level"+sn:"Low liquidity ratio"+sn,
                            "Quick Ratio":       s>=5?"Excellent  -  covers obligations without selling inventory":s>=4?"Good immediate liquidity":s>=3?"Adequate liquid assets"+sn:s>=2?"Limited liquid assets  -  could be stretched"+sn:"Low quick ratio"+sn,
                            "Free Cash Flow":    s>=5?"Exceptional cash generation  -  business prints money":s>=4?"Strong free cash flow  -  healthy and self-funding":s>=3?"Positive cash flow  -  business funds itself":s>=2?"Modest cash generation":"Burning cash  -  spending more than it generates",
                            "Total Debt/Equity": s>=5?"Minimal debt  -  very conservatively financed":s>=4?"Low leverage  -  comfortable debt levels":s>=3?"Moderate leverage  -  manageable debt load":s>=2?"Elevated leverage  -  debt is significant":"High leverage  -  significant financial risk",
                            "Revenue Growth YoY":s>=5?"Exceptional growth  -  rapidly expanding revenue":s>=4?"Strong growth  -  business scaling well":s>=3?"Solid growth  -  steady revenue expansion"+sn:s>=2?"Slow growth  -  modest revenue gains"+sn:"Declining or flat revenue  -  growth challenges",
                            "Debt / EBITDA":     s>=5?"Very low debt  -  repayable under 1 year of earnings":s>=4?"Low leverage  -  debt easily manageable":s>=3?"Moderate debt load  -  serviceable":s>=2?"High debt relative to earnings  -  monitor carefully":"Very high debt burden  -  potential serviceability risk",
                            "Debt / Cash Flow":  s>=5?"Minimal debt  -  repayable under 1 year from cash flow":s>=4?"Low debt  -  cash flow comfortably covers debt":s>=3?"Manageable  -  a few years of cash flow to clear debt":s>=2?"Heavy debt relative to cash flow":"Debt significantly exceeds annual cash generation",
                          };
                          return map[label] || null;
                        }
                        function MetricRow(props) {
                          return (
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0, borderBottom:"1px solid #f0ede6" }}>
                              {props.items.map(function(item, ii) {
                                var comment = getCommentary(item.label, item.val, item.score);
                                return (
                                  <div key={ii} style={{ padding:"10px 14px", borderRight:ii===0?"1px solid #f0ede6":"none" }}>
                                    <div style={{ marginBottom:3 }}>
                                      <span style={{ fontSize:11, color:"#999" }}>{item.label}</span>
                                    </div>
                                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:comment?4:0 }}>
                                      <span style={{ fontSize:14, fontWeight:700, color:item.val==="-"?"#ccc":"#111" }}>{item.val||"-"}</span>
                                      {item.score>0 && <MetricDots score={item.score} />}
                                    </div>
                                    {comment && <div style={{ fontSize:10, color:"#888", lineHeight:1.4 }}>{comment}</div>}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        var gm  = ov ? ov.grossMargin  : null;
                        var om  = ov ? ov.opMargin     : null;
                        var nm  = ov ? ov.netMargin    : null;
                        var roe = ov ? ov.roe          : null;
                        var cr  = ov ? ov.currentRatio : null;
                        var qr  = ov ? ov.quickRatio   : null;
                        var de  = ov ? ov.de           : null;
                        var rg  = ov ? ov.revGrowth    : null;
                        var fcf = ov ? ov.fcfRaw       : null;
                        var rev = ov ? ov.revenue      : null;
                        var ni  = ov ? ov.netIncome    : null;
                        function pct(v) { return v ? v.toFixed(2)+"%" : "-"; }
                        function fmt2(v) { return v>0 ? v.toFixed(2)+"x" : "-"; }
                        function fmtB(v) { if (!v||v===0) return "-"; var a=Math.abs(v); return (v<0?"-$":"$")+(a>=1e12?(a/1e12).toFixed(2)+"T":a>=1e9?(a/1e9).toFixed(1)+"B":(a/1e6).toFixed(0)+"M"); }
                        var rawText = insightCache["financial"] || "";
                        // Expose computed strength so left panel pill stays consistent
                        if (sym) {
                          if (!window.__computedFinStrength) window.__computedFinStrength = {};
                          // computed after metrics below - will be set at render time
                        }
                        var aiText = rawText.replace(/Financial Strength Classification:.+/i,"").trim();

                        // Compute classification from grid scores (sector-aware, excludes blanks)
                        var _gridScores = [
                          metricScore(gm,  "grossMargin"),
                          metricScore(om,  "opMargin"),
                          metricScore(nm,  "netMargin"),
                          metricScore(roe, "roe"),
                          metricScore(cr,  "currentRatio"),
                          metricScore(qr,  "quickRatio"),
                          metricScore(rg,  "revGrowth"),
                          fcf > 0 ? (fcf > 10e9 ? 5 : fcf > 1e9 ? 4 : 3) : 0,
                          (function(){ var eb=ov?ov.ebitda:0; var td=ov?ov.totalDebt:0; if(!eb||!td) return 0; var r=td/eb; return r<1?5:r<2?4:r<3?3:r<4?2:1; })(),
                          (function(){ var ocf=ov?ov.ocfRaw:0; var td=ov?ov.totalDebt:0; if(!ocf||!td) return 0; var r=td/ocf; return r<1?5:r<2?4:r<3?3:r<5?2:1; })(),
                          de > 0 ? (de<0.5?5:de<1?4:de<2?3:de<3?2:1) : 0,
                        ].filter(function(s){ return s > 0; }); // exclude blanks (score=0)

                        var _gridAvg = _gridScores.length > 0
                          ? _gridScores.reduce(function(a,b){ return a+b; }, 0) / _gridScores.length
                          : 0;
                        var _computedClass = _gridAvg >= 4 ? "Exceptional" : _gridAvg >= 3 ? "Strong" : _gridAvg >= 2 ? "Moderate" : _gridAvg >= 1 ? "Weak" : _gridAvg > 0 ? "Poor" : null;
                        var _computedScore = _gridAvg >= 4 ? 5 : _gridAvg >= 3 ? 4 : _gridAvg >= 2 ? 3 : _gridAvg >= 1 ? 2 : _gridAvg > 0 ? 1 : 0;
                        var fc = fsCol(_computedClass);
                        // Store for left panel pill consistency
                        if (sym && _computedClass) {
                          if (!window.__computedFinStrength) window.__computedFinStrength = {};
                          window.__computedFinStrength[sym] = { classification: _computedClass, score: _computedScore };
                        }

                        return (
                          <div>
                            {_computedClass && (function(){
                              var _fc2 = summaryCardDark(_computedClass);
                              return (
                              <div style={{ background:_fc2.bg, border:"0.5px solid "+_fc2.bd, borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                                  <div style={{ flex:1 }}>
                                    <div style={{ fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{"Financial Strength"}</div>
                                    <div style={{ fontSize:15, fontWeight:700, color:_fc2.text, marginBottom:4 }}>{_computedClass}</div>
                                    <div style={{ fontSize:11, color:"#888", lineHeight:1.4 }}>{"avg score "+_gridAvg.toFixed(1)+" / 5 from "+_gridScores.length+" metrics"}</div>
                                  </div>
                                  <div style={{ flexShrink:0, paddingLeft:16, display:"flex", gap:3, alignItems:"center" }}>
                                    {[1,2,3,4,5].map(function(d){ return <span key={d} style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:d<=_computedScore?_fc2.text:"#333" }} />; })}
                                  </div>
                                </div>
                                <div style={{ borderTop:"0.5px solid "+_fc2.bd+"44", paddingTop:8 }}>
                                  <details>
                                    <summary style={{ fontSize:10, color:"#777", cursor:"pointer", outline:"none", listStyle:"none", display:"flex", alignItems:"center", gap:4 }}>
                                      <span style={{ fontSize:9 }}>{"▶"}</span><span>{"How is this scored?"}</span>
                                    </summary>
                                    <div style={{ fontSize:10, color:"#666", lineHeight:1.8, padding:"6px 0", whiteSpace:"pre-line" }}>{"11 financial metrics are each scored 1–5 using sector-aware benchmarks, then averaged.\n\nMargins: Gross Margin · Operating Margin · Net Profit Margin\nEfficiency: Return on Equity\nLiquidity: Current Ratio · Quick Ratio\nCash Generation: Free Cash Flow\nLeverage: Debt/Equity · Debt/EBITDA · Debt/Cash Flow\nGrowth: Revenue Growth YoY\n\nFinal classification:\n  Exceptional ≥4.0 · Strong ≥3.0 · Moderate ≥2.0 · Weak ≥1.0 · Poor <1.0\n\nOnly metrics with available data are included."}</div>
                                  </details>
                                </div>
                              </div>
                              );
                            })()}
                            <div style={{ border:"1px solid #f0ede6", borderRadius:10, overflow:"hidden", marginBottom:14 }}>
                              <div style={{ padding:"8px 14px", background:"#f5f2ec", borderBottom:"1px solid #e8e4de", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                                <span style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em" }}>Financial Health</span>
                                <span style={{ fontSize:10, color:"#aaa", background:"#eee", padding:"2px 8px", borderRadius:10 }}>{!_hasSector?"S&P 500 default benchmark":_isFinancial?"Financial Services benchmark":_isHealthcare?"Healthcare benchmark":_isEnergy?"Energy benchmark":_isRetail?"Retail/Consumer benchmark":_isUtility?"Utility benchmark":_isTech?"Technology benchmark":"General benchmark"}</span>
                              </div>
                              <MetricRow items={[{ label:"Gross Margin", val:pct(gm), score:metricScore(gm,"grossMargin") },{ label:"Return on Equity", val:pct(roe), score:metricScore(roe,"roe") }]} />
                              <MetricRow items={[{ label:"Operating Margin", val:pct(om), score:metricScore(om,"opMargin") },{ label:"Current Ratio", val:fmt2(cr), score:metricScore(cr,"currentRatio") }]} />
                              <MetricRow items={[{ label:"Net Profit Margin", val:pct(nm), score:metricScore(nm,"netMargin") },{ label:"Quick Ratio", val:fmt2(qr), score:metricScore(qr,"quickRatio") }]} />
                              <MetricRow items={[{ label:"Free Cash Flow", val:fmtB(fcf), score:fcf>0?(fcf>10e9?5:fcf>1e9?4:3):0 },{ label:"Total Debt/Equity", val:de>0?de.toFixed(2)+"x":"-", score:de>0?(de<0.5?5:de<1?4:de<2?3:de<3?2:1):0 }]} />
                              <MetricRow items={[{ label:"Debt / EBITDA", val:(function(){ var eb=ov?ov.ebitda:0; var td=ov?ov.totalDebt:0; return (eb>0&&td>0)?(td/eb).toFixed(2)+"x":"-"; })(), score:(function(){ var eb=ov?ov.ebitda:0; var td=ov?ov.totalDebt:0; if(!eb||!td) return 0; var r=td/eb; return r<1?5:r<2?4:r<3?3:r<4?2:1; })() },{ label:"Debt / Cash Flow", val:(function(){ var ocf=ov?ov.ocfRaw:0; var td=ov?ov.totalDebt:0; return (ocf>0&&td>0)?(td/ocf).toFixed(2)+"x":"-"; })(), score:(function(){ var ocf=ov?ov.ocfRaw:0; var td=ov?ov.totalDebt:0; if(!ocf||!td) return 0; var r=td/ocf; return r<1?5:r<2?4:r<3?3:r<5?2:1; })() }]} />
                              <MetricRow items={[{ label:"Net Income (TTM)", val:ni||"-", score:0 },{ label:"Revenue Growth YoY", val:pct(rg), score:metricScore(rg,"revGrowth") }]} />
                              <MetricRow items={[{ label:"Revenue (TTM)", val:rev||"-", score:0 },{ label:"", val:"", score:0 }]} />
                            </div>
                            <div style={{ fontSize:10, color:"#aaa", lineHeight:1.5, marginBottom:14, padding:"8px 12px", background:"#faf8f4", borderRadius:8, border:"0.5px solid #e8e4de" }}>
                              {"Benchmarks are approximate sector averages. Individual sub-sectors may vary  -  e.g. pharma vs insurer within Healthcare, or grocery vs luxury within Retail."}
                            </div>
                            {aiText && (
                              <div style={{ marginBottom:14 }}>
                                <div style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>AI Analysis</div>
                                <div style={{ fontSize:13, color:"#333", lineHeight:1.8 }}>{aiText}</div>
                              </div>
                            )}
                            {ov && (
                              <div style={{ border:"1px solid #f0ede6", borderRadius:10, overflow:"hidden", marginBottom:14 }}>
                                <div style={{ padding:"8px 14px", background:"#f5f2ec", borderBottom:"1px solid #e8e4de", display:"flex", alignItems:"center", gap:6 }}>
                                  <span style={{ fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em" }}>Financial Data</span>
                                  <span style={{ fontSize:9, color:"#ccc" }}>(raw figures)</span>
                                </div>
                                {(function() {
                                  function fB(v) { if (!v||v===0) return "-"; var a=Math.abs(v); return (v<0?"-$":"$")+(a>=1e12?(a/1e12).toFixed(2)+"T":a>=1e9?(a/1e9).toFixed(1)+"B":(a/1e6).toFixed(0)+"M"); }
                                  function fP(v) { return v ? v.toFixed(2)+"%" : "-"; }
                                  function fX(v) { return v>0 ? v.toFixed(2)+"x" : "-"; }
                                  var rows = [
                                    { group:"Income", items:[{ label:"Revenue (TTM)", val:rev||"-" },{ label:"Net Income (TTM)", val:ni||"-" },{ label:"EBITDA", val:fB(ov.ebitda) },{ label:"Free Cash Flow", val:fB(ov.fcfRaw) },{ label:"Operating Cash Flow", val:fB(ov.ocfRaw) },{ label:"EPS Growth", val:fP(ov.epsG) },{ label:"Revenue Growth YoY", val:fP(ov.revGrowth) }]},
                                    { group:"Margins", items:[{ label:"Gross Margin", val:fP(ov.grossMargin) },{ label:"Operating Margin", val:fP(ov.opMargin) },{ label:"Net Profit Margin", val:fP(ov.netMargin) },{ label:"Return on Equity", val:fP(ov.roe) },{ label:"Return on Assets", val:fP(ov.roic) }]},
                                    { group:"Balance Sheet", items:[{ label:"Total Debt", val:fB(ov.totalDebt) },{ label:"Cash & Equivalents", val:fB(ov.cash) },{ label:"Net Cash", val:fB(ov.cash&&ov.totalDebt?ov.cash-ov.totalDebt:null) },{ label:"Book Value", val:fB(ov.bookValue) },{ label:"Debt / Equity", val:fX(ov.de) },{ label:"Current Ratio", val:fX(ov.currentRatio) },{ label:"Quick Ratio", val:fX(ov.quickRatio) }]},
                                    { group:"Valuation", items:[{ label:"Market Cap", val:fB(ov.mc) },{ label:"P/E (Trailing)", val:ov.pe>0?ov.pe.toFixed(1)+"x":"-" },{ label:"P/E (Forward)", val:ov.fpe>0?ov.fpe.toFixed(1)+"x":"-" },{ label:"P/S Ratio", val:ov.ps>0?ov.ps.toFixed(1)+"x":"-" },{ label:"P/B Ratio", val:ov.pb>0?ov.pb.toFixed(1)+"x":"-" },{ label:"EV/EBITDA", val:ov.evEbitda>0?ov.evEbitda.toFixed(1)+"x":"-" },{ label:"PEG Ratio", val:ov.peg>0?ov.peg.toFixed(2):"-" },{ label:"Dividend Yield", val:ov.divY>0?fP(ov.divY):"None" },{ label:"Beta", val:ov.beta>0?ov.beta.toFixed(2):"-" }]},
                                    { group:"Company", items:[{ label:"Sector", val:ov.sector||"-" },{ label:"Industry", val:ov.industry||"-" },{ label:"Employees", val:ov.employees?ov.employees.toLocaleString():"-" },{ label:"52W High", val:ov.hi52>0?"$"+ov.hi52.toFixed(2):"-" },{ label:"52W Low", val:ov.lo52>0?"$"+ov.lo52.toFixed(2):"-" },{ label:"Shares Outstanding", val:ov.sharesOut>0?fB(ov.sharesOut):"-" }]},
                                  ];
                                  return rows.map(function(group) {
                                    return (
                                      <div key={group.group}>
                                        <div style={{ padding:"6px 14px", background:"#faf8f4", borderBottom:"1px solid #f0ede6", borderTop:"1px solid #f0ede6" }}>
                                          <span style={{ fontSize:9, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.1em" }}>{group.group}</span>
                                        </div>
                                        {group.items.map(function(item, iii) {
                                          return (
                                            <div key={iii} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 14px", borderBottom:"1px solid #f5f2ec" }}>
                                              <span style={{ fontSize:12, color:"#666" }}>{item.label}</span>
                                              <span style={{ fontSize:13, fontWeight:700, color:item.val==="-"?"#ccc":"#111" }}>{item.val}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    {ov && insightTab==="financial" && (function(){
                      var _mc=window.__mc||function(){return "#888";};
                      var fmt2=function(v){return v>0?v.toFixed(2)+"x":"-";};
                      var fpct=function(v){return v?(v>0?"+":"")+v.toFixed(2)+"%":"-";};
                      var fB=function(v){if(!v)return "-"; var a=Math.abs(v); return (v<0?"-$":"$")+(a>=1e12?(a/1e12).toFixed(2)+"T":a>=1e9?(a/1e9).toFixed(1)+"B":a>=1e6?(a/1e6).toFixed(0)+"M":""+a);};
                      var rows=[
                        {label:"Gross Margin",val:ov.grossMargin?fpct(ov.grossMargin):"-",col:_mc(ov.grossMargin,40,20,0),tip:"Revenue minus cost of goods sold as a percentage. Shows how efficiently the company produces its product."},
                        {label:"Operating Margin",val:ov.opMargin?fpct(ov.opMargin):"-",col:_mc(ov.opMargin,15,5,0),tip:"Profit after operating expenses, before interest and taxes."},
                        {label:"Net Profit Margin",val:ov.netMargin?fpct(ov.netMargin):"-",col:_mc(ov.netMargin,10,3,0),tip:"Final profit as a percentage of revenue after all expenses and taxes."},
                        {label:"Return on Equity",val:ov.roe>0?fpct(ov.roe):"-",col:_mc(ov.roe,15,8,0),tip:"Net profit as a percentage of shareholder equity."},
                        {label:"Free Cash Flow",val:fB(ov.fcfRaw),col:_mc(ov.fcfRaw,1e9,0,-1e9),tip:"Cash left after capital expenditures."},
                        {label:"Current Ratio",val:ov.currentRatio>0?ov.currentRatio.toFixed(2):"-",col:_mc(ov.currentRatio,1.5,1,0),tip:"Current assets divided by current liabilities."},
                        {label:"Quick Ratio",val:ov.quickRatio>0?ov.quickRatio.toFixed(2):"-",col:_mc(ov.quickRatio,1,0.7,0),tip:"Like Current Ratio but excludes inventory."},
                        {label:"Total Debt / Equity",val:ov.de>0?ov.de.toFixed(2):"-",col:_mc(ov.de,0.5,1.5,3,true),tip:"Total debt divided by shareholder equity."},
                        {label:"Net Income (TTM)",val:fB(ov.niRaw),col:_mc(ov.niRaw,1e9,0,-1e9),tip:"Total net profit over the trailing twelve months."},
                        {label:"Revenue Growth YoY",val:ov.revGrowth?fpct(ov.revGrowth):"-",col:_mc(ov.revGrowth,10,3,0),tip:"Year-over-year revenue growth rate."},
                        {label:"Revenue (TTM)",val:fB(ov.ocfRaw&&ov.revenue?ov.revenue:0)||"-",col:"#888",tip:"Total revenue over the trailing twelve months."},
                      ];
                      return (
                        <div style={{marginTop:20,borderTop:"1px solid #e0dbd0",paddingTop:16}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Financial Health</div>
                          <table style={{width:"100%",borderCollapse:"collapse"}}>
                            <tbody>
                              {rows.map(function(m,i){return (
                                <tr key={i} style={{borderBottom:i<rows.length-1?"1px solid #f0ede8":"none"}} title={m.tip}>
                                  <td style={{padding:"6px 0",fontSize:11,color:"#888",width:"60%",cursor:"help"}}>{m.label}<span style={{fontSize:9,color:"#bbb",marginLeft:3}}>{"?"}</span></td>
                                  <td style={{padding:"6px 0",fontSize:12,fontWeight:700,color:m.col||"#555",textAlign:"right",cursor:"help"}}>{m.val}</td>
                                </tr>
                              );})}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                      {/* Technical Analysis */}
                      {insightTab === "technical" && (function() {
                        // ── Rule Based Analytics ───────────────────────────────────────────────────
                        var rba = ruleAnalytics;

                        // Tone colour
                        function toneColor(tone) {
                          if (!tone) return "#888";
                          if (tone === "bullish")            return "#7abd00";
                          if (tone === "cautiously_bullish") return "#9acd50";
                          if (tone === "neutral")            return "#EF9F27";
                          if (tone === "cautiously_bearish") return "#e07030";
                          if (tone === "bearish")            return "#e05050";
                          return "#888";
                        }

                        // Factor label colour (reuse existing colour logic)
                        function factorColor(key, val) {
                          if (!val || val === "N/A") return "#555";
                          if (key === "trend") {
                            if (val === "Strong Uptrend" || val === "Uptrend") return "#7abd00";
                            if (val === "Sideways") return "#EF9F27";
                            return "#e05050";
                          }
                          if (key === "momentum") {
                            if (val === "Strong" || val === "Building") return "#7abd00";
                            if (val === "Neutral") return "#EF9F27";
                            return "#e05050";
                          }
                          if (key === "reversal") return revStatusColor(val, "main");
                          if (key === "smartMoney") return smfStatusColor(val, "main");
                          return "#888";
                        }

                        if (!rba) {
                          return (
                            <div style={{ padding:"20px", color:"#555", fontSize:12 }}>
                              {"Rule Based Analytics is loading technical signals..."}
                            </div>
                          );
                        }

                        var tc = toneColor(rba.tone);

                        return (
                          <div style={{ padding:"4px 0" }}>

                            {/* ── Verdict + Analysis card ─────────────────── */}
                            <div style={{ background: summaryCardDark(rba.verdict).bg, border:"0.5px solid "+tc, borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
                              <div style={{ fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{"Rule Based Analytics"}</div>
                              <div style={{ fontSize:16, fontWeight:800, color:tc, marginBottom:12 }}>{rba.verdict}</div>

                              {/* Four-factor row — labels only, no scores */}
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                                {[
                                  ["Trend",       "trend",      rba.factorLabels.trend],
                                  ["Momentum",    "momentum",   rba.factorLabels.momentum],
                                  ["Reversal",    "reversal",   rba.factorLabels.reversal],
                                  ["Smart Money", "smartMoney", rba.factorLabels.smartMoney],
                                ].map(function(f) {
                                  return (
                                    <div key={f[0]} style={{ background:"#0e0e0c", borderRadius:6, padding:"6px 8px" }}>
                                      <div style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>{f[0]}</div>
                                      <div style={{ fontSize:11, fontWeight:700, color:factorColor(f[1],f[2]), lineHeight:1.3 }}>{f[2]||"—"}</div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Analysis — bold prices in text via helper */}
                              {(function(){
                                // Splits text on $X.XX price patterns and ticker, returns array of elements
                                function bp(text) {
                                  if (!text) return null;
                                  var parts = (text + '').split(/(\$[\d,]+(?:\.\d+)?)/g);
                                  return parts.map(function(s, i) {
                                    if (/^\$[\d,]+/.test(s)) {
                                      return <strong key={i} style={{ fontWeight:700, color:"#dedad0" }}>{s}</strong>;
                                    }
                                    return s;
                                  });
                                }
                                return (
                                  <div>
                                    <div style={{ fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>{"Analysis"}</div>
                                    <div style={{ fontSize:14, color:"#c0bdb4", lineHeight:1.7, marginBottom:10 }}>{bp(rba.analysis)}</div>
                                    <div style={{ fontSize:14, color:"#c0bdb4", lineHeight:1.7, marginBottom:10 }}>{bp(rba.keyLevels)}</div>
                                    <div style={{ fontSize:14, color:"#c0bdb4", lineHeight:1.7, marginBottom:7 }}>{bp(rba.smartMoneyLine)}</div>
                                    <div style={{ fontSize:14, color:"#c0bdb4", lineHeight:1.7 }}>{bp(rba.technicalIndicatorsLine)}</div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* ── Key Levels card — factual prices only ────── */}
                            <div style={{ background:"#161614", border:"0.5px solid #2a2a28", borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
                              <div style={{ fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>{"Key Levels"}</div>

                              {/* Close / Breakout / Invalidation */}
                              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                                {[
                                  ["Close",        rba.closingPrice,                                            "#f0ede6"],
                                  ["Breakout",     rba.breakoutLevel     ? "$"+rba.breakoutLevel.toFixed(2)     : null, "#7abd00"],
                                  ["Invalidation", rba.invalidationLevel ? "$"+rba.invalidationLevel.toFixed(2) : null, "#e05050"],
                                ].filter(function(r){ return r[1]; }).map(function(r,i){
                                  return <div key={i} style={{ background:"#0e0e0c", borderRadius:6, padding:"6px 12px" }}>
                                    <div style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>{r[0]}</div>
                                    <div style={{ fontSize:13, fontWeight:700, color:r[2] }}>{r[1]}</div>
                                  </div>;
                                })}
                              </div>

                              {/* Support chips */}
                              {rba.supportLevels && rba.supportLevels.length > 0 && (
                                <div style={{ marginBottom:10 }}>
                                  <div style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>{"Support"}</div>
                                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                                    {rba.supportLevels.map(function(v,i){ return <span key={i} style={{ background:"#200808", border:"0.5px solid #e05050", borderRadius:4, padding:"3px 9px", fontSize:12, fontWeight:600, color:"#e05050" }}>{"$"+v.toFixed(2)}</span>; })}
                                  </div>
                                </div>
                              )}

                              {/* Resistance chips */}
                              {rba.resistanceLevels && rba.resistanceLevels.length > 0 && (
                                <div>
                                  <div style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>{"Resistance"}</div>
                                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                                    {rba.resistanceLevels.map(function(v,i){ return <span key={i} style={{ background:"#0d200d", border:"0.5px solid #7abd00", borderRadius:4, padding:"3px 9px", fontSize:12, fontWeight:600, color:"#7abd00" }}>{"$"+v.toFixed(2)}</span>; })}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* ── Watch Zone card ──────────────────────────── */}
                            <div style={{ background:"#161614", border:"0.5px solid #2a2a28", borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
                              <div style={{ fontSize:10, fontWeight:700, color:"#6090d0", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{"Watch Zone"}</div>
                              {rba.potentialEntryZone && (
                                <div style={{ fontSize:14, fontWeight:800, color:"#6090d0", marginBottom:8 }}>{rba.potentialEntryZone}</div>
                              )}
                              <div style={{ fontSize:12, color:"#7090a8", lineHeight:1.7 }}>{rba.entryZoneText}</div>
                            </div>

                            {/* ── Summary card ─────────────────────────────── */}
                            <div style={{ background:"#161614", border:"0.5px solid #2a2a28", borderRadius:10, padding:"14px 16px" }}>
                              <div style={{ fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{"Summary"}</div>
                              <div style={{ fontSize:13, color:"#aaa", lineHeight:1.8 }}>{rba.summary}</div>
                            </div>

                          </div>
                        );
                      })()}


                    </div>
                  )}

                  {/* AI Analysis Tab */}
                  {insightTab === "aianalysis" && (function() {
                    var _isFreeAI = FREE_TICKERS.indexOf(sym) !== -1;
                    if (!window.__isPaid && !_isFreeAI) {
                      return (
                        <div style={{ padding:"40px 16px", textAlign:"center" }}>
                          <div style={{ fontSize:16, fontWeight:700, color:"#888", marginBottom:8 }}>PREMIUM Feature</div>
                          <div style={{ fontSize:13, color:"#aaa", marginBottom:20, lineHeight:1.6 }}>{"AI Analysis provides fundamental and technical investment insights powered by Claude AI."}</div>
                          <button onClick={function(){ window.__goToPaywall && window.__goToPaywall(); }}
                            style={{ background:"#c8f000", color:"#0e0e0c", border:"none", borderRadius:24, padding:"12px 32px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:FONT, letterSpacing:"0.04em" }}>
                            Upgrade to Premium
                          </button>
                        </div>
                      );
                    }
                    function fmtSnap(v, suffix) { return v !== null && v !== undefined ? (typeof v === "number" ? v.toFixed(2) + (suffix||"") : v) : "N/A"; }
                    function SnapRow(props) {
                      return (
                        <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid #f5f2ec", fontSize:11 }}>
                          <span style={{ color:"#aaa" }}>{props.label}</span>
                          <span style={{ color:"#555", fontWeight:600 }}>{props.val}</span>
                        </div>
                      );
                    }
                    function VerdictBanner(props) {
                      var vl = (props.verdict||"").toLowerCase().replace(/\*/g,"").trim();
                      var isGood = vl.includes("exceptional")||vl.includes("good")||vl.includes("buy")||vl.includes("bull");
                      var isBad  = vl.includes("avoid")||vl.includes("strong bear");
                      var bg     = isGood?"#EAF3DE":isBad?"#FCEBEB":"#FAEEDA";
                      var border = isGood?"#7abd00":isBad?"#e08080":"#d4a800";
                      var fg     = isGood?"#1a6a1a":isBad?"#c03030":"#b88000";
                      var score  = vl.includes("exceptional")?5:vl.includes("good")?4:vl.includes("fair")?3:vl.includes("stretched")?2:vl.includes("avoid")?1:vl.includes("strong buy")||vl.includes("strong bull")?5:vl.includes("buy")||vl.includes("bull")?4:vl.includes("hold")||vl.includes("neutral")?3:vl.includes("caution")||vl.includes("bear")?2:1;
                      return (
                        <div style={{ padding:"12px 14px", background:bg, borderRadius:8, marginBottom:12, border:"0.5px solid "+border }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                            <div>
                              <div style={{ fontSize:10, color:fg, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2, opacity:0.8 }}>{props.title}</div>
                              <div style={{ fontSize:16, fontWeight:700, color:fg }}>{props.verdict||"--"}</div>
                            </div>
                            <div style={{ display:"flex", gap:3 }}>
                              {[1,2,3,4,5].map(function(d){ return <span key={d} style={{ display:"inline-block", width:9, height:9, borderRadius:"50%", background:d<=score?fg:"#ddd" }}></span>; })}
                            </div>
                          </div>
                          {props.sub && <div style={{ fontSize:11, color:fg, opacity:0.85 }}>{props.sub}</div>}
                        </div>
                      );
                    }
                    var cachedAtFundStr = aiFundCachedAt ? new Date(aiFundCachedAt).toLocaleDateString() : null;
                    return (
                      <div>
                        {/* Fundamental AI Card */}
                        <div style={{ marginBottom:24 }}>
                          <div style={{ borderBottom:"2px solid #e0dbd0", marginBottom:12 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:"#111", paddingBottom:6, borderBottom:"2px solid #111", display:"inline-block", marginBottom:"-2px" }}>Fundamental AI</span>
                            {isAdmin && cachedAtFundStr && <span style={{ fontSize:10, color:"#aaa", marginLeft:8 }}>{"cached " + cachedAtFundStr + " (30d TTL)"}</span>}
                          </div>
                          {aiFundLoading && (
                            <div style={{ textAlign:"center", padding:"20px 0" }}>
                              <div style={{ width:20, height:20, border:"3px solid #e0dbd0", borderTop:"3px solid #c8f000", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 8px" }}></div>
                              <div style={{ fontSize:12, color:"#aaa" }}>Analysing fundamentals...</div>
                            </div>
                          )}
                          {!aiFundLoading && aiFundResult && (
                            <div>
                              <VerdictBanner title="Fundamental Verdict" verdict={aiFundResult.verdict} confidence={aiFundResult.confidence} />
                              {aiFundResult.strength && (
                                <div style={{ marginBottom:8, padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:10, color:"#1a6a1a", fontWeight:700, marginBottom:2 }}>KEY STRENGTH</div>
                                  <div style={{ fontSize:12, color:"#444", lineHeight:1.5 }}>{aiFundResult.strength}</div>
                                </div>
                              )}
                              {aiFundResult.risk && (
                                <div style={{ marginBottom:8, padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:10, color:"#c03030", fontWeight:700, marginBottom:2 }}>KEY RISK</div>
                                  <div style={{ fontSize:12, color:"#444", lineHeight:1.5 }}>{aiFundResult.risk}</div>
                                </div>
                              )}
                              {aiFundResult.summary && (
                                <div style={{ marginBottom:12, padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:10, color:"#111", fontWeight:700, marginBottom:4 }}>SUMMARY</div>
                                  <div style={{ fontSize:12, color:"#111", lineHeight:1.7 }}>{aiFundResult.summary}</div>
                                </div>
                              )}
                              {isAdmin && <div style={{ marginTop:12 }}>
                                <div style={{ fontSize:10, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Exact prompt sent to AI</div>
                                {aiFundResult.promptSent
                                  ? <pre style={{ padding:"10px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #ede9e0", fontSize:10, color:"#555", lineHeight:1.6, whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0, fontFamily:"monospace" }}>{aiFundResult.promptSent}</pre>
                                  : <div style={{ padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #ede9e0", fontSize:11, color:"#aaa", fontStyle:"italic" }}>{"Prompt not available for cached results. Clear cache and reload to see the full prompt."}</div>
                                }
                              </div>}
                            </div>
                          )}
                          {!aiFundLoading && !aiFundResult && (
                            <div style={{ textAlign:"center", padding:"20px 0", color:"#aaa", fontSize:12 }}>Fundamental AI data not yet available.</div>
                          )}
                        </div>

                        {/* Rule Based Analytics Card — replaces Technical AI */}
                        <div style={{ marginBottom:8 }}>
                          <div style={{ borderBottom:"2px solid #e0dbd0", marginBottom:12 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:"#111", paddingBottom:6, borderBottom:"2px solid #111", display:"inline-block", marginBottom:"-2px" }}>Rule Based Analytics</span>
                          </div>
                          {!ruleAnalytics && (
                            <div style={{ textAlign:"center", padding:"20px 0", color:"#aaa", fontSize:12 }}>
                              {"Rule Based Analytics is loading technical signals..."}
                            </div>
                          )}
                          {ruleAnalytics && (function(){
                            var rba = ruleAnalytics;
                            function toneColor2(tone) {
                              if (tone==="bullish"||tone==="cautiously_bullish") return "#1a6a1a";
                              if (tone==="neutral") return "#b88000";
                              return "#c03030";
                            }
                            var tc2 = toneColor2(rba.tone);
                            return (
                              <div>
                                {/* Verdict + factor row */}
                                <div style={{ marginBottom:12, padding:"10px 12px", background: rba.tone==="bearish"||rba.tone==="cautiously_bearish"?"#fff8f8":"#f8fdf8", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:9, color:"#888", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>{"Technical (Trade)"}</div>
                                  <div style={{ fontSize:15, fontWeight:800, color:tc2, marginBottom:10 }}>{rba.verdict}</div>
                                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:5 }}>
                                    {[["Trend",rba.factorLabels.trend],["Momentum",rba.factorLabels.momentum],["Reversal",rba.factorLabels.reversal],["Smart Money",rba.factorLabels.smartMoney]].map(function(f){
                                      return <div key={f[0]} style={{ padding:"4px 7px", background:"#faf8f4", borderRadius:4, border:"0.5px solid #e0dbd0" }}>
                                        <div style={{ fontSize:8, color:"#888", textTransform:"uppercase", marginBottom:1 }}>{f[0]}</div>
                                        <div style={{ fontSize:10, fontWeight:700, color:"#111", lineHeight:1.3 }}>{f[1]||"—"}</div>
                                      </div>;
                                    })}
                                  </div>
                                </div>

                                {/* Analysis — all commentary together */}
                                <div style={{ marginBottom:10, padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:9, color:"#111", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>{"Analysis"}</div>
                                  {(function(){
                                    function bp2(text) {
                                      if (!text) return null;
                                      var parts = (text + '').split(/(\$[\d,]+(?:\.\d+)?)/g);
                                      return parts.map(function(s, i) {
                                        if (/^\$[\d,]+/.test(s)) {
                                          return <strong key={i} style={{ fontWeight:700 }}>{s}</strong>;
                                        }
                                        return s;
                                      });
                                    }
                                    return (
                                      <div>
                                        <div style={{ fontSize:13, color:"#333", lineHeight:1.7, marginBottom:10 }}>{bp2(rba.analysis)}</div>
                                        <div style={{ fontSize:13, color:"#333", lineHeight:1.7, marginBottom:10 }}>{bp2(rba.keyLevels)}</div>
                                        <div style={{ fontSize:13, color:"#333", lineHeight:1.7, marginBottom:6 }}>{bp2(rba.smartMoneyLine)}</div>
                                        <div style={{ fontSize:13, color:"#333", lineHeight:1.7 }}>{bp2(rba.technicalIndicatorsLine)}</div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Key Levels — factual prices only */}
                                <div style={{ marginBottom:10, padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:9, color:"#888", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>{"Key Levels"}</div>
                                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
                                    <span style={{ fontSize:11, color:"#111" }}>{"Close: "}<strong>{rba.closingPrice}</strong></span>
                                    {rba.breakoutLevel     && <span style={{ fontSize:11, color:"#1a6a1a", fontWeight:600 }}>{"Breakout: $"+rba.breakoutLevel.toFixed(2)}</span>}
                                    {rba.invalidationLevel && <span style={{ fontSize:11, color:"#c03030", fontWeight:600 }}>{"Invalidation: $"+rba.invalidationLevel.toFixed(2)}</span>}
                                  </div>
                                  {rba.supportLevels && rba.supportLevels.length > 0 && (
                                    <div style={{ marginBottom:7 }}>
                                      <div style={{ fontSize:8, color:"#888", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{"Support"}</div>
                                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                                        {rba.supportLevels.map(function(v,i){ return <span key={i} style={{ fontSize:11, fontWeight:600, color:"#c03030", background:"#fff0f0", border:"0.5px solid #c03030", borderRadius:4, padding:"2px 8px" }}>{"$"+v.toFixed(2)}</span>; })}
                                      </div>
                                    </div>
                                  )}
                                  {rba.resistanceLevels && rba.resistanceLevels.length > 0 && (
                                    <div>
                                      <div style={{ fontSize:8, color:"#888", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{"Resistance"}</div>
                                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                                        {rba.resistanceLevels.map(function(v,i){ return <span key={i} style={{ fontSize:11, fontWeight:600, color:"#1a6a1a", background:"#f0fff0", border:"0.5px solid #1a6a1a", borderRadius:4, padding:"2px 8px" }}>{"$"+v.toFixed(2)}</span>; })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Watch Zone — separate section */}
                                <div style={{ marginBottom:10, padding:"8px 12px", background:"#f0f4ff", borderRadius:6, border:"0.5px solid #8899cc" }}>
                                  <div style={{ fontSize:9, color:"#5577aa", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{"Watch Zone"}</div>
                                  {rba.potentialEntryZone && (
                                    <div style={{ fontSize:13, fontWeight:800, color:"#3355aa", marginBottom:6 }}>{rba.potentialEntryZone}</div>
                                  )}
                                  <div style={{ fontSize:11, color:"#5566aa", lineHeight:1.6 }}>{rba.entryZoneText}</div>
                                </div>

                                {/* Summary */}
                                <div style={{ marginBottom:4, padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:9, color:"#111", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{"Summary"}</div>
                                  <div style={{ fontSize:12, color:"#111", lineHeight:1.8 }}>{rba.summary}</div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })()}

                  {/* AI Insight Tab */}
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
                            {ind2.sma50&&price2>0&&<span><strong style={{fontWeight:700}}>SMA50:</strong> ${(ind2.sma50).toFixed(2)} ({price2>ind2.sma50?"above":"below"}) {String.fromCharCode(0xA0)}</span>}
                            {ind2.sma200&&price2>0&&<span><strong style={{fontWeight:700}}>SMA200:</strong> ${(ind2.sma200).toFixed(2)} ({price2>ind2.sma200?"above":"below"}) {String.fromCharCode(0xA0)}</span>}
                            {ind2.rsi14!=null&&<span><strong style={{fontWeight:700}}>RSI:</strong> {ind2.rsi14!=null?ind2.rsi14.toFixed(1):"-"} {String.fromCharCode(0xA0)}</span>}
                            {ind2.macd&&ind2.macd.histogram!=null&&<span><strong style={{fontWeight:700}}>MACD Hist:</strong> {ind2.macd&&ind2.macd.histogram!=null?ind2.macd.histogram.toFixed(4):"-"} {String.fromCharCode(0xA0)}</span>}
                            {bbMid>0&&<span><strong style={{fontWeight:700}}>BB:</strong> {bbMid>0?"$"+bbLower.toFixed(2)+" / $"+bbMid.toFixed(2)+" / $"+bbUpper.toFixed(2):"-"} {String.fromCharCode(0xA0)}</span>}
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
                                  <div key={i} style={{ background:"#f9f7f4", borderRadius:8, padding:"6px 7px", textAlign:"center" }}>
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
                                <div key={i} style={{ background:"#f9f7f4", borderRadius:8, padding:"6px 7px" }}>
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
                                  <div key={i} style={{ background:"#f0f3ff", borderRadius:8, padding:"6px 7px" }}>
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
                                    <div key={i} style={{ background:"#f0f3ff", borderRadius:8, padding:"6px 7px" }}>
                                      <div style={{ fontSize:10, color:"#0044cc", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:2 }}>{row[0]}</div>
                                      <div style={{ fontSize:12, fontWeight:700, color: isRsi ? rsiColor : "#111" }}>{row[1]}</div>
                                    </div>
                                  );
                                })}
                              </div>
                              {macd && (
                                <div style={{ background:"#f0f3ff", borderRadius:8, padding:"10px 12px" }}>
                                  <div style={{ fontSize:10, color:"#0044cc", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6 }}>MACD (12/26/9)</div>
                                  <div style={{ display:"flex", gap:8 }}>
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
                                  <div key={i} style={{ flex:1, background:"#f0f3ff", borderRadius:8, padding:"6px 7px" }}>
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

                        {/* SimFin Data Explorer */}
                        {(function() {
                        if (!window.__simfinData) window.__simfinData = {};
                        if (!window.__simfinLoading) window.__simfinLoading = {};
                        var sfKey = sym;
                        var sfData    = window.__simfinData[sfKey];
                        var sfLoading = window.__simfinLoading[sfKey];

                        // Data is prefetched on ticker load - no need to re-fetch here
                        // Just trigger a re-render check if still loading
                        if (!sfData && !sfLoading) {
                          // Fallback: fetch if prefetch somehow missed
                          window.__simfinLoading[sfKey] = true;
                          fetch("/simfin?sym=" + sym)
                            .then(function(r) { return r.text(); })
                            .then(function(txt) {
                              var d;
                              try { d = JSON.parse(txt); }
                              catch(e) { d = { error: "Worker returned non-JSON. First 300 chars: " + txt.slice(0, 300) }; }
                              window.__simfinData[sfKey]    = d;
                              window.__simfinLoading[sfKey] = false;
                              // Log SimFin result to Debug tab
                              // Log raw structure for debugging
          setDebugLog(function(prev) { return prev.concat([{
            time:  new Date().toISOString(),
            label: "SimFin raw structure check",
            data:  {
              balanceType:      typeof d.balance,
              balanceIsArray:   Array.isArray(d.balance),
              balanceLen:       Array.isArray(d.balance) ? d.balance.length : "n/a",
              balance0keys:     d.balance && d.balance[0] ? Object.keys(d.balance[0]).join(",") : "n/a",
              hasStatements:    d.balance && d.balance[0] && d.balance[0].statements ? "YES len=" + d.balance[0].statements.length : "NO",
              incomeType:       typeof d.income,
              incomeIsArray:    Array.isArray(d.income),
              rawBalPreview:    JSON.stringify(d.balance).slice(0, 300),
              diag_url_bs:      d.diag ? d.diag.url_bs : "no diag",
              diag_status_bs:   d.diag ? d.diag.status_bs : "no diag",
              diag_rawPreview_bs: d.diag ? d.diag.rawPreview_bs : "no diag",
              diag_rawLen_bs:   d.diag ? d.diag.rawLen_bs : "no diag",
              diag_url_pl:      d.diag ? d.diag.url_pl : "no diag",
              diag_rawPreview_pl: d.diag ? d.diag.rawPreview_pl : "no diag",
            }
          }]); });
          var sfBsCols = d.balance && Array.isArray(d.balance) && d.balance[0] && d.balance[0].statements ? d.balance[0].statements[0].columns : [];
                              var sfPlCols = d.income  && Array.isArray(d.income)  && d.income[0]  && d.income[0].statements  ? d.income[0].statements[0].columns   : [];
                              setDebugLog(function(prev) { return prev.concat([
                                {
                                  time:  new Date().toISOString(),
                                  label: "SimFin fetch complete -- " + (d.ok ? "OK" : "ERROR: " + (d.error || "unknown")),
                                  data:  {
                                    status_pl: d.diag ? d.diag.status_pl : null,
                                    status_bs: d.diag ? d.diag.status_bs : null,
                                    incomeRows:  sfPlCols.length > 0 ? d.income[0].statements[0].data.length + " rows" : (d.income && d.income.error ? "ERROR: " + (d.income.error || d.income.message) : "no data"),
                                    balanceRows: sfBsCols.length > 0 ? d.balance[0].statements[0].data.length + " rows" : (d.balance && d.balance.error ? "ERROR: " + d.balance.error : "no data"),
                                  }
                                },
                                {
                                  time:  new Date().toISOString(),
                                  label: "SimFin BS columns (" + sfBsCols.length + " total)",
                                  data:  sfBsCols
                                },
                                {
                                  time:  new Date().toISOString(),
                                  label: "SimFin PL columns (" + sfPlCols.length + " total)",
                                  data:  sfPlCols
                                },
                                {
                                  time:  new Date().toISOString(),
                                  label: "SimFin BS latest row (most recent year)",
                                  data:  sfBsCols.length > 0 ? (function() {
                                    var rows = d.balance[0].statements[0].data;
                                    // SimFin returns oldest first - take last row for most recent
                                    var row = rows[rows.length - 1];
                                    var obj = {};
                                    sfBsCols.forEach(function(k, i) { obj[k] = row[i]; });
                                    return obj;
                                  })() : "no data"
                                }
                              ]); });
                              setInsightTab("addlinfo");
                            })
                            .catch(function(e) {
                              var errMsg = "Fetch failed: " + String(e);
                              window.__simfinData[sfKey]    = { error: errMsg };
                              window.__simfinLoading[sfKey] = false;
                              setDebugLog(function(prev) { return prev.concat([{ time: new Date().toISOString(), label: "SimFin fetch FAILED", data: { error: errMsg } }]); });
                              setInsightTab("addlinfo");
                            });
                        }

                        return (
                          <div style={{ marginTop:24, borderTop:"2px solid #e0dbd0", paddingTop:16 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:"#111", marginBottom:12 }}>SimFin Data Explorer</div>
                            {sfLoading && !sfData && (
                              <div style={{ display:"flex", alignItems:"center", gap:8, color:"#aaa", fontSize:12 }}>
                                <div style={{ width:14, height:14, border:"2px solid #e0dbd0", borderTop:"2px solid #c8f000", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}></div>
                                Loading SimFin data...
                              </div>
                            )}
                            {sfData && sfData.error && (
                              <div style={{ fontSize:12, color:"#c03030", background:"#fff0f0", padding:"8px 12px", borderRadius:6, border:"0.5px solid #e08080" }}>
                                SimFin error: {sfData.error}
                              </div>
                            )}
                            {sfData && sfData.ok && (function() {
                              function parseCompact(stmt) {
                                if (!stmt || typeof stmt !== "object") return null;
                                if (!Array.isArray(stmt)) return null; // error object
                                if (stmt.length === 0) return null;
                                var company = stmt[0];
                                if (!company) return null;
                                var stmtArr = company.statements;
                                var s = (stmtArr && stmtArr.length > 0) ? stmtArr[0] : company;
                                if (!s || !s.columns || !s.data) return null;
                                var cols = s.columns;
                                return s.data.map(function(row) {
                                  var obj = {};
                                  cols.forEach(function(col, ci) { obj[col] = row[ci]; });
                                  return obj;
                                }).filter(function(row) {
                                  // Exclude TTM rows; accept FY or Q4 (SimFin uses Q4 for fiscal year-end companies)
                                  if (row["TTM"] === 1 || row["TTM"] === true) return false;
                                  var p = row["Fiscal Period"];
                                  return p === "FY" || p === "Q4" || !p;
                                }).sort(function(a, b) {
                                  return (b["Fiscal Year"] || 0) - (a["Fiscal Year"] || 0);
                                });
                              }

                              function fmtV(v) {
                                if (v == null || v === "") return "-";
                                if (typeof v === "number") {
                                  var a = Math.abs(v);
                                  if (a >= 1e9)  return (v < 0 ? "-" : "") + "$" + (a/1e9).toFixed(2) + "B";
                                  if (a >= 1e6)  return (v < 0 ? "-" : "") + "$" + (a/1e6).toFixed(0) + "M";
                                  if (a >= 1000) return (v < 0 ? "-" : "") + "$" + (a/1000).toFixed(0) + "K";
                                  return String(parseFloat(v.toFixed(3)));
                                }
                                return String(v);
                              }

                              var income  = parseCompact(sfData.income);
                              var balance = parseCompact(sfData.balance);

                              var SKIP = { "Fiscal Year":1, "Fiscal Period":1, "Report Date":1, "Publish Date":1, "Restated":1, "Source":1, "TTM":1, "Value Check":1, "Data Model":1, "Currency":1, "SimFinId":1 };

                              // Key income fields to highlight
                              var incomeKey = ["Revenue", "Gross Profit", "Operating Income (Loss)", "Net Income", "Earnings Per Share, Diluted", "Earnings Per Share, Basic"];
                              var incomeFields = (income && income.length > 0 && income[0]) ? incomeKey.filter(function(k) { return income[0][k] !== undefined; }) : [];
                              // All remaining income fields
                              var incomeAll = (income && income.length > 0 && income[0]) ? Object.keys(income[0]).filter(function(k) { return !SKIP[k] && incomeKey.indexOf(k) === -1; }) : [];

                              // Key balance fields
                              var balanceKey = ["Cash, Cash Equivalents & Short Term Investments", "Total Assets", "Long Term Debt", "Short Term Debt", "Total Liabilities", "Total Equity", "Shares (Common)"];
                              var balanceFields = (balance && balance.length > 0 && balance[0]) ? balanceKey.filter(function(k) { return balance[0][k] !== undefined; }) : [];
                              var balanceAll = (balance && balance.length > 0 && balance[0]) ? Object.keys(balance[0]).filter(function(k) { return !SKIP[k] && balanceKey.indexOf(k) === -1; }) : [];

                              function SfTable(props) {
                                if (!props.rows || props.rows.length === 0 || props.fields.length === 0) return null;
                                var years = props.rows.slice(0, 8); // show up to 8 years
                                return (
                                  <div style={{ marginBottom:20 }}>
                                    <div style={{ fontSize:11, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>{props.title}</div>
                                    <div style={{ overflowX:"auto" }}>
                                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10, tableLayout:"fixed" }}>
                                        <thead>
                                          <tr style={{ background:"#f0ede8" }}>
                                            <th style={{ padding:"5px 10px", textAlign:"left", color:"#555", fontWeight:600, borderBottom:"1px solid #e0dbd0", minWidth:200, whiteSpace:"nowrap" }}>Field</th>
                                            {years.map(function(r, ri) {
                                              return <th key={ri} style={{ padding:"5px 8px", textAlign:"right", color:"#555", fontWeight:600, borderBottom:"1px solid #e0dbd0", whiteSpace:"nowrap" }}>{r["Fiscal Year"] || ("Y" + ri)}</th>;
                                            })}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {props.fields.map(function(field, fi) {
                                            return (
                                              <tr key={fi} style={{ borderBottom:"0.5px solid #f0ede8", background: fi % 2 === 0 ? "#fff" : "#faf8f5" }}>
                                                <td style={{ padding:"4px 10px", color: props.highlight && props.highlight[field] ? "#111" : "#666", fontWeight: props.highlight && props.highlight[field] ? 600 : 400, whiteSpace:"nowrap" }}>{field}</td>
                                                {years.map(function(r, ri) {
                                                  return <td key={ri} style={{ padding:"4px 8px", textAlign:"right", color:"#333", fontWeight: props.highlight && props.highlight[field] ? 600 : 400 }}>{fmtV(r[field])}</td>;
                                                })}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              }

                              var incHighlight = {};
                              incomeKey.forEach(function(k){ incHighlight[k] = true; });
                              var balHighlight = {};
                              balanceKey.forEach(function(k){ balHighlight[k] = true; });

                              return (
                                <div>
                                  {income && income.error && (
                                    <div style={{ fontSize:12, color:"#c03030", background:"#fff0f0", padding:"8px 12px", borderRadius:6, border:"0.5px solid #e08080", marginBottom:8 }}>
                                      SimFin Income: {income.error}{income.status === "429" ? " -- quota resets daily" : ""}
                                    </div>
                                  )}
                                  {balance && balance.error && (
                                    <div style={{ fontSize:12, color:"#c03030", background:"#fff0f0", padding:"8px 12px", borderRadius:6, border:"0.5px solid #e08080", marginBottom:8 }}>
                                      SimFin Balance: {balance.error}{balance.status === "429" ? " -- quota resets daily" : ""}
                                    </div>
                                  )}
                                  <SfTable title="Income Statement" rows={income} fields={incomeFields.concat(incomeAll)} highlight={incHighlight} />
                                  <SfTable title="Balance Sheet" rows={balance} fields={balanceFields.concat(balanceAll)} highlight={balHighlight} />
                                </div>
                              );
                            })()}
                          </div>
                        );
                        })()}

                      </div>
                    );
                  })()}


                  {/* Market Signal Tab */}
                  {/* TREND TAB */}
                  {insightTab === "trend" && (function() {
                    var ind=massiveInfo&&massiveInfo.indicators?massiveInfo.indicators:null;
                    var price=q?q.price:0;
                    var hi52=ov?ov.hi52:0; var lo52=ov?ov.lo52:0;
                    var pos52=(hi52>lo52&&hi52>0)?(price-lo52)/(hi52-lo52):0.5;
                    if (!ind||!price) return <div style={{padding:"20px",textAlign:"center",color:"#aaa",fontSize:13}}>Trend data requires Massive.com feed.</div>;
                    var wsmaG=ind.wsma10&&ind.wsma40?(ind.wsma10-ind.wsma40)/ind.wsma40*100:null;
                    var s200g=ind.sma200?(price-ind.sma200)/ind.sma200*100:null;
                    var s50g=ind.sma50?(price-ind.sma50)/ind.sma50*100:null;
                    var crsG=ind.sma50&&ind.sma200?(ind.sma50-ind.sma200)/ind.sma200*100:null;
                    var pos52pct=Math.round(pos52*100);
                    // Direction arrows using historical data
                    var wsmaH=ind.wsmaHistory||[]; // if available
                    var prevS200g=ind.sma200&&aggs&&aggs[1]?(aggs[1].c-ind.sma200)/ind.sma200*100:null;
                    var prevS50g=ind.sma50&&aggs&&aggs[1]?(aggs[1].c-ind.sma50)/ind.sma50*100:null;
                    function tDir(cur,prev){ if(cur===null||prev===null) return null; return cur>prev+0.2?"up":cur<prev-0.2?"down":"flat"; }
                    var d200=tDir(s200g,prevS200g); var d50=tDir(s50g,prevS50g);
                    // pos52 direction: compare to yesterday
                    var prevPos52=hi52>lo52&&aggs&&aggs[1]?(aggs[1].c-lo52)/(hi52-lo52):null;
                    var dPos=tDir(pos52,prevPos52);
                    function Arrow(dir,col){ if(!dir) return null; var sym=dir==="up"?String.fromCharCode(0x25B2):dir==="down"?String.fromCharCode(0x25BC):String.fromCharCode(0x25A0); var c=dir==="up"?"#1a6a1a":dir==="down"?"#c03030":"#888"; return <span style={{fontSize:9,color:col||c,marginLeft:5,verticalAlign:"middle"}}>{sym}</span>; }
                    function tColor(val,goodUp){ if(val===null) return "#111"; if(goodUp) return val>2?"#1a6a1a":val>-2?"#888":"#c03030"; return val<-2?"#c03030":val<2?"#888":"#1a6a1a"; }
                    function TDots(score,col){ var d=[]; for(var i=1;i<=5;i++) d.push(<span key={i} style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:i<=score?(col||"#1a6a1a"):"#e0dbd0",marginRight:2}}/>); return <span style={{display:"inline-flex",alignItems:"center",marginLeft:6}}>{d}</span>; }
                    function TRow(p){ return (
                      <div style={{padding:"10px 14px",borderBottom:"1px solid #f0ede6"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:600,color:"#333"}}>{p.label}</span>
                          <span style={{display:"flex",alignItems:"center",gap:6}}>
                            {p.score!=null && TDots(p.score, p.dotCol)}
                            {p.score!=null && p.weight!=null && (
                              <span style={{fontSize:10,color:p.dotCol||"#888",fontWeight:700,minWidth:36,textAlign:"right"}}>
                                {Math.round((p.score/5)*p.weight)+"/"+(p.weight)}
                              </span>
                            )}
                            <span style={{fontSize:13,fontWeight:700,color:p.valCol||"#111",marginLeft:4}}>{p.val===null?"N/A":p.val}</span>
                            {p.dir && Arrow(p.dir)}
                          </span>
                        </div>
                        {p.badge && <div style={{display:"inline-block",fontSize:9,fontWeight:700,color:p.badge.col,background:p.badge.bg,border:"0.5px solid "+p.badge.col,borderRadius:4,padding:"1px 6px",marginBottom:4}}>{p.badge.text}</div>}
                        <div style={{fontSize:11,color:"#888",lineHeight:1.5}}>{p.desc}</div>
                        {p.context && <div style={{fontSize:10,color:"#666",marginTop:4,padding:"4px 8px",background:"#f5f2ec",borderRadius:4,borderLeft:"2px solid #c8c0b0"}}>{p.context}</div>}
                        {p.watch && <div style={{fontSize:10,color:"#b88000",marginTop:4,fontStyle:"italic"}}>{"Watch: "+p.watch}</div>}
                        {p.scoring && (
                          <details style={{marginTop:6}}>
                            <summary style={{fontSize:10,color:"#bbb",cursor:"pointer",userSelect:"none",outline:"none",listStyle:"none",display:"flex",alignItems:"center",gap:4}}>
                              <span style={{fontSize:9,color:"#ccc"}}>{"▶"}</span>
                              <span>How is this scored?</span>
                            </summary>
                            <div style={{padding:"6px 8px",background:"#f9f7f4",borderRadius:4,marginTop:3,fontSize:10,color:"#666",lineHeight:1.8,whiteSpace:"pre-line"}}>{p.scoring}</div>
                          </details>
                        )}
                      </div>
                    ); }
                    var aggs=massiveInfo&&massiveInfo.aggs?massiveInfo.aggs:[];
                    return (
                      <div>
                        {(function(){
                          // Read from window (computed by pill) -- single source of truth
                          var _ts2=window.__trendScore||0;
                          var _tl2=window.__trendLabel||"--";
                          var _td2=window.__trendDots||0;
                          var _tsc=_ts2>=70?"#1a6a1a":_ts2>=55?"#2a7a2a":_ts2>=40?"#b88000":"#c03030";
                          var _tsbg=_ts2>=70?"#e6f4e6":_ts2>=55?"#f0f7e6":_ts2>=40?"#fdf8e6":"#fff0f0";
                          var _tsbd=_ts2>=70?"#7abd00":_ts2>=55?"#9ab800":_ts2>=40?"#d4a800":"#e08080";
                          var _tsLong=_ts2>=70?"The overall price trend is strong and bullish. The stock is well-positioned above its key moving averages.":_ts2>=55?"The trend is positive. Price is holding above key averages with momentum on its side.":_ts2>=40?"The trend is mixed or sideways. No clear directional bias from moving averages.":_ts2>=25?"The trend is weak. Price is struggling below key averages.":"The trend is strongly bearish. Price is well below key averages across multiple timeframes.";
                          return (
                            <div style={{ background:summaryCardDark(_tl2).bg, border:"0.5px solid "+summaryCardDark(_tl2).bd, borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontSize:10, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{"Trend / Price Action"}</div>
                                  <div style={{ fontSize:15, fontWeight:700, color:summaryCardDark(_tl2).text, marginBottom:4 }}>{_tl2}</div>
                                  <div style={{ fontSize:11, color:"#888", lineHeight:1.4 }}>{_tsLong}</div>
                                </div>
                                <div style={{ flexShrink:0, paddingLeft:16, textAlign:"right" }}>
                                  <div style={{ fontSize:28, fontWeight:800, color:summaryCardDark(_tl2).text, lineHeight:1 }}>{_ts2}</div>
                                  <div style={{ fontSize:10, color:"#888", marginTop:2 }}>{"/ 100"}</div>
                                  <div style={{ display:"flex", gap:3, justifyContent:"flex-end", marginTop:4 }}>
                                    {[1,2,3,4,5].map(function(i){ return <span key={i} style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:i<=_td2?summaryCardDark(_tl2).text:"#333" }} />; })}
                                  </div>
                                </div>
                              </div>
                              <div style={{ borderTop:"0.5px solid "+summaryCardDark(_tl2).bd+"44", paddingTop:8 }}>
                                <details>
                                  <summary style={{ fontSize:10, color:"#777", cursor:"pointer", outline:"none", listStyle:"none", display:"flex", alignItems:"center", gap:4 }}>
                                    <span style={{ fontSize:9 }}>{"▶"}</span><span>{"How is this scored?"}</span>
                                  </summary>
                                  <div style={{ fontSize:10, color:"#666", lineHeight:1.8, padding:"6px 0", whiteSpace:"pre-line" }}>{"Weighted average of 5 price-action indicators (total 100 pts):\n\n  Weekly SMA cross (WSMA10 vs WSMA40)     30 pts\n  Price vs SMA200                          30 pts\n  Golden / Death cross (SMA50 vs SMA200)   20 pts\n  Price vs EMA20                           10 pts\n  Price vs SMA50                           10 pts\n\nEach indicator scores 1–5; score = (raw/5) × weight, summed.\n  Strong Uptrend ≥70 · Uptrend ≥55 · Sideways ≥40\n  Downtrend ≥25 · Strong Downtrend <25"}</div>
                                </details>
                              </div>
                            </div>
                          );
                        })()}
                        {/* TREND SIGNALS - unified, no short/medium/long dividers */}
                        <div style={{border:"1px solid #e8e4dc",borderRadius:8,marginBottom:10,overflow:"hidden"}}>
                          {(function(){
                            var ema20g=ind.ema20?(price-ind.ema20)/ind.ema20*100:null;
                            var prevEma20g=ind.ema20&&aggs[1]?(aggs[1].c-ind.ema20)/ind.ema20*100:null;
                            var emaDir=ema20g!=null&&prevEma20g!=null?(ema20g>prevEma20g+0.2?"up":ema20g<prevEma20g-0.2?"down":"flat"):null;
                            var _es=ema20g===null?3:ema20g>5?5:ema20g>1?4:ema20g>-5?3:2;
                            var _ec=_es>=4?"#1a6a1a":_es===3?"#b88000":"#c03030";
                            var _emaBadge=ema20g!=null&&ema20g>10?{text:"\u26A0 EXTENDED",col:"#b88000",bg:"#fdf8e6"}:null;
                            function Arrow2(dir){ if(!dir||dir==="flat") return <span style={{fontSize:9,color:"#999",marginLeft:4}}>{String.fromCharCode(0x25A0)}</span>; return <span style={{fontSize:9,color:dir==="up"?"#1a6a1a":"#c03030",marginLeft:4}}>{dir==="up"?String.fromCharCode(0x25B2):String.fromCharCode(0x25BC)}</span>; }
                            return <TRow label="Price vs 20-day EMA (short-term trend)"
                              val={ema20g!=null?(ema20g>0?"+":"")+ema20g.toFixed(2)+"%":null}
                              valCol={ema20g===null?"#aaa":ema20g>1?"#1a6a1a":ema20g>-5?"#888":"#c03030"}
                              dir={emaDir} score={_es} dotCol={_ec} weight={10} badge={_emaBadge}
                              scoring={"●●●●●  5/5: Price > +5% above EMA20\n●●●●○  4/5: Price +1% to +5%\n●●●○○  3/5: Price -5% to +1%\n●●○○○  2/5: Price -10% to -5%\n●○○○○  1/5: Price below -10%"}
                              context={ema20g!=null?("The 20-day EMA is a short-term trend line. The stock is "+(ema20g>0?ema20g.toFixed(1)+"% above":Math.abs(ema20g).toFixed(1)+"% below")+" it at $"+(ind.ema20?ind.ema20.toFixed(2):"N/A")+"."+(ema20g>10?"":"")):null}
                              desc={ema20g===null?"Data unavailable.":ema20g>5?"Well above 20-day average -- strong short-term trend.":ema20g>1?"Above 20-day average -- short-term uptrend intact.":ema20g>-5?"Near 20-day average -- trend is flat.":ema20g>-10?"Below 20-day average -- short-term trend is weak.":"Well below 20-day average -- significant short-term weakness."}
                              watch={ema20g!=null&&Math.abs(ema20g)<1?"Price is right at its 20-day average -- a key short-term support/resistance to watch.":null} />;
                          })()}

                          {(function(){
                            var _s5s=s50g===null?3:s50g>5?5:s50g>1?4:s50g>-5?3:2;
                            var _s5c=_s5s>=4?"#1a6a1a":_s5s===3?"#b88000":"#c03030";
                            return <TRow label="Price vs 50-day Average"
                              val={s50g!==null?(s50g>0?"+":"")+s50g.toFixed(2)+"%":null}
                              valCol={s50g===null?"#aaa":s50g>1?"#1a6a1a":s50g>-5?"#888":"#c03030"}
                              dir={d50} score={_s5s} dotCol={_s5c} weight={10}
                              scoring={"●●●●●  5/5: Price > +5% above SMA50\n●●●●○  4/5: Price +1% to +5%\n●●●○○  3/5: Price -5% to +1%\n●●○○○  2/5: Price -10% to -5%\n●○○○○  1/5: Price below -10%"}
                              context={s50g!==null?"The stock is "+(s50g>0?s50g.toFixed(1)+"% above":Math.abs(s50g).toFixed(1)+"% below")+" its 50-day average of $"+(ind.sma50?ind.sma50.toFixed(2):"N/A")+". The 50-day average tracks the medium-term price trend over roughly 10 trading weeks.":null}
                              desc={s50g===null?"Data unavailable.":s50g>5?"Well above 50-day average -- medium-term trend is strong.":s50g>1?"Above 50-day average -- medium-term uptrend intact.":s50g>-5?"Near 50-day average -- consolidating.":s50g>-10?"Below 50-day average -- medium-term trend is weak.":"Well below 50-day average -- significant medium-term weakness."}
                              watch={s50g!==null&&Math.abs(s50g)<2?"Price is testing its 50-day average -- a key support/resistance level to watch.":null} />;
                          })()}

                          {(function(){
                            var _ws=wsmaG===null?3:wsmaG>5?5:wsmaG>1?4:wsmaG>-1?3:wsmaG>-5?2:1;
                            var _wdc=_ws>=4?"#1a6a1a":_ws===3?"#b88000":"#c03030";
                            return <TRow label="Weekly Trend (10-week vs 40-week MA)"
                              val={wsmaG!==null?(wsmaG>0?"+":"")+wsmaG.toFixed(2)+"%":null}
                              valCol={wsmaG===null?"#aaa":wsmaG>1?"#1a6a1a":wsmaG>-1?"#888":"#c03030"}
                              score={_ws} dotCol={_wdc} weight={30}
                              scoring={"●●●●●  5/5: Gap > +5% (strong uptrend)\n●●●●○  4/5: Gap +1% to +5%\n●●●○○  3/5: Gap -1% to +1% (neutral)\n●●○○○  2/5: Gap -5% to -1%\n●○○○○  1/5: Gap < -5% (strong downtrend)"}
                              context={wsmaG!==null?"The 10-week MA is currently "+(wsmaG>0?"+":"")+wsmaG.toFixed(1)+"% "+(wsmaG>0?"above":"below")+" the 40-week MA. Think of these like a fast and slow speedometer -- when the fast line is above the slow line, the weekly trend is up. The gap is "+(Math.abs(wsmaG)>5?"large":"small")+", meaning the trend is "+(Math.abs(wsmaG)>5?"well established":"just beginning or fading")+".":null}
                              desc={wsmaG===null?"Data unavailable.":wsmaG>5?"10-week average is well above 40-week -- medium-term uptrend is strong and intact.":wsmaG>1?"10-week is above 40-week -- uptrend in place.":wsmaG>-1?"Both averages are flat -- stock is trending sideways.":wsmaG>-5?"10-week is below 40-week -- downtrend developing.":"10-week well below 40-week -- sustained downtrend."}
                              watch={wsmaG!==null&&wsmaG>0?"Watch for 10-week crossing below 40-week -- that would signal trend reversal.":wsmaG!==null&&wsmaG<0?"Watch for 10-week crossing above 40-week -- that would signal a bullish recovery.":null} />;
                          })()}
                          {(function(){
                            var _cd200 = crossData && crossData.sym === sym ? crossData : null;
                            var _s200gdir = _cd200 ? _cd200.sma200GapDir : null;
                            var _ss = s200g===null?3: (function(){
                              if (s200g > 10) return 5;
                              if (s200g > 2)  return 4;
                              if (s200g > -10) return 3;
                              if (s200g > -20) return _s200gdir==="improving"?3:2;
                              return _s200gdir==="improving"?2:1;
                            })();
                            var _sdc=_ss>=4?"#1a6a1a":_ss===3?"#b88000":"#c03030";
                            var _s200badge=s200g!==null&&s200g>25?{text:"\u26A0 EXTENDED",col:"#b88000",bg:"#fdf8e6"}:null;
                            var _s200desc = s200g===null?"Data unavailable.":
                              s200g>10?"Stock is well above its long-term average -- strong bullish trend.":
                              s200g>2?"Stock is above its long-term average -- healthy uptrend.":
                              s200g>-10?"Stock is near its long-term average -- no clear direction.":
                              s200g>-20?(_s200gdir==="improving"?"Stock is below its long-term average but the gap is narrowing -- signs of recovery.":"Stock is below its long-term average -- downtrend in place."):
                              (_s200gdir==="improving"?"Stock is well below its long-term average, but the gap is narrowing -- early signs of flattening.":_s200gdir==="worsening"?"Stock is well below its long-term average and the gap is widening -- downtrend accelerating.":"Stock is well below its long-term average -- strong downtrend.");
                            var _s200ctx = s200g!==null?"The stock is trading "+Math.abs(s200g).toFixed(1)+"% "+(s200g>0?"above":"below")+" its 200-day average of $"+(ind.sma200?ind.sma200.toFixed(2):"N/A")+"."+(_s200gdir?" The gap is "+_s200gdir+" compared to 10 days ago.":"")+" Being above the 200-day average is generally healthy; below it is a warning sign.":null;
                            return <TRow label="Price vs 200-day Average (long-term trend)"
                              val={s200g!==null?(s200g>0?"+":"")+s200g.toFixed(2)+"%":null}
                              valCol={s200g===null?"#aaa":s200g>2?"#1a6a1a":s200g>-10?"#888":"#c03030"}
                              dir={d200} score={_ss} dotCol={_sdc} weight={30} badge={_s200badge}
                              scoring={"●●●●●  5/5: Price > +10% above SMA200\n●●●●○  4/5: Price +2% to +10%\n●●●○○  3/5: Price -10% to +2%, OR -20% to -10% but improving\n●●○○○  2/5: Price -20% to -10% (stable/worsening), OR below -20% but improving\n●○○○○  1/5: Price < -20% (stable or worsening)"}
                              context={_s200ctx}
                              desc={_s200desc}
                              watch={s200g!==null&&Math.abs(s200g)<5?"Price is very close to its 200-day average -- a break above or below here is a significant signal.":null} />;
                          })()}
                          {(function(){
                            var _cd = crossData && crossData.sym === sym ? crossData : null;
                            var _cs = (function(){
                              if (!_cd || _cd.type === "unknown") return crsG===null?3:crsG>10?5:crsG>1?4:crsG>-1?3:crsG>-10?2:1;
                              if (_cd.type === "golden") return _cd.gapDir==="worsening"?5:4;
                              if (_cd.type === "death")  return _cd.gapDir==="improving"?3:_cd.gapDir==="stable"?2:1;
                              return 3;
                            })();
                            var _cc = _cs>=4?"#1a6a1a":_cs===3?"#b88000":"#c03030";
                            var _ageStr = _cd && _cd.ageDays ? _cd.ageDays + " trading days ago" : "before our 1-year data window";
                            var _gapDirStr = _cd && _cd.gapDir === "improving" ? "the gap is improving (SMA50 recovering toward SMA200)"
                                           : _cd && _cd.gapDir === "worsening" ? "the gap is worsening (SMA50 moving further from SMA200)"
                                           : _cd && _cd.gapDir === "stable"    ? "the gap is stable (no significant change in last 10 days)"
                                           : null;
                            var _crossSentence = (_cd && _cd.type && _cd.type !== "none" && _cd.type !== "unknown" && _gapDirStr)
                              ? "The " + (_cd.type === "death" ? "Death" : "Golden") + " cross occurred " + _ageStr + " and " + _gapDirStr + "."
                              : null;
                            var _crossAgeCtx = _crossSentence ? "  " + _crossSentence : "";
                            return <TRow label="Golden/Death Cross (50-day vs 200-day MA)"
                              val={crsG!==null?(crsG>0?"Golden Cross +"+crsG.toFixed(1)+"%":"Death Cross -"+Math.abs(crsG).toFixed(1)+"%"):null}
                              valCol={crsG===null?"#aaa":crsG>0?"#1a6a1a":"#c03030"}
                              score={_cs} dotCol={_cc} weight={20}
                              scoring={"●●●●●  5/5: Golden cross, gap widening\n●●●●○  4/5: Golden cross\n●●●○○  3/5: Death cross with narrowing gap (recovering)\n●●○○○  2/5: Death cross, gap stable\n●○○○○  1/5: Death cross, gap worsening"}
                              context={crsG!==null?"The 50-day average is currently "+(crsG>0?crsG.toFixed(1)+"% above":Math.abs(crsG).toFixed(1)+"% below")+" the 200-day average."+_crossAgeCtx+" When the 50-day crosses above the 200-day it is called a Golden Cross (bullish), and when it crosses below it is called a Death Cross (bearish).":null}
                              desc={_crossSentence || (crsG===null?"Data unavailable.":crsG>5?"50-day is well above 200-day (Golden Cross) -- long-term bullish signal.":crsG>0?"50-day is above 200-day -- mild Golden Cross, long-term trend positive.":crsG>-5?"50-day has crossed below 200-day (Death Cross) -- long-term bearish signal.":"50-day is well below 200-day (Death Cross) -- sustained bearish long-term signal.")}
                              watch={crsG!==null&&Math.abs(crsG)<3?"The 50-day and 200-day are very close -- a cross may be imminent. This would be a major signal.":null} />;
                          })()}
                        </div>
                        <div style={{fontSize:10,color:"#aaa",lineHeight:1.5,padding:"8px 12px",background:"#faf8f4",borderRadius:8,border:"0.5px solid #e8e4de"}}>
                          {"Trend signals use Massive.com data. Longer timeframe = more reliable signal. Not financial advice."}
                        </div>
                      </div>
                    );
                  })()}

                  {/* MOMENTUM TAB */}
                  {insightTab === "momentum" && (function() {
                    var ind=massiveInfo&&massiveInfo.indicators?massiveInfo.indicators:null;
                    var aggs=massiveInfo&&massiveInfo.aggs?massiveInfo.aggs:[];
                    var price=q?q.price:0;
                    if (!ind||!price) return <div style={{padding:"20px",textAlign:"center",color:"#aaa",fontSize:13}}>Momentum data requires Massive.com feed.</div>;
                    var rsi=ind.rsi14!=null?parseFloat(ind.rsi14):null;
                    var rsiH=ind.rsiHistory||[];
                    var prevRsi=rsiH.length>=2?rsiH[1]:null;
                    var rsiDir=rsi!=null&&prevRsi!=null?(rsi>prevRsi+0.5?"up":rsi<prevRsi-0.5?"down":"flat"):null;
                    var macdHArr=ind.macdHistory||[];
                    var macdH=macdHArr.length>0&&macdHArr[0]?parseFloat(macdHArr[0].histogram):null;
                    var prevMacdH=macdHArr.length>1&&macdHArr[1]?parseFloat(macdHArr[1].histogram):null;
                    var macdDir=macdH!=null&&prevMacdH!=null?(macdH>prevMacdH?"Rising":"Falling"):"Unknown";
                    var macdArrow=macdH!=null&&prevMacdH!=null?(macdH>prevMacdH+0.001?"up":macdH<prevMacdH-0.001?"down":"flat"):null;
                    var ema20g=ind.ema20?(price-ind.ema20)/ind.ema20*100:null;
                    var prevEma20g=ind.ema20&&aggs[1]?(aggs[1].c-ind.ema20)/ind.ema20*100:null;
                    var emaDir=ema20g!=null&&prevEma20g!=null?(ema20g>prevEma20g+0.2?"up":ema20g<prevEma20g-0.2?"down":"flat"):null;
                    var vol5=aggs.slice(0,5).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(aggs.slice(0,5).length,1);
                    var vol20=aggs.slice(0,20).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(aggs.slice(0,20).length,1);
                    var volRatio=vol20>0?vol5/vol20:1;
                    var vol1=aggs[0]?aggs[0].v:0; var vol2=aggs[1]?aggs[1].v:0;
                    var volDir=vol1>0&&vol2>0?(vol1>vol2*1.1?"up":vol1<vol2*0.9?"down":"flat"):null;
                    // VWAP
                    var snap=massiveInfo&&massiveInfo.snapshot?massiveInfo.snapshot:{};
                    var vwap=snap.vwap||0;
                    var vwapDiff=vwap>0&&price>0?((price-vwap)/vwap*100).toFixed(2):null;
                    // Volume spike: today vs 20d avg
                    var isSpike=vol1>0&&vol20>0&&vol1>vol20*2.5;
                    // Price direction today
                    var priceUp=aggs[0]&&aggs[1]?aggs[0].c>aggs[1].c:null;
                    var volPriceSignal=null;
                    if(priceUp!==null&&volDir){
                      if(priceUp&&vol1>vol20*1.1) volPriceSignal={text:"Up day + above average volume -- bullish confirmation",col:"#1a6a1a"};
                      else if(priceUp&&vol1<vol20*0.9) volPriceSignal={text:"Up day + low volume -- weak rally, not well supported",col:"#b88000"};
                      else if(!priceUp&&vol1>vol20*1.1) volPriceSignal={text:"Down day + high volume -- bearish distribution, watch closely",col:"#c03030"};
                      else if(!priceUp&&vol1<vol20*0.9) volPriceSignal={text:"Down day + low volume -- weak selloff, sellers not committed",col:"#888"};
                    }
                    // Arrow component
                    function Arrow(dir){ if(!dir||dir==="flat") return <span style={{fontSize:9,color:"#999",marginLeft:4}}>{String.fromCharCode(0x25A0)}</span>; return <span style={{fontSize:9,color:dir==="up"?"#1a6a1a":"#c03030",marginLeft:4}}>{dir==="up"?String.fromCharCode(0x25B2):String.fromCharCode(0x25BC)}</span>; }
                    function MDots(score,col){ var d=[]; for(var i=1;i<=5;i++) d.push(<span key={i} style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:i<=score?(col||"#1a6a1a"):"#e0dbd0",marginRight:2}}/>); return <span style={{display:"inline-flex",alignItems:"center",marginLeft:6}}>{d}</span>; }
                    function MRow(p){ return (
                      <div style={{padding:"10px 14px",borderBottom:"1px solid #f0ede6"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:600,color:"#333"}}>{p.label}</span>
                          <span style={{display:"flex",alignItems:"center",gap:6}}>
                            {p.score!=null && MDots(p.score, p.dotCol)}
                            {p.score!=null && p.weight!=null && <span style={{fontSize:10,color:p.dotCol||"#888",fontWeight:700,minWidth:36,textAlign:"right"}}>{Math.round((p.score/5)*p.weight)+"/"+(p.weight)}</span>}
                            <span style={{fontSize:13,fontWeight:700,color:p.valCol||"#111",marginLeft:4}}>{p.val===null?"N/A":p.val}</span>
                            {p.dir && Arrow(p.dir)}
                          </span>
                        </div>
                        {p.badge && <div style={{display:"inline-block",fontSize:9,fontWeight:700,color:p.badge.col,background:p.badge.bg,border:"0.5px solid "+p.badge.col,borderRadius:4,padding:"1px 6px",marginBottom:4}}>{p.badge.text}</div>}
                        <div style={{fontSize:11,color:"#888",lineHeight:1.5}}>{p.desc}</div>
                        {p.context && <div style={{fontSize:10,color:"#666",marginTop:4,padding:"4px 8px",background:"#f5f2ec",borderRadius:4,borderLeft:"2px solid #c8c0b0"}}>{p.context}</div>}
                        {p.watch && <div style={{fontSize:10,color:"#b88000",marginTop:4,fontStyle:"italic"}}>{"Watch: "+p.watch}</div>}
                        {p.scoring && (
                          <details style={{marginTop:6}}>
                            <summary style={{fontSize:10,color:"#bbb",cursor:"pointer",userSelect:"none",outline:"none",listStyle:"none",display:"flex",alignItems:"center",gap:4}}>
                              <span style={{fontSize:9,color:"#ccc"}}>{"▶"}</span>
                              <span>How is this scored?</span>
                            </summary>
                            <div style={{padding:"6px 8px",background:"#f9f7f4",borderRadius:4,marginTop:3,fontSize:10,color:"#666",lineHeight:1.8,whiteSpace:"pre-line"}}>{p.scoring}</div>
                          </details>
                        )}
                      </div>
                    ); }
                    // RSI overbought/oversold badge
                    var rsiBadge=null;
                    if(rsi!=null){
                      if(rsi>80) rsiBadge={text:"\u26A0 OVERBOUGHT -- EXTREME",col:"#b88000",bg:"#fdf8e6"};
                      else if(rsi>75) rsiBadge={text:"\u26A0 OVERBOUGHT",col:"#b88000",bg:"#fdf8e6"};
                      else if(rsi<20) rsiBadge={text:"\u26A0 OVERSOLD -- EXTREME",col:"#b88000",bg:"#fdf8e6"};
                      else if(rsi<35) rsiBadge={text:"\u26A0 OVERSOLD",col:"#b88000",bg:"#fdf8e6"};
                    }
                    return (
                      <div>
                        {/* ══ 1. MOMENTUM PROFILE SUMMARY CARD (unified) ═══════ */}
                        {(function(){
                          var lp=momLiveSym===sym?momLiveProfile:null;
                          var cr=momConfResult&&momConfResult.ticker===sym?momConfResult:null;
                          var _ml2=window.__momLabel||'Neutral';
                          var _msbg=summaryCardDark(_ml2).bg;
                          var _msbd=summaryCardDark(_ml2).bd;
                          function pColor(p){return p==='Momentum Continuation'?'#7abd00':p==='Early Recovery Attempt'?'#6090d0':p==='Weak Weekly Bounce'?'#EF9F27':p==='Waiting for Daily Trigger'?'#9acd50':p==='Pullback in Larger Momentum'?'#d0a060':p==='Bearish Momentum'?'#e05050':'#888';}
                          function mColor(s){return s==='Strong'?'#7abd00':s==='Building'?'#9acd50':s==='Neutral'?'#EF9F27':s==='Fading'?'#e08050':s==='Weak'?'#e05050':'#555';}
                          function rColor(r){return r==='Supportive'?'#7abd00':r==='Neutral'?'#EF9F27':r==='Weak'?'#e05050':'#555';}
                          function pExpl(p){
                            if(p==='Momentum Continuation') return 'Daily and weekly momentum are both supportive. This suggests the move is continuing across short and medium timeframes.';
                            if(p==='Early Recovery Attempt') return 'Daily momentum is improving, but weekly momentum has not fully confirmed. This may reflect an early recovery attempt.';
                            if(p==='Weak Weekly Bounce') return 'Daily momentum is improving, but weekly momentum remains weak. This may be a short-term bounce rather than a confirmed recovery.';
                            if(p==='Waiting for Daily Trigger') return 'Weekly momentum is supportive, but daily momentum has not fully strengthened yet. This suggests the broader setup is waiting for short-term confirmation.';
                            if(p==='Pullback in Larger Momentum') return 'Daily momentum is cooling, but weekly momentum remains supportive. This may reflect a short-term pullback within a larger momentum structure.';
                            if(p==='Bearish Momentum') return 'Daily and weekly momentum are both weak. This suggests momentum remains under pressure.';
                            if(p==='Not Enough Data') return 'There is not enough weekly or monthly data to classify the momentum profile reliably.';
                            return 'Daily and weekly momentum are mixed. There is no clear momentum profile at this point.';
                          }
                          function confLabel(c){if(c==='High Confidence') return 'Strong Historical Support';if(c==='Moderate Confidence') return 'Positive Historical Support';if(c==='Low Confidence'||c==='Unfavourable') return 'Cautious';return 'Not Enough History';}
                          function cColor(l){return l==='Strong Historical Support'?'#7abd00':l==='Positive Historical Support'?'#6090d0':l==='Cautious'?'#EF9F27':'#555';}
                          function confExpl(c){if(c==='High Confidence') return 'This condition has historically shown a strong positive profile for this ticker.';if(c==='Moderate Confidence') return 'This condition has historically shown a positive profile, but sample or strength is moderate.';if(c==='Low Confidence') return 'This condition has some positive historical evidence, but confidence is limited.';if(c==='Unfavourable') return 'This condition has not historically performed well for this ticker.';return 'Not enough historical samples are available for this condition.';}
                          function doConfCheck(){
                            if(!lp) return;
                            setMomConfLoading(true); setMomConfError(null); setMomConfResult(null); setMomConfSym(sym);
                            var curProf=lp.profile,curReg=lp.monthlyRegime;
                            var runBT=function(bars){
                              var HP=20,MIN_PRIOR=250,LIMIT=600,rows=[],inRange=0;
                              for(var bi=0;bi<bars.length;bi++){
                                if(bi<MIN_PRIOR||bi+HP>=bars.length) continue;
                                if(inRange>=LIMIT) break; inRange++;
                                var bar=bars[bi],slice=bars.slice(0,bi+1);
                                var dM=calcDailyMomentumApprox(slice.map(function(b){return b.close;}));
                                var wM=calcWeeklyMomentum(buildWeeklyBars(slice));
                                var mM=calcMonthlyMomentum(buildMonthlyBars(slice));
                                rows.push({futureReturn:((bars[bi+HP].close-bar.close)/bar.close)*100,momentumProfile:{profile:classifyMomentumProfile(dM.status,wM.status),monthlyRegime:classifyMonthlyRegime(mM.status)}});
                              }
                              if(!rows.length) throw new Error('Not enough signals to compute confidence.');
                              var MIN_SIG=10,exactR=rows.filter(function(r){return r.momentumProfile.profile===curProf&&r.momentumProfile.monthlyRegime===curReg;}),profR=rows.filter(function(r){return r.momentumProfile.profile===curProf;});
                              var exactS=summarizeRows(exactR),profS=summarizeRows(profR),source,useS;
                              if(exactS.signals>=MIN_SIG){source='Profile + Monthly Regime';useS=exactS;}else if(profS.signals>=MIN_SIG){source='Momentum Profile';useS=profS;}else{source='Insufficient Historical Samples';useS=exactS;}
                              return{conf:classifyHistoricalConfidence(useS,MIN_SIG),source:source,signals:useS.signals,winRate:useS.winRate,avgReturn:useS.avgReturn,medianReturn:useS.medianReturn,bestReturn:useS.bestReturn,worstReturn:useS.worstReturn,hp:HP,totalRows:rows.length};
                            };
                            var bP=(momYahooBars&&momLiveSym===sym&&momYahooBars.length>=300)?Promise.resolve(momYahooBars):(function(){var eMs=Date.now(),sMs=eMs-2*365*24*3600*1000;var fmt=function(d){var dd=new Date(d);return dd.getFullYear()+'-'+('0'+(dd.getMonth()+1)).slice(-2)+'-'+('0'+dd.getDate()).slice(-2);};return fetchYahooHistoricalBars(sym,fmt(sMs),fmt(eMs),20);})();
                            bP.then(function(bars){if(!bars||bars.length<120) throw new Error('Not enough historical price data.');var res=runBT(bars);setMomConfResult(Object.assign({},res,{confidence:res.conf,ticker:sym,profile:curProf,monthlyRegime:curReg}));setMomConfSym(sym);})
                            .catch(function(e){setMomConfError(e.message||'Check could not be completed.');})
                            .then(function(){setMomConfLoading(false);});
                          }
                          var crLabel=cr?confLabel(cr.confidence):null;
                          var crCC=crLabel?cColor(crLabel):'#555';
                          return (
                            <div style={{background:_msbg,border:'0.5px solid '+_msbd,borderRadius:10,padding:'16px 18px',marginBottom:10}}>
                              {/* Profile label */}
                              <div style={{fontSize:9,fontWeight:700,color:'#666',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Momentum Profile</div>
                              {/* Loading state */}
                              {momLiveLoading&&!lp&&(
                                <div style={{display:'flex',alignItems:'center',gap:8,color:'#555',fontSize:11}}>
                                  <div style={{width:10,height:10,borderRadius:'50%',border:'1.5px solid #333',borderTop:'1.5px solid #c8f000',animation:'spin 0.8s linear infinite',flexShrink:0}}></div>
                                  <span>Calculating momentum profile...</span>
                                </div>
                              )}
                              {/* No data */}
                              {lp&&lp.profile==='Not Enough Data'&&<div style={{fontSize:11,color:'#444'}}>Not enough historical price data to calculate momentum profile.</div>}
                              {/* Profile content */}
                              {lp&&lp.profile!=='Not Enough Data'&&(function(){
                                var pc=pColor(lp.profile);
                                return <div>
                                  {/* Row: Profile name + D/W/M */}
                                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                                    <div style={{flex:1,paddingRight:24}}>
                                      <div style={{fontSize:17,fontWeight:800,color:pc,marginBottom:6,lineHeight:1.2}}>{lp.profile}</div>
                                      <div style={{fontSize:12,color:'#888',lineHeight:1.6}}>{pExpl(lp.profile)}</div>
                                    </div>
                                    <div style={{textAlign:'right',flexShrink:0,paddingTop:2}}>
                                      <div style={{fontSize:11,color:'#888',marginBottom:3}}>Daily: <span style={{fontWeight:700,color:mColor(lp.daily)}}>{lp.daily}</span></div>
                                      <div style={{fontSize:11,color:'#888',marginBottom:3}}>Weekly: <span style={{fontWeight:700,color:mColor(lp.weekly)}}>{lp.weekly}</span></div>
                                      <div style={{fontSize:11,color:'#888'}}>Monthly Regime: <span style={{fontWeight:700,color:rColor(lp.monthlyRegime)}}>{lp.monthlyRegime}</span></div>
                                    </div>
                                  </div>
                                  {/* Confidence row */}
                                  <div style={{borderTop:'0.5px solid '+_msbd+'55',paddingTop:10}}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                                      <div>
                                        <span style={{fontSize:11,color:'#888'}}>Historical Confidence: </span>
                                        {crLabel
                                          ? <span style={{fontSize:11,fontWeight:700,color:crCC}}>{crLabel}</span>
                                          : momConfLoading
                                            ? <span style={{fontSize:11,color:'#555'}}>Checking...</span>
                                            : <span style={{fontSize:11,color:'#555'}}>Not checked yet</span>
                                        }
                                      </div>
                                      <button disabled={momConfLoading} onClick={doConfCheck}
                                        style={{padding:'5px 12px',background:'none',border:'0.5px solid '+(momConfLoading?'#333':'#555'),borderRadius:5,color:momConfLoading?'#444':'#ccc',fontSize:10,fontWeight:600,cursor:momConfLoading?'default':'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                                        {momConfLoading?'Checking...':cr?'Refresh Historical Confidence':'Check Historical Confidence'}
                                      </button>
                                    </div>
                                    {/* Italic explanation */}
                                    <div style={{fontSize:10,color:'#666',fontStyle:'italic',lineHeight:1.5,marginBottom:cr?10:0}}>
                                      {cr ? confExpl(cr.confidence) : pExpl(lp.profile)}
                                    </div>
                                    {/* Error */}
                                    {momConfError&&<div style={{fontSize:10,color:'#e05050',marginTop:4}}>{momConfError}</div>}
                                    {/* Stats row after check */}
                                    {cr&&(function(){
                                      var cc=cColor(confLabel(cr.confidence));
                                      return <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8}}>
                                        <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                                          {[['SIGNALS',''+cr.signals,'#ccc'],['MEDIAN',cr.medianReturn!=null?(cr.medianReturn>=0?'+':'')+cr.medianReturn.toFixed(2)+'%':'—',cr.medianReturn!=null?(cr.medianReturn>=0?'#7abd00':'#e05050'):'#555'],['AVG RETURN',cr.avgReturn!=null?(cr.avgReturn>=0?'+':'')+cr.avgReturn.toFixed(2)+'%':'—',cr.avgReturn!=null?(cr.avgReturn>=0?'#7abd00':'#e05050'):'#555'],['BEST',cr.bestReturn!=null?'+'+cr.bestReturn.toFixed(2)+'%':'—','#7abd00'],['WORST',cr.worstReturn!=null?cr.worstReturn.toFixed(2)+'%':'—','#e05050']].map(function(f){
                                            return <div key={f[0]} style={{minWidth:48}}>
                                              <div style={{fontSize:8,fontWeight:700,color:'#555',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:2}}>{f[0]}</div>
                                              <div style={{fontSize:13,fontWeight:700,color:f[2]}}>{f[1]}</div>
                                            </div>;
                                          })}
                                        </div>
                                        <div style={{textAlign:'right',flexShrink:0}}>
                                          <div style={{fontSize:22,fontWeight:800,color:cc,lineHeight:1}}>{cr.winRate!=null?cr.winRate.toFixed(1)+'%':'—'}</div>
                                          <div style={{fontSize:9,color:'#555',marginTop:2}}>Win Rate</div>
                                        </div>
                                      </div>;
                                    })()}
                                  </div>
                                </div>;
                              })()}
                            </div>
                          );
                        })()}

                        {/* ══ 3. DAILY MOMENTUM DETAILS ════════════════════════════ */}
                        {(function(){
                          var _ml2=window.__momLabel||'Neutral';
                          function mColor(s){return s==='Strong'?'#1a6a1a':s==='Building'?'#2a7a2a':s==='Neutral'?'#b88000':s==='Fading'?'#c05030':'#c03030';}
                          var _rsiHist=ind.rsiHistory||[];
                          var _rsiDirDisp=(_rsiHist.length>=7)?((parseFloat(_rsiHist[0])+parseFloat(_rsiHist[1]))/2)-((parseFloat(_rsiHist[2])+parseFloat(_rsiHist[3])+parseFloat(_rsiHist[4])+parseFloat(_rsiHist[5])+parseFloat(_rsiHist[6]))/5):0;
                          var _dirLabel=_rsiDirDisp>3?'↑ improving':_rsiDirDisp<-3?'↓ declining':'→ stable';
                          var _rs=(function(){if(rsi==null) return 3;if(rsi>70) return 4;if(rsi>=65) return _rsiDirDisp<-3?4:5;if(rsi>=55) return _rsiDirDisp<-3?3:4;if(rsi>=45) return _rsiDirDisp>3?4:_rsiDirDisp<-3?2:3;if(rsi>=35) return _rsiDirDisp>0?3:2;return 1;})();
                          var _rc=_rs>=4?'#1a6a1a':_rs===3?'#b88000':'#c03030';
                          var _sma5=aggs&&aggs.length>=5?(aggs[0].c+aggs[1].c+aggs[2].c+aggs[3].c+aggs[4].c)/5:null;
                          var _roc10=_sma5&&_sma5>0?((price>0?price:aggs[0].c)-_sma5)/_sma5*100:null;
                          var _rocScore=_roc10===null?3:_roc10>5?5:_roc10>2?4:_roc10>-2?3:_roc10>-5?2:1;
                          var _rocCol=_rocScore>=4?'#1a6a1a':_rocScore===3?'#b88000':'#c03030';
                          var _ms=macdH===null?3:macdH>0&&macdDir==='Rising'?5:macdH>0&&macdDir!=='Falling'?4:macdH>0?3:macdH>-0.5?2:1;
                          var _mc=_ms>=4?'#1a6a1a':_ms===3?'#b88000':'#c03030';
                          var _es=ema20g===null?3:ema20g>5?5:ema20g>1?4:ema20g>-5?3:2;
                          var _ec=_es>=4?'#1a6a1a':_es===3?'#b88000':'#c03030';
                          var _emaBadge=ema20g!=null&&ema20g>10?{text:'\u26A0 EXTENDED',col:'#b88000',bg:'#fdf8e6'}:null;
                          var _macdBadge=macdH!=null&&macdH>0&&prevMacdH!=null&&macdH>prevMacdH?{text:'\u26A0 ACCELERATING',col:'#1a6a1a',bg:'#eef8ee'}:null;
                          return (
                            <div style={{border:'1px solid #e0dbd0',borderRadius:8,marginBottom:10}}>
                              <div style={{padding:'6px 14px',background:'#faf8f4',borderBottom:'1px solid #e0dbd0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                <span style={{fontSize:11,fontWeight:700,color:'#555'}}>Daily Momentum Details</span>
                                <span style={{fontSize:11,fontWeight:700,color:mColor(_ml2)}}>{_ml2}</span>
                              </div>
                              <MRow label={"RSI (Relative Strength Index)"}
                                val={rsi!=null?"RSI "+rsi.toFixed(1)+" ("+_dirLabel+")":null} valCol={_rc}
                                score={_rs} dotCol={_rc} badge={rsiBadge}
                                scoring={"●●●●●  5/5: RSI ≥65, not declining\n●●●●○  4/5: RSI ≥55 not declining, or ≥65 declining\n●●●○○  3/5: RSI ≥45 stable, or ≥55 declining\n●●○○○  2/5: RSI ≥35\n●○○○○  1/5: RSI <35"}
                                context={rsi!=null?"RSI "+rsi.toFixed(1)+" with 5-day direction "+((_rsiDirDisp>0?"+":"")+_rsiDirDisp.toFixed(1))+" pts ("+_dirLabel+"). RSI above 50 means buyers are in control; below 50 sellers have the edge. Above 70 is overbought. Below 35 is oversold.":null}
                                desc={rsi===null?"Data unavailable.":rsi>75?"RSI "+rsi.toFixed(0)+" -- overbought. Buying pressure is very strong but stretched.":rsi>=65?"RSI "+rsi.toFixed(0)+" -- strong momentum. Buyers firmly in control.":rsi>=55?"RSI "+rsi.toFixed(0)+" -- buyers have the edge.":rsi>=45?"RSI "+rsi.toFixed(0)+" -- momentum is balanced.":rsi>=35?"RSI "+rsi.toFixed(0)+" -- sellers have the edge.":"RSI "+rsi.toFixed(0)+" -- weak momentum."}
                                watch={rsi!=null&&rsi>75?"Watch for RSI to drop below 70 -- often signals overbought reversal.":null}
                              />
                              <MRow label={"Price vs SMA5 (1-week momentum)"}
                                val={_roc10!=null?("ROC "+(_roc10>0?"+":"")+_roc10.toFixed(2)+"%"):null} valCol={_rocCol}
                                score={_rocScore} dotCol={_rocCol}
                                scoring={"●●●●●  5/5: ROC > +5%\n●●●●○  4/5: ROC > +2%\n●●●○○  3/5: ROC -2% to +2%\n●●○○○  2/5: ROC > -5%\n●○○○○  1/5: ROC ≤ -5%"}
                                context={_roc10!=null?"Price is "+(_roc10>0?"+":"")+_roc10.toFixed(1)+"% relative to its 5-day average"+(aggs&&aggs.length>=5?" of $"+(_sma5?_sma5.toFixed(2):"—"):"")+" . A positive reading means price is above its recent average -- short-term buyers in control. Negative means below -- sellers have the edge this week.":null}
                                desc={_roc10===null?"Data unavailable.":_roc10>5?"Price well above its 1-week average -- strong short-term buying momentum.":_roc10>2?"Price above its 1-week average -- positive short-term momentum.":_roc10>-2?"Price near its 1-week average -- neutral short-term momentum.":_roc10>-5?"Price below its 1-week average -- weak short-term momentum.":"Price well below its 1-week average -- bearish short-term momentum."}
                                watch={_roc10!=null&&Math.abs(_roc10)>10?"Extreme reading -- price is very extended from its 1-week average. A mean reversion is likely.":null}
                              />
                              <MRow label={"MACD Histogram"}
                                val={macdH!=null?macdH.toFixed(4):null}
                                valCol={macdH===null?'#aaa':macdH>0&&macdDir==='Rising'?'#1a6a1a':macdH>0?'#888':'#c03030'}
                                dir={macdH!=null&&prevMacdH!=null?(macdH>prevMacdH+0.001?'up':macdH<prevMacdH-0.001?'down':'flat'):null}
                                score={_ms} dotCol={_mc} badge={_macdBadge}
                                context={macdH!=null?"MACD histogram value of "+macdH.toFixed(4)+" represents buying pressure (positive) vs selling pressure (negative). Currently "+(macdH>0?'positive (buyers winning)':'negative (sellers winning)')+" and "+macdDir.toLowerCase()+".":null}
                                desc={macdH===null?"Data unavailable.":macdH>0&&macdDir==='Rising'?"MACD positive and rising -- buying momentum is accelerating.":macdH>0&&macdDir!=='Falling'?"MACD positive and holding -- buying pressure continues.":macdH>0?"MACD positive but fading -- buying momentum may be slowing.":macdDir==='Rising'?"MACD negative but improving -- selling pressure is easing.":"MACD negative and falling -- selling momentum is dominant."}
                                watch={macdH!=null&&Math.abs(macdH)<0.01?"MACD histogram is near zero -- a crossover may be imminent.":null}
                                scoring={"●●●●●  5/5: Histogram > 0 and Rising\n●●●●○  4/5: Histogram > 0, not falling\n●●●○○  3/5: Histogram > 0 or improving\n●●○○○  2/5: Histogram > -0.5\n●○○○○  1/5: Histogram ≤ -0.5"}
                              />
                              <MRow label={"Price vs 20-day EMA (short-term)"}
                                val={ema20g!=null?(ema20g>0?"+":"")+ema20g.toFixed(2)+"%":null}
                                valCol={ema20g===null?'#aaa':ema20g>1?'#1a6a1a':ema20g>-5?'#888':'#c03030'}
                                dir={emaDir} score={_es} dotCol={_ec} badge={_emaBadge}
                                context={ema20g!=null?"The 20-day EMA is a short-term trend line. The stock is "+Math.abs(ema20g).toFixed(1)+"% "+(ema20g>0?"above":"below")+" it at $"+(ind.ema20?ind.ema20.toFixed(2):"—")+". At "+(Math.abs(ema20g)>10?"above 10%":"this level")+" it is "+(ema20g>10?"stretched -- a pullback is normal.":ema20g>0?"above, which is healthy.":"below, which is a bearish sign."):null}
                                desc={ema20g===null?"Data unavailable.":ema20g>5?"Well above 20-day average -- strong short-term momentum.":ema20g>1?"Above 20-day average -- positive short-term momentum.":ema20g>-5?"Near 20-day average -- neutral short-term momentum.":"Below 20-day average -- short-term momentum is weak."}
                                watch={ema20g!=null&&Math.abs(ema20g)<1?"Price is right at its 20-day average -- a key short-term support/resistance level.":null}
                                scoring={"●●●●●  5/5: Price > +5% above EMA20\n●●●●○  4/5: Price > +1%\n●●●○○  3/5: Price -5% to +1%\n●●○○○  2/5: Price below EMA20\n●○○○○  n/a"}
                              />
                            </div>
                          );
                        })()}

                        {/* ══ 4. WEEKLY MOMENTUM DETAILS ═══════════════════════════ */}
                        {(function(){
                          var lp=momLiveSym===sym?momLiveProfile:null;
                          if(!lp) return null;
                          function mColor(s){return s==='Strong'?'#1a6a1a':s==='Building'?'#2a7a2a':s==='Neutral'?'#b88000':s==='Fading'?'#c05030':'#c03030';}
                          if(lp.weekly==='Not Enough Data') return <div style={{border:'1px solid #e0dbd0',borderRadius:8,marginBottom:10,padding:'10px 14px'}}><div style={{fontSize:11,fontWeight:700,color:'#888',marginBottom:4}}>Weekly Momentum Details</div><div style={{fontSize:11,color:'#aaa'}}>Not enough historical price data to calculate weekly indicators.</div></div>;
                          var wRsi=lp.weeklyRsi,wRsiDir=lp.weeklyRsiDir;
                          var wRsiScore=wRsi==null?null:wRsi>=65?5:wRsi>=55?4:wRsi>=45?3:wRsi>=35?2:1;
                          var wRsiCol=wRsiScore==null?'#aaa':wRsiScore>=4?'#1a6a1a':wRsiScore===3?'#b88000':'#c03030';
                          var wSma=lp.weeklyPriceVsSma10;
                          var wSmaScore=wSma==null?null:wSma>5?5:wSma>2?4:wSma>-2?3:wSma>-5?2:1;
                          var wSmaCol=wSmaScore==null?'#aaa':wSmaScore>=4?'#1a6a1a':wSmaScore===3?'#b88000':'#c03030';
                          var wMacdH=lp.weeklyMacdHist,wMacdDir=lp.weeklyMacdDir;
                          var wMacdArrow=wMacdDir==='Rising'?'up':wMacdDir==='Falling'?'down':'flat';
                          var wMacdScore=wMacdH==null?null:(wMacdH>0&&wMacdDir==='Rising')?5:wMacdH>0?4:(wMacdH<=0&&wMacdDir==='Rising')?3:wMacdH>-0.5?2:1;
                          var wMacdCol=wMacdScore==null?'#aaa':wMacdScore>=4?'#1a6a1a':wMacdScore===3?'#b88000':'#c03030';
                          var wRoc=lp.weeklyRoc;
                          var wRocScore=wRoc==null?null:wRoc>8?5:wRoc>3?4:wRoc>-3?3:wRoc>-8?2:1;
                          var wRocCol=wRocScore==null?'#aaa':wRocScore>=4?'#1a6a1a':wRocScore===3?'#b88000':'#c03030';
                          return (
                            <div style={{border:'1px solid #e0dbd0',borderRadius:8,marginBottom:10}}>
                              <div style={{padding:'6px 14px',background:'#faf8f4',borderBottom:'1px solid #e0dbd0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                <span style={{fontSize:11,fontWeight:700,color:'#555'}}>Weekly Momentum Details</span>
                                <span style={{fontSize:11,fontWeight:700,color:mColor(lp.weekly)}}>{lp.weekly}</span>
                              </div>
                              <MRow label={"Weekly RSI (14)"} val={wRsi!=null?"RSI "+wRsi.toFixed(1)+(wRsiDir==='up'?' (↑ improving)':wRsiDir==='down'?' (↓ declining)':' (→ stable)'):null} valCol={wRsiCol} score={wRsiScore} dotCol={wRsiCol}
                                desc={wRsi==null?"Data unavailable.":wRsi>=65?"RSI "+wRsi.toFixed(0)+" -- buyers firmly in control on a weekly basis.":wRsi>=55?"RSI "+wRsi.toFixed(0)+" -- buyers have the weekly edge.":wRsi>=45?"RSI "+wRsi.toFixed(0)+" -- balanced weekly momentum.":wRsi>=35?"RSI "+wRsi.toFixed(0)+" -- sellers have the weekly edge.":"RSI "+wRsi.toFixed(0)+" -- weak weekly momentum."}
                                context={wRsi!=null?"Weekly RSI measures momentum over the last 14 weekly bars. Above 55 means buyers are in control on a weekly basis; below 45 means sellers have the edge.":null}
                              />
                              <MRow label={"Price vs Weekly SMA10"} val={wSma!=null?(wSma>=0?'+':'')+wSma.toFixed(2)+'%':null} valCol={wSmaCol} score={wSmaScore} dotCol={wSmaCol}
                                desc={wSma==null?"Data unavailable.":wSma>5?"Price well above its 10-week average -- strong weekly trend.":wSma>2?"Price above its 10-week average -- positive weekly momentum.":wSma>-2?"Price near its 10-week average -- neutral.":wSma>-5?"Price below its 10-week average -- weak weekly trend.":"Price well below its 10-week average -- bearish weekly trend."}
                                context={wSma!=null?"Price vs 10-week SMA measures whether the stock is tracking above or below its 10-week moving average. Positive means weekly trend is up.":null}
                              />
                              <MRow label={"Weekly MACD Histogram"} val={wMacdH!=null?wMacdH.toFixed(4):null}
                                valCol={wMacdH==null?'#aaa':wMacdH>0&&wMacdDir==='Rising'?'#1a6a1a':wMacdH>0?'#888':'#c03030'}
                                dir={wMacdArrow} score={wMacdScore} dotCol={wMacdCol}
                                desc={wMacdH==null?"Data unavailable.":wMacdH>0&&wMacdDir==='Rising'?"Weekly MACD positive and rising -- weekly buying momentum is accelerating.":wMacdH>0?"Weekly MACD positive -- buying pressure on a weekly basis.":wMacdDir==='Rising'?"Weekly MACD negative but improving -- potential weekly recovery forming.":"Weekly MACD negative -- selling pressure on a weekly basis."}
                                context={wMacdH!=null?"Weekly MACD histogram shows buying or selling momentum over weekly bars. Positive and rising is the strongest signal; negative and falling is the weakest.":null}
                              />
                              <MRow label={"Weekly 4-week ROC"} val={wRoc!=null?(wRoc>=0?'+':'')+wRoc.toFixed(2)+'%':null} valCol={wRocCol} score={wRocScore} dotCol={wRocCol}
                                desc={wRoc==null?"Data unavailable.":wRoc>8?"Price up "+wRoc.toFixed(1)+"% over 4 weeks -- strong weekly momentum.":wRoc>3?"Price up "+wRoc.toFixed(1)+"% over 4 weeks -- positive weekly trend.":wRoc>-3?"Price near flat over 4 weeks -- neutral weekly momentum.":wRoc>-8?"Price down "+Math.abs(wRoc).toFixed(1)+"% over 4 weeks -- weak weekly trend.":"Price down "+Math.abs(wRoc).toFixed(1)+"% over 4 weeks -- strong bearish weekly momentum."}
                                context={wRoc!=null?"4-week Rate of Change measures how much the price has changed over the past 4 weekly bars. Positive means recent price action is bullish on a weekly basis.":null}
                              />
                            </div>
                          );
                        })()}

                        {/* ══ 5. MONTHLY CONTEXT ═══════════════════════════════════ */}
                        {(function(){
                          var lp=momLiveSym===sym?momLiveProfile:null;
                          if(!lp) return null;
                          function regBg(r){return r==='Supportive'?'#eef8ee':r==='Neutral'?'#fdf8e6':'#fff0f0';}
                          function regFg(r){return r==='Supportive'?'#1a6a1a':r==='Neutral'?'#b88000':'#c03030';}
                          if(lp.monthly==='Not Enough Data') return <div style={{border:'1px solid #e0dbd0',borderRadius:8,marginBottom:10,padding:'10px 14px'}}><div style={{fontSize:11,fontWeight:700,color:'#888',marginBottom:4}}>Monthly Context</div><div style={{fontSize:11,color:'#aaa'}}>Not enough historical price data to calculate monthly context.</div></div>;
                          var mRsi=lp.monthlyRsi,mRsiDir=lp.monthlyRsiDir;
                          var mRsiScore=mRsi==null?null:mRsi>=65?5:mRsi>=55?4:mRsi>=45?3:mRsi>=35?2:1;
                          var mRsiCol=mRsiScore==null?'#aaa':mRsiScore>=4?'#1a6a1a':mRsiScore===3?'#b88000':'#c03030';
                          var mMacdH=lp.monthlyMacdHist,mMacdDir=lp.monthlyMacdDir;
                          var mMacdArrow=mMacdDir==='Rising'?'up':mMacdDir==='Falling'?'down':'flat';
                          var mMacdScore=mMacdH==null?null:(mMacdH>0&&mMacdDir==='Rising')?5:mMacdH>0?4:(mMacdH<=0&&mMacdDir==='Rising')?3:mMacdH>-0.5?2:1;
                          var mMacdCol=mMacdScore==null?'#aaa':mMacdScore>=4?'#1a6a1a':mMacdScore===3?'#b88000':'#c03030';
                          var mRoc=lp.monthlyRoc;
                          var mRocScore=mRoc==null?null:mRoc>15?5:mRoc>5?4:mRoc>-5?3:mRoc>-15?2:1;
                          var mRocCol=mRocScore==null?'#aaa':mRocScore>=4?'#1a6a1a':mRocScore===3?'#b88000':'#c03030';
                          var mSma=lp.monthlyPriceVsSma10;
                          var mSmaScore=mSma==null?null:mSma>8?5:mSma>3?4:mSma>-3?3:mSma>-8?2:1;
                          var mSmaCol=mSmaScore==null?'#aaa':mSmaScore>=4?'#1a6a1a':mSmaScore===3?'#b88000':'#c03030';
                          return (
                            <div style={{border:'1px solid #e0dbd0',borderRadius:8,marginBottom:10}}>
                              <div style={{padding:'6px 14px',background:'#faf8f4',borderBottom:'1px solid #e0dbd0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                <span style={{fontSize:11,fontWeight:700,color:'#555'}}>Monthly Context</span>
                                <span style={{fontSize:10,fontWeight:700,color:regFg(lp.monthlyRegime),background:regBg(lp.monthlyRegime),padding:'2px 8px',borderRadius:4,border:'0.5px solid '+regFg(lp.monthlyRegime)+'44'}}>{'Regime: '+lp.monthlyRegime}</span>
                              </div>
                              <MRow label={"Monthly RSI (14)"} val={mRsi!=null?"RSI "+mRsi.toFixed(1)+(mRsiDir==='up'?' (↑ improving)':mRsiDir==='down'?' (↓ declining)':' (→ stable)'):null} valCol={mRsiCol} score={mRsiScore} dotCol={mRsiCol}
                                desc={mRsi==null?"Data unavailable.":mRsi>=65?"RSI "+mRsi.toFixed(0)+" -- monthly momentum is strong. Broader macro tailwind.":mRsi>=55?"RSI "+mRsi.toFixed(0)+" -- monthly buyers in control.":mRsi>=45?"RSI "+mRsi.toFixed(0)+" -- neutral monthly momentum.":mRsi>=35?"RSI "+mRsi.toFixed(0)+" -- monthly momentum is weak.":"RSI "+mRsi.toFixed(0)+" -- monthly momentum is strongly weak."}
                                context={mRsi!=null?"Monthly RSI measures momentum over the last 14 monthly bars. Above 55 reflects a healthy longer-term trend; below 45 suggests caution on a macro timeframe.":null}
                              />
                              {mSma!=null&&<MRow label={"Price vs Monthly SMA10"} val={(mSma>=0?'+':'')+mSma.toFixed(2)+'%'} valCol={mSmaCol} score={mSmaScore} dotCol={mSmaCol}
                                desc={mSma>8?"Price well above its 10-month average -- strong macro trend.":mSma>3?"Price above its 10-month average -- positive macro momentum.":mSma>-3?"Price near its 10-month average -- neutral macro context.":mSma>-8?"Price below its 10-month average -- weak macro trend.":"Price well below its 10-month average -- bearish macro trend."}
                                context={"Price vs 10-month SMA measures whether the stock is in a long-term uptrend or downtrend."}
                              />}
                              <MRow label={"Monthly MACD Histogram"} val={mMacdH!=null?mMacdH.toFixed(4):null}
                                valCol={mMacdH==null?'#aaa':mMacdH>0&&mMacdDir==='Rising'?'#1a6a1a':mMacdH>0?'#888':'#c03030'}
                                dir={mMacdArrow} score={mMacdScore} dotCol={mMacdCol}
                                desc={mMacdH==null?"Data unavailable.":mMacdH>0&&mMacdDir==='Rising'?"Monthly MACD positive and improving -- macro buying pressure is building.":mMacdH>0?"Monthly MACD positive -- longer-term buying bias.":mMacdDir==='Rising'?"Monthly MACD negative but recovering -- macro picture may be turning.":"Monthly MACD negative -- macro selling pressure."}
                                context={mMacdH!=null?"Monthly MACD histogram shows whether longer-term buying or selling momentum is dominant. It changes slowly and reflects multi-month macro trends.":null}
                              />
                              <MRow label={"Monthly 3-month ROC"} val={mRoc!=null?(mRoc>=0?'+':'')+mRoc.toFixed(2)+'%':null} valCol={mRocCol} score={mRocScore} dotCol={mRocCol}
                                desc={mRoc==null?"Data unavailable.":mRoc>15?"Price up "+mRoc.toFixed(1)+"% over 3 months -- strong macro momentum.":mRoc>5?"Price up "+mRoc.toFixed(1)+"% over 3 months -- healthy quarterly trend.":mRoc>-5?"Price near flat over 3 months -- neutral macro context.":mRoc>-15?"Price down "+Math.abs(mRoc).toFixed(1)+"% over 3 months -- weak macro context.":"Price down "+Math.abs(mRoc).toFixed(1)+"% over 3 months -- strong macro headwind."}
                                context={mRoc!=null?"3-month Rate of Change measures the price change over the last 3 monthly bars. Gives a macro view of whether the broader trend is supportive.":null}
                              />
                            </div>
                          );
                        })()}

                        <div style={{fontSize:10,color:"#aaa",lineHeight:1.5,padding:"8px 12px",background:"#faf8f4",borderRadius:8,border:"0.5px solid #e8e4de"}}>
                          {"Momentum signals use Massive.com and Yahoo Finance data. Research only — not financial advice."}
                        </div>

                      </div>
                    );
                  
                  })()}

                  {/* REVERSAL TAB */}
                  {insightTab === "reversal" && (function() {
                    var ind  = massiveInfo && massiveInfo.indicators ? massiveInfo.indicators : null;
                    var rawAggs = massiveInfo && massiveInfo.aggs ? massiveInfo.aggs : [];
                    var price = q ? q.price : 0;
                    var hi52 = ov ? ov.hi52 : 0, lo52 = ov ? ov.lo52 : 0;

                    // bars = oldest-first
                    var bars = rawAggs.filter(function(b){ return b&&b.c>0&&b.h>0&&b.l>0&&b.v>=0; }).slice().reverse();
                    var n = bars.length;

                    // --- Helper functions ---
                    function revLabelColor(lbl) { return revDirLabelColor(lbl, true, "main"); }
                    function revBearLabelColor(lbl) { return revDirLabelColor(lbl, false, "main"); }
                    function getReversalLabel(score) {
                      if (score === null || score === undefined) return "Not enough data";
                      if (score <= 20) return "No Signal";
                      if (score <= 40) return "Watch";
                      if (score <= 60) return "Forming";
                      if (score <= 80) return "Triggered";
                      return "Confirmed";
                    }

                    function revLabelColor(lbl) {
                      if (lbl==="Confirmed")   return "#1a6a1a";
                      if (lbl==="Triggered")   return "#2a8a2a";
                      if (lbl==="Confirming")  return "#2a8a2a";
                      if (lbl==="Forming")     return "#5a8a00";
                      if (lbl==="Watch")       return "#b88000";
                      if (lbl==="Spark") return "#1a6080";
                      return "#888";
                    }
                    function revBearLabelColor(lbl) {
                      if (lbl==="Confirmed")   return "#a02020";
                      if (lbl==="Triggered")   return "#c03030";
                      if (lbl==="Confirming")  return "#c03030";
                      if (lbl==="Forming")     return "#c05030";
                      if (lbl==="Watch")       return "#b88000";
                      return "#888";
                    }
                    function stageSummaryLabel(score) {
                      if (score===null||score===undefined) return "No Data";
                      if (score>=70) return "Strong";
                      if (score>=40) return "Moderate";
                      if (score>=10) return "Weak";
                      return "Missing";
                    }
                    function stageSummaryColor(score, bull) {
                      if (score===null) return "#aaa";
                      if (score>=70) return bull?"#2a8a00":"#c03030";
                      if (score>=40) return "#b88000";
                      return "#aaa";
                    }
                    // Direction-aware bg/border based on label strength
                    function dirColors(label, bull) {
                      if (label==="Confirmed")   return { bg: bull?"#e6f4e6":"#fde8e8", bd: bull?"#7abd00":"#e08080" };
                      if (label==="Triggered")   return { bg: bull?"#eef9ee":"#fff0f0", bd: bull?"#9acd50":"#f0a0a0" };
                      if (label==="Confirming")  return { bg: bull?"#eef9ee":"#fff0f0", bd: bull?"#9acd50":"#f0a0a0" };
                      if (label==="Forming")     return { bg: bull?"#f5faf0":"#fff4f4", bd: bull?"#c8e0a0":"#f8c8c8" };
                      if (label==="Watch")       return { bg:"#fdf8e6",               bd:"#d4c870"                  };
                      if (label==="Spark") return { bg:"#eaf2ff",               bd:"#90b8e0"                  };
                      return                            { bg:"#f5f5f5",               bd:"#e0e0e0"                  };
                    }

                    // --- Shared computed values ---
                    var avg30v = n>=30 ? bars.slice(n-30).reduce(function(s,b){ return s+b.v; },0)/30 : null;
                    var sma50  = n>=50 ? bars.slice(n-50).reduce(function(s,b){ return s+b.c; },0)/50 : null;
                    var recentHigh20 = n>=21 ? (function(){ var h=-Infinity; for(var i=n-21;i<n-1;i++) if(bars[i].h>h) h=bars[i].h; return h; })() : null;
                    var recentLow20  = n>=21 ? (function(){ var l=Infinity; for(var i=n-21;i<n-1;i++) if(bars[i].l<l) l=bars[i].l; return l; })() : null;
                    var cur5Hi  = n>=5  ? (function(){ var h=-Infinity; for(var i=n-5;i<n;i++)   if(bars[i].h>h)h=bars[i].h; return h; })() : null;
                    var prev5Hi = n>=10 ? (function(){ var h=-Infinity; for(var i=n-10;i<n-5;i++) if(bars[i].h>h)h=bars[i].h; return h; })() : null;
                    var cur5Lo  = n>=5  ? (function(){ var l=Infinity; for(var i=n-5;i<n;i++)    if(bars[i].l<l)l=bars[i].l; return l; })() : null;
                    var prev5Lo = n>=10 ? (function(){ var l=Infinity; for(var i=n-10;i<n-5;i++) if(bars[i].l<l)l=bars[i].l; return l; })() : null;

                    var todayBar  = n > 0 ? bars[n-1] : null;
                    var rsi       = ind && ind.rsi14 != null ? parseFloat(ind.rsi14) : null;
                    var rsiH      = ind && ind.rsiHistory ? ind.rsiHistory.map(function(v){ return parseFloat(v); }) : [];
                    var macdHist  = ind && ind.macd && ind.macd.histogram != null ? parseFloat(ind.macd.histogram) : null;
                    var macdHArr  = ind && ind.macdHistory ? ind.macdHistory : [];
                    var ema20     = ind && ind.ema20 != null ? parseFloat(ind.ema20) : null;
                    var sma50m    = ind && ind.sma50 != null ? parseFloat(ind.sma50) : null;
                    var volumeRatio = avg30v && todayBar ? todayBar.v / avg30v : null;

                    // RSI direction (recent avg vs older avg)
                    var rsiDir = rsiH.length >= 7 ?
                      ((rsiH[0]+rsiH[1])/2) - ((rsiH[2]+rsiH[3]+rsiH[4]+rsiH[5]+rsiH[6])/5) : null;

                    // --- Bullish indicators ---
                    function bullSetupInds() {
                      var inds = [];
                      // 1. RSI base forming (RSI 30-50, stabilising)
                      if (rsi !== null && rsiDir !== null) {
                        var det = rsi >= 30 && rsi <= 50 && rsiDir > -3;
                        inds.push({ name:"RSI base forming", score:det?100:0,
                          status: det?"detected":"not_detected",
                          explanation: det ? "RSI is in the 30–50 base zone and stabilising — early bottoming behaviour." : "RSI is not in the base zone or is still declining." });
                      } else {
                        inds.push({ name:"RSI base forming", score:null, status:"unavailable", explanation:"RSI data unavailable." });
                      }
                      // 2. RSI bullish divergence (price lower, RSI higher)
                      if (rsi !== null && rsiH.length >= 5 && n >= 5) {
                        var priceLow = Math.min(bars[n-1].l, bars[n-2].l, bars[n-3].l);
                        var prevLow  = Math.min(bars[n-4].l, bars[n-5].l);
                        var rsiNow   = (rsiH[0]+rsiH[1])/2;
                        var rsiPrev  = (rsiH[3]+rsiH[4])/2;
                        var det2 = priceLow < prevLow && rsiNow > rsiPrev + 2;
                        inds.push({ name:"RSI bullish divergence", score:det2?100:0,
                          status: det2?"detected":"not_detected",
                          explanation: det2 ? "Price made a lower low while RSI made a higher low — possible bullish divergence." : "No clear RSI bullish divergence detected." });
                      } else {
                        inds.push({ name:"RSI bullish divergence", score:null, status:"unavailable", explanation:"Insufficient RSI history for divergence calculation." });
                      }
                      // 3. Near 52-week low with RSI recovery
                      if (rsi !== null && hi52 > 0 && lo52 > 0 && price > 0) {
                        var pos = (price - lo52) / (hi52 - lo52);
                        var det3 = pos < 0.2 && rsiDir !== null && rsiDir > 0;
                        inds.push({ name:"Near 52-week low with RSI recovery", score:det3?100:0,
                          status: det3?"detected":"not_detected",
                          explanation: det3 ? "Price is near its 52-week low and RSI is beginning to recover — possible bottoming." : "Not near 52-week low or RSI not recovering." });
                      } else {
                        inds.push({ name:"Near 52-week low with RSI recovery", score:null, status:"unavailable", explanation:"52-week range or RSI data unavailable." });
                      }
                      // 4. Price forming higher low (5-day windows)
                      if (cur5Lo !== null && prev5Lo !== null) {
                        var det4 = cur5Lo > prev5Lo;
                        inds.push({ name:"Price forming higher low", score:det4?100:0,
                          status: det4?"detected":"not_detected",
                          explanation: det4 ? "The latest 5-day low ($"+cur5Lo.toFixed(2)+") is above the prior 5-day low ($"+prev5Lo.toFixed(2)+") — higher low forming." : "No higher low detected in the latest 5-day windows." });
                      } else {
                        inds.push({ name:"Price forming higher low", score:null, status:"unavailable", explanation:"Insufficient data for 5-day window comparison." });
                      }
                      // 5. Selling volume weakening (volume on down days decreasing)
                      if (n >= 10) {
                        var dnVol5   = bars.slice(n-5).filter(function(b,i){ return i>0&&b.c<bars[n-5+i-1].c; }).reduce(function(s,b){return s+b.v;},0);
                        var dnVol10  = bars.slice(n-10,n-5).filter(function(b,i){ return i>0&&b.c<bars[n-10+i-1].c; }).reduce(function(s,b){return s+b.v;},0);
                        var det5 = dnVol5 < dnVol10 * 0.8;
                        inds.push({ name:"Selling volume pressure weakening", score:det5?100:0,
                          status: det5?"detected":"not_detected",
                          explanation: det5 ? "Volume on down days this week is lower than last week — selling pressure may be easing." : "Selling volume pressure not clearly weakening." });
                      } else {
                        inds.push({ name:"Selling volume pressure weakening", score:null, status:"unavailable", explanation:"Insufficient data (need 10+ days)." });
                      }
                      return inds;
                    }

                    function bullTriggerInds() {
                      var inds = [];
                      // 1. MACD histogram turning up
                      if (macdHist !== null && macdHArr.length >= 2) {
                        var prev = macdHArr[1] && macdHArr[1].histogram != null ? parseFloat(macdHArr[1].histogram) : null;
                        var det = prev !== null && macdHist > prev;
                        inds.push({ name:"MACD histogram turning up", score:det?100:0,
                          status: det?"detected":"not_detected",
                          explanation: det ? "MACD histogram rose from "+prev.toFixed(3)+" to "+macdHist.toFixed(3)+" — upward momentum may be building." : "MACD histogram is not turning up." });
                      } else {
                        inds.push({ name:"MACD histogram turning up", score:null, status:"unavailable", explanation:"MACD history unavailable." });
                      }
                      // 2. RSI crosses above 40 or 50
                      if (rsi !== null && rsiH.length >= 2) {
                        var prevRsi = rsiH[1];
                        var det2 = (rsi >= 40 && prevRsi < 40) || (rsi >= 50 && prevRsi < 50);
                        var nearCross = !det2 && rsi >= 38 && rsi < 52;
                        inds.push({ name:"RSI crosses above 40 or 50", score:det2?100:nearCross?50:0,
                          status: det2?"detected":"not_detected",
                          explanation: det2 ? "RSI crossed above a key level (40 or 50) — momentum turning up." : nearCross ? "RSI is approaching a key level — watch for crossover." : "No RSI crossover above 40 or 50 detected." });
                      } else {
                        inds.push({ name:"RSI crosses above 40 or 50", score:null, status:"unavailable", explanation:"RSI data unavailable." });
                      }
                      // 3. Close above 20-day MA (EMA20)
                      if (ema20 !== null && todayBar) {
                        var det3 = todayBar.c > ema20;
                        inds.push({ name:"Close above 20-day average", score:det3?100:0,
                          status: det3?"detected":"not_detected",
                          explanation: det3 ? "Price closed above the 20-day EMA ($"+ema20.toFixed(2)+") — short-term trend may be turning." : "Price remains below the 20-day EMA ($"+ema20.toFixed(2)+")." });
                      } else {
                        inds.push({ name:"Close above 20-day average", score:null, status:"unavailable", explanation:"EMA20 data unavailable." });
                      }
                      // 4. Short-term MA turning up
                      if (ema20 !== null && ind.rsiHistory && n >= 2) {
                        var det4 = todayBar && bars[n-2] && todayBar.c > bars[n-2].c && ema20 > (bars.slice(Math.max(0,n-3),n-1).reduce(function(s,b){return s+b.c;},0)/2);
                        inds.push({ name:"Short-term average turning up", score:det4?100:0,
                          status: det4?"detected":"not_detected",
                          explanation: det4 ? "Price and short-term average are moving higher — momentum improving." : "Short-term average not yet clearly turning up." });
                      } else {
                        inds.push({ name:"Short-term average turning up", score:null, status:"unavailable", explanation:"Insufficient data." });
                      }
                      return inds;
                    }

                    function bullConfirmInds() {
                      var inds = [];
                      // 1. Break above recent 20-day resistance
                      if (recentHigh20 !== null && todayBar) {
                        var det = todayBar.c > recentHigh20;
                        inds.push({ name:"Price breaks above recent resistance", score:det?100:0,
                          status: det?"detected":"not_detected",
                          explanation: det ? "Price closed above the 20-day resistance level ($"+recentHigh20.toFixed(2)+") — bullish breakout." : "Price has not closed above the recent 20-day resistance ($"+recentHigh20.toFixed(2)+")." });
                      } else {
                        inds.push({ name:"Price breaks above recent resistance", score:null, status:"unavailable", explanation:"Not enough data (need 21+ trading days)." });
                      }
                      // 2. Close above SMA50
                      if (sma50 !== null && todayBar) {
                        var det2 = todayBar.c > sma50;
                        inds.push({ name:"Close above 50-day moving average", score:det2?100:0,
                          status: det2?"detected":"not_detected",
                          explanation: det2 ? "Price closed above the 50-day average ($"+sma50.toFixed(2)+") — long-term bullish signal." : "Price has not closed above the 50-day average ($"+sma50.toFixed(2)+")." });
                      } else {
                        inds.push({ name:"Close above 50-day moving average", score:null, status:"unavailable", explanation:"Not enough data (need 50+ trading days)." });
                      }
                      // 3. Breakout with volume ≥ 1.5x
                      if (recentHigh20 !== null && avg30v !== null && todayBar) {
                        var det3 = todayBar.c > recentHigh20 && volumeRatio >= 1.5;
                        inds.push({ name:"Breakout with above-average volume", score:det3?100:0,
                          status: det3?"detected":"not_detected",
                          explanation: det3 ? "Breakout above resistance confirmed with volume at "+volumeRatio.toFixed(1)+"x the 30-day average." : "No confirmed breakout with high volume (volume at "+(volumeRatio?volumeRatio.toFixed(1)+"x":"N/A")+" vs 1.5x required)." });
                      } else {
                        inds.push({ name:"Breakout with above-average volume", score:null, status:"unavailable", explanation:"Need 21+ trading days and 30-day avg volume." });
                      }
                      // 4. Higher high and higher low
                      if (cur5Hi !== null && prev5Hi !== null && cur5Lo !== null && prev5Lo !== null) {
                        var det4 = cur5Hi > prev5Hi && cur5Lo > prev5Lo;
                        inds.push({ name:"Higher high and higher low structure", score:det4?100:0,
                          status: det4?"detected":"not_detected",
                          explanation: det4 ? "Latest 5-day range (H:$"+cur5Hi.toFixed(2)+" L:$"+cur5Lo.toFixed(2)+") is above prior 5-day range (H:$"+prev5Hi.toFixed(2)+" L:$"+prev5Lo.toFixed(2)+")." : "The latest 5-day range is not yet forming both a higher high and higher low." });
                      } else {
                        inds.push({ name:"Higher high and higher low structure", score:null, status:"unavailable", explanation:"Need 10+ trading days." });
                      }
                      return inds;
                    }

                    function bearSetupInds() {
                      var inds = [];
                      // 1. RSI overbought stalling
                      if (rsi !== null && rsiDir !== null) {
                        var det = rsi >= 65 && rsiDir < 0;
                        inds.push({ name:"RSI overbought and stalling", score:det?100:0,
                          status: det?"detected":"not_detected",
                          explanation: det ? "RSI is in overbought territory and declining — momentum may be stalling." : "RSI is not overbought or is still rising." });
                      } else {
                        inds.push({ name:"RSI overbought and stalling", score:null, status:"unavailable", explanation:"RSI data unavailable." });
                      }
                      // 2. RSI bearish divergence (price higher, RSI lower)
                      if (rsi !== null && rsiH.length >= 5 && n >= 5) {
                        var priceHigh = Math.max(bars[n-1].h, bars[n-2].h, bars[n-3].h);
                        var prevHigh  = Math.max(bars[n-4].h, bars[n-5].h);
                        var rsiNow    = (rsiH[0]+rsiH[1])/2;
                        var rsiPrev   = (rsiH[3]+rsiH[4])/2;
                        var det2 = priceHigh > prevHigh && rsiNow < rsiPrev - 2;
                        inds.push({ name:"RSI bearish divergence", score:det2?100:0,
                          status: det2?"detected":"not_detected",
                          explanation: det2 ? "Price made a higher high while RSI made a lower high — possible bearish divergence." : "No clear RSI bearish divergence detected." });
                      } else {
                        inds.push({ name:"RSI bearish divergence", score:null, status:"unavailable", explanation:"Insufficient RSI history." });
                      }
                      // 3. Near 52-week high with RSI declining
                      if (rsi !== null && hi52 > 0 && lo52 > 0 && price > 0) {
                        var pos3 = (price - lo52) / (hi52 - lo52);
                        var det3 = pos3 > 0.85 && rsiDir !== null && rsiDir < 0;
                        inds.push({ name:"Near 52-week high with RSI declining", score:det3?100:0,
                          status: det3?"detected":"not_detected",
                          explanation: det3 ? "Price is near its 52-week high and RSI is declining — possible topping." : "Not near 52-week high or RSI not declining." });
                      } else {
                        inds.push({ name:"Near 52-week high with RSI declining", score:null, status:"unavailable", explanation:"52-week range or RSI data unavailable." });
                      }
                      // 4. Price forming lower high
                      if (cur5Hi !== null && prev5Hi !== null) {
                        var det4 = cur5Hi < prev5Hi;
                        inds.push({ name:"Price forming lower high", score:det4?100:0,
                          status: det4?"detected":"not_detected",
                          explanation: det4 ? "The latest 5-day high ($"+cur5Hi.toFixed(2)+") is below the prior 5-day high ($"+prev5Hi.toFixed(2)+") — lower high forming." : "No lower high detected." });
                      } else {
                        inds.push({ name:"Price forming lower high", score:null, status:"unavailable", explanation:"Insufficient data for 5-day window comparison." });
                      }
                      // 5. Buying volume weakening
                      if (n >= 10) {
                        var upVol5  = bars.slice(n-5).filter(function(b,i){ return i>0&&b.c>bars[n-5+i-1].c; }).reduce(function(s,b){return s+b.v;},0);
                        var upVol10 = bars.slice(n-10,n-5).filter(function(b,i){ return i>0&&b.c>bars[n-10+i-1].c; }).reduce(function(s,b){return s+b.v;},0);
                        var det5 = upVol5 < upVol10 * 0.8;
                        inds.push({ name:"Buying volume pressure weakening", score:det5?100:0,
                          status: det5?"detected":"not_detected",
                          explanation: det5 ? "Volume on up days this week is lower than last week — buying pressure may be easing." : "Buying volume pressure not clearly weakening." });
                      } else {
                        inds.push({ name:"Buying volume pressure weakening", score:null, status:"unavailable", explanation:"Insufficient data (need 10+ days)." });
                      }
                      return inds;
                    }

                    function bearTriggerInds() {
                      var inds = [];
                      // 1. MACD histogram turning down
                      if (macdHist !== null && macdHArr.length >= 2) {
                        var prev = macdHArr[1] && macdHArr[1].histogram != null ? parseFloat(macdHArr[1].histogram) : null;
                        var det = prev !== null && macdHist < prev;
                        inds.push({ name:"MACD histogram turning down", score:det?100:0,
                          status: det?"detected":"not_detected",
                          explanation: det ? "MACD histogram fell from "+prev.toFixed(3)+" to "+macdHist.toFixed(3)+" — downward momentum may be building." : "MACD histogram is not turning down." });
                      } else {
                        inds.push({ name:"MACD histogram turning down", score:null, status:"unavailable", explanation:"MACD history unavailable." });
                      }
                      // 2. RSI drops below 60 or 50
                      if (rsi !== null && rsiH.length >= 2) {
                        var prevRsi2 = rsiH[1];
                        var det2 = (rsi < 60 && prevRsi2 >= 60) || (rsi < 50 && prevRsi2 >= 50);
                        var nearCross = !det2 && rsi >= 48 && rsi < 62;
                        inds.push({ name:"RSI drops below 60 or 50", score:det2?100:nearCross?50:0,
                          status: det2?"detected":"not_detected",
                          explanation: det2 ? "RSI crossed below a key level (60 or 50) — momentum turning down." : nearCross ? "RSI is approaching a key level from above — watch for crossover." : "No RSI crossover below 60 or 50 detected." });
                      } else {
                        inds.push({ name:"RSI drops below 60 or 50", score:null, status:"unavailable", explanation:"RSI data unavailable." });
                      }
                      // 3. Close below 20-day MA
                      if (ema20 !== null && todayBar) {
                        var det3 = todayBar.c < ema20;
                        inds.push({ name:"Close below 20-day average", score:det3?100:0,
                          status: det3?"detected":"not_detected",
                          explanation: det3 ? "Price closed below the 20-day EMA ($"+ema20.toFixed(2)+") — short-term trend may be turning down." : "Price remains above the 20-day EMA ($"+ema20.toFixed(2)+")." });
                      } else {
                        inds.push({ name:"Close below 20-day average", score:null, status:"unavailable", explanation:"EMA20 data unavailable." });
                      }
                      // 4. Short-term MA turning down
                      if (ema20 !== null && n >= 2) {
                        var det4 = todayBar && bars[n-2] && todayBar.c < bars[n-2].c;
                        inds.push({ name:"Short-term average turning down", score:det4?100:0,
                          status: det4?"detected":"not_detected",
                          explanation: det4 ? "Price is moving lower — short-term average may be turning down." : "Short-term average not clearly turning down." });
                      } else {
                        inds.push({ name:"Short-term average turning down", score:null, status:"unavailable", explanation:"Insufficient data." });
                      }
                      return inds;
                    }

                    function bearConfirmInds() {
                      var inds = [];
                      // 1. Break below recent 20-day support
                      if (recentLow20 !== null && todayBar) {
                        var det = todayBar.c < recentLow20;
                        inds.push({ name:"Price breaks below recent support", score:det?100:0,
                          status: det?"detected":"not_detected",
                          explanation: det ? "Price closed below the 20-day support level ($"+recentLow20.toFixed(2)+") — bearish breakdown." : "Price has not closed below the recent 20-day support ($"+recentLow20.toFixed(2)+")." });
                      } else {
                        inds.push({ name:"Price breaks below recent support", score:null, status:"unavailable", explanation:"Not enough data (need 21+ trading days)." });
                      }
                      // 2. Close below SMA50
                      if (sma50 !== null && todayBar) {
                        var det2 = todayBar.c < sma50;
                        inds.push({ name:"Close below 50-day moving average", score:det2?100:0,
                          status: det2?"detected":"not_detected",
                          explanation: det2 ? "Price closed below the 50-day average ($"+sma50.toFixed(2)+") — long-term bearish signal." : "Price has not closed below the 50-day average ($"+sma50.toFixed(2)+")." });
                      } else {
                        inds.push({ name:"Close below 50-day moving average", score:null, status:"unavailable", explanation:"Not enough data (need 50+ trading days)." });
                      }
                      // 3. Breakdown with volume ≥ 1.5x
                      if (recentLow20 !== null && avg30v !== null && todayBar) {
                        var det3 = todayBar.c < recentLow20 && volumeRatio >= 1.5;
                        inds.push({ name:"Breakdown with above-average volume", score:det3?100:0,
                          status: det3?"detected":"not_detected",
                          explanation: det3 ? "Breakdown below support confirmed with volume at "+volumeRatio.toFixed(1)+"x the 30-day average." : "No confirmed breakdown with high volume (volume at "+(volumeRatio?volumeRatio.toFixed(1)+"x":"N/A")+" vs 1.5x required)." });
                      } else {
                        inds.push({ name:"Breakdown with above-average volume", score:null, status:"unavailable", explanation:"Need 21+ trading days and 30-day avg volume." });
                      }
                      // 4. Lower high and lower low
                      if (cur5Hi !== null && prev5Hi !== null && cur5Lo !== null && prev5Lo !== null) {
                        var det4 = cur5Hi < prev5Hi && cur5Lo < prev5Lo;
                        inds.push({ name:"Lower high and lower low structure", score:det4?100:0,
                          status: det4?"detected":"not_detected",
                          explanation: det4 ? "Latest 5-day range (H:$"+cur5Hi.toFixed(2)+" L:$"+cur5Lo.toFixed(2)+") is below prior 5-day range (H:$"+prev5Hi.toFixed(2)+" L:$"+prev5Lo.toFixed(2)+")." : "The latest 5-day range is not yet forming both a lower high and lower low." });
                      } else {
                        inds.push({ name:"Lower high and lower low structure", score:null, status:"unavailable", explanation:"Need 10+ trading days." });
                      }
                      return inds;
                    }

                    // --- Calculate scores from calcReversalWatch (single source of truth) ---
                    // Indicator arrays kept for UI detail rows; all scores come from technicalSignals.js
                    var bsInds = bullSetupInds(),   btInds = bullTriggerInds(),   bcInds = bullConfirmInds();
                    var dsInds = bearSetupInds(),   dtInds = bearTriggerInds(),   dcInds = bearConfirmInds();
                    var _revW = calcReversalWatch(bars, ind, { hi52: ov?ov.hi52:0, lo52: ov?ov.lo52:0, price: (q&&q.price)||0 });
                    var bsScore = _revW.bullishSetupScore,    btScore = _revW.bullishTriggerScore,    bcScore = _revW.bullishConfirmationScore;
                    var dsScore = _revW.bearishSetupScore,    dtScore = _revW.bearishTriggerScore,    dcScore = _revW.bearishConfirmationScore;
                    var bullScore = _revW.bullishScore, bearScore = _revW.bearishScore;

                    // --- Overall status (consistent with sidebar pre-compute) ---
                    var getDirectionStatus = getReversalDirectionStatus;
                    var revStatus = { status: _revW.status, primaryScore: _revW.score };
                    // Restore explanation (getOverallReversalStatus returns {status,primaryScore} only)
                    var _revExplMap = {
                      "Bullish Reversal Spark":  "Bullish momentum has started turning before full setup or confirmation is available. Watch for confirmation to strengthen.",
                      "Bullish Reversal Confirming":   "Price action is beginning to validate the bullish reversal. Trigger is strong and confirmation is improving.",
                      "Bullish Reversal Forming":      "Bullish setup and momentum trigger are positive, but price confirmation is still missing.",
                      "Bullish Reversal Triggered":    "Bullish momentum appears to be turning with some supporting price confirmation.",
                      "Bullish Reversal Confirmed":    "Bullish setup, momentum trigger, and price confirmation are all aligned.",
                      "Bullish Reversal Watch":        "Early bullish reversal conditions may be appearing, but trigger and confirmation are still limited.",
                      "Bearish Reversal Forming":      "Bearish setup and momentum trigger are positive, but price confirmation is still missing.",
                      "Bearish Reversal Triggered":    "Bearish momentum appears to be turning with some supporting price confirmation.",
                      "Bearish Reversal Confirmed":    "Bearish setup, momentum trigger, and price confirmation are all aligned.",
                      "Bearish Reversal Watch":        "Early bearish reversal conditions may be appearing, but trigger and confirmation are still limited.",
                      "Mixed Reversal Signals":        "Both bullish and bearish reversal signals are present. Price action is unclear and confirmation is needed.",
                      "No Clear Reversal":             "No meaningful bullish or bearish reversal setup is currently detected.",
                      "Not Enough Data":               "Not enough price and volume data is available to calculate a reliable reversal watch signal."
                    };
                    revStatus.explanation = _revExplMap[revStatus.status] || "";
                    var bLbl  = getDirectionStatus(bsScore, btScore, bcScore, "Bullish").label.replace("Reversal ","") || getReversalLabel(bullScore);
                    var beLbl = getDirectionStatus(dsScore, dtScore, dcScore, "Bearish").label.replace("Reversal ","") || getReversalLabel(bearScore);
                    var statusCol = revStatusColor(revStatus.status, "main");
                    var statusBg  = revStatusColor(revStatus.status, "bg");
                    var statusBd  = revStatusColor(revStatus.status, "bd");

                    // --- UI Components ---
                    function IndicatorRow(ind) {
                      var icon = ind.status==="detected"?"✓":ind.status==="not_detected"?"✗":"—";
                      var col  = ind.status==="detected"?"#1a6a1a":ind.status==="not_detected"?"#c03030":"#aaa";
                      return (
                        <div style={{padding:"8px 14px",borderBottom:"0.5px solid #f5f2ec",display:"flex",gap:10,alignItems:"flex-start"}}>
                          <span style={{fontSize:13,color:col,fontWeight:700,flexShrink:0,marginTop:1}}>{icon}</span>
                          <div>
                            <div style={{fontSize:11,fontWeight:600,color:"#333"}}>{ind.name}
                              <span style={{fontSize:9,color:col,marginLeft:6,fontWeight:700}}>{ind.status==="detected"?"Detected":ind.status==="not_detected"?"Not detected":"Not enough data"}</span>
                            </div>
                            <div style={{fontSize:10,color:"#888",marginTop:2,lineHeight:1.5}}>{ind.explanation}</div>
                          </div>
                        </div>
                      );
                    }

                    function StageCard(props) {
                      var score=props.score, label=getReversalLabel(score), inds=props.inds;
                      var col = score===null?"#aaa":label==="Confirmed"||label==="Triggered"?"#2a8a2a":label==="Forming"||label==="Watch"?"#b88000":"#888";
                      var det = inds.filter(function(i){return i.status==="detected";}).length;
                      var avail = inds.filter(function(i){return i.score!==null;}).length;
                      return (
                        <div style={{border:"0.5px solid #e8e4dc",borderRadius:8,marginBottom:8,overflow:"hidden"}}>
                          <div style={{padding:"10px 14px",background:"#faf8f4",borderBottom:"0.5px solid #e8e4dc",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <span style={{fontSize:12,fontWeight:700,color:"#333"}}>{props.title}</span>
                              <span style={{fontSize:10,color:"#aaa",marginLeft:8}}>{props.subtitle}</span>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              {score!==null&&<span style={{fontSize:13,fontWeight:700,color:col}}>{score}</span>}
                              <span style={{fontSize:11,fontWeight:600,color:col}}>{label}</span>
                            </div>
                          </div>
                          <div style={{fontSize:10,color:"#888",padding:"6px 14px",background:"#faf8f4",borderBottom:"0.5px solid #f0ede6"}}>{det+" of "+avail+" available indicators detected."}</div>
                          {inds.map(function(ind,i){ return <div key={i}>{IndicatorRow(ind)}</div>; })}
                          <div style={{padding:"6px 14px"}}>
                            <details>
                              <summary style={{fontSize:10,color:"#bbb",cursor:"pointer",outline:"none",listStyle:"none",display:"flex",alignItems:"center",gap:4}}>
                                <span style={{fontSize:9,color:"#ccc"}}>▶</span><span>How is this scored?</span>
                              </summary>
                              <div style={{fontSize:10,color:"#666",lineHeight:1.8,padding:"4px 0",whiteSpace:"pre-line"}}>{"Detected = 100 | Not detected = 0 | Unavailable = excluded\n\nStage score = average of available indicators only.\nIf all indicators unavailable, stage shows Not enough data."}</div>
                            </details>
                          </div>
                        </div>
                      );
                    }

                    function DirectionCard(props) {
                      // Use stage-aware label (not raw score label)
                      var dirResult = getDirectionStatus(props.setupScore, props.trigScore, props.confScore, props.bull?"Bullish":"Bearish");
                      var label = dirResult.label.replace("Reversal ","") || "No Signal";
                      var score = props.score;
                      var col   = props.bull ? revLabelColor(label) : revBearLabelColor(label);
                      var dc    = dirColors(label, props.bull);
                      // Header label color - weaken bearish when low
                      var hdrCol = props.bull ? revStatusColor("Bullish "+label, "subtle") : revStatusColor("Bearish "+label, "subtle");
                      // Stage summary labels
                      var ssLbl = stageSummaryLabel(props.setupScore);
                      var stLbl = stageSummaryLabel(props.trigScore);
                      var scLbl = stageSummaryLabel(props.confScore);
                      return (
                        <div style={{border:"0.5px solid "+dc.bd,borderRadius:10,marginBottom:16,overflow:"hidden"}}>
                          <div style={{background:dc.bg,padding:"12px 16px",borderBottom:"0.5px solid "+dc.bd}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                              <div>
                                <div style={{fontSize:10,fontWeight:700,color:props.bull?"#2a6a2a":"#888",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>{props.title}</div>
                                <div style={{fontSize:11,color:"#888",marginBottom:6}}>{props.subtitle}</div>
                                {/* Compact stage summary */}
                                <div style={{fontSize:10,color:"#999"}}>
                                  {"Setup "}<span style={{fontWeight:700,color:stageSummaryColor(props.setupScore,props.bull)}}>{ssLbl}</span>
                                  <span style={{margin:"0 5px",color:"#ccc"}}>{"·"}</span>
                                  {"Trigger "}<span style={{fontWeight:700,color:stageSummaryColor(props.trigScore,props.bull)}}>{stLbl}</span>
                                  <span style={{margin:"0 5px",color:"#ccc"}}>{"·"}</span>
                                  {"Confirmation "}<span style={{fontWeight:700,color:stageSummaryColor(props.confScore,props.bull)}}>{scLbl}</span>
                                </div>
                              </div>
                              <div style={{textAlign:"right",flexShrink:0,paddingLeft:12}}>
                                {score!==null&&<div style={{fontSize:20,fontWeight:800,color:col,lineHeight:1}}>{score}</div>}
                                <div style={{fontSize:11,color:"#aaa",marginBottom:2}}>{"/ 100"}</div>
                                <div style={{fontSize:12,fontWeight:700,color:col}}>{label}</div>
                              </div>
                            </div>
                          </div>
                          <div style={{padding:"0 14px 4px 14px",background:dc.bg,borderBottom:"0.5px solid "+dc.bd}}>
                            <details>
                              <summary style={{fontSize:10,color:"#bbb",cursor:"pointer",outline:"none",listStyle:"none",display:"flex",alignItems:"center",gap:4,padding:"6px 0"}}>
                                <span style={{fontSize:9,color:"#ccc"}}>▶</span><span>How is this scored?</span>
                              </summary>
                              <div style={{fontSize:10,color:"#666",lineHeight:1.8,whiteSpace:"pre-line",paddingBottom:4}}>{"Overall Score = Setup × 40% + Trigger × 30% + Confirmation × 30%\n\nLabel is stage-aware — not just the weighted score:\n  Confirmed:   Setup ≥ 60, Trigger ≥ 60, Confirmation ≥ 70\n  Triggered:   Setup ≥ 60, Trigger ≥ 60, Confirmation ≥ 40\n  Confirming:  Trigger ≥ 60, Confirmation ≥ 40 (setup may have faded)\n  Forming:     Setup ≥ 60, Trigger ≥ 60, Confirmation < 40\n  Spark:       Trigger ≥ 60, Confirmation < 40 (momentum turning early)\n  Watch:       Setup ≥ 40, Trigger < 60\n\nIf a stage is unavailable, remaining stages are reweighted."}</div>
                            </details>
                          </div>
                          <div style={{padding:"10px 14px 0 14px"}}>
                            {StageCard({title:"Setup", subtitle:"Early conditions forming?", score:props.setupScore, inds:props.setupInds})}
                            {StageCard({title:"Trigger", subtitle:"Momentum starting to turn?", score:props.trigScore, inds:props.trigInds})}
                            {StageCard({title:"Confirmation", subtitle:"Price action confirmed?", score:props.confScore, inds:props.confInds})}
                          </div>
                        </div>
                      );
                    }

                    // Store for left panel
                    if (!window.__revWatchStatus) window.__revWatchStatus = {};
                    window.__revWatchStatus[sym] = { status:revStatus.status, bullScore:bullScore, bearScore:bearScore, reversalDecision:_revW&&_revW.reversalDecision?_revW.reversalDecision:null };

                    return (
                      <div>
                        {/* Summary Card */}
                        <div style={{border:"0.5px solid "+statusBd,borderRadius:10,background:revStatusColor(revStatus.status,"darkbg"),padding:"14px 16px",marginBottom:16}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:10,fontWeight:700,color:"#999",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Reversal Watch</div>
                              <div style={{fontSize:14,fontWeight:700,color:statusCol,marginBottom:4}}>{revStatus.status}</div>
                              <div style={{fontSize:11,color:"#666",lineHeight:1.5,marginBottom:8}}>
                                {(_revW&&_revW.reversalDecision)?_revW.reversalDecision.reason:revStatus.explanation}
                              </div>
                              {_revW&&_revW.reversalDecision&&_revW.reversalDecision.ruleId&&(
                                <div style={{fontSize:10,color:"#666",background:"rgba(0,0,0,0.15)",borderRadius:5,padding:"6px 10px",marginBottom:0}}>
                                  <div style={{fontWeight:700,color:"#aaa",marginBottom:3}}>{"Why this outcome?"}</div>
                                  <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:3}}>
                                    <span style={{fontSize:9,color:"#999"}}>Rule: <span style={{fontWeight:700,color:statusCol}}>{_revW.reversalDecision.ruleId}</span></span>
                                    <span style={{fontSize:9,color:"#999"}}>Stage: <span style={{fontWeight:600,color:"#ccc"}}>{_revW.reversalDecision.stage}</span></span>
                                    <span style={{fontSize:9,color:"#999"}}>Direction: <span style={{fontWeight:600,color:"#ccc"}}>{_revW.reversalDecision.direction}</span></span>
                                  </div>
                                  {_revW.reversalDecision.triggeredConditions&&_revW.reversalDecision.triggeredConditions.length>0&&_revW.reversalDecision.ruleId.indexOf("FALLBACK")<0&&_revW.reversalDecision.ruleId!=="REV_NOT_ENOUGH_DATA"&&(
                                    <div>
                                      {_revW.reversalDecision.triggeredConditions.map(function(c,i){
                                        if(!c||c.threshold==null) return null;
                                        return <div key={i} style={{fontSize:9,color:"#aaa",marginTop:2}}>
                                          <span style={{color:c.result?"#7abd00":"#e05050",fontWeight:700,marginRight:4}}>{c.result?"\u2713":"\u2717"}</span>
                                          {c.condition}: <span style={{fontWeight:700,color:statusCol}}>{c.actualValue}</span>
                                          <span style={{color:"#555",marginLeft:4}}>{"(threshold "+c.threshold+")"}</span>
                                        </div>;
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {revStatus.primaryScore!==null&&(
                              <div style={{textAlign:"right",flexShrink:0,paddingLeft:16}}>
                                <div style={{fontSize:32,fontWeight:800,color:statusCol,lineHeight:1}}>{revStatus.primaryScore}</div>
                                <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{"/ 100"}</div>
                              </div>
                            )}
                          </div>
                          <div style={{marginTop:8}}>
                            <details>
                              <summary style={{fontSize:10,color:"#bbb",cursor:"pointer",outline:"none",listStyle:"none",display:"flex",alignItems:"center",gap:4}}>
                                <span style={{fontSize:9,color:"#ccc"}}>{"▶"}</span><span>{"How is this scored?"}</span>
                              </summary>
                              <div style={{fontSize:10,color:"#666",lineHeight:1.8,padding:"4px 0",whiteSpace:"pre-line"}}>{"The app checks reversal stages in this order:\n\n1. Confirmation (highest priority)\n   If Bullish Confirmation >= 80 and Bearish < 80 \u2192 Bullish Reversal Confirmed\n   If Bearish Confirmation >= 80 and Bullish < 80 \u2192 Bearish Reversal Confirmed\n   If both >= 80 \u2192 Mixed Reversal Signals\n\n2. Trigger\n   If Bullish Trigger >= 70 and Bearish < 70 \u2192 Bullish Reversal Triggered\n   If Bearish Trigger >= 70 and Bullish < 70 \u2192 Bearish Reversal Triggered\n\n3. Setup\n   If Bullish Setup >= 80 and Bearish < 80 \u2192 Bullish Reversal Setup\n   If Bearish Setup >= 80 and Bullish < 80 \u2192 Bearish Reversal Setup\n\n4. Score comparison (fallback)\n   Both scores < 21 \u2192 No Clear Reversal\n   Both >= 40 and within 15 points \u2192 Mixed Reversal Signals\n   One side leads by more than 15 points \u2192 that side's detail label\n\nConfirmation takes precedence because setup or trigger may have occurred\nearlier and may no longer be visible in today's conditions.\n\nPrimary score = the higher of Bullish or Bearish score."}</div>
                            </details>
                          </div>
                        </div>

                        {DirectionCard({bull:true, title:"Bullish Reversal Breakdown", subtitle:"Could a bullish reversal be forming?",
                          score:bullScore, setupScore:bsScore, trigScore:btScore, confScore:bcScore,
                          setupInds:bsInds, trigInds:btInds, confInds:bcInds})}

                        {DirectionCard({bull:false, title:"Bearish Reversal Breakdown", subtitle:"Could a bearish reversal be forming?",
                          score:bearScore, setupScore:dsScore, trigScore:dtScore, confScore:dcScore,
                          setupInds:dsInds, trigInds:dtInds, confInds:dcInds})}

                        <div style={{fontSize:10,color:"#aaa",lineHeight:1.6,padding:"10px 12px",background:"#faf8f4",borderRadius:8,border:"0.5px solid #e8e4dc"}}>
                          {"Reversal Watch is based on price and volume analysis only. It does not guarantee a reversal will occur. Not financial advice."}
                        </div>
                                              </div>
                    );
                  })()}

                  {/* VOLUME SPIKE TAB */}

                  {insightTab === "whale" && (function() {
                    var rawAggs = massiveInfo && massiveInfo.aggs ? massiveInfo.aggs : [];
                    // Whale/options data still loaded for secondary section
                    if (!whaleData && !whaleLoading) {
                      setWhaleLoading(true);
                      var _wSym = sym === "BRKB" ? "BRK-B" : sym;
                      fetch("/options?sym=" + _wSym)
                        .then(function(r){ return r.json(); })
                        .then(function(d){ setWhaleData(d); setWhaleLoading(false); })
                        .catch(function(){ setWhaleData({ error:true }); setWhaleLoading(false); });
                    }

                    // --- OHLCV Validation ---
                    // rawAggs is newest-first from Massive; each bar: { c, o, h, l, v, date }
                    // SMF functions from technicalSignals.js (single source of truth)
                    var validateOHLCV  = validateSmfOHLCV;
                    var getScoreLabel  = getSmfScoreLabel;

                    function scoreLabelColor(lbl) {
                      return lbl==="Very High"||lbl==="High" ? "#1a6a1a" : lbl==="Moderate" ? "#b88000" : "#c03030";
                    }

                    var calcVolPriceDivergence = calcSmfVolPriceDivergence;

                    // calcTodaySignal, calcFiveDaySignal, calcThirtyDaySignal from technicalSignals.js
                    var calcTodaySignal    = calcSmfTodaySignal;
                    var calcFiveDaySignal  = calcSmfFiveDaySignal;
                    var calcThirtyDaySignal= calcSmfThirtyDaySignal;

                    function isHigh(score) { return score >= 71; }
                    function isMild(score) { return score >= 31 && score < 71; }
                    function isLow(score)  { return score < 31; }

                    function getStatusExplanation(status) {
                      if (status==="Strong Multi-Timeframe Flow")  return "Today, short-term, and 30-day signals are all positive, suggesting broad price-volume support.";
                      if (status==="Accumulation Trend Positive")  return "The 5-day and 30-day signals remain positive, although today's activity is quieter.";
                      if (status==="Constructive but Cooling")     return "30-day accumulation trend is strong, but today and short-term flow are mild.";
                      if (status==="Early Accumulation")           return "Today and short-term flow are positive, but the 30-day trend has not yet confirmed sustained accumulation.";
                      if (status==="Short-Term Spike")             return "Today's activity is unusual, but there is limited evidence of sustained accumulation.";
                      return "No clear smart money flow signal is detected from recent price and volume behaviour.";
                    }

                    function getOverallSmartMoneyInterpretation(ticker, tScore, fScore, dScore) {
                      var tH=isHigh(tScore), fH=isHigh(fScore), dH=isHigh(dScore);
                      if (tH && fH && dH)   return ticker+" shows strong multi-timeframe accumulation signals. Today's activity is elevated, short-term flow is positive, and the 30-day trend supports sustained accumulation.";
                      if (!tH && fH && dH)  return ticker+" accumulation trend remains constructive, although today's activity is quieter. The 5-day and 30-day signals suggest buying pressure may still be building.";
                      if (dH && !tH && !fH) return ticker+" shows a strong 30-day accumulation trend, but today and the past 5 days are only mild. This may suggest accumulation built earlier in the month, while current buying pressure is cooling or consolidating.";
                      if (tH && fH && !dH)  return ticker+" shows early accumulation may be forming. Today and the 5-day signal are positive, but the 30-day trend has not yet confirmed sustained accumulation.";
                      if (tH && !fH && !dH) return ticker+" shows a short-term activity spike today. There is limited evidence of sustained accumulation over the 5-day or 30-day period.";
                      return ticker+" shows no clear smart money accumulation signal from recent price and volume behaviour.";
                    }

                    // getSmartMoneySummaryCard from technicalSignals.js (single source of truth)
                    // Note: adds explanation field via local getStatusExplanation for UI display
                    function getSmartMoneySummaryCard(tScore, fScore, dScore, tSig, fSig, dSig) {
                      var card = calcSmfSummaryCard(tScore||0, fScore||0, dScore||0, tSig, fSig, dSig);
                      card.explanation = getStatusExplanation(card.status);
                      return card;
                    }

                    // --- Data prep ---
                    var validation = validateOHLCV(rawAggs);
                    var bars = validation.validBars ? validation.validBars.slice().reverse() : [];
                    var todaySig     = validation.canCalculateTodaySignal ? calcTodaySignal(bars) : null;
                    var fiveDaySig   = bars.length >= 6 ? calcFiveDaySignal(bars) : null;
                    var thirtyDaySig = validation.hasThirtyDays ? calcThirtyDaySignal(bars) : null;
                    var tScore = todaySig   ? todaySig.score   : 0;
                    var fScore = fiveDaySig ? fiveDaySig.score : 0;
                    var dScore = thirtyDaySig ? thirtyDaySig.score : 0;
                    var smCard = getSmartMoneySummaryCard(tScore, fScore, dScore, todaySig, fiveDaySig, thirtyDaySig);
                    var interp = (todaySig||fiveDaySig||thirtyDaySig) ? getOverallSmartMoneyInterpretation(sym, tScore, fScore, dScore) : null;
                    // Store full card data for left panel
                    if (smCard.primaryScore !== null) {
                      if (!window.__smfScore) window.__smfScore = {};
                      window.__smfScore[sym] = smCard; // store full card, not just score
                    }

                    // Options secondary data
                    var putCallOI  = whaleData && whaleData.putCallOI  ? parseFloat(whaleData.putCallOI)  : null;
                    var putCallVol = whaleData && whaleData.putCallVol ? parseFloat(whaleData.putCallVol) : null;
                    var callOIw  = whaleData ? (whaleData.callOI  || 0) : 0;
                    var putOIw   = whaleData ? (whaleData.putOI   || 0) : 0;
                    var callVolw = whaleData ? (whaleData.callVol || 0) : 0;
                    var putVolw  = whaleData ? (whaleData.putVol  || 0) : 0;
                    var topOIw   = whaleData && whaleData.topOI ? whaleData.topOI : [];
                    var insiderBuys = ov && ov.insiderTx ? ov.insiderTx.filter(function(t){
                      var a=(t.action||"").toLowerCase(); return a.indexOf("purchase")!==-1||a.indexOf("buy")!==-1||a.indexOf("acquisition")!==-1;
                    }) : [];
                    function fmtKw(n){ if(!n) return "-"; if(n>=1e6) return (n/1e6).toFixed(1)+"M"; if(n>=1e3) return (n/1e3).toFixed(0)+"K"; return String(n); }

                    function SignalCard(props) {
                      var sig = props.sig, title = props.title, subtitle = props.subtitle;
                      if (!sig) return (
                        <div style={{ border:"0.5px solid #e8e4dc", borderRadius:10, padding:"16px 18px", marginBottom:16, background:"#faf8f4" }}>
                          <div style={{ fontSize:11, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{title}</div>
                          <div style={{ fontSize:11, color:"#aaa" }}>{props.unavailMsg || "Not enough data to calculate this signal."}</div>
                        </div>
                      );
                      var lbl = sig.label, col = scoreLabelColor(lbl);
                      var bgMap = { "Very High":"#e6f4e6", "High":"#e6f4e6", "Moderate":"#fdf8e6", "Mild":"#fff4ee", "Low":"#fff0f0" };
                      var bdMap = { "Very High":"#7abd00", "High":"#7abd00", "Moderate":"#d4a800", "Mild":"#e08050", "Low":"#e08080" };
                      return (
                        <div style={{ border:"0.5px solid "+bdMap[lbl], borderRadius:10, marginBottom:16, overflow:"hidden" }}>
                          <div style={{ background:bgMap[lbl], padding:"14px 16px", borderBottom:"0.5px solid "+bdMap[lbl] }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{title}</div>
                            <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>{subtitle}</div>
                            <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
                              <span style={{ fontSize:22, fontWeight:800, color:col }}>{sig.score}</span>
                              <span style={{ fontSize:13, color:"#aaa" }}>/ 100</span>
                              <span style={{ fontSize:13, fontWeight:700, color:col, marginLeft:4 }}>{lbl}</span>
                            </div>
                          </div>
                          <div>
                            {sig.breakdown.map(function(b, i) {
                              var bCol = b.score>=71?"#1a6a1a":b.score>=51?"#b88000":"#c03030";
                              var _sc = b.scoring || null; // scoring text comes from breakdown item
                              return (
                                <div key={i} style={{ borderBottom: i<sig.breakdown.length-1?"0.5px solid #f0ede6":"none" }}>
                                  <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:12, fontWeight:700, color:"#333", marginBottom:2 }}>{b.name}
                                        <span style={{ fontSize:9, color:"#bbb", fontWeight:400, marginLeft:6 }}>{"(wt:"+b.weight+"%)"}</span>
                                      </div>
                                      <div style={{ fontSize:11, color:"#888", lineHeight:1.5 }}>{b.explanation}</div>
                                    </div>
                                    <div style={{ textAlign:"right", flexShrink:0 }}>
                                      <span style={{ fontSize:13, fontWeight:700, color:bCol }}>{b.score}</span>
                                      <span style={{ fontSize:10, color:"#bbb" }}>{"/100"}</span>
                                    </div>
                                  </div>
                                  {_sc && (
                                    <div style={{ padding:"0 14px 8px 14px" }}>
                                      <details>
                                        <summary style={{fontSize:10,color:"#bbb",cursor:"pointer",userSelect:"none",outline:"none",listStyle:"none",display:"flex",alignItems:"center",gap:4}}>
                                          <span style={{fontSize:9,color:"#ccc"}}>{"\u25b6"}</span>
                                          <span>How is this scored?</span>
                                        </summary>
                                        <div style={{padding:"6px 8px",background:"#f9f7f4",borderRadius:4,marginTop:3,fontSize:10,color:"#666",lineHeight:1.8,whiteSpace:"pre-line"}}>{_sc}</div>
                                      </details>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Consistent SMF label color used in both card and left panel
                    // Summary card color mapping
                    var _sCol = smfStatusColor(smCard.status, "main");
                    var _sBg  = smfStatusColor(smCard.status, "bg");
                    var _sBd  = smfStatusColor(smCard.status, "bd");

                    return (
                      <div>
                        {/* Summary Card */}
                        {smCard.primaryScore !== null && (
                          <div style={{ border:"0.5px solid "+_sBd, borderRadius:10, marginBottom:16, background:smfStatusColor(smCard.status,"darkbg"), padding:"14px 16px" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:10, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Smart Money Flow</div>
                                <div style={{ fontSize:14, fontWeight:700, color:_sCol, marginBottom:4 }}>{smCard.status}</div>
                                <div style={{ fontSize:11, color:"#666", lineHeight:1.5, marginBottom:8 }}>
                                  {smCard.smartMoneyDecision ? smCard.smartMoneyDecision.reason : smCard.explanation}
                                </div>
                                {smCard.smartMoneyDecision && smCard.smartMoneyDecision.ruleId && (
                                  <div style={{ fontSize:10, color:"#666", background:"rgba(0,0,0,0.15)", borderRadius:5, padding:"6px 10px", marginBottom:8 }}>
                                    <div style={{ fontWeight:700, color:"#aaa", marginBottom:3 }}>{"Why this outcome?"}</div>
                                    <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:3 }}>
                                      <span style={{ fontSize:9, color:"#999" }}>Rule: <span style={{ fontWeight:700, color:_sCol }}>{smCard.smartMoneyDecision.ruleId}</span></span>
                                      <span style={{ fontSize:9, color:"#999" }}>Daily: <span style={{ fontWeight:600, color:"#ccc" }}>{smCard.smartMoneyDecision.dailyPrefix}</span></span>
                                      <span style={{ fontSize:9, color:"#999" }}>Base: <span style={{ fontWeight:600, color:"#ccc" }}>{smCard.smartMoneyDecision.baseStatus}</span></span>
                                    </div>
                                    {smCard.smartMoneyDecision.triggeredConditions && smCard.smartMoneyDecision.triggeredConditions.map(function(c,i){
                                      if(!c) return null;
                                      return <div key={i} style={{ fontSize:9, color:"#aaa", marginTop:2 }}>
                                        <span style={{ color:"#7abd00", fontWeight:700, marginRight:4 }}>{"\u2713"}</span>
                                        {c.condition}: <span style={{ fontWeight:700, color:_sCol }}>{c.actualValue}</span>
                                        {c.band && <span style={{ color:"#555", marginLeft:4 }}>{" \u2192 "+c.band}</span>}
                                      </div>;
                                    })}
                                  </div>
                                )}
                                <div>
                                  <details>
                                    <summary style={{ fontSize:10, color:"#bbb", cursor:"pointer", outline:"none", listStyle:"none", display:"flex", alignItems:"center", gap:4 }}>
                                      <span style={{ fontSize:9, color:"#ccc" }}>{"▶"}</span><span>{"How is this scored?"}</span>
                                    </summary>
                                    <div style={{ fontSize:10, color:"#666", lineHeight:1.8, padding:"6px 0", whiteSpace:"pre-line" }}>{"Smart Money Flow status = Daily Activity Prefix + Base Flow Status\n\nBase status from 5-Day \xd7 30-Day:\n  High \xd7 High \u2192 Strong Accumulation\n  Moderate \xd7 High \u2192 Steady Accumulation\n  Weak \xd7 High \u2192 Long-Term Accumulation\n  High \xd7 Moderate \u2192 Early Accumulation\n  Moderate \xd7 Moderate \u2192 Mixed Flow\n  Weak \xd7 Moderate \u2192 Cooling Accumulation\n  High \xd7 Weak \u2192 Short-Term Flow Spike\n  Moderate \xd7 Weak \u2192 Short-Term Flow Watch\n  Weak \xd7 Weak \u2192 No Sustained Flow\n\nScore bands: High \u2265 71 | Moderate 51\u201370 | Weak < 51\nDaily prefix: \u2265 71 \u2192 Daily Spike | 51\u201370 \u2192 Daily Support | < 51 \u2192 Quiet Day\n\nScore components:\n  Today Activity: OBV direction 20% + Volume Surge 30% + Vol/Price 35% + Strong Close 15%\n  5-Day Flow: OBV net 35% + Volume avg 25% + Vol/Price 25% + Strong Close 15%\n  30-Day Accumulation: OBV trend 40% + HV green days 25% + Price stability 20% + Close freq 15%"}</div>
                                  </details>
                                </div>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, paddingLeft:24, paddingTop:2 }}>
                                <span style={{ fontSize:12, color:"#888" }}>{"Today:"}</span>
                                <span style={{ fontSize:12, fontWeight:700, color:smfLabelColor(smCard.todayLabel,"main") }}>{smCard.todayLabel}</span>
                                <span style={{ color:"#ccc", fontSize:10 }}>{"·"}</span>
                                <span style={{ fontSize:12, color:"#888" }}>{"5D:"}</span>
                                <span style={{ fontSize:12, fontWeight:700, color:smfLabelColor(smCard.fiveDayLabel,"main") }}>{smCard.fiveDayLabel}</span>
                                <span style={{ color:"#ccc", fontSize:10 }}>{"·"}</span>
                                <span style={{ fontSize:12, color:"#888" }}>{"30D:"}</span>
                                <span style={{ fontSize:12, fontWeight:700, color:smfLabelColor(smCard.thirtyDayLabel,"main") }}>{smCard.thirtyDayLabel}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {SignalCard({ sig:todaySig, title:"Today Activity", subtitle:"Is something unusual happening today?", unavailMsg: validation.errors.join(" ") })}
                        {SignalCard({ sig:fiveDaySig, title:"5-Day Flow", subtitle:"Is short-term accumulation starting?", unavailMsg:"Not enough data for 5-Day Flow. At least 6 trading days required." })}
                        {SignalCard({ sig:thirtyDaySig, title:"30-Day Accumulation Trend", subtitle:"Has accumulation been building over time?", unavailMsg:"Not enough data for 30-Day Accumulation Trend. At least 30 trading days of OHLCV data is required." })}

                        {interp && (
                          <div style={{ padding:"12px 14px", background:"#f5f2ec", borderRadius:10, marginBottom:16, border:"0.5px solid #e0dbd0" }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Interpretation</div>
                            <div style={{ fontSize:12, color:"#444", lineHeight:1.7 }}>{interp}</div>
                          </div>
                        )}

                        {!whaleLoading && (putCallOI!==null||topOIw.length>0) && (
                          <div style={{ marginBottom:12 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Options Context</div>
                            <div style={{ border:"0.5px solid #e8e4dc", borderRadius:10, overflow:"hidden", marginBottom:12 }}>
                              {[
                                ["Options OI Skew", putCallOI!==null?"P/C OI: "+putCallOI.toFixed(2)+"  |  Calls: "+fmtKw(callOIw)+"  Puts: "+fmtKw(putOIw):"Unavailable", putCallOI!==null&&putCallOI<0.7],
                                ["Options Volume Skew", putCallVol!==null?"P/C Vol: "+putCallVol.toFixed(2)+"  |  Call Vol: "+fmtKw(callVolw)+"  Put Vol: "+fmtKw(putVolw):"Unavailable", putCallVol!==null&&putCallVol<0.7],
                              ].map(function(row,i){
                                var bullish=row[2]; var col=bullish?"#1a6a1a":"#888";
                                return <div key={i} style={{ padding:"10px 14px", borderBottom:i===0?"0.5px solid #f0ede6":"none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                  <div>
                                    <div style={{ fontSize:12, fontWeight:700, color:"#333" }}>{row[0]}</div>
                                    <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{row[1]}</div>
                                  </div>
                                  <span style={{ fontSize:14, color:col, fontWeight:700 }}>{bullish?"▲":"—"}</span>
                                </div>;
                              })}
                            </div>
                            {topOIw.length > 0 && (
                              <div style={{ border:"0.5px solid #e8e4dc", borderRadius:10, overflow:"hidden", marginBottom:12 }}>
                                <div style={{ padding:"8px 14px", background:"#faf8f4", borderBottom:"1px solid #e8e4dc" }}>
                                  <span style={{ fontSize:10, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.08em" }}>Top Contracts by Open Interest</span>
                                </div>
                                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                                  <thead><tr style={{ background:"#faf8f4", borderBottom:"1px solid #e8e4dc" }}>
                                    {["Type","Strike","Expiry","OI","IV","Last"].map(function(h){ return <td key={h} style={{ padding:"6px 10px", color:"#999", fontWeight:700, textTransform:"uppercase", fontSize:9 }}>{h}</td>; })}
                                  </tr></thead>
                                  <tbody>
                                    {topOIw.map(function(c,i){ var isCall=c.type==="call"; return (
                                      <tr key={i} style={{ borderBottom:"0.5px solid #f5f2ec", background:i%2===0?"#fff":"#faf8f4" }}>
                                        <td style={{ padding:"5px 7px", fontWeight:700, color:isCall?"#1a6a1a":"#c03030" }}>{(c.type||"").toUpperCase()}</td>
                                        <td style={{ padding:"5px 7px", fontWeight:600 }}>{"$"+(c.strike||"-")}</td>
                                        <td style={{ padding:"5px 7px", color:"#888" }}>{c.expiry||"-"}</td>
                                        <td style={{ padding:"5px 7px", fontWeight:700 }}>{fmtKw(c.oi)}</td>
                                        <td style={{ padding:"5px 7px", color:"#666" }}>{c.iv||"-"}</td>
                                        <td style={{ padding:"5px 7px", color:"#666" }}>{c.last!=null?"$"+parseFloat(c.last).toFixed(2):"-"}</td>
                                      </tr>
                                    ); })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {ov && (ov.institutionPct>0||ov.insiderPct>0) && (
                          <div style={{ marginBottom:16 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Institutional Footprint</div>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                              {[["Institution %",ov.institutionPct>0?(ov.institutionPct*100).toFixed(1)+"%":"-"],["Insider %",ov.insiderPct>0?(ov.insiderPct*100).toFixed(1)+"%":"-"],["Short % Float",ov.shortPct>0?(ov.shortPct*100).toFixed(1)+"%":"-"]].map(function(row,i){
                                return <div key={i} style={{ background:"#f9f7f4", borderRadius:8, padding:"10px 12px", border:"0.5px solid #e8e4dc" }}>
                                  <div style={{ fontSize:9, color:"#aaa", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{row[0]}</div>
                                  <div style={{ fontSize:15, fontWeight:800, color:"#111" }}>{row[1]}</div>
                                </div>;
                              })}
                            </div>
                          </div>
                        )}

                        <div style={{ fontSize:10, color:"#aaa", lineHeight:1.6, padding:"10px 12px", background:"#faf8f4", borderRadius:8, border:"0.5px solid #e8e4dc" }}>
                          {"This signal is based on price and volume behaviour only. It does not confirm actual institutional or whale purchases. Not financial advice."}
                        </div>
                      </div>
                    );
                  })()}

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
                      if (key==="rsi")    { if(r==null) return 3; return r>=65?5:r>=55?4:r>=45?3:r>=35?2:1; }
                      if (key==="macd")   { if(h==null) return 3; if(h>0&&macdDir==="Rising") return 5; if(h>0&&macdDir!=="Falling") return 4; if(h>0) return 3; if(h<=0&&macdDir==="Rising") return 3; if(h>-0.5) return 2; return 1; }
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
                        <div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Trend {"&"} Price Action <span style={{fontWeight:400,color:"#bbb"}}>55%</span></div>
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
                            <div style={{fontSize:10,fontWeight:700,color:"#854F0B",textTransform:"uppercase",letterSpacing:"0.07em"}}>Reversal Signals</div>
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
                              {base2>=50&&<span style={{fontSize:10,color:"#aaa"}}>(bonus only when base {"<"} 50)</span>}
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
                    var cacheStatus = window.__cacheStatus || {};
                    var aiCallCount = window.__aiCallCount || 0;
                    var aiTabs = ["moat", "financial", "aiinsight"];
                    var symStatus = aiTabs.map(function(t) {
                      return { tab: t, status: cacheStatus[sym + ":" + t] || "not-loaded" };
                    });
                    var totalHits    = Object.values(cacheStatus).filter(function(v){ return v === "hit"; }).length;
                    var totalMisses  = Object.values(cacheStatus).filter(function(v){ return v === "miss" || v === "written"; }).length;
                    var totalErrors  = Object.values(cacheStatus).filter(function(v){ return v === "kv-error" || v === "kv-error-fallback"; }).length;
                    var totalLive    = Object.values(cacheStatus).filter(function(v){ return v === "live"; }).length;
                    function statusPill(s) {
                      var map = {
                        "hit":              { bg:"#e6f4e6", color:"#1a6a1a", label:"CACHE HIT" },
                        "miss":             { bg:"#fdf8e6", color:"#b88000", label:"CACHE MISS" },
                        "written":          { bg:"#e6f0ff", color:"#2255cc", label:"WRITTEN TO KV" },
                        "live":             { bg:"#f0f0f0", color:"#555",    label:"LIVE MODE" },
                        "kv-error":         { bg:"#fff0f0", color:"#c03030", label:"KV ERROR" },
                        "kv-error-fallback":{ bg:"#fff0f0", color:"#c03030", label:"KV ERROR + FALLBACK" },
                        "not-loaded":       { bg:"#f5f5f5", color:"#aaa",    label:"NOT LOADED" },
                      };
                      var m = map[s] || { bg:"#f5f5f5", color:"#aaa", label:s };
                      return <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10, background:m.bg, color:m.color }}>{m.label}</span>;
                    }
                    return (
                      <div style={{ fontSize:12 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#111", marginBottom:12 }}>Debug Panel -- {sym}</div>

                        {/* Cache Monitor */}
                        <div style={{ background:"#f5f2ec", border:"1px solid #e0dbd0", borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
                          <div style={{ fontWeight:700, color:"#333", fontSize:12, marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <span>Cache Monitor</span>
                            <div style={{ display:"flex", gap:8 }}>
                              <span style={{ fontSize:10, background: totalErrors>0?"#fff0f0":"#e6f4e6", color:totalErrors>0?"#c03030":"#1a6a1a", padding:"2px 8px", borderRadius:10, fontWeight:700 }}>
                                {totalErrors > 0 ? (totalErrors + " KV ERROR" + (totalErrors>1?"S":"")) : "No KV Errors"}
                              </span>
                              <span style={{ fontSize:10, background:"#f0f0f0", color:"#555", padding:"2px 8px", borderRadius:10, fontWeight:700 }}>
                                {aiCallCount + " AI call" + (aiCallCount!==1?"s":"") + " this session"}
                              </span>
                            </div>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:10 }}>
                            <div style={{ textAlign:"center", background:"#fff", borderRadius:8, padding:"8px" }}>
                              <div style={{ fontSize:18, fontWeight:700, color:"#1a6a1a" }}>{totalHits}</div>
                              <div style={{ fontSize:10, color:"#888" }}>Cache Hits</div>
                            </div>
                            <div style={{ textAlign:"center", background:"#fff", borderRadius:8, padding:"8px" }}>
                              <div style={{ fontSize:18, fontWeight:700, color:"#b88000" }}>{totalMisses}</div>
                              <div style={{ fontSize:10, color:"#888" }}>Cache Misses</div>
                            </div>
                            <div style={{ textAlign:"center", background:"#fff", borderRadius:8, padding:"8px" }}>
                              <div style={{ fontSize:18, fontWeight:700, color: totalErrors>0?"#c03030":"#aaa" }}>{totalErrors}</div>
                              <div style={{ fontSize:10, color:"#888" }}>KV Errors</div>
                            </div>
                          </div>
                          <div style={{ fontSize:11, color:"#666", marginBottom:6, fontWeight:600 }}>This ticker ({sym}):</div>
                          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                            {symStatus.map(function(s) {
                              return (
                                <div key={s.tab} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 10px", background:"#fff", borderRadius:6 }}>
                                  <span style={{ color:"#555", textTransform:"uppercase", fontSize:10, letterSpacing:"0.05em" }}>{s.tab}</span>
                                  {statusPill(s.status)}
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ marginTop:10, fontSize:10, color:"#aaa", lineHeight:1.5 }}>
                            {"TTL: Moat=90d | Financial=30d | AI Insight=7d | Technical=1d"}
                          </div>
                        </div>

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
                                    <a href={"https://nervousgeek.com/massive?sym=" + sym} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:"#0044cc" }}>
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

            {insightTab === "admin" && (function() {
              // Build ticker list from ALL cached keys + S&P 500
              var _cachedSyms = {};
              Object.keys(adminStats).forEach(function(k) {
                var parts = k.split(":");
                if (parts.length === 3 && parts[0] === "insight" && parts[1]) {
                  _cachedSyms[parts[1]] = true;
                }
              });
              var ALL_SP500 = Object.keys(Object.assign({}, NAMES, _cachedSyms)).sort();
              var AI_TABS = ["moat","ai-fund","ai-tech"];
              var adminQ = (window.__adminSearch || "").toLowerCase();

              // Manual clear for any ticker (including non-S&P500)
              var _manualClearTicker = window.__adminManualClear || "";
              var FILTERED = ALL_SP500.filter(function(t) {
                if (!adminQ) return true;
                return t.toLowerCase().startsWith(adminQ) || (NAMES[t]||"").toLowerCase().includes(adminQ);
              });

              var liveSet  = adminCfg  || [];
              var statsMap = adminStats || {};

              function fmtAge(iso) {
                if (!iso) return null;
                var diff = Date.now() - new Date(iso).getTime();
                var mins = Math.floor(diff / 60000);
                var hrs  = Math.floor(mins / 60);
                var days = Math.floor(hrs / 24);
                if (days > 0) return days + "d ago";
                if (hrs > 0)  return hrs + "h ago";
                if (mins > 0) return mins + "m ago";
                return "just now";
              }
              function fmtDate(iso) {
                if (!iso) return null;
                var d = new Date(iso);
                return d.toLocaleDateString("en-AU", { day:"2-digit", month:"short", year:"numeric" }) + " " + d.toLocaleTimeString("en-AU", { hour:"2-digit", minute:"2-digit" });
              }

              return (
                <div style={{ padding:"20px 24px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1a1a14" }}>Cache Manager</div>
                      <div style={{ fontSize:11, color:"#888", marginTop:3 }}>All S&P 500 tickers use cache-first by default. Toggle LIVE to force fresh Claude calls.</div>
                    </div>
                    <button
                      onClick={function() {
                        window.__adminCfgLoaded = false;
                        setAdminCfg(null);
                        setAdminStats({});
                      }}
                      style={{ fontSize:11, color:"#1a1a14", background:"none", border:"1px solid #ccc", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontFamily:FONT }}>
                      {String.fromCharCode(0x21BA) + " Refresh"}
                    </button>
                  </div>
                  {/* Manual clear for any ticker */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, padding:"10px 12px", background:"#faf8f4", borderRadius:8, border:"0.5px solid #e0dbd0" }}>
                    <span style={{ fontSize:11, color:"#888", whiteSpace:"nowrap" }}>Clear any ticker:</span>
                    <input
                      placeholder="e.g. NIO, BABA, COIN..."
                      defaultValue=""
                      onChange={function(e){ window.__adminManualClear = e.target.value.toUpperCase().trim(); }}
                      style={{ flex:1, background:"#fff", border:"1px solid #e0dbd0", borderRadius:6, padding:"5px 10px", fontSize:12, color:"#1a1a14", fontFamily:FONT, outline:"none" }}
                    />
                    <button onClick={function(){
                      var t = (window.__adminManualClear||"").trim().toUpperCase();
                      if (!t) return;
                      if (!window.confirm("Clear all cache for "+t+"?")) return;
                      fetch("/cache?sym="+t+"&tab=moat",{method:"DELETE"}).then(function(){
                        fetch("/cache?sym="+t+"&tab=ai-fund",{method:"DELETE"});
                        fetch("/cache?sym="+t+"&tab=ai-tech",{method:"DELETE"});
                        if (t === sym) {
                          setAiFundResult(null); setAiFundLoading(false);
                          setAiTechResult(null); setAiTechLoading(false);
                          window.__aiFundRunning=null; window.__aiTechRunning=null;
                        }
                        alert("Cache cleared for "+t);
                      });
                    }}
                    style={{ fontSize:11, color:"#fff", background:"#e05050", border:"none", borderRadius:6, padding:"5px 14px", cursor:"pointer", fontFamily:FONT, whiteSpace:"nowrap" }}>
                      Clear Cache
                    </button>
                  </div>

                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", background:"#ffffff", border:"1px solid #e0dbd0", borderRadius:8, padding:"6px 12px", gap:8, flex:1 }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                        <circle cx="6.5" cy="6.5" r="5" stroke="#555" strokeWidth="1.5"/>
                        <path d="M10.5 10.5L14 14" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <input
                        placeholder="Filter by ticker or company..."
                        defaultValue=""
                        onChange={function(e) { window.__adminSearch = e.target.value; setAdminStats(function(p){ return Object.assign({},p); }); }}
                        style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:12, color:"#1a1a14", fontFamily:FONT }}
                      />
                    </div>
                    <span style={{ fontSize:11, color:"#555", whiteSpace:"nowrap" }}>{FILTERED.length + " / " + ALL_SP500.length}</span>
                  </div>
                  <div style={{ overflowX:"auto", border:"0.5px solid #e0dbd0", borderRadius:8, background:"#fff" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead>
                        <tr style={{ background:"#f5f2ec" }}>
                          {["ticker","company","cache","lastCached","mode"].map(function(col) {
                            var labels = { ticker:"Ticker", company:"Company", cache:"Cache", lastCached:"Last Cached", mode:"Mode" };
                            var active = (window.__adminSort||"ticker") === col;
                            var dir = window.__adminSortDir || 1;
                            return (
                              <th key={col}
                                onClick={function() {
                                  if (window.__adminSort === col) { window.__adminSortDir = (window.__adminSortDir||1) * -1; }
                                  else { window.__adminSort = col; window.__adminSortDir = 1; }
                                  setAdminStats(function(p){ return Object.assign({},p); });
                                }}
                                style={{ padding:"10px 14px", fontSize:11, fontWeight:500, color: active ? "#1a6a1a" : "#888", textAlign:"left", cursor:"pointer", whiteSpace:"nowrap", borderBottom:"0.5px solid #e0dbd0", userSelect:"none" }}>
                                {labels[col]}{active ? (dir===1 ? " " + String.fromCharCode(0x25B2) : " " + String.fromCharCode(0x25BC)) : ""}
                              </th>
                            );
                          })}
                          <th style={{ padding:"10px 14px", fontSize:11, fontWeight:500, color:"#888", textAlign:"center", borderBottom:"0.5px solid #e0dbd0" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(function() {
                          var sortKey = window.__adminSort || "ticker";
                          var sortDir = window.__adminSortDir || 1;
                          var SORTED = FILTERED.slice().sort(function(a, b) {
                            var getVal = function(t) {
                              var _coreTabs = ["moat","financial","aiinsight"];
                              var ct = _coreTabs.filter(function(tab) { var m = statsMap["insight:"+t+":"+tab]; return !!(m&&(m.exists||m.cachedAt)); });
                              var ld = null;
                              AI_TABS.forEach(function(tab) { var m = statsMap["insight:"+t+":"+tab]; if (m&&m.cachedAt) { if (!ld||new Date(m.cachedAt)>new Date(ld)) ld=m.cachedAt; } });
                              if (sortKey==="ticker")     return t;
                              if (sortKey==="company")    return (NAMES[t]||"").toLowerCase();
                              if (sortKey==="cache")      return ct.length===_coreTabs.length ? 0 : ct.length>0 ? 1 : 2;
                              if (sortKey==="lastCached") return ld ? new Date(ld).getTime() : 0;
                              if (sortKey==="mode")       return liveSet.indexOf(t)!==-1 ? 0 : 1;
                              return t;
                            };
                            var va = getVal(a); var vb = getVal(b);
                            return va < vb ? -sortDir : va > vb ? sortDir : 0;
                          });
                          return SORTED.map(function(t) {
                            var isLive = liveSet.indexOf(t) !== -1;
                            var _coreTabs2 = ["moat","financial","aiinsight"];
                            var cachedTabs = _coreTabs2.filter(function(tab) { var m = statsMap["insight:"+t+":"+tab]; return !!(m&&(m.exists||m.cachedAt)); });
                            var latestDate = null;
                            AI_TABS.forEach(function(tab) { var m = statsMap["insight:"+t+":"+tab]; if (m&&m.cachedAt) { if (!latestDate||new Date(m.cachedAt)>new Date(latestDate)) latestDate=m.cachedAt; } });
                            var statusLabel = cachedTabs.length===_coreTabs2.length ? "Full" : cachedTabs.length>0 ? "Partial" : "None";
                            var statusColor = cachedTabs.length===AI_TABS.length ? "#7abd00" : cachedTabs.length>0 ? "#EF9F27" : "#e05050";
                            var statusBg    = cachedTabs.length===AI_TABS.length ? "#1e2a1e" : cachedTabs.length>0 ? "#2a2010" : "#2a1e1e";
                            var age = "";
                            if (latestDate) {
                              var diff = Date.now() - new Date(latestDate).getTime();
                              var mins = Math.floor(diff/60000); var hrs = Math.floor(mins/60); var days = Math.floor(hrs/24);
                              age = days>0 ? days+"d ago" : hrs>0 ? hrs+"h ago" : mins>0 ? mins+"m ago" : "just now";
                            }
                            var rowIdx = SORTED.indexOf(t);
                            var rowBg = rowIdx % 2 === 0 ? "#ffffff" : "#f9f7f4";
                            return (
                              <tr key={t} style={{ borderBottom:"0.5px solid #e8e4dc", background:rowBg }}
                                onMouseEnter={function(e){ e.currentTarget.style.background="#f0ede6"; }}
                                onMouseLeave={function(e){ e.currentTarget.style.background=rowBg; }}>
                                <td style={{ padding:"10px 14px", fontWeight:700, color:"#1a1a14", whiteSpace:"nowrap" }}>{t}</td>
                                <td style={{ padding:"10px 14px", color:"#666", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{(NAMES[t]||t)}</td>
                                <td style={{ padding:"10px 14px", color: cachedTabs.length===AI_TABS.length ? "#1a6a1a" : cachedTabs.length>0 ? "#EF9F27" : "#e05050", fontSize:11, whiteSpace:"nowrap" }}>
                                  {String.fromCharCode(0x25CF) + " " + statusLabel}
                                </td>
                                <td style={{ padding:"10px 14px", color: latestDate ? (cachedTabs.length===AI_TABS.length ? "#1a6a1a" : cachedTabs.length>0 ? "#EF9F27" : "#e05050") : "#bbb", fontSize:11, whiteSpace:"nowrap" }}>{age || String.fromCharCode(0x2014)}</td>
                                <td style={{ padding:"10px 14px" }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <div onClick={function() {
                                        var nowLive = liveSet.indexOf(t) !== -1;
                                        var newCfg = nowLive ? liveSet.filter(function(x){ return x!==t; }) : liveSet.concat([t]);
                                        window.__adminCfg = newCfg;
                                        fetch("/cache?action=config", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(newCfg) })
                                          .then(function(r){ return r.json(); })
                                          .then(function(d){ if (d.ok) { setAdminCfg(newCfg); } });
                                      }}
                                      style={{ width:34, height:18, borderRadius:9, background: isLive?"#1a6a1a":"#e0dbd0", position:"relative", cursor:"pointer", border:"none", flexShrink:0 }}>
                                      <div style={{ position:"absolute", top:2, left: isLive?15:2, width:14, height:14, borderRadius:"50%", background: isLive?"#ffffff":"#f0ede6" }}></div>
                                    </div>
                                    <span style={{ fontSize:11, color: isLive?"#1a1a14":"#1a6a1a", fontWeight: isLive?600:500 }}>{isLive?"Live":"Cached"}</span>
                                  </div>
                                </td>
                                <td style={{ padding:"6px 7px", textAlign:"center" }}>
                                  {!isLive && (
                                    <button onClick={function() {
                                        if (!window.confirm("Clear cache for "+t+"?")) return;
                                        fetch("/cache?sym="+t+"&tab=moat", { method:"DELETE" }).then(function() {
                                          setAdminStats(function(prev) {
                                            var next = Object.assign({}, prev);
                                            delete next["insight:"+t+":moat"];
                                            delete next["insight:"+t+":financial"];
                                            delete next["insight:"+t+":aiinsight"];
                                            delete next["insight:"+t+":ai-fund"];
                                            delete next["insight:"+t+":ai-tech"];
                                            return next;
                                          });
                                          // Also clear ai-fund and ai-tech separately
                                          fetch("/cache?sym="+t+"&tab=ai-fund", { method:"DELETE" });
                                          fetch("/cache?sym="+t+"&tab=ai-tech", { method:"DELETE" });
                                          // Reset local AI state if clearing current sym
                                          if (t === sym) {
                                            setAiFundResult(null);
                                            setAiFundLoading(false);
                                            setAiTechResult(null);
                                            setAiTechLoading(false);
                                            window.__aiFundRunning = null;
                                          }
                                        });
                                      }}
                                      style={{ fontSize:10, color:"#e05050", background:"rgba(224,80,80,0.1)", border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontFamily:FONT }}>
                                      Clear
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop:16, padding:"10px 14px", background:"#1a1a10", border:"1px solid #2c2c14", borderRadius:8, fontSize:11, color:"#7abd00", lineHeight:1.7 }}>
                    {"Live = Claude runs on every visit (" + String.fromCharCode(0x7E) + "$0.03/visit)." + String.fromCharCode(0xA0) + "Cached = stored result served free for 7 days."}
                  </div>
                </div>
              );
            })()}

                </div>
              </div>
            );
          })()}

        </div>
      </div>


      {/* Floating Trade Calculator */}
      {showCalc && <CalcPanel currentPrice={price} onClose={function(){setShowCalc(false);}} />}


      {/* Sticky disclaimer footer */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:100,
        background:"#111",
        borderTop:"1px solid #333",
      }}>
        {/* Expandable full disclaimer -- slides up above the bar */}
        <div id="disc-full"
          onClick={function(){ var d=document.getElementById("disc-full"); if(d) d.style.display="none"; var t=document.getElementById("disc-tap"); if(t) t.innerText="tap to read"; }}
          style={{
            display:clerkUser?"none":"block",
            maxHeight:"50vh",
            overflowY:"auto",
            padding:"14px 20px",
            borderBottom:"0.5px solid #333",
            background:"#111",
            cursor:"pointer",
          }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:600, color:"#F05A1A", textTransform:"uppercase", letterSpacing:"0.06em" }}>Disclaimer</span>
            <button
              onClick={function(){ var d=document.getElementById("disc-full"); if(d) d.style.display="none"; var t=document.getElementById("disc-tap"); if(t) t.innerText="tap to read"; }}
              style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#666", lineHeight:1, padding:"0 2px" }}>
              {String.fromCharCode(0xD7)}
            </button>
          </div>
          <div style={{ fontSize:11, color:"#aaa", lineHeight:1.8 }}>
            {"nervousgeek.com is a private, community-focused platform created to share educational content about investing and financial markets. Any fees collected are used to support the operating costs of the platform and the time and effort required to maintain and improve the service. All analysis, ratings, tools, and AI-generated insights provided on this website are for general informational and educational purposes only. They do not constitute financial product advice, investment advice, or any form of professional advice. The content on this website does not take into account your individual financial situation, objectives, or needs. Before making any investment decision, you should conduct your own research and consider seeking advice from a licensed financial adviser. Past performance is not a reliable indicator of future results. Market data provided by third-party sources, including Yahoo Finance and Massive.com, may be delayed, incomplete, or inaccurate. While reasonable efforts are made to ensure information accuracy, nervousgeek.com makes no representation or warranty regarding the completeness, reliability, or accuracy of the information provided. Use of this website and reliance on any information contained within it is entirely at your own risk. Some insights and analysis on this platform may be generated with the assistance of artificial intelligence, including models developed by Anthropic (Claude). "}{String.fromCharCode(0xA9)}{" nervousgeek.com 2026. All rights reserved."}
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
    </div>
  );
}


// -- Upgrade page -------------------------------------------------------------
function UpgradePage({ onBack, clerkUser }) {
  function doUpgrade(plan) {
    var hdrs = window.__clerkToken ? { "Authorization": "Bearer " + window.__clerkToken } : {};
    fetch("/stripe?action=checkout&plan=" + plan, { headers: hdrs })
      .then(function(r){ return r.json(); })
      .then(function(d){ if (d.url) window.location.href = d.url; });
  }
  return (
    <div style={{ minHeight:"100vh", background:"#0e0e0c", fontFamily:FONT, display:"flex", flexDirection:"column" }}>
      <nav style={{ height:52, padding:"0 24px", display:"flex", alignItems:"center", gap:12, background:LIME }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#0e0e0c", fontWeight:800, fontSize:13, fontFamily:FONT, padding:0 }}>
          {"< Back"}
        </button>
        <span style={{ fontWeight:800, fontSize:15, color:"#0e0e0c" }}>nervousgeek.com</span>
      </nav>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
        <div style={{ maxWidth:520, width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:13, color:"#7abd00", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>nervousgeek Premium</div>
          <div style={{ fontSize:32, fontWeight:900, color:"#f0ede6", marginBottom:8, letterSpacing:"-1px" }}>Unlock every US stock & AI Feature</div>
          <div style={{ fontSize:15, color:"#a09a8a", lineHeight:1.7, marginBottom:36 }}>
            {"AI analysis for any ticker " + String.fromCharCode(0x2014) + " NYSE, NASDAQ, OTC and more. Cancel anytime."}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
            {/* Monthly */}
            <div style={{ background:"#1c1c1e", border:"1px solid #2c2c26", borderRadius:16, padding:"28px 20px", textAlign:"center" }}>
              <div style={{ fontSize:12, color:"#7abd00", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Monthly</div>
              <div style={{ fontSize:40, fontWeight:900, color:"#f0ede6", lineHeight:1 }}>$10</div>
              <div style={{ fontSize:12, color:"#555", marginBottom:24 }}>per month</div>
              <button onClick={function(){ doUpgrade("monthly"); }}
                style={{ width:"100%", padding:"13px", borderRadius:50, border:"1px solid #2c2c26", background:"transparent", color:"#f0ede6", fontWeight:700, fontSize:14, fontFamily:FONT, cursor:"pointer" }}>
                Start Monthly
              </button>
            </div>
            {/* Annual */}
            <div style={{ background:"#1e2a1e", border:"2px solid #7abd00", borderRadius:16, padding:"28px 20px", textAlign:"center", position:"relative" }}>
              <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:LIME, color:"#0e0e0c", fontSize:10, fontWeight:800, padding:"3px 14px", borderRadius:20, whiteSpace:"nowrap" }}>BEST VALUE</div>
              <div style={{ fontSize:12, color:"#7abd00", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Annual</div>
              <div style={{ fontSize:40, fontWeight:900, color:"#f0ede6", lineHeight:1 }}>$96</div>
              <div style={{ fontSize:12, color:"#555", marginBottom:4 }}>per year</div>
              <div style={{ fontSize:11, color:"#7abd00", marginBottom:20 }}>Save 20% {"(" + String.fromCharCode(0x7E) + "$8/mo)"}</div>
              <button onClick={function(){ doUpgrade("annual"); }}
                style={{ width:"100%", padding:"13px", borderRadius:50, border:"none", background:LIME, color:"#0e0e0c", fontWeight:800, fontSize:14, fontFamily:FONT, cursor:"pointer" }}>
                Start Annual
              </button>
            </div>
          </div>
          {/* Feature list */}
          <div style={{ background:"#1c1c1e", border:"1px solid #2c2c26", borderRadius:12, padding:"18px 20px", marginBottom:20, textAlign:"left" }}>
            {["All 496 S&P 500 companies", "All US stocks (NYSE, NASDAQ, OTC)", "AI Moat, Financial + Insight analysis", "Intrinsic Value with 4 DCF models", "Market Signal + Reversal Indicator", "TradingView charts + news"].map(function(f, i) {
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom: i < 5 ? "1px solid #252525" : "none" }}>
                  <span style={{ color:"#7abd00", fontSize:14, flexShrink:0 }}>{String.fromCharCode(0x2713)}</span>
                  <span style={{ fontSize:13, color:"#a09a8a" }}>{f}</span>
                </div>
              );
            })}
          </div>
           <div style={{ fontSize:11, color:"#555" }}>
            {"Secure payment by Stripe. Cancel anytime from your account. "}
            <a href="mailto:billing@nervousgeek.com" style={{ color:"#666", textDecoration:"underline" }}>Billing issues? Contact us</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Paywall card -------------------------------------------------------------
function PaywallCard({ sym, name, onBack, isPaid, clerkUser, mode }) {
  var ORANGE = "#F05A1A";
  var isUpgrade = mode === "upgrade";
  function doUpgrade(plan) {
    var hdrs = window.__clerkToken ? { "Authorization": "Bearer " + window.__clerkToken } : {};
    fetch("/stripe?action=checkout&plan=" + plan, { headers: hdrs })
      .then(function(r){ return r.json(); })
      .then(function(d){ if (d.url) window.location.href = d.url; });
  }
  return (
    <div style={{ minHeight:"100vh", background:"#0e0e0c", fontFamily:FONT, display:"flex", flexDirection:"column" }}>
      <nav style={{ height:52, padding:"0 24px", display:"flex", alignItems:"center", gap:12, background:LIME }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#0e0e0c", fontWeight:800, fontSize:13, fontFamily:FONT, padding:0 }}>
          {"< Back"}
        </button>
        <span style={{ fontWeight:800, fontSize:15, color:"#0e0e0c" }}>nervousgeek.com</span>
      </nav>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
        <div style={{ maxWidth:480, width:"100%", background:"#1c1c1e", border:"1px solid #2c2c26", borderRadius:20, padding:"48px 40px", textAlign:"center" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background: isUpgrade?"#1e2a1e":"#2a2010", border:"2px solid "+(isUpgrade?"#2a5020":"#4a3810"), display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
            <span style={{ fontSize:28 }}>{isUpgrade ? String.fromCharCode(0x1F310) : String.fromCharCode(0x1F512)}</span>
          </div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#1a1a14", border:"1px solid #2c2c26", borderRadius:8, padding:"6px 16px", marginBottom:20 }}>
            <span style={{ fontWeight:900, fontSize:14, color:LIME }}>{sym}</span>
            {name && name !== sym && <span style={{ fontSize:13, color:"#a09a8a" }}>{name}</span>}
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:"#f0ede6", marginBottom:12, lineHeight:1.3 }}>
            {isUpgrade ? "Premium Ticker" : "Members Only"}
          </div>
          <div style={{ fontSize:14, color:"#a09a8a", lineHeight:1.7, marginBottom:28 }}>
            {isUpgrade
              ? (sym + " is outside the S&P 500. Upgrade to Premium to access any stock on any global exchange.")
              : ("Sign in to access full AI insights for all S&P 500 companies.")
            }
          </div>
          {isUpgrade ? (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                <div style={{ background:"#1e2a1e", border:"1px solid #2a5020", borderRadius:12, padding:"16px 14px", textAlign:"center" }}>
                  <div style={{ fontSize:11, color:"#7abd00", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Monthly</div>
                  <div style={{ fontSize:24, fontWeight:900, color:"#f0ede6" }}>$10</div>
                  <div style={{ fontSize:11, color:"#555", marginBottom:12 }}>per month</div>
                  <button onClick={function(){ doUpgrade("monthly"); }}
                    style={{ width:"100%", padding:"10px", borderRadius:50, border:"none", background:LIME, color:"#0e0e0c", fontWeight:800, fontSize:13, fontFamily:FONT, cursor:"pointer" }}>
                    Upgrade Monthly
                  </button>
                </div>
                <div style={{ background:"#1e2a1e", border:"2px solid #7abd00", borderRadius:12, padding:"16px 14px", textAlign:"center", position:"relative" }}>
                  <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:LIME, color:"#0e0e0c", fontSize:10, fontWeight:800, padding:"2px 10px", borderRadius:10, whiteSpace:"nowrap" }}>BEST VALUE</div>
                  <div style={{ fontSize:11, color:"#7abd00", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Annual</div>
                  <div style={{ fontSize:24, fontWeight:900, color:"#f0ede6" }}>$96</div>
                  <div style={{ fontSize:11, color:"#555", marginBottom:12 }}>per year (save 20%)</div>
                  <button onClick={function(){ doUpgrade("annual"); }}
                    style={{ width:"100%", padding:"10px", borderRadius:50, border:"none", background:LIME, color:"#0e0e0c", fontWeight:800, fontSize:13, fontFamily:FONT, cursor:"pointer" }}>
                    Upgrade Annual
                  </button>
                </div>
              </div>
              <button onClick={onBack}
                style={{ width:"100%", padding:"12px", borderRadius:50, border:"1px solid #2c2c26", background:"transparent", color:"#a09a8a", fontWeight:700, fontSize:13, fontFamily:FONT, cursor:"pointer" }}>
                Back to S&P 500 stocks
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#6a6460", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Free tickers</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
                  {FREE_TICKERS.map(function(t) {
                    return <span key={t} style={{ padding:"4px 12px", borderRadius:20, background:"#1e2a1e", border:"1px solid #2a5020", fontSize:12, fontWeight:700, color:"#7abd00" }}>{t}</span>;
                  })}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <button onClick={function() { if (window.Clerk) { try{ window.Clerk.openSignIn({}); } catch(e){ window.location.href="https://accounts.nervousgeek.com/sign-in"; } } }}
                  style={{ width:"100%", padding:"14px", borderRadius:50, border:"none", background:ORANGE, color:"#fff", fontWeight:800, fontSize:14, fontFamily:FONT, cursor:"pointer" }}>
                  Sign In to Access
                </button>
                <button onClick={onBack}
                  style={{ width:"100%", padding:"14px", borderRadius:50, border:"1px solid #2c2c26", background:"transparent", color:"#a09a8a", fontWeight:700, fontSize:14, fontFamily:FONT, cursor:"pointer" }}>
                  Back to free stocks
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Landing page -------------------------------------------------------------
// ─── Technical Signal Journal ─────────────────────────────────────────────────
export function JournalPage() {
  var F = "'Inter', system-ui, sans-serif";
  var [adminKey, setAdminKey]       = useState(localStorage.getItem("journal_admin_key") || "");
  var [authed, setAuthed]           = useState(false);
  var [authError, setAuthError]     = useState("");
  var [watchlist, setWatchlist]     = useState([]);
  var [journal, setJournal]         = useState([]);
  var [addTicker, setAddTicker]     = useState("");
  var [loading, setLoading]         = useState("");
  var [toast, setToast]             = useState(null);
  var [filter, setFilter]           = useState({ ticker:[], trend:[], momentum:[], reversal:[], smartMoney:[], outcome:[], setup:[] });
  var [generating, setGenerating]   = useState({});
  var [sortCol, setSortCol]         = useState("snapshot_date");
  var [sortDir, setSortDir]         = useState("desc");

  function showToast(msg, type) {
    setToast({ msg:msg, type:type||"ok" });
    setTimeout(function(){ setToast(null); }, 3500);
  }

  function jFetch(action, method, body) {
    var opts = { method: method||"GET", headers: { "X-Admin-Key": adminKey, "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    return fetch("/journal?action=" + action, opts).then(function(r) {
      var ct = r.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        return r.text().then(function(t) {
          throw new Error("API returned non-JSON (" + r.status + "). Check D1 binding in Cloudflare Pages settings. Response: " + t.substring(0, 100));
        });
      }
      return r.json();
    });
  }

  function loadWatchlist() {
    return jFetch("watchlist").then(function(d){ if (d.watchlist) setWatchlist(d.watchlist); });
  }

  function loadJournal(tk) {
    var url = "/journal?action=journal&limit=500" + (tk ? "&ticker=" + tk : "");
    return fetch(url, { headers:{ "X-Admin-Key": adminKey } }).then(function(r){ return r.json(); })
      .then(function(d){
        if (d.entries) {
          setJournal(d.entries);
          // Auto-fill any return windows that now have past prices
          // Runs silently in background — no loading spinner, no toast
          autoFillReturns(d.entries);
        }
      });
  }

  // Silently update future returns for any record where a window date has now passed.
  // Runs automatically after journal loads — no manual click needed.
  function autoFillReturns(entries) {
    if (!entries || entries.length === 0) return;
    var today = new Date().toISOString().split("T")[0];
    // Find unique tickers that have at least one record with a pending return window
    // A window is potentially fillable if the snapshot date is old enough
    var tickers = [...new Set(entries
      .filter(function(e) {
        // Only process if at least 1 trading day has passed (snapshot date < today)
        return e.snapshot_date < today && (
          e.future_return_5d  === null || e.future_return_5d  === undefined ||
          e.future_return_10d === null || e.future_return_10d === undefined ||
          e.future_return_20d === null || e.future_return_20d === undefined ||
          e.future_return_30d === null || e.future_return_30d === undefined ||
          e.future_return_60d === null || e.future_return_60d === undefined ||
          e.future_return_90d === null || e.future_return_90d === undefined
        );
      })
      .map(function(e){ return e.ticker; })
    )];
    if (tickers.length === 0) return;
    // Fire-and-forget — update each ticker silently, then reload journal
    var chain = Promise.resolve();
    tickers.forEach(function(tk) {
      chain = chain.then(function() {
        return jFetch("updateFutureReturns", "POST", { ticker: tk }).catch(function(){});
      });
    });
    chain.then(function() {
      // Reload journal silently to show updated figures
      var url = "/journal?action=journal&limit=500";
      fetch(url, { headers:{ "X-Admin-Key": adminKey } }).then(function(r){ return r.json(); })
        .then(function(d){ if (d.entries) setJournal(d.entries); });
    });
  }

  function handleAuth() {
    setAuthError("");
    jFetch("watchlist").then(function(d) {
      if (d.error) { setAuthError("❌ " + d.error); return; }
      localStorage.setItem("journal_admin_key", adminKey);
      setAuthed(true);
      setWatchlist(d.watchlist || []);
      loadJournal();
    }).catch(function(e) {
      setAuthError("❌ " + e.message);
    });
  }

  function handleAddTicker() {
    var t = addTicker.trim().toUpperCase();
    if (!t) return;
    jFetch("addTicker", "POST", { ticker: t }).then(function(d) {
      if (d.error) { showToast(d.error, "err"); return; }
      setAddTicker(""); loadWatchlist();
      // Auto-generate today's snapshot so it appears in the journal immediately
      showToast(t + " added — generating snapshot...", "ok");
      generateSnapshot(t).then(function() { loadJournal(); });
    });
  }

  function handleRemove(ticker) {
    jFetch("removeTicker", "POST", { ticker:ticker }).then(function(d) {
      if (d.ok) { showToast(ticker + " removed.", "ok"); loadWatchlist(); }
    });
  }

  async function fetchSnapshotData(ticker) {
    var headers = { "X-Admin-Key": adminKey };
    var [massRes, yahooRes] = await Promise.all([
      fetch("/massive?sym=" + ticker, { headers: headers }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
      fetch("/proxy?url=https://query2.finance.yahoo.com/v8/finance/chart/" + ticker + "?range=2y%26interval=1d").then(function(r){ return r.json(); }).catch(function(){ return null; })
    ]);
    if (!massRes) return null;
    var aggs = massRes.aggs || [];
    var ind  = massRes.indicators || {};
    var snap = massRes.snapshot || {};
    // Massive aggs are newest-first → reverse to oldest-first
    var bars = aggs.filter(function(b){ return b&&b.c>0; }).reverse().map(function(b) {
      return { date: b.t ? new Date(b.t).toISOString().split("T")[0] : "", open:b.o, high:b.h, low:b.l, close:b.c, volume:b.v||0 };
    });
    var today = new Date().toISOString().split("T")[0];
    var price = snap.close || (bars.length > 0 ? bars[bars.length-1].close : 0);
    // Extract 52-week range from Yahoo chart meta — needed for reversal indicator consistency
    var _ymeta = yahooRes && yahooRes.chart && yahooRes.chart.result && yahooRes.chart.result[0] && yahooRes.chart.result[0].meta ? yahooRes.chart.result[0].meta : null;
    var hi52 = (_ymeta && _ymeta.fiftyTwoWeekHigh) || 0;
    var lo52 = (_ymeta && _ymeta.fiftyTwoWeekLow)  || 0;
    return { bars:bars, ind:ind, price:price, date:today, hi52:hi52, lo52:lo52 };
  }

  async function generateSnapshot(ticker) {
    setGenerating(function(g){ return Object.assign({}, g, { [ticker]: true }); });
    try {
      var data = await fetchSnapshotData(ticker);
      if (!data || !data.bars || data.bars.length === 0) {
        showToast("No data returned for " + ticker + ". Check ticker is valid.", "err");
        return;
      }
      if (!data.price || data.price <= 0) {
        showToast("Could not get price for " + ticker + ".", "err");
        return;
      }
      var snapshot = calculateTechnicalSignalSnapshot({
        ticker:     ticker,
        date:       data.date,
        ohlcv:      data.bars,
        indicators: data.ind,
        meta:       { price: data.price, hi52: data.hi52||0, lo52: data.lo52||0 },
      });
      var postSnap = Object.assign({}, snapshot, {
        open:   snapshot.open,   high:  snapshot.high,
        low:    snapshot.low,    close: snapshot.close,
        volume: snapshot.volume,
      });
      var res = await jFetch("upsertSnapshot", "POST", postSnap);
      if (res.ok) {
        showToast(ticker + " snapshot saved.", "ok");
        loadWatchlist(); loadJournal();
      } else {
        showToast("Error saving " + ticker + ": " + (res.error||"unknown"), "err");
      }
    } catch(e) {
      showToast("Error: " + e.message, "err");
    } finally {
      setGenerating(function(g){ var n=Object.assign({},g); delete n[ticker]; return n; });
    }
  }

  async function generateAll() {
    setLoading("generating");
    // Use unique tickers from journal entries (watchlist may be empty)
    var jTickers = [...new Set(journal.map(function(e){ return e.ticker; }))];
    var wTickers = watchlist.map(function(w){ return w.ticker; });
    var allTickers = [...new Set([...wTickers, ...jTickers])];
    if (allTickers.length === 0) { showToast("No tickers to generate. Add tickers to watchlist first.", "err"); setLoading(""); return; }
    for (var i = 0; i < allTickers.length; i++) {
      await generateSnapshot(allTickers[i]);
    }
    setLoading("");
    showToast("All snapshots generated (" + allTickers.length + " tickers).", "ok");
  }

  async function updateFutureReturns() {
    setLoading("future");
    var jTickers = [...new Set(journal.map(function(e){ return e.ticker; }))];
    var wTickers = watchlist.map(function(w){ return w.ticker; });
    var allTickers = [...new Set([...wTickers, ...jTickers])];
    if (allTickers.length === 0) { showToast("No tickers found in journal.", "err"); setLoading(""); return; }
    var debugOutput = [];
    for (var tk of allTickers) {
      var res = await jFetch("updateFutureReturns", "POST", { ticker:tk });
      if (res && res.debug) {
        debugOutput.push(res.debug);
        console.log("[updateFutureReturns]", tk, res.debug);
      }
    }
    // Show debug summary as toast
    var summary = debugOutput.map(function(d){
      return d.ticker + ": Yahoo=" + (d.yahooFetchSuccess ? "OK ("+d.pricesLoaded+" prices, "+d.dateRange.first+" to "+d.dateRange.last+")" : "FAILED") + ", updated=" + (debugOutput.find(function(x){return x.ticker===d.ticker;}) ? "see console" : "?");
    }).join(" | ");
    showToast("Debug: " + summary, "ok");
    setLoading("");
    showToast("Future returns updated (" + allTickers.length + " tickers). Check console for debug.", "ok");
    loadJournal();
  }

  function exportCSV() {
    var rows = filteredJournal();
    if (rows.length === 0) { showToast("No data to export.", "err"); return; }
    var cols = ["snapshot_date","ticker","close_price","trend_status","trend_score","momentum_status","momentum_score","reversal_status","bullish_reversal_score","bearish_reversal_score","smart_money_status","smart_money_score","today_activity_score","five_day_flow_score","thirty_day_accumulation_score","rsi_value","macd_histogram","future_return_1d","future_return_3d","future_return_5d","future_return_10d","future_return_20d","future_return_30d","future_return_60d","future_return_90d","max_gain_30d","max_drawdown_30d","bullish_outcome_label","bearish_outcome_label"];
    var csv = cols.join(",") + "\n" + rows.map(function(r) {
      return cols.map(function(c){ var v=r[c]; return v===null||v===undefined?"":String(v).includes(",")?"\""+v+"\"":v; }).join(",");
    }).join("\n");
    var a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "signal_journal_" + new Date().toISOString().split("T")[0] + ".csv";
    a.click();
    showToast("Exported " + rows.length + " rows.", "ok");
  }

  function handleDeleteSnapshot(ticker, date) {
    if (!window.confirm("Delete " + ticker + " snapshot for " + date + "?")) return;
    jFetch("deleteSnapshot", "POST", { ticker: ticker, date: date }).then(function(d) {
      if (d.ok) { showToast(ticker + " " + date + " deleted.", "ok"); loadJournal(); }
      else showToast("Delete failed: " + (d.error || "unknown"), "err");
    }).catch(function(e) { showToast("Delete error: " + e.message, "err"); });
  }

  function reversalColor(status) {
    if (!status) return "#555";
    if (status === "Not Enough Data" || status === "No Clear Reversal") return "#555";
    if (status.startsWith("Bullish") && (status.includes("Forming")||status.includes("Triggered")||status.includes("Confirmed")||status.includes("Confirming"))) return "#7abd00";
    if (status.startsWith("Bullish") && (status.includes("Watch")||status.includes("Spark")||status.includes("Setup"))) return "#6090d0";
    if (status.startsWith("Bearish") && (status.includes("Forming")||status.includes("Triggered")||status.includes("Confirmed")||status.includes("Confirming"))) return "#e05050";
    if (status.startsWith("Bearish") && (status.includes("Watch")||status.includes("Setup"))) return "#EF9F27";
    if (status === "Mixed Reversal Signals") return "#EF9F27";
    return "#555";
  }

  function smfColor(status) {
    if (!status) return "#555";
    if (status === "Strong Multi-Timeframe Flow" || status === "Accumulation Trend Positive") return "#7abd00";
    if (status === "Constructive but Cooling" || status === "Early Accumulation") return "#6090d0";
    if (status === "Short-Term Spike") return "#EF9F27";
    return "#555";
  }
  function filteredJournal() {
    // Returns filtered (unsorted) rows; sort is applied after enrichment below
    return journal.filter(function(r) {
      if (filter.ticker.length    && filter.ticker.indexOf(r.ticker)===-1)                         return false;
      if (filter.trend.length     && filter.trend.indexOf(r.trend_status)===-1)                    return false;
      if (filter.momentum.length  && filter.momentum.indexOf(r.momentum_status)===-1)              return false;
      if (filter.reversal.length  && !filter.reversal.some(function(v){ return (r.reversal_status||"").includes(v); })) return false;
      if (filter.smartMoney.length&& filter.smartMoney.indexOf(r.smart_money_status)===-1)         return false;
      if (filter.outcome.length   && filter.outcome.indexOf(r.bullish_outcome_label)===-1)         return false;
      return true;
    });
  }

  function Th(props) {
    var active = sortCol === props.col;
    return (
      <th onClick={function(){ setSortDir(active&&sortDir==="asc"?"desc":"asc"); setSortCol(props.col); }}
        style={{ padding:"6px 7px", fontSize:10, fontWeight:700, color: active?"#c8f000":"#666", textTransform:"uppercase", letterSpacing:"0.06em", cursor:"pointer", whiteSpace:"nowrap", background:"#1a1a18", borderBottom:"1px solid #2a2a28", userSelect:"none", textAlign:"left" }}>
        {props.children}{active?(sortDir==="asc"?" ▲":" ▼"):""}
      </th>
    );
  }

  function FmtReturn(val) {
    if (val === null || val === undefined) return <span style={{color:"#444", fontSize:10}}>Pending</span>;
    var col = val >= 5 ? "#7abd00" : val >= 0 ? "#5a9a40" : val > -5 ? "#e08050" : "#e05050";
    return <span style={{color:col, fontWeight:600}}>{val > 0 ? "+" : ""}{val.toFixed(1)}%</span>;
  }

  function OutcomeBadge(label) {
    if (!label || label === "Pending") return <span style={{fontSize:9,color:"#444"}}>Pending</span>;
    var col = label.includes("Strong Win")?"#7abd00":label==="Win"?"#5a9a40":label==="Neutral"?"#888":label.includes("Failed")?"#e05050":"#e08050";
    return <span style={{fontSize:9,fontWeight:700,color:col,background:col+"20",padding:"2px 6px",borderRadius:3}}>{label}</span>;
  }

  function StatusBadge(val, col) {
    if (!val) return <span style={{color:"#444", fontSize:10}}>—</span>;
    var c = col || "#888";
    return <span style={{fontSize:10, fontWeight:600, color:c}}>{val}</span>;
  }

  function scoreColor(s) {
    if (s===null||s===undefined) return "#444";
    return s >= 65 ? "#7abd00" : s >= 40 ? "#EF9F27" : "#e05050";
  }

  // ── Auth screen ─────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ fontFamily:F, background:"#0e0e0c", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#181816", border:"0.5px solid #2a2a28", borderRadius:12, padding:32, width:340 }}>
        <div style={{ fontSize:11, color:"#c8f000", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>Colaboree StockInsight</div>
        <div style={{ fontSize:20, fontWeight:800, color:"#f0ede6", marginBottom:4 }}>Signal Journal</div>
        <div style={{ fontSize:12, color:"#666", marginBottom:24 }}>Research access only. Enter your admin key to continue.</div>
        <input value={adminKey} onChange={function(e){ setAdminKey(e.target.value); }}
          onKeyDown={function(e){ if(e.key==="Enter") handleAuth(); }}
          type="password" placeholder="Admin key"
          style={{ width:"100%", background:"#111", border:"0.5px solid #333", borderRadius:8, padding:"10px 12px", color:"#f0ede6", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:10 }} />
        {authError && <div style={{ fontSize:11, color:"#e05050", marginBottom:10 }}>{authError}</div>}
        <button onClick={handleAuth}
          style={{ width:"100%", background:"#c8f000", color:"#0e0e0c", fontWeight:800, fontSize:13, border:"none", borderRadius:8, padding:"10px", cursor:"pointer" }}>
          Access Journal
        </button>
        <div style={{ marginTop:16, textAlign:"center" }}>
          <a href="/" style={{ fontSize:11, color:"#555", textDecoration:"none" }}>← Back to StockInsight</a>
        </div>
      </div>
    </div>
  );

  // Enrich all filtered rows, apply Setup filter, then sort
  var fjRaw = filteredJournal();
  var fjEnriched = fjRaw.map(enrichRowWithRuleSetup);
  if (filter.setup.length) fjEnriched = fjEnriched.filter(function(r){ return filter.setup.indexOf(r.ruleShortVerdict)!==-1; });
  fjEnriched.sort(function(a,b){
    var av = sortCol==='rule_setup' ? a.ruleShortVerdict : a[sortCol];
    var bv = sortCol==='rule_setup' ? b.ruleShortVerdict : b[sortCol];
    if (av===null||av===undefined) return 1;
    if (bv===null||bv===undefined) return -1;
    var cmp = av<bv?-1:av>bv?1:0;
    return sortDir==='asc'?cmp:-cmp;
  });
  var fj = fjEnriched;
  var activeTickers = [...new Set(journal.map(function(e){ return e.ticker; }))];

  // ── Main journal UI ─────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:F, background:"#0e0e0c", minHeight:"100vh", color:"#f0ede6" }}>
      {/* Toast */}
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:9999, background: toast.type==="err"?"#3a1a1a":"#1a3a1a", border:"0.5px solid "+(toast.type==="err"?"#e05050":"#7abd00"), borderRadius:8, padding:"10px 16px", fontSize:12, color: toast.type==="err"?"#e05050":"#7abd00", boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ borderBottom:"0.5px solid #2a2a28", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <a href="/" style={{ fontSize:11, color:"#555", textDecoration:"none" }}>← StockInsight</a>
          <div style={{ width:1, height:16, background:"#2a2a28" }} />
          <div style={{ fontSize:13, fontWeight:800, color:"#c8f000" }}>Signal Journal</div>
          <div style={{ fontSize:10, color:"#555" }}>Research use only · Not financial advice</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={generateAll} disabled={loading==="generating"}
            style={{ background:"#c8f000", color:"#0e0e0c", fontWeight:700, fontSize:11, border:"none", borderRadius:6, padding:"7px 14px", cursor:"pointer", opacity:loading==="generating"?0.6:1 }}>
            {loading==="generating" ? "Generating..." : "⚡ Generate Today's Snapshots"}
          </button>
          <button onClick={updateFutureReturns} disabled={loading==="future"}
            style={{ background:"#1a2a1a", color:"#7abd00", fontWeight:700, fontSize:11, border:"0.5px solid #2a5020", borderRadius:6, padding:"7px 14px", cursor:"pointer", opacity:loading==="future"?0.6:1 }}>
            {loading==="future" ? "Updating..." : "📈 Update Future Returns"}
          </button>
          <button onClick={exportCSV}
            style={{ background:"#1a1a2a", color:"#9090f0", fontWeight:700, fontSize:11, border:"0.5px solid #2a2a50", borderRadius:6, padding:"7px 14px", cursor:"pointer" }}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div style={{ padding:"20px 24px" }}>

        {/* Add Ticker — inline, no card section */}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          <input value={addTicker} onChange={function(e){ setAddTicker(e.target.value.toUpperCase()); }}
            onKeyDown={function(e){ if(e.key==="Enter") handleAddTicker(); }}
            placeholder="Add ticker e.g. AAPL"
            style={{ background:"#181816", border:"0.5px solid #333", borderRadius:8, padding:"8px 12px", color:"#f0ede6", fontSize:13, outline:"none", width:180 }} />
          <button onClick={handleAddTicker}
            style={{ background:"#c8f000", color:"#0e0e0c", fontWeight:700, fontSize:12, border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer" }}>
            Add
          </button>
        </div>

        {/* Signal Journal */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Signal Journal ({fj.length} records)</div>

          {/* Multi-select pill filters */}
          <div style={{ background:"#181816", border:"0.5px solid #222", borderRadius:8, padding:"10px 14px", marginBottom:12 }}>
            {(function(){
              var SETUP_OPTS = ['Strong Bullish','Bullish','Bullish Watch','Neutral','Caution','Bearish Watch','Bearish','Strong Bearish'];
              function toggle(key, v) { setFilter(function(prev){ var a=prev[key]; var next=a.indexOf(v)!==-1?a.filter(function(x){return x!==v;}):a.concat([v]); return Object.assign({},prev,{[key]:next}); }); }
              var groups = [
                ["Ticker",      "ticker",     activeTickers],
                ["Trend",       "trend",      ["Strong Uptrend","Uptrend","Sideways","Downtrend","Strong Downtrend"]],
                ["Momentum",    "momentum",   ["Strong","Building","Neutral","Fading","Weak"]],
                ["Reversal",    "reversal",   ["Bull Spark","Bull Watch","Bull Forming","Bull Triggered","Bull Confirming","Bull Confirmed","Bear Watch","Bear Forming","Bear Triggered","Bear Confirmed","Mixed"]],
                ["Smart Money", "smartMoney", ["Strong Flow","Accumulating","Early Accum.","Constructive","ST Spike","No Signal"]],
                ["Setup",       "setup",      SETUP_OPTS],
                ["Outcome",     "outcome",    ["Strong Win","Win","Neutral","Failed","Strong Failed","Pending"]],
              ];
              var anyActive = Object.values(filter).some(function(a){return a.length>0;});
              return (
                <div>
                  {groups.map(function(fg){
                    var lbl=fg[0], key=fg[1], opts=fg[2];
                    return (
                      <div key={key} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:7 }}>
                        <span style={{ fontSize:9, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.06em", minWidth:74, paddingTop:3, flexShrink:0 }}>{lbl}</span>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                          {opts.map(function(v){
                            var sel = filter[key].indexOf(v)!==-1;
                            var ac  = key==="setup" ? summaryCardDark(v).text : "#c8f000";
                            return <button key={v} onClick={function(){ toggle(key,v); }}
                              style={{ fontSize:9, padding:"2px 8px", borderRadius:10, cursor:"pointer", fontWeight:sel?700:400,
                                background:sel?"#1e2a10":"#141412", color:sel?ac:"#555",
                                border:"0.5px solid "+(sel?ac:"#2a2a28"), outline:"none" }}>{v}</button>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {anyActive && <button onClick={function(){ setFilter({ ticker:[], trend:[], momentum:[], reversal:[], smartMoney:[], outcome:[], setup:[] }); }}
                    style={{ fontSize:10, padding:"3px 10px", background:"none", border:"0.5px solid #444", borderRadius:5, color:"#666", cursor:"pointer", marginTop:2 }}>Clear all filters</button>}
                </div>
              );
            })()}
          </div>

          {/* Table */}
          {fj.length === 0 ? (
            <div style={{ fontSize:12, color:"#555", padding:"40px", textAlign:"center", background:"#181816", borderRadius:10 }}>
              No records yet. Generate snapshots for your tracked tickers to start collecting data.
            </div>
          ) : (
            <div style={{ borderRadius:10, border:"0.5px solid #2a2a28", width:"100%" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr>
                    <Th col="snapshot_date">Date</Th>
                    <Th col="ticker">Ticker</Th>
                    <Th col="close_price">Close</Th>
                    <Th col="trend_status">Trend</Th>
                    <Th col="momentum_status">Momentum</Th>
                    <Th col="momentum_score">M.Score</Th>
                    <Th col="rsi_value">RSI</Th>
                    <Th col="reversal_status">Reversal</Th>
                    <Th col="bullish_reversal_score">Bull</Th>
                    <Th col="bearish_reversal_score">Bear</Th>
                    <Th col="smart_money_status">Smart Money</Th>
                    <Th col="smart_money_score">SM.Score</Th>
                    <Th col="rule_setup">Setup</Th>
                    <Th col="future_return_5d">5D Ret.</Th>
                    <Th col="future_return_10d">10D</Th>
                    <Th col="future_return_20d">20D</Th>
                    <Th col="future_return_30d">30D</Th>
                    <Th col="future_return_60d">60D</Th>
                    <Th col="future_return_90d">90D</Th>
                    <Th col="max_gain_30d">Range 30D</Th>
                    <Th col="bullish_outcome_label">Outcome</Th>
                    <th style={{ padding:"8px 6px", fontSize:10, color:"#444", background:"#1a1a18", borderBottom:"1px solid #2a2a28" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fj.map(function(r, i) {
                    var er  = r;  // already enriched above
                    var rowBg = i % 2 === 0 ? "#181816" : "#141412";
                    var revCol = reversalColor(r.reversal_status);
                    var smfCol = smfColor(r.smart_money_status);
                    var setupC = ruleSetupColor(er.ruleScenarioId);
                    return (
                      <tr key={r.id} style={{ background:rowBg }}>
                        <td style={{ padding:"5px 7px", color:"#888" }}>{r.snapshot_date}</td>
                        <td style={{ padding:"5px 7px", fontWeight:700, color:"#c8f000" }}>{r.ticker}</td>
                        <td style={{ padding:"5px 7px", color:"#f0ede6" }}>${r.close_price?.toFixed(2)}</td>
                        <td style={{ padding:"5px 7px" }}>{StatusBadge(r.trend_status, r.trend_score>=55?"#7abd00":r.trend_score>=40?"#EF9F27":"#e05050")}</td>
                        <td style={{ padding:"5px 7px" }}>{StatusBadge(r.momentum_status, r.momentum_score>=65?"#7abd00":r.momentum_score>=50?"#EF9F27":"#e05050")}</td>
                        <td style={{ padding:"5px 7px", color:"#aaa", fontWeight:500 }}>{r.momentum_score?.toFixed(0)||"—"}</td>
                        <td style={{ padding:"5px 7px", color:r.rsi_value>70?"#EF9F27":r.rsi_value>=50?"#7abd00":r.rsi_value>=30?"#888":"#e05050" }}>{r.rsi_value?.toFixed(1)||"—"}</td>
                        <td style={{ padding:"5px 7px", fontSize:10, color:revCol, fontWeight:600, maxWidth:140, lineHeight:1.3 }}>{r.reversal_status||"—"}</td>
                        <td style={{ padding:"5px 7px", color:"#aaa" }}>{r.bullish_reversal_score?.toFixed(0)||"—"}</td>
                        <td style={{ padding:"5px 7px", color:"#aaa" }}>{r.bearish_reversal_score?.toFixed(0)||"—"}</td>
                        <td style={{ padding:"5px 7px", fontSize:10, color:smfCol, fontWeight:600, maxWidth:140, lineHeight:1.3 }}>{r.smart_money_status||"—"}</td>
                        <td style={{ padding:"5px 7px", color:"#aaa", fontWeight:500 }}>{r.smart_money_score?.toFixed(0)||"—"}</td>
                        <td style={{ padding:"5px 7px" }} title={er.ruleVerdict||''}>
                          <div style={{ fontSize:11, fontWeight:700, color:setupC.text, lineHeight:1.3, whiteSpace:"nowrap" }}>{er.ruleShortVerdict}</div>
                          {er.ruleSubtitle && <div style={{ fontSize:9, color:setupC.text+"99", lineHeight:1.3, marginTop:1 }}>{er.ruleSubtitle}</div>}
                        </td>
                        <td style={{ padding:"5px 7px" }}>{FmtReturn(r.future_return_5d)}</td>
                        <td style={{ padding:"5px 7px" }}>{FmtReturn(r.future_return_10d)}</td>
                        <td style={{ padding:"5px 7px" }}>{FmtReturn(r.future_return_20d)}</td>
                        <td style={{ padding:"5px 7px" }}>{FmtReturn(r.future_return_30d)}</td>
                        <td style={{ padding:"5px 7px" }}>{FmtReturn(r.future_return_60d)}</td>
                        <td style={{ padding:"5px 7px" }}>{FmtReturn(r.future_return_90d)}</td>
                        <td style={{ padding:"5px 7px" }}>
                          {(function(){
                            var gain = r.max_gain_30d;
                            var loss = r.max_drawdown_30d;
                            if (gain == null && loss == null) return <span style={{color:"#444",fontSize:10}}>Pending</span>;
                            var g = Math.max(0, gain || 0);
                            var l = Math.min(0, loss || 0);
                            var ret = r.future_return_20d;
                            var total = g - l; // full range e.g. 8.5-(-10.2)=18.7
                            if (total === 0) return <span style={{color:"#444",fontSize:10}}>—</span>;
                            var W = 120;
                            var zeroX = (-l / total) * W;   // 0% mark position
                            var lossW = zeroX;               // red: left edge → zero
                            var gainW = W - zeroX;           // green: zero → right edge
                            // dot: where actual 20D return lands
                            var dotX = ret != null ? Math.max(3, Math.min(W-3, ((-l + ret) / total) * W)) : null;
                            return (
                              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                <span style={{ fontSize:9, color:"#e05050", width:36, textAlign:"right", flexShrink:0 }}>
                                  {l < 0 ? l.toFixed(1)+"%" : ""}
                                </span>
                                <div style={{ position:"relative", flexShrink:0 }}>
                                  <svg width={W} height={10} style={{ display:"block" }}>
                                    {/* Red loss segment */}
                                    {lossW > 0 && <rect x={0} y={2} width={lossW} height={6} rx={2} fill="#e05050" opacity={0.85} />}
                                    {/* Green gain segment */}
                                    {gainW > 0 && <rect x={zeroX} y={2} width={gainW} height={6} rx={2} fill="#7abd00" opacity={0.85} />}
                                    {/* Zero tick */}
                                    <rect x={zeroX-0.5} y={0} width={1} height={10} fill="#888" />
                                    {/* Actual return dot */}
                                    {dotX != null && <circle cx={dotX} cy={5} r={3} fill="#fff" stroke="#111" strokeWidth={0.5} />}
                                  </svg>
                                </div>
                                <span style={{ fontSize:9, color:"#7abd00", width:36, textAlign:"left", flexShrink:0 }}>
                                  {g > 0 ? "+"+g.toFixed(1)+"%" : ""}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding:"5px 7px" }}>{OutcomeBadge(r.bullish_outcome_label)}</td>
                        <td style={{ padding:"5px 5px" }}>
                          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                            <button onClick={function(){ generateSnapshot(r.ticker); }}
                              disabled={!!generating[r.ticker]}
                              title={"Generate today's snapshot for " + r.ticker}
                              style={{ background:"none", border:"0.5px solid #1a3a1a", borderRadius:4, color:generating[r.ticker]?"#444":"#5a9a40", fontSize:11, cursor:generating[r.ticker]?"not-allowed":"pointer", padding:"2px 7px", lineHeight:1 }}>
                              {generating[r.ticker] ? "…" : "⚡"}
                            </button>
                            <button onClick={function(){ handleDeleteSnapshot(r.ticker, r.snapshot_date); }}
                              title={"Delete " + r.ticker + " " + r.snapshot_date}
                              style={{ background:"none", border:"0.5px solid #3a1a1a", borderRadius:4, color:"#663333", fontSize:11, cursor:"pointer", padding:"2px 7px", lineHeight:1 }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ fontSize:10, color:"#333", marginTop:16, lineHeight:1.6 }}>
            The Technical Signal Journal records historical technical signals and outcomes for research purposes only. It does not provide financial advice or guarantee future performance.
          </div>
        </div>
        </div>
      </div>
  );
}

export default function App() {
  const [input,   setInput]   = useState("");
  const [focused, setFocused] = useState(false);
  const [clerkUser, setClerkUser] = useState(window.__clerkUser || null);
  const [clerkLoaded, setClerkLoaded] = useState(false);
   const [isPaid, setIsPaid] = useState(!!(window.__isPaid));
  const [isCancelling, setIsCancelling] = useState(false);
  const [periodEnd, setPeriodEnd] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [tickerSignals, setTickerSignals] = useState([]);
  const [landingNews,   setLandingNews]   = useState([]);
  const [newsFilter,    setNewsFilter]    = useState("ALL");
  const [tickerEnrich,  setTickerEnrich]  = useState({});

  // Mount UserButton on landing page when signed in
  // Uses MutationObserver to detect when the div appears in DOM after navigation
  useEffect(function() {
    if (!clerkUser || !window.Clerk) return;
    function tryMount() {
      var el = document.getElementById("clerk-user-button-landing");
      if (el) {
        el.dataset.mounted = "";
        try { window.Clerk.mountUserButton(el); el.dataset.mounted = "1"; }
        catch(e) { console.warn("UserButton mount failed:", e); }
      }
    }
    // Try immediately and after short delay for navigation case
    tryMount();
    var t = setTimeout(tryMount, 100);
    return function() { clearTimeout(t); };
  }, [clerkUser]);

  // Initialise Clerk on mount -- listen for clerk-loaded event or poll
  useEffect(function() {
    function doLoad() {
      var loadOpts = window.__internal_ClerkUICtor
        ? { ui: { ClerkUI: window.__internal_ClerkUICtor } }
        : {};
      window.Clerk.load(loadOpts).then(function() {
        window.__clerkUser = window.Clerk.user || null; setClerkUser(window.__clerkUser);
        setClerkLoaded(true);
        // Store token for API calls
        if (window.Clerk.session) {
          window.Clerk.session.getToken().then(function(t) {
            window.__clerkToken = t;
            fetch("/stripe?action=status", { headers: { "Authorization": "Bearer " + t } })
              .then(function(r){ return r.json(); })
              .then(function(d){ var p = !!(d && d.paid); window.__isPaid = p; setIsPaid(p); window.__isCancelling = !!(d && d.cancelling); window.__periodEnd = (d && d.periodEnd) || null; setIsCancelling(!!(d && d.cancelling)); setPeriodEnd((d && d.periodEnd) || null); })
              .catch(function(){ setIsPaid(false); });
          });
        }
        window.Clerk.addListener(function(evt) {
          window.__clerkUser = evt.user || null; setClerkUser(window.__clerkUser);
          // Refresh token on auth state change
          if (evt.session) {
            evt.session.getToken().then(function(t) {
              window.__clerkToken = t;
              // Check subscription status
              fetch("/stripe?action=status", { headers: { "Authorization": "Bearer " + t } })
                .then(function(r){ return r.json(); })
                .then(function(d){ var p = !!(d && d.paid); window.__isPaid = p; setIsPaid(p); window.__isCancelling = !!(d && d.cancelling); window.__periodEnd = (d && d.periodEnd) || null; setIsCancelling(!!(d && d.cancelling)); setPeriodEnd((d && d.periodEnd) || null); })
                .catch(function(){ setIsPaid(false); });
            });
          } else {
            window.__clerkToken = null;
            setIsPaid(false);
          }
        });
      }).catch(function(e) {
        console.warn("Clerk load failed:", e);
        setClerkLoaded(true);
      });
    }
    // If Clerk already ready
    if (window.Clerk) { doLoad(); return; }
    // Listen for Clerk's own loaded event
    window.addEventListener("clerk-loaded", doLoad, { once: true });
    // Also poll as fallback
    var attempts = 0;
    var poll = setInterval(function() {
      attempts++;
      if (window.Clerk) { clearInterval(poll); doLoad(); }
      if (attempts > 100) { clearInterval(poll); setClerkLoaded(true); }
    }, 100);
    return function() {
      clearInterval(poll);
      window.removeEventListener("clerk-loaded", doLoad);
    };
  }, []);

  // Batch load AI signals for scrolling ticker bar
  useEffect(function() {
    var FREE = ["NVDA","AAPL","MSFT","AMZN","GOOGL","AVGO","META","TSLA","LLY","BRKB"];
    var loaded = [];

    function exLine(text, prefix) {
      if (!text) return null;
      var ls = text.split("\n");
      for (var i=0;i<ls.length;i++) {
        if (ls[i].toLowerCase().indexOf(prefix.toLowerCase())===0) {
          var idx = ls[i].indexOf(":");
          return idx>=0 ? ls[i].slice(idx+1).trim() : null;
        }
      }
      return null;
    }

    function parseFromText(text) {
      if (!text) return null;
      // Try JSON format first (new ai-fund format stores as JSON object)
      try {
        var obj = JSON.parse(text);
        if (obj && obj.verdict) {
          var vl = obj.verdict.toLowerCase().replace(/\*/g, "").trim();
          var isExceptional = vl.indexOf("exceptional") !== -1;
          var isGood = vl.indexOf("good") !== -1;
          // Legacy: strong buy / buy
          var isStrongBuy = vl.indexOf("strong buy") !== -1;
          var isBuy = vl.indexOf("buy") !== -1;
          if (!isExceptional && !isGood && !isStrongBuy && !isBuy) return null;
          return { fundV: obj.verdict, isStrongBuy: isExceptional || isStrongBuy };
        }
      } catch(e) {}
      // Fall back to plain text line parsing
      var fundV = exLine(text, "Fundamental");
      if (!fundV) fundV = exLine(text, "Overall Verdict");
      if (!fundV) fundV = exLine(text, "Verdict");
      if (!fundV) return null;
      var vl = fundV.toLowerCase().replace(/\*/g, "").trim();
      var isExceptional = vl.indexOf("exceptional") !== -1;
      var isGood = vl.indexOf("good") !== -1;
      var isStrongBuy = vl.indexOf("strong buy") !== -1;
      var isBuy = vl.indexOf("buy") !== -1;
      if (!isExceptional && !isGood && !isStrongBuy && !isBuy) return null;
      return { fundV: fundV, isStrongBuy: isExceptional || isStrongBuy };
    }

    function fetchSignal(sym) {
      // Gate 1: ai-tech must be written within last 7 days
      // Gate 2: ai-fund verdict must be Exceptional or Good
      return Promise.all([
        fetch("/cache?sym=" + sym + "&tab=ai-fund").then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch("/cache?sym=" + sym + "&tab=ai-tech").then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch("/cache?sym=" + sym + "&tab=signal").then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch("/cache?sym=" + sym + "&tab=trend-signal").then(function(r){ return r.json(); }).catch(function(){ return null; })
      ]).then(function(results) {
        var dFund   = results[0];
        var dTech   = results[1];
        var dSignal = results[2];
        var dTrendSig = results[3];
        // Gate 1: ai-tech written within last 7 days OR signal cache updated within 7 days
        var _7d = 7 * 24 * 60 * 60 * 1000;
        var techFresh   = dTech && dTech.hit && dTech.cachedAt && (Date.now() - new Date(dTech.cachedAt).getTime() < _7d);
        var signalFresh = (function(){
          if (!dSignal || !dSignal.hit || !dSignal.value) return false;
          try { var s = JSON.parse(dSignal.value); return s.updatedAt && (Date.now() - new Date(s.updatedAt).getTime() < _7d); }
          catch(e) { return false; }
        })();
        if (!techFresh && !signalFresh) return null;
        // Gate 2: ai-fund must have Exceptional or Good verdict
        // Parse signal cache
        var sigData = null;
        if (dSignal && dSignal.hit && dSignal.value) {
          try { sigData = JSON.parse(dSignal.value); } catch(e) {}
        }
        // Parse trend-signal cache (1-day TTL, exact detail page formula)
        var trendSigData = null;
        if (dTrendSig && dTrendSig.hit && dTrendSig.value) {
          try { trendSigData = JSON.parse(dTrendSig.value); } catch(e) {}
        }
        var parsed = (dFund && dFund.hit && dFund.value) ? parseFromText(dFund.value) : null;
        if (!parsed) {
          // Fallback to old aiinsight cache
          return fetch("/cache?sym=" + sym + "&tab=aiinsight")
            .then(function(r2){ return r2.json(); })
            .then(function(d2){
              var p2 = (d2 && d2.hit && d2.value) ? parseFromText(d2.value) : null;
              return p2 ? { parsed: p2, sigData: sigData } : null;
            }).catch(function(){ return null; });
        }
        return { parsed: parsed, sigData: sigData, trendSigData: trendSigData };
      })
        .then(function(bundle){
          if (!bundle) return null;
          var parsed      = bundle.parsed;
          var sigData     = bundle.sigData;
          var trendSigData = bundle.trendSigData;
          var ySym = sym === "BRKB" ? "BRK-B" : sym;
          return Promise.all([
            fetch("/proxy?url=" + encodeURIComponent("https://query1.finance.yahoo.com/v8/finance/chart/" + ySym + "?interval=1d&range=1y"))
              .then(function(r2){ return r2.json(); }).catch(function(){ return null; }),
            fetch("/proxy?url=" + encodeURIComponent("https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + ySym + "?modules=defaultKeyStatistics,financialData"))
              .then(function(r3){ return r3.json(); }).catch(function(){ return null; })
          ]).then(function(fetched) {
              var q   = fetched[0];
              var qs  = fetched[1];
              var res       = q&&q.chart&&q.chart.result&&q.chart.result[0];
              var meta      = res&&res.meta;
              var price     = meta?(meta.regularMarketPrice||0):0;
              var changePct = meta?(meta.regularMarketChangePercent||0):0;
              var change    = meta?(meta.regularMarketChange||0):0;
              var mc        = meta?(meta.marketCap||0):0;
              var hi52      = meta?(meta.fiftyTwoWeekHigh||0):0;
              var lo52      = meta?(meta.fiftyTwoWeekLow||0):0;
              var closes    = res&&res.indicators&&res.indicators.quote&&res.indicators.quote[0]&&res.indicators.quote[0].close||[];
              var rawVols   = res&&res.indicators&&res.indicators.quote&&res.indicators.quote[0]&&res.indicators.quote[0].volume||[];
              // Keep close/volume pairs aligned after null-filtering
              var pairs = closes.map(function(c,i){ return { c:c, v:rawVols[i]||0 }; }).filter(function(p){ return p.c!=null; });
              var vc    = pairs.map(function(p){ return p.c; });
              var vv    = pairs.map(function(p){ return p.v; });
              var sma50     = vc.length>=50  ? vc.slice(-50).reduce(function(s,v){return s+v;},0)/50   : 0;
              var sma200    = vc.length>=200 ? vc.slice(-200).reduce(function(s,v){return s+v;},0)/200 : 0;
              // RSI-14
              var rsi = null;
              if (vc.length >= 15) {
                var gains=0, losses=0;
                for (var ri=vc.length-14; ri<vc.length; ri++) {
                  var diff = vc[ri] - vc[ri-1];
                  if (diff > 0) gains += diff; else losses += Math.abs(diff);
                }
                var ag = gains/14, al = losses/14;
                rsi = al === 0 ? 100 : 100 - (100/(1 + ag/al));
              }
              // Analyst target from quoteSummary
              var ksData     = qs&&qs.quoteSummary&&qs.quoteSummary.result&&qs.quoteSummary.result[0]&&qs.quoteSummary.result[0].defaultKeyStatistics;
              var fdData     = qs&&qs.quoteSummary&&qs.quoteSummary.result&&qs.quoteSummary.result[0]&&qs.quoteSummary.result[0].financialData;
              var targetMean = (ksData&&ksData.targetMeanPrice&&ksData.targetMeanPrice.raw) ? ksData.targetMeanPrice.raw
                             : (fdData&&fdData.targetMeanPrice&&fdData.targetMeanPrice.raw) ? fdData.targetMeanPrice.raw : null;
              var analystUp  = (targetMean && price > 0) ? ((targetMean - price) / price * 100) : null;
              // Build Yahoo snapshot if trendSigData is missing or missing rev/smf fields
              if (vc.length >= 15 && (!trendSigData || !trendSigData.revStatus || !trendSigData.smfStatus)) {
                var yahooSnap = buildTechSnapshotFromYahoo(sym, vc, vv, price, sma50, sma200);
                if (yahooSnap) {
                  var _yrv = yahooSnap.reversalWatch  || {};
                  var _ysf = yahooSnap.smartMoneyFlow || {};
                  if (!trendSigData) {
                    trendSigData = {
                      trendLabel: yahooSnap.trend.status,
                      trendScore: yahooSnap.trend.score,
                      momLabel:   yahooSnap.momentum.status,
                      momScore:   yahooSnap.momentum.score,
                      // Reversal from Yahoo is unreliable (no RSI/MACD/WSMA history)
                      // Tagged as 'yahoo' so AI Favourites shows '—' until detail page visit
                      revStatus:  _yrv.status || null,
                      revScore:   _yrv.score  || null,
                      revSource:  'yahoo',
                      smfStatus:  _ysf.status || null,
                      updatedAt:  new Date().toISOString()
                    };
                  } else {
                    // Supplement existing cached entry — only fill missing fields
                    trendSigData = Object.assign({}, trendSigData, {
                      revStatus: trendSigData.revStatus || _yrv.status || null,
                      revScore:  trendSigData.revScore  || _yrv.score  || null,
                      smfStatus: trendSigData.smfStatus || _ysf.status || null,
                    });
                  }
                  if (window.__clerkToken && !trendSigData.revStatus) {
                    // Only write cache if we built a full new entry
                  } else if (window.__clerkToken) {
                    fetch("/cache?sym=" + sym + "&tab=trend-signal", {
                      method:"POST", headers:{"Content-Type":"text/plain","Authorization":"Bearer "+window.__clerkToken},
                      body:JSON.stringify(trendSigData)
                    }).catch(function(){});
                  }
                }
              }


              return { sym:sym, fundV:parsed.fundV, isStrongBuy:parsed.isStrongBuy, price:price, changePct:changePct, change:change, mc:mc, hi52:hi52, lo52:lo52, sma50:sma50, sma200:sma200, rsi:rsi, targetMean:targetMean, analystUp:analystUp, sig:sigData, trendSig:trendSigData };
            }).catch(function(){ return { sym:sym, fundV:parsed.fundV, isStrongBuy:parsed.isStrongBuy, price:0, changePct:0, change:0, mc:0, hi52:0, lo52:0, sma50:0, sma200:0, rsi:null, targetMean:null, analystUp:null, sig:null, trendSig:null }; });
        }).catch(function(){ return null; });
    }

    function loadBatch(syms, delay) {
      setTimeout(function() {
        Promise.all(syms.map(fetchSignal)).then(function(results) {
          var valid = results.filter(Boolean);
          if (valid.length > 0) {
            loaded = loaded.concat(valid);
            window.__tickerSignals = loaded.slice(); setTickerSignals(window.__tickerSignals);
          }
        });
      }, delay);
    }

    loadBatch(FREE, 100);

    fetch("/cache?action=stats")
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (!d || !d.keys) return;
        var seen = {}; var cached = [];
        d.keys.forEach(function(k) {
          if (!k.key) return;
          var hasFund = k.key.indexOf(":ai-fund") !== -1;
          var hasOld  = k.key.indexOf(":aiinsight") !== -1;
          if (hasFund || hasOld) {
            var sym = k.key.replace("insight:","").replace(":ai-fund","").replace(":aiinsight","");
            if (!seen[sym] && FREE.indexOf(sym)===-1) { seen[sym]=true; cached.push(sym); }
          }
        });
        var BATCH = 20;
        for (var bi=0; bi<cached.length; bi+=BATCH) {
          loadBatch(cached.slice(bi, bi+BATCH), 2000 + (bi/BATCH)*2000);
        }
      }).catch(function(){});
  }, []);

  // Fetch news for top Exceptional/Good tickers when signals load
  useEffect(function() {
    if (tickerSignals.length === 0) return;
    var top = tickerSignals.slice(0, 4);
    var hdrs = window.__clerkToken ? { "Authorization": "Bearer " + window.__clerkToken } : {};
    Promise.all(top.map(function(sig) {
      return fetch("/massive?sym=" + sig.sym, { headers: hdrs })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          var news = d && d.news ? d.news : [];
          return news.slice(0, 5).map(function(n) {
            return { sym: sig.sym, title: n.title, source: n.source, url: n.article_url || n.url || "", date: n.published_utc || n.date || "" };
          });
        })
        .catch(function() { return []; });
    })).then(function(results) {
      var combined = [].concat.apply([], results);
      combined.sort(function(a, b) { return new Date(b.date||0) - new Date(a.date||0); });
      setLandingNews(combined);
    });
  }, [tickerSignals]);

  // (tickerEnrich replaced by per-ticker enrichment in fetchSignal)

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

  useEffect(function() {
    document.title = "nervousgeek.com";
  }, []);

  // Remount UserButton when returning to landing page (hashSym becomes null)
  useEffect(function() {
    if (hashSym) return; // only on landing page
    if (!clerkUser || !window.Clerk) return;
    var t = setTimeout(function() {
      var el = document.getElementById("clerk-user-button-landing");
      if (el) {
        el.dataset.mounted = "";
        try { window.Clerk.mountUserButton(el); el.dataset.mounted = "1"; }
        catch(e) { console.warn("UserButton remount failed:", e); }
      }
    }, 80);
    return function() { clearTimeout(t); };
  }, [hashSym, clerkUser]);

  function go(sym) {
    var s = (sym || input).toUpperCase().trim();
    if (!s) return;
    setFocused(false);
    window.location.hash = s;
  }

  window.__showUpgrade = function(){ setShowUpgrade(true); };
  if (showUpgrade) {
    return <UpgradePage onBack={function(){ setShowUpgrade(false); }} clerkUser={clerkUser} />;
  }

  if (hashSym === "SCREENER") {
    return <Screener />;
  }

  if (hashSym === "SIMULATOR") {
    return <SimulatorPage />;
  }

  if (hashSym === "JOURNAL") {
  return <JournalPage />;
}


  if (hashSym) {
    var _onBack = function() { window.location.hash = ""; };
    var _isFree     = FREE_TICKERS.indexOf(hashSym) !== -1;
    var _isInSP500  = !!NAMES[hashSym];
    var _isSignedIn = !!clerkUser;
    // Tier 1: Not signed in -> free tickers only, paywall for rest
    // Tier 2: Signed in (free) -> all S&P 500, paywall for non-S&P500
    // Tier 3: Signed in + paid -> any ticker on any exchange
    // Tier 4: Admin -> everything
    if (!_isFree && !_isSignedIn) {
      return (
        <PaywallCard
          sym={hashSym}
          name={NAMES[hashSym]}
          onBack={_onBack}
          clerkLoaded={clerkLoaded}
          isPaid={isPaid}
          clerkUser={clerkUser}
          mode="signin"
        />
      );
    }
    if (_isSignedIn && !_isInSP500 && !isPaid) {
      return (
        <PaywallCard
          sym={hashSym}
          name={hashSym}
          onBack={_onBack}
          clerkLoaded={clerkLoaded}
          isPaid={isPaid}
          clerkUser={clerkUser}
          mode="upgrade"
        />
      );
    }
    return (
      <Detail
        sym={hashSym}
        name={NAMES[hashSym] || hashSym}
        onBack={_onBack}
        clerkUser={clerkUser}
        isPaid={isPaid}
        isCancelling={isCancelling}
        periodEnd={periodEnd}
        supported={_isInSP500 || isPaid}
      />
    );
  }

  const allStocks = Object.keys(NAMES).map(function(k) { return { symbol:k, name:NAMES[k] }; });
  const sugg = (input.length > 0 && focused)
    ? allStocks.filter(function(s) {
        var q = input.toLowerCase();
        return s.symbol.toLowerCase().startsWith(q) || (q.length >= 3 && s.name.toLowerCase().includes(q));
      }).slice(0, 6)
    : [];


  return (
    <div style={{ minHeight:"100vh", background:BG, fontFamily:FONT, position:"relative", overflow:"hidden" }}>

      {/* Top glow */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 70% 50% at 50% -10%,rgba(200,240,0,0.07) 0%,transparent 70%)",
      }} />

      {/* Nav */}
      <nav style={{ position:"relative", zIndex:10, padding:"0 32px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {(function() {
          if (!clerkLoaded) return null;
          if (clerkUser) {
            return (
              <div style={{ position:"absolute", right:32, top:"50%", transform:"translateY(-50%)", display:"flex", alignItems:"center", gap:8 }}>
                {isPaid ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer" }}
                    onClick={function(){
                      var hdrs = window.__clerkToken ? { "Authorization": "Bearer " + window.__clerkToken } : {};
                      fetch("/stripe?action=portal", { headers: hdrs })
                        .then(function(r){ return r.json(); })
                        .then(function(d){ if (d.url) window.location.href = d.url; });
                    }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"#1a1a14", background:LIME, padding:"3px 10px", borderRadius:10 }}>PREMIUM</span>
                    <span style={{ fontSize:9, color:LIME, opacity:0.7 }}>Manage Plan</span>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer" }}
                    onClick={function(){ setShowUpgrade(true); }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"#0e0e0c", background:"#ffffff", padding:"3px 10px", borderRadius:10 }}>MEMBER</span>
                    <span style={{ fontSize:9, color:"#ffffff", opacity:0.7 }}>Upgrade</span>
                  </div>
                )}
                <div id="clerk-user-button-landing"></div>
              </div>
            );
          }
          return (
            <button
              onClick={function() {
                if (window.Clerk) {
                  try { window.Clerk.openSignIn({}); }
                  catch(e) { window.location.href = "https://accounts.nervousgeek.com/sign-in"; }
                }
              }}
              style={{ position:"absolute", right:32, top:"50%", transform:"translateY(-50%)", background:"#c8f000", color:"#0e0e0c", border:"none", borderRadius:20, padding:"7px 18px", fontWeight:700, fontSize:12, fontFamily:FONT, cursor:"pointer" }}>
              Sign In
            </button>
          );
        })()}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <svg width="24" height="24" viewBox="0 0 110 110">
            <path d="M55 10 L96 33 L96 77 L55 100 L14 77 L14 33 Z" fill="none" stroke={LIME} strokeWidth="3"/>
            <circle cx="36" cy="52" r="18" fill="#0e0e0c" stroke={LIME} strokeWidth="3"/>
            <circle cx="74" cy="52" r="18" fill="#0e0e0c" stroke={LIME} strokeWidth="3"/>
            <circle cx="36" cy="52" r="6" fill={LIME}/>
            <circle cx="74" cy="52" r="6" fill={LIME}/>
            <line x1="48" y1="76" x2="62" y2="76" stroke={LIME} strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            <span style={{ fontSize:17, fontWeight:900, letterSpacing:0, lineHeight:1.2 }}><span style={{ color:"#ffffff" }}>nervous</span><span style={{ color:LIME }}>geek</span></span>
            <span style={{ fontSize:9, color:"rgba(200,240,0,0.4)", fontWeight:500, letterSpacing:"0.02em", lineHeight:1 }}>v2.66</span>
          </div>
        </div>

      </nav>

      {/* Scrolling AI Signal Ticker Bar - header */}
      {/* Hero */}
      <div style={{ position:"relative", zIndex:5, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:70, paddingBottom:100 }}>

        {/* Headline */}
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={{ fontSize:42, fontWeight:900, color:"#ffffff", letterSpacing:"-1.5px" }}>Know more.</div>
          <div style={{ fontSize:42, fontWeight:900, color:LIME, letterSpacing:"-1.5px" }}>Fear less.</div>
        </div>

        <p style={{ fontSize:14, color:"#a09a8a", textAlign:"center", maxWidth:500, lineHeight:1.75, margin:"0 0 40px" }}>
          {"AI-powered stock intelligence for long-term thinkers. Not a trading app. Not financial advice " + String.fromCharCode(0x2014) + " just observation to manage personal risk."}
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
                    onMouseDown={function(e) { e.preventDefault(); go(s.symbol); }}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 18px", cursor:"pointer", borderBottom:"1px solid #2c2c26" }}
                    onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(200,240,0,0.10)"; }}
                    onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontWeight:800, fontSize:12, color:BG, background:LIME, padding:"2px 8px", borderRadius:4, minWidth:48, textAlign:"center" }}>{s.symbol}</span>
                      <span style={{ fontSize:13, color:"#a09a8a" }}>{s.name}</span>
                    </div>
                    <span style={{ color:"#6a6460", fontSize:12 }}>{">"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Free tickers section */}
        <div style={{ marginTop:32, width:"100%", maxWidth:580, textAlign:"center" }}>
          {/* Not signed in: show 10 free tickers + faded locked + sign in */}
          {!clerkUser && (
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:16 }}>
                <div style={{ height:1, flex:1, background:"rgba(200,240,0,0.15)" }}></div>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:LIME, display:"inline-block" }}></span>
                  <span style={{ fontSize:11, fontWeight:700, color:LIME, letterSpacing:"0.12em", textTransform:"uppercase" }}>10 Free Stocks</span>
                </div>
                <div style={{ height:1, flex:1, background:"rgba(200,240,0,0.15)" }}></div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:16 }}>
                {FREE_TICKERS.map(function(t) {
                  return (
                    <button key={t} onClick={function() { go(t); }}
                      style={{ padding:"6px 18px", borderRadius:20, border:"1px solid #2c2c26", background:"#1a1a16", fontSize:13, color:"#a09a8a", cursor:"pointer", fontFamily:FONT }}
                      onMouseEnter={function(e) { e.currentTarget.style.background=BG; e.currentTarget.style.color=LIME; e.currentTarget.style.borderColor=LIME; }}
                      onMouseLeave={function(e) { e.currentTarget.style.background="#1a1a16"; e.currentTarget.style.color="#a09a8a"; e.currentTarget.style.borderColor="#2c2c26"; }}>
                      {t}
                    </button>
                  );
                })}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, maxWidth:400, margin:"0 auto 10px" }}>
                <div style={{ flex:1, height:1, background:"#1e1e18" }}></div>
                <span style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:"0.1em", whiteSpace:"nowrap" }}>{"+ 490 more with sign in"}</span>
                <div style={{ flex:1, height:1, background:"#1e1e18" }}></div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:16, opacity:0.25 }}>
                {["NFLX","AMD","JPM","BAC","GS","XOM","COST","MA","V","WMT"].map(function(t) {
                  return <span key={t} style={{ padding:"6px 18px", borderRadius:20, border:"1px solid #2c2c26", background:"#1a1a16", fontSize:13, color:"#a09a8a" }}>{t}</span>;
                })}
              </div>
              <button
                onClick={function() { if(window.Clerk){ try{ window.Clerk.openSignIn({}); } catch(e){ window.location.href="https://accounts.nervousgeek.com/sign-in"; } } }}
                style={{ background:LIME, color:"#0e0e0c", border:"none", borderRadius:24, padding:"10px 32px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:FONT }}>
                {"Sign in to unlock all 500"}
              </button>
            </div>
          )}

          {/* Signed in, NOT paid: S&P 500 unlocked + faded non-S&P + upgrade */}
          {clerkUser && !isPaid && (
            <div>
              <div style={{ fontSize:12, marginBottom:14 }}>
                <span style={{ color:LIME, fontWeight:700 }}>{"All S&P 500 companies unlocked " + String.fromCharCode(0x2713)}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, maxWidth:420, margin:"0 auto 10px" }}>
                <div style={{ flex:1, height:1, background:"#1e1e18" }}></div>
                <span style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:"0.1em", whiteSpace:"nowrap" }}>All US Stocks</span>
                <div style={{ flex:1, height:1, background:"#1e1e18" }}></div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:16, opacity:0.25 }}>
                {["SMCI","ARM","PLTR","RIVN","LCID","SOFI","MSTR","COIN","HOOD","IONQ"].map(function(t) {
                  return <span key={t} style={{ padding:"6px 18px", borderRadius:20, border:"1px solid #2c2c26", background:"#1a1a16", fontSize:13, color:"#a09a8a" }}>{t}</span>;
                })}
              </div>
              <button
                onClick={function(){ setShowUpgrade(true); }}
                style={{ background:LIME, color:"#0e0e0c", border:"none", borderRadius:24, padding:"10px 32px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:FONT }}>
                {"Upgrade to unlock all US stocks & AI Feature"}
              </button>
            </div>
          )}

          {/* Signed in + paid: full access */}
          {clerkUser && isPaid && (
            <div>
              <div style={{ fontSize:12, marginBottom:8 }}>
                <span style={{ color:LIME, fontWeight:700 }}>{"All S&P 500 companies unlocked " + String.fromCharCode(0x2713)}</span>
              </div>
              <div style={{ fontSize:12 }}>
                <span style={{ color:LIME, fontWeight:700 }}>{"All US companies unlocked " + String.fromCharCode(0x2713)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Favourites + Market News */}
      {tickerSignals.length > 0 && (
        <div style={{ position:"relative", zIndex:5, padding:"0 32px 140px", maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28 }}>
            <div style={{ flex:1, height:1, background:"rgba(200,240,0,0.1)" }}></div>
            <span style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:"0.12em", whiteSpace:"nowrap" }}>AI Intelligence</span>
            <div style={{ flex:1, height:1, background:"rgba(200,240,0,0.1)" }}></div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:32 }}>

            {/* AI Favourites */}
            <div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, color:LIME, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>AI Favourites for the Week</div>
                <div style={{ fontSize:12, color:"#555" }}>Stocks our AI rated Exceptional or Good in the last 7 days</div>
              </div>
              <div style={{ border:"1px solid #1e1e18", borderRadius:10, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"70px 1fr 1fr 1fr 1.6fr 1fr 1fr 1.2fr 1.4fr", columnGap:20, rowGap:0, background:"#161614", borderBottom:"1px solid #222", padding:"8px 14px" }}>
                  {["Ticker","Moat","Fin.","IV Disc.","52W Range","Trend","Momentum","Reversal","Money Flow"].map(function(h,i) {
                    return <div key={i} style={{ fontSize:9, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</div>;
                  })}
                </div>
                {(function() {
                  // Compact display label helpers — UI mapping only, no technical calculation
                  function cRevLbl(status) {
                    if (!status) return String.fromCharCode(0x2014);
                    var sl = status.toLowerCase();
                    if (sl.indexOf('no clear')!==-1 || sl==='not enough data') return String.fromCharCode(0x2014);
                    if (sl.indexOf('spark')!==-1)      return 'Spark';
                    if (sl.indexOf('confirming')!==-1) return 'Confirming';
                    if (sl.indexOf('confirmed')!==-1&&sl.indexOf('bull')!==-1) return 'Confirmed';
                    if (sl.indexOf('triggered')!==-1&&sl.indexOf('bull')!==-1) return 'Triggered';
                    if (sl.indexOf('forming')!==-1&&sl.indexOf('bull')!==-1)   return 'Forming';
                    if (sl.indexOf('watch')!==-1&&sl.indexOf('bull')!==-1)     return 'Bull Watch';
                    if (sl.indexOf('confirmed')!==-1&&sl.indexOf('bear')!==-1) return 'Bear Conf.';
                    if (sl.indexOf('triggered')!==-1&&sl.indexOf('bear')!==-1) return 'Bear Trig.';
                    if (sl.indexOf('forming')!==-1&&sl.indexOf('bear')!==-1)   return 'Bear Form.';
                    if (sl.indexOf('watch')!==-1&&sl.indexOf('bear')!==-1)     return 'Bear Watch';
                    if (sl.indexOf('mixed')!==-1) return 'Mixed';
                    return status;
                  }
                  function cSmfLbl(status) {
                    if (!status) return String.fromCharCode(0x2014);
                    var sl = status.toLowerCase();
                    if (sl.indexOf('no clear')!==-1||sl.indexOf('no sustained')!==-1) return String.fromCharCode(0x2014);
                    if (sl.indexOf('strong accumulation')!==-1) return 'Strong Accum.';
                    if (sl.indexOf('steady accumulation')!==-1) return 'Steady Accum.';
                    if (sl.indexOf('long-term accumulation')!==-1) return 'LT Accum.';
                    if (sl.indexOf('early accumulation')!==-1) return 'Early Accum.';
                    if (sl.indexOf('mixed flow')!==-1) return 'Mixed Flow';
                    if (sl.indexOf('cooling accumulation')!==-1) return 'Cooling';
                    if (sl.indexOf('short-term flow spike')!==-1) return 'ST Spike';
                    if (sl.indexOf('short-term flow watch')!==-1) return 'ST Watch';
                    if (sl.indexOf('strong multi')!==-1) return 'Strong Flow';
                    if (sl.indexOf('accumulation trend')!==-1) return 'Accumulating';
                    if (sl.indexOf('early accumulation')!==-1) return 'Early Accum.';
                    if (sl.indexOf('constructive')!==-1) return 'Constructive';
                    if (sl.indexOf('short-term spike')!==-1) return 'ST Spike';
                    return status.length > 16 ? status.slice(0,14) + String.fromCharCode(0x2026) : status;
                  }
                  return tickerSignals.map(function(sig, i) {
                  var price    = sig.price || 0;
                  var hi52     = sig.hi52  || 0;
                  var lo52     = sig.lo52  || 0;
                  var rangePct = (hi52>lo52&&price>0)?Math.min(100,Math.max(0,((price-lo52)/(hi52-lo52))*100)):null;
                  var sma50    = sig.sma50  || 0;
                  var sma200   = sig.sma200 || 0;
                  // Use cached detail-page trend/momentum if available (1-day TTL, exact formula)
                  var ts = sig.trendSig || {};
                  var sd = sig.sig || {};
                  // Only show Reversal if sourced from Massive data (detail page visit)
                  // Yahoo-derived reversal is unreliable — no RSI/MACD/WSMA history
                  var _revToShow = (ts.revSource !== 'yahoo') ? ts.revStatus : null;
                  var trendUp  = sma50>0&&sma200>0&&price>sma50&&sma50>sma200;
                  var trendUp  = sma50>0&&sma200>0&&price>sma50&&sma50>sma200;
                  var trendDn  = sma50>0&&sma200>0&&price<sma50&&sma50<sma200;
                  var trendColor = trendUp?"#7abd00":trendDn?"#e05050":"#888";
                  var trendLabel = trendUp?String.fromCharCode(0x2191)+" Up":trendDn?String.fromCharCode(0x2193)+" Down":sma50>0?String.fromCharCode(0x2192)+" Mixed":String.fromCharCode(0x2014);
                  var rsi      = sig.rsi;
                  var momLabel = rsi===null?String.fromCharCode(0x2014):rsi>70?"Overbought":rsi>=55?"Strong":rsi>=45?"Neutral":rsi>=30?"Weak":"Oversold";
                  var momColor = rsi===null?"#555":rsi>70?"#EF9F27":rsi>=55?"#7abd00":rsi>=45?"#888":rsi>=30?"#e07020":"#60b8f0";
                  // Override with cached detail-page values if present
                  if (ts.trendLabel) {
                    var tl = ts.trendLabel.toLowerCase();
                    trendLabel = ts.trendLabel;
                    trendColor = (tl==="strong uptrend"||tl==="uptrend") ? "#7abd00" : tl==="sideways" ? "#EF9F27" : (tl==="downtrend"||tl==="strong downtrend") ? "#e05050" : "#888";
                  }
                  if (ts.momLabel) {
                    var ml = ts.momLabel.toLowerCase();
                    momLabel = ts.momLabel;
                    momColor = (ml==="strong"||ml==="building") ? "#7abd00" : ml==="neutral" ? "#EF9F27" : (ml==="fading"||ml==="weak"||ml==="very weak") ? "#e05050" : "#888";
                  }
                  var moatLbl  = sd.moat || null;
                  var finLbl   = sd.fin  || null;
                  var ivDisc   = sd.ivDiscount != null ? sd.ivDiscount : null;
                  var ivPrice  = sd.iv   || null;
                  function sigColor(lbl) {
                    if (!lbl) return "#555";
                    var l = lbl.toLowerCase();
                    if (l==="wide"||l==="strong"||l==="exceptional") return "#7abd00";
                    if (l==="moderate"||l==="good") return "#EF9F27";
                    return "#e05050";
                  }
                  return (
                    <div key={i}
                      onClick={function(){ window.location.hash = sig.sym; }}
                      style={{ display:"grid", gridTemplateColumns:"70px 1fr 1fr 1fr 1.6fr 1fr 1fr 1.2fr 1.4fr", columnGap:20, rowGap:0, padding:"10px 14px", borderBottom:i<tickerSignals.length-1?"1px solid #1a1a16":"none", cursor:"pointer", alignItems:"center", background:"#111" }}
                      onMouseEnter={function(e){ e.currentTarget.style.background="#161614"; }}
                      onMouseLeave={function(e){ e.currentTarget.style.background="#111"; }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:900, color:LIME }}>{sig.sym}</div>
                        <div style={{ fontSize:9, color:"#444", marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:58 }}>{price>0?"$"+price.toFixed(2):""}</div>
                      </div>
                      {/* Moat */}
                      <div style={{ fontSize:11, fontWeight:700, color:sigColor(moatLbl) }}>{moatLbl||String.fromCharCode(0x2014)}</div>
                      {/* Financial Strength */}
                      <div style={{ fontSize:11, fontWeight:700, color:sigColor(finLbl) }}>{finLbl||String.fromCharCode(0x2014)}</div>
                      {/* IV Discount */}
                      <div>
                        {ivDisc!==null?(
                          <div>
                            <div style={{ fontSize:11, fontWeight:700, color:ivDisc>0?"#7abd00":"#e05050" }}>
                              {(ivDisc>0?"+":"")+ivDisc.toFixed(0)+"%"}
                            </div>
                            <div style={{ fontSize:9, color:"#444", marginTop:1 }}>{ivPrice?"$"+parseFloat(ivPrice).toFixed(0):""}</div>
                          </div>
                        ):<span style={{ fontSize:11, color:"#444" }}>{String.fromCharCode(0x2014)}</span>}
                      </div>
                      {/* 52W Range */}
                      <div>
                        {rangePct!==null?(
                          <div>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                              <span style={{ fontSize:9, color:"#444" }}>{lo52>0?"$"+lo52.toFixed(0):""}</span>
                              <span style={{ fontSize:9, color:"#888", fontWeight:700 }}>{rangePct.toFixed(0)+"%"}</span>
                              <span style={{ fontSize:9, color:"#444" }}>{hi52>0?"$"+hi52.toFixed(0):""}</span>
                            </div>
                            <div style={{ height:4, background:"#1e1e18", borderRadius:3, position:"relative" }}>
                              <div style={{ position:"absolute", left:0, top:0, height:"100%", width:rangePct+"%", background:"#555", borderRadius:3 }}></div>
                              <div style={{ position:"absolute", top:"-3px", height:10, width:3, background:"#fff", borderRadius:1, left:"calc("+rangePct+"% - 1px)", zIndex:1 }}></div>
                            </div>
                          </div>
                        ):<span style={{ fontSize:11, color:"#444" }}>{String.fromCharCode(0x2014)}</span>}
                      </div>
                      {/* Trend */}
                      <div style={{ fontSize:11, fontWeight:700, color:trendColor }}>{trendLabel}</div>
                      {/* Momentum */}
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:momColor }}>{momLabel}</div>
                        {rsi!==null && !ts.momLabel && <div style={{ fontSize:9, color:"#444", marginTop:1 }}>{"RSI "+rsi.toFixed(0)}</div>}
                      </div>
                      {/* Reversal — compact label; colour from canonical revStatusColor() matching tab + sidebar */}
                      <div style={{ fontSize:10, fontWeight:700, color:revStatusColor(_revToShow, "main") }}>
                        {cRevLbl(_revToShow)}
                      </div>
                      {/* Money Flow — compact label; colour from canonical smfStatusColor() matching tab + sidebar */}
                      <div style={{ fontSize:10, fontWeight:700, color:smfStatusColor(ts.smfStatus, "main") }}>
                        {cSmfLbl(ts.smfStatus)}
                      </div>
                    </div>
                  );
                  });})()}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)", margin:"8px 0" }}></div>

            {/* Market News */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
                <div>
                  <div style={{ fontSize:10, color:"#60b8f0", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Market News</div>
                  <div style={{ fontSize:12, color:"#555" }}>Latest from AI-rated stocks</div>
                </div>
                {/* Dropdown filter */}
                {landingNews.length > 0 && (
                  <select
                    value={newsFilter}
                    onChange={function(e){ setNewsFilter(e.target.value); }}
                    style={{ fontSize:11, fontWeight:600, padding:"5px 10px", borderRadius:8, border:"1px solid #333", background:"#1a1a14", color:"#60b8f0", fontFamily:FONT, cursor:"pointer", outline:"none" }}>
                    <option value="ALL">All Companies</option>
                    {tickerSignals.map(function(s) {
                      return <option key={s.sym} value={s.sym}>{s.sym + " — " + (NAMES[s.sym] || s.sym)}</option>;
                    })}
                  </select>
                )}
              </div>
              {landingNews.length === 0 && (
                <div style={{ fontSize:11, color:"#333", padding:"10px 0" }}>Loading news...</div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:8 }}>
                {landingNews.filter(function(n){ return newsFilter === "ALL" || n.sym === newsFilter; }).slice(0, 12).map(function(n, i) {
                  return (
                    <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                      style={{ display:"block", padding:"10px 12px", background:"#111", border:"1px solid #1e1e18", borderRadius:8, textDecoration:"none" }}
                      onMouseEnter={function(e){ e.currentTarget.style.borderColor="#333"; }}
                      onMouseLeave={function(e){ e.currentTarget.style.borderColor="#1e1e18"; }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:800, color:"#60b8f0" }}>{n.sym}</span>
                        <span style={{ fontSize:10, color:"#444" }}>{n.source}</span>
                      </div>
                      <div style={{ fontSize:12, color:"#c0bbb4", lineHeight:1.45, marginBottom:3 }}>{n.title}</div>
                      <div style={{ fontSize:10, color:"#444" }}>
                        {n.date ? new Date(n.date).toLocaleDateString("en-AU", { day:"numeric", month:"short" }) : ""}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Sticky disclaimer footer */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:100,
        background:"#111",
        borderTop:"1px solid #333",
      }}>
        <div id="lp-disc-full"
          onClick={function(){ var d=document.getElementById("lp-disc-full"); if(d) d.style.display="none"; var t=document.getElementById("lp-disc-tap"); if(t) t.innerText="tap to read"; }}
          style={{
            display:clerkUser?"none":"block",
            maxHeight:"50vh",
            overflowY:"auto",
            padding:"14px 20px",
            borderBottom:"0.5px solid #333",
            background:"#111",
            cursor:"pointer",
          }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:600, color:"#F05A1A", textTransform:"uppercase", letterSpacing:"0.06em" }}>Disclaimer</span>
            <button
              onClick={function(){ var d=document.getElementById("lp-disc-full"); if(d) d.style.display="none"; var t=document.getElementById("lp-disc-tap"); if(t) t.innerText="tap to read"; }}
              style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#666", lineHeight:1, padding:"0 2px" }}>
              {String.fromCharCode(0xD7)}
            </button>
          </div>
          <div style={{ fontSize:11, color:"#aaa", lineHeight:1.8 }}>
            {"nervousgeek.com is a private, community-focused platform created to share educational content about investing and financial markets. Any fees collected are used to support the operating costs of the platform and the time and effort required to maintain and improve the service. All analysis, ratings, tools, and AI-generated insights provided on this website are for general informational and educational purposes only. They do not constitute financial product advice, investment advice, or any form of professional advice. The content on this website does not take into account your individual financial situation, objectives, or needs. Before making any investment decision, you should conduct your own research and consider seeking advice from a licensed financial adviser. Past performance is not a reliable indicator of future results. Market data provided by third-party sources, including Yahoo Finance and Massive.com, may be delayed, incomplete, or inaccurate. While reasonable efforts are made to ensure information accuracy, nervousgeek.com makes no representation or warranty regarding the completeness, reliability, or accuracy of the information provided. Use of this website and reliance on any information contained within it is entirely at your own risk. Some insights and analysis on this platform may be generated with the assistance of artificial intelligence, including models developed by Anthropic (Claude). "}{String.fromCharCode(0xA9)}{" nervousgeek.com 2026. All rights reserved."}
          </div>
        </div>
        <div
          style={{ padding:"7px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}
          onClick={function(){
            var d=document.getElementById("lp-disc-full");
            var t=document.getElementById("lp-disc-tap");
            if(d){
              var open=d.style.display!=="none";
              d.style.display=open?"none":"block";
              if(t) t.innerText=open?"tap to read":"tap to close";
            }
          }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:14, height:14, borderRadius:"50%", background:"#222", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke={LIME} strokeWidth="1.2"/>
                <path d="M6 5v4M6 3.5v.5" stroke={LIME} strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize:10, fontWeight:600, color:LIME, textTransform:"uppercase", letterSpacing:"0.06em" }}>General information only -- not financial advice</span>
          </div>
          <span id="lp-disc-tap" style={{ fontSize:10, color:"#555" }}>{clerkUser ? "tap to read" : "tap to close"}</span>
        </div>
      </div>
    </div>
  );
}
