RUN 11 — Simplify Force Strike Table + Score Drilldown + Flat Audit

Objective:
Simplify #forcestrike table and make the three decision scores explainable.

Table should show only:

Ticker
Pattern Chart
Pattern
Trigger
Trigger Bar
FS Score
Trade Stars
Technical Support
Scenario
Actions

Remove separate Trend / Momentum / Reversal / Money Flow columns from the main table.

Keep them inside Technical Support drilldown.

---

Clickable Score Drilldown

Make these clickable:

1. FS Score
2. Trade Stars
3. Technical Support

When clicked, open a compact popover/modal/expanded panel.

---

FS Score Drilldown

Show:

Force Strike Score
★★★★★
12 pts

Breakdown:
Trigger Type: Mark Up (+2)
Scenario: Shakeout Reversal (+4)
Trigger Position: Bar 5 (+3)
Mother Expansion: 1.59x (+1)
Mother Range Interaction (+2)

Also show mandatory lifecycle:
✓ Mother
✓ Baby inside Mother Range
✓ Manipulation below Mother Low
✓ Reclaim above Mother Low
✓ EXE Trigger

---

Trade Stars Drilldown

Show:

Trade Quality
★★★★☆

Entry:
Trigger High

Stop:
Mother Low

Risk:
Entry - Stop

Risk %:
((Entry - Stop) / Entry) × 100

ATR(14):
value

Risk / ATR:
value

Target:
Entry + 1.7R

Reward/Risk:
1 : 1.7

Trade Status:
Fresh / Extended / Smelly / Unknown

Explain star logic:
★★★★★ = Risk ≤ 1 ATR
★★★★ = Risk ≤ 1.5 ATR
★★★ = Risk ≤ 2 ATR
★★ = Risk ≤ 3 ATR
★ = Risk > 3 ATR

---

Technical Support Drilldown

Show:

Technical Support
Strong / Moderate / Weak / Conflicting

Support Stars:
★★★★★ / ★★★★☆ / ★★★☆☆ / ★★☆☆☆ / ★☆☆☆☆

Breakdown:
Trend: Strong Uptrend
Momentum: Neutral
Reversal: Bullish Reversal Triggered
Money Flow: Quiet + Cooling

Explain:
Why this was Strong / Moderate / Weak / Conflicting.

Suggested support star mapping:
Strong = ★★★★★
Moderate = ★★★☆☆
Weak = ★★☆☆☆
Conflicting = ★☆☆☆☆

---

Audit TXT Flat File Requirement

Keep detailed audit, but add a flat section at the top:

FLAT VALID RESULTS CSV

One row per valid ticker.

Columns:

scanId
generatedAt
ticker
result
includedInTop20
volume

pattern
triggerType
triggerPosition
scenario

fsStars
fsScore
fsTriggerPts
fsScenarioPts
fsTriggerPositionPts
fsMotherExpansionPts
fsMotherInteractionPts

tradeStars
entry
stop
risk
riskPct
atr14
riskAtr
target
rewardRisk
tradeStatus

technicalSupport
technicalSupportStars
trend
momentum
reversal
moneyFlow

motherDate
motherOpen
motherHigh
motherLow
motherClose
motherRange
motherBody
motherRangeExpansion
motherBodyExpansion
motherQualifiedBy

babyDate
babyOpen
babyHigh
babyLow
babyClose
babyInsideMotherRange

manipulationDate
manipulationOpen
manipulationHigh
manipulationLow
manipulationClose
manipulationBreakAmount
manipulationBreakPct

triggerDate
triggerOpen
triggerHigh
triggerLow
triggerClose
triggerRange
triggerBody
triggerClosePositionPct

pinResult
muResult
iceResult
selectedExe
exeConfidence

barsSinceTrigger
barsSinceMother

finalReason

CSV rules:
- Use comma-separated values.
- Escape commas in text fields with quotes.
- Use one header row.
- Include only valid triggered results in this flat CSV section.
- Keep the existing detailed per-ticker audit below it.

---

Success Criteria

✅ Main table simplified  
✅ FS Score clickable  
✅ Trade Stars clickable  
✅ Technical Support clickable  
✅ Trend/Momentum/Reversal/Money Flow moved out of main table  
✅ Audit TXT includes flat CSV-style section  
✅ Flat audit has all scoring and OHLC validation data  
✅ Existing detailed audit remains available  
✅ Force Strike detection logic unchanged  
