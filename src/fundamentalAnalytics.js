// ─── fundamentalAnalytics.js ───────────────────────────────────────────────
// Single source of truth for Financial Strength (11-metric sector-aware
// score) and Intrinsic Value (multi-model DCF/valuation average).
//
// Extracted verbatim (same formulas, same thresholds, same fallback order)
// from the Detail page's inline computation in App.jsx (v2.240):
//   - Financial Strength canonical source: Financial tab render block
//     (THRESHOLDS / metricScore / _gridScores / _computedClass)
//   - Intrinsic Value: the "Improved base values" + "Build valuation rows"
//     block (baseEps, histGrowthRate, WACC_ADJ, 8-model average -> oracle)
//
// Both the Detail page and the Screener call these same functions so the
// two surfaces can never drift apart. Do not reimplement this math inline
// anywhere else -- extend it here instead.
//
// Inputs:
//   ov         - the object returned by App.jsx's getOverview(sym)
//   epsHistory - array of { year, eps } sorted NEWEST FIRST (from /eps?sym=)
//   price      - current price (number)
//   simfinData - window.__simfinData[sym] raw object ({ balance, income }),
//                may be null/undefined if not yet fetched
//
// ────────────────────────────────────────────────────────────────────────

// ─── Financial Strength ─────────────────────────────────────────────────

var DEFAULT_THRESHOLDS = {
  grossMargin:  [45, 30, 15, 5 ],
  opMargin:     [15, 8,  3,  0 ],
  netMargin:    [10, 5,  2,  0 ],
  roe:          [18, 10, 5,  0 ],
  currentRatio: [1.8, 1.3, 1.0, 0.5],
  quickRatio:   [1.2, 0.8, 0.5, 0.3],
  revGrowth:    [12, 7,  3,  0 ],
};

export function getFinancialStrengthThresholds(sector) {
  var _sector = sector || "";
  var _isFinancial  = _sector.indexOf("Financial") !== -1;
  var _isHealthcare = _sector.indexOf("Healthcare") !== -1 || _sector.indexOf("Health") !== -1;
  var _isEnergy     = _sector.indexOf("Energy") !== -1 || _sector.indexOf("Mining") !== -1 || _sector.indexOf("Basic Materials") !== -1;
  var _isRetail     = _sector.indexOf("Consumer") !== -1 || _sector.indexOf("Retail") !== -1;
  var _isUtility    = _sector.indexOf("Utilities") !== -1 || _sector.indexOf("Real Estate") !== -1;
  var _isTech       = _sector.indexOf("Technology") !== -1 || _sector.indexOf("Communication") !== -1;
  var _hasSector    = !!_sector;
  var DEFAULT_T = DEFAULT_THRESHOLDS;
  return {
    grossMargin:  !_hasSector?DEFAULT_T.grossMargin:_isHealthcare?[25,15,8,3]:_isFinancial?[40,25,15,5]:_isEnergy?[45,30,15,5]:_isRetail?[35,20,10,5]:_isUtility?[50,35,20,10]:_isTech?[60,40,25,10]:DEFAULT_T.grossMargin,
    opMargin:     !_hasSector?DEFAULT_T.opMargin:_isHealthcare?[8,5,3,0]:_isFinancial?[30,20,10,5]:_isEnergy?[20,10,5,0]:_isRetail?[8,4,2,0]:_isUtility?[20,12,6,2]:_isTech?[30,15,5,0]:DEFAULT_T.opMargin,
    netMargin:    !_hasSector?DEFAULT_T.netMargin:_isHealthcare?[6,3,2,0]:_isFinancial?[20,12,6,0]:_isEnergy?[15,8,3,0]:_isRetail?[5,3,1,0]:_isUtility?[15,8,4,0]:_isTech?[20,10,5,0]:DEFAULT_T.netMargin,
    roe:          !_hasSector?DEFAULT_T.roe:_isHealthcare?[15,10,6,0]:_isFinancial?[12,8,5,0]:_isEnergy?[15,10,5,0]:_isRetail?[20,12,6,0]:_isUtility?[12,8,4,0]:_isTech?[25,15,8,0]:DEFAULT_T.roe,
    currentRatio: !_hasSector?DEFAULT_T.currentRatio:(_isFinancial||_isHealthcare||_isUtility)?[1.2,1.0,0.8,0.5]:DEFAULT_T.currentRatio,
    quickRatio:   !_hasSector?DEFAULT_T.quickRatio:(_isFinancial||_isHealthcare)?[1.0,0.8,0.6,0.3]:DEFAULT_T.quickRatio,
    revGrowth:    !_hasSector?DEFAULT_T.revGrowth:_isUtility?[8,5,2,0]:_isEnergy?[15,8,3,0]:_isFinancial?[10,6,3,0]:_isTech?[20,10,5,0]:DEFAULT_T.revGrowth,
  };
}

