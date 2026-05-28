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
 * @param {string|null} status - e.g. "Building"
 * @returns {string} category key
 */
export function classifyMomentum(status) {
  if (!status) return 'unknownMomentum';
  switch (status) {
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
 * @param {string|null} status - e.g. "Bullish Reversal Watch"
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
    status === 'Bullish Reversal Spark'
  ) return 'earlyBullishReversal';

  if (status === 'Mixed Reversal Signals') return 'mixedReversal';

  if (status.indexOf('Bearish') === 0) return 'bearishReversal';

  return 'noReversal';
}

// ─── 4. classifySmartMoney ───────────────────────────────────────────────────

/**
 * Maps smart money status to category + derives direction from sub-scores.
 * @param {string|null} status  - e.g. "Constructive but Cooling"
 * @param {object|null} smf     - snapshot.smartMoneyFlow object (may contain sub-scores)
 * @returns {{ category: string, direction: string }}
 */
export function classifySmartMoney(status, smf) {
  return {
    category:  _smfCategory(status),
    direction: _smfDirection(status, smf),
  };
}

function _smfCategory(status) {
  if (!status) return 'neutralSmartMoney';
  if (status === 'Strong Multi-Timeframe Flow')  return 'strongSmartMoney';
  if (status === 'Accumulation Trend Positive')  return 'positiveSmartMoney';
  if (status === 'Constructive but Cooling')      return 'positiveSmartMoney';
  if (status === 'Early Accumulation')            return 'earlySmartMoney';
  if (status === 'Short-Term Spike')              return 'temporarySmartMoney';
  if (status === 'No Clear Signal' ||
      status === 'No Clear Flow')                 return 'neutralSmartMoney';
  // Negative indicators
  if (status.indexOf('Distribution')   !== -1 ||
      status.indexOf('Negative')        !== -1 ||
      status.indexOf('Deteriorating')   !== -1)  return 'negativeSmartMoney';
  return 'neutralSmartMoney';
}

