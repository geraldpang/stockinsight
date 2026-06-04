/**
 * ruleBasedAnalytics.js
 * NervousGeek / StockInsight
 *
 * Rule-based technical commentary derived from the 4 existing technical factors:
 *   Trend · Momentum · Reversal Watch · Smart Money Flow
 *
 * RULES:
 *  - Do NOT recalculate any technical scores here.
 *  - Use the pre-computed snapshot from calculateTechnicalSignalSnapshot() only.
 *  - Internal scores are permitted in debugScores only.
 *  - Public commentary fields must NOT contain numeric scores.
 *  - No financial advice. No "buy" or "sell" language.
 *  - Output must be suitable for sharing publicly on Twitter/X.
 */

// ─── 1. classifyTrend ────────────────────────────────────────────────────────

/**
 * Maps a trend status string to an internal category key.
 * @param {string|null} status - e.g. "Strong Uptrend"
 * @returns {string} category key
 */
export function classifyTrend(status) {
  if (!status) return 'unknownTrend';
  switch (status) {
    case 'Strong Uptrend':   return 'strongUptrend';
    case 'Uptrend':          return 'uptrend';
    case 'Sideways':         return 'sideways';
    case 'Downtrend':        return 'downtrend';
    case 'Strong Downtrend': return 'strongDowntrend';
    default:                 return 'unknownTrend';
  }
}

// ─── 2. classifyMomentum ─────────────────────────────────────────────────────

/**
 * Maps a momentum status string to an internal category key.
 * Supports both Momentum Profile labels and legacy daily momentum labels.
 * @param {string|null} status - e.g. "Momentum Continuation" or "Building"
 * @returns {string} category key
 */
export function classifyMomentum(status) {
  if (!status) return 'unknownMomentum';
  // Momentum Profile labels (priority)
  switch (status) {
    case 'Momentum Continuation':      return 'strongMomentum';
    case 'Early Recovery Attempt':     return 'buildingMomentum';
    case 'Waiting for Daily Trigger':  return 'neutralMomentum';
    case 'Pullback in Larger Momentum':return 'neutralMomentum';
    case 'Weak Weekly Bounce':         return 'fadingMomentum';
    case 'Bearish Momentum':           return 'weakMomentum';
    case 'No Clear Momentum Profile':  return 'neutralMomentum';
    case 'Not Enough Data':            return 'unknownMomentum';
    // Legacy daily momentum labels
    case 'Strong':   return 'strongMomentum';
    case 'Building': return 'buildingMomentum';
    case 'Neutral':  return 'neutralMomentum';
    case 'Fading':   return 'fadingMomentum';
    case 'Weak':     return 'weakMomentum';
    default:         return 'unknownMomentum';
  }
}

// ─── 3. classifyReversal ─────────────────────────────────────────────────────

/**
 * Maps a reversal status string to an internal category key.
 * Accepts reversalDecision.outcome or the legacy status string.
 * @param {string|null} status - e.g. "Bullish Reversal Confirmed"
 * @returns {string} category key
 */
export function classifyReversal(status) {
  if (!status) return 'noReversal';
  if (
    status === 'Bullish Reversal Confirmed'  ||
    status === 'Bullish Reversal Confirming' ||
    status === 'Bullish Reversal Triggered'
  ) return 'confirmedBullishReversal';

  if (
    status === 'Bullish Reversal Forming' ||
    status === 'Bullish Reversal Watch'   ||
    status === 'Bullish Reversal Spark'   ||
    status === 'Bullish Reversal Setup'
  ) return 'earlyBullishReversal';

  if (status === 'Mixed Reversal Signals') return 'mixedReversal';

  if (status.indexOf('Bearish') === 0) return 'bearishReversal';

  if (status === 'No Clear Reversal' || status === 'Not Enough Data') return 'noReversal';

  return 'noReversal';
}

// ─── 4. classifySmartMoney ───────────────────────────────────────────────────

/**
 * Maps smart money status to category + derives direction.
 * Priority: smartMoneyDecision.baseStatus → smartMoneyDecision.outcome → status string.
 * @param {string|null} status  - snapshot.smartMoneyFlow.status
 * @param {object|null} smf     - snapshot.smartMoneyFlow object
 * @returns {{ category: string, direction: string }}
 */
export function classifySmartMoney(status, smf) {
  var smd = smf && smf.smartMoneyDecision ? smf.smartMoneyDecision : null;
  var baseStatus  = smd && smd.baseStatus  ? smd.baseStatus  : null;
  var outcome     = smd && smd.outcome     ? smd.outcome     : null;
  var dailyPrefix = smd && smd.dailyPrefix ? smd.dailyPrefix : null;
  // Use baseStatus as primary classification source; fall back through outcome → status
  var classifyWith = baseStatus || outcome || status;
  return {
    category:  _smfCategory(classifyWith, baseStatus),
    direction: _smfDirection(classifyWith, smf, dailyPrefix),
  };
}

function _smfCategory(status, baseStatus) {
  if (!status) return 'neutralSmartMoney';

  // ── New base statuses ─────────────────────────────────────────────────────
  if (status === 'Strong Accumulation')            return 'strongSmartMoney';
  if (status === 'Steady Accumulation')            return 'positiveSmartMoney';
  if (status === 'Long-Term Accumulation')         return 'positiveSmartMoney';
  if (status === 'Early Accumulation')             return 'earlySmartMoney';
  if (status === 'Mixed Flow')                     return 'neutralSmartMoney';
  if (status === 'Cooling Accumulation')           return 'positiveSmartMoney';
  if (status === 'Short-Term Flow Spike')          return 'temporarySmartMoney';
  if (status === 'Short-Term Flow Watch')          return 'temporarySmartMoney';
  if (status === 'No Sustained Flow')              return 'neutralSmartMoney';

  // ── Combined final statuses — classify by base, not prefix ────────────────
  // Strong Accumulation base
  if (status.indexOf('Strong Accumulation') !== -1)   return 'strongSmartMoney';
  // Steady Accumulation base
  if (status.indexOf('Steady Accumulation') !== -1)   return 'positiveSmartMoney';
  // Long-Term Accumulation base
  if (status.indexOf('Long-Term Accumulation') !== -1) return 'positiveSmartMoney';
  // Early Accumulation base
  if (status.indexOf('Early Accumulation') !== -1)    return 'earlySmartMoney';
  // Mixed Flow base
  if (status.indexOf('Mixed Flow') !== -1)            return 'neutralSmartMoney';
  // Cooling Accumulation base
  if (status.indexOf('Cooling Accumulation') !== -1)  return 'positiveSmartMoney';
  // Short-Term Flow base
  if (status.indexOf('Short-Term Flow Spike') !== -1) return 'temporarySmartMoney';
  if (status.indexOf('Short-Term Flow Watch') !== -1) return 'temporarySmartMoney';
  // No Sustained Flow (including "Daily Spike but No Sustained Flow")
  if (status.indexOf('No Sustained Flow') !== -1)     return 'neutralSmartMoney';
  if (status === 'No Clear Signal')                    return 'neutralSmartMoney';
  if (status === 'Not Enough Data')                    return 'neutralSmartMoney';

  // ── Legacy statuses ───────────────────────────────────────────────────────
  if (status === 'Strong Multi-Timeframe Flow')  return 'strongSmartMoney';
  if (status === 'Accumulation Trend Positive')  return 'positiveSmartMoney';
  if (status === 'Constructive but Cooling')     return 'positiveSmartMoney';
  if (status === 'Short-Term Spike')             return 'temporarySmartMoney';
  if (status === 'No Clear Flow')                return 'neutralSmartMoney';

  // Negative indicators
  if (status.indexOf('Distribution')   !== -1 ||
      status.indexOf('Negative')        !== -1 ||
      status.indexOf('Deteriorating')   !== -1)  return 'negativeSmartMoney';
  return 'neutralSmartMoney';
}