export function metricScore(val, key, thresholds) {
  if (!val || val === 0) return 0;
  var t = (thresholds && thresholds[key]) || [60,40,20,10];
  for (var i=0; i<t.length; i++) { if (val >= t[i]) return t.length-i; }
  return 1;
}

/**
 * Canonical Financial Strength: 11 metrics, each scored 1-5 using
 * sector-aware benchmarks, then averaged.
 * Margins: Gross / Operating / Net Profit
 * Efficiency: ROE
 * Liquidity: Current Ratio / Quick Ratio
 * Cash Generation: Free Cash Flow
 * Leverage: Debt/Equity, Debt/EBITDA, Debt/Cash Flow
 * Growth: Revenue Growth YoY
 * Only metrics with available data are included.
 *
 * @param {object} ov - getOverview(sym) result
 * @returns {{classification:string|null, score:number}}
 */
export function computeFinancialStrength(ov) {
  if (!ov) return { classification: null, score: 0 };
  var sector = ov.sector || "";
  var thresholds = getFinancialStrengthThresholds(sector);

  var gm  = ov.grossMargin  || 0;
  var om  = ov.opMargin     || 0;
  var nm  = ov.netMargin    || 0;
  var roe = ov.roe          || 0;
  var cr  = ov.currentRatio || 0;
  var qr  = ov.quickRatio   || 0;
  var de  = ov.de           || 0;
  var rg  = ov.revGrowth    || 0;
  var fcf = ov.fcfRaw       || 0;
  var eb  = ov.ebitda       || 0;
  var td  = ov.totalDebt    || 0;
  var ocf = ov.ocfRaw       || 0;

  var gridScores = [
    metricScore(gm,  "grossMargin",  thresholds),
    metricScore(om,  "opMargin",     thresholds),
    metricScore(nm,  "netMargin",    thresholds),
    metricScore(roe, "roe",          thresholds),
    metricScore(cr,  "currentRatio", thresholds),
    metricScore(qr,  "quickRatio",   thresholds),
    metricScore(rg,  "revGrowth",    thresholds),
    fcf > 0 ? (fcf > 10e9 ? 5 : fcf > 1e9 ? 4 : 3) : 0,
    (!eb || !td) ? 0 : (function(){ var r=td/eb; return r<1?5:r<2?4:r<3?3:r<4?2:1; })(),
    (!ocf || !td) ? 0 : (function(){ var r=td/ocf; return r<1?5:r<2?4:r<3?3:r<5?2:1; })(),
    de > 0 ? (de<0.5?5:de<1?4:de<2?3:de<3?2:1) : 0,
  ].filter(function(s){ return s > 0; });

  var avg = gridScores.length > 0
    ? gridScores.reduce(function(a,b){ return a+b; }, 0) / gridScores.length
    : 0;

  var classification = avg >= 4 ? "Exceptional" : avg >= 3 ? "Strong" : avg >= 2 ? "Moderate" : avg >= 1 ? "Weak" : avg > 0 ? "Poor" : null;
  var score = avg >= 4 ? 5 : avg >= 3 ? 4 : avg >= 2 ? 3 : avg >= 1 ? 2 : avg > 0 ? 1 : 0;

  return { classification: classification, score: score, gridScores: gridScores, sector: sector };
}

// ─── Intrinsic Value ────────────────────────────────────────────────────

function calcDCF(eps0, growthRate, terminalRate, wacc, years) {
  var total = 0, fcf = eps0;
  for (var y = 1; y <= years; y++) {
    fcf = fcf * (1 + (y <= 10 ? growthRate : terminalRate));
    total += fcf / Math.pow(1 + wacc, y);
  }
  return total;
}

/**
 * Reproduces the Detail page's "Improved base values" block: derives
 * baseEps (previous-year EPS from history, falling back to TTM-derived
 * EPS), the Y1-5 / Y6-10 growth rates (positive-streak CAGR primary,
 * analyst estimate fallback, both hard-capped at 25%), and the
 * beta-adjusted WACC (clamped 6%-10%).
 *
 * @param {object}   ov
 * @param {object[]} epsHistory - sorted newest first, may be null
 * @param {number}   price
 * @returns {object}
 */