function _smfDirection(status, smf) {
  // Primary: derive from sub-scores when available
  if (smf) {
    var today    = smf.todayActivityScore      != null ? smf.todayActivityScore      : null;
    var fiveDay  = smf.fiveDayFlowScore        != null ? smf.fiveDayFlowScore        : null;
    var thirtyDay= smf.thirtyDayAccumulationScore != null ? smf.thirtyDayAccumulationScore : null;

    if (today !== null && fiveDay !== null && thirtyDay !== null) {
      // Improving: short-term stronger than medium or medium stronger than long
      if (today > fiveDay || fiveDay > thirtyDay) return 'improving';
      // Cooling: each timeframe weaker than the longer one, but still positive
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

  // Fallback: infer from status text
  if (!status) return 'unknown';
  if (status === 'Strong Multi-Timeframe Flow')  return 'stable';
  if (status === 'Accumulation Trend Positive')  return 'stable';
  if (status === 'Early Accumulation')            return 'improving';
  if (status === 'Constructive but Cooling')      return 'cooling';
  if (status === 'Short-Term Spike')              return 'improving';
  return 'unknown';
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function _cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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
      return 'Smart money flow is strong across multiple timeframes ' + dirPhrase + '.';
    case 'positiveSmartMoney':
      if (smfStatus === 'Constructive but Cooling') {
        return 'Smart money flow remains constructive' + (dirPhrase ? ', ' + dirPhrase : '') + '.';
      }
      return 'Smart money flow is positive ' + dirPhrase + '.';
    case 'earlySmartMoney':
      return 'Early signs of smart money accumulation are appearing ' + dirPhrase + '.';
    case 'temporarySmartMoney':
      return 'Smart money activity shows a short-term uptick, which may not yet reflect sustained institutional accumulation.';
    case 'neutralSmartMoney':
      return 'Smart money flow is neutral, with no strong directional signal from institutional activity.';
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
                   'move above recent resistance would signal continuation and may attract further ' +
                   'buying interest.',
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
                   'money is not yet providing strong backing. This is a watch situation, not a ' +
                   'confirmed opportunity.',
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
                   'mixed or inconclusive readings. Waiting for clearer alignment is the prudent approach.',
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
                   'meaningful signs of sustained buying interest from the data available.',
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
        verdict:   'Strong Bearish — Avoid Until Conditions Improve',
        tone:      'bearish',
        analysis:  t + ' is in ' + tDesc + ' with momentum that is ' + mDesc + '. Bearish ' +
                   'reversal signals are confirmed and smart money flow is showing clear negative ' +
                   'activity. All four technical factors are aligned to the downside — this is a ' +
                   'setup that requires patience and careful risk awareness.',
        keyLevels: 'Recent resistance is a significant overhead barrier. Support levels that ' +
                   'have already been broken may now act as resistance on any bounce.',
        summary:   t + ' is presenting a strongly bearish technical picture across all four ' +
                   'factors. Trend, momentum, reversal, and smart money are all aligned to the ' +
                   'downside. Conditions need to improve meaningfully — particularly reversal and ' +
                   'smart money signals — before a more constructive view is warranted.',
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

// ─── 5. generateRuleBasedAnalytics ───────────────────────────────────────────

/**
 * Main entry point. Accepts a pre-computed snapshot from
 * calculateTechnicalSignalSnapshot() and returns structured rule-based commentary.
 *
 * @param {object} snapshot
 * @returns {object} analytics result
 */
export function generateRuleBasedAnalytics(snapshot) {
  if (!snapshot) return null;

  var ticker = snapshot.ticker || 'This stock';
  var price  = snapshot.meta && snapshot.meta.price != null ? snapshot.meta.price : null;
  var close  = price != null ? '$' + price.toFixed(2) : 'N/A';

  // Extract status strings
  var trendStatus  = snapshot.trend           && snapshot.trend.status;
  var momStatus    = snapshot.momentum        && snapshot.momentum.status;
  var revStatus    = snapshot.reversalWatch   && snapshot.reversalWatch.status;
  var smfStatus    = snapshot.smartMoneyFlow  && snapshot.smartMoneyFlow.status;
  var smf          = snapshot.smartMoneyFlow  || null;

  // Classify
  var trend           = classifyTrend(trendStatus);
  var momentum        = classifyMomentum(momStatus);
  var reversal        = classifyReversal(revStatus);
  var smfClassified   = classifySmartMoney(smfStatus, smf);
  var smCategory      = smfClassified.category;
  var smDirection     = smfClassified.direction;

  // Match scenario
  var scenarioId = _matchScenario(trend, momentum, reversal, smCategory, smDirection);

  // Build content
  var content = _scenarioContent(scenarioId, ticker, trend, momentum, reversal, smCategory, smDirection);

  // Build public-facing lines (no scores)
  var smartMoneyLine           = _buildSmfLine(smCategory, smDirection, smfStatus);
  var technicalIndicatorsLine  = _buildTechLine(trend, momentum, reversal);

  return {
    // Scenario
    scenarioId:   scenarioId,
    verdict:      content.verdict,
    tone:         content.tone,  // 'bullish' | 'cautiously_bullish' | 'neutral' | 'cautiously_bearish' | 'bearish'

    // Public commentary — NO numeric scores
    analysis:                content.analysis,
    keyLevels:               content.keyLevels,
    closingPrice:            close,
    support:                 'Recent support',
    resistance:              'Recent resistance',
    smartMoneyLine:          smartMoneyLine,
    technicalIndicatorsLine: technicalIndicatorsLine,
    summary:                 content.summary,

    // Classified factor keys (for rendering, colour logic, etc.)
    factorGroups: {
      trend:              trend,
      momentum:           momentum,
      reversal:           reversal,
      smartMoney:         smCategory,
      smartMoneyDirection:smDirection,
    },

    // Original status strings for display
    factorLabels: {
      trend:      trendStatus  || 'N/A',
      momentum:   momStatus    || 'N/A',
      reversal:   revStatus    || 'N/A',
      smartMoney: smfStatus    || 'N/A',
    },

    // Internal scores — for developer/debug use ONLY, never shown publicly
    debugScores: {
      trendScore:    snapshot.trend          && snapshot.trend.score,
      momentumScore: snapshot.momentum       && snapshot.momentum.score,
      reversalScore: snapshot.reversalWatch  && snapshot.reversalWatch.score,
      smfScore:      smf && smf.score,
      smfToday:      smf && smf.todayActivityScore,
      smfFiveDay:    smf && smf.fiveDayFlowScore,
      smfThirtyDay:  smf && smf.thirtyDayAccumulationScore,
    },
  };
}
