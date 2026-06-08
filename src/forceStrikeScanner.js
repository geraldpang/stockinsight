// forceStrikeScanner.js
// Force Strike Pattern Scanner — deterministic, rule-based, zero AI.
// All logic lives here. Do not mix with RBA, Screener, or Trend engine.

// ── Step 1: Build 2-day aggregated bars ────────────────────────────────────
export function buildAggregateBars(dailyCandles) {
  // dailyCandles: array of { date, open, high, low, close, volume } oldest-first
  var aggs = [];
  for (var i = 0; i + 1 < dailyCandles.length; i += 2) {
    var d1 = dailyCandles[i];
    var d2 = dailyCandles[i + 1];
    aggs.push({
      date:   d1.date + '/' + d2.date,
      date1:  d1.date,
      date2:  d2.date,
      open:   d1.open,
      high:   Math.max(d1.high,  d2.high),
      low:    Math.min(d1.low,   d2.low),
      close:  d2.close,
      volume: (d1.volume || 0) + (d2.volume || 0),
    });
  }
  return aggs;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function avgRange(bars) {
  if (!bars || bars.length === 0) return 0;
  return bars.reduce(function(s, b) { return s + (b.high - b.low); }, 0) / bars.length;
}
function avgBody(bars) {
  if (!bars || bars.length === 0) return 0;
  return bars.reduce(function(s, b) { return s + Math.abs(b.close - b.open); }, 0) / bars.length;
}

// ── Step 2: Detect Mother Bar ────────────────────────────────────────────────
function detectMother(aggs) {
  // Need at least 6 bars (5 lookback + 1 candidate)
  for (var i = 5; i < aggs.length; i++) {
    var bar     = aggs[i];
    var prev5   = aggs.slice(i - 5, i);
    var barRange= bar.high - bar.low;
    var barBody = Math.abs(bar.close - bar.open);
    var avgR    = avgRange(prev5);
    var avgB    = avgBody(prev5);
    if (barRange > avgR || barBody > avgB) {
      return {
        index:      i,
        date:       bar.date,
        open:       bar.open,
        high:       bar.high,
        low:        bar.low,
        close:      bar.close,
        volume:     bar.volume,
        range:      barRange,
        body:       barBody,
        avgPrev5Range: avgR,
        avgPrev5Body:  avgB,
      };
    }
  }
  return null;
}

// ── Step 3: Detect Baby Bar ──────────────────────────────────────────────────
function detectBaby(aggs, motherIndex) {
  var bi = motherIndex + 1;
  if (bi >= aggs.length) return null;
  var bar    = aggs[bi];
  var mother = aggs[motherIndex];
  var inside = bar.high <= mother.high && bar.low >= mother.low;
  return {
    index:    bi,
    date:     bar.date,
    high:     bar.high,
    low:      bar.low,
    close:    bar.close,
    open:     bar.open,
    volume:   bar.volume,
    inside:   inside,
  };
}

// ── Step 4: Trigger detection ────────────────────────────────────────────────
function isBullishPin(bar, prevBars) {
  if (bar.close <= bar.open) return false;               // must be bullish close
  var body      = Math.abs(bar.close - bar.open);
  var lowerWick = Math.min(bar.open, bar.close) - bar.low;
  var midpoint  = bar.low + (bar.high - bar.low) / 2;
  return lowerWick >= 2 * body && bar.close > midpoint;
}

function isMarkUp(bar, prevBars) {
  if (bar.close <= bar.open) return false;               // bullish candle
  var candleRange = bar.high - bar.low;
  if (candleRange === 0) return false;
  var closePos    = (bar.close - bar.low) / candleRange; // close in upper 25%
  if (closePos < 0.75) return false;
  var body        = Math.abs(bar.close - bar.open);
  var avgB        = avgBody(prevBars);
  return body > avgB;
}

function detectTrigger(aggs, babyIndex) {
  var checked  = [];
  var maxCheck = Math.min(3, aggs.length - babyIndex - 1);
  for (var offset = 1; offset <= maxCheck; offset++) {
    var idx     = babyIndex + offset;
    var bar     = aggs[idx];
    var prev5   = aggs.slice(Math.max(0, idx - 5), idx);
    var barInfo = {
      index:  idx,
      date:   bar.date,
      open:   bar.open,
      high:   bar.high,
      low:    bar.low,
      close:  bar.close,
      volume: bar.volume,
    };

    if (isBullishPin(bar, prev5)) {
      barInfo.triggerType = 'PIN';
      checked.push(barInfo);
      return { found: true, bar: barInfo, checked: checked };
    }
    if (isMarkUp(bar, prev5)) {
      barInfo.triggerType = 'MU';
      checked.push(barInfo);
      return { found: true, bar: barInfo, checked: checked };
    }
    barInfo.triggerType = 'NONE';
    checked.push(barInfo);
  }
  return { found: false, checked: checked };
}

// ── Scenario classification ──────────────────────────────────────────────────
function classifyScenario(aggs, motherIndex, trendStatus) {
  var mother    = aggs[motherIndex];
  var prevBars  = aggs.slice(Math.max(0, motherIndex - 20), motherIndex);

  // Swing low = lowest low in previous 20 bars
  var swingLow = prevBars.length > 0
    ? prevBars.reduce(function(m, b){ return Math.min(m, b.low); }, Infinity)
    : null;

  // Shakeout Reversal: price flushed below support, Mother reclaims it
  // Approximate: previous range was narrow (sideways) and Mother low < swing low and Mother close > swing low
  var prevRange20 = prevBars.length > 0
    ? prevBars.reduce(function(s, b){ return s + (b.high - b.low); }, 0) / prevBars.length
    : null;
  var highestHigh = prevBars.length > 0
    ? prevBars.reduce(function(m, b){ return Math.max(m, b.high); }, -Infinity)
    : null;
  var sideways = prevRange20 && highestHigh && (highestHigh - swingLow) < prevRange20 * 5;

  if (sideways && swingLow && mother.low < swingLow && mother.close >= swingLow) {
    return 'Shakeout Reversal';
  }

  // Recovery Reversal: price broke below prev swing low, Mother reclaimed it
  if (swingLow && mother.low < swingLow && mother.close >= swingLow) {
    return 'Recovery Reversal';
  }

  // Trend Pullback: existing NervousGeek Uptrend/Strong Uptrend
  var ts = (trendStatus || '').toLowerCase();
  if (ts === 'uptrend' || ts === 'strong uptrend') {
    return 'Trend Pullback';
  }

  return 'None';
}

// ── Main export: scanForceStrike ─────────────────────────────────────────────
export function scanForceStrike(symbol, dailyCandles, trendStatus) {
  var audit = { symbol: symbol, steps: {} };
  var empty = function(reason, result) {
    return { triggered: false, result: result || 'Invalid', symbol: symbol,
             audit: Object.assign({ finalReason: reason }, audit) };
  };

  // Need minimum 15 daily candles to build 7+ agg bars
  if (!dailyCandles || dailyCandles.length < 14) {
    return empty('Not enough candles (need 14+)', 'No Pattern');
  }

  var aggs = buildAggregateBars(dailyCandles);
  audit.steps.aggCount = aggs.length;

  if (aggs.length < 7) {
    return empty('Not enough aggregated bars (need 7+)', 'No Pattern');
  }

  // Work from the LAST Mother Bar found (most recent setup)
  // Scan from most recent backwards to find the latest valid Mother
  var mother = null;
  var baby   = null;
  var trigger= null;
  var scenario = 'None';

  // Find the last Mother bar (scan from end backwards)
  for (var mi = aggs.length - 1; mi >= 5; mi--) {
    var prev5   = aggs.slice(mi - 5, mi);
    var bar     = aggs[mi];
    var barRange= bar.high - bar.low;
    var barBody = Math.abs(bar.close - bar.open);
    var avgR    = avgRange(prev5);
    var avgB    = avgBody(prev5);

    if (barRange > avgR || barBody > avgB) {
      // Try Baby
      var babyCandidate = detectBaby(aggs, mi);
      if (!babyCandidate || !babyCandidate.inside) continue;

      // Try Trigger
      var trigResult = detectTrigger(aggs, babyCandidate.index);

      if (trigResult.found) {
        mother   = { index: mi, date: bar.date, open: bar.open, high: bar.high,
                     low: bar.low, close: bar.close, volume: bar.volume,
                     range: barRange, body: barBody,
                     avgPrev5Range: avgR, avgPrev5Body: avgB };
        baby     = babyCandidate;
        trigger  = trigResult.bar;
        audit.steps.triggerChecked = trigResult.checked;
        scenario = classifyScenario(aggs, mi, trendStatus);
        break;
      } else {
        audit.steps.triggerChecked = trigResult.checked;
        // Record the most recent expired pattern for audit
        mother = { index: mi, date: bar.date, open: bar.open, high: bar.high,
                   low: bar.low, close: bar.close, volume: bar.volume,
                   range: barRange, body: barBody,
                   avgPrev5Range: avgR, avgPrev5Body: avgB };
        baby   = babyCandidate;
        // Continue scanning for an older triggered pattern
      }
    }
  }

  if (!mother) {
    return empty('No Mother Bar found', 'No Pattern');
  }
  if (!baby) {
    return empty('No Baby Bar after Mother', 'No Pattern');
  }
  if (!trigger) {
    audit.steps.mother  = mother;
    audit.steps.baby    = baby;
    return { triggered: false, result: 'Expired', symbol: symbol,
             motherBar: mother, babyBar: baby,
             audit: Object.assign({ finalReason: 'Trigger not found within 3 bars' }, audit) };
  }

  var latestAgg = aggs[aggs.length - 1];
  var age       = (aggs.length - 1) - trigger.index;
  var volume    = latestAgg.volume;

  audit.steps.mother  = mother;
  audit.steps.baby    = baby;
  audit.steps.trigger = trigger;
  audit.steps.scenario = scenario;
  audit.trendStatus   = trendStatus || 'Unknown';

  return {
    triggered:   true,
    result:      'Triggered',
    symbol:      symbol,
    triggerType: trigger.triggerType,
    scenario:    scenario,
    volume:      volume,
    age:         age,
    pattern:     'M\u2192B\u2192' + trigger.triggerType,
    motherBar:   mother,
    babyBar:     baby,
    triggerBar:  trigger,
    audit:       Object.assign({ finalReason: 'Force Strike Triggered' }, audit),
  };
}

// ── Audit TXT formatter ──────────────────────────────────────────────────────
export function formatAuditTxt(allResults, generatedAt, stoppedEarly) {
  var totalScanned  = allResults.length;
  var triggered     = allResults.filter(function(r){ return r.triggered; });
  var displayed     = Math.min(triggered.length, 5);
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
    lines.push('Volume: ' + (r.volume != null ? r.volume.toLocaleString() : 'N/A'));
    lines.push('Result: ' + r.result);

    var a = r.audit || {};
    var s = a.steps || {};

    if (s.mother) {
      var m = s.mother;
      lines.push('');
      lines.push('------------------------------------------------');
      lines.push('Mother Bar');
      lines.push('');
      lines.push('Index:  ' + m.index);
      lines.push('Date:   ' + m.date);
      lines.push('Open:   ' + (m.open  != null ? m.open.toFixed(2)  : 'N/A'));
      lines.push('High:   ' + (m.high  != null ? m.high.toFixed(2)  : 'N/A'));
      lines.push('Low:    ' + (m.low   != null ? m.low.toFixed(2)   : 'N/A'));
      lines.push('Close:  ' + (m.close != null ? m.close.toFixed(2) : 'N/A'));
      lines.push('Volume: ' + (m.volume != null ? m.volume.toLocaleString() : 'N/A'));
      lines.push('');
      lines.push('Range: ' + (m.range != null ? m.range.toFixed(4) : 'N/A'));
      lines.push('Body:  ' + (m.body  != null ? m.body.toFixed(4)  : 'N/A'));
      lines.push('');
      lines.push('Average Previous 5 Range: ' + (m.avgPrev5Range != null ? m.avgPrev5Range.toFixed(4) : 'N/A'));
      lines.push('Average Previous 5 Body:  ' + (m.avgPrev5Body  != null ? m.avgPrev5Body.toFixed(4)  : 'N/A'));
    } else {
      lines.push('');
      lines.push('------------------------------------------------');
      lines.push('Mother Bar: Not Found');
    }

    if (s.baby) {
      var b = s.baby;
      lines.push('');
      lines.push('------------------------------------------------');
      lines.push('Baby Bar');
      lines.push('');
      lines.push('Index:  ' + b.index);
      lines.push('Date:   ' + b.date);
      lines.push('High:   ' + (b.high != null ? b.high.toFixed(2) : 'N/A'));
      lines.push('Low:    ' + (b.low  != null ? b.low.toFixed(2)  : 'N/A'));
      lines.push('');
      lines.push('Inside Mother: ' + (b.inside ? 'true' : 'false'));
    } else {
      lines.push('');
      lines.push('------------------------------------------------');
      lines.push('Baby Bar: Not Found');
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
      lines.push('  Index:  ' + c.index);
      lines.push('  Date:   ' + c.date);
      lines.push('  Open:   ' + (c.open  != null ? c.open.toFixed(2)  : 'N/A'));
      lines.push('  High:   ' + (c.high  != null ? c.high.toFixed(2)  : 'N/A'));
      lines.push('  Low:    ' + (c.low   != null ? c.low.toFixed(2)   : 'N/A'));
      lines.push('  Close:  ' + (c.close != null ? c.close.toFixed(2) : 'N/A'));
      lines.push('  Trigger Type: ' + (c.triggerType || 'NONE'));
    });
    lines.push('');
    lines.push('Trigger Found: ' + (r.triggered ? 'true' : 'false'));
    lines.push('Trigger Type: ' + (r.triggerType || 'NONE'));
    if (r.triggerBar) {
      lines.push('Trigger Index: ' + r.triggerBar.index);
      lines.push('Trigger Date:  ' + r.triggerBar.date);
    }

    lines.push('');
    lines.push('------------------------------------------------');
    lines.push('Scenario');
    lines.push('');
    lines.push('Trend Status: ' + (a.trendStatus || 'Unknown'));
    lines.push('Scenario: '     + (s.scenario || 'None'));

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