export function computeGrowthAndWacc(ov, epsHistory, price) {
  var GROWTH_CAP = 0.25;
  var pe  = ov ? ov.pe  : 0;
  var eps = (pe > 0 && price > 0) ? price / pe : 0;
  var gr  = Math.max(ov ? (ov.epsG || 5) : 5, 2) / 100;

  var baseEps = eps;
  if (epsHistory && epsHistory.length > 0) {
    var prevYearRow = epsHistory[0]; // sorted newest first
    if (prevYearRow && prevYearRow.eps && prevYearRow.eps > 0) {
      baseEps = prevYearRow.eps;
    }
  }

  var histGrowthRate = gr;
  var histCagrYears  = 0;
  var histCagrRaw    = 0;
  var histG1Source   = "";
  var histG2Rate     = 0;
  var histG2Source   = "";

  if (epsHistory && epsHistory.length >= 2) {
    var sorted = epsHistory.slice().sort(function(a, b) { return b.year - a.year; });
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
        histGrowthRate = streakCagr;
        histG1Source   = streakYears + "-yr positive CAGR)";
      } else {
        if (ov && ov.ltG > 0) {
          var analystG1  = ov.ltG / 100;
          histGrowthRate = Math.min(analystG1, GROWTH_CAP);
          histG1Source   = analystG1 > GROWTH_CAP
            ? "CAGR>" + (streakCagr*100).toFixed(0) + "%, analyst>" + (analystG1*100).toFixed(0) + "%, capped 25%)"
            : "CAGR>" + (streakCagr*100).toFixed(0) + "%, analyst est.)";
        } else {
          histGrowthRate = GROWTH_CAP;
          histG1Source   = "CAGR capped 25%)";
        }
      }
    } else {
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
    var analystG1nh  = ov.ltG / 100;
    histGrowthRate   = Math.min(analystG1nh, GROWTH_CAP);
    histG1Source     = analystG1nh > GROWTH_CAP ? "analyst capped 25%)" : "analyst est.)";
    histCagrYears    = -1;
  }

  if (ov && ov.ltG1Y > 0) {
    var analystG2  = ov.ltG1Y / 100;
    histG2Rate     = Math.min(analystG2, GROWTH_CAP);
    histG2Source   = analystG2 > GROWTH_CAP ? "linear decay 25%->4%)" : "linear decay " + (histG2Rate*100).toFixed(0) + "%->4%)";
  } else {
    histG2Rate   = histGrowthRate * 0.50;
    histG2Source = "linear decay " + (histG2Rate*100).toFixed(0) + "%->4%)";
  }

  var beta = ov ? (ov.beta || 1.0) : 1.0;
  var WACC_ADJ = Math.min(Math.max(0.042 + beta * 0.035, 0.06), 0.10);

  return {
    GROWTH_CAP: GROWTH_CAP, pe: pe, eps: eps, baseEps: baseEps,
    histGrowthRate: histGrowthRate, histCagrYears: histCagrYears, histCagrRaw: histCagrRaw,
    histG1Source: histG1Source, histG2Rate: histG2Rate, histG2Source: histG2Source,
    beta: beta, WACC_ADJ: WACC_ADJ,
  };
}

// Pull the most recent-year row out of a SimFin statement block.
function _sfLatestRow(sfData, kind) {
  if (!sfData || !sfData[kind] || !Array.isArray(sfData[kind]) || !sfData[kind][0]) return null;
  var stmt = sfData[kind][0].statements && sfData[kind][0].statements[0];
  if (!stmt || !stmt.columns || !stmt.data || stmt.data.length === 0) return null;
  var cols = stmt.columns;
  var row  = stmt.data[stmt.data.length - 1];
  function get(name) { var ci = cols.indexOf(name); return (ci !== -1 && row[ci] !== null) ? row[ci] : null; }
  return get;
}

/**
 * Reproduces the Detail page's Intrinsic Value block: 8 valuation models
 * (Cash Flow / Earnings / Net Income / Gordon Growth / Revenue PS / EV-Rev
 * / Revenue DCF / Price-Book), sector-gated applicability, averaged into
 * a single "oracle" fair value.
 *
 * @param {object} input
 * @param {object} input.ov
 * @param {object[]} input.epsHistory - sorted newest first, may be null
 * @param {number} input.price
 * @param {object} input.simfinData  - window.__simfinData[sym], may be null
 * @returns {object}
 */
