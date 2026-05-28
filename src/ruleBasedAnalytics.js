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

// ─── 5. generateRuleBasedAnalytics ───────────────────────────────────────────

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

  // Append "Constructive but Cooling" caution to summary when applicable
  if (smCategory === 'positiveSmartMoney' && smDirection === 'cooling') {
    content = Object.assign({}, content, {
      summary: content.summary +
        ' Smart money remains constructive, but the pace of accumulation is easing, so confirmation above resistance remains important.',
    });
  }

  // Build public-facing lines (no scores)
  var smartMoneyLine           = _buildSmfLine(smCategory, smDirection, smfStatus);
  var technicalIndicatorsLine  = _buildTechLine(trend, momentum, reversal);

  // Calculate key levels with actual price data
  var kl = calculateKeyLevels(snapshot, scenarioId);

  return {
    // Scenario
    scenarioId:   scenarioId,
    verdict:      content.verdict,
    tone:         content.tone,

    // Public commentary — NO numeric scores
    analysis:                content.analysis,
    keyLevels:               kl.keyLevelsText,
    closingPrice:            close,
    support:                 kl.supportText,
    resistance:              kl.resistanceText,
    smartMoneyLine:          smartMoneyLine,
    technicalIndicatorsLine: technicalIndicatorsLine,
    summary:                 content.summary,

    // Key level details
    supportLevels:      kl.supportLevels,
    resistanceLevels:   kl.resistanceLevels,
    breakoutLevel:      kl.breakoutLevel,
    invalidationLevel:  kl.invalidationLevel,
    potentialEntryZone: kl.potentialEntryZone,
    entryZoneText:      kl.entryZoneText,

    // Classified factor keys
    factorGroups: {
      trend:               trend,
      momentum:            momentum,
      reversal:            reversal,
      smartMoney:          smCategory,
      smartMoneyDirection: smDirection,
    },

    // Original status strings for display
    factorLabels: {
      trend:      trendStatus  || 'N/A',
      momentum:   momStatus    || 'N/A',
      reversal:   revStatus    || 'N/A',
      smartMoney: smfStatus    || 'N/A',
    },

    // Internal scores — developer/debug ONLY, never shown publicly
    debugScores: {
      trendScore:    snapshot.trend         && snapshot.trend.score,
      momentumScore: snapshot.momentum      && snapshot.momentum.score,
      reversalScore: snapshot.reversalWatch && snapshot.reversalWatch.score,
      smfScore:      smf && smf.score,
      smfToday:      smf && smf.todayActivityScore,
      smfFiveDay:    smf && smf.fiveDayFlowScore,
      smfThirtyDay:  smf && smf.thirtyDayAccumulationScore,
    },
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
