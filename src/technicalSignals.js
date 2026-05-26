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
    // Strict textbook confirmation — all three stages strongly aligned. Unchanged.
    if (s >= 60 && t >= 60 && cs !== null && c >= 70) return dir + ' Reversal Confirmed';
    // Setup-led triggered reversal — textbook sequence with partial confirmation.
    if (s >= 60 && t >= 60 && cs !== null && c >= 40) return dir + ' Reversal Triggered';
    // Practical confirming — trigger and price action aligning even if setup has faded.
    // Bullish only in this iteration; bearish equivalent to be added later.
    if (dir === 'Bullish' && t >= 60 && cs !== null && c >= 40) return 'Bullish Reversal Confirming';
    // Setup and trigger aligned, confirmation not yet appeared.
    if (s >= 60 && t >= 60) return dir + ' Reversal Forming';
    // Early spark — momentum has started turning before full setup or confirmation is available.
    // Bullish only in this iteration; bearish equivalent to be added later.
    if (dir === 'Bullish' && t >= 60 && c < 40) return 'Bullish Reversal Spark';
    // Setup-led watch — early conditions appearing but trigger and confirmation still limited.
    if (s >= 40) return dir + ' Reversal Watch';
    return 'No Signal';
  }

  var bs = bullishScore||0, bes = bearishScore||0;
  var diff = bs - bes;

  // Practical bullish early/confirming stages — bearish equivalents to be added in a future step.
  // earlyBullSpark: trigger has fired before full setup or confirmation is available,
  //   and bullish is not clearly dominated by bearish.
  var earlyBullSpark = bTrigger !== null && bTrigger >= 60 && (bConfirm||0) < 40 && bs >= bes - 15;
  // bullConfirming: trigger is strong and price action is beginning to validate the reversal,
  //   even if the classic setup has faded.
  var bullConfirming = bTrigger !== null && bTrigger >= 60 && bConfirm !== null && bConfirm >= 40 && bs >= bes - 10;

  var status;
  if (bs < 21 && bes < 21) {
    status = 'No Clear Reversal';
  } else if (bullConfirming && !earlyBullSpark) {
    // Note: bullConfirming and earlyBullSpark are mutually exclusive (confirm >= 40 vs < 40)
    status = 'Bullish Reversal Confirming';
  } else if (earlyBullSpark) {
    status = 'Bullish Reversal Spark';
  } else if (bs >= 40 && bes >= 40 && Math.abs(diff) <= 15) {
    status = 'Mixed Reversal Signals';
  } else if (diff > 15) {
    status = dirStatus(bSetup, bTrigger, bConfirm, 'Bullish');
  } else if (diff < -15) {
    status = dirStatus(dSetup, dTrigger, dConfirm, 'Bearish');
  } else {
    status = 'Mixed Reversal Signals';
  }

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

  // New structured outputs (Run 2A)
  var caution    = calcCautionFlags(bars, ind, meta);
  var revSigArr  = calcReversalSignalArray(bars, ind, meta);
  var volSigs    = calcVolumeSignals(bars);
  var massSc     = calcMassiveScore(bars, ind, meta);

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
      caution:                 caution.trendCaution,
    },
    momentum: {
      status:                  momentum.status,
      score:                   momentum.score,
      rsiValue:                momentum.rsiValue,
      rsiDirection5d:          momentum.rsiDirection5d,
      macdHistogram:           momentum.macdHistogram,
      macdHistogramDirection:  momentum.macdHistogramDirection,
      priceVsSma5Pct:          momentum.priceVsSma5Pct,
      caution:                 caution.momCaution,
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
      signalArray:               revSigArr,
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
    volumeSignals:  volSigs,
    massiveScore:   massSc,
    cautionFlags:   caution,
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

// ─── Reversal scoring helpers (Detail page tab + sidebar pre-compute) ─────────
// These mirror the Reversal tab's inline scoring functions exactly so that
// the sidebar pre-computation and the tab always produce identical values.

export function calcRStageScore(inds) {
  var avail = inds.filter(function(i) { return i.score !== null; });
  if (avail.length === 0) return null;
  return Math.round(avail.reduce(function(s, i) { return s + i.score; }, 0) / avail.length);
}

export function calcRWeightedScore(stages) {
  var avail = stages.filter(function(s) { return s.score !== null; });
  if (avail.length === 0) return null;
  var totalW = avail.reduce(function(s, st) { return s + st.weight; }, 0);
  return Math.round(avail.reduce(function(s, st) { return s + st.score * (st.weight / totalW); }, 0));
}

export function getReversalDirectionStatus(setupS, trigS, confS, dir) {
  var s = setupS || 0, t = trigS || 0, c = confS || 0;
  // Confirmed: strict textbook confirmation — all three stages strongly aligned. Unchanged.
  if (s >= 60 && t >= 60 && confS !== null && c >= 70)
    return { label: 'Reversal Confirmed',  expl: dir + ' setup, momentum trigger, and price confirmation are aligned.' };
  // Triggered: setup-led textbook sequence with partial confirmation.
  if (s >= 60 && t >= 60 && confS !== null && c >= 40)
    return { label: 'Reversal Triggered',  expl: dir + ' momentum appears to be turning with some supporting confirmation.' };
  // Confirming: trigger and price action aligning even if setup has faded.
  // Bullish only in this iteration; bearish equivalent to be added later.
  if (dir === 'Bullish' && t >= 60 && confS !== null && c >= 40)
    return { label: 'Reversal Confirming', expl: 'Price action is beginning to validate the reversal, even though the classic setup may have faded.' };
  // Forming: setup and trigger aligned, confirmation not yet appeared.
  if (s >= 60 && t >= 60)
    return { label: 'Reversal Forming',    expl: dir + ' setup and momentum trigger are positive, but price confirmation is still missing.' };
  // Early Spark: momentum has started turning before full setup or confirmation is available.
  // Bullish only in this iteration; bearish equivalent to be added later.
  if (dir === 'Bullish' && t >= 60 && c < 40)
    return { label: 'Reversal Spark', expl: 'Bullish momentum has started turning before full setup or confirmation is available.' };
  // Watch: early setup conditions appearing but trigger and confirmation still limited.
  if (s >= 40)
    return { label: 'Reversal Watch',      expl: 'Early ' + dir.toLowerCase() + ' reversal conditions may be appearing, but trigger and confirmation are still limited.' };
  return { label: 'No Signal', expl: '' };
}

export function getOverallReversalStatus(bS, beS, bsScore, btScore, bcScore, dsScore, dtScore, dcScore) {
  if (bS === null && beS === null) return { status: 'Not Enough Data', primaryScore: null };
  var bs = bS || 0, bes = beS || 0;
  if (bs < 21 && bes < 21) return { status: 'No Clear Reversal', primaryScore: Math.max(bs, bes) };
  var bullDir = getReversalDirectionStatus(bsScore, btScore, bcScore, 'Bullish');
  var bearDir = getReversalDirectionStatus(dsScore, dtScore, dcScore, 'Bearish');

  // Practical bullish stages — bearish equivalents to be added in a future step.
  // bullConfirming and earlyBullSpark are mutually exclusive (bcScore >= 40 vs < 40).
  var earlyBullSpark = btScore !== null && btScore >= 60 && (bcScore || 0) < 40 && bs >= bes - 15;
  var bullConfirming = btScore !== null && btScore >= 60 && bcScore !== null && bcScore >= 40 && bs >= bes - 10;

  if (bullConfirming) return { status: 'Bullish Reversal Confirming',  primaryScore: bs };
  if (earlyBullSpark) return { status: 'Bullish Reversal Spark', primaryScore: bs };

  var diff = bs - bes;
  if (bs >= 40 && bes >= 40 && Math.abs(diff) <= 15) return { status: 'Mixed Reversal Signals', primaryScore: Math.max(bs, bes) };
  if (diff > 15  && bullDir.label !== 'No Signal')   return { status: 'Bullish ' + bullDir.label, primaryScore: bs };
  if (diff < -15 && bearDir.label !== 'No Signal')   return { status: 'Bearish ' + bearDir.label, primaryScore: bes };
  return { status: 'Mixed Reversal Signals', primaryScore: Math.max(bs, bes) };
}

// ─── SMF (Smart Money Flow) tab functions ────────────────────────────────────
// Extracted from the SMF (Whale) tab inline code so that both the sidebar
// pre-computation and the tab itself call the same shared functions.

export function validateSmfOHLCV(ag) {
  var errors = [];
  if (!ag || ag.length === 0) {
    errors.push('No OHLCV data available.');
    return { isValid: false, hasThirtyDays: false, canCalculateTodaySignal: false, errors: errors };
  }
  var valid = ag.filter(function(b) { return b && b.c > 0 && b.h > 0 && b.l > 0 && b.v >= 0; });
  if (valid.length < 2) errors.push('Fewer than 2 valid trading days.');
  var hasThirty = valid.length >= 30;
  var canToday  = valid.length >= 2 && valid.length >= 20;
  if (!hasThirty) errors.push('Fewer than 30 trading days -- 30-Day Signal unavailable.');
  return { isValid: valid.length >= 2, hasThirtyDays: hasThirty, canCalculateTodaySignal: canToday, validBars: valid, errors: errors };
}

export function getSmfScoreLabel(s) {
  return s >= 86 ? 'Very High' : s >= 71 ? 'High' : s >= 51 ? 'Moderate' : s >= 31 ? 'Mild' : 'Low';
}

export function calcSmfVolPriceDivergence(today, yesterday, avg30v) {
  var vRatio = avg30v > 0 ? today.v / avg30v : 0;
  var pct    = yesterday.c > 0 ? (today.c - yesterday.c) / yesterday.c * 100 : 0;
  var vTier  = vRatio >= 2.0 ? 'high' : vRatio >= 1.5 ? 'elevated' : vRatio >= 1.0 ? 'normal' : 'low';
  var pTier  = pct > 3 ? 'strongUp' : pct > 1 ? 'mildUp' : pct > -1 ? 'flat' : pct > -3 ? 'mildDown' : 'strongDown';
  var matrix = {
    high:     { strongUp: 65, mildUp: 80, flat: 100, mildDown: 90, strongDown: 10 },
    elevated: { strongUp: 55, mildUp: 65, flat: 80,  mildDown: 70, strongDown: 15 },
    normal:   { strongUp: 50, mildUp: 50, flat: 50,  mildDown: 45, strongDown: 30 },
    low:      { strongUp: 45, mildUp: 45, flat: 40,  mildDown: 40, strongDown: 25 }
  };
  var textMap = {
    'high-flat':          'High volume with flat price -- possible stealth accumulation. Buyers may be absorbing sellers.',
    'high-mildDown':      'High volume on a slight down day -- possible absorption of selling pressure.',
    'high-mildUp':        'High volume with steady price rise -- controlled institutional buying.',
    'high-strongUp':      'High volume on a strong up day -- could be breakout or retail momentum. Ambiguous signal.',
    'high-strongDown':    'High volume on a down day -- possible distribution. Sellers may be in control.',
    'elevated-flat':      'Elevated volume with flat price -- mild accumulation signal worth watching.',
    'elevated-mildDown':  'Elevated volume on a slight pullback -- possible quiet buying into weakness.',
    'elevated-mildUp':    'Elevated volume with mild price gain -- modest buying activity.',
    'elevated-strongUp':  'Elevated volume on a strong up day -- momentum with some conviction.',
    'elevated-strongDown':'Elevated volume selling -- caution.'
  };
  var key = vTier + '-' + pTier;
  var explanation = textMap[key] || (vTier === 'normal' || vTier === 'low' ? 'Volume is not elevated. No unusual activity detected from price-volume behaviour.' : 'No clear signal from this combination.');
  return { score: matrix[vTier][pTier], vTier: vTier, pTier: pTier, vRatio: vRatio, pct: pct, explanation: explanation };
}

export function calcSmfTodaySignal(bars) {
  var n = bars.length;
  var today = bars[n - 1], yesterday = bars[n - 2];
  var avg30v = bars.slice(Math.max(0, n - 30)).reduce(function(s, b) { return s + b.v; }, 0) / Math.min(n, 30);
  var obv = calcOBV(bars);

  var obvDayChange = obv[n - 1] - obv[n - 2];
  var obvDayRatio  = avg30v > 0 ? obvDayChange / avg30v : 0;
  var obvDir       = obvDayRatio > 1.0 ? 100 : obvDayRatio > 0.3 ? 75 : obvDayRatio > -0.3 ? 50 : obvDayRatio > -1.0 ? 25 : 0;
  var obvDirExpl   = obvDayRatio > 1.0 ? 'Strong buying day -- OBV rose by more than one average day of volume.' :
                     obvDayRatio > 0.3 ? 'Mild buying day -- OBV rose on moderate volume.' :
                     obvDayRatio > -0.3 ? 'Balanced -- buying and selling roughly equal today.' :
                     obvDayRatio > -1.0 ? 'Mild selling day -- OBV fell on moderate volume.' :
                                          'Strong selling day -- OBV fell by more than one average day of volume.';

  var vRatio   = avg30v > 0 ? today.v / avg30v : 0;
  var volScore = vRatio >= 3.0 ? 100 : vRatio >= 2.0 ? 75 : vRatio >= 1.5 ? 50 : vRatio >= 1.2 ? 25 : 0;

  var vpd = calcSmfVolPriceDivergence(today, yesterday, avg30v);

  var rng        = today.h - today.l;
  var closePos   = rng > 0 ? (today.c - today.l) / rng : 0.5;
  var closeScore = closePos > 0.85 ? 100 : closePos > 0.7 ? 80 : closePos > 0.5 ? 60 : closePos > 0.3 ? 30 : 0;

  var total = Math.round(obvDir * 0.20 + volScore * 0.30 + vpd.score * 0.35 + closeScore * 0.15);
  return {
    score: total, label: getSmfScoreLabel(total),
    breakdown: [
      { name: 'OBV Direction',        score: Math.round(obvDir),    weight: 20, explanation: obvDirExpl },
      { name: 'Volume Surge',         score: Math.round(volScore),  weight: 30,
        explanation: avg30v > 0 ? 'Volume is ' + vRatio.toFixed(1) + 'x the 30-day average.' : 'Volume data unavailable.' },
      { name: 'Vol / Price Divergence', score: Math.round(vpd.score), weight: 35, explanation: vpd.explanation },
      { name: 'Strong Close',         score: Math.round(closeScore), weight: 15,
        explanation: rng > 0 ? 'Closed at ' + (closePos * 100).toFixed(0) + '% of today\'s range.' : 'No price range today.' }
    ]
  };
}

export function calcSmfFiveDaySignal(bars) {
  var n = bars.length;
  var avg30v   = bars.slice(Math.max(0, n - 30)).reduce(function(s, b) { return s + b.v; }, 0) / Math.min(n, 30);
  var obv      = calcOBV(bars);
  var obvNet5  = obv[n - 1] - obv[n - 6];
  var obvNet5Days = avg30v > 0 ? obvNet5 / avg30v : 0;
  var obv5Score   = obvNet5Days > 2 ? 100 : obvNet5Days > 0 ? 75 : obvNet5Days > -2 ? 50 : obvNet5Days > -4 ? 25 : 0;

  var avg5v    = bars.slice(n - 5).reduce(function(s, b) { return s + b.v; }, 0) / 5;
  var vRatio5  = avg30v > 0 ? avg5v / avg30v : 0;
  var volScore5 = vRatio5 >= 2.0 ? 100 : vRatio5 >= 1.5 ? 75 : vRatio5 >= 1.2 ? 50 : vRatio5 >= 1.0 ? 25 : 0;

  var pct5  = bars[n - 6].c > 0 ? (bars[n - 1].c - bars[n - 6].c) / bars[n - 6].c * 100 : 0;
  var vTier5 = vRatio5 >= 2.0 ? 'high' : vRatio5 >= 1.5 ? 'elevated' : vRatio5 >= 1.0 ? 'normal' : 'low';
  var pTier5 = pct5 > 3 ? 'strongUp' : pct5 > 1 ? 'mildUp' : pct5 > -1 ? 'flat' : pct5 > -3 ? 'mildDown' : 'strongDown';
  var matrix5 = { high: { strongUp: 65, mildUp: 80, flat: 100, mildDown: 90, strongDown: 10 }, elevated: { strongUp: 55, mildUp: 65, flat: 80, mildDown: 70, strongDown: 15 }, normal: { strongUp: 50, mildUp: 50, flat: 50, mildDown: 45, strongDown: 30 }, low: { strongUp: 45, mildUp: 45, flat: 40, mildDown: 40, strongDown: 25 } };
  var vpd5Score = matrix5[vTier5][pTier5];
  var vpd5Expl  = vTier5 === 'high' && pTier5 === 'flat' ? 'High avg volume with flat 5-day price -- possible short-term accumulation.' :
                  vTier5 === 'high' && pTier5 === 'mildDown' ? 'High avg volume on slight 5-day decline -- possible absorption.' :
                  vTier5 === 'high' && pTier5 === 'strongDown' ? 'High volume with falling price over 5 days -- possible distribution.' :
                  '5-day price ' + (pct5 > 0 ? '+' : '') + pct5.toFixed(1) + '% on ' + vRatio5.toFixed(1) + 'x average volume.';

  var sc5 = 0;
  for (var i = n - 5; i < n; i++) { var r = bars[i].h - bars[i].l; if (r > 0 && (bars[i].c - bars[i].l) / r > 0.6) sc5++; }
  var sc5Score = sc5 >= 4 ? 100 : sc5 === 3 ? 75 : sc5 === 2 ? 50 : sc5 === 1 ? 25 : 0;

  var total = Math.round(obv5Score * 0.35 + volScore5 * 0.25 + vpd5Score * 0.25 + sc5Score * 0.15);
  return {
    score: total, label: getSmfScoreLabel(total),
    breakdown: [
      { name: 'OBV Net (5-day)',      score: Math.round(obv5Score),  weight: 35,
        explanation: 'Net OBV over 5 days = ' + (obvNet5Days > 0 ? '+' : '') + obvNet5Days.toFixed(1) + ' days of avg volume.' },
      { name: 'Volume (5-day avg)',   score: Math.round(volScore5),  weight: 25,
        explanation: '5-day avg volume is ' + vRatio5.toFixed(1) + 'x the 30-day average.' },
      { name: 'Vol / Price (5-day)',  score: Math.round(vpd5Score),  weight: 25, explanation: vpd5Expl },
      { name: 'Strong Close (5-day)', score: Math.round(sc5Score),   weight: 15,
        explanation: sc5 + ' of last 5 days closed in the upper 40% of daily range.' }
    ]
  };
}

export function calcSmfThirtyDaySignal(bars) {
  var n      = bars.length;
  var avg30v = bars.slice(n - 30).reduce(function(s, b) { return s + b.v; }, 0) / 30;
  var obv    = calcOBV(bars);

  var obvChange  = obv[n - 1] - obv[1];
  var obvInDays  = avg30v > 0 ? obvChange / avg30v : 0;
  var obvScore   = obvInDays > 5 ? 100 : obvInDays > 0 ? 75 : obvInDays > -5 ? 50 : obvInDays > -10 ? 25 : 0;

  var hvGreen = 0, hvRed = 0;
  for (var i = n - 29; i < n; i++) {
    if (bars[i].v > 1.5 * avg30v) {
      if (bars[i].c > bars[i - 1].c) hvGreen++;
      else if (bars[i].c < bars[i - 1].c) hvRed++;
    }
  }
  var hvScore = hvGreen >= hvRed * 2 ? 100 : hvGreen > hvRed ? 75 : hvGreen === hvRed ? 50 : hvRed > hvGreen ? 25 : 0;

  var p30 = bars[n - 30].c, pNow = bars[n - 1].c;
  var pct30 = p30 > 0 ? (pNow - p30) / p30 * 100 : 0;
  var priceScore = pct30 > 10 ? 100 : pct30 > 0 ? 75 : pct30 > -5 ? 50 : pct30 > -10 ? 25 : 0;

  var scDays = 0;
  for (var j = n - 30; j < n; j++) { var rng = bars[j].h - bars[j].l; if (rng > 0 && (bars[j].c - bars[j].l) / rng > 0.6) scDays++; }
  var scFreq  = scDays / 30;
  var scScore = scFreq > 0.65 ? 100 : scFreq > 0.5 ? 75 : scFreq > 0.4 ? 50 : scFreq > 0.3 ? 25 : 0;

  var total = Math.round(obvScore * 0.40 + hvScore * 0.25 + priceScore * 0.20 + scScore * 0.15);
  return {
    score: total, label: getSmfScoreLabel(total),
    breakdown: [
      { name: 'OBV Trend (30-day)',        score: Math.round(obvScore),   weight: 40,
        explanation: 'Net OBV change equals ' + (obvInDays > 0 ? '+' : '') + obvInDays.toFixed(1) + ' days of avg volume.' },
      { name: 'High-Volume Green Days',    score: Math.round(hvScore),    weight: 25,
        explanation: hvGreen + ' high-volume up days vs ' + hvRed + ' high-volume down days in 30 sessions.' },
      { name: 'Price Stability / Strength', score: Math.round(priceScore), weight: 20,
        explanation: 'Price is ' + (pct30 > 0 ? '+' : '') + pct30.toFixed(1) + '% vs 30 trading days ago.' },
      { name: 'Strong Close Frequency',   score: Math.round(scScore),    weight: 15,
        explanation: scDays + ' of 30 days closed in upper 40% of daily range (' + (scFreq * 100).toFixed(0) + '%).' }
    ]
  };
}

export function getSmfOverallStatus(tScore, fScore, dScore) {
  var tH = tScore >= 71, fH = fScore >= 71, dH = dScore >= 71;
  if (tH && fH && dH)  return 'Strong Multi-Timeframe Flow';
  if (!tH && fH && dH) return 'Accumulation Trend Positive';
  if (dH && !tH && !fH) return 'Constructive but Cooling';
  if (tH && fH && !dH) return 'Early Accumulation';
  if (tH && !fH && !dH) return 'Short-Term Spike';
  return 'No Clear Signal';
}

export function calcSmfSummaryCard(tScore, fScore, dScore, tSig, fSig, dSig) {
  var status  = getSmfOverallStatus(tScore || 0, fScore || 0, dScore || 0);
  var primary = dSig ? dScore : fSig ? fScore : tSig ? tScore : null;
  return {
    status: status,
    primaryScore: primary,
    todayLabel:      tSig ? getSmfScoreLabel(tScore) : 'N/A',
    fiveDayLabel:    fSig ? getSmfScoreLabel(fScore) : 'N/A',
    thirtyDayLabel:  dSig ? getSmfScoreLabel(dScore) : 'N/A'
  };
}

// ============================================================
// Run 2A additions
// Pure functions extracted from App.jsx so technicalSignals.js
// becomes the single source of truth for all technical signals.
// No API calls, no React state, no window, no DOM.
// ============================================================

// ─── calcCautionFlags ────────────────────────────────────────────────────────
// Matches App.jsx sidebar caution flag logic exactly.
// bars: oldest-first. ind: Massive indicators. meta: { price, hi52, lo52 }.
// Returns: { trendCaution: bool, momCaution: bool }
export function calcCautionFlags(bars, ind, meta) {
  var n     = bars.length;
  var price = (meta && meta.price) || (n > 0 ? bars[n - 1].c : 0);
  var hi52  = (meta && meta.hi52)  || 0;
  var lo52  = (meta && meta.lo52)  || 0;

  // SMA200 gap %
  var s200g = ind.sma200 && price > 0 ? (price - ind.sma200) / ind.sma200 * 100 : 0;

  // 52-week position (0–100)
  var pos52pct = (hi52 > lo52 && price > 0) ? (price - lo52) / (hi52 - lo52) * 100 : 50;

  // Trend caution: stock has run far above SMA200 or is at 52-week extreme
  var trendCaution = s200g > 25 || pos52pct > 95;

  // RSI
  var rsi = ind.rsi14 != null ? parseFloat(ind.rsi14) : 0;

  // ROC10: 10-day rate of change using oldest-first bars
  // bars[n-10] = 10 trading days ago, bars[n-1] = today
  var roc10 = (n >= 10 && bars[n - 10] && bars[n - 10].c > 0)
    ? (price - bars[n - 10].c) / bars[n - 10].c * 100
    : null;

  // Momentum caution: RSI extreme OR momentum spike over 10 days
  var momCaution = rsi > 75 || rsi < 35 || (roc10 !== null && roc10 > 15);

  return { trendCaution: trendCaution, momCaution: momCaution };
}

// ─── calcReversalSignalArray ─────────────────────────────────────────────────
// Legacy-style 5-boolean reversal signal arrays used by the sidebar pill and
// the AI Technical prompt. These are SUPPORTING DETAIL only — the authoritative
// Reversal status must still come from calcReversalWatch().
// bars: oldest-first. ind: Massive indicators. meta: { price, hi52, lo52 }.
// Returns: { bullSignals, bearSignals, bullCount, bearCount, bullNames, bearNames }
export function calcReversalSignalArray(bars, ind, meta) {
  var n      = bars.length;
  var price  = (meta && meta.price) || (n > 0 ? bars[n - 1].c : 0);
  var hi52   = (meta && meta.hi52)  || 0;
  var lo52   = (meta && meta.lo52)  || 0;
  var pos52  = (hi52 > lo52 && price > 0) ? (price - lo52) / (hi52 - lo52) : 0.5;

  // ind.rsiHistory[0] = most recent RSI (same direction in both App.jsx and here)
  var rsiH  = (ind.rsiHistory  || []).map(function(v) { return parseFloat(v); });
  var macdH = ind.macdHistory  || [];
  var rsi   = ind.rsi14 != null ? parseFloat(ind.rsi14) : null;

  // Helper: most-recent-first 5 bars from oldest-first array
  var rec5  = n >= 5  ? bars.slice(n - 5)      : bars;
  var prev5 = n >= 10 ? bars.slice(n - 10, n - 5) : [];

  // ── Bullish signals ───────────────────────────────────────────────────────
  // 1. RSI Price Divergence: price lower low but RSI higher low (bullish div)
  var rsiDiv = (function() {
    if (rsiH.length < 10 || n < 10) return false;
    var rPL = Math.min.apply(null, rec5.map(function(b)  { return b.l || 0; }));
    var pPL = Math.min.apply(null, prev5.map(function(b) { return b.l || 0; }));
    var rRL = Math.min.apply(null, rsiH.slice(0, 5));
    var pRL = Math.min.apply(null, rsiH.slice(5, 10));
    return rPL < pPL && rRL > pRL;
  })();

  // 2. MACD Turning Up: histogram negative but rising (3-bar sequence)
  var macdUp = (function() {
    if (macdH.length < 3) return false;
    var h0 = macdH[0] && macdH[0].histogram != null ? parseFloat(macdH[0].histogram) : null;
    var h1 = macdH[1] && macdH[1].histogram != null ? parseFloat(macdH[1].histogram) : null;
    var h2 = macdH[2] && macdH[2].histogram != null ? parseFloat(macdH[2].histogram) : null;
    return h0 !== null && h1 !== null && h2 !== null && h0 < 0 && h0 > h1 && h1 > h2;
  })();

  // 3. Weekly SMA Cross Approaching: wsma10 below wsma40 and within 5%
  var weeklyCross = !!(ind.wsma10 && ind.wsma40 &&
    ind.wsma10 < ind.wsma40 &&
    Math.abs(ind.wsma10 - ind.wsma40) / ind.wsma40 < 0.05);

  // 4. RSI Base Forming: RSI basing in 28–52 zone (last 5 readings)
  var rsiBase = rsiH.length >= 5 &&
    rsiH.slice(0, 5).every(function(v) { return !isNaN(v) && v >= 28 && v <= 52; });

  // 5. 52W Low Base: price near 52-week low with recovering RSI
  var lowBase = pos52 < 0.20 && rsi !== null && rsi > 20 && rsi < 45;

  var bullSignals = [rsiDiv, macdUp, weeklyCross, rsiBase, lowBase];
  var bullNames   = [
    'RSI Price Divergence',
    'MACD Turning Up',
    'Weekly SMA Cross Approaching',
    'RSI Base Forming',
    '52W Low Base',
  ];

  // ── Bearish signals ───────────────────────────────────────────────────────
  // 1. RSI Bearish Divergence: price higher high but RSI lower high
  var rsiBearDiv = (function() {
    if (rsiH.length < 10 || n < 10) return false;
    var rPH = Math.max.apply(null, rec5.map(function(b)  { return b.h || 0; }));
    var pPH = Math.max.apply(null, prev5.map(function(b) { return b.h || 0; }));
    var rRH = Math.max.apply(null, rsiH.slice(0, 5));
    var pRH = Math.max.apply(null, rsiH.slice(5, 10));
    return rPH > pPH && rRH < pRH;
  })();

  // 2. MACD Turning Down: histogram positive but falling (3-bar sequence)
  var macdDown = (function() {
    if (macdH.length < 3) return false;
    var h0 = macdH[0] && macdH[0].histogram != null ? parseFloat(macdH[0].histogram) : null;
    var h1 = macdH[1] && macdH[1].histogram != null ? parseFloat(macdH[1].histogram) : null;
    var h2 = macdH[2] && macdH[2].histogram != null ? parseFloat(macdH[2].histogram) : null;
    return h0 !== null && h1 !== null && h2 !== null && h0 > 0 && h0 < h1 && h1 < h2;
  })();

  // 3. Weekly SMA Cross (Bear): wsma10 above wsma40 and within 5%
  var weeklyBearCross = !!(ind.wsma10 && ind.wsma40 &&
    ind.wsma10 > ind.wsma40 &&
    Math.abs(ind.wsma10 - ind.wsma40) / ind.wsma40 < 0.05);

  // 4. RSI Overbought Stalling: RSI in 72–85 zone (last 5 readings)
  var rsiOverStall = !!(rsiH.length >= 5 &&
    rsiH.slice(0, 5).every(function(v) { return !isNaN(v) && v >= 72 && v <= 85; }));

  // 5. 52W High Topping: near 52-week high with RSI in topping zone
  var highTop = !!(pos52 > 0.95 && rsi !== null && rsi > 70 && rsi < 80);

  var bearSignals = [rsiBearDiv, macdDown, weeklyBearCross, rsiOverStall, highTop];
  var bearNames   = [
    'RSI Bearish Divergence',
    'MACD Turning Down',
    'Weekly SMA Cross (Bear)',
    'RSI Overbought Stalling',
    '52W High Topping',
  ];

  return {
    bullSignals: bullSignals,
    bearSignals: bearSignals,
    bullCount:   bullSignals.filter(Boolean).length,
    bearCount:   bearSignals.filter(Boolean).length,
    bullNames:   bullNames,
    bearNames:   bearNames,
  };
}

// ─── calcVolumeSignals ───────────────────────────────────────────────────────
// Volume-flow / volume spike boolean signal arrays used by the sidebar combined
// signal block and AI Technical prompt.
// bars: oldest-first. Each bar: { c, o, h, l, v }.
// Returns: { bullSignals, bearSignals, bullScore, bearScore, netScore,
//            bullNames, bearNames }
export function calcVolumeSignals(bars) {
  var n = bars.length;
  if (n === 0) {
    return {
      bullSignals: [false, false, false, false, false],
      bearSignals: [false, false, false, false, false],
      bullScore: 0, bearScore: 0, netScore: 0,
      bullNames: ['Volume Spike','Bullish Surge','Accumulation','Volume Rising','Consistent Up Days'],
      bearNames: ['Dry-Up on Rally','Distribution','Bearish Surge','Volume Falling','Consistent Down Days'],
    };
  }

  // Oldest-first slices — mirrors newest-first App.jsx logic:
  // _aggs4.slice(0,5)   → bars.slice(n-5)       (last 5 bars)
  // _aggs4.slice(5,20)  → bars.slice(n-20, n-5) (bars 5–20 ago, for vol baseline)
  // _aggs4.slice(0,20)  → bars.slice(n-20)       (last 20 bars)
  // _aggs4[0]           → bars[n-1]              (most recent bar)
  var last5  = n >= 5  ? bars.slice(n - 5)         : bars.slice(0);
  var prev15 = n >= 20 ? bars.slice(n - 20, n - 5) : [];
  var last20 = n >= 20 ? bars.slice(n - 20)         : bars.slice(0);

  var vol1  = bars[n - 1] ? bars[n - 1].v : 0;
  var vol5  = last5.reduce(function(s, b)  { return s + (b && b.v || 0); }, 0) /
              Math.max(last5.length, 1);
  // vol5_20: average of bars 5–20 ago (comparison baseline for Rising/Falling signals)
  var vol5_20 = prev15.length > 0
    ? prev15.reduce(function(s, b) { return s + (b && b.v || 0); }, 0) / prev15.length
    : 0;
  var vol20 = last20.reduce(function(s, b) { return s + (b && b.v || 0); }, 0) /
              Math.max(last20.length, 1);

  // Accumulation / Distribution day count over last 20 bars
  var acc = 0, dist = 0;
  last20.forEach(function(b) {
    if (!b || !b.v || !b.c || !b.o) return;
    if (b.c >= b.o && b.v > vol20) acc++;
    else if (b.c < b.o && b.v > vol20) dist++;
  });

  // Consecutive close direction over last 5 bars
  var closeUpDays = last5.filter(function(b) { return b && b.c && b.o && b.c > b.o; }).length;
  var closeDnDays = last5.filter(function(b) { return b && b.c && b.o && b.c < b.o; }).length;

  var today = bars[n - 1];

  // ── Bullish volume signals ─────────────────────────────────────────────
  var bSigs = [
    // Volume Spike: today's volume > 2.5x 20-day average
    vol1 > 0 && vol20 > 0 && vol1 > vol20 * 2.5,
    // Bullish Surge: a bullish candle in last 5 days with volume > 2x average
    last5.some(function(b) { return b && b.c && b.o && b.c > b.o && b.v > vol20 * 2; }),
    // Accumulation: more high-volume up days than down days
    acc > dist + 1,
    // Volume Rising: recent 5-day avg > prior 15-day avg by 20%
    vol5_20 > 0 && vol5 > vol5_20 * 1.2,
    // Consistent Up Days: 3+ bullish closes in last 5 bars
    closeUpDays >= 3,
  ];

  // ── Bearish volume signals ─────────────────────────────────────────────
  var rSigs = [
    // Dry-Up on Rally: price up today but volume well below average
    !!(today && today.c && today.o && today.c > today.o && vol1 < vol20 * 0.5),
    // Distribution: more high-volume down days than up days
    dist > acc + 1,
    // Bearish Surge: a bearish candle in last 5 days with volume > 2x average
    last5.some(function(b) { return b && b.c && b.o && b.c < b.o && b.v > vol20 * 2; }),
    // Volume Falling: recent 5-day avg < prior 15-day avg by 20%
    vol5_20 > 0 && vol5 < vol5_20 * 0.8,
    // Consistent Down Days: 4+ bearish closes in last 5 bars
    closeDnDays >= 4,
  ];

  // Weights preserved from App.jsx: [2,3,3,2,1] for both bull and bear
  var wB = [2, 3, 3, 2, 1];
  var wR = [2, 3, 3, 2, 1];

  var bullScore = bSigs.reduce(function(s, v, i) { return s + (v ? wB[i] : 0); }, 0);
  var bearScore = rSigs.reduce(function(s, v, i) { return s + (v ? wR[i] : 0); }, 0);
  var netScore  = bullScore - bearScore;

  return {
    bullSignals: bSigs,
    bearSignals: rSigs,
    bullScore:   bullScore,
    bearScore:   bearScore,
    netScore:    netScore,
    bullNames:   ['Volume Spike', 'Bullish Surge', 'Accumulation', 'Volume Rising', 'Consistent Up Days'],
    bearNames:   ['Dry-Up on Rally', 'Distribution', 'Bearish Surge', 'Volume Falling', 'Consistent Down Days'],
  };
}

// ─── calcMassiveScore ────────────────────────────────────────────────────────
// Composite "Massive" score used for window.__msDots2, __msLabel2, __msDots,
// __msScore. This is NOT the same as calcTrendScore — different weights,
// includes volume, pos52, and a reversal-condition bonus.
// Preserve this separately; do not merge with calcTrendScore.
// bars: oldest-first. ind: Massive indicators. meta: { price, hi52, lo52 }.
// Returns: { score, dots, label }
export function calcMassiveScore(bars, ind, meta) {
  var n     = bars.length;
  var price = (meta && meta.price) || (n > 0 ? bars[n - 1].c : 0);
  var hi52  = (meta && meta.hi52)  || 0;
  var lo52  = (meta && meta.lo52)  || 0;
  var pos52 = (hi52 > lo52 && price > 0) ? (price - lo52) / (hi52 - lo52) : 0.5;

  // Volume ratio: 5-day avg / 20-day avg (from most recent end of bars)
  var last5  = n >= 5  ? bars.slice(n - 5)  : bars.slice(0);
  var last20 = n >= 20 ? bars.slice(n - 20) : bars.slice(0);
  var vol5   = last5.reduce(function(s, b)  { return s + (b && b.v || 0); }, 0) /
               Math.max(last5.length, 1);
  var vol20  = last20.reduce(function(s, b) { return s + (b && b.v || 0); }, 0) /
               Math.max(last20.length, 1);
  var vr     = vol20 > 0 ? vol5 / vol20 : 1;

  // Derived indicator gaps
  var wsmaG = ind.wsma10 && ind.wsma40
    ? (ind.wsma10 - ind.wsma40) / ind.wsma40 * 100 : 0;
  var s200g = ind.sma200 && price > 0
    ? (price - ind.sma200) / ind.sma200 * 100 : 0;
  var crsG  = ind.sma50 && ind.sma200
    ? (ind.sma50 - ind.sma200) / ind.sma200 * 100 : 0;
  var ema2g = ind.ema20 && price > 0
    ? (price - ind.ema20) / ind.ema20 * 100 : 0;

  var rsi      = ind.rsi14 != null ? parseFloat(ind.rsi14) : null;
  var macdH    = ind.macd && ind.macd.histogram != null ? parseFloat(ind.macd.histogram) : null;
  var macdArr  = ind.macdHistory || [];
  var macdDir  = (macdArr.length >= 2 &&
    macdArr[0] && macdArr[1] &&
    macdArr[0].histogram != null && macdArr[1].histogram != null)
    ? (parseFloat(macdArr[0].histogram) > parseFloat(macdArr[1].histogram) ? 'Rising' : 'Falling')
    : 'Flat';

  // Per-indicator scoring (same ladder as App.jsx sc2())
  function sc(key) {
    if (key === 'wsma')   return !ind.wsma10||!ind.wsma40 ? 3 : wsmaG>5?5:wsmaG>1?4:wsmaG>-1?3:wsmaG>-5?2:1;
    if (key === 'sma200') return !ind.sma200              ? 3 : s200g>10?5:s200g>2?4:s200g>-10?3:s200g>-20?2:1;
    if (key === 'cross')  return !ind.sma50||!ind.sma200  ? 3 : crsG>10?5:crsG>1?4:crsG>-1?3:crsG>-10?2:1;
    if (key === 'pos52')  return pos52>0.80?5:pos52>0.55?4:pos52>0.35?3:pos52>0.15?2:1;
    if (key === 'rsi')    return !rsi  ? 3 : rsi>=65?5:rsi>=55?4:rsi>=45?3:rsi>=35?2:1;
    if (key === 'macd')   return !macdH? 3 : (macdH>0&&macdDir==='Rising')?5:(macdH>0&&macdDir!=='Falling')?4:(macdH>0)?3:(macdH<=0&&macdDir==='Rising')?3:macdH>-0.5?2:1;
    if (key === 'ema20')  return !ind.ema20 ? 3 : ema2g>5?5:ema2g>1?4:ema2g>-5?3:ema2g>-15?2:1;
    if (key === 'vol')    return vr>1.4?5:vr>1.1?4:vr>0.9?3:vr>0.7?2:1;
    return 3;
  }

  // Weights: different from calcTrendScore — do not merge
  var W = { wsma: 25, sma200: 15, cross: 10, pos52: 5, rsi: 20, macd: 15, ema20: 5, vol: 5 };
  var base = 0;
  ['wsma', 'sma200', 'cross', 'pos52', 'rsi', 'macd', 'ema20', 'vol'].forEach(function(k) {
    base += (sc(k) / 5) * W[k];
  });
  base = Math.round(base);

  // Reversal condition bonus (applied only when base < 50 i.e. bearish territory)
  var rsiH  = ind.rsiHistory || [];
  var mT    = macdArr.length >= 3 &&
    macdArr[0] && macdArr[1] && macdArr[2] &&
    macdArr[0].histogram != null && macdArr[1].histogram != null && macdArr[2].histogram != null &&
    parseFloat(macdArr[0].histogram) < 0 &&
    parseFloat(macdArr[0].histogram) > parseFloat(macdArr[1].histogram) &&
    parseFloat(macdArr[1].histogram) > parseFloat(macdArr[2].histogram);
  var rsiB  = rsiH.length >= 5 &&
    rsiH.slice(0, 5).every(function(v) { return v != null && !isNaN(parseFloat(v)) && parseFloat(v) >= 28 && parseFloat(v) <= 52; });
  var lb    = pos52 < 0.20 && rsi !== null && rsi > 20 && rsi < 45;
  var rev   = [mT, rsiB, lb].filter(Boolean).length;
  var bonus = base < 50 ? Math.min(rev * 4, 12) : 0;
  var final = Math.min(base + bonus, base < 50 ? 49 : 100);

  var label = final >= 70 ? 'Strong Bullish'
            : final >= 55 ? 'Bullish'
            : final >= 40 ? 'Neutral'
            : final >= 25 ? 'Bearish'
            : 'Strong Bearish';
  var dots  = final >= 70 ? 5 : final >= 55 ? 4 : final >= 40 ? 3 : final >= 25 ? 2 : 1;

  return { score: final, dots: dots, label: label };
}
