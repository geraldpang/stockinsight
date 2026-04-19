import { useState, useEffect } from "react";

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

function Detail({ sym, name, onBack, clerkUser, supported, isPaid }) {
  var isAdmin = !!(clerkUser && clerkUser.publicMetadata && clerkUser.publicMetadata.role === "admin");
  // Unsupported ticker -- show friendly message
  if (supported === false) {
    return (
      <div style={{ minHeight:"100vh", background:"#0e0e0c", fontFamily:FONT, display:"flex", flexDirection:"column" }}>
        <nav style={{ height:52, padding:"0 24px", display:"flex", alignItems:"center", gap:12, background:LIME }}>
          <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#0e0e0c", fontWeight:800, fontSize:13, fontFamily:FONT }}>
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
            <button onClick={onBack} style={{ width:"100%", padding:"14px", borderRadius:50, border:"none", background:LIME, color:"#0e0e0c", fontWeight:800, fontSize:14, fontFamily:FONT, cursor:"pointer" }}>
              Back to search
            </button>
          </div>
        </div>
      </div>
    );
  }
  const [__err, set__err] = useState(null);

  const [navInput,  setNavInput]  = useState("");
  const [navFocus,  setNavFocus]  = useState(false);
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
  const [adminCfg,      setAdminCfg]      = useState(null);
  const [adminStats,    setAdminStats]    = useState({});
  const [mobilePanel,   setMobilePanel]   = useState("left"); // "left" | "right"
  const [chartCollapsed, setChartCollapsed] = useState(false);
  const [aiFundResult,  setAiFundResult]  = useState(null); // { verdict, confidence, strength, risk, summary, dataSnapshot }
  const [aiFundLoading, setAiFundLoading] = useState(false);
  const [aiFundCachedAt,setAiFundCachedAt]= useState(null);
  const [aiTechResult,  setAiTechResult]  = useState(null); // { verdict, stVerdict, confidence, keyLevel, summary, dataSnapshot }
  const [aiTechLoading, setAiTechLoading] = useState(false);
  const [aiTechCachedAt,setAiTechCachedAt]= useState(null);

  // Expose computed financial strength for left panel pill
  // Will be set by financial tab when it renders
  if (!window.__computedFinStrength) window.__computedFinStrength = {};

  // -- AI Analysis (Fundamental + Technical) -----------------------------
  // Only for paid members. Two separate calls with different TTLs.
  function runFundAi(symA, ovA, parsedA, valsA, oracleA, priceA, insightCacheA) {
    if (!symA || !window.__isPaid) return;
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
          return;
        }
        var _ov = ovA;
        if (!_ov) { setAiFundLoading(false); window.__aiFundRunning = null; setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Fund ABORT: no ov for "+symA }]); }); return; }
        var moatR = Object.assign({}, parsedA["moat"]||{});
        var finR  = Object.assign({}, parsedA["financial"]||{});
        var _moatRaw = (insightCacheA&&insightCacheA["moat"])||"";
        var _finRaw  = (insightCacheA&&insightCacheA["financial"])||"";
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
        var prompt =
          "You are a senior investment analyst providing an investment assessment for "+symA+(window.NAMES&&window.NAMES[symA]?" ("+window.NAMES[symA]+")":"")+".\n\n"+
          "Below is the latest financial data from our system. Use this data as your primary source. "+
          "Where data shows N/A it was unavailable from our feeds -- use your knowledge to fill gaps where appropriate.\n\n"+
          "COMPANY:\n"+
          "- Sector: "+(_ov.sector||"N/A")+"\n"+
          "- Industry: "+(_ov.industry||"N/A")+"\n"+
          "- Market Cap: "+sfb(_ov.mc)+"\n"+
          "- Employees: "+(_ov.employees?_ov.employees.toLocaleString():"N/A")+"\n\n"+
          "VALUATION:\n"+
          "- Current Price: $"+(priceA>0?priceA.toFixed(2):"N/A")+"\n"+
          "- Intrinsic Value (DCF models): "+ivPctStr+"\n"+
          "- P/E (TTM): "+sfx(_ov.pe)+"\n"+
          "- Forward P/E: "+sfx(_ov.fpe)+"\n"+
          "- EV/EBITDA: "+sfx(_ov.evEbitda)+"\n"+
          "- Price/Sales: "+sfx(_ov.ps)+"\n"+
          "- Price/Book: "+sfx(_ov.pb)+"\n"+
          "- Price/FCF: "+sfx(_ov.pFcf)+"\n"+
          "- PEG Ratio: "+sfn(_ov.peg)+"\n"+
          "- Dividend Yield: "+(_ov.divY>0?_ov.divY.toFixed(2)+"%":"None")+"\n\n"+
          "ECONOMIC MOAT: "+(moatR.classification||"Unknown")+" ("+(moatR.score||0)+"/5)\n"+
          (moatR.sections&&moatR.sections.length>0?moatR.sections.map(function(s){return "- "+s.label+": "+s.score+"/5"+(s.body?" -- "+s.body:"");}).join("\n")+"\n":"")+
          (moatR.explanation?"- Explanation: "+moatR.explanation+"\n":"")+"\n"+
          "FINANCIAL STRENGTH: "+(finR.classification||"Unknown")+" ("+(finR.score||0)+"/5)\n"+
          "PROFITABILITY:\n"+
          "- Gross Margin: "+sfp(_ov.grossMargin)+"\n"+
          "- Operating Margin: "+sfp(_ov.opMargin)+"\n"+
          "- Net Profit Margin: "+sfp(_ov.netMargin)+"\n"+
          "- Return on Equity: "+sfp(_ov.roe)+"\n"+
          "- Return on Assets: "+sfp(_ov.roic)+"\n"+
          "- Free Cash Flow: "+sfb(_ov.fcfRaw)+"\n"+
          "- Operating Cash Flow: "+sfb(_ov.ocfRaw)+"\n"+
          "- Net Income (TTM): "+sfb(_ov.niRaw)+"\n\n"+
          "GROWTH:\n"+
          "- Revenue Growth YoY: "+sfp(_ov.revGrowth)+"\n"+
          "- EPS Growth (TTM): "+sfp(_ov.epsG)+"\n"+
          "- LT EPS Growth Est (5yr): "+sfp(_ov.ltG)+"\n\n"+
          "BALANCE SHEET:\n"+
          "- Total Debt: "+sfb(_ov.totalDebt)+"\n"+
          "- Cash & Equivalents: "+sfb(_ov.cash)+"\n"+
          "- Debt/Equity: "+sfx(_ov.de)+"\n"+
          "- Current Ratio: "+sfx(_ov.currentRatio)+"\n"+
          "- Quick Ratio: "+sfx(_ov.quickRatio)+"\n"+
          "- Beta: "+sfn(_ov.beta)+"\n\n"+
          "ANALYST CONSENSUS:\n"+
          "- Buy: "+sfi(_ov.recBuy)+" | Hold: "+sfi(_ov.recHold)+" | Sell: "+sfi(_ov.recSell)+"\n"+
          "- Target Price (median): "+(_ov.targetMedian?"$"+_ov.targetMedian.toFixed(2):"N/A")+"\n"+
          (finR.body?"\nAI FINANCIAL ASSESSMENT (summary):\n"+finR.body.replace(/[*#_]/g,"").substring(0,400)+"\n":"")+
          "\nRespond in EXACTLY this format:\n"+
          "Fundamental Verdict: Strong Buy / Buy / Hold / Caution / Avoid\n"+
          "Confidence: Low / Medium / High\n"+
          "Key Strength: One sentence.\n"+
          "Key Risk: One sentence.\n"+
          "Summary (max 60 words): ...";
        setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Fund MISS: "+symA+" -- calling Claude" }]); });
        fetch("/anthropic",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:400, messages:[{role:"user",content:prompt}] }) })
          .then(function(r){ return r.json(); })
          .then(function(d2){
            var text=d2.content&&d2.content[0]?d2.content[0].text:"";
            function ex(re){var m=text.match(re);return m?m[1].trim():"";}
            var result={ verdict:ex(/Fundamental Verdict:\s*(.+)/), confidence:ex(/Confidence:\s*(.+)/), strength:ex(/Key Strength:\s*(.+)/), risk:ex(/Key Risk:\s*(.+)/), summary:ex(/Summary[^:]*:\s*([\s\S]+)/).slice(0,300), promptSent:prompt };
            setAiFundResult(result);
            setAiFundLoading(false);
            window.__aiFundRunning = null;
            fetch("/cache?sym="+symA+"&tab=ai-fund",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result)})
              .then(function(r){return r.json();})
              .then(function(wr){setAiFundCachedAt(wr.cachedAt||null);setDebugLog(function(p){return p.concat([{time:new Date().toISOString(),label:"AI Fund WRITE: "+symA+(wr.ok?" OK":" FAIL")}]);});});
          }).catch(function(e){ setAiFundLoading(false); window.__aiFundRunning = null; setDebugLog(function(p){return p.concat([{time:new Date().toISOString(),label:"AI Fund ERROR: "+e}]);}); });
      }).catch(function(e){ setAiFundLoading(false); window.__aiFundRunning = null; setDebugLog(function(p){return p.concat([{time:new Date().toISOString(),label:"AI Fund fetch error: "+e}]);}); });
  }

  function runTechAi(symA, massiveA, priceA, msDots2, msLabel2) {
    if (!symA || !window.__isPaid) return;
    if (window.__aiTechRunning === symA) return;
    window.__aiTechRunning = symA;
    setAiTechLoading(true);
    fetch("/cache?sym=" + symA + "&tab=ai-tech")
      .then(function(r){ return r.json(); })
      .then(function(d) {
        if (d && d.hit && d.value) {
          try {
            var cached = JSON.parse(d.value);
            setAiTechResult(cached);
            setAiTechCachedAt(d.cachedAt||null);
            setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Tech HIT: "+symA }]); });
          } catch(e) {}
          setAiTechLoading(false);
          window.__aiTechRunning = null;
          return;
        }
        var ind=massiveA.indicators||{};
        var rsi=ind.rsi14||0;
        var rsiCond=rsi>70?"Overbought":rsi<30?"Oversold":"Neutral";
        var sma50=ind.sma50||0; var sma200=ind.sma200||0;
        var macdH=ind.macdHistory&&ind.macdHistory.length>0?ind.macdHistory[0]:null;
        var macdDir=macdH?(macdH.histogram>0?"Bullish":"Bearish"):"Unknown";
        var pSma50=sma50>0&&priceA>0?((priceA-sma50)/sma50*100).toFixed(1):null;
        var pSma200=sma200>0&&priceA>0?((priceA-sma200)/sma200*100).toFixed(1):null;
        var rsiH=ind.rsiHistory||[]; var macdHist=ind.macdHistory||[]; var aggs=massiveA.aggs||[];
        var revNames=["RSI Base","MACD Turning","Volume Surge","MA Reclaim","Price Structure"];
        var revArr=[
          rsiH.length>=5&&rsiH[0]>rsiH[1]&&rsiH[1]<35,
          macdHist.length>=2&&macdHist[0].histogram>0&&macdHist[1].histogram<0,
          aggs.length>=2&&aggs[0].v>aggs[1].v*1.5,
          sma50>0&&priceA>sma50&&aggs.length>=2&&aggs[1].l<sma50,
          aggs.length>=5&&aggs[0].h>Math.max.apply(null,aggs.slice(1,5).map(function(a){return a.h;})),
        ];
        var activeRevs=revNames.filter(function(_,i){return revArr[i];});
        var tprompt="You are a senior technical analyst. Analyse "+symA+" based ONLY on the data below.\n\n"+
          "TREND:\n- Price: $"+(priceA||0).toFixed(2)+
          (pSma50?"\n- vs 50-day MA: "+(pSma50>0?"+":"")+pSma50+"% ("+(pSma50>0?"above":"below")+")":"")+
          (pSma200?"\n- vs 200-day MA: "+(pSma200>0?"+":"")+pSma200+"% ("+(pSma200>0?"above":"below")+")":"")+
          "\n\nMOMENTUM:\n- RSI: "+(rsi||"N/A")+" ("+rsiCond+")\n- MACD: "+macdDir+
          "\n- Market Signal: "+(msDots2*20)+"/100 -- "+(msLabel2||"Unknown")+
          "\n\nREVERSALS:\n- Active: "+(activeRevs.length>0?activeRevs.join(", "):"None")+
          "\n\nRespond in EXACTLY this format:\n"+
          "Technical Verdict: Strong Bullish / Bullish / Neutral / Bearish / Strong Bearish\n"+
          "Short-term (1-3m): Buy / Hold / Avoid\n"+
          "Confidence: Low / Medium / High\n"+
          "Key Level: One sentence on key support or resistance.\n"+
          "Summary (max 50 words): ...";
        setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Tech MISS: "+symA+" -- calling Claude" }]); });
        fetch("/anthropic",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:300,messages:[{role:"user",content:tprompt}]})})
          .then(function(r){return r.json();})
          .then(function(d2){
            var text=d2.content&&d2.content[0]?d2.content[0].text:"";
            function ex(re){var m=text.match(re);return m?m[1].trim():"";}
            var result={verdict:ex(/Technical Verdict:\s*(.+)/),stVerdict:ex(/Short-term[^:]*:\s*(.+)/),confidence:ex(/Confidence:\s*(.+)/),keyLevel:ex(/Key Level:\s*(.+)/),summary:ex(/Summary[^:]*:\s*([\s\S]+)/).slice(0,300),promptSent:tprompt};
            setAiTechResult(result);
            setAiTechLoading(false);
            window.__aiTechRunning = null;
            fetch("/cache?sym="+symA+"&tab=ai-tech",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result)})
              .then(function(r){return r.json();})
              .then(function(wr){setAiTechCachedAt(wr.cachedAt||null);setDebugLog(function(p){return p.concat([{time:new Date().toISOString(),label:"AI Tech WRITE: "+symA+(wr.ok?" OK":" FAIL")}]);});});
          }).catch(function(e){setAiTechLoading(false);window.__aiTechRunning=null;});
      }).catch(function(e){setAiTechLoading(false);window.__aiTechRunning=null;});
  }

  function runAiAnalysis(symA, ovA, massiveA, parsedA, valsA, oracleA, priceA, msDots2, msLabel2, insightCacheA) {
    runFundAi(symA, ovA, parsedA, valsA, oracleA, priceA, insightCacheA);
    if (massiveA) runTechAi(symA, massiveA, priceA, msDots2, msLabel2);
  }
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
      // If at least half the drivers parsed, use weighted score; else fall back to AI rating
      var score;
      if (weightUsed >= 0.5) {
        score = Math.round(weightedSum / weightUsed);
        score = Math.max(1, Math.min(5, score));
      } else {
        var mFallback = text.match(/Economic Moat Rating[^0-9]*([0-9])/);
        score = mFallback ? parseInt(mFallback[1], 10) : 0;
        if (!score) {
          if (text.indexOf("Wide") !== -1) score = 4;
          else if (text.indexOf("Narrow") !== -1) score = 3;
          else score = 1;
        }
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
    setQ(null); setOv(null); setEpsHistory(null); setEpsError(false); setInsightCache({}); setInsightLoading(false); setInsightTab("business"); setParsedInsights({}); setAddlInfo(null); setAddlLoading(false); setMassiveInfo(null); setDebugLog([]); setAiFundResult(null); setAiFundLoading(false); setAiFundCachedAt(null); setAiTechResult(null); setAiTechLoading(false); setAiTechCachedAt(null); window.__aiFundRunning=null; window.__aiTechRunning=null; if(window.__ivStore)delete window.__ivStore[sym]; window.__curOracle="0"; window.__curVals=[]; window.__curOv=null; window.__curMassive=null; setMsg("Fetching live data for " + sym + "..."); delete ovCache[sym]; delete qCache[sym];
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
      var aiTabs = ["moat", "financial", "aiinsight"];

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
        moat: "You are a professional equity research analyst. Analyze the economic moat of " + sym + " (" + (NAMES[sym]||sym) + ") using only well-known business fundamentals and observable financial indicators. Do not fabricate statistics or unsupported claims. Most companies do not have strong moats - scores of 4 or 5 should be rare." + _moatFinCtx + "\n\nReturn results in EXACTLY this format:\n\nNetwork Effects: X/5\nAssessment Criteria: The product or platform becomes more valuable as more users join.\nResult: One sentence explaining the score.\n\nSwitching Costs: X/5\nAssessment Criteria: Customers face difficulty, cost, or disruption when changing to competitors.\nResult: One sentence explaining the score.\n\nCost Advantage: X/5\nAssessment Criteria: The company can operate at lower cost or higher efficiency than competitors.\nResult: One sentence explaining the score.\n\nIntangible Assets: X/5\nAssessment Criteria: Brand, patents, intellectual property, regulatory licenses, or proprietary technology.\nResult: One sentence explaining the score.\n\nEfficient Scale: X/5\nAssessment Criteria: The market only supports a few profitable players due to high barriers to entry.\nResult: One sentence explaining the score.\n\nEcosystem Lock-in: X/5\nAssessment Criteria: Customers rely on multiple integrated products or services within the company ecosystem.\nResult: One sentence explaining the score.\n\nEconomic Moat Rating: X / 5\n\nExplanation (maximum 100 words): Summarize the main competitive advantages. Focus only on the most important moat drivers. Only assign 4-5 if advantages are clear, durable, and supported by financial performance.",
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
          // AI Analysis now triggered by polling useEffect
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
    if (!ov || !sym || !window.__isPaid) return;
    // Pre-load moat and financial so AI Analysis has them ready
    if (!insightCache["moat"] && !insightLoading)      fetchInsight("moat");
    if (!insightCache["financial"] && !insightLoading)  fetchInsight("financial");
  }, [ov, sym]);

  // -- AI Analysis trigger: poll every 2s until all data ready --
  useEffect(function() {
    if (!sym || !window.__isPaid) return;
    var attempts = 0;
    var maxAttempts = 30; // 60 seconds max
    var interval = setInterval(function() {
      attempts++;
      if (attempts > maxAttempts) { clearInterval(interval); return; }
      if (window.__aiFundRunning === sym || aiFundResult) { clearInterval(interval); return; }
      var _ic   = window.__insightCache || {};
      var _pi   = window.__parsedInsights || {};
      var _ov2  = window.__curOv || null;
      var _mass = window.__curMassive || null;
      if (!_ov2 || !_mass) return;
      var moatReady  = _pi["moat"] && _pi["moat"].classification;
      var _finCls    = _pi["financial"] && _pi["financial"].classification;
      var finReady   = _finCls && _finCls.replace(/[^a-zA-Z]/g,"").length > 2;
      var moatCached = _ic["moat"] && _ic["moat"].length > 10;
      var finCached  = _ic["financial"] && _ic["financial"].length > 10;
      if (!moatReady || !finReady || !moatCached || !finCached) return;
      clearInterval(interval);
      var curVals   = window.__curOracleSym === sym ? (window.__curVals || []) : [];
      var curOracle = window.__curOracleSym === sym ? (window.__curOracle || "0") : "0";
      var curPrice  = window.__curPrice  || (window.__curOv ? window.__curOv._price : 0) || 0;
      var curMsDots = window.__msDots2   || 0;
      var curMsLabel= window.__msLabel2  || "";
      setDebugLog(function(p){ return p.concat([{ time:new Date().toISOString(), label:"AI Fund trigger FIRED for "+sym, data:{ moatReady:!!moatReady, finReady:!!finReady, moatCached:!!moatCached, finCached:!!finCached, curPrice:curPrice } }]); });
      runAiAnalysis(sym, _ov2, _mass, _pi, curVals, curOracle, curPrice, curMsDots, curMsLabel, _ic);
    }, 2000);
    return function() { clearInterval(interval); };
  }, [sym]);

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
        var AI_TABS_LOG = ["moat","financial","aiinsight"];
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

  // -- Insight tab fetch -------------------------------------------------------
  function fetchInsight(tabId) {
    if (insightCache[tabId] || insightLoading) return;
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
        return "You are a professional equity research analyst. Analyze the economic moat of " + sym + " (" + (NAMES[sym]||sym) + ") using only well-known business fundamentals and observable financial indicators. Do not fabricate statistics or unsupported claims. Most companies do not have strong moats - scores of 4 or 5 should be rare." + _fc2 + "\n\nReturn results in EXACTLY this format:\n\nNetwork Effects: X/5\nAssessment Criteria: The product or platform becomes more valuable as more users join.\nResult: One sentence explaining the score.\n\nSwitching Costs: X/5\nAssessment Criteria: Customers face difficulty, cost, or disruption when changing to competitors.\nResult: One sentence explaining the score.\n\nCost Advantage: X/5\nAssessment Criteria: The company can operate at lower cost or higher efficiency than competitors.\nResult: One sentence explaining the score.\n\nIntangible Assets: X/5\nAssessment Criteria: Brand, patents, intellectual property, regulatory licenses, or proprietary technology.\nResult: One sentence explaining the score.\n\nEfficient Scale: X/5\nAssessment Criteria: The market only supports a few profitable players due to high barriers to entry.\nResult: One sentence explaining the score.\n\nEcosystem Lock-in: X/5\nAssessment Criteria: Customers rely on multiple integrated products or services within the company ecosystem.\nResult: One sentence explaining the score.\n\nEconomic Moat Rating: X / 5\n\nExplanation (maximum 100 words): Summarize the main competitive advantages. Focus only on the most important moat drivers. Only assign 4-5 if advantages are clear, durable, and supported by financial performance.";
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
        setInsightCache(function(prev) {
          var next = {};
          Object.keys(prev).forEach(function(k) { next[k] = prev[k]; });
          next[tabId] = text || "Analysis unavailable.";
          window.__insightCache = next;
          return next;
        });
        setInsightLoading(false);
      }).catch(function() {
        setInsightCache(function(prev) {
          var next = {};
          Object.keys(prev).forEach(function(k) { next[k] = prev[k]; });
          next[tabId] = "Analysis unavailable. Please try again.";
          window.__insightCache = next;
          return next;
        });
        setInsightLoading(false);
      });
  }

    const price = q ? q.price : 0;
  window.__curPrice = price;
  if (ov) { window.__curOv = ov; window.__curOv._price = price; }
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
                <span style={{ fontWeight:800, fontSize:15, color:"#1a1a14", whiteSpace:"nowrap" }}>nervousgeek</span>
                <span style={{ color:"rgba(0,0,0,0.35)", fontSize:12 }}>/ {sym}</span>
              </div>
              {/* Right panel cell -- Back + Search aligned to chart panel edge */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <button onClick={onBack} style={{ border:"1px solid rgba(0,0,0,0.2)", borderRadius:6, padding:"5px 12px", background:"rgba(0,0,0,0.08)", cursor:"pointer", fontSize:12, fontFamily:FONT, color:"#1a1a14", fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                  {"< Back"}
                </button>
                {SearchPill}
              </div>
              {/* Far right -- Avatar or Sign In */}
              <div style={{ paddingLeft:10 }}>
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

            {/* MOBILE */}
            <div className="nav-mobile" style={{ background:"#c8f000", padding:"8px 14px 7px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontWeight:800, fontSize:14, color:"#1a1a14" }}>nervousgeek.com</span>
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

      {/* Scrolling AI Signal Ticker Bar - header */}
      {window.__tickerSignals && window.__tickerSignals.length > 0 && (function() {
        var sigs = window.__tickerSignals || [];
        var speed = Math.max(20, sigs.length * 5);
        return (
          <div style={{ position:"relative", zIndex:10, background:"#0a0a08", borderBottom:"1px solid #1e1e18", height:28, overflow:"hidden", display:"flex", alignItems:"center", width:"100%", maxWidth:"100vw" }}>
            <style>{"@keyframes ng-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}"}</style>
            <div style={{ display:"inline-flex", alignItems:"center", whiteSpace:"nowrap", animation:"ng-ticker " + speed + "s linear infinite", willChange:"transform" }}>
              {sigs.concat(sigs).concat(sigs).concat(sigs).map(function(sig, i) {
                var isStrong = sig.verdict && sig.verdict.toLowerCase().indexOf("strong") !== -1;
                var col = isStrong ? "#c8f000" : "#60b8f0";
                var priceStr = sig.price > 0 ? "$" + sig.price.toFixed(2) : "";
                return (
                  <span key={i}
                    onClick={function(){ window.location.hash = sig.sym; }}
                    style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"0 24px", cursor:"pointer", flexShrink:0, lineHeight:"28px", borderRight:"1px solid #1e1e18" }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:col, display:"inline-block", flexShrink:0 }}></span>
                    <span style={{ fontSize:11, fontWeight:800, color:col }}>{sig.sym}</span>
                    {priceStr && <span style={{ fontSize:10, color:"#666" }}>{priceStr}</span>}
                  </span>
                );
              })}
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
              if (v.includes("avoid")) return { bg:"#2a1e1e", fg:"#e05050", border:"#4a2020", dot:"#e05050", dotEmpty:"#4a2020" };
              if (v.includes("narrow")||v.includes("moderate")||v.includes("bullish"))
                return { bg:"#1e2a1e", fg:"#7abd00", border:"#2a5020", dot:"#7abd00", dotEmpty:"#2a5020" };
              if (v.includes("neutral")||v.includes("fairly")||v==="hold"||v.startsWith("hold")||v==="premium")
                return { bg:"#2a2010", fg:"#EF9F27", border:"#4a3810", dot:"#EF9F27", dotEmpty:"#4a3810" };
              if (v==="exceptional"||v==="undervalued") return { bg:"#1e2a1e", fg:"#7abd00", border:"#2a5020", dot:"#7abd00", dotEmpty:"#2a5020" };
              if (v==="fairlyvalued"||v==="fair") return { bg:"#1e2a1e", fg:"#9acd50", border:"#2a4020", dot:"#9acd50", dotEmpty:"#2a4020" };
              if (v.includes("none")||v.includes("weak")||v.includes("bearish")||v.includes("overvalued"))
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
              return (
                <div onClick={props.tabId ? function(){ window.__goToTab && window.__goToTab(props.tabId); } : undefined} style={{ padding:"9px 12px", background: loading ? "#222" : c.bg, border:"0.5px solid " + (loading ? "#333" : c.border), borderRadius:8, opacity: loading ? 0.6 : 1, boxSizing:"border-box", minHeight:72, display:"flex", flexDirection:"column", cursor: props.tabId ? "pointer" : "default" }}>
                  <div style={{ fontSize:9, color: loading ? "#555" : c.fg, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5, opacity:0.8 }}>{props.label}</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flex:1 }}>
                    {props.loading
                      ? <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ width:7, height:7, borderRadius:"50%", border:"1.5px solid #333", borderTop:"1.5px solid #c8f000", animation:"spin 0.8s linear infinite" }}></div>
                          <span style={{ fontSize:10, color:"#555" }}>Loading...</span>
                        </div>
                      : <span style={{ fontSize:13, fontWeight:700, color: loading ? "#555" : c.fg }}>{loading ? "---" : props.value}</span>
                    }
                    {!loading && props.score > 0 && <Dots score={props.score} filled={c.dot} empty={c.dotEmpty} />}
                  </div>
                  {!loading && props.sublabel && <div style={{ fontSize:10, color:c.fg, marginTop:3, opacity:0.75, lineHeight:1.3 }}>{props.sublabel}</div>}
                  {loading && !props.loading && <div style={{ fontSize:10, color:"#555", marginTop:3 }}>&nbsp;</div>}
                </div>
              );
            }

            // -- Moat + Financial --
            var moatParsed = parsedInsights["moat"]     || {};
            var finParsed  = parsedInsights["financial"] || {};
            var moatRating = moatParsed.classification || null;
            var moatScore  = moatParsed.score || 0;
            var finRating  = finParsed.classification || null;
            var finScore   = finParsed.score || 0;
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
            var vol5b  = agg2.slice(0,5).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(agg2.slice(0,5).length,1);
            var vol20b = agg2.slice(0,20).reduce(function(s,a){return s+(a.v||0);},0)/Math.max(agg2.slice(0,20).length,1);
            var vr2 = vol20b > 0 ? vol5b/vol20b : 1;
            var msLabel = null; var msDots = 0; var msColors = pillColor(null);
            if (ind2 && p2) {
              function sc2(key) {
                var wsmaG = ind2.wsma10&&ind2.wsma40?(ind2.wsma10-ind2.wsma40)/ind2.wsma40*100:0;
                var s200g = ind2.sma200?(p2-ind2.sma200)/ind2.sma200*100:0;
                var crsG  = ind2.sma50&&ind2.sma200?(ind2.sma50-ind2.sma200)/ind2.sma200*100:0;
                var ema2g = ind2.ema20?(p2-ind2.ema20)/ind2.ema20*100:0;
                var r2=ind2.rsi14; var h2=ind2.macd?ind2.macd.histogram:null;
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
              var base2=0; ["wsma","sma200","cross","pos52","rsi","macd","ema20","vol"].forEach(function(k){base2+=(sc2(k)/5)*W2[k];});
              base2=Math.round(base2);
              var macdH2=ind2.macdHistory||[]; var mT2=macdH2.length>=3&&macdH2[0]&&macdH2[1]&&macdH2[2]&&macdH2[0].histogram<0&&macdH2[0].histogram>macdH2[1].histogram&&macdH2[1].histogram>macdH2[2].histogram;
              var rsiH2=ind2.rsiHistory||[]; var rsiB2=rsiH2.length>=3&&rsiH2.slice(0,5).every(function(v){return v!=null&&v>=28&&v<=52;});
              var lb2=pos2<0.20&&ind2.rsi14!=null&&ind2.rsi14>20&&ind2.rsi14<45;
              var rev2=[mT2,rsiB2,lb2].filter(Boolean).length;
              var bonus2=base2<50?Math.min(rev2*4,12):0;
              var final2=Math.min(base2+bonus2,base2<50?49:100);
              var vl2=final2>=70?"Strong Bullish":final2>=55?"Bullish":final2>=40?"Neutral":final2>=25?"Bearish":"Strong Bearish";
              msDots=final2>=70?5:final2>=55?4:final2>=40?3:final2>=25?2:1;
              msLabel=vl2+" ("+final2+")";
              msColors=pillColor(vl2);
              window.__msDots2 = msDots; window.__msLabel2 = vl2;
              window.__msDots=msDots; window.__msScore=final2;
            }

            // -- Reversal --
            var ind3=massiveInfo&&massiveInfo.indicators?massiveInfo.indicators:null;
            var aggs3=massiveInfo&&massiveInfo.aggs?massiveInfo.aggs:[];
            var price3=q?q.price:0;
            var ov3=ov||{}; var hi3=ov3.hi52||0; var lo3=ov3.lo52||0;
            var pos3=(hi3>0&&hi3-lo3)>0?(price3-lo3)/(hi3-lo3):0.5;
            var rsiH3=ind3?(ind3.rsiHistory||[]):[];
            var macdH3=ind3?(ind3.macdHistory||[]):[];
            var rsiDiv3=(function(){
              if (!ind3||rsiH3.length<10||aggs3.length<10) return false;
              var rPL=Math.min.apply(null,aggs3.slice(0,5).map(function(a){return a.l||0;}));
              var pPL=Math.min.apply(null,aggs3.slice(5,10).map(function(a){return a.l||0;}));
              var rRL=Math.min.apply(null,rsiH3.slice(0,5));
              var pRL=Math.min.apply(null,rsiH3.slice(5,10));
              return rPL<pPL&&rRL>pRL;
            })();
            var macdTurn3=(function(){
              if (macdH3.length<3) return false;
              var h0=macdH3[0]&&macdH3[0].histogram,h1=macdH3[1]&&macdH3[1].histogram,h2=macdH3[2]&&macdH3[2].histogram;
              return h0!=null&&h1!=null&&h2!=null&&h0<0&&h0>h1&&h1>h2;
            })();
            var weeklyCross3=ind3&&ind3.wsma10&&ind3.wsma40?(ind3.wsma10<ind3.wsma40&&Math.abs(ind3.wsma10-ind3.wsma40)/ind3.wsma40<0.05):false;
            var rsiBase3=rsiH3.length>=3?rsiH3.slice(0,5).every(function(v){return v!=null&&v>=28&&v<=52;}):false;
            var lowBase3=pos3<0.20&&ind3&&ind3.rsi14!=null&&ind3.rsi14>20&&ind3.rsi14<45;
            var revArr3=[rsiDiv3,macdTurn3,weeklyCross3,rsiBase3,lowBase3];
            var revCount3=revArr3.filter(Boolean).length;
            var revBg3=revCount3>=4?"#1e2a1e":revCount3>=2?"#1e2a1e":revCount3===1?"#2a2010":"#222";
            var revBorder3=revCount3>=2?"#2a5020":revCount3===1?"#4a3810":"#333";
            var revCol3=revCount3>=2?"#7abd00":revCount3===1?"#EF9F27":"#555";
            var revDot3=revCount3>=2?"#7abd00":revCount3===1?"#EF9F27":"#444";
            var revEmpty3=revCount3>=2?"#2a5020":revCount3===1?"#4a3810":"#2a2a2a";
            var revLabel3=revCount3>=4?"Strong Reversal":revCount3>=2?"Reversal Watch":revCount3===1?"Early Signal":"No Signals";
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



                {/* FUNDAMENTAL ANALYSIS */}
                {/* AI ANALYSIS section - hero card */}
                {(function() {
                  function aiVerdictColor(v) {
                    if (!v) return { fg:"#444", dot:"#333", dotEmpty:"#2a2a2a" };
                    var vl = v.toLowerCase();
                    if (vl.includes("strong buy")||vl.includes("strong bull")) return { fg:"#7abd00", dot:"#7abd00", dotEmpty:"#2a5020" };
                    if (vl.includes("buy")||vl.includes("bull"))               return { fg:"#7abd00", dot:"#7abd00", dotEmpty:"#2a5020" };
                    if (vl.includes("avoid")||vl.includes("strong bear"))      return { fg:"#e05050", dot:"#e05050", dotEmpty:"#4a2020" };
                    if (vl.includes("caution")||vl.includes("bear"))           return { fg:"#EF9F27", dot:"#EF9F27", dotEmpty:"#4a3810" };
                    return { fg:"#EF9F27", dot:"#EF9F27", dotEmpty:"#4a3810" };
                  }
                  function aiVerdictScore(v) {
                    if (!v) return 0;
                    var vl = v.toLowerCase();
                    if (vl.includes("strong buy")||vl.includes("strong bull")) return 5;
                    if (vl.includes("buy")||vl.includes("bull")) return 4;
                    if (vl.includes("hold")||vl.includes("neutral")) return 3;
                    if (vl.includes("caution")||vl.includes("bear")) return 2;
                    if (vl.includes("avoid")||vl.includes("strong bear")) return 1;
                    return 0;
                  }
                  var fundC  = aiVerdictColor(aiFundResult ? aiFundResult.verdict : null);
                  var techC  = aiVerdictColor(aiTechResult ? aiTechResult.verdict : null);
                  var fundSc = aiVerdictScore(aiFundResult ? aiFundResult.verdict : null);
                  var techSc = aiVerdictScore(aiTechResult ? aiTechResult.verdict : null);
                  // Card colour = worst of fund/tech verdict
                  var _scores = [fundSc, techSc].filter(function(s){ return s > 0; });
                  var _minScore = _scores.length > 0 ? Math.min.apply(null, _scores) : 0;
                  var _cardCol = { bg:"#1e1e1e", border:"#3a3a3a", header:"#2a2a2a", fg:"#888" };
                  return (
                    <div onClick={function(){ window.__goToTab && window.__goToTab("aianalysis"); }}
                      style={{ marginBottom:14, cursor:"pointer", background:_cardCol.bg, border:"1.5px solid "+_cardCol.border, borderRadius:12, overflow:"hidden" }}>
                      {/* Header bar */}
                      <div style={{ background:_cardCol.header, padding:"6px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background:_cardCol.fg }}></div>
                          <span style={{ fontSize:10, fontWeight:800, color:_cardCol.fg, textTransform:"uppercase", letterSpacing:"0.1em" }}>AI Analysis</span>
                        </div>
                        <span style={{ fontSize:9, fontWeight:700, color:"#c8f000", background:"rgba(0,0,0,0.3)", padding:"2px 8px", borderRadius:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>Premium</span>
                      </div>
                      {/* Body */}
                      {!window.__isPaid ? (
                        <div style={{ padding:"14px 12px", textAlign:"center" }}>
                          <div style={{ fontSize:11, color:"#555", marginBottom:4 }}>Unlock AI-powered investment analysis</div>
                          <div style={{ fontSize:10, color:"#444" }}>Available to paid members</div>
                        </div>
                      ) : (
                        <div style={{ padding:"10px 12px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                          {/* Fundamental AI */}
                          <div>
                            <div style={{ fontSize:9, color:"#666", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Fundamental</div>
                            {aiFundLoading
                              ? <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:7, height:7, borderRadius:"50%", border:"1.5px solid #333", borderTop:"1.5px solid #c8f000", animation:"spin 0.8s linear infinite" }}></div><span style={{ fontSize:10, color:"#555" }}>Analysing...</span></div>
                              : <div>
                                  <div style={{ fontSize:13, fontWeight:700, color:aiFundResult?fundC.fg:"#555", marginBottom:3 }}>{aiFundResult?aiFundResult.verdict:"--"}</div>
                                  {aiFundResult && fundSc > 0 && <Dots score={fundSc} filled={fundC.dot} empty={fundC.dotEmpty} />}
                                  {aiFundResult && aiFundResult.confidence && <div style={{ fontSize:9, color:"#555", marginTop:3 }}>{"Conf: " + aiFundResult.confidence}</div>}
                                </div>
                            }
                          </div>
                          {/* Technical AI */}
                          <div>
                            <div style={{ fontSize:9, color:"#666", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Technical</div>
                            {aiTechLoading
                              ? <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:7, height:7, borderRadius:"50%", border:"1.5px solid #333", borderTop:"1.5px solid #c8f000", animation:"spin 0.8s linear infinite" }}></div><span style={{ fontSize:10, color:"#555" }}>Analysing...</span></div>
                              : <div>
                                  <div style={{ fontSize:13, fontWeight:700, color:aiTechResult?techC.fg:"#555", marginBottom:3 }}>{aiTechResult?aiTechResult.verdict:"--"}</div>
                                  {aiTechResult && techSc > 0 && <Dots score={techSc} filled={techC.dot} empty={techC.dotEmpty} />}
                                  {aiTechResult && aiTechResult.stVerdict && <div style={{ fontSize:9, color:"#555", marginTop:3 }}>{"ST: " + aiTechResult.stVerdict}</div>}
                                </div>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <SectionLabel label="Fundamental Analysis" />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                  <Card label="Economic Moat" value={moatRating} score={moatScore} colors={moatColors} loading={!moatRating && insightLoading} tabId="moat" />
                  {(function() {
                    var loading = !ivLabel; var c = ivColors;
                    return (
                      <div onClick={function(){ window.__goToTab && window.__goToTab("intrinsic"); }} style={{ padding:"9px 12px", background:loading?"#222":c.bg, border:"0.5px solid "+(loading?"#333":c.border), borderRadius:8, minHeight:72, display:"flex", flexDirection:"column", cursor:"pointer" }}>
                        <div style={{ fontSize:9, color:loading?"#555":c.fg, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5, opacity:0.8 }}>Intrinsic Value</div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flex:1 }}>
                          {loading && !ov
                            ? <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                <div style={{ width:7, height:7, borderRadius:"50%", border:"1.5px solid #333", borderTop:"1.5px solid #c8f000", animation:"spin 0.8s linear infinite" }}></div>
                                <span style={{ fontSize:10, color:"#555" }}>Loading...</span>
                              </div>
                            : <span style={{ fontSize:13, fontWeight:700, color:loading?"#555":c.fg }}>{loading?"---":ivLabel}</span>
                          }
                          {!loading && ivScore > 0 && <Dots score={ivScore} filled={c.dot} empty={c.dotEmpty} />}
                        </div>
                        {!loading && ivSublabel && <div style={{ fontSize:10, color:c.fg, marginTop:3, opacity:0.75 }}>{ivSublabel}</div>}
                      </div>
                    );
                  })()}
                  <Card label="Financial Strength" value={finRating} score={finScore} colors={finColors} loading={!finRating && insightLoading} tabId="financial" />
                </div>
                {/* TECHNICAL ANALYSIS */}
                <SectionLabel label="Technical Analysis" />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                  {ind2 && p2
                    ? <Card label="Market Signal" value={vl2} score={msDots} colors={msColors} sublabel={"Score: " + final2 + " / 100"} tabId="signal" />
                    : <Card label="Market Signal" value={null} score={0} colors={pillColor(null)} loading={addlLoading} />
                  }
                  {(function() {
                    var c3bg=revBg3; var c3bd=revBorder3; var c3fg=revCol3;
                    return (
                      <div onClick={function(){ window.__goToTab && window.__goToTab("signal"); }} style={{ padding:"9px 12px", background:c3bg, border:"0.5px solid "+c3bd, borderRadius:8, minHeight:72, display:"flex", flexDirection:"column", cursor:"pointer" }}>
                        <div style={{ fontSize:9, color:c3fg, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5, opacity:0.8 }}>Reversal</div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flex:1 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:c3fg }}>{revLabel3}</span>
                          <Dots score={revCount3} filled={revDot3} empty={revEmpty3} />
                        </div>
                        {revCount3 > 0 && (
                          <div style={{ fontSize:10, color:c3fg, marginTop:3, opacity:0.75, lineHeight:1.4 }}>
                            {sigNames3.filter(function(_,i){ return revArr3[i]; }).join(" " + String.fromCharCode(0xB7) + " ")}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

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
                    {/* Valuation Section */}
          <div style={{ background:"#252525", border:"1px solid #2c2c2e", borderRadius:12, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Valuation</div>
            {ov ? (function() {
              var VAL_METRICS = [
                { label:"P/E Ratio (TTM)", val:pe>0?fmt2(pe):"-", col:(window.__mc||function(){return "#ddd";})(pe,15,25,40,true),
                  tip:"Price-to-Earnings: how much you pay for $1 of profit. " + (pe<=0?"No earnings available.":pe<15?"Below 15x -- looks cheap, but check why.":pe<25?"15-25x -- moderate, typical for steady companies.":pe<40?"25-40x -- premium pricing, implies strong growth expected.":"Above 40x -- very expensive or loss-making.") },
                { label:"Forward P/E", val:fpe>0?fmt2(fpe):"-", col:(window.__mc||function(){return "#ddd";})(fpe,15,25,40,true),
                  tip:"Based on next year estimated earnings. " + (fpe<=0?"No estimate available.":fpe<15?"Below 15x -- market expects little growth.":fpe<25?"15-25x -- reasonable for a growing company.":fpe<35?"25-35x -- market expects strong future earnings.":"Above 35x -- high expectations baked in.") },
                { label:"Price / Sales (TTM)", val:ov.ps>0?fmt2(ov.ps):"-", col:(window.__mc||function(){return "#ddd";})(ov.ps,2,6,12,true),
                  tip:"How much you pay per $1 of revenue. " + (ov.ps<=0?"Not available.":ov.ps<2?"Below 2x -- cheap relative to revenue.":ov.ps<6?"2-6x -- moderate.":ov.ps<12?"6-12x -- high, typical for fast-growing tech.":"Above 12x -- very expensive.") },
                { label:"EV / EBITDA", val:ov.evEbitda>0?fmt2(ov.evEbitda):"-", col:(window.__mc||function(){return "#ddd";})(ov.evEbitda,10,20,30,true),
                  tip:"Enterprise Value vs operating profit. " + (ov.evEbitda<=0?"Not available.":ov.evEbitda<10?"Below 10x -- looks cheap.":ov.evEbitda<20?"10-20x -- fair value range.":ov.evEbitda<30?"20-30x -- premium.":"Above 30x -- expensive.") },
                { label:"Price / Book (P/B)", val:ov.pb>0?fmt2(ov.pb):"-", col:(window.__mc||function(){return "#ddd";})(ov.pb,3,8,20,true),
                  tip:"How much you pay vs net asset value. " + (ov.pb<=0?"Not available.":ov.pb<1?"Below 1x -- trading below asset value.":ov.pb<3?"1-3x -- reasonable.":ov.pb<8?"3-8x -- high, typical for asset-light companies.":"Above 8x -- very high premium.") },
                { label:"Price / Free Cash Flow", val:ov.pFcf>0?fmt2(ov.pFcf):"-", col:(window.__mc||function(){return "#ddd";})(ov.pFcf,15,30,50,true),
                  tip:"How much you pay per $1 of free cash. " + (ov.pFcf<=0?"Not available or negative FCF.":ov.pFcf<15?"Below 15x -- cheap.":ov.pFcf<30?"15-30x -- fair value.":ov.pFcf<50?"30-50x -- premium.":"Above 50x -- expensive.") },
                { label:"PEG Ratio", val:ov.peg>0?ov.peg.toFixed(2):"-", col:(window.__mc||function(){return "#ddd";})(ov.peg,1,2,3,true),
                  tip:"P/E divided by earnings growth rate. " + (ov.peg<=0?"Not available.":ov.peg<1?"Below 1 -- potentially undervalued vs growth.":ov.peg<2?"1-2x -- fair value.":"Above 2x -- may be expensive vs growth rate.") },
                { label:"Dividend Yield", val:ov.divY>0?fpct(ov.divY):"None", col:"#ddd",
                  tip:"Annual dividend as % of stock price. " + (ov.divY<=0?"No dividend -- typical for growth stocks.":ov.divY<2?"Below 2% -- low yield.":ov.divY<4?"2-4% -- moderate yield.":ov.divY<6?"4-6% -- high yield.":"Above 6% -- very high, check sustainability.") },
              ];
              return (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <tbody>
                    {VAL_METRICS.map(function(m, i) {
                      return (
                        <tr key={i} style={{ borderBottom:i < VAL_METRICS.length-1 ? "1px solid #2c2c2e" : "none" }} title={m.tip}>
                          <td style={{ padding:"7px 0", fontSize:11, color:"#888", width:"60%", lineHeight:1.4, cursor:"help" }}>
                            {m.label}<span style={{ fontSize:9, color:"#555", marginLeft:4 }}>{"?"}</span>
                          </td>
                          <td style={{ padding:"7px 0", fontSize:13, fontWeight:700, color:m.col||"#ddd", textAlign:"right", cursor:"help" }}>{m.val}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })() : (
              <div style={{ color:"#aaa", fontSize:13, textAlign:"center", padding:"12px 0" }}>
                {msg ? "Unavailable" : "Loading..."}
              </div>
            )}
          </div>

          {/* Financial Health Section */}
          <div style={{ background:"#252525", border:"1px solid #2c2c2e", borderRadius:12, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Financial Health</div>
            {ov ? (function() {
              var gm = ov.grossMargin; var om = ov.opMargin; var nm = ov.netMargin;
              var roe = ov.roe; var cr = ov.currentRatio; var qr = ov.quickRatio;
              var de = ov.de;
              var HEALTH_METRICS = [
                { label:"Gross Margin", val:gm?fpct(gm):"-", col:(window.__mc||function(){return "#ddd";})(gm,40,20,0), tip:"Revenue minus cost of goods sold, as a percentage. Shows how efficiently the company produces its product. " + (!gm?"Not available.":gm>60?"Above 60% -- exceptional pricing power, keeps most of each dollar.":gm>40?"40-60% -- strong margins, efficient business.":gm>20?"20-40% -- adequate, covers costs with profit.":"Below 20% -- thin margins, common in retail or hardware.") },
                { label:"Return on Equity", val:roe>0?fpct(roe):"-", col:(window.__mc||function(){return "#ddd";})(roe,15,8,0), tip:"Net profit as a percentage of shareholder equity. Measures how well management uses investor money. " + (!roe||roe<=0?"Not available or negative.":roe>25?"Above 25% -- exceptional, generating strong returns for shareholders.":roe>15?"15-25% -- solid returns.":roe>8?"8-15% -- decent, earns adequately on equity.":"Below 8% -- below average, limited value creation.") },
                { label:"Operating Margin", val:om?fpct(om):"-", col:(window.__mc||function(){return "#ddd";})(om,15,5,0), tip:"Profit after operating expenses, before interest and taxes. Shows core business efficiency. " + (!om?"Not available.":om>30?"Above 30% -- highly efficient, very profitable operations.":om>15?"15-30% -- strong operational control.":om>5?"5-15% -- reasonable for most industries.":om>0?"0-5% -- tight margins, limited room for error.":"Negative -- operating at a loss.") },
                { label:"Current Ratio", val:cr>0?fmt2(cr):"-", col:(window.__mc||function(){return "#ddd";})(cr,1.5,1,0), tip:"Current assets divided by current liabilities. Measures ability to pay short-term bills. " + (!cr||cr<=0?"Not available.":cr>2?"Above 2x -- very liquid, easily covers short-term obligations.":cr>1.5?"1.5-2x -- healthy buffer.":cr>1?"1-1.5x -- adequate, can meet obligations.":"Below 1x -- tight, may struggle to cover short-term debts.") },
                { label:"Net Profit Margin", val:nm?fpct(nm):"-", col:(window.__mc||function(){return "#ddd";})(nm,10,3,0), tip:"Final profit as a percentage of revenue, after all expenses and taxes. The ultimate bottom line. " + (!nm?"Not available.":nm>20?"Above 20% -- exceptional profitability.":nm>10?"10-20% -- strong bottom line.":nm>5?"5-10% -- profitable, reasonable margins.":nm>0?"0-5% -- slim profits, limited cushion.":"Negative -- losing money.") },
                { label:"Quick Ratio", val:qr>0?fmt2(qr):"-", col:(window.__mc||function(){return "#ddd";})(qr,1,0.7,0), tip:"Like Current Ratio but excludes inventory. A stricter test of short-term liquidity. " + (!qr||qr<=0?"Not available.":qr>1.5?"Above 1.5x -- excellent, can cover obligations without selling inventory.":qr>1?"1-1.5x -- good immediate liquidity.":qr>0.7?"0.7-1x -- adequate, manageable.":"Below 0.7x -- limited liquid assets, could be stretched.") },
                { label:"Free Cash Flow", val:ov.fcf||"-", col:(window.__mc||function(){return "#ddd";})(ov.fcfRaw,1e9,0,-1e9), tip:"Cash left after capital expenditures. The real money the business generates that can be returned to shareholders or reinvested. " + (!ov.fcfRaw?"Not available.":ov.fcfRaw>10e9?"Very strong -- generates billions in free cash, excellent financial health.":ov.fcfRaw>1e9?"Strong -- generates significant free cash flow.":ov.fcfRaw>0?"Positive -- business funds itself.":"Negative -- spending more cash than it generates.") },
                { label:"Total Debt / Equity", val:de>0?fmt2(de):"-", col:(window.__mc||function(){return "#ddd";})(de,0.5,1.5,3,true), tip:"Total debt divided by shareholder equity. Shows how much the company relies on debt vs owner funding. " + (!de||de<=0?"Not available or debt-free.":de<0.5?"Below 0.5x -- very low leverage, conservatively financed.":de<1?"0.5-1x -- moderate debt, comfortable levels.":de<2?"1-2x -- elevated, debt is significant but manageable.":"Above 2x -- high leverage, significant financial risk.") },
                { label:"Net Income (TTM)", val:ov.netIncome||"-", col:(window.__mc||function(){return "#ddd";})(ov.niRaw,1e9,0,-1e9), tip:"Total net profit over the trailing twelve months. The bottom line after all expenses, interest and taxes." },
                { label:"Revenue Growth YoY", val:ov.revGrowth?fpct(ov.revGrowth):"-", col:(window.__mc||function(){return "#ddd";})(ov.revGrowth,10,3,0), tip:"Year-over-year revenue growth rate. Indicates business momentum. " + (!ov.revGrowth?"Not available.":ov.revGrowth>20?"Above 20% -- rapid expansion.":ov.revGrowth>10?"10-20% -- strong, scaling well.":ov.revGrowth>5?"5-10% -- solid, steady growth.":ov.revGrowth>0?"0-5% -- slow but positive.":"Negative -- revenue is shrinking.") },
                { label:"Revenue (TTM)", val:ov.revenue||"-", col:"#ddd", tip:"Total revenue over the trailing twelve months. The top line -- all money earned before any expenses." },
              ];
              return (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <tbody>
                    {HEALTH_METRICS.map(function(m, i) {
                      return (
                        <tr key={i} style={{ borderBottom:i < HEALTH_METRICS.length-1 ? "1px solid #2c2c2e" : "none" }} title={m.tip}>
                          <td style={{ padding:"7px 0", fontSize:11, color:"#888", width:"60%", lineHeight:1.4, cursor:"help" }}>
                            {m.label}<span style={{ fontSize:9, color:"#555", marginLeft:4 }}>{"?"}</span>
                          </td>
                          <td style={{ padding:"7px 0", fontSize:13, fontWeight:700, color:m.col||"#ddd", textAlign:"right", cursor:"help" }}>{m.val}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })() : (
              <div style={{ color:"#aaa", fontSize:13, textAlign:"center", padding:"12px 0" }}>
                {msg ? "Unavailable" : "Loading..."}
              </div>
            )}
          </div>

          {/* Growth & Profile Section */}
          <div style={{ background:"#252525", border:"1px solid #2c2c2e", borderRadius:12, padding:"16px" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Growth & Profile</div>
            {ov ? (function() {
              var GROWTH_METRICS = [
                { label:"EPS Growth (TTM)", val:ov.epsG?fpct(ov.epsG):"-", col:(window.__mc||function(){return "#ddd";})(ov.epsG,15,5,0), tip:"Earnings per share growth over the trailing twelve months. " + (!ov.epsG?"Not available.":ov.epsG>30?"Above 30% -- exceptional earnings growth.":ov.epsG>15?"15-30% -- strong growth, business is accelerating.":ov.epsG>5?"5-15% -- solid, steady earnings expansion.":ov.epsG>0?"0-5% -- modest growth.":"Negative -- earnings are shrinking, investigate why.") },
                { label:"Revenue Growth YoY", val:ov.revGrowth?fpct(ov.revGrowth):"-", col:(window.__mc||function(){return "#ddd";})(ov.revGrowth,10,3,0), tip:"Year-over-year revenue growth rate. The top-line growth that drives everything else. " + (!ov.revGrowth?"Not available.":ov.revGrowth>20?"Above 20% -- rapid expansion, strong demand.":ov.revGrowth>10?"10-20% -- healthy growth.":ov.revGrowth>0?"Positive but modest growth.":"Negative -- revenue is contracting.") },
                { label:"LT EPS Growth (5yr Est.)", val:ov.ltG?fpct(ov.ltG):"-", col:(window.__mc||function(){return "#ddd";})(ov.ltG,10,5,0), tip:"Analyst consensus estimate for long-term earnings growth over the next 5 years. Used in valuation models. " + (!ov.ltG?"Not available.":ov.ltG>20?"Above 20% -- high growth expected, likely a growth stock.":ov.ltG>10?"10-20% -- solid long-term growth outlook.":ov.ltG>5?"5-10% -- moderate, steady grower.":"Below 5% -- slow growth expected, typical for mature or utility companies.") },
                { label:"Beta", val:ov.beta>0?ov.beta.toFixed(2):"-", col:(window.__mc||function(){return "#ddd";})(ov.beta,0,1.5,2,true), tip:"Measures how much the stock moves relative to the overall market. " + (!ov.beta||ov.beta<=0?"Not available.":ov.beta<0.5?"Below 0.5 -- very low volatility, moves little with the market.":ov.beta<0.8?"0.5-0.8 -- lower than market volatility, defensive stock.":ov.beta<1.2?"0.8-1.2 -- moves roughly in line with the market.":ov.beta<1.5?"1.2-1.5 -- more volatile than market, amplified moves.":"Above 1.5 -- high volatility, swings much more than the market.") },
                { label:"Market Cap", val:ov.marketCap||"-", col:"#ddd", tip:"Total market value of all shares outstanding. " + (!ov.mc?"Not available.":ov.mc>1e12?"Mega-cap (above $1T) -- one of the largest companies in the world.":ov.mc>200e9?"Large-cap -- established, stable company.":ov.mc>10e9?"Mid-cap -- growing company with some track record.":"Small-cap -- smaller company, higher growth potential but more risk.") },
                { label:"Dividend Yield (TTM)", val:ov.divY>0?fpct(ov.divY):"None", col:"#ddd", tip:"Annual dividend paid as a percentage of current stock price. " + (!ov.divY||ov.divY<=0?"No dividend -- company reinvests all profits into growth.":ov.divY<2?"Below 2% -- token dividend, primarily a growth company.":ov.divY<4?"2-4% -- moderate income, balanced approach.":ov.divY<6?"4-6% -- strong income, typical for mature companies.":"Above 6% -- very high yield, verify dividend is sustainable.") },
              ];
              return (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <tbody>
                    {GROWTH_METRICS.map(function(m, i) {
                      return (
                        <tr key={i} style={{ borderBottom:i < GROWTH_METRICS.length-1 ? "1px solid #2c2c2e" : "none" }} title={m.tip}>
                          <td style={{ padding:"7px 0", fontSize:11, color:"#888", width:"60%", lineHeight:1.4, cursor:"help" }}>
                            {m.label}<span style={{ fontSize:9, color:"#555", marginLeft:4 }}>{"?"}</span>
                          </td>
                          <td style={{ padding:"7px 0", fontSize:13, fontWeight:700, color:m.col||"#ddd", textAlign:"right", cursor:"help" }}>{m.val}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })() : (
              <div style={{ color:"#aaa", fontSize:13, textAlign:"center", padding:"12px 0" }}>
                {msg ? "Unavailable" : "Loading..."}
              </div>
            )}
          </div>

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



                    {/* 5-Tab Insight Panel */}
          {(function() {
            var ALL_TABS = [
              { id:"aianalysis", label:"AI Analysis" },
              { id:"business",  label:"Business Overview" },
              { id:"moat",      label:"Economic MOAT" },
              { id:"intrinsic", label:"Intrinsic Value" },
              { id:"aiinsight", label:"AI Insight" },
              { id:"financial", label:"Financial Strength" },
              { id:"signal",    label:"Market Signal" },
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
            var _noFetch   = ["business","addlinfo","debug","signal","admin"];
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

                {/* Cache status strip */}
                {(function() {
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
                        return (
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:bannerBg, borderRadius:8, marginBottom:16, border:"0.5px solid " + bannerBorder }}>
                            <div>
                              <div style={{ fontSize:10, color:bannerFg, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Intrinsic Value</div>
                              <div style={{ fontSize:15, fontWeight:500, color:bannerFg }}>{bannerLabel}</div>
                              <div style={{ fontSize:11, color:bannerFg, marginTop:2, opacity:0.85 }}>{bannerSub}</div>
                            </div>
                            <div style={{ fontSize:20, fontWeight:500, color:bannerFg }}>${oracle}</div>
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
                      {!tabContent && insightTab !== "business" && insightTab !== "addlinfo" && insightTab !== "debug" && insightTab !== "signal" && insightTab !== "aiinsight" && insightTab !== "aianalysis" && insightTab !== "admin" && (
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
                          if (v.includes("moderate"))    return { text:"#b88000", bg:"#fdf8e6", border:"#d4a800" };
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
                            {_computedClass && (
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:fc.bg, borderRadius:8, marginBottom:14, border:"0.5px solid "+fc.border }}>
                                <div>
                                  <div style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Financial Strength</div>
                                  <div style={{ fontSize:15, fontWeight:700, color:fc.text }}>{_computedClass}</div>
                                  <div style={{ fontSize:10, color:fc.text, opacity:0.7, marginTop:2 }}>
                                    {"avg score " + _gridAvg.toFixed(1) + " / 5  from " + _gridScores.length + " metric" + (_gridScores.length!==1?"s":"") + " with data"}
                                  </div>
                                </div>
                                <div style={{ display:"flex", gap:3 }}>
                                  {[1,2,3,4,5].map(function(d){ return <span key={d} style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:d<=_computedScore?fc.text:"#ddd" }} />; })}
                                </div>
                              </div>
                            )}
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
                                          Reversal Watch {String.fromCharCode(0x2014)} {revCount} signals
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
                                    Trend {"&"} Price Action <span style={{ fontWeight:400, color:"#bbb" }}>55%</span>
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
                                        ? <div style={{ fontSize:10, color:"#633806", background:"#FAEEDA", padding:"2px 9px", borderRadius:8, border:"0.5px solid #EF9F27", fontWeight:600 }}>{revCount} active {String.fromCharCode(0x2014)} total bonus <span style={{ color:"#1a6a1a" }}>+{bonus}pts</span></div>
                                        : <div style={{ fontSize:10, color:"#bbb" }}>0 active {String.fromCharCode(0x2014)} 0 pts</div>
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
                                        {base >= 50 && bonus === 0 && <span style={{ fontSize:10, color:"#aaa" }}>(bonus only when base {"<"} 50)</span>}
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            ) : (
                              <div style={{ padding:"12px 14px", background:"#fafaf8", borderRadius:8, border:"0.5px solid #e8e4dc", marginBottom:4, fontSize:12, color:"#aaa" }}>
                                Market Signal unavailable {String.fromCharCode(0x2014)} requires Massive.com data.
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

                  {/* AI Analysis Tab */}
                  {insightTab === "aianalysis" && (function() {
                    if (!window.__isPaid) {
                      return (
                        <div style={{ padding:"32px 16px", textAlign:"center" }}>
                          <div style={{ fontSize:16, fontWeight:600, color:"#888", marginBottom:8 }}>PREMIUM Feature</div>
                          <div style={{ fontSize:13, color:"#aaa" }}>AI Analysis is available to paid members only.</div>
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
                      var vl = (props.verdict||"").toLowerCase();
                      var isGood = vl.includes("buy")||vl.includes("bull");
                      var isBad  = vl.includes("avoid")||vl.includes("strong bear");
                      var bg     = isGood?"#EAF3DE":isBad?"#FCEBEB":"#FAEEDA";
                      var border = isGood?"#7abd00":isBad?"#e08080":"#d4a800";
                      var fg     = isGood?"#1a6a1a":isBad?"#c03030":"#b88000";
                      var score  = vl.includes("strong buy")||vl.includes("strong bull")?5:vl.includes("buy")||vl.includes("bull")?4:vl.includes("hold")||vl.includes("neutral")?3:vl.includes("caution")||vl.includes("bear")?2:1;
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
                          {props.confidence && <div style={{ fontSize:10, color:fg, opacity:0.7, marginTop:2 }}>{"Confidence: " + props.confidence}</div>}
                        </div>
                      );
                    }
                    var cachedAtFundStr = aiFundCachedAt ? new Date(aiFundCachedAt).toLocaleDateString() : null;
                    var cachedAtTechStr = aiTechCachedAt ? new Date(aiTechCachedAt).toLocaleDateString() : null;
                    return (
                      <div>
                        {/* Fundamental AI Card */}
                        <div style={{ marginBottom:20 }}>
                          <div style={{ borderBottom:"2px solid #e0dbd0", marginBottom:12 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:"#111", paddingBottom:6, borderBottom:"2px solid #111", display:"inline-block", marginBottom:"-2px" }}>Fundamental AI</span>
                            {cachedAtFundStr && <span style={{ fontSize:10, color:"#aaa", marginLeft:8 }}>{"cached " + cachedAtFundStr + " (30d TTL)"}</span>}
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
                                  <div style={{ fontSize:10, color:"#888", fontWeight:700, marginBottom:2 }}>KEY STRENGTH</div>
                                  <div style={{ fontSize:12, color:"#444", lineHeight:1.5 }}>{aiFundResult.strength}</div>
                                </div>
                              )}
                              {aiFundResult.risk && (
                                <div style={{ marginBottom:8, padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:10, color:"#888", fontWeight:700, marginBottom:2 }}>KEY RISK</div>
                                  <div style={{ fontSize:12, color:"#444", lineHeight:1.5 }}>{aiFundResult.risk}</div>
                                </div>
                              )}
                              {aiFundResult.summary && (
                                <div style={{ marginBottom:12, padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:10, color:"#888", fontWeight:700, marginBottom:4 }}>SUMMARY</div>
                                  <div style={{ fontSize:12, color:"#444", lineHeight:1.7 }}>{aiFundResult.summary}</div>
                                </div>
                              )}
                              <div style={{ marginTop:12 }}>
                                <div style={{ fontSize:10, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Exact prompt sent to AI</div>
                                {aiFundResult.promptSent
                                  ? <pre style={{ padding:"10px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #ede9e0", fontSize:10, color:"#555", lineHeight:1.6, whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0, fontFamily:"monospace" }}>{aiFundResult.promptSent}</pre>
                                  : <div style={{ padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #ede9e0", fontSize:11, color:"#aaa", fontStyle:"italic" }}>{"Prompt not available for cached results. Clear cache and reload to see the full prompt."}</div>
                                }
                              </div>
                            </div>
                          )}
                          {!aiFundLoading && !aiFundResult && (
                            <div style={{ textAlign:"center", padding:"20px 0", color:"#aaa", fontSize:12 }}>Fundamental AI data not yet available.</div>
                          )}
                        </div>

                        {/* Technical AI Card */}
                        <div>
                          <div style={{ borderBottom:"2px solid #e0dbd0", marginBottom:12 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:"#111", paddingBottom:6, borderBottom:"2px solid #111", display:"inline-block", marginBottom:"-2px" }}>Technical AI</span>
                            {cachedAtTechStr && <span style={{ fontSize:10, color:"#aaa", marginLeft:8 }}>{"cached " + cachedAtTechStr + " (1d TTL)"}</span>}
                          </div>
                          {aiTechLoading && (
                            <div style={{ textAlign:"center", padding:"20px 0" }}>
                              <div style={{ width:20, height:20, border:"3px solid #e0dbd0", borderTop:"3px solid #c8f000", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 8px" }}></div>
                              <div style={{ fontSize:12, color:"#aaa" }}>Analysing technicals...</div>
                            </div>
                          )}
                          {!aiTechLoading && aiTechResult && (
                            <div>
                              <VerdictBanner title="Technical Verdict" verdict={aiTechResult.verdict} confidence={aiTechResult.confidence}
                                sub={aiTechResult.stVerdict ? "Short-term (1-3m): " + aiTechResult.stVerdict : null} />
                              {aiTechResult.keyLevel && (
                                <div style={{ marginBottom:8, padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:10, color:"#888", fontWeight:700, marginBottom:2 }}>KEY LEVEL</div>
                                  <div style={{ fontSize:12, color:"#444", lineHeight:1.5 }}>{aiTechResult.keyLevel}</div>
                                </div>
                              )}
                              {aiTechResult.summary && (
                                <div style={{ marginBottom:12, padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #e0dbd0" }}>
                                  <div style={{ fontSize:10, color:"#888", fontWeight:700, marginBottom:4 }}>SUMMARY</div>
                                  <div style={{ fontSize:12, color:"#444", lineHeight:1.7 }}>{aiTechResult.summary}</div>
                                </div>
                              )}
                              <div style={{ marginTop:12 }}>
                                <div style={{ fontSize:10, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Exact prompt sent to AI</div>
                                {aiTechResult.promptSent
                                  ? <pre style={{ padding:"10px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #ede9e0", fontSize:10, color:"#555", lineHeight:1.6, whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0, fontFamily:"monospace" }}>{aiTechResult.promptSent}</pre>
                                  : <div style={{ padding:"8px 12px", background:"#faf8f4", borderRadius:6, border:"0.5px solid #ede9e0", fontSize:11, color:"#aaa", fontStyle:"italic" }}>{"Prompt not available for cached results. Clear cache and reload to see the full prompt."}</div>
                                }
                              </div>
                            </div>
                          )}
                          {!aiTechLoading && !aiTechResult && (
                            <div style={{ textAlign:"center", padding:"20px 0", color:"#aaa", fontSize:12 }}>Technical AI data not yet available.</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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
                                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
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
              var ALL_SP500 = Object.keys(NAMES).sort();
              var AI_TABS = ["moat","financial","aiinsight"];
              var adminQ = (window.__adminSearch || "").toLowerCase();
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
                              var ct = AI_TABS.filter(function(tab) { var m = statsMap["insight:"+t+":"+tab]; return !!(m&&(m.exists||m.cachedAt)); });
                              var ld = null;
                              AI_TABS.forEach(function(tab) { var m = statsMap["insight:"+t+":"+tab]; if (m&&m.cachedAt) { if (!ld||new Date(m.cachedAt)>new Date(ld)) ld=m.cachedAt; } });
                              if (sortKey==="ticker")     return t;
                              if (sortKey==="company")    return (NAMES[t]||"").toLowerCase();
                              if (sortKey==="cache")      return ct.length===AI_TABS.length ? 0 : ct.length>0 ? 1 : 2;
                              if (sortKey==="lastCached") return ld ? new Date(ld).getTime() : 0;
                              if (sortKey==="mode")       return liveSet.indexOf(t)!==-1 ? 0 : 1;
                              return t;
                            };
                            var va = getVal(a); var vb = getVal(b);
                            return va < vb ? -sortDir : va > vb ? sortDir : 0;
                          });
                          return SORTED.map(function(t) {
                            var isLive = liveSet.indexOf(t) !== -1;
                            var cachedTabs = AI_TABS.filter(function(tab) { var m = statsMap["insight:"+t+":"+tab]; return !!(m&&(m.exists||m.cachedAt)); });
                            var latestDate = null;
                            AI_TABS.forEach(function(tab) { var m = statsMap["insight:"+t+":"+tab]; if (m&&m.cachedAt) { if (!latestDate||new Date(m.cachedAt)>new Date(latestDate)) latestDate=m.cachedAt; } });
                            var statusLabel = cachedTabs.length===AI_TABS.length ? "Full" : cachedTabs.length>0 ? "Partial" : "None";
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
                                <td style={{ padding:"8px 10px", textAlign:"center" }}>
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
            nervousgeek.com is a private, community-focused website created for friends and family who want to learn about investing. Any fees collected fund operating costs and time effort to refine the module. All analysis, ratings, and AI-generated insights are for general informational and educational purposes only. They do not constitute financial product advice, investment advice, or any form of professional advice. This website does not consider your personal financial situation. Before any investment decision, seek advice from a licensed financial adviser. Past performance is not a reliable indicator of future results. Data from Yahoo Finance and Massive.com may be delayed or inaccurate. Use at your own risk. AI analysis by Claude (Anthropic). {String.fromCharCode(0xA9)} nervousgeek.com 2026.
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
          <div style={{ fontSize:32, fontWeight:900, color:"#f0ede6", marginBottom:8, letterSpacing:"-1px" }}>Unlock every US stock</div>
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
          <div style={{ fontSize:11, color:"#555" }}>Secure payment by Stripe. Cancel anytime from your account.</div>
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
export default function App() {
  const [input,   setInput]   = useState("");
  const [focused, setFocused] = useState(false);
  const [clerkUser, setClerkUser] = useState(window.__clerkUser || null);
  const [clerkLoaded, setClerkLoaded] = useState(false);
  const [isPaid, setIsPaid] = useState(!!(window.__isPaid));
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [tickerSignals, setTickerSignals] = useState([]);

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
              .then(function(d){ var p = !!(d && d.paid); window.__isPaid = p; setIsPaid(p); })
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
                .then(function(d){ var p = !!(d && d.paid); window.__isPaid = p; setIsPaid(p); })
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
    var GOOD_VERDICTS = ["strong buy", "buy"];
    var loaded = [];

    function parseVerdict(text) {
      if (!text) return null;
      var m = text.match(/Overall Verdict:\s*(.+)/);
      return m ? m[1].trim() : null;
    }
    function parseConfidence(text) {
      if (!text) return null;
      var m = text.match(/Confidence:\s*(.+)/);
      return m ? m[1].trim() : null;
    }

    function fetchSignal(sym) {
      return fetch("/cache?sym=" + sym + "&tab=aiinsight")
        .then(function(r){ return r.json(); })
        .then(function(d){
          if (!d || !d.hit || !d.value) return null;
          var verdict = parseVerdict(d.value);
          if (!verdict) return null;
          var vl = verdict.toLowerCase();
          var isBull = GOOD_VERDICTS.some(function(g){ return vl.indexOf(g) !== -1; });
          if (!isBull) return null;
          // Fetch live price
          var ySym = sym === "BRKB" ? "BRK-B" : sym;
          return fetch("/proxy?url=" + encodeURIComponent("https://query1.finance.yahoo.com/v8/finance/chart/" + ySym + "?interval=1d&range=1d"))
            .then(function(r2){ return r2.json(); })
            .then(function(q){
              var meta = q && q.chart && q.chart.result && q.chart.result[0] && q.chart.result[0].meta;
              var price = meta ? (meta.regularMarketPrice || 0) : 0;
              var prev  = meta ? (meta.chartPreviousClose || meta.previousClose || price) : price;
              var pct   = prev > 0 ? ((price - prev) / prev * 100) : 0;
              return { sym: sym, verdict: verdict, price: price, pct: pct };
            }).catch(function(){ return { sym: sym, verdict: verdict, price: 0, pct: 0 }; });
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

    // Batch 1: 10 free tickers immediately
    loadBatch(FREE, 100);

    // Batch 2+: rest of S&P 500 in chunks of 20
    fetch("/cache?action=stats")
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (!d || !d.keys) return;
        // Get all tickers that have aiinsight cached, excluding FREE
        var cached = [];
        d.keys.forEach(function(k) {
          if (k.key && k.key.indexOf(":aiinsight") !== -1) {
            var sym = k.key.replace("insight:","").replace(":aiinsight","");
            if (FREE.indexOf(sym) === -1) cached.push(sym);
          }
        });
        // Load in batches of 20 with 2s delay between each
        var BATCH = 20;
        for (var bi = 0; bi < cached.length; bi += BATCH) {
          loadBatch(cached.slice(bi, bi + BATCH), 2000 + (bi / BATCH) * 2000);
        }
      }).catch(function(){});
  }, []);

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
          <span style={{ fontSize:17, fontWeight:900, letterSpacing:0 }}><span style={{ color:"#ffffff" }}>nervous</span><span style={{ color:LIME }}>geek</span></span>
        </div>

      </nav>

      {/* Scrolling AI Signal Ticker Bar - header */}
      {window.__tickerSignals && window.__tickerSignals.length > 0 && (function() {
        var sigs = window.__tickerSignals || [];
        var speed = Math.max(20, sigs.length * 5);
        return (
          <div style={{ position:"relative", zIndex:10, background:"#0a0a08", borderBottom:"1px solid #1e1e18", height:28, overflow:"hidden", display:"flex", alignItems:"center", width:"100%", maxWidth:"100vw" }}>
            <style>{"@keyframes ng-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}"}</style>
            <div style={{ display:"inline-flex", alignItems:"center", whiteSpace:"nowrap", animation:"ng-ticker " + speed + "s linear infinite", willChange:"transform" }}>
              {sigs.concat(sigs).concat(sigs).concat(sigs).map(function(sig, i) {
                var isStrong = sig.verdict && sig.verdict.toLowerCase().indexOf("strong") !== -1;
                var col = isStrong ? "#c8f000" : "#60b8f0";
                var priceStr = sig.price > 0 ? "$" + sig.price.toFixed(2) : "";
                return (
                  <span key={i}
                    onClick={function(){ window.location.hash = sig.sym; }}
                    style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"0 24px", cursor:"pointer", flexShrink:0, lineHeight:"28px", borderRight:"1px solid #1e1e18" }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:col, display:"inline-block", flexShrink:0 }}></span>
                    <span style={{ fontSize:11, fontWeight:800, color:col }}>{sig.sym}</span>
                    {priceStr && <span style={{ fontSize:10, color:"#666" }}>{priceStr}</span>}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}
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
                {"Upgrade to unlock all US stocks"}
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
            nervousgeek.com is a private, community-focused website created for friends and family who want to learn about investing. Any fees collected fund operating costs and time effort to refine the module. All analysis, ratings, and AI-generated insights are for general informational and educational purposes only. They do not constitute financial product advice, investment advice, or any form of professional advice. This website does not consider your personal financial situation. Before any investment decision, seek advice from a licensed financial adviser. Past performance is not a reliable indicator of future results. Data from Yahoo Finance and Massive.com may be delayed or inaccurate. Use at your own risk. AI analysis by Claude (Anthropic). {String.fromCharCode(0xA9)} nervousgeek.com 2026.
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