function _smfDirection(status, smf, dailyPrefix) {
  // Primary: derive from sub-scores when available (most reliable)
  if (smf) {
    var today    = smf.todayActivityScore         != null ? smf.todayActivityScore         : null;
    var fiveDay  = smf.fiveDayFlowScore           != null ? smf.fiveDayFlowScore           : null;
    var thirtyDay= smf.thirtyDayAccumulationScore != null ? smf.thirtyDayAccumulationScore : null;

    if (today !== null && fiveDay !== null && thirtyDay !== null) {
      if (today > fiveDay || fiveDay > thirtyDay) return 'improving';
      if (today < fiveDay && fiveDay < thirtyDay) {
        if (today < 20 && fiveDay < 30) return 'deteriorating';
        return 'cooling';
      }
      return 'stable';
    }
    if (today !== null && fiveDay !== null) {
      if (today > fiveDay)           return 'improving';
      if (today < fiveDay * 0.7)     return 'cooling';
      return 'stable';
    }
  }

  // Secondary: use dailyPrefix from smartMoneyDecision
  if (dailyPrefix) {
    if (dailyPrefix === 'Daily Spike')   return 'improving';
    if (dailyPrefix === 'Daily Support') return 'stable';
    if (dailyPrefix === 'Quiet Day') {
      // Quiet day + cooling/long-term base = cooling; otherwise stable
      if (status && (status.indexOf('Cooling Accumulation') !== -1 || status.indexOf('Long-Term Accumulation') !== -1))
        return 'cooling';
      return 'stable';
    }
    return 'unknown';
  }

  // Fallback: infer from status text
  if (!status) return 'unknown';
  if (status === 'Strong Multi-Timeframe Flow')  return 'stable';
  if (status === 'Accumulation Trend Positive')  return 'stable';
  if (status === 'Early Accumulation')           return 'improving';
  if (status === 'Constructive but Cooling')     return 'cooling';
  if (status === 'Short-Term Spike')             return 'improving';
  if (status.indexOf('Daily Spike') === 0)       return 'improving';
  if (status.indexOf('Daily Support') === 0)     return 'stable';
  if (status.indexOf('Cooling Accumulation') !== -1) return 'cooling';
  return 'unknown';
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function _cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Shared price extractor — tolerates multiple snapshot shapes
function _extractPrice(snapshot) {
  if (!snapshot) return null;
  if (snapshot.meta && snapshot.meta.price != null) return snapshot.meta.price;
  if (snapshot.close         != null) return snapshot.close;
  if (snapshot.currentPrice  != null) return snapshot.currentPrice;
  if (snapshot.price         != null) return snapshot.price;
  return null;
}

function _trendLabel(t) {
  var map = {
    strongUptrend:   'strong and rising',
    uptrend:         'rising',
    sideways:        'sideways',
    downtrend:       'declining',
    strongDowntrend: 'in a strong decline',
    unknownTrend:    'unclear',
  };
  return map[t] || 'unclear';
}

function _trendDescPhrase(t) {
  var map = {
    strongUptrend:   'a strong uptrend',
    uptrend:         'an uptrend',
    sideways:        'a sideways range',
    downtrend:       'a downtrend',
    strongDowntrend: 'a strong downtrend',
    unknownTrend:    'an unclear trend',
  };
  return map[t] || 'an unclear trend';
}

function _momLabel(m) {
  var map = {
    strongMomentum:   'strong',
    buildingMomentum: 'building',
    neutralMomentum:  'neutral',
    fadingMomentum:   'fading',
    weakMomentum:     'weak',
    unknownMomentum:  'unclear',
  };
  return map[m] || 'unclear';
}

function _revPhrase(r) {
  var map = {
    confirmedBullishReversal: 'a confirmed bullish reversal is in play',
    earlyBullishReversal:     'early bullish reversal signals are forming',
    mixedReversal:            'reversal signals are mixed',
    bearishReversal:          'bearish reversal signals are present',
    noReversal:               'no clear reversal signal is present',
  };
  return map[r] || 'no clear reversal signal is present';
}

// ─── Smart Money public sentence (no scores) ─────────────────────────────────

function _buildSmfLine(smCategory, smDirection, smfStatus) {
  var dirPhrases = {
    improving:    'and activity is picking up',
    stable:       'and holding steady',
    cooling:      'though the pace of accumulation is beginning to ease',
    deteriorating:'and the picture has been deteriorating recently',
    unknown:      '',
  };
  var dirPhrase = dirPhrases[smDirection] || '';

  switch (smCategory) {
    case 'strongSmartMoney':
      return 'Smart money flow is strong, with accumulation supported across key timeframes' + (dirPhrase ? ' ' + dirPhrase : '') + '.';
    case 'positiveSmartMoney':
      if (smfStatus && smfStatus.indexOf('Steady Accumulation') !== -1)
        return 'Smart money flow remains positive, with steady accumulation support' + (dirPhrase ? ' ' + dirPhrase : '') + '.';
      if (smfStatus && smfStatus.indexOf('Long-Term Accumulation') !== -1)
        return 'Smart money flow remains positive on the longer timeframe, although short-term flow has cooled' + (dirPhrase && dirPhrase !== 'though the pace of accumulation is beginning to ease' ? ' ' + dirPhrase : '') + '.';
      if (smfStatus && smfStatus.indexOf('Cooling Accumulation') !== -1)
        return 'Smart money flow remains constructive, but recent flow is cooling.';
      if (smfStatus === 'Constructive but Cooling')
        return 'Smart money flow remains constructive' + (dirPhrase ? ', ' + dirPhrase : '') + '.';
      return 'Smart money flow is positive ' + dirPhrase + '.';
    case 'earlySmartMoney':
      return 'Smart money flow is showing early accumulation, with recent flow starting to support the setup' + (dirPhrase ? ' ' + dirPhrase : '') + '.';
    case 'temporarySmartMoney':
      return 'Smart money activity is short-term and has not yet developed into sustained accumulation.';
    case 'neutralSmartMoney':
      return 'Smart money flow is neutral, with no sustained accumulation signal yet.';
    case 'negativeSmartMoney':
      return 'Smart money flow is showing signs of distribution or reduced institutional interest.';
    default:
      return 'Smart money flow does not show a clear directional signal at this stage.';
  }
}

// ─── Technical indicators public sentence (no scores) ────────────────────────

function _buildTechLine(trend, momentum, reversal) {
  return (
    'The trend is ' + _trendLabel(trend) +
    ', momentum is ' + _momLabel(momentum) +
    ', and ' + _revPhrase(reversal) + '.'
  );
}

// ─── Scenario matching ────────────────────────────────────────────────────────

function _matchScenario(trend, momentum, reversal, smCategory, smDirection) {
  var isUptrend      = trend === 'strongUptrend' || trend === 'uptrend';
  var isDowntrend    = trend === 'downtrend'     || trend === 'strongDowntrend';
  var isSideways     = trend === 'sideways'      || trend === 'unknownTrend';

  var isStrongMom    = momentum === 'strongMomentum'   || momentum === 'buildingMomentum';
  var isWeakMom      = momentum === 'fadingMomentum'   || momentum === 'weakMomentum';
  var isNeutralMom   = momentum === 'neutralMomentum'  || momentum === 'unknownMomentum';

  var isConfirmedBull = reversal === 'confirmedBullishReversal';
  var isEarlyBull     = reversal === 'earlyBullishReversal';
  var isBullReversal  = isConfirmedBull || isEarlyBull;
  var isMixed         = reversal === 'mixedReversal';
  var isNoRev         = reversal === 'noReversal';
  var isBearRev       = reversal === 'bearishReversal';
  var isNotBearRev    = !isBearRev;

  var isStrongSM   = smCategory === 'strongSmartMoney';
  var isPositiveSM = smCategory === 'positiveSmartMoney';
  var isEarlySM    = smCategory === 'earlySmartMoney';
  var isTempSM     = smCategory === 'temporarySmartMoney';
  var isNeutralSM  = smCategory === 'neutralSmartMoney';
  var isNegativeSM = smCategory === 'negativeSmartMoney';
  var isCooling    = smDirection === 'cooling' || smDirection === 'deteriorating';
  var isImproving  = smDirection === 'improving' || smDirection === 'stable';

  // ── Check in priority order (strongest → weakest) ──

  // 1. strong_bullish_alignment — all four factors clearly aligned bullish
  //    Differentiated from #2 by requiring strong or positive SM that is improving/stable
  if (isUptrend && isStrongMom && isNotBearRev && (isStrongSM || (isPositiveSM && !isCooling))) {
    return 'strong_bullish_alignment';
  }

  // 10. strong_bearish_alignment — all four clearly aligned bearish
  if (isDowntrend && isWeakMom && isBearRev && isNegativeSM) {
    return 'strong_bearish_alignment';
  }

  // 2. healthy_bullish_trend — uptrend + strong mom, SM not strong but supportive
  if (isUptrend && isStrongMom && isNotBearRev && !isNegativeSM) {
    return 'healthy_bullish_trend';
  }

  // 3. sideways_recovery_setup — sideways base-building with improving signals
  if (isSideways && isStrongMom && isNotBearRev && (isStrongSM || isPositiveSM || isEarlySM) && !isCooling) {
    return 'sideways_recovery_setup';
  }

  // 4. early_bullish_reversal — downtrend but bullish reversal + SM emerging
  if (isDowntrend && isStrongMom && isBullReversal && (isStrongSM || isPositiveSM || isEarlySM)) {
    return 'early_bullish_reversal';
  }

  // 5. risky_bounce — downtrend + momentum without reversal confirmation
  if (isDowntrend && isStrongMom && !isBullReversal) {
    return 'risky_bounce';
  }

  // 6. uptrend_losing_strength — uptrend but momentum deteriorating
  if (isUptrend && (isWeakMom || isNeutralMom) && (isBearRev || isMixed || isNeutralSM || isNegativeSM || isCooling)) {
    return 'uptrend_losing_strength';
  }

  // 8. bearish_watch — sideways with fading momentum + bearish signals
  if ((isSideways || isUptrend) && isWeakMom && (isBearRev || isMixed) && (isNeutralSM || isNegativeSM)) {
    return 'bearish_watch';
  }

  // 9. bearish_control — downtrend, sellers dominant, no bullish signals
  if (isDowntrend && (isNeutralMom || isWeakMom) && (isBearRev || isNoRev) && (isNeutralSM || isNegativeSM)) {
    return 'bearish_control';
  }

  // 7. neutral_no_clear_edge — catch-all
  return 'neutral_no_clear_edge';
}

// ─── Scenario content templates ───────────────────────────────────────────────

function _scenarioContent(scenarioId, ticker, trend, momentum, reversal, smCategory, smDirection) {
  var tDesc = _trendDescPhrase(trend);
  var mDesc = _momLabel(momentum);
  var rDesc = _revPhrase(reversal);
  var t     = ticker;

  switch (scenarioId) {

    case 'strong_bullish_alignment':
      return {
        verdict:   'Strong Bullish — Buyers in Control',
        tone:      'bullish',
        analysis:  t + ' is showing ' + tDesc + ' with momentum that is ' + mDesc + '. ' +
                   _cap(rDesc) + '. Smart money flow is firmly positive, suggesting institutional ' +
                   'interest remains engaged. All four technical factors are broadly aligned in ' +
                   'favour of continued strength.',
        keyLevels: 'Holding above recent support keeps the bullish structure intact. A sustained ' +
                   'move above recent resistance would suggest stronger demand and continuation.',
        summary:   t + ' is presenting a strong technical setup with trend, momentum, reversal, ' +
                   'and smart money all pointing in the same direction. The overall picture ' +
                   'favours continued strength. A pullback toward recent support would be a ' +
                   'constructive reset rather than a cause for concern.',
      };

    case 'healthy_bullish_trend':
      return {
        verdict:   'Bullish — Trend Still Supported',
        tone:      'bullish',
        analysis:  t + ' is holding ' + tDesc + ' with momentum that is ' + mDesc + '. ' +
                   _cap(rDesc) + '. Smart money activity is supportive, though not yet at ' +
                   'peak conviction levels. The technical picture remains broadly positive.',
        keyLevels: 'Holding above recent support keeps the bullish case intact. A move above ' +
                   'recent resistance would confirm the trend is gaining further strength.',
        summary:   t + ' continues to show a well-supported trend with ' + mDesc + ' momentum. ' +
                   'Smart money is engaged but not at its most aggressive, leaving room for ' +
                   'further participation. The path of least resistance remains upward.',
      };

    case 'sideways_recovery_setup':
      return {
        verdict:   'Bullish Watch — Recovery Setup Forming',
        tone:      'cautiously_bullish',
        analysis:  t + ' is consolidating in a sideways range, which should not be read as a ' +
                   'negative. Momentum is ' + mDesc + ', suggesting the base is becoming ' +
                   'constructive rather than distributing. ' + _cap(rDesc) + '. Smart money ' +
                   'flow is appearing beneath the surface, pointing to quiet accumulation.',
        keyLevels: 'A breakout above recent resistance would confirm this sideways action is ' +
                   'base-building rather than distribution. Recent support is the level to watch ' +
                   'on any weakness.',
        summary:   t + ' appears to be stabilising and building a base during its sideways phase. ' +
                   'Improving momentum and constructive smart money flow are encouraging early ' +
                   'signals. A decisive break above recent resistance would mark the next step higher.',
      };

    case 'early_bullish_reversal':
      return {
        verdict:   'Bullish Watch — Early Reversal Attempt',
        tone:      'cautiously_bullish',
        analysis:  t + ' has been in ' + tDesc + ', but bullish reversal signals are now ' +
                   'emerging. Momentum is turning ' + mDesc + ' and smart money flow is beginning ' +
                   'to show positive activity. This is an early-stage setup — confirmation is ' +
                   'still needed before drawing firm conclusions.',
        keyLevels: 'Recent resistance is the critical hurdle to clear. A sustained move above it ' +
                   'with strengthening momentum would reinforce the reversal case. Failure to ' +
                   'hold recent support would invalidate the current setup.',
        summary:   t + ' is showing early signs of a potential trend reversal from ' + tDesc + '. ' +
                   'Momentum is shifting and smart money activity is picking up. The setup is ' +
                   'promising but not yet confirmed — patience and further evidence are warranted.',
      };

    case 'risky_bounce':
      return {
        verdict:   'Neutral — Risky Bounce',
        tone:      'neutral',
        analysis:  t + ' is attempting a bounce within ' + tDesc + '. Momentum has picked up, ' +
                   'but ' + rDesc + '. Smart money support is limited or mixed, suggesting this ' +
                   'move may be short-term in nature without deeper conviction behind it.',
        keyLevels: 'Recent resistance is the key test for this bounce. Failure to clear it ' +
                   'meaningfully would suggest a relief rally rather than a genuine reversal. ' +
                   'Recent support remains the downside reference.',
        summary:   t + ' is bouncing within a broader downtrend, but the evidence for a sustained ' +
                   'reversal is not yet convincing. Momentum improvement is encouraging, but smart ' +
                   'money is not yet providing strong backing. This remains a watch setup, not a confirmed recovery.',
      };

    case 'uptrend_losing_strength':
      return {
        verdict:   'Caution — Uptrend Losing Strength',
        tone:      'cautiously_bearish',
        analysis:  t + ' remains in ' + tDesc + ' but is showing signs of fatigue. Momentum is ' +
                   mDesc + ', and ' + rDesc + '. Smart money flow has softened or turned neutral, ' +
                   'which is worth monitoring closely as the trend matures.',
        keyLevels: 'Holding above recent support is important for keeping the uptrend structure ' +
                   'intact. A close below it would increase the likelihood of a more meaningful ' +
                   'pullback. Recent resistance, if retested, may now offer stronger headwinds.',
        summary:   t + ' is showing early signs of a trend that may be running out of steam. ' +
                   'The uptrend structure remains, but momentum and smart money signals are both ' +
                   'softening. Conditions warrant increased caution and careful monitoring.',
      };

    case 'neutral_no_clear_edge':
      return {
        verdict:   'Neutral — No Clear Edge',
        tone:      'neutral',
        analysis:  t + ' is in ' + tDesc + ' with momentum that is ' + mDesc + '. ' +
                   _cap(rDesc) + '. Smart money flow is not providing a clear directional signal. ' +
                   'The technical picture does not favour a strong bias in either direction at ' +
                   'this stage.',
        keyLevels: 'Price is rangebound between recent support and recent resistance. A clear ' +
                   'and sustained break in either direction is needed to establish a meaningful ' +
                   'directional edge.',
        summary:   t + ' is in a technical holding pattern with no strong signal emerging from ' +
                   'the four factors. Trend, momentum, reversal, and smart money are all returning ' +
                   'mixed or inconclusive readings. Clearer alignment across the four factors is needed before the picture improves.',
      };

    case 'bearish_watch':
      return {
        verdict:   'Bearish Watch — Breakdown Risk Rising',
        tone:      'cautiously_bearish',
        analysis:  t + ' is drifting with momentum that is ' + mDesc + '. ' + _cap(rDesc) + '. ' +
                   'Smart money flow is neutral to negative, and the combination of softening ' +
                   'momentum with emerging bearish signals raises the risk of a downside break.',
        keyLevels: 'Recent support is the critical level to watch. A sustained break below it ' +
                   'would confirm that the current price action has resolved to the downside. ' +
                   'Recent resistance overhead is likely to cap any near-term recovery attempts.',
        summary:   t + ' is showing increasing risk of a breakdown as momentum fades and bearish ' +
                   'signals emerge. Smart money is not supporting the current price level. A loss ' +
                   'of recent support would be a significant warning for the near-term outlook.',
      };

    case 'bearish_control':
      return {
        verdict:   'Bearish — Sellers Still in Control',
        tone:      'bearish',
        analysis:  t + ' remains in ' + tDesc + ' with momentum that is ' + mDesc + '. ' +
                   _cap(rDesc) + '. Smart money flow is neutral to negative, and there are no ' +
                   'meaningful signs of sustained demand from the data available.',
        keyLevels: 'Recent resistance is the overhead level that would need to be reclaimed to ' +
                   'change the current picture. Continued pressure below recent support lowers ' +
                   'the reference range over time.',
        summary:   t + ' continues to show a bearish technical setup with sellers maintaining ' +
                   'control. Momentum is neutral to weak, and smart money has not stepped in ' +
                   'meaningfully. The path of least resistance remains downward until reversal ' +
                   'signals emerge with conviction.',
      };

    case 'strong_bearish_alignment':
      return {
        verdict:   'Strong Bearish — Conditions Remain Weak',
        tone:      'bearish',
        analysis:  t + ' is in ' + tDesc + ' with momentum that is ' + mDesc + '. Bearish ' +
                   'reversal signals are confirmed and smart money flow is showing clear negative ' +
                   'activity. All four technical factors are aligned to the downside — caution remains warranted until conditions improve.',
        keyLevels: 'Recent resistance is a significant overhead barrier. Support levels that ' +
                   'have already been broken may now act as resistance on any bounce.',
        summary:   t + ' is presenting a strongly bearish technical picture across all four ' +
                   'factors. Trend, momentum, reversal, and smart money are all aligned to the ' +
                   'downside. Conditions need to improve meaningfully — particularly reversal and smart money signals — before the picture becomes more constructive.',
      };

    default:
      return {
        verdict:   'Neutral — No Clear Edge',
        tone:      'neutral',
        analysis:  t + ' does not show a clearly dominant technical scenario at this time. ' +
                   'Trend, momentum, reversal, and smart money signals are mixed or inconclusive.',
        keyLevels: 'Watch recent support and recent resistance for the next directional move.',
        summary:   t + ' is in a technical holding pattern. No clear edge is present from the ' +
                   'four technical factors at this stage.',
      };
  }
}

// ─── 5. Signal status helpers (transparent classification layer) ──────────────

function getTrendCondition(trendStatus) {
  var s = trendStatus || '';
  var condMap = {
    'Strong Uptrend':   { condition:'Uptrend Conditions',        bias:'bullish' },
    'Uptrend':          { condition:'Uptrend Conditions',        bias:'bullish' },
    'Weak Uptrend':     { condition:'Uptrend Conditions',        bias:'bullish' },
    'Sideways':         { condition:'Sideways Conditions',       bias:'neutral' },
    'Weak Downtrend':   { condition:'Downtrend Conditions',      bias:'bearish' },
    'Downtrend':        { condition:'Downtrend Conditions',      bias:'bearish' },
    'Strong Downtrend': { condition:'Downtrend Conditions',      bias:'bearish' },
  };
  var entry = condMap[s] || { condition:'Unclear Trend Conditions', bias:'unknown' };
  var causeMap = {
    'Strong Uptrend':'The trend is strongly upward.','Uptrend':'The trend is positive.',
    'Weak Uptrend':'The trend is mildly positive.','Sideways':'No clear trend direction.',
    'Weak Downtrend':'The trend is mildly weak.','Downtrend':'The trend is weak.',
    'Strong Downtrend':'The trend is strongly downward.',
  };
  return { condition:entry.condition, bias:entry.bias, label:s||'Unknown', cause:causeMap[s]||'Trend direction is unclear.' };
}

function getMomentumStatus(momentumLabel, monthlyRegime) {
  var profileMap = {
    'Momentum Continuation':      { status:'bullish', strength:'strong',  cause:'Daily and weekly momentum are aligned positively.' },
    'Early Recovery Attempt':     { status:'bullish', strength:'watch',   cause:'Daily momentum is improving before broader weekly confirmation.' },
    'Waiting for Daily Trigger':  { status:'neutral', strength:'watch',   cause:'Weekly momentum is supportive, but daily momentum has not yet triggered.' },
    'Pullback in Larger Momentum':{ status:'neutral', strength:'watch',   cause:'Larger momentum remains supportive, but daily momentum has pulled back.' },
    'Weak Weekly Bounce':         { status:'neutral', strength:'weak',    cause:'Daily momentum is bouncing, but weekly momentum remains weak.' },
    'Bearish Momentum':           { status:'bearish', strength:'strong',  cause:'Momentum is weak across key timeframes.' },
    'No Clear Momentum Profile':  { status:'neutral', strength:'normal',  cause:'Momentum signals are mixed or unclear.' },
    'Not Enough Data':            { status:'unknown', strength:'unknown', cause:'Not enough data to determine momentum profile.' },
    'Strong':   { status:'bullish', strength:'strong',  cause:'Daily momentum is strong.' },
    'Building': { status:'bullish', strength:'normal',  cause:'Daily momentum is building.' },
    'Neutral':  { status:'neutral', strength:'normal',  cause:'Daily momentum is neutral.' },
    'Fading':   { status:'bearish', strength:'weak',    cause:'Daily momentum is fading.' },
    'Weak':     { status:'bearish', strength:'strong',  cause:'Daily momentum is weak.' },
  };
  var base = profileMap[momentumLabel] || { status:'unknown', strength:'unknown', cause:'Momentum status is unavailable.' };
  var regimeAddon = {
    'Supportive':    ' Larger timeframe is supportive.',
    'Neutral':       ' Larger timeframe is neutral.',
    'Weak':          ' Larger timeframe is a headwind.',
  };
  var cause = base.cause + (monthlyRegime && regimeAddon[monthlyRegime] ? regimeAddon[monthlyRegime] : '');
  return { status:base.status, strength:base.strength, label:momentumLabel||'Unknown', cause:cause };
}

function getReversalStatus(reversalLabel) {
  var revMap = {
    'Bullish Reversal Confirmed':  { status:'bullish', strength:'strong',  cause:'Bullish reversal has price confirmation.' },
    'Bullish Reversal Confirming': { status:'bullish', strength:'strong',  cause:'Price action is validating the bullish reversal.' },
    'Bullish Reversal Triggered':  { status:'bullish', strength:'normal',  cause:'Bullish reversal trigger is active.' },
    'Bullish Reversal Forming':    { status:'bullish', strength:'watch',   cause:'Bullish setup and trigger are building, but confirmation is not complete.' },
    'Bullish Reversal Spark':      { status:'bullish', strength:'watch',   cause:'Early bullish momentum spark is appearing.' },
    'Bullish Reversal Watch':      { status:'bullish', strength:'watch',   cause:'Early bullish reversal conditions are present.' },
    'Bullish Reversal Setup':      { status:'bullish', strength:'watch',   cause:'Bullish setup conditions are present.' },
    'Mixed Reversal Signals':      { status:'neutral', strength:'watch',   cause:'Bullish and bearish reversal evidence conflict.' },
    'No Clear Reversal':           { status:'neutral', strength:'normal',  cause:'No clear reversal signal is present.' },
    'Not Enough Data':             { status:'unknown', strength:'unknown', cause:'Not enough data to determine reversal signal.' },
    'Bearish Reversal Confirmed':  { status:'bearish', strength:'strong',  cause:'Bearish reversal has price confirmation.' },
    'Bearish Reversal Confirming': { status:'bearish', strength:'strong',  cause:'Price action is validating the bearish reversal.' },
    'Bearish Reversal Triggered':  { status:'bearish', strength:'strong',  cause:'Bearish reversal trigger is active.' },
    'Bearish Reversal Forming':    { status:'bearish', strength:'watch',   cause:'Bearish setup and trigger are building.' },
    'Bearish Reversal Watch':      { status:'bearish', strength:'watch',   cause:'Early bearish warning conditions are present.' },
    'Bearish Reversal Setup':      { status:'bearish', strength:'watch',   cause:'Bearish setup conditions are present.' },
  };
  // Handle generic Bearish* not in map
  if (!revMap[reversalLabel] && reversalLabel && reversalLabel.indexOf('Bearish') === 0)
    return { status:'bearish', strength:'watch', label:reversalLabel, cause:'Bearish reversal conditions are present.' };
  var base = revMap[reversalLabel] || { status:'neutral', strength:'normal', cause:'No clear reversal signal is present.' };
  return { status:base.status, strength:base.strength, label:reversalLabel||'No Clear Reversal', cause:base.cause };
}

function getSmartMoneyStatus(baseStatus, outcome, dailyPrefix) {
  var smMap = {
    'Strong Accumulation':   { status:'bullish', strength:'strong',  cause:'Strong accumulation is present across key money-flow timeframes.' },
    'Steady Accumulation':   { status:'bullish', strength:'normal',  cause:'Steady accumulation is present, with longer timeframe support.' },
    'Long-Term Accumulation':{ status:'bullish', strength:'watch',   cause:'Long-term accumulation remains positive, although short-term flow may have cooled.' },
    'Early Accumulation':    { status:'bullish', strength:'watch',   cause:'Early accumulation is developing, with recent flow starting to support the setup.' },
    'Cooling Accumulation':  { status:'neutral', strength:'watch',   cause:'Accumulation exists, but recent flow is cooling.' },
    'Mixed Flow':            { status:'neutral', strength:'normal',  cause:'Money flow is mixed across timeframes.' },
    'Short-Term Flow Spike': { status:'neutral', strength:'watch',   cause:'Short-term activity is elevated, but sustained accumulation is not yet confirmed.' },
    'Short-Term Flow Watch': { status:'neutral', strength:'watch',   cause:'Short-term flow is present, but longer-term confirmation is weak.' },
    'No Sustained Flow':     { status:'neutral', strength:'weak',    cause:'No sustained 5D/30D accumulation is present.' },
    'No Clear Signal':       { status:'neutral', strength:'weak',    cause:'No meaningful smart money signal is present.' },
    'Not Enough Data':       { status:'unknown', strength:'unknown', cause:'Not enough data to determine Smart Money Flow.' },
    // Legacy
    'Strong Multi-Timeframe Flow': { status:'bullish', strength:'strong', cause:'Strong accumulation is present across key money-flow timeframes.' },
    'Accumulation Trend Positive': { status:'bullish', strength:'normal', cause:'Steady accumulation is present, with longer timeframe support.' },
    'Constructive but Cooling':    { status:'neutral', strength:'watch',  cause:'Accumulation exists, but recent flow is cooling.' },
    'Short-Term Spike':            { status:'neutral', strength:'watch',  cause:'Short-term activity is elevated, but sustained accumulation is not yet confirmed.' },
  };
  var src = baseStatus || outcome || 'No Clear Signal';
  // Check for distribution/negative/deteriorating
  if (src.indexOf('Distribution') !== -1 || src.indexOf('Negative') !== -1 || src.indexOf('Deteriorating') !== -1)
    return { status:'bearish', strength:'normal', label:src, baseStatus:src, dailyPrefix:dailyPrefix||'', cause:'Money flow shows signs of distribution or deterioration.' };
  // Special: No Sustained Flow with spike prefix
  if ((src.indexOf('No Sustained Flow') !== -1 || (outcome && outcome.indexOf('No Sustained') !== -1))) {
    var spikeCause = dailyPrefix === 'Daily Spike' ?
      'Today shows a strong activity spike, but there is no sustained 5D/30D accumulation yet.' :
      'No sustained 5D/30D accumulation is present.';
    return { status:'neutral', strength:'watch', label:src, baseStatus:'No Sustained Flow', dailyPrefix:dailyPrefix||'', cause:spikeCause };
  }
  var base = smMap[src] || { status:'neutral', strength:'weak', cause:'No meaningful smart money signal is present.' };
  // Daily prefix modifies cause only
  var prefixAddons = {
    'Daily Spike':   ' Today also shows a strong activity spike.',
    'Daily Support': ' Today also shows supportive activity.',
    'Quiet Day':     ' Today is quiet.',
  };
  var cause = base.cause + (dailyPrefix && prefixAddons[dailyPrefix] ? prefixAddons[dailyPrefix] : '');
  return { status:base.status, strength:base.strength, label:outcome||src, baseStatus:src, dailyPrefix:dailyPrefix||'', cause:cause };
}

// ─── 5b. Result determination (strength-aware) ────────────────────────────────

var _RESULT_TO_SCENARIO = {
  'Strong Bullish':  'strong_bullish_alignment',
  'Bullish':         'healthy_bullish_trend',
  'Bullish Watch':   'sideways_recovery_setup',
  'Risky Bounce':    'risky_bounce',
  'Neutral':         'neutral_no_clear_edge',
  'Caution':         'uptrend_losing_strength',
  'Mixed / Caution': 'uptrend_losing_strength',
  'Bearish Watch':   'bearish_watch',
  'Bearish':         'bearish_control',
  'Strong Bearish':  'strong_bearish_alignment',
};

function determineResultFromSignals(momSig, revSig, smSig) {
  var m  = momSig.status  === 'unknown' ? 'neutral' : momSig.status;
  var r  = revSig.status  === 'unknown' ? 'neutral' : revSig.status;
  var s  = smSig.status   === 'unknown' ? 'neutral' : smSig.status;
  var ms = momSig.strength === 'unknown' ? 'watch'  : momSig.strength;
  var rs = revSig.strength === 'unknown' ? 'watch'  : revSig.strength;
  var ss = smSig.strength  === 'unknown' ? 'watch'  : smSig.strength;

  // A. Strong Bullish — all three bullish, strong conviction throughout
  if (m==='bullish' && ms==='strong' &&
      r==='bullish' && rs==='strong' &&
      s==='bullish' && (ss==='strong' || ss==='normal'))
    return 'Strong Bullish';

  // I. Strong Bearish — all three bearish, strong conviction
  if (m==='bearish' && r==='bearish' && s==='bearish' &&
      rs==='strong' && (ms==='strong' || ms==='normal'))
    return 'Strong Bearish';

  // E. Risky Bounce — momentum bearish but reversal/SMF improving
  if (m==='bearish' && r==='bullish' && (s==='bullish' || s==='neutral'))
    return 'Risky Bounce';

  // H. Bearish — at least two bearish, remaining neutral or weak
  if (m==='bearish' && r==='bearish' && s!=='bullish') return 'Bearish';
  if (m==='neutral' && r==='bearish' && s==='bearish') return 'Bearish';
  if (m==='bearish' && r==='neutral' && s==='bearish') return 'Bearish';

  // G. Bearish Watch — bearish evidence present, not fully aligned
  if (m==='neutral' && r==='bearish' && s==='neutral') return 'Bearish Watch';
  if (m==='bearish' && r==='neutral' && s==='neutral') return 'Bearish Watch';
  if (m==='bullish' && r==='bearish' && s==='bearish') return 'Bearish Watch';
  if (m==='bearish' && r==='bearish' && s==='bullish') return 'Mixed / Caution';

  // F. Mixed / Caution — direct bullish/bearish conflict
  if (m==='bullish' && r==='bearish' && s==='bullish') return 'Mixed / Caution';
  if (m==='bearish' && r==='neutral' && s==='bullish') return 'Mixed / Caution';
  if (m==='neutral' && r==='bullish' && s==='bearish') return 'Mixed / Caution';
  if (m==='bearish' && r==='bullish' && s==='bearish') return 'Mixed / Caution';

  // Caution — one-sided conflict, bearish not fully aligned
  if (m==='bullish' && r==='bearish' && s==='neutral') return 'Caution';
  if (m==='bullish' && r==='neutral' && s==='bearish') return 'Caution';

  // B. Bullish — all three bullish but not Strong Bullish
  if (m==='bullish' && r==='bullish' && s==='bullish') return 'Bullish';

  // C. Bullish — momentum + reversal bullish (strong/normal), SMF neutral
  if (m==='bullish' && r==='bullish' && s==='neutral' &&
      (rs==='strong' || rs==='normal')) return 'Bullish';

  // D. Bullish Watch — two bullish one neutral; or reversal watch-level with neutral SMF
  if (m==='bullish' && r==='neutral' && s==='bullish') return 'Bullish Watch';
  if (m==='neutral' && r==='bullish' && s==='bullish') return 'Bullish Watch';
  if (m==='bullish' && r==='bullish' && s==='neutral') return 'Bullish Watch'; // rs=watch falls here (not rule C)
  if (m==='bullish' && r==='neutral' && s==='neutral') return 'Bullish Watch';
  if (m==='neutral' && r==='bullish' && s==='neutral') return 'Bullish Watch';
  if (m==='neutral' && r==='neutral' && s==='bullish') return 'Bullish Watch';

  // J. Neutral — fallback
  return 'Neutral';
}

function _resultReason(rawResult, momSig, revSig, smSig) {
  var base = 'Result is ' + rawResult + ' because ';
  var m = momSig.status === 'unknown' ? 'neutral' : momSig.status;
  var r = revSig.status === 'unknown' ? 'neutral' : revSig.status;
  var s = smSig.status  === 'unknown' ? 'neutral' : smSig.status;

  if (rawResult === 'Strong Bullish')
    return base + 'Momentum (' + momSig.label + '), Reversal (' + revSig.label + '), and Smart Money (' + (smSig.baseStatus||smSig.label) + ') are all bullish with strong conviction across all three signals.';

  if (rawResult === 'Bullish') {
    if (m==='bullish' && r==='bullish' && s==='bullish') {
      var limiters = [];
      if (revSig.strength !== 'strong') limiters.push('Reversal is ' + revSig.strength + ' (' + revSig.label + ')');
      if (smSig.strength === 'watch' || smSig.strength === 'weak') limiters.push('Smart Money is still ' + smSig.strength + ' (' + (smSig.baseStatus||smSig.label) + ')');
      if (momSig.strength !== 'strong') limiters.push('Momentum strength is ' + momSig.strength + ' (' + momSig.label + ')');
      return base + 'Momentum, Reversal, and Smart Money are all bullish, but conviction is not strong enough for Strong Bullish. ' + limiters.join(', ') + '.';
    }
    return base + 'Momentum and Reversal are bullish. Smart Money is ' + s + '.';
  }

  if (rawResult === 'Bullish Watch')
    return base + 'some bullish evidence exists but signals are not fully aligned. Momentum is ' + m + ' (' + momSig.label + '), Reversal is ' + r + ' (' + revSig.label + '), Smart Money is ' + s + ' (' + (smSig.baseStatus||smSig.label) + ').';

  if (rawResult === 'Strong Bearish')
    return base + 'Momentum (' + momSig.label + '), Reversal (' + revSig.label + '), and Smart Money (' + (smSig.baseStatus||smSig.label) + ') are all bearish with strong conviction.';

  if (rawResult === 'Bearish')
    return base + 'at least two of Momentum, Reversal, and Smart Money are bearish. Momentum is ' + m + ', Reversal is ' + r + ', Smart Money is ' + s + '.';

  if (rawResult === 'Bearish Watch')
    return base + 'bearish evidence is building but signals are not fully aligned. Momentum is ' + m + ' (' + momSig.label + '), Reversal is ' + r + ' (' + revSig.label + '), Smart Money is ' + s + '.';

  if (rawResult === 'Risky Bounce')
    return base + 'Reversal and Smart Money are showing bullish signals, but the underlying Momentum is bearish (' + momSig.label + '). A bounce may be developing but has not been confirmed by broader momentum.';

  if (rawResult === 'Mixed / Caution')
    return base + 'there is direct conflict between bullish and bearish signals. Momentum is ' + m + ', Reversal is ' + r + ', Smart Money is ' + s + '.';

  if (rawResult === 'Caution')
    return base + 'bullish and bearish signals are in conflict. Momentum is ' + m + ', Reversal is ' + r + ', Smart Money is ' + s + '.';

  return base + 'no clear directional alignment exists across Momentum, Reversal, and Smart Money.';
}

function formatResultWithTrend(rawResult, trendObj) {
  return rawResult + ' in ' + trendObj.condition;
}

// ─── 6. generateRuleBasedAnalytics ───────────────────────────────────────────

/**
 * Main entry point. Accepts a pre-computed snapshot from
 * calculateTechnicalSignalSnapshot() and returns structured rule-based commentary.
 *
 * ── App.jsx integration note ────────────────────────────────────────────────
 * For full support/resistance and Watch Zone calculation, App.jsx should pass
 * an enriched snapshot that includes the raw OHLCV bars and indicator values:
 *
 *   generateRuleBasedAnalytics({
 *     ...technicalSnapshot,          // from calculateTechnicalSignalSnapshot()
 *     ohlcv:      originalOhlcvBars, // array of { open, high, low, close, volume }
 *     indicators: originalIndicators,// { ema20, sma50, sma200, ... }
 *     meta: {
 *       price: currentPrice,         // snapshot.meta.price
 *       hi52:  hi52,
 *       lo52:  lo52,
 *     },
 *   });
 *
 * calculateKeyLevels() uses ohlcv, indicators, and price to produce real
 * support/resistance numbers instead of falling back to placeholder text.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @param {object} snapshot
 * @returns {object} analytics result
 */
export function generateRuleBasedAnalytics(snapshot) {
  if (!snapshot) return null;

  var ticker = snapshot.ticker || 'This stock';
  var price  = _extractPrice(snapshot);
  var close  = price != null ? '$' + price.toFixed(2) : 'N/A';

  // ── Extract status strings using decision objects where available ──────────
  var trendStatus  = snapshot.trend && snapshot.trend.status;

  // Momentum: prefer Momentum Profile
  var momSnap = snapshot.momentum || null;
  var momProfileSnap = snapshot.momentumProfile || (momSnap && momSnap.profile ? momSnap : null);
  var momProfileLabel  = momProfileSnap && momProfileSnap.profile  ? momProfileSnap.profile  : null;
  var momMonthlyRegime = (momProfileSnap && momProfileSnap.monthlyRegime)
    || (momSnap && momSnap.monthlyRegime) || null;
  var momStatus = momProfileLabel || (momSnap && momSnap.status) || null;

  // Reversal: prefer reversalDecision.outcome
  var revWatch    = snapshot.reversalWatch || null;
  var revDecision = revWatch && revWatch.reversalDecision ? revWatch.reversalDecision : null;
  var revStatus   = (revDecision && revDecision.outcome) || (revWatch && revWatch.status) || null;

  // Smart Money: prefer smartMoneyDecision
  var smf     = snapshot.smartMoneyFlow || null;
  var smd     = smf && smf.smartMoneyDecision ? smf.smartMoneyDecision : null;
  var smfBaseStatus  = (smd && smd.baseStatus)  || null;
  var smfOutcome     = (smd && smd.outcome)     || (smf && smf.status) || null;
  var smfDailyPrefix = (smd && smd.dailyPrefix) || null;
  var smfStatus      = smfOutcome || null;

  // ── New signal status layer ───────────────────────────────────────────────
  var trendSig  = getTrendCondition(trendStatus);
  var momSig    = getMomentumStatus(momStatus, momMonthlyRegime);
  var revSig    = getReversalStatus(revStatus);
  var smSig     = getSmartMoneyStatus(smfBaseStatus, smfOutcome, smfDailyPrefix);

  var rawResult    = determineResultFromSignals(momSig, revSig, smSig);
  var finalResult  = formatResultWithTrend(rawResult, trendSig);
  var scenarioId   = _RESULT_TO_SCENARIO[rawResult] || 'neutral_no_clear_edge';

  // ── Legacy classify (for backward-compat with _scenarioContent) ───────────
  var trend     = classifyTrend(trendStatus);
  var momentum  = classifyMomentum(momStatus);
  var reversal  = classifyReversal(revStatus);
  var smfCls    = classifySmartMoney(smfStatus, smf);
  var smCategory = smfCls.category;
  var smDirection= smfCls.direction;

  // Build content using existing template engine
  var content = _scenarioContent(scenarioId, ticker, trend, momentum, reversal, smCategory, smDirection);

  // Append cooling caution where applicable
  if (smCategory === 'positiveSmartMoney' && smDirection === 'cooling') {
    content = Object.assign({}, content, {
      summary: content.summary +
        ' Smart money remains constructive, but the pace of accumulation is easing, so confirmation above resistance remains important.',
    });
  }

  // Override verdict with new format
  content = Object.assign({}, content, { verdict: finalResult });

  var smartMoneyLine          = _buildSmfLine(smCategory, smDirection, smfBaseStatus || smfStatus);
  var technicalIndicatorsLine = _buildTechLine(trend, momentum, reversal);
  var kl = calculateKeyLevels(snapshot, scenarioId);

  // ── decisionTrace ─────────────────────────────────────────────────────────
  var hasUnknown = momSig.status === 'unknown' || revSig.status === 'unknown' || smSig.status === 'unknown';
  var reason = _resultReason(rawResult, momSig, revSig, smSig);
  if (hasUnknown) reason += ' Note: one or more signals had insufficient data and were treated as neutral.';

  var decisionTrace = {
    trendCondition: { label:trendSig.label, condition:trendSig.condition, bias:trendSig.bias, cause:trendSig.cause },
    momentum:  { label:momSig.label,  status:momSig.status,  strength:momSig.strength,  cause:momSig.cause },
    reversal:  { label:revSig.label,  status:revSig.status,  strength:revSig.strength,  cause:revSig.cause },
    smartMoney:{ label:smSig.label, baseStatus:smSig.baseStatus, dailyPrefix:smSig.dailyPrefix,
                 status:smSig.status, strength:smSig.strength, cause:smSig.cause },
    matrixInput:{ momentum:momSig.status, reversal:revSig.status, smartMoney:smSig.status },
    rawResult:   rawResult,
    finalResult: finalResult,
    matchedScenarioId: scenarioId,
    reason: reason + ' Trend is used as context: ' + trendSig.condition + '.',
  };

  return {
    scenarioId:   scenarioId,
    verdict:      finalResult,
    tone:         content.tone,
    analysis:                content.analysis,
    keyLevels:               kl.keyLevelsText,
    closingPrice:            close,
    support:                 kl.supportText,
    resistance:              kl.resistanceText,
    smartMoneyLine:          smartMoneyLine,
    technicalIndicatorsLine: technicalIndicatorsLine,
    summary:                 content.summary,
    supportLevels:      kl.supportLevels,
    resistanceLevels:   kl.resistanceLevels,
    breakoutLevel:      kl.breakoutLevel,
    invalidationLevel:  kl.invalidationLevel,
    potentialEntryZone: kl.potentialEntryZone,
    entryZoneText:      kl.entryZoneText,
    factorGroups: {
      // New transparent factors
      trendCondition:    trendSig.condition,
      momentumStatus:    momSig.status,
      reversalStatus:    revSig.status,
      smartMoneyStatus:  smSig.status,
      rawResult:         rawResult,
      finalResult:       finalResult,
      // Legacy (kept for backward compat with existing Simulator/journal)
      trend:               trend,
      momentum:            momentum,
      reversal:            reversal,
      smartMoney:          smCategory,
      smartMoneyDirection: smDirection,
      monthlyRegime:       momMonthlyRegime   || null,
      momentumProfile:     momProfileLabel    || null,
      smartMoneyBaseStatus: smfBaseStatus     || null,
      smartMoneyDailyPrefix: smfDailyPrefix   || null,
    },
    factorLabels: {
      trend:      trendStatus  || 'N/A',
      momentum:   momStatus    || 'N/A',
      reversal:   revStatus    || 'N/A',
      smartMoney: smfOutcome   || smfStatus || 'N/A',
      result:     finalResult,
    },
    debugScores: {
      trendScore:    snapshot.trend         && snapshot.trend.score,
      momentumScore: snapshot.momentum      && snapshot.momentum.score,
      reversalScore: snapshot.reversalWatch && snapshot.reversalWatch.score,
      smfScore:      smf && smf.score,
      smfToday:      smf && smf.todayActivityScore,
      smfFiveDay:    smf && smf.fiveDayFlowScore,
      smfThirtyDay:  smf && smf.thirtyDayAccumulationScore,
    },
    decisionTrace: decisionTrace,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Run 2 additions — calculateKeyLevels
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Internal deduplication ──────────────────────────────────────────────────

function _dedup(levels, price) {
  if (!levels || levels.length === 0) return [];
  var THRESHOLD = 0.015; // 1.5% — levels closer than this are treated as the same zone
  var sorted = levels.filter(function(v){ return v > 0; }).sort(function(a,b){ return a - b; });
  var result = [];
  for (var i = 0; i < sorted.length; i++) {
    var v = sorted[i];
    var isDup = false;
    for (var j = 0; j < result.length; j++) {
      if (Math.abs(result[j] - v) / price < THRESHOLD) { isDup = true; break; }
    }
    if (!isDup) result.push(parseFloat(v.toFixed(2)));
  }
  return result;
}

// ─── Entry zone calculator ────────────────────────────────────────────────────

function _calcEntryZone(scenarioId, price, nearestSupport, breakoutLevel) {
  var BULLISH   = ['strong_bullish_alignment','healthy_bullish_trend','sideways_recovery_setup','early_bullish_reversal'];
  var BEARISH   = ['bearish_watch','bearish_control','strong_bearish_alignment'];

  if (BEARISH.indexOf(scenarioId) !== -1) {
    return {
      potentialEntryZone: null,
      entryZoneText: 'No constructive watch zone is identified while the technical picture remains weak.',
    };
  }
  if (scenarioId === 'risky_bounce') {
    return {
      potentialEntryZone: null,
      entryZoneText: 'This is not a clean entry setup yet. A better Watch Zone would be either a hold above support with improving smart money, or a close above resistance.',
    };
  }
  if (BULLISH.indexOf(scenarioId) === -1) {
    // neutral scenarios
    return {
      potentialEntryZone: null,
      entryZoneText: 'No clear watch zone is identified in the current neutral setup.',
    };
  }
  if (!nearestSupport || !price || price <= 0) {
    return {
      potentialEntryZone: null,
      entryZoneText: 'A potential watch zone cannot be calculated because support levels are not available.',
    };
  }

  var distance = price - nearestSupport;
  if (distance <= 0) {
    return {
      potentialEntryZone: null,
      entryZoneText: 'A potential watch zone cannot be calculated because support levels are not available.',
    };
  }
  var lower   = parseFloat(nearestSupport.toFixed(2));
  var upper   = parseFloat((nearestSupport + distance * 0.25).toFixed(2));
  var zoneStr = '$' + lower.toFixed(2) + '\u2013$' + upper.toFixed(2);
  var text    = 'A potential watch zone is around ' + zoneStr + ', provided support continues to hold.';

  // Close-to-resistance warning
  if (breakoutLevel && price > 0 && (breakoutLevel - price) / price < 0.02) {
    text += ' Since price is already close to resistance at $' + breakoutLevel.toFixed(2) +
            ', chasing the move near resistance carries higher risk. A breakout confirmation above $' +
            breakoutLevel.toFixed(2) + ' may be the more important level to watch.';
  }

  return { potentialEntryZone: zoneStr, entryZoneText: text };
}

// ─── Key levels narrative per scenario ───────────────────────────────────────

function _buildKeyLevelsText(scenarioId, ticker, breakoutLevel, invalidationLevel, entryZone, entryZoneText, resistanceLevels) {
  var t  = ticker;
  var bl = breakoutLevel     ? '$' + breakoutLevel.toFixed(2)     : 'recent resistance';
  var il = invalidationLevel ? '$' + invalidationLevel.toFixed(2) : 'recent support';

  // Second and third resistance levels for continuation text
  var nextResText = '';
  if (resistanceLevels && resistanceLevels.length >= 2) {
    nextResText = ', with the next resistance zone near $' + resistanceLevels[1].toFixed(2) +
                 (resistanceLevels[2] ? ' to $' + resistanceLevels[2].toFixed(2) : '');
  }

  switch (scenarioId) {
    case 'strong_bullish_alignment':
    case 'healthy_bullish_trend':
      return 'The bullish setup remains constructive while ' + t + ' holds above ' + il +
             '. A close above ' + bl + ' would suggest stronger demand and continuation' + nextResText + '.';

    case 'sideways_recovery_setup':
      return 'The recovery setup remains constructive while ' + t + ' holds above ' + il +
             '. A close above ' + bl + ' would suggest the stock is moving out of its sideways range.';

    case 'early_bullish_reversal':
      return 'The reversal attempt remains in play while ' + t + ' holds above ' + il +
             '. A close above ' + bl + ' would strengthen the case for a trend change.';

    case 'risky_bounce':
      return 'The bounce remains valid while ' + t + ' holds above ' + il +
             '. A close above ' + bl + ' would improve the setup, but failure near resistance could mean this remains a short-term bounce. ' +
             entryZoneText;

    case 'uptrend_losing_strength':
      return t + ' must hold above ' + il + ' to keep the uptrend structure intact. ' +
             'A close below ' + il + ' would increase the risk of a deeper pullback. ' +
             'Recovery above ' + bl + ' would be needed to restore momentum.';

    case 'bearish_watch':
    case 'bearish_control':
    case 'strong_bearish_alignment':
      return t + ' needs to reclaim ' + bl + ' to reduce bearish pressure. ' +
             'A close below ' + il + ' would suggest sellers remain in control. ' +
             entryZoneText;

    case 'neutral_no_clear_edge':
    default:
      return 'Price is testing between ' + il + ' support and ' + bl + ' resistance. ' +
             'A clear and sustained break in either direction is needed to establish a meaningful edge.';
  }
}

// ─── Fallback empty result ────────────────────────────────────────────────────

function _emptyKeyLevels(scenarioId) {
  var ez = _calcEntryZone(scenarioId, 0, null, null);
  return {
    currentPrice:       null,
    supportLevels:      [],
    resistanceLevels:   [],
    breakoutLevel:      null,
    invalidationLevel:  null,
    potentialEntryZone: ez.potentialEntryZone,
    entryZoneText:      ez.entryZoneText,
    supportText:        'Recent support',
    resistanceText:     'Recent resistance',
    keyLevelsText:      'Key levels are not available for this setup.',
  };
}

// ─── 6. calculateKeyLevels ───────────────────────────────────────────────────

/**
 * Calculates definite support, resistance, breakout, invalidation, and
 * potential entry/watch zones from the snapshot's price data and indicators.
 *
 * Does NOT recalculate any technical signals.
 * Uses only data already present in the snapshot.
 *
 * @param {object} snapshot  - pre-computed snapshot from calculateTechnicalSignalSnapshot()
 * @param {string} [scenarioId] - optional, used to tailor entry zone wording
 * @returns {object}
 */
export function calculateKeyLevels(snapshot, scenarioId) {
  var sid = scenarioId || null;
  if (!snapshot) return _emptyKeyLevels(sid);

  var price = _extractPrice(snapshot);
  if (!price || price <= 0) return _emptyKeyLevels(sid);

  var ohlcv      = snapshot.ohlcv      || null;
  var trend      = snapshot.trend      || {};
  var indicators = snapshot.indicators || {};

  // ── Get indicator levels ──────────────────────────────────────────────────
  // Try direct indicator values first; derive from % fields as fallback.

  var ema20  = indicators.ema20  != null ? parseFloat(indicators.ema20.toFixed(2))  : null;
  var sma50  = indicators.sma50  != null ? parseFloat(indicators.sma50.toFixed(2))  : null;
  var sma200 = indicators.sma200 != null ? parseFloat(indicators.sma200.toFixed(2)) : null;

  if (ema20  == null && trend.priceVs20dEmaPct  != null && trend.priceVs20dEmaPct  !== 0) {
    ema20  = parseFloat((price / (1 + trend.priceVs20dEmaPct  / 100)).toFixed(2));
  }
  if (sma50  == null && trend.priceVs50dSmaPct  != null && trend.priceVs50dSmaPct  !== 0) {
    sma50  = parseFloat((price / (1 + trend.priceVs50dSmaPct  / 100)).toFixed(2));
  }
  if (sma200 == null && trend.priceVs200dSmaPct != null && trend.priceVs200dSmaPct !== 0) {
    sma200 = parseFloat((price / (1 + trend.priceVs200dSmaPct / 100)).toFixed(2));
  }

  // ── OHLCV-based high/low ──────────────────────────────────────────────────
  var supportCandidates    = [];
  var resistanceCandidates = [];

  if (ohlcv && ohlcv.length > 0) {
    // ohlcv is oldest-first; last N bars = most recent N bars
    var recent5  = ohlcv.slice(-5);
    var recent20 = ohlcv.slice(-20);

    var low5   = Math.min.apply(null, recent5.map(function(b){  var v = b.low  != null ? b.low  : b.l; return v != null ? v : Infinity; }));
    var low20  = Math.min.apply(null, recent20.map(function(b){ var v = b.low  != null ? b.low  : b.l; return v != null ? v : Infinity; }));
    var high5  = Math.max.apply(null, recent5.map(function(b){  var v = b.high != null ? b.high : b.h; return v != null ? v : 0; }));
    var high20 = Math.max.apply(null, recent20.map(function(b){ var v = b.high != null ? b.high : b.h; return v != null ? v : 0; }));

    if (low5  > 0 && low5  < price  && isFinite(low5))  supportCandidates.push(low5);
    if (low20 > 0 && low20 < price  && isFinite(low20)) supportCandidates.push(low20);
    if (high5  > 0 && high5  > price) resistanceCandidates.push(high5);
    if (high20 > 0 && high20 > price) resistanceCandidates.push(high20);
  }

  // ── Indicator-based levels ────────────────────────────────────────────────
  [ema20, sma50, sma200].forEach(function(v) {
    if (v != null && v > 0) {
      if (v < price) supportCandidates.push(v);
      else           resistanceCandidates.push(v);
    }
  });

  // ── Deduplicate, sort, limit ──────────────────────────────────────────────
  // Support: sorted highest first (nearest to current price first)
  var supportLevels    = _dedup(supportCandidates,    price).sort(function(a,b){ return b - a; }).slice(0, 3);
  // Resistance: sorted lowest first (nearest to current price first)
  var resistanceLevels = _dedup(resistanceCandidates, price).sort(function(a,b){ return a - b; }).slice(0, 3);

  var breakoutLevel     = resistanceLevels.length > 0 ? resistanceLevels[0] : null;
  var invalidationLevel = supportLevels.length    > 0 ? supportLevels[0]    : null;

  // ── Entry zone ────────────────────────────────────────────────────────────
  var ez = _calcEntryZone(sid, price, invalidationLevel, breakoutLevel);

  // ── Text fields ───────────────────────────────────────────────────────────
  var supportText    = supportLevels.length    > 0 ? supportLevels.map(function(v){    return '$' + v.toFixed(2); }).join(' / ') : 'Recent support';
  var resistanceText = resistanceLevels.length > 0 ? resistanceLevels.map(function(v){ return '$' + v.toFixed(2); }).join(' / ') : 'Recent resistance';

  var ticker = snapshot.ticker || 'This stock';
  var keyLevelsText = _buildKeyLevelsText(
    sid, ticker, breakoutLevel, invalidationLevel,
    ez.potentialEntryZone, ez.entryZoneText, resistanceLevels
  );

  return {
    currentPrice:       parseFloat(price.toFixed(2)),
    supportLevels:      supportLevels,
    resistanceLevels:   resistanceLevels,
    breakoutLevel:      breakoutLevel,
    invalidationLevel:  invalidationLevel,
    potentialEntryZone: ez.potentialEntryZone,
    entryZoneText:      ez.entryZoneText,
    supportText:        supportText,
    resistanceText:     resistanceText,
    keyLevelsText:      keyLevelsText,
  };
}
