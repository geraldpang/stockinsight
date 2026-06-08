// forceStrikeScanner.js
// Force Strike Pattern Scanner — deterministic, rule-based, zero AI.

// ── Date formatting ─────────────────────────────────────────────────────────
export function fmtDate(val) {
  if (!val) return '—';
  var d;
  // Unix ms timestamp
  if (typeof val === 'number') d = new Date(val);
  // ISO or date string
  else if (typeof val === 'string') {
    if (!isNaN(Number(val))) d = new Date(Number(val));
    else d = new Date(val);
  }
  if (!d || isNaN(d.getTime())) return String(val);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getDate() + '-' + months[d.getMonth()] + '-' + d.getFullYear();
}

// ── Step 1: Build 2-day aggregated bars ─────────────────────────────────────
export function buildAggregateBars(dailyCandles) {
  var aggs = [];
  for (var i = 0; i + 1 < dailyCandles.length; i += 2) {
    var d1 = dailyCandles[i];
    var d2 = dailyCandles[i + 1];
    aggs.push({
      date:   d1.date + '/' + d2.date,
      date1:  d1.date,
      date2:  d2.date,
      dateLabel: fmtDate(d1.date) + '/' + fmtDate(d2.date),
      open:   d1.open,
      high:   Math.max(d1.high,  d2.high),
      low:    Math.min(d1.low,   d2.low),
      close:  d2.close,
      volume: (d1.volume || 0) + (d2.volume || 0),
    });
  }
  return aggs;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function avgRange(bars) {
  if (!bars || bars.length === 0) return 0;
  return bars.reduce(function(s, b) { return s + (b.high - b.low); }, 0) / bars.length;
}
function avgBody(bars) {
  if (!bars || bars.length === 0) return 0;
  return bars.reduce(function(s, b) { return s + Math.abs(b.close - b.open); }, 0) / bars.length;
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
  var candleRange = bar.high - bar.low;
  if (candleRange === 0) return false;
  var closePos = (bar.close - bar.low) / candleRange;
  if (closePos < 0.75) return false;
  return Math.abs(bar.close - bar.open) > avgBody(prevBars);
}

// ── Step 4: Trigger search ───────────────────────────────────────────────────
function detectTrigger(aggs, babyIndex) {
  var checked  = [];
  var maxCheck = Math.min(3, aggs.length - babyIndex - 1);
  for (var offset = 1; offset <= maxCheck; offset++) {
    var idx     = babyIndex + offset;
    var bar     = aggs[idx];
    var prev5   = aggs.slice(Math.max(0, idx - 5), idx);
    var barInfo = { index: idx, date: bar.date, dateLabel: bar.dateLabel,
                    open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume };
    if (isBullishPin(bar)) {
      barInfo.triggerType = 'PIN'; checked.push(barInfo);
      return { found: true, bar: barInfo, checked: checked };
    }
    if (isMarkUp(bar, prev5)) {
      barInfo.triggerType = 'MU'; checked.push(barInfo);
      return { found: true, bar: barInfo, checked: checked };
    }
    barInfo.triggerType = 'NONE'; checked.push(barInfo);
  }
  return { found: false, checked: checked };
}

// ── Scenario classification ──────────────────────────────────────────────────
function classifyScenario(aggs, motherIndex, trendStatus) {
  var mother   = aggs[motherIndex];
  var prevBars = aggs.slice(Math.max(0, motherIndex - 20), motherIndex);
  var swingLow = prevBars.length > 0
    ? prevBars.reduce(function(m, b){ return Math.min(m, b.low); }, Infinity) : null;
  var prevRange20 = prevBars.length > 0
    ? prevBars.reduce(function(s, b){ return s + (b.high - b.low); }, 0) / prevBars.length : null;
  var highestHigh = prevBars.length > 0
    ? prevBars.reduce(function(m, b){ return Math.max(m, b.high); }, -Infinity) : null;
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

  for (var mi = aggs.length - 1; mi >= 5; mi--) {
    var prev5   = aggs.slice(mi - 5, mi);
    var bar     = aggs[mi];
    var barRange= bar.high - bar.low;
    var barBody = Math.abs(bar.close - bar.open);
    var avgR    = avgRange(prev5);
    var avgB    = avgBody(prev5);
    if (barRange > avgR || barBody > avgB) {
      var babyCandidate = (mi + 1 < aggs.length) ? aggs[mi + 1] : null;
      if (!babyCandidate) continue;
      var babyInside = babyCandidate.high <= bar.high && babyCandidate.low >= bar.low;
      if (!babyInside) continue;
      var babyObj = { index: mi+1, date: babyCandidate.date, dateLabel: babyCandidate.dateLabel,
                      high: babyCandidate.high, low: babyCandidate.low,
                      open: babyCandidate.open, close: babyCandidate.close,
                      volume: babyCandidate.volume, inside: true };
      var trigResult = detectTrigger(aggs, mi + 1);
      var motherObj  = { index: mi, date: bar.date, dateLabel: bar.dateLabel,
                         open: bar.open, high: bar.high, low: bar.low, close: bar.close,
                         volume: bar.volume, range: barRange, body: barBody,
                         avgPrev5Range: avgR, avgPrev5Body: avgB };
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
  }

  if (!mother) return empty('No Mother Bar found', 'No Pattern');
  if (!baby)   return empty('No Baby Bar after Mother', 'No Pattern');
  audit.steps.mother = mother;
  audit.steps.baby   = baby;
  if (!trigger) {
    return { triggered: false, result: 'Expired', symbol: symbol,
             motherBar: mother, babyBar: baby,
             audit: Object.assign({ finalReason: 'Trigger not found within 3 bars' }, audit) };
  }

  var latestAgg = aggs[aggs.length - 1];
  var age       = (aggs.length - 1) - trigger.index;
  audit.steps.mother   = mother;
  audit.steps.baby     = baby;
  audit.steps.trigger  = trigger;
  audit.steps.scenario = scenario;
  audit.trendStatus    = trendStatus || 'Unknown';

  // Store last 10 agg bars for mini chart (with role tags)
  var chartStart = Math.max(0, aggs.length - 10);
  var chartBars  = aggs.slice(chartStart).map(function(b, ci) {
    var absIdx = chartStart + ci;
    var role = absIdx === mother.index ? 'mother'
             : absIdx === baby.index   ? 'baby'
             : absIdx === trigger.index ? 'trigger'
             : 'normal';
    return Object.assign({}, b, { role: role });
  });

  return {
    triggered:   true,
    result:      'Triggered',
    symbol:      symbol,
    triggerType: trigger.triggerType,
    scenario:    scenario,
    volume:      latestAgg.volume,
    age:         age,
    pattern:     'M\u2192B\u2192' + trigger.triggerType,
    motherBar:   mother,
    babyBar:     baby,
    triggerBar:  trigger,
    chartBars:   chartBars,
    audit:       Object.assign({ finalReason: 'Force Strike Triggered' }, audit),
  };
}

// ── Audit TXT formatter ──────────────────────────────────────────────────────
export function formatAuditTxt(allResults, generatedAt, stoppedEarly) {
  var totalScanned = allResults.length;
  var triggered    = allResults.filter(function(r){ return r.triggered; });
  var displayed    = Math.min(triggered.length, 5);
  var lines = [];

  lines.push('Force Strike Audit Export');
  lines.push('');
  lines.push('Generated: ' + generatedAt);
  lines.push('Total Stocks Scanned: ' + totalScanned);
  lines.push('Triggered Count: ' + triggered.length);
  lines.push('Displayed Count: ' + displayed);
  lines.push('Stopped Early: ' + (stoppedEarly ? 'Yes (5 found)' : 'No'));

  allResults.forEach(function(r) {
    lines.push('');
    lines.push('================================================');
    lines.push('');
    lines.push('Ticker: ' + r.symbol);
    lines.push('Volume: ' + (r.volume != null ? Number(r.volume).toLocaleString() : 'N/A'));
    lines.push('Result: ' + r.result);

    // Summary for triggered stocks
    if (r.triggered) {
      lines.push('');
      lines.push('Summary:');
      lines.push('  Pattern:      ' + (r.pattern || '—'));
      lines.push('  Mother Bar:   ' + (r.motherBar  ? fmtDate(r.motherBar.date1  || r.motherBar.date) : '—'));
      lines.push('  Baby Bar:     ' + (r.babyBar    ? fmtDate(r.babyBar.date1    || r.babyBar.date)   : '—'));
      lines.push('  Trigger:      ' + (r.triggerBar ? fmtDate(r.triggerBar.date1 || r.triggerBar.date): '—'));
      lines.push('  Trigger Type: ' + (r.triggerType || '—'));
      lines.push('  Scenario:     ' + (r.scenario   || '—'));
      lines.push('  Signal Age:   ' + (r.age != null ? r.age + ' bars since trigger' : '—'));
    }

    var a = r.audit || {};
    var s = a.steps  || {};

    if (s.mother) {
      var m = s.mother;
      lines.push('');
      lines.push('------------------------------------------------');
      lines.push('Mother Bar');
      lines.push('');
      lines.push('Index:  ' + m.index);
      lines.push('Date:   ' + fmtDate(m.date1 || m.date));
      lines.push('Open:   ' + (m.open  != null ? m.open.toFixed(2)  : 'N/A'));
      lines.push('High:   ' + (m.high  != null ? m.high.toFixed(2)  : 'N/A'));
      lines.push('Low:    ' + (m.low   != null ? m.low.toFixed(2)   : 'N/A'));
      lines.push('Close:  ' + (m.close != null ? m.close.toFixed(2) : 'N/A'));
      lines.push('Volume: ' + (m.volume != null ? Number(m.volume).toLocaleString() : 'N/A'));
      lines.push('');
      lines.push('Range: ' + (m.range != null ? m.range.toFixed(4) : 'N/A'));
      lines.push('Body:  ' + (m.body  != null ? m.body.toFixed(4)  : 'N/A'));
      lines.push('');
      lines.push('Average Previous 5 Range: ' + (m.avgPrev5Range != null ? m.avgPrev5Range.toFixed(4) : 'N/A'));
      lines.push('Average Previous 5 Body:  ' + (m.avgPrev5Body  != null ? m.avgPrev5Body.toFixed(4)  : 'N/A'));
    }

    if (s.baby) {
      var b = s.baby;
      lines.push('');
      lines.push('------------------------------------------------');
      lines.push('Baby Bar');
      lines.push('');
      lines.push('Index:  ' + b.index);
      lines.push('Date:   ' + fmtDate(b.date1 || b.date));
      lines.push('High:   ' + (b.high != null ? b.high.toFixed(2) : 'N/A'));
      lines.push('Low:    ' + (b.low  != null ? b.low.toFixed(2)  : 'N/A'));
      lines.push('Inside Mother: ' + (b.inside ? 'true' : 'false'));
    }

    lines.push('');
    lines.push('------------------------------------------------');
    lines.push('Trigger Search');
    lines.push('');
    var checked = s.triggerChecked || [];
    lines.push('Bars Checked: ' + checked.length);
    checked.forEach(function(c, ci) {
      lines.push('');
      lines.push('Bar ' + (ci + 1) + ':');
      lines.push('  Index:        ' + c.index);
      lines.push('  Date:         ' + fmtDate(c.date1 || c.date));
      lines.push('  Open:         ' + (c.open  != null ? c.open.toFixed(2)  : 'N/A'));
      lines.push('  High:         ' + (c.high  != null ? c.high.toFixed(2)  : 'N/A'));
      lines.push('  Low:          ' + (c.low   != null ? c.low.toFixed(2)   : 'N/A'));
      lines.push('  Close:        ' + (c.close != null ? c.close.toFixed(2) : 'N/A'));
      lines.push('  Trigger Type: ' + (c.triggerType || 'NONE'));
    });
    lines.push('');
    lines.push('Trigger Found: ' + (r.triggered ? 'true' : 'false'));
    lines.push('Trigger Type:  ' + (r.triggerType || 'NONE'));
    if (r.triggerBar) {
      lines.push('Trigger Date:  ' + fmtDate(r.triggerBar.date1 || r.triggerBar.date));
    }

    lines.push('');
    lines.push('------------------------------------------------');
    lines.push('Scenario');
    lines.push('');
    lines.push('Trend Status: ' + (a.trendStatus || 'Unknown'));
    lines.push('Scenario:     ' + (s.scenario || 'None'));

    lines.push('');
    lines.push('------------------------------------------------');
    lines.push('Final Decision');
    lines.push('');
    var inTop5 = r.triggered && triggered.indexOf(r) < 5;
    lines.push('Included In Top 5: ' + (inTop5 ? 'true' : 'false'));
    lines.push('Reason: ' + (a.finalReason || 'N/A'));
  });

  return lines.join('\n');
}
