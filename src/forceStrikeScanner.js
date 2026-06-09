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
function isBullishPin(bar) {
  if (bar.close <= bar.open) return false;
  var body      = Math.abs(bar.close - bar.open);
  var lowerWick = Math.min(bar.open, bar.close) - bar.low;
  var midpoint  = bar.low + (bar.high - bar.low) / 2;
  return lowerWick >= 2 * body && bar.close > midpoint;
}
function isMarkUp(bar, prevBars) {
  if (bar.close <= bar.open) return false;
  var rng = bar.high - bar.low;
  if (!rng) return false;
  if ((bar.close - bar.low) / rng < 0.75) return false;
  return Math.abs(bar.close - bar.open) > avgBody(prevBars);
}

function detectTrigger(aggs, babyIndex) {
  var checked = [], maxCheck = Math.min(3, aggs.length - babyIndex - 1);
  for (var offset = 1; offset <= maxCheck; offset++) {
    var idx  = babyIndex + offset;
    var bar  = aggs[idx];
    var p5   = aggs.slice(Math.max(0, idx - 5), idx);
    var info = { index: idx, date: bar.date, date1: bar.date1, dateLabel: bar.dateLabel,
                 open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume };
    if (isBullishPin(bar)) {
      info.triggerType = 'PIN'; checked.push(info);
      return { found: true, bar: info, checked: checked };
    }
    if (isMarkUp(bar, p5)) {
      info.triggerType = 'MU'; checked.push(info);
      return { found: true, bar: info, checked: checked };
    }
    info.triggerType = 'NONE'; checked.push(info);
  }
  return { found: false, checked: checked };
}

