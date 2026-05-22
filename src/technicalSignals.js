/**
 * technicalSignals.js
 * Central calculation module — single source of truth for all technical signal logic.
 * Used by: App.jsx (journal, detail tabs), future signal effectiveness page, scheduler.
 *
 * All functions are pure — no side effects, no API calls.
 * Input: raw OHLCV bars + indicator data from Massive/Yahoo.
 * Output: structured signal objects.
 */

// ─── Core helpers ────────────────────────────────────────────────────────────

export function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce(function(s, v) { return s + v; }, 0) / arr.length;
}

export function calcEMA(closes, period) {
  if (!closes || closes.length < period) return null;
  var k = 2 / (period + 1);
  var ema = avg(closes.slice(0, period));
  for (var i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calcSMA(closes, period) {
  if (!closes || closes.length < period) return null;
  return avg(closes.slice(closes.length - period));
}

export function calcRSI(closes, period) {
  if (!period) period = 14;
  if (!closes || closes.length < period + 1) return null;
  var gains = 0, losses = 0;
  for (var i = closes.length - period; i < closes.length; i++) {
    var diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  var ag = gains / period, al = losses / period;
  return al === 0 ? 100 : 100 - (100 / (1 + ag / al));
}

export function calcOBV(bars) {
  // bars = oldest-first, each bar: { c, v }
  var obv = [0];
  for (var i = 1; i < bars.length; i++) {
    var vol = bars[i].v || 0;
    if (bars[i].c > bars[i - 1].c)      obv.push(obv[i - 1] + vol);
    else if (bars[i].c < bars[i - 1].c) obv.push(obv[i - 1] - vol);
    else                                 obv.push(obv[i - 1]);
  }
  return obv;
}

// ─── Trend signals ────────────────────────────────────────────────────────────

/**
 * Calculate trend score from OHLCV bars + indicator data.
 * Weights: WSMA 30%, SMA200 30%, Cross 20%, EMA20 10%, SMA50 10%
 * @param {object[]} bars - oldest-first OHLCV bars { c, h, l, v }
 * @param {object}   ind  - Massive indicators { ema20, sma50, sma200, wsma10, wsma40, rsiHistory }
 * @param {object}   crossData - optional cross detection result
 * @returns {object} trend result
 */
export function calcTrendScore(bars, ind, crossData) {
  if (!bars || !ind) return { score: null, status: null };
  var n = bars.length;
  var price = n > 0 ? bars[n - 1].c : 0;

  var ema20  = ind.ema20  ? parseFloat(ind.ema20)  : null;
  var sma50  = ind.sma50  ? parseFloat(ind.sma50)  : null;
  var sma200 = ind.sma200 ? parseFloat(ind.sma200) : null;
  var wsma10 = ind.wsma10 ? parseFloat(ind.wsma10) : null;
  var wsma40 = ind.wsma40 ? parseFloat(ind.wsma40) : null;

  var wsmaG  = wsma10 && wsma40 ? (wsma10 - wsma40) / wsma40 * 100 : null;
  var s200g  = sma200 ? (price - sma200) / sma200 * 100 : null;
  var s50g   = sma50  ? (price - sma50)  / sma50  * 100 : null;
  var ema20g = ema20  ? (price - ema20)  / ema20  * 100 : null;

  // SMA200 gap direction
  var gapDir = null;
  if (crossData && crossData.sma200GapDir) gapDir = crossData.sma200GapDir;

  function sc(key) {
    if (key === 'wsma')  return wsmaG  === null ? 3 : wsmaG > 5 ? 5 : wsmaG > 1 ? 4 : wsmaG > -1 ? 3 : wsmaG > -5 ? 2 : 1;
    if (key === 'sma200') {
      if (s200g === null) return 3;
      if (s200g > 10) return 5;
      if (s200g > 2)  return 4;
      if (s200g > -10) return 3;
      if (s200g > -20) return gapDir === 'improving' ? 3 : 2;
      return gapDir === 'improving' ? 2 : 1;
    }
    if (key === 'sma50') return s50g === null ? 3 : s50g > 5 ? 5 : s50g > 1 ? 4 : s50g > -5 ? 3 : s50g > -10 ? 2 : 1;
    if (key === 'ema20') return ema20g === null ? 3 : ema20g > 5 ? 5 : ema20g > 1 ? 4 : ema20g > -5 ? 3 : ema20g > -10 ? 2 : 1;
    if (key === 'cross') {
      if (!sma50 || !sma200) return 3;
      var crsG = (sma50 - sma200) / sma200 * 100;
      if (!crossData || crossData.type === 'unknown') return crsG > 10 ? 5 : crsG > 1 ? 4 : crsG > -1 ? 3 : crsG > -10 ? 2 : 1;
      if (crossData.type === 'golden') return crossData.gapDir === 'worsening' ? 5 : 4;
      if (crossData.type === 'death')  return crossData.gapDir === 'improving' ? 3 : crossData.gapDir === 'stable' ? 2 : 1;
      return 3;
    }
    return 3;
  }

  var W = { wsma: 30, sma200: 30, cross: 20, ema20: 10, sma50: 10 };
  var tot = 0;
  Object.keys(W).forEach(function(k) { tot += (sc(k) / 5) * W[k]; });
  var score = Math.round(tot);
  var status = score >= 70 ? 'Strong Uptrend' : score >= 55 ? 'Uptrend' : score >= 40 ? 'Sideways' : score >= 25 ? 'Downtrend' : 'Strong Downtrend';

  return {
    score:   score,
    status:  status,
    priceVs20dEmaPct:  ema20g  !== null ? parseFloat(ema20g.toFixed(2))  : null,
    priceVs50dSmaPct:  s50g    !== null ? parseFloat(s50g.toFixed(2))    : null,
    priceVs200dSmaPct: s200g   !== null ? parseFloat(s200g.toFixed(2))   : null,
    weeklyTrendScore:  wsmaG   !== null ? parseFloat(wsmaG.toFixed(2))   : null,
    goldenDeathCrossStatus: crossData ? crossData.type : null,
  };
}

// ─── Momentum signals ─────────────────────────────────────────────────────────

/**
 * Calculate momentum score.
 * Weights: OBV 40%, Volume 30%, Vol/Price Divergence 20%, Close Quality 15% (from today signal)
 * RSI direction-aware scoring.
 * @param {object[]} bars - oldest-first OHLCV bars
 * @param {object}   ind  - Massive indicators { rsi14, rsiHistory, macd, macdHistory }
 * @returns {object} momentum result
 */
export function calcMomentumScore(bars, ind) {
  if (!bars || !ind) return { score: null, status: null };
  var n = bars.length;

  var rsi    = ind.rsi14 != null ? parseFloat(ind.rsi14) : null;
  var rsiH   = ind.rsiHistory ? ind.rsiHistory.map(function(v) { return parseFloat(v); }) : [];
  var macdH  = ind.macd && ind.macd.histogram != null ? parseFloat(ind.macd.histogram) : null;
  var macdHArr = ind.macdHistory || [];

  // RSI direction: avg(T-0,T-1) vs avg(T-2..T-6)
  var rsiDir = rsiH.length >= 7
    ? ((rsiH[0] + rsiH[1]) / 2) - ((rsiH[2] + rsiH[3] + rsiH[4] + rsiH[5] + rsiH[6]) / 5)
    : null;

  // RSI score (direction-aware)
  function rsiScore() {
    if (rsi === null) return 3;
    if (rsi > 70) return 4; // overbought cap
    if (rsi >= 65) return rsiDir !== null && rsiDir < -3 ? 4 : 5;
    if (rsi >= 55) return rsiDir !== null && rsiDir < -3 ? 3 : 4;
    if (rsi >= 45) return rsiDir !== null && rsiDir > 3 ? 4 : rsiDir !== null && rsiDir < -3 ? 2 : 3;
    if (rsi >= 35) return rsiDir !== null && rsiDir > 0 ? 3 : 2;
    return 1;
  }

  // MACD score
  function macdScore() {
    if (macdH === null) return 3;
    var prevH = macdHArr[1] && macdHArr[1].histogram != null ? parseFloat(macdHArr[1].histogram) : null;
    if (macdH > 0 && prevH !== null && macdH > prevH) return 5;
    if (macdH > 0) return 4;
    if (prevH !== null && macdH > prevH) return 3;
    if (macdH > -0.5) return 2;
    return 1;
  }

  // ROC = (price - SMA5) / SMA5
  var avg30v = n >= 30 ? avg(bars.slice(n - 30).map(function(b) { return b.v; })) : null;
  var sma5   = n >= 5  ? avg(bars.slice(n - 5).map(function(b) { return b.c; }))  : null;
  var price  = n > 0 ? bars[n - 1].c : 0;
  var roc    = sma5 && sma5 > 0 ? (price - sma5) / sma5 * 100 : null;

  function rocScore() {
    if (roc === null) return 3;
    return roc > 5 ? 5 : roc > 2 ? 4 : roc > -2 ? 3 : roc > -5 ? 2 : 1;
  }

  var W = { rsi: 40, macd: 40, roc: 20 };
  var rs = rsiScore(), ms = macdScore(), rcs = rocScore();
  var score = Math.round(rs * W.rsi / 5 + ms * W.macd / 5 + rcs * W.roc / 5);

  var status = score >= 80 ? 'Strong' : score >= 65 ? 'Building' : score >= 50 ? 'Neutral' : score >= 35 ? 'Fading' : 'Weak';

  return {
    score:    score,
    status:   status,
    rsiValue: rsi !== null ? parseFloat(rsi.toFixed(2)) : null,
    rsiDirection5d: rsiDir !== null ? parseFloat(rsiDir.toFixed(2)) : null,
    macdHistogram: macdH,
    macdHistogramDirection: macdH !== null && macdHArr[1] ? (macdH > parseFloat(macdHArr[1].histogram || 0) ? 'up' : 'down') : null,
    priceVsSma5Pct: roc !== null ? parseFloat(roc.toFixed(2)) : null,
  };
}

// ─── Smart Money Flow signals ─────────────────────────────────────────────────

/**
 * Calculate all three Smart Money Flow signals.
 * @param {object[]} bars - oldest-first OHLCV bars { c, h, l, v }
 * @param {number}   price - current price
 * @returns {object} smf result
 */
export function calcSmartMoneyFlow(bars, price) {
  if (!bars || bars.length < 2) return { status: null, score: null, todayActivityScore: null, fiveDayFlowScore: null, thirtyDayAccumulationScore: null };

  var n = bars.length;
  var avg30v = n >= 30 ? avg(bars.slice(n - 30).map(function(b) { return b.v; })) : avg(bars.map(function(b) { return b.v; }));
  var obv = calcOBV(bars);

  function getScoreLabel(s) {
    return s >= 86 ? 'Very High' : s >= 71 ? 'High' : s >= 51 ? 'Moderate' : s >= 31 ? 'Mild' : 'Low';
  }

  // ── Today Activity ─────────────────────────────────────────────────────────
  var todayScore = null;
  if (n >= 2) {
    var today = bars[n - 1], yest = bars[n - 2];
    // OBV direction magnitude (40%)
    var obvDayChange = obv[n - 1] - obv[n - 2];
    var obvDayRatio  = avg30v > 0 ? obvDayChange / avg30v : 0;
    var obvDir = obvDayRatio > 1.0 ? 100 : obvDayRatio > 0.3 ? 75 : obvDayRatio > -0.3 ? 50 : obvDayRatio > -1.0 ? 25 : 0;
    // Volume surge (25%)
    var vRatio = avg30v > 0 ? today.v / avg30v : 0;
    var volScore = vRatio >= 3.0 ? 100 : vRatio >= 2.0 ? 75 : vRatio >= 1.5 ? 50 : vRatio >= 1.2 ? 25 : 0;
    // Vol/Price divergence (20%)
    var pct = yest.c > 0 ? (today.c - yest.c) / yest.c * 100 : 0;
    var vTier = vRatio >= 2.0 ? 'high' : vRatio >= 1.5 ? 'elevated' : vRatio >= 1.0 ? 'normal' : 'low';
    var pTier = pct > 3 ? 'strongUp' : pct > 1 ? 'mildUp' : pct > -1 ? 'flat' : pct > -3 ? 'mildDown' : 'strongDown';
    var matrix = {
      high:     { strongUp: 65, mildUp: 80, flat: 100, mildDown: 90, strongDown: 10 },
      elevated: { strongUp: 55, mildUp: 65, flat: 80,  mildDown: 70, strongDown: 15 },
      normal:   { strongUp: 50, mildUp: 50, flat: 50,  mildDown: 45, strongDown: 30 },
      low:      { strongUp: 45, mildUp: 45, flat: 40,  mildDown: 40, strongDown: 25 }
    };
    var vpdScore = matrix[vTier][pTier];
    // Strong close (15%)
    var rng = today.h - today.l;
    var closePos = rng > 0 ? (today.c - today.l) / rng : 0.5;
    var closeScore = closePos > 0.85 ? 100 : closePos > 0.7 ? 80 : closePos > 0.5 ? 60 : closePos > 0.3 ? 30 : 0;
    todayScore = Math.round(obvDir * 0.20 + volScore * 0.30 + vpdScore * 0.35 + closeScore * 0.15);
  }

  // ── 5-Day Flow ─────────────────────────────────────────────────────────────
  var fiveDayScore = null;
  if (n >= 6) {
    var obvNet5 = obv[n - 1] - obv[n - 6];
    var obvNet5Days = avg30v > 0 ? obvNet5 / avg30v : 0;
    var obv5Score = obvNet5Days > 2 ? 100 : obvNet5Days > 0 ? 75 : obvNet5Days > -2 ? 50 : obvNet5Days > -4 ? 25 : 0;
    var avg5v = avg(bars.slice(n - 5).map(function(b) { return b.v; }));
    var vRatio5 = avg30v > 0 ? avg5v / avg30v : 0;
    var volScore5 = vRatio5 >= 2.0 ? 100 : vRatio5 >= 1.5 ? 75 : vRatio5 >= 1.2 ? 50 : vRatio5 >= 1.0 ? 25 : 0;
    var pct5 = bars[n - 6].c > 0 ? (bars[n - 1].c - bars[n - 6].c) / bars[n - 6].c * 100 : 0;
    var vTier5 = vRatio5 >= 2.0 ? 'high' : vRatio5 >= 1.5 ? 'elevated' : vRatio5 >= 1.0 ? 'normal' : 'low';
    var pTier5 = pct5 > 3 ? 'strongUp' : pct5 > 1 ? 'mildUp' : pct5 > -1 ? 'flat' : pct5 > -3 ? 'mildDown' : 'strongDown';
    var mat5 = {
      high:     { strongUp: 65, mildUp: 80, flat: 100, mildDown: 90, strongDown: 10 },
      elevated: { strongUp: 55, mildUp: 65, flat: 80,  mildDown: 70, strongDown: 15 },
      normal:   { strongUp: 50, mildUp: 50, flat: 50,  mildDown: 45, strongDown: 30 },
      low:      { strongUp: 45, mildUp: 45, flat: 40,  mildDown: 40, strongDown: 25 }
    };
    var vpd5Score = mat5[vTier5][pTier5];
    var sc5 = bars.slice(n - 5).filter(function(b) {
      var r = b.h - b.l; return r > 0 && (b.c - b.l) / r > 0.6;
    }).length;
    var sc5Score = sc5 >= 4 ? 100 : sc5 === 3 ? 75 : sc5 === 2 ? 50 : sc5 === 1 ? 25 : 0;
    fiveDayScore = Math.round(obv5Score * 0.35 + volScore5 * 0.25 + vpd5Score * 0.25 + sc5Score * 0.15);
  }

  // ── 30-Day Accumulation ────────────────────────────────────────────────────
  var thirtyDayScore = null;
  var obvTrend30d = null, volumeRatioVal = null;
  if (n >= 30) {
    var obvChange = obv[n - 1] - obv[1];
    var obvInDays = avg30v > 0 ? obvChange / avg30v : 0;
    var obvScore  = obvInDays > 5 ? 100 : obvInDays > 0 ? 75 : obvInDays > -5 ? 50 : obvInDays > -10 ? 25 : 0;
    var hvGreen = 0, hvRed = 0;
    for (var i = n - 29; i < n; i++) {
      if (bars[i].v > 1.5 * avg30v) {
        if (bars[i].c > bars[i - 1].c) hvGreen++;
        else if (bars[i].c < bars[i - 1].c) hvRed++;
      }
    }
    var hvScore = hvGreen >= hvRed * 2 ? 100 : hvGreen > hvRed ? 75 : hvGreen === hvRed ? 50 : hvRed > hvGreen ? 25 : 0;
    var pct30 = bars[n - 30].c > 0 ? (bars[n - 1].c - bars[n - 30].c) / bars[n - 30].c * 100 : 0;
    var priceScore = pct30 > 10 ? 100 : pct30 > 0 ? 75 : pct30 > -5 ? 50 : pct30 > -10 ? 25 : 0;
    var scDays = bars.slice(n - 30).filter(function(b) {
      var r = b.h - b.l; return r > 0 && (b.c - b.l) / r > 0.6;
    }).length;
    var scScore = scDays / 30 > 0.65 ? 100 : scDays / 30 > 0.5 ? 75 : scDays / 30 > 0.4 ? 50 : scDays / 30 > 0.3 ? 25 : 0;
    thirtyDayScore = Math.round(obvScore * 0.40 + hvScore * 0.25 + priceScore * 0.20 + scScore * 0.15);
    obvTrend30d    = parseFloat(obvInDays.toFixed(2));
    volumeRatioVal = bars[n - 1] ? parseFloat((bars[n - 1].v / avg30v).toFixed(2)) : null;
  }

  // Overall status
  function isHigh(s)  { return s !== null && s >= 71; }
  function isMild(s)  { return s !== null && s >= 31 && s < 71; }
  var tS = todayScore || 0, fS = fiveDayScore || 0, dS = thirtyDayScore || 0;
  var status;
  if (isHigh(tS) && isHigh(fS) && isHigh(dS))   status = 'Strong Multi-Timeframe Flow';
  else if (!isHigh(tS) && isHigh(fS) && isHigh(dS)) status = 'Accumulation Trend Positive';
  else if (isHigh(dS) && !isHigh(tS) && !isHigh(fS)) status = 'Constructive but Cooling';
  else if (isHigh(tS) && isHigh(fS) && !isHigh(dS))  status = 'Early Accumulation';
  else if (isHigh(tS) && !isHigh(fS) && !isHigh(dS)) status = 'Short-Term Spike';
  else status = 'No Clear Signal';

  var primaryScore = thirtyDayScore !== null ? thirtyDayScore : fiveDayScore !== null ? fiveDayScore : todayScore;

  return {
    status:   status,
    score:    primaryScore,
    todayActivityScore:           todayScore,
    fiveDayFlowScore:             fiveDayScore,
    thirtyDayAccumulationScore:   thirtyDayScore,
    obvValue:                     obv[n - 1] !== undefined ? parseFloat(obv[n - 1].toFixed(0)) : null,
    obvTrend30d:                  obvTrend30d,
    volumeRatio:                  volumeRatioVal,
    volumePriceDivergenceScore:   null, // today's vpdScore stored separately if needed
    strongCloseScore:             null,
  };
}

// ─── Reversal Watch signals ───────────────────────────────────────────────────

/**
 * Calculate Reversal Watch (bullish + bearish).
 * @param {object[]} bars - oldest-first OHLCV bars { c, h, l, v }
 * @param {object}   ind  - Massive indicators
 * @param {object}   meta - { hi52, lo52, price }
 * @returns {object} reversal result
 */
export function calcReversalWatch(bars, ind, meta) {
  if (!bars || bars.length < 5) return { status: null, score: null, bullishScore: null, bearishScore: null };

  var n     = bars.length;
  var price = meta && meta.price ? meta.price : (n > 0 ? bars[n - 1].c : 0);
  var hi52  = meta ? meta.hi52 : 0;
  var lo52  = meta ? meta.lo52 : 0;

  var rsi     = ind && ind.rsi14 != null ? parseFloat(ind.rsi14) : null;
  var rsiH    = ind && ind.rsiHistory ? ind.rsiHistory.map(function(v) { return parseFloat(v); }) : [];
  var macdH   = ind && ind.macd && ind.macd.histogram != null ? parseFloat(ind.macd.histogram) : null;
  var macdHArr = ind && ind.macdHistory ? ind.macdHistory : [];
  var ema20   = ind && ind.ema20 ? parseFloat(ind.ema20) : null;
  var sma50   = calcSMA(bars.map(function(b) { return b.c; }), 50);
  var avg30v  = n >= 30 ? avg(bars.slice(n - 30).map(function(b) { return b.v; })) : null;

  var rsiDir = rsiH.length >= 7
    ? ((rsiH[0] + rsiH[1]) / 2) - ((rsiH[2] + rsiH[3] + rsiH[4] + rsiH[5] + rsiH[6]) / 5)
    : null;

  // 5-day window helpers
  var cur5Hi  = n >= 5  ? Math.max.apply(null, bars.slice(n - 5).map(function(b) { return b.h; }))  : null;
  var prev5Hi = n >= 10 ? Math.max.apply(null, bars.slice(n - 10, n - 5).map(function(b) { return b.h; })) : null;
  var cur5Lo  = n >= 5  ? Math.min.apply(null, bars.slice(n - 5).map(function(b) { return b.l; }))  : null;
  var prev5Lo = n >= 10 ? Math.min.apply(null, bars.slice(n - 10, n - 5).map(function(b) { return b.l; })) : null;
  var recentHigh20 = n >= 21 ? Math.max.apply(null, bars.slice(n - 21, n - 1).map(function(b) { return b.h; })) : null;
  var recentLow20  = n >= 21 ? Math.min.apply(null, bars.slice(n - 21, n - 1).map(function(b) { return b.l; })) : null;
  var todayBar = bars[n - 1];
  var volRatio = avg30v && todayBar ? todayBar.v / avg30v : null;

  function ind_score(detected) { return detected === null ? null : detected ? 100 : 0; }

  function stageScore(inds) {
    var avail = inds.filter(function(v) { return v !== null; });
    if (avail.length === 0) return null;
    return Math.round(avail.reduce(function(s, v) { return s + v; }, 0) / avail.length);
  }

  function weightedScore(stages) {
    var avail = stages.filter(function(s) { return s.score !== null; });
    if (avail.length === 0) return null;
    var tw = avail.reduce(function(s, st) { return s + st.w; }, 0);
    return Math.round(avail.reduce(function(s, st) { return s + st.score * (st.w / tw); }, 0));
  }

  // ── Bullish ────────────────────────────────────────────────────────────────
  var bSetup = stageScore([
    rsi !== null && rsiDir !== null ? ind_score(rsi >= 30 && rsi <= 50 && rsiDir > -3) : null,
    rsi !== null && rsiH.length >= 5 && n >= 5 ? ind_score((function() {
      var pl = Math.min(bars[n-1].l, bars[n-2].l, bars[n-3].l);
      var pp = Math.min(bars[n-4].l, bars[n-5].l);
      return pl < pp && ((rsiH[0]+rsiH[1])/2) > ((rsiH[3]+rsiH[4])/2) + 2;
    })()) : null,
    rsi !== null && hi52 > 0 ? ind_score((price - lo52) / (hi52 - lo52) < 0.2 && rsiDir !== null && rsiDir > 0) : null,
    cur5Lo !== null && prev5Lo !== null ? ind_score(cur5Lo > prev5Lo) : null,
    n >= 10 ? ind_score((function() {
      var d5  = bars.slice(n-5).filter(function(b,i){ return i>0&&b.c<bars[n-5+i-1].c; }).reduce(function(s,b){ return s+b.v; },0);
      var d10 = bars.slice(n-10,n-5).filter(function(b,i){ return i>0&&b.c<bars[n-10+i-1].c; }).reduce(function(s,b){ return s+b.v; },0);
      return d5 < d10 * 0.8;
    })()) : null,
  ]);

  // Bullish trigger #2 near-cross: matches App.jsx partial score of 50
  var bRsiCross = null;
  if (rsi !== null && rsiH.length >= 2) {
    var bDet2 = (rsi >= 40 && rsiH[1] < 40) || (rsi >= 50 && rsiH[1] < 50);
    var bNear = !bDet2 && rsi >= 38 && rsi < 52;
    bRsiCross = bDet2 ? 100 : bNear ? 50 : 0;
  }
  // Bullish trigger #4 short-term MA: matches App.jsx (price up AND ema20 above recent avg)
  var bMaUp = null;
  if (ema20 !== null && n >= 3) {
    var bPrev2Avg = (bars[n-3].c + bars[n-2].c) / 2;
    bMaUp = (todayBar.c > bars[n-2].c && ema20 > bPrev2Avg) ? 100 : 0;
  } else if (n >= 2) {
    bMaUp = todayBar.c > bars[n-2].c ? 100 : 0;
  }

  var bTrigger = stageScore([
    macdH !== null && macdHArr.length >= 2 ? ind_score((function() {
      var prev = macdHArr[1] && macdHArr[1].histogram != null ? parseFloat(macdHArr[1].histogram) : null;
      return prev !== null && macdH > prev;
    })()) : null,
    bRsiCross,
    ema20 !== null ? ind_score(todayBar.c > ema20) : null,
    bMaUp,
  ]);

  var bConfirm = stageScore([
    recentHigh20 !== null ? ind_score(todayBar.c > recentHigh20) : null,
    sma50        !== null ? ind_score(todayBar.c > sma50)        : null,
    recentHigh20 !== null && avg30v !== null ? ind_score(todayBar.c > recentHigh20 && volRatio >= 1.5) : null,
    cur5Hi !== null && prev5Hi !== null && cur5Lo !== null && prev5Lo !== null ? ind_score(cur5Hi > prev5Hi && cur5Lo > prev5Lo) : null,
  ]);

  var bullishScore = weightedScore([{ score: bSetup, w: 40 }, { score: bTrigger, w: 30 }, { score: bConfirm, w: 30 }]);

  // ── Bearish ────────────────────────────────────────────────────────────────
  var dSetup = stageScore([
    rsi !== null && rsiDir !== null ? ind_score(rsi >= 65 && rsiDir < 0) : null,
    rsi !== null && rsiH.length >= 5 && n >= 5 ? ind_score((function() {
      var ph = Math.max(bars[n-1].h, bars[n-2].h, bars[n-3].h);
      var pp = Math.max(bars[n-4].h, bars[n-5].h);
      return ph > pp && ((rsiH[0]+rsiH[1])/2) < ((rsiH[3]+rsiH[4])/2) - 2;
    })()) : null,
    rsi !== null && hi52 > 0 ? ind_score((price - lo52) / (hi52 - lo52) > 0.85 && rsiDir !== null && rsiDir < 0) : null,
    cur5Hi !== null && prev5Hi !== null ? ind_score(cur5Hi < prev5Hi) : null,
    n >= 10 ? ind_score((function() {
      var u5  = bars.slice(n-5).filter(function(b,i){ return i>0&&b.c>bars[n-5+i-1].c; }).reduce(function(s,b){ return s+b.v; },0);
      var u10 = bars.slice(n-10,n-5).filter(function(b,i){ return i>0&&b.c>bars[n-10+i-1].c; }).reduce(function(s,b){ return s+b.v; },0);
      return u5 < u10 * 0.8;
    })()) : null,
  ]);

  // Bearish trigger #2 near-cross: matches App.jsx partial score
  var dRsiCross = null;
  if (rsi !== null && rsiH.length >= 2) {
    var dDet2 = (rsi < 60 && rsiH[1] >= 60) || (rsi < 50 && rsiH[1] >= 50);
    var dNear = !dDet2 && rsi >= 48 && rsi < 62;
    dRsiCross = dDet2 ? 100 : dNear ? 50 : 0;
  }
  // Bearish trigger #4 short-term MA turning down
  var dMaDn = null;
  if (ema20 !== null && n >= 3) {
    var dPrev2Avg = (bars[n-3].c + bars[n-2].c) / 2;
    dMaDn = (todayBar.c < bars[n-2].c && ema20 < dPrev2Avg) ? 100 : 0;
  } else if (n >= 2) {
    dMaDn = todayBar.c < bars[n-2].c ? 100 : 0;
  }

  var dTrigger = stageScore([
    macdH !== null && macdHArr.length >= 2 ? ind_score((function() {
      var prev = macdHArr[1] && macdHArr[1].histogram != null ? parseFloat(macdHArr[1].histogram) : null;
      return prev !== null && macdH < prev;
    })()) : null,
    dRsiCross,
    ema20 !== null ? ind_score(todayBar.c < ema20) : null,
    dMaDn,
  ]);

  var dConfirm = stageScore([
    recentLow20 !== null ? ind_score(todayBar.c < recentLow20) : null,
    sma50       !== null ? ind_score(todayBar.c < sma50)       : null,
    recentLow20 !== null && avg30v !== null ? ind_score(todayBar.c < recentLow20 && volRatio >= 1.5) : null,
    cur5Hi !== null && prev5Hi !== null && cur5Lo !== null && prev5Lo !== null ? ind_score(cur5Hi < prev5Hi && cur5Lo < prev5Lo) : null,
  ]);

  var bearishScore = weightedScore([{ score: dSetup, w: 40 }, { score: dTrigger, w: 30 }, { score: dConfirm, w: 30 }]);

  // Overall status
  function getRevLabel(s) {
    if (s === null) return 'Not enough data';
    if (s <= 20) return 'No Signal'; if (s <= 40) return 'Watch';
    if (s <= 60) return 'Forming'; if (s <= 80) return 'Triggered';
    return 'Confirmed';
  }

  function dirStatus(ss, ts, cs, dir) {
    var s = ss||0, t = ts||0, c = cs||0;
    if (s >= 60 && t >= 60 && cs !== null && c >= 70) return dir + ' Reversal Confirmed';
    if (s >= 60 && t >= 60 && cs !== null && c >= 40) return dir + ' Reversal Triggered';
    if (s >= 60 && t >= 60)                           return dir + ' Reversal Forming';
    if (s >= 40)                                      return dir + ' Reversal Watch';
    return 'No Signal';
  }

  var bs = bullishScore||0, bes = bearishScore||0;
  var diff = bs - bes;
  var status;
  if (bs < 21 && bes < 21) status = 'No Clear Reversal';
  else if (bs >= 40 && bes >= 40 && Math.abs(diff) <= 15) status = 'Mixed Reversal Signals';
  else if (diff > 15) status = dirStatus(bSetup, bTrigger, bConfirm, 'Bullish');
  else if (diff < -15) status = dirStatus(dSetup, dTrigger, dConfirm, 'Bearish');
  else status = 'Mixed Reversal Signals';

  var primaryScore = bs > bes ? bullishScore : bearishScore;

  return {
    status:                    status,
    score:                     primaryScore,
    bullishScore:              bullishScore,
    bearishScore:              bearishScore,
    bullishSetupScore:         bSetup,
    bullishTriggerScore:       bTrigger,
    bullishConfirmationScore:  bConfirm,
    bearishSetupScore:         dSetup,
    bearishTriggerScore:       dTrigger,
    bearishConfirmationScore:  dConfirm,
  };
}

// ─── Master snapshot function ─────────────────────────────────────────────────

/**
 * Calculate a full technical signal snapshot for one ticker on one date.
 * This is the master function called by the journal, scheduler, and detail page.
 *
 * @param {object} input
 * @param {string}   input.ticker
 * @param {string}   input.date       - YYYY-MM-DD
 * @param {object[]} input.ohlcv      - oldest-first OHLCV bars { date, open, high, low, close, volume }
 * @param {object}   input.indicators - Massive indicator object { ema20, sma50, sma200, wsma10, wsma40, rsi14, rsiHistory, macd, macdHistory }
 * @param {object}   input.crossData  - optional cross detection result
 * @param {object}   input.meta       - optional { hi52, lo52, price }
 * @returns {object} TechnicalSignalSnapshot
 */
export function calculateTechnicalSignalSnapshot(input) {
  var ticker    = input.ticker;
  var date      = input.date;
  var ohlcv     = input.ohlcv || [];   // oldest-first, each: { date, open, high, low, close, volume }
  var ind       = input.indicators || {};
  var crossData = input.crossData || null;
  var meta      = input.meta || {};

  // Normalise bars to { c, h, l, v } format
  var bars = ohlcv.map(function(b) {
    return {
      date: b.date,
      c: b.close  || b.c || 0,
      o: b.open   || b.o || 0,
      h: b.high   || b.h || 0,
      l: b.low    || b.l || 0,
      v: b.volume || b.v || 0,
    };
  });

  var n     = bars.length;
  var today = n > 0 ? bars[n - 1] : null;
  var price = meta.price || (today ? today.c : null);

  var trend    = calcTrendScore(bars, ind, crossData);
  var momentum = calcMomentumScore(bars, ind);
  var smf      = calcSmartMoneyFlow(bars, price);
  var reversal = calcReversalWatch(bars, ind, { hi52: meta.hi52 || 0, lo52: meta.lo52 || 0, price: price || 0 });

  return {
    ticker:       ticker,
    snapshotDate: date,
    open:   today ? today.o : null,
    high:   today ? today.h : null,
    low:    today ? today.l : null,
    close:  today ? today.c : null,
    volume: today ? today.v : null,
    trend: {
      status:                  trend.status,
      score:                   trend.score,
      priceVs20dEmaPct:        trend.priceVs20dEmaPct,
      priceVs50dSmaPct:        trend.priceVs50dSmaPct,
      priceVs200dSmaPct:       trend.priceVs200dSmaPct,
      weeklyTrendScore:        trend.weeklyTrendScore,
      goldenDeathCrossStatus:  trend.goldenDeathCrossStatus,
    },
    momentum: {
      status:                  momentum.status,
      score:                   momentum.score,
      rsiValue:                momentum.rsiValue,
      rsiDirection5d:          momentum.rsiDirection5d,
      macdHistogram:           momentum.macdHistogram,
      macdHistogramDirection:  momentum.macdHistogramDirection,
      priceVsSma5Pct:          momentum.priceVsSma5Pct,
    },
    reversalWatch: {
      status:                    reversal.status,
      score:                     reversal.score,
      bullishScore:              reversal.bullishScore,
      bearishScore:              reversal.bearishScore,
      bullishSetupScore:         reversal.bullishSetupScore,
      bullishTriggerScore:       reversal.bullishTriggerScore,
      bullishConfirmationScore:  reversal.bullishConfirmationScore,
      bearishSetupScore:         reversal.bearishSetupScore,
      bearishTriggerScore:       reversal.bearishTriggerScore,
      bearishConfirmationScore:  reversal.bearishConfirmationScore,
    },
    smartMoneyFlow: {
      status:                         smf.status,
      score:                          smf.score,
      todayActivityScore:             smf.todayActivityScore,
      fiveDayFlowScore:               smf.fiveDayFlowScore,
      thirtyDayAccumulationScore:     smf.thirtyDayAccumulationScore,
      obvValue:                       smf.obvValue,
      obvTrend30d:                    smf.obvTrend30d,
      volumeRatio:                    smf.volumeRatio,
      volumePriceDivergenceScore:     smf.volumePriceDivergenceScore,
      strongCloseScore:               smf.strongCloseScore,
    },
  };
}

// ─── Outcome label helpers ────────────────────────────────────────────────────

export function getBullishOutcomeLabel(futureReturn20d) {
  if (futureReturn20d === null || futureReturn20d === undefined) return 'Pending';
  if (futureReturn20d >= 10)  return 'Strong Win';
  if (futureReturn20d >= 5)   return 'Win';
  if (futureReturn20d > -5)   return 'Neutral';
  if (futureReturn20d > -10)  return 'Failed';
  return 'Strong Failed';
}

export function getBearishOutcomeLabel(futureReturn20d) {
  if (futureReturn20d === null || futureReturn20d === undefined) return 'Pending';
  if (futureReturn20d <= -10) return 'Strong Bearish Win';
  if (futureReturn20d <= -5)  return 'Bearish Win';
  if (futureReturn20d < 5)    return 'Neutral';
  if (futureReturn20d < 10)   return 'Bearish Failed';
  return 'Strong Bearish Failed';
}

export function getFutureReturn(snapshotClose, futureClose) {
  if (!snapshotClose || !futureClose) return null;
  return parseFloat(((futureClose - snapshotClose) / snapshotClose * 100).toFixed(2));
}
