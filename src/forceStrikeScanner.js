// forceStrikeScanner.js — Force Strike Pattern Scanner
// Deterministic, rule-based, zero AI.

// ── Date formatting ──────────────────────────────────────────────────────────
export function fmtDate(val) {
  if (!val) return '—';
  var d;
  if (typeof val === 'number') d = new Date(val);
  else if (typeof val === 'string') d = isNaN(Number(val)) ? new Date(val) : new Date(Number(val));
  if (!d || isNaN(d.getTime())) return String(val);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getDate() + '-' + months[d.getMonth()] + '-' + d.getFullYear();
}

// ── Step 1: Build 2-day aggregated bars ─────────────────────────────────────
export function buildAggregateBars(dailyCandles) {
  var aggs = [];
  for (var i = 0; i + 1 < dailyCandles.length; i += 2) {
    var d1 = dailyCandles[i], d2 = dailyCandles[i + 1];
    aggs.push({
      date: d1.date + '/' + d2.date, date1: d1.date, date2: d2.date,
      dateLabel: fmtDate(d1.date) + '/' + fmtDate(d2.date),
      open: d1.open, high: Math.max(d1.high, d2.high),
      low: Math.min(d1.low, d2.low), close: d2.close,
      volume: (d1.volume || 0) + (d2.volume || 0),
    });
  }
  return aggs;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function avgRange(bars) {
  if (!bars || !bars.length) return 0;
  return bars.reduce(function(s,b){ return s+(b.high-b.low); }, 0) / bars.length;
}
function avgBody(bars) {
  if (!bars || !bars.length) return 0;
  return bars.reduce(function(s,b){ return s+Math.abs(b.close-b.open); }, 0) / bars.length;
}

// ── Trigger detection ────────────────────────────────────────────────────────
// ── EXE audit helpers — return full calculation detail ───────────────────────
function auditPin(bar) {
  var bull      = bar.close > bar.open;
  var body      = Math.abs(bar.close - bar.open);
  var rng       = bar.high - bar.low;
  var lowerWick = Math.min(bar.open, bar.close) - bar.low;
  var upperWick = bar.high - Math.max(bar.open, bar.close);
  var midpoint  = bar.low + rng / 2;
  var ratio     = body > 0 ? lowerWick / body : 0;
  var c1 = bull;
  var c2 = lowerWick >= 2 * body;
  var c3 = bar.close > midpoint;
  var pass = c1 && c2 && c3;
  return {
    pass: pass,
    bull: bull, body: body, range: rng,
    lowerWick: lowerWick, upperWick: upperWick,
    midpoint: midpoint, ratio: ratio,
    c1_bullish: c1,
    c2_lowerWick: c2,   c2_ratio: ratio,
    c3_aboveMid: c3,
    bodyPct:      rng > 0 ? body / rng * 100 : 0,
    lowerWickPct: rng > 0 ? lowerWick / rng * 100 : 0,
    upperWickPct: rng > 0 ? upperWick / rng * 100 : 0,
    closePos:     rng > 0 ? (bar.close - bar.low) / rng * 100 : 0,
  };
}
function auditMu(bar, prevBars) {
  var bull    = bar.close > bar.open;
  var rng     = bar.high - bar.low;
  var body    = Math.abs(bar.close - bar.open);
  var closePos = rng > 0 ? (bar.close - bar.low) / rng : 0;
  var upper25Threshold = bar.low + rng * 0.75;
  var avgB    = avgBody(prevBars);
  var bodyRatio = avgB > 0 ? body / avgB : 0;
  var c1 = bull;
  var c2 = rng > 0 && closePos >= 0.75;
  var c3 = body > avgB;
  var pass = c1 && c2 && c3;
  return {
    pass: pass,
    bull: bull, body: body, range: rng, avgPrevBody: avgB,
    closePos: closePos * 100, upper25Threshold: upper25Threshold,
    bodyRatio: bodyRatio,
    c1_bullish: c1,
    c2_upperClose: c2,
    c3_largeBody: c3,
  };
}
function auditIce(bar, prevBar, motherMidpoint) {
  var bull      = bar.close > bar.open;
  var body      = Math.abs(bar.close - bar.open);
  var rng       = bar.high - bar.low;
  var bodyPct   = rng > 0 ? body / rng * 100 : 0;
  var closePos  = rng > 0 ? (bar.close - bar.low) / rng * 100 : 0;
  var upperThird = bar.low + rng * (2/3);
  var c1 = bull;
  var c2 = bodyPct >= 50;  // tightened: body must be >= 50% range
  var c3 = bar.close >= upperThird;
  var c4 = prevBar ? bar.close > prevBar.high : true;   // close > previous bar high
  var c5 = motherMidpoint != null ? bar.close > motherMidpoint : true; // close > mother midpoint
  var pass = c1 && c2 && c3 && c4 && c5;
  return {
    pass: pass,
    bull: bull, body: body, range: rng,
    bodyPct: bodyPct, closePos: closePos,
    upperThird: upperThird,
    prevHigh: prevBar ? prevBar.high : null,
    motherMidpoint: motherMidpoint,
    c1_bullish: c1,
    c2_halfBody: c2,
    c3_upperThird: c3,
    c4_abovePrevHigh: c4,
    c5_aboveMotherMid: c5,
  };
}
// Convenience wrappers used by detection logic
function isBullishPin(bar)                              { return auditPin(bar).pass; }
function isMarkUp(bar, prevBars)                        { return auditMu(bar, prevBars).pass; }
function isIceCream(bar, prevBar, motherMidpoint)       { return auditIce(bar, prevBar, motherMidpoint).pass; }


function triggerInteractsWithMother(bar, motherHigh, motherLow) {
  if (bar.close >= motherLow && bar.close <= motherHigh) return true;
  if (bar.low <= motherHigh && bar.low >= motherLow) return true;
  if (bar.low < motherLow && bar.close >= motherLow) return true;
  if (bar.open >= motherLow && bar.open <= motherHigh) return true;
  return false;
}

// ── Unified Force Strike sequence detector ───────────────────────────────────
// Scans Bar 3–6 (offsets 1–5 after Baby) for:
//   1. Manipulation: a bar with Low < Mother Low
//   2. EXE after manipulation: closes >= Mother Low AND is PIN/MU/ICE
// Both must occur within the Bar 3–6 window in that order.
function detectForceStrikeSequence(aggs, babyIndex, motherHigh, motherLow) {
  var checked    = [];
  var manipFound = false;
  var manipBar   = null;
  var maxOffset  = Math.min(5, aggs.length - babyIndex - 1); // offsets 1-5 covers Bar 3-6

  var motherMidpoint = (motherHigh + motherLow) / 2;

  for (var offset = 1; offset <= maxOffset; offset++) {
    var idx  = babyIndex + offset;
    var bar  = aggs[idx];
    var prev = idx > 0 ? aggs[idx-1] : null;
    var p5   = aggs.slice(Math.max(0, idx - 5), idx);
    var info = { index: idx, date: bar.date, date1: bar.date1, dateLabel: bar.dateLabel,
                 open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume,
                 motherHigh: motherHigh, motherLow: motherLow };

    // Is this bar a manipulation bar? (Low < Mother Low)
    if (bar.low < motherLow) {
      if (!manipFound) {
        manipFound = true;
        // Same-bar analysis: would this manip bar also qualify as EXE?
        var samePinAudit = auditPin(bar);
        var sameMuAudit  = auditMu(bar, p5);
        var sameIceAudit = auditIce(bar, prev, motherMidpoint);
        manipBar = { found: true, index: idx,
                     date: bar.date, date1: bar.date1, dateLabel: bar.dateLabel,
                     open: bar.open, high: bar.high, low: bar.low, close: bar.close,
                     volume: bar.volume, motherLow: motherLow,
                     breakAmount: motherLow - bar.low,
                     breakPct: motherLow > 0 ? (motherLow - bar.low) / motherLow * 100 : 0,
                     sameBarPin: samePinAudit, sameBarMu: sameMuAudit, sameBarIce: sameIceAudit,
                     sameBarWouldQualify: samePinAudit.pass || sameMuAudit.pass || sameIceAudit.pass };
      }
      info.isManipulation = true;
      info.triggerType    = 'NONE';
      info.skipReason     = 'Manipulation bar — Low ' + bar.low.toFixed(2) + ' < Mother Low ' + motherLow.toFixed(2);
      checked.push(info);
      continue;
    }

    // No manipulation yet — cannot be EXE
    if (!manipFound) {
      info.triggerType = 'NONE';
      info.skipReason  = 'Waiting for manipulation — no bar yet below Mother Low';
      checked.push(info);
      continue;
    }

    // Manipulation has occurred — evaluate EXE (reclaim + PIN/MU)
    var reclaims = bar.close >= motherLow;
    info.reclaims = reclaims;
    if (!reclaims) {
      info.triggerType = 'NONE';
      info.skipReason  = 'EXE close ' + bar.close.toFixed(2) + ' below Mother Low ' + motherLow.toFixed(2) + ' — no reclaim';
      checked.push(info);
      continue;
    }

    var interacts = triggerInteractsWithMother(bar, motherHigh, motherLow);
    info.interactsWithMother = interacts;
    if (!interacts) {
      info.triggerType = 'NONE';
      info.skipReason  = 'EXE does not interact with Mother range';
      checked.push(info);
      continue;
    }

    if (isBullishPin(bar)) {
      info.triggerType = 'PIN';
      info.exeAudit    = { pin: auditPin(bar), mu: auditMu(bar, p5), ice: auditIce(bar, prev, motherMidpoint) };
      checked.push(info);
      return { found: true, bar: info, checked: checked, manipulation: manipBar };
    }
    if (isMarkUp(bar, p5)) {
      info.triggerType = 'MU';
      info.exeAudit    = { pin: auditPin(bar), mu: auditMu(bar, p5), ice: auditIce(bar, prev, motherMidpoint) };
      checked.push(info);
      return { found: true, bar: info, checked: checked, manipulation: manipBar };
    }
    if (isIceCream(bar, prev, motherMidpoint)) {
      info.triggerType = 'ICE';
      info.exeAudit    = { pin: auditPin(bar), mu: auditMu(bar, p5), ice: auditIce(bar, prev, motherMidpoint) };
      checked.push(info);
      return { found: true, bar: info, checked: checked, manipulation: manipBar };
    }
    // No EXE — still store audit for transparency
    info.triggerType = 'NONE';
    info.exeAudit    = { pin: auditPin(bar), mu: auditMu(bar, p5), ice: auditIce(bar, prev, motherMidpoint) };
    info.skipReason  = 'Reclaim confirmed but no PIN, MU, or ICE pattern';
    checked.push(info);
  }

  return { found: false, checked: checked,
           manipulation: manipFound ? manipBar : { found: false, motherLow: motherLow } };
}

// ── Scenario classification ──────────────────────────────────────────────────
function classifyScenario(aggs, motherIndex, trendStatus, trigger, baby) {
  var mother   = aggs[motherIndex];
  var prevBars = aggs.slice(Math.max(0, motherIndex - 20), motherIndex);
  var swingLow = prevBars.length
    ? prevBars.reduce(function(m,b){ return Math.min(m,b.low); }, Infinity) : null;
  var prevRange20 = prevBars.length
    ? prevBars.reduce(function(s,b){ return s+(b.high-b.low); }, 0) / prevBars.length : null;
  var highestHigh = prevBars.length
    ? prevBars.reduce(function(m,b){ return Math.max(m,b.high); }, -Infinity) : null;
  var sideways = prevRange20 && highestHigh && (highestHigh - swingLow) < prevRange20 * 5;
  var ts = (trendStatus || '').toLowerCase();
  var notUptrend = ts !== 'uptrend' && ts !== 'strong uptrend';

  // Priority 1: Shakeout Reversal
  if (sideways && swingLow && mother.low < swingLow && mother.close >= swingLow) return 'Shakeout Reversal';
  // Priority 2: Recovery Reversal (including manip+reclaim cases where trend is not up)
  if (swingLow && mother.low < swingLow && mother.close >= swingLow) return 'Recovery Reversal';
  // New: manip+reclaim with reclaim above baby close, not in uptrend
  if (trigger && baby && notUptrend &&
      trigger.close > mother.low && trigger.close > baby.close) return 'Recovery Reversal';
  // Priority 3: Trend Pullback
  if (!notUptrend) return 'Trend Pullback';
  return 'None';
}

// ── Main export: scanForceStrike ─────────────────────────────────────────────
export function scanForceStrike(symbol, dailyCandles, trendStatus) {
  var audit = { symbol: symbol, steps: {} };
  var empty = function(reason, result) {
    return { triggered: false, result: result || 'Invalid', symbol: symbol,
             audit: Object.assign({ finalReason: reason }, audit) };
  };
  if (!dailyCandles || dailyCandles.length < 14) return empty('Not enough candles (need 14+)', 'No Pattern');
  var aggs = buildAggregateBars(dailyCandles);
  audit.steps.aggCount = aggs.length;
  if (aggs.length < 8) return empty('Not enough aggregated bars (need 8+)', 'No Pattern');

  var mother = null, baby = null, trigger = null, manipResult = null, scenario = 'None';
  var MOTHER_THRESHOLD_RANGE = 1.20;  // range expansion (unchanged)
  var MOTHER_THRESHOLD_BODY  = 2.00;  // body expansion tightened (was 1.2x)

  for (var mi = aggs.length - 1; mi >= 5; mi--) {
    var prev5    = aggs.slice(mi - 5, mi);
    var bar      = aggs[mi];
    var barRange = bar.high - bar.low;
    var barBody  = Math.abs(bar.close - bar.open);
    var avgR     = avgRange(prev5);
    var avgB     = avgBody(prev5);
    var rangeExp = avgR > 0 ? barRange / avgR : 0;
    var bodyExp  = avgB > 0 ? barBody / avgB  : 0;
    var qualByRange = rangeExp >= MOTHER_THRESHOLD_RANGE;
    var qualByBody  = bodyExp  >= MOTHER_THRESHOLD_BODY;

    if (!qualByRange && !qualByBody) continue;

    var babyBar = (mi + 1 < aggs.length) ? aggs[mi + 1] : null;
    if (!babyBar) continue;

    // Baby must be inside Mother RANGE (wicks included — classic Inside Bar rule)
    if (babyBar.high > bar.high || babyBar.low < bar.low) continue;

    var babyObj = { index: mi+1, date: babyBar.date, date1: babyBar.date1, dateLabel: babyBar.dateLabel,
                    open: babyBar.open, high: babyBar.high, low: babyBar.low, close: babyBar.close,
                    volume: babyBar.volume, inside: true,
                    motherHigh: bar.high, motherLow: bar.low,
                    highValid: babyBar.high <= bar.high,
                    lowValid:  babyBar.low  >= bar.low };

    var motherObj = { index: mi, date: bar.date, date1: bar.date1, dateLabel: bar.dateLabel,
                      open: bar.open, high: bar.high, low: bar.low, close: bar.close,
                      volume: bar.volume, range: barRange, body: barBody,
                      avgPrev5Range: avgR, avgPrev5Body: avgB,
                      rangeExpansion: rangeExp, bodyExpansion: bodyExp,
                      qualifiedBy: qualByRange ? (qualByBody ? 'Both' : 'Range') : 'Body',
                      qualByRange: qualByRange, qualByBody: qualByBody };

    // Unified sequence detection: Manipulation then EXE, both within Bar 3-6
    var seqResult = detectForceStrikeSequence(aggs, mi + 1, bar.high, bar.low);
    audit.steps.triggerChecked      = seqResult.checked;
    audit.steps.manipulationChecked = seqResult.manipulation;

    if (seqResult.found) {
      mother      = motherObj;
      baby        = babyObj;
      trigger     = seqResult.bar;
      manipResult = seqResult.manipulation;
      audit.steps.manipulation = seqResult.manipulation;
      scenario    = classifyScenario(aggs, mi, trendStatus, seqResult.bar, babyObj);
      break;
    } else {
      mother = motherObj; baby = babyObj;
      audit.steps.manipulation = seqResult.manipulation;
    }
  }

  if (!mother) return empty('No Mother Bar found (requires >=1.2x range or body expansion)', 'No Pattern');
  if (!baby)   return empty('No Baby Bar after Mother', 'No Pattern');
  audit.steps.mother = mother;
  audit.steps.baby   = baby;
  if (!trigger) {
    // Determine if manipulation was found but EXE didn't fire
    var hasManip = manipResult && manipResult.found;
    var noTrigReason = hasManip
      ? 'Manipulation found but no valid EXE (reclaim + PIN/MU) within Bar 3-6'
      : 'No manipulation below Mother Low within Bar 3-6 — Force Strike invalid';
    return { triggered: false, result: 'Expired', symbol: symbol,
             motherBar: mother, babyBar: baby,
             manipulationBar: hasManip ? manipResult : null,
             audit: Object.assign({ finalReason: noTrigReason }, audit) };
  }

  var latestIdx     = aggs.length - 1;
  var patternAge    = latestIdx - mother.index;
  var triggerPos    = trigger.index - mother.index + 1; // Bar 3-6
  var barsSinceTrig = latestIdx - trigger.index;
  var volume        = aggs[latestIdx].volume;

  var MAX_PATTERN_AGE = 7; // supports Bar 6 trigger + 1 bar since
  if (patternAge > MAX_PATTERN_AGE) {
    return {
      triggered:   false,
      result:      'Expired',
      symbol:      symbol,
      patternAge:  patternAge,
      volume:      volume,
      motherBar:   mother,
      babyBar:     baby,
      triggerBar:  trigger,
      manipulationBar: manipResult && manipResult.found ? manipResult : null,
      audit: Object.assign({
        finalReason: 'Pattern Age exceeded ' + MAX_PATTERN_AGE + ' bars (age = ' + patternAge + ')',
        trendStatus: trendStatus || 'Unknown',
        steps: Object.assign({}, audit.steps, { mother: mother, baby: baby,
                 trigger: trigger, scenario: scenario }),
      }, audit),
    };
  }

  audit.steps.mother   = mother;
  audit.steps.baby     = baby;
  audit.steps.trigger  = trigger;
  audit.steps.scenario = scenario;
  audit.trendStatus    = trendStatus || 'Unknown';

  // ATR(14) from daily candles
  var atr14 = 0;
  if (dailyCandles.length >= 15) {
    var trs = [];
    for (var ai = 1; ai < dailyCandles.length; ai++) {
      var dc = dailyCandles[ai], dp = dailyCandles[ai-1];
      trs.push(Math.max(dc.high - dc.low, Math.abs(dc.high - dp.close), Math.abs(dc.low - dp.close)));
    }
    var atrSlice = trs.slice(-14);
    atr14 = atrSlice.reduce(function(s,v){ return s+v; }, 0) / atrSlice.length;
  }
  // Trade structure
  var tradeEntry  = trigger.high;
  var tradeStop   = mother.low;
  var tradeRisk   = tradeEntry > 0 ? (tradeEntry - tradeStop) / tradeEntry * 100 : 0;
  var tradeRiskATR = atr14 > 0 ? (tradeEntry - tradeStop) / atr14 : null;
  var tradeQualityStars = tradeRiskATR == null ? null
    : tradeRiskATR <= 1.0 ? 5 : tradeRiskATR <= 1.5 ? 4
    : tradeRiskATR <= 2.0 ? 3 : tradeRiskATR <= 3.0 ? 2 : 1;

  var chartStart = Math.max(0, aggs.length - 10);
  var chartBars  = aggs.slice(chartStart).map(function(b, ci) {
    var absIdx = chartStart + ci;
    var manipIdx = manipResult && manipResult.found ? manipResult.index : -1;
    var role = absIdx === mother.index   ? 'mother'
             : absIdx === baby.index     ? 'baby'
             : absIdx === manipIdx       ? 'manip'
             : absIdx === trigger.index  ? 'trigger' : 'normal';
    return Object.assign({}, b, { role: role });
  });

  return {
    triggered:        true,
    result:           'Triggered',
    symbol:           symbol,
    triggerType:      trigger.triggerType,
    scenario:         scenario,
    volume:           volume,
    patternAge:       patternAge,
    triggerPosition:  triggerPos,
    barsSinceTrigger: barsSinceTrig,
    pattern:          'M\u2192B\u2192' + trigger.triggerType,
    motherBar:        mother,
    babyBar:          baby,
    manipulationBar:  manipResult && manipResult.found ? manipResult : null,
    triggerBar:       trigger,
    chartBars:        chartBars,
    atr14:            atr14,
    tradeEntry:       tradeEntry,
    tradeStop:        tradeStop,
    tradeRiskPct:     tradeRisk,
    tradeRiskATR:     tradeRiskATR,
    tradeQualityStars: tradeQualityStars,
    audit:            Object.assign({ finalReason: 'Force Strike Triggered' }, audit),
  };
}

// ── Audit TXT formatter ──────────────────────────────────────────────────────
export function formatAuditTxt(allResults, generatedAt, stoppedEarly, scanId, cacheSource) {
  var TARGET    = 20;
  var triggered = allResults.filter(function(r){ return r.triggered; });
  var expired   = allResults.filter(function(r){ return !r.triggered && r.result === 'Expired'; });
  var invalid   = allResults.filter(function(r){ return !r.triggered && r.result !== 'Expired'; });
  var displayed = Math.min(triggered.length, TARGET);
  var lines = [
    'Force Strike Audit Export', '',
    'Scan ID:                ' + (scanId || 'N/A'),
    'Generated:              ' + generatedAt,
    'Cache Source:           ' + (cacheSource || 'live'),
    'Scan Rule Version:      ForceStrike-v10',
    'Total Stocks Scanned:   ' + allResults.length,
    'Valid Triggered Count:  ' + triggered.length,
    'Displayed Count:        ' + displayed,
    'Expired / No EXE:       ' + expired.length,
    'Invalid / No Pattern:   ' + invalid.length,
    'Stopped Early:          ' + (stoppedEarly ? 'Yes (' + TARGET + ' valid setups found)' : 'No — full universe scanned'),
    'Target Valid Setups:    ' + TARGET,
    '',
    'Timing:',
    '  Per-ticker timing included under Performance Timing in each result block.',
    '  Chart Fetch = Yahoo chart API call. FS Scan = Force Strike detection.',
    '',
    'Rules Applied:',
    '  Baby Bar Rule:        Baby High <= Mother High AND Baby Low >= Mother Low (classic Inside Bar)',
    '  Manipulation Rule:    At least one bar in Bar 3-6 must have Low < Mother Low',
    '  Reclaim Rule:         EXE Close >= Mother Low',
    '  Trigger Window:       Bar 3-6 (Mother=Bar 1, Baby=Bar 2)',
    '  EXE Types:            PIN / MU / ICE',
    '  Mother Threshold:     Range >= 1.20x OR Body >= 2.00x vs prior 5 bars',
    '  ICE Tightened:        Adds Close > Prev High AND Close > Mother Midpoint',
  ];

  // Quality statistics
  var fsScores = triggered.map(function(r) {
    var tPts = r.triggerType==='PIN'?3:r.triggerType==='MU'?2:r.triggerType==='ICE'?2:0;
    var sPts = r.scenario==='Shakeout Reversal'?4:r.scenario==='Recovery Reversal'?3:r.scenario==='Trend Pullback'?2:0;
    var tpPos = r.triggerPosition||0;
    var tpPts = tpPos>=5?3:tpPos===4?2:tpPos===3?1:0;
    var mExp = r.motherBar&&r.motherBar.rangeExpansion!=null?r.motherBar.rangeExpansion:0;
    var mPts = mExp>=2.5?0.5:mExp>=1.5?1:mExp>=1.2?0.5:0;
    var iPts = r.triggerBar&&r.triggerBar.interactsWithMother===true?2:0;
    return tPts+sPts+tpPts+mPts+iPts;
  });
  var avgScore = fsScores.length ? fsScores.reduce(function(s,v){return s+v;},0)/fsScores.length : 0;
  var starCounts = [0,0,0,0,0];
  triggered.forEach(function(r){ var s=(r.tradeQualityStars||1)-1; starCounts[s]++; });
  var avgRisk = triggered.length ? triggered.reduce(function(s,r){return s+(r.tradeRiskPct||0);},0)/triggered.length : 0;
  var avgRiskATR = triggered.filter(function(r){return r.tradeRiskATR!=null;});
  var avgATR = avgRiskATR.length ? avgRiskATR.reduce(function(s,r){return s+(r.tradeRiskATR||0);},0)/avgRiskATR.length : 0;
  lines.push('');
  lines.push('Quality Statistics:');
  lines.push('  Average FS Score:       ' + avgScore.toFixed(1));
  lines.push('  Average Risk:           ' + avgRisk.toFixed(2) + '%');
  lines.push('  Average Risk ATR:       ' + avgATR.toFixed(2));
  lines.push('  5-Star Trades:          ' + starCounts[4]);
  lines.push('  4-Star Trades:          ' + starCounts[3]);
  lines.push('  3-Star Trades:          ' + starCounts[2]);
  lines.push('  2-Star Trades:          ' + starCounts[1]);
  lines.push('  1-Star Trades:          ' + starCounts[0]);

  allResults.forEach(function(r) {
    lines.push('', '================================================', '');
    lines.push('Ticker: ' + r.symbol);
    lines.push('Volume: ' + (r.volume != null ? Number(r.volume).toLocaleString() : 'N/A'));
    lines.push('Result: ' + r.result + (r.result === 'Expired' && r.patternAge != null && r.patternAge > 5 ? ' (Too Old — Age ' + r.patternAge + ')' : ''));

    if (r.triggered) {
      lines.push('', 'Summary:');
      lines.push('  Pattern:            ' + (r.pattern || '—'));
      lines.push('  Trigger Position:   Bar ' + (r.triggerPosition != null ? r.triggerPosition : '—'));
      lines.push('  Bars Since Trigger: ' + (r.barsSinceTrigger != null ? r.barsSinceTrigger : '—'));
      lines.push('  Bars Since Mother:  ' + (r.patternAge != null ? r.patternAge : '—') + ' (audit reference only)');
      lines.push('  Mother Bar:         ' + (r.motherBar  ? fmtDate(r.motherBar.date1  || r.motherBar.date)  : '—'));
      lines.push('  Baby Bar:           ' + (r.babyBar    ? fmtDate(r.babyBar.date1    || r.babyBar.date)    : '—'));
      lines.push('  Trigger:            ' + (r.triggerBar ? fmtDate(r.triggerBar.date1 || r.triggerBar.date) : '—'));
      lines.push('  Trigger Type:       ' + (r.triggerType || '—'));
      lines.push('  Scenario:           ' + (r.scenario   || '—'));
      // Trade structure
      if (r.tradeEntry != null) {
        lines.push('');
        lines.push('  Trade Structure:');
        lines.push('    Entry (Trigger High): $' + r.tradeEntry.toFixed(2));
        lines.push('    Stop (Mother Low):    $' + r.tradeStop.toFixed(2));
        lines.push('    Risk:                 ' + r.tradeRiskPct.toFixed(2) + '%');
        lines.push('    ATR(14):              ' + r.atr14.toFixed(2));
        lines.push('    Risk vs ATR:          ' + (r.tradeRiskATR!=null?r.tradeRiskATR.toFixed(2)+' ATR':'N/A'));
        lines.push('    Trade Quality:        ' + (r.tradeQualityStars||'N/A') + '/5 stars');
      }
      // Force Strike Score — Trigger Position replaces Pattern Age
      var tPts = r.triggerType==='PIN'?3:r.triggerType==='MU'?2:r.triggerType==='ICE'?2:0;
      var sPts = r.scenario==='Shakeout Reversal'?4:r.scenario==='Recovery Reversal'?3:r.scenario==='Trend Pullback'?2:0;
      var tpPos = r.triggerPosition!=null ? r.triggerPosition : 0;
      var tpPts = tpPos>=5?3:tpPos===4?2:tpPos===3?1:0;
      var mExp = r.motherBar&&r.motherBar.rangeExpansion!=null?r.motherBar.rangeExpansion:0;
      var mPts = mExp>=2.5?0.5:mExp>=1.5?1:mExp>=1.2?0.5:0;
      var iPts = r.triggerBar&&r.triggerBar.interactsWithMother===true?2:0;
      var totalPts = tPts+sPts+tpPts+mPts+iPts;
      var stars = totalPts<=2?1:totalPts<=4?2:totalPts<=6?3:totalPts<=8?4:5;
      lines.push('');
      lines.push('  Force Strike Score:');
      lines.push('    Stars:              ' + stars + '/5');
      lines.push('    Total Points:       ' + totalPts);
      lines.push('    Trigger Type:       +' + tPts);
      lines.push('    Scenario:           +' + sPts);
      lines.push('    Trigger Position:   +' + tpPts + ' (Bar ' + (tpPos||'—') + ')');
      lines.push('    Mother Expansion:   +' + mPts + (mExp>0?' ('+mExp.toFixed(2)+'x)':''));
      lines.push('    Mother Interaction: +' + iPts);
    }

    var a = r.audit || {}, s = a.steps || {};

    // Mother Bar — full OHLCV
    if (s.mother) {
      var m = s.mother;
      lines.push('', '------------------------------------------------', 'Mother Bar', '');
      lines.push('Index:            ' + m.index);
      lines.push('Date:             ' + fmtDate(m.date1 || m.date));
      lines.push('Open:             ' + (m.open   != null ? m.open.toFixed(2)   : 'N/A'));
      lines.push('High:             ' + (m.high   != null ? m.high.toFixed(2)   : 'N/A'));
      lines.push('Low:              ' + (m.low    != null ? m.low.toFixed(2)    : 'N/A'));
      lines.push('Close:            ' + (m.close  != null ? m.close.toFixed(2)  : 'N/A'));
      lines.push('Volume:           ' + (m.volume != null ? Number(m.volume).toLocaleString() : 'N/A'));
      lines.push('');
      lines.push('Range:            ' + (m.range != null ? m.range.toFixed(4) : 'N/A'));
      lines.push('Body:             ' + (m.body  != null ? m.body.toFixed(4)  : 'N/A'));
      lines.push('Avg Prev5 Range:  ' + (m.avgPrev5Range != null ? m.avgPrev5Range.toFixed(4) : 'N/A'));
      lines.push('Avg Prev5 Body:   ' + (m.avgPrev5Body  != null ? m.avgPrev5Body.toFixed(4)  : 'N/A'));
      lines.push('Range Expansion:  ' + (m.rangeExpansion != null ? m.rangeExpansion.toFixed(2)+'x' : 'N/A'));
      lines.push('Body Expansion:   ' + (m.bodyExpansion  != null ? m.bodyExpansion.toFixed(2)+'x'  : 'N/A'));
      lines.push('Qualified By:     ' + (m.qualifiedBy || 'N/A'));
    }

    // Baby Bar — full OHLCV + range validation
    if (s.baby) {
      var b = s.baby;
      lines.push('', '------------------------------------------------', 'Baby Bar', '');
      lines.push('Index:                        ' + b.index);
      lines.push('Date:                         ' + fmtDate(b.date1 || b.date));
      lines.push('Open:                         ' + (b.open   != null ? b.open.toFixed(2)   : 'N/A'));
      lines.push('High:                         ' + (b.high   != null ? b.high.toFixed(2)   : 'N/A'));
      lines.push('Low:                          ' + (b.low    != null ? b.low.toFixed(2)    : 'N/A'));
      lines.push('Close:                        ' + (b.close  != null ? b.close.toFixed(2)  : 'N/A'));
      lines.push('Volume:                       ' + (b.volume != null ? Number(b.volume).toLocaleString() : 'N/A'));
      lines.push('');
      lines.push('Mother High:                  ' + (b.motherHigh != null ? b.motherHigh.toFixed(2) : 'N/A'));
      lines.push('Mother Low:                   ' + (b.motherLow  != null ? b.motherLow.toFixed(2)  : 'N/A'));
      lines.push('Baby High:                    ' + (b.high != null ? b.high.toFixed(2) : 'N/A'));
      lines.push('Baby Low:                     ' + (b.low  != null ? b.low.toFixed(2)  : 'N/A'));
      lines.push('Baby High <= Mother High:      ' + (b.highValid != null ? String(b.highValid) : (b.high != null && b.motherHigh != null ? String(b.high <= b.motherHigh) : 'N/A')));
      lines.push('Baby Low >= Mother Low:        ' + (b.lowValid  != null ? String(b.lowValid)  : (b.low  != null && b.motherLow  != null ? String(b.low  >= b.motherLow)  : 'N/A')));
      lines.push('Baby Inside Mother Range:      ' + (b.inside ? 'true' : 'false'));
    }

    // Trigger Search — full EXE audit per bar
    lines.push('', '------------------------------------------------', 'Trigger Search', '');
    var checked = s.triggerChecked || [];
    lines.push('Bars Checked: ' + checked.length);
    checked.forEach(function(c, ci) {
      var barPos = (c.index != null && s.baby && s.baby.index != null)
        ? 'Bar ' + (c.index - (s.baby.index - 1)) : 'Bar ' + (ci+2);
      lines.push('', barPos + ':');
      lines.push('  Date:                        ' + fmtDate(c.date1 || c.date));
      lines.push('  Open:                        ' + (c.open   != null ? c.open.toFixed(4)   : 'N/A'));
      lines.push('  High:                        ' + (c.high   != null ? c.high.toFixed(4)   : 'N/A'));
      lines.push('  Low:                         ' + (c.low    != null ? c.low.toFixed(4)    : 'N/A'));
      lines.push('  Close:                       ' + (c.close  != null ? c.close.toFixed(4)  : 'N/A'));
      lines.push('  Volume:                      ' + (c.volume != null ? Number(c.volume).toLocaleString() : 'N/A'));
      var rng = c.high!=null&&c.low!=null ? c.high-c.low : null;
      var body = c.open!=null&&c.close!=null ? Math.abs(c.close-c.open) : null;
      var lw = c.open!=null&&c.close!=null&&c.low!=null ? Math.min(c.open,c.close)-c.low : null;
      var uw = c.open!=null&&c.close!=null&&c.high!=null ? c.high-Math.max(c.open,c.close) : null;
      var closePos = rng!=null&&rng>0&&c.close!=null&&c.low!=null ? (c.close-c.low)/rng*100 : null;
      lines.push('  Range:                       ' + (rng  != null ? rng.toFixed(4)  : 'N/A'));
      lines.push('  Body:                        ' + (body != null ? body.toFixed(4) : 'N/A'));
      lines.push('  Lower Wick:                  ' + (lw   != null ? lw.toFixed(4)   : 'N/A'));
      lines.push('  Upper Wick:                  ' + (uw   != null ? uw.toFixed(4)   : 'N/A'));
      lines.push('  Close Position in Range:     ' + (closePos != null ? closePos.toFixed(1)+'%' : 'N/A'));
      lines.push('  Mother High:                 ' + (c.motherHigh != null ? c.motherHigh.toFixed(4) : 'N/A'));
      lines.push('  Mother Low:                  ' + (c.motherLow  != null ? c.motherLow.toFixed(4)  : 'N/A'));
      lines.push('  Low < Mother Low (Manip):    ' + String(!!(c.isManipulation)));
      lines.push('  Close >= Mother Low (Reclaim):' + (c.reclaims != null ? String(c.reclaims) : (c.close!=null&&c.motherLow!=null?String(c.close>=c.motherLow):'N/A')));

      // Full EXE audit if available
      var ea = c.exeAudit;
      if (ea) {
        // PIN
        var pa = ea.pin;
        lines.push('', '  PIN Audit:');
        lines.push('    Condition 1 — Close > Open:          ' + (pa.c1_bullish?'PASS':'FAIL') + ' (open='+c.open.toFixed(4)+' close='+c.close.toFixed(4)+')');
        lines.push('    Condition 2 — Lower Wick >= 2x Body: ' + (pa.c2_lowerWick?'PASS':'FAIL') + ' (wick='+pa.lowerWick.toFixed(4)+' body='+pa.body.toFixed(4)+' ratio='+pa.ratio.toFixed(2)+'x)');
        lines.push('    Condition 3 — Close > Midpoint:      ' + (pa.c3_aboveMid?'PASS':'FAIL')  + ' (close='+c.close.toFixed(4)+' mid='+pa.midpoint.toFixed(4)+')');
        lines.push('    PIN Result:                           ' + (pa.pass?'TRUE':'FALSE'));
        // MU
        var ma = ea.mu;
        lines.push('', '  MU Audit:');
        lines.push('    Condition 1 — Close > Open:          ' + (ma.c1_bullish?'PASS':'FAIL'));
        lines.push('    Condition 2 — Close in upper 25%:    ' + (ma.c2_upperClose?'PASS':'FAIL') + ' (pos='+ma.closePos.toFixed(1)+'% threshold='+ma.upper25Threshold.toFixed(4)+')');
        lines.push('    Condition 3 — Body > Avg Prev5 Body: ' + (ma.c3_largeBody?'PASS':'FAIL') + ' (body='+ma.body.toFixed(4)+' avg='+ma.avgPrevBody.toFixed(4)+' ratio='+ma.bodyRatio.toFixed(2)+'x)');
        lines.push('    MU Result:                            ' + (ma.pass?'TRUE':'FALSE'));
        // ICE
        var ia = ea.ice;
        lines.push('', '  ICE Audit:');
        lines.push('    Condition 1 — Close > Open:          ' + (ia.c1_bullish?'PASS':'FAIL'));
        lines.push('    Condition 2 — Body >= 50% Range:     ' + (ia.c2_halfBody?'PASS':'FAIL') + ' (bodyPct='+ia.bodyPct.toFixed(1)+'%)');
        lines.push('    Condition 3 — Close in Upper Third:  ' + (ia.c3_upperThird?'PASS':'FAIL') + ' (close='+c.close.toFixed(4)+' threshold='+ia.upperThird.toFixed(4)+')');
        lines.push('    Condition 4 — Close > Prev Bar High: ' + (ia.c4_abovePrevHigh?'PASS':'FAIL') + ' (prevHigh='+(ia.prevHigh!=null?ia.prevHigh.toFixed(4):'N/A')+')');
        lines.push('    Condition 5 — Close > Mother Mid:    ' + (ia.c5_aboveMotherMid?'PASS':'FAIL') + ' (motherMid='+(ia.motherMidpoint!=null?ia.motherMidpoint.toFixed(4):'N/A')+')');
        lines.push('    ICE Result:                           ' + (ia.pass?'TRUE':'FALSE'));
        lines.push('', '  Selected EXE: ' + (c.triggerType||'NONE'));
        // Confidence assessment
        var passCount = (pa.pass?1:0)+(ma.pass?1:0)+(ia.pass?1:0);
        var conf = c.triggerType&&c.triggerType!=='NONE' ? (
          passCount > 1 ? 'High (multiple EXE types qualify)' :
          (pa.pass&&pa.ratio>3) || (ma.pass&&ma.bodyRatio>2) ? 'High (strong signal)' :
          (pa.pass&&pa.ratio>2) || (ma.pass&&ma.bodyRatio>1.5) ? 'Medium' : 'Low (barely passed)'
        ) : 'N/A';
        lines.push('  EXE Confidence:                       ' + conf);
      } else if (!c.isManipulation) {
        // Fallback inline calculation if exeAudit not stored
        if (c.open!=null&&c.close!=null&&c.high!=null&&c.low!=null&&rng!=null) {
          var fbBull = c.close>c.open, fbLw = Math.min(c.open,c.close)-c.low, fbBody = body||0;
          var fbMid = c.low+rng/2, fbPin = fbBull&&fbLw>=2*fbBody&&c.close>fbMid;
          var fbMuClose = rng>0?(c.close-c.low)/rng>=0.75:false;
          lines.push('  PIN (inline):  ' + (fbPin?'TRUE':'FALSE'));
          lines.push('  MU (partial):  close in upper 25%='+String(fbMuClose)+' bullish='+String(fbBull));
        }
      }
      if (c.skipReason) lines.push('  Skip Reason:  ' + c.skipReason);
      lines.push('  EXE Type:     ' + (c.triggerType||'NONE'));
    });
    lines.push('', 'Trigger Found: ' + (r.triggered ? 'true' : 'false'));
    lines.push('Trigger Type:  ' + (r.triggerType || 'NONE'));
    if (r.triggerBar) lines.push('Trigger Date:  ' + fmtDate(r.triggerBar.date1 || r.triggerBar.date));

    // Manipulation detail
    var manip = r.manipulationBar || (s.manipulationChecked);
    if (manip && manip.found) {
      lines.push('', '------------------------------------------------', 'Manipulation Validation', '');
      lines.push('Detected:          true');
      lines.push('Date:              ' + fmtDate(manip.date1 || manip.date));
      lines.push('Open:              ' + (manip.open  != null ? manip.open.toFixed(4)  : 'N/A'));
      lines.push('High:              ' + (manip.high  != null ? manip.high.toFixed(4)  : 'N/A'));
      lines.push('Low:               ' + manip.low.toFixed(4));
      lines.push('Close:             ' + (manip.close != null ? manip.close.toFixed(4) : 'N/A'));
      lines.push('Mother Low:        ' + manip.motherLow.toFixed(4));
      lines.push('Break Amount:      ' + (manip.breakAmount != null ? manip.breakAmount.toFixed(4) : (manip.motherLow-manip.low).toFixed(4)));
      lines.push('Break %:           ' + (manip.breakPct    != null ? manip.breakPct.toFixed(2)+'%' : 'N/A'));
      // Same-bar analysis
      if (manip.sameBarPin || manip.sameBarMu || manip.sameBarIce) {
        lines.push('', '  Same-Bar EXE Analysis (audit only — not used in detection):');
        lines.push('  Would PIN qualify on manip bar? ' + (manip.sameBarPin&&manip.sameBarPin.pass?'YES':'NO'));
        lines.push('  Would MU qualify on manip bar?  ' + (manip.sameBarMu&&manip.sameBarMu.pass?'YES':'NO'));
        lines.push('  Would ICE qualify on manip bar? ' + (manip.sameBarIce&&manip.sameBarIce.pass?'YES':'NO'));
        lines.push('  Would Qualify (same-bar):       ' + (manip.sameBarWouldQualify?'YES (would need same-bar rule change)':'NO'));
      }
    } else if (manip && !manip.found) {
      lines.push('', '------------------------------------------------', 'Manipulation Validation', '');
      lines.push('Detected: false — no bar below Mother Low ' + (manip.motherLow!=null?manip.motherLow.toFixed(4):'') + ' found within Bar 3-6');
    }

    // Reclaim detail
    if (r.triggerBar) {
      lines.push('', '------------------------------------------------', 'Reclaim Validation', '');
      var tb = r.triggerBar;
      lines.push('EXE Date:          ' + fmtDate(tb.date1 || tb.date));
      lines.push('EXE Close:         ' + (tb.close != null ? tb.close.toFixed(4) : 'N/A'));
      lines.push('Mother Low:        ' + (tb.motherLow != null ? tb.motherLow.toFixed(4) : 'N/A'));
      lines.push('Close >= Mother Low: ' + (tb.reclaims != null ? String(tb.reclaims) : (tb.close!=null&&tb.motherLow!=null?String(tb.close>=tb.motherLow):'N/A')));
    }

    lines.push('', '------------------------------------------------', 'Scenario', '');
    lines.push('Trend Status: ' + (a.trendStatus || 'Unknown'));
    lines.push('Scenario:     ' + (s.scenario || 'None'));
    if (r.triggerPosition != null) lines.push('Trigger Position: Bar ' + r.triggerPosition);
    if (r.barsSinceTrigger != null) lines.push('Bars Since Trigger: ' + r.barsSinceTrigger);
    if (r.patternAge != null) lines.push('Bars Since Mother:  ' + r.patternAge + ' (audit reference)');

    // Technical Context
    var tc = r.techContext;
    if (tc) {
      lines.push('', '------------------------------------------------', 'Technical Context', '');
      lines.push('Trend:              ' + (tc.trend || 'N/A'));
      lines.push('Trend Score:        ' + (tc.trendScore != null ? tc.trendScore : 'N/A'));
      lines.push('Momentum:           ' + (tc.momentum || 'N/A'));
      lines.push('Momentum Score:     ' + (tc.momentumScore != null ? tc.momentumScore : 'N/A'));
      lines.push('Reversal:           ' + (tc.reversal || 'N/A'));
      lines.push('Reversal Score:     ' + (tc.reversalScore != null ? tc.reversalScore : 'N/A'));
      lines.push('Money Flow:         ' + (tc.moneyFlow || 'N/A'));
      lines.push('Money Flow Score:   ' + (tc.moneyFlowScore != null ? tc.moneyFlowScore : 'N/A'));
      var tl=(tc.trend||'').toLowerCase(),ml2=(tc.momentum||'').toLowerCase(),rl=(tc.reversal||'').toLowerCase(),sfl=(tc.moneyFlow||'').toLowerCase();
      var trendBull=tl==='uptrend'||tl==='strong uptrend',trendBear=tl==='downtrend'||tl==='strong downtrend';
      var momBull=ml2==='building'||ml2==='strong',momBear=ml2==='fading'||ml2==='weak';
      var revBear=rl.indexOf('bear')!==-1,mfBull=sfl.indexOf('accumulation')!==-1&&sfl.indexOf('cooling')===-1;
      var score=(trendBull?1:0)+(momBull?1:0)+(mfBull?1:0)+(!revBear?0.5:0);
      var tsLabel=((trendBear||momBear)&&revBear)||(trendBear||momBear)?'Conflicting':score>=2.5?'Strong':score>=1.5?'Moderate':'Weak';
      lines.push('Technical Support:  ' + tsLabel);
    }

    // Timing
    if (r._timing) {
      lines.push('', '------------------------------------------------', 'Performance Timing', '');
      lines.push('Chart Fetch:  ' + r._timing.chartFetchMs + 'ms');
      lines.push('FS Scan:      ' + r._timing.scanMs + 'ms');
      lines.push('Total:        ' + r._timing.totalMs + 'ms');
    }

    lines.push('', '------------------------------------------------', 'Final Decision', '');
    lines.push('Included In Top ' + TARGET + ': ' + (r.triggered && triggered.indexOf(r) < TARGET ? 'true' : 'false'));
    lines.push('Reason: ' + (a.finalReason || 'N/A'));
  });
  return lines.join('\n');
}