// ── Scenario classification ──────────────────────────────────────────────────
function classifyScenario(aggs, motherIndex, trendStatus) {
  var mother   = aggs[motherIndex];
  var prevBars = aggs.slice(Math.max(0, motherIndex - 20), motherIndex);
  var swingLow = prevBars.length
    ? prevBars.reduce(function(m,b){ return Math.min(m,b.low); }, Infinity) : null;
  var prevRange20 = prevBars.length
    ? prevBars.reduce(function(s,b){ return s+(b.high-b.low); }, 0) / prevBars.length : null;
  var highestHigh = prevBars.length
    ? prevBars.reduce(function(m,b){ return Math.max(m,b.high); }, -Infinity) : null;
  var sideways = prevRange20 && highestHigh && (highestHigh - swingLow) < prevRange20 * 5;

  if (sideways && swingLow && mother.low < swingLow && mother.close >= swingLow) return 'Shakeout Reversal';
  if (swingLow && mother.low < swingLow && mother.close >= swingLow) return 'Recovery Reversal';
  var ts = (trendStatus || '').toLowerCase();
  if (ts === 'uptrend' || ts === 'strong uptrend') return 'Trend Pullback';
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
  if (aggs.length < 7) return empty('Not enough aggregated bars (need 7+)', 'No Pattern');

  var mother = null, baby = null, trigger = null, scenario = 'None';
  var MOTHER_THRESHOLD = 1.20; // Improvement 1: tightened from >1.0× to >=1.2×

  for (var mi = aggs.length - 1; mi >= 5; mi--) {
    var prev5    = aggs.slice(mi - 5, mi);
    var bar      = aggs[mi];
    var barRange = bar.high - bar.low;
    var barBody  = Math.abs(bar.close - bar.open);
    var avgR     = avgRange(prev5);
    var avgB     = avgBody(prev5);
    var rangeExp = avgR > 0 ? barRange / avgR : 0;
    var bodyExp  = avgB > 0 ? barBody / avgB  : 0;
    var qualByRange = rangeExp >= MOTHER_THRESHOLD;
    var qualByBody  = bodyExp  >= MOTHER_THRESHOLD;

    if (!qualByRange && !qualByBody) continue; // Tightened threshold

    var babyBar = (mi + 1 < aggs.length) ? aggs[mi + 1] : null;
    if (!babyBar) continue;
    if (babyBar.high > bar.high || babyBar.low < bar.low) continue; // Baby must be inside

    var babyObj = { index: mi+1, date: babyBar.date, date1: babyBar.date1, dateLabel: babyBar.dateLabel,
                    open: babyBar.open, high: babyBar.high, low: babyBar.low, close: babyBar.close,
                    volume: babyBar.volume, inside: true,
                    motherHigh: bar.high, motherLow: bar.low,
                    highValid: babyBar.high <= bar.high,
                    lowValid:  babyBar.low  >= bar.low };

    var trigResult = detectTrigger(aggs, mi + 1);
    var motherObj  = { index: mi, date: bar.date, date1: bar.date1, dateLabel: bar.dateLabel,
                       open: bar.open, high: bar.high, low: bar.low, close: bar.close,
                       volume: bar.volume, range: barRange, body: barBody,
                       avgPrev5Range: avgR, avgPrev5Body: avgB,
                       rangeExpansion: rangeExp, bodyExpansion: bodyExp,
                       qualifiedBy: qualByRange ? (qualByBody ? 'Both' : 'Range') : 'Body',
                       qualByRange: qualByRange, qualByBody: qualByBody };

    if (trigResult.found) {
      mother   = motherObj;
      baby     = babyObj;
      trigger  = trigResult.bar;
      audit.steps.triggerChecked = trigResult.checked;
      scenario = classifyScenario(aggs, mi, trendStatus);
      break;
    } else {
      audit.steps.triggerChecked = trigResult.checked;
      mother = motherObj; baby = babyObj;
    }
  }

  if (!mother) return empty('No Mother Bar found (requires >=1.2× range or body expansion)', 'No Pattern');
  if (!baby)   return empty('No Baby Bar after Mother', 'No Pattern');
  audit.steps.mother = mother;
  audit.steps.baby   = baby;
  if (!trigger) {
    return { triggered: false, result: 'Expired', symbol: symbol,
             motherBar: mother, babyBar: baby,
             audit: Object.assign({ finalReason: 'Trigger not found within 3 bars' }, audit) };
  }

  var latestIdx  = aggs.length - 1;
  var patternAge = latestIdx - mother.index; // bars since Mother
  var volume     = aggs[latestIdx].volume;

  // Pattern Age is a scan criterion — setups older than 5 bars are Expired
  var MAX_PATTERN_AGE = 5;
  if (patternAge > MAX_PATTERN_AGE) {
    return {
      triggered:  false,
      result:     'Expired',
      symbol:     symbol,
      patternAge: patternAge,
      volume:     volume,
      motherBar:  mother,
      babyBar:    baby,
      triggerBar: trigger,
      audit:      Object.assign({
        finalReason: 'Pattern Age exceeded ' + MAX_PATTERN_AGE + ' bars (age = ' + patternAge + ')',
        trendStatus: trendStatus || 'Unknown',
        steps:       Object.assign({}, audit.steps, { mother: mother, baby: baby,
                       trigger: trigger, scenario: scenario }),
      }, audit),
    };
  }

  audit.steps.mother   = mother;
  audit.steps.baby     = baby;
  audit.steps.trigger  = trigger;
  audit.steps.scenario = scenario;
  audit.trendStatus    = trendStatus || 'Unknown';

  // Last 10 agg bars for mini chart with role tags
  var chartStart = Math.max(0, aggs.length - 10);
  var chartBars  = aggs.slice(chartStart).map(function(b, ci) {
    var absIdx = chartStart + ci;
    var role = absIdx === mother.index  ? 'mother'
             : absIdx === baby.index    ? 'baby'
             : absIdx === trigger.index ? 'trigger' : 'normal';
    return Object.assign({}, b, { role: role });
  });

  return {
    triggered:    true,
    result:       'Triggered',
    symbol:       symbol,
    triggerType:  trigger.triggerType,
    scenario:     scenario,
    volume:       volume,
    patternAge:   patternAge,
    pattern:      'M\u2192B\u2192' + trigger.triggerType,
    motherBar:    mother,
    babyBar:      baby,
    triggerBar:   trigger,
    chartBars:    chartBars,
    audit:        Object.assign({ finalReason: 'Force Strike Triggered' }, audit),
  };
}