export function computeIntrinsicValue(input) {
  var ov         = input.ov;
  var epsHistory = input.epsHistory;
  var price      = input.price || 0;
  var simfinData = input.simfinData;

  var growth = computeGrowthAndWacc(ov, epsHistory, price);
  var pe = growth.pe, baseEps = growth.baseEps;
  var g1Sum = growth.histGrowthRate * 100;
  var g2Sum = growth.histG2Rate * 100;
  var WACC_ADJ = growth.WACC_ADJ;

  var vals = [];
  var oracle = (baseEps > 0 && pe > 0)
    ? calcDCF(baseEps, growth.histGrowthRate, 0.04, WACC_ADJ, 10).toFixed(2)
    : (price > 0 ? price.toFixed(2) : "-");
  var modelsMeta = [];
  var sectorForOutput = ov ? (ov.sector || "") : "";

  if (ov && baseEps > 0 && price > 0) {
    var termGrowth = 0.04;
    var maxVal     = price * 3;
    var cap        = function(v) { return Math.min(v, maxVal); };

    var sfGetBal = _sfLatestRow(simfinData, "balance");
    var sfDebtSum = 0; var sfCashSum = ov.cash || 0;
    if (sfGetBal) {
      var ltd = sfGetBal("Long Term Debt") || 0;
      var std = sfGetBal("Short Term Debt") || 0;
      if (ltd + std > 0) sfDebtSum = ltd + std;
      var sc = sfGetBal("Cash, Cash Equivalents & Short Term Investments");
      if (sc !== null) sfCashSum = sc;
    }

    var ocfSum    = ov.ocfRaw > 0 ? ov.ocfRaw : ov.fcfRaw;
    var sharesSum = ov.sharesOut || 1;
    var g1r = g1Sum / 100; var g2r = g2Sum / 100;

    var sfGetInc = _sfLatestRow(simfinData, "income");
    var niBaseSum = ov.niRaw > 0 ? ov.niRaw : 0;
    var niSrcSum  = niBaseSum > 0 ? "Yahoo" : "SimFin";
    if (!niBaseSum && sfGetInc) {
      var sfNIS = sfGetInc("Net Income") || sfGetInc("Net Income Available to Common Shareholders");
      if (sfNIS && sfNIS > 0) { niBaseSum = sfNIS; niSrcSum = "SimFin"; }
    }

    function calcEVSum(base, g1p, g2p, disc) {
      var ev = 0; var f = base;
      var decayStep = (g2p - termGrowth) / 4;
      for (var y = 1; y <= 20; y++) {
        var g;
        if (y <= 5) { g = g1p; }
        else if (y <= 10) { g = g2p - decayStep * (y - 6); }
        else { g = termGrowth; }
        f *= (1 + g); ev += f / Math.pow(1 + disc, y);
      }
      return ev;
    }

    var dcf20Calc = (function() {
      if (!ocfSum || !sharesSum) return null;
      var ev     = calcEVSum(ocfSum, g1r, g2r, WACC_ADJ);
      var equity = ev - sfDebtSum + sfCashSum;
      return { ocf: ocfSum, debt: sfDebtSum, cash: sfCashSum, shares: sharesSum,
               ev: ev, equity: equity, perShare: equity / sharesSum, disc: WACC_ADJ };
    })();
    var dcf20 = dcf20Calc ? cap(dcf20Calc.perShare) : 0;

    var dcff20Calc = (function() {
      if (!niBaseSum || !sharesSum) return null;
      var ev     = calcEVSum(niBaseSum, g1r, g2r, WACC_ADJ);
      var equity = ev - sfDebtSum + sfCashSum;
      return { niBase: niBaseSum, niSrc: niSrcSum, debt: sfDebtSum, cash: sfCashSum, shares: sharesSum,
               ev: ev, equity: equity, perShare: equity / sharesSum, disc: WACC_ADJ };
    })();
    var dcff20 = dcff20Calc ? cap(dcff20Calc.perShare) : 0;

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
    var dni20 = dni20Calc ? cap(dni20Calc.perShare) : 0;

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
    var dcffT = ggCalc ? cap(ggCalc.total) : 0;

    var psCalcSimfinRev = 0;
    if (sfGetInc) {
      var _r = sfGetInc("Revenue");
      if (_r !== null && _r > 0) psCalcSimfinRev = _r;
    }
    var psCalcShares  = ov.sharesOut || 1;
    var psCalcRevPS   = psCalcSimfinRev > 0 && psCalcShares > 0
      ? psCalcSimfinRev / psCalcShares
      : (ov.ps > 0 && price > 0) ? price / ov.ps
      : 0;
    var psCalcIV      = psCalcRevPS > 0 && ov.ps > 0 ? cap(ov.ps * psCalcRevPS) : price > 0 ? cap(price) : 0;
    var ps = psCalcIV;

    var _ivSector = ov.sector || "";
    var _ivIsTech      = _ivSector.indexOf("Technology") !== -1 || _ivSector.indexOf("Communication") !== -1;
    var _ivIsHealth    = _ivSector.indexOf("Healthcare") !== -1 || _ivSector.indexOf("Health") !== -1;
    var _ivIsFinancial = _ivSector.indexOf("Financial") !== -1;
    var _ivIsEnergy    = _ivSector.indexOf("Energy") !== -1 || _ivSector.indexOf("Basic Materials") !== -1;
    var _ivIsUtility   = _ivSector.indexOf("Utilities") !== -1 || _ivSector.indexOf("Real Estate") !== -1;
    var _ivIsConsumer  = _ivSector.indexOf("Consumer") !== -1 || _ivSector.indexOf("Retail") !== -1;

    var _ivIsProfitable = (dcf20 > 0 || dcff20 > 0 || dni20 > 0);

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

    var evRevVal = 0;
    var evRevMultiple = _ivIsHealth ? 6 : _ivIsTech ? 10 : _ivIsConsumer ? 2 : _ivIsFinancial ? 3 : _ivIsUtility ? 2 : 3;
    var revTotal = (function(){
      if (sfGetInc) {
        var rr = sfGetInc("Revenue");
        if (rr !== null && rr > 0) return rr;
      }
      if (ov.fcfRaw && ov.ps > 0 && price > 0) return (price / ov.ps) * sharesSum;
      return 0;
    })();
    if (MODEL_APPLICABLE["EV/Revenue"] && revTotal > 0 && sharesSum > 0) {
      var revPS = revTotal / sharesSum;
      evRevVal = cap(evRevMultiple * revPS);
    }

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

    var pbVal = 0;
    var sectorPB = _ivIsFinancial ? 1.2 : _ivIsHealth ? 3.0 : _ivIsConsumer ? 2.0 : 1.5;
    if (MODEL_APPLICABLE["Price/Book"] && ov.bookValue > 0 && sharesSum > 0) {
      var bvps = ov.bookValue / sharesSum;
      pbVal = cap(sectorPB * bvps);
    }

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

    ALL_MODELS.forEach(function(m) {
      m.applicable = MODEL_APPLICABLE[m.key] !== false;
    });

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

    var oracleAvg = vals.length > 0
      ? vals.reduce(function(sum, v) { return sum + v.value; }, 0) / vals.length
      : 0;
    oracle = oracleAvg.toFixed(2);
    sectorForOutput = _ivSector;

    if (oracleAvg > 0) {
      vals.push({ label:"Intrinsic Value", value:oracleAvg, color:"#1a8a3a", bold:true, modelsMeta:modelsMeta, sectorLabel:_ivSector, modelApplicable:MODEL_APPLICABLE });
    }
  }

  // -- Classification (matches Detail's ivLabel/ivPct/ivIsUnder block) --
  var ivOracleNum = vals.length > 0 ? parseFloat(oracle) : 0;
  var ivPct     = (price > 0 && ivOracleNum > 0) ? Math.round(Math.abs(ivOracleNum - price) / price * 100) : 0;
  var ivIsUnder = ivOracleNum > price;
  var ivLabel = null; var ivScore = 0; var ivSublabel = null;
  if (ivOracleNum > 0 && price > 0) {
    if (ivIsUnder && ivPct > 20)       { ivLabel = "Exceptional"; ivScore = 5; }
    else if (ivIsUnder && ivPct >= 5)   { ivLabel = "Undervalued"; ivScore = 4; }
    else if (ivIsUnder)                 { ivLabel = "Fair";        ivScore = 3; }
    else if (!ivIsUnder && ivPct <= 10) { ivLabel = "Premium";     ivScore = 2; }
    else                                { ivLabel = "Overvalued";  ivScore = 1; }
    ivSublabel = ivPct + "% " + (ivIsUnder ? "discount" : "premium") + " ($" + Math.round(ivOracleNum) + ")";
  }

  return {
    oracle: oracle, oracleNum: ivOracleNum, vals: vals, modelsMeta: modelsMeta,
    sector: sectorForOutput, growth: growth,
    ivLabel: ivLabel, ivScore: ivScore, ivSublabel: ivSublabel, ivPct: ivPct, ivIsUnder: ivIsUnder,
  };
}