// ── Audit TXT formatter ──────────────────────────────────────────────────────
export function formatAuditTxt(allResults, generatedAt, stoppedEarly) {
  var TARGET    = 10;
  var triggered = allResults.filter(function(r){ return r.triggered; });
  var expired   = allResults.filter(function(r){ return !r.triggered && r.result === 'Expired'; });
  var invalid   = allResults.filter(function(r){ return !r.triggered && r.result !== 'Expired'; });
  var displayed = Math.min(triggered.length, TARGET);
  var lines = [
    'Force Strike Audit Export', '',
    'Generated:              ' + generatedAt,
    'Total Stocks Scanned:   ' + allResults.length,
    'Valid Triggered Count:  ' + triggered.length,
    'Displayed Count:        ' + displayed,
    'Expired / Too Old:      ' + expired.length,
    'Invalid / No Pattern:   ' + invalid.length,
    'Stopped Early:          ' + (stoppedEarly ? 'Yes (' + TARGET + ' valid setups found)' : 'No — full universe scanned'),
    'Target Valid Setups:    ' + TARGET,
    'Mother Threshold:       1.20x (range or body expansion)',
    'Baby Bar Rule:          Baby High <= Mother High AND Baby Low >= Mother Low (strict, no tolerance)',
  ];

  allResults.forEach(function(r) {
    lines.push('', '================================================', '');
    lines.push('Ticker: ' + r.symbol);
    lines.push('Volume: ' + (r.volume != null ? Number(r.volume).toLocaleString() : 'N/A'));
    lines.push('Result: ' + r.result + (r.result === 'Expired' && r.patternAge != null && r.patternAge > 5 ? ' (Too Old — Age ' + r.patternAge + ')' : ''));

    if (r.triggered) {
      lines.push('', 'Summary:');
      lines.push('  Pattern:      ' + (r.pattern || '—'));
      lines.push('  Pattern Age:  ' + (r.patternAge != null ? r.patternAge + ' bars since Mother' : '—'));
      lines.push('  Mother Bar:   ' + (r.motherBar  ? fmtDate(r.motherBar.date1  || r.motherBar.date)  : '—'));
      lines.push('  Baby Bar:     ' + (r.babyBar    ? fmtDate(r.babyBar.date1    || r.babyBar.date)    : '—'));
      lines.push('  Trigger:      ' + (r.triggerBar ? fmtDate(r.triggerBar.date1 || r.triggerBar.date) : '—'));
      lines.push('  Trigger Type: ' + (r.triggerType || '—'));
      lines.push('  Scenario:     ' + (r.scenario   || '—'));
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

    // Baby Bar — full OHLCV + explicit validation
    if (s.baby) {
      var b = s.baby;
      lines.push('', '------------------------------------------------', 'Baby Bar', '');
      lines.push('Index:                   ' + b.index);
      lines.push('Date:                    ' + fmtDate(b.date1 || b.date));
      lines.push('Open:                    ' + (b.open   != null ? b.open.toFixed(2)   : 'N/A'));
      lines.push('High:                    ' + (b.high   != null ? b.high.toFixed(2)   : 'N/A'));
      lines.push('Low:                     ' + (b.low    != null ? b.low.toFixed(2)    : 'N/A'));
      lines.push('Close:                   ' + (b.close  != null ? b.close.toFixed(2)  : 'N/A'));
      lines.push('Volume:                  ' + (b.volume != null ? Number(b.volume).toLocaleString() : 'N/A'));
      lines.push('');
      lines.push('Mother High:             ' + (b.motherHigh != null ? b.motherHigh.toFixed(2) : 'N/A'));
      lines.push('Mother Low:              ' + (b.motherLow  != null ? b.motherLow.toFixed(2)  : 'N/A'));
      lines.push('Baby High:               ' + (b.high != null ? b.high.toFixed(2) : 'N/A'));
      lines.push('Baby Low:                ' + (b.low  != null ? b.low.toFixed(2)  : 'N/A'));
      lines.push('Baby High <= Mother High: ' + (b.highValid != null ? String(b.highValid) : (b.high <= b.motherHigh ? 'true' : 'false')));
      lines.push('Baby Low >= Mother Low:   ' + (b.lowValid  != null ? String(b.lowValid)  : (b.low  >= b.motherLow  ? 'true' : 'false')));
      lines.push('Baby Inside Mother:       ' + (b.inside ? 'true' : 'false'));
    }

    // Trigger Search — full OHLCV per bar
    lines.push('', '------------------------------------------------', 'Trigger Search', '');
    var checked = s.triggerChecked || [];
    lines.push('Bars Checked: ' + checked.length);
    checked.forEach(function(c, ci) {
      lines.push('', 'Bar ' + (ci+1) + ':');
      lines.push('  Date:         ' + fmtDate(c.date1 || c.date));
      lines.push('  Open:         ' + (c.open   != null ? c.open.toFixed(2)   : 'N/A'));
      lines.push('  High:         ' + (c.high   != null ? c.high.toFixed(2)   : 'N/A'));
      lines.push('  Low:          ' + (c.low    != null ? c.low.toFixed(2)    : 'N/A'));
      lines.push('  Close:        ' + (c.close  != null ? c.close.toFixed(2)  : 'N/A'));
      lines.push('  Volume:       ' + (c.volume != null ? Number(c.volume).toLocaleString() : 'N/A'));
      lines.push('  Trigger Type: ' + (c.triggerType || 'NONE'));
    });
    lines.push('', 'Trigger Found: ' + (r.triggered ? 'true' : 'false'));
    lines.push('Trigger Type:  ' + (r.triggerType || 'NONE'));
    if (r.triggerBar) lines.push('Trigger Date:  ' + fmtDate(r.triggerBar.date1 || r.triggerBar.date));

    lines.push('', '------------------------------------------------', 'Scenario', '');
    lines.push('Trend Status: ' + (a.trendStatus || 'Unknown'));
    lines.push('Scenario:     ' + (s.scenario || 'None'));
    if (r.patternAge != null) lines.push('Pattern Age:  ' + r.patternAge + ' bars since Mother');

    lines.push('', '------------------------------------------------', 'Final Decision', '');
    lines.push('Included In Top ' + TARGET + ': ' + (r.triggered && triggered.indexOf(r) < TARGET ? 'true' : 'false'));
    lines.push('Reason: ' + (a.finalReason || 'N/A'));
  });
  return lines.join('\n');
}
