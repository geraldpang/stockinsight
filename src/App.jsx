You are working on the NervousGeek / StockInsight project.

Latest baseline:
- App.jsx = current latest file
- technicalSignals.js = latest file
- ruleBasedAnalytics.js = latest file

Issue:
The left-panel expanded Reversal card does not provide meaningful information.

Observed current behaviour:
When the left-panel Reversal pill/card is expanded, it shows something like:

REVERSAL EVIDENCE

Bullish and bearish signals are conflicting.

No reversal evidence currently detected.

Mixed Reversal Signals
Watch whether price confirms the reversal with follow-through volume.

Full Detail

Problem:
This is not useful enough for users.
It also feels contradictory:
- The main status says “Mixed Signals”
- But the expanded evidence says “No reversal evidence currently detected”

If the signal is “Mixed Signals”, it should explain that bullish and bearish evidence are conflicting, not say that no evidence exists.

Objective:
Improve the expanded Reversal card in the left panel so it explains:
1. What the reversal signal means
2. What the current signal is
3. What evidence was detected
4. What the user should watch next

This is a UI/content improvement only.

Do NOT change:
- reversal scoring logic
- reversal calculation logic
- technicalSignals.js calculation logic
- ruleBasedAnalytics logic
- backend/API routes
- database schema
- journal schema

Only update App.jsx unless there is a clear display helper issue.

---

## Required Reversal expanded-card structure

Use this structure:

Reversal Evidence

What it means
[1 short plain-English sentence]

Current Signal
[full reversal status]

Detected Evidence
[only detected reversal evidence]

Watch Next
[1 short plain-English sentence]

Full Detail

---

## Wording by reversal status

Use plain English and avoid financial advice.

Recommended “What it means” wording:

### Bullish early stages

For:
- Bullish Reversal Watch
- Bullish Reversal Spark
- Bullish Reversal Setup

Use:
“Early bullish reversal evidence is appearing, but confirmation is still needed.”

### Bullish developing stages

For:
- Bullish Reversal Forming
- Bullish Reversal Triggered

Use:
“Bullish reversal conditions are developing and need follow-through.”

### Bullish confirmed stages

For:
- Bullish Reversal Confirming
- Bullish Reversal Confirmed

Use:
“Bullish reversal evidence has strengthened and is now more clearly supported.”

### Bearish early stages

For:
- Bearish Reversal Watch
- Bearish Reversal Setup

Use:
“Early bearish reversal evidence is appearing, but confirmation is still needed.”

### Bearish developing stages

For:
- Bearish Reversal Forming
- Bearish Reversal Triggered

Use:
“Bearish reversal conditions are developing and need follow-through.”

### Bearish confirmed stages

For:
- Bearish Reversal Confirming
- Bearish Reversal Confirmed

Use:
“Bearish reversal evidence has strengthened and downside pressure is more clearly supported.”

### Mixed Reversal Signals

Use:
“Bullish and bearish reversal evidence are both present, so the signal is not yet decisive.”

Important:
For Mixed Reversal Signals, do NOT say:
“No reversal evidence currently detected.”

Instead say:
“No clear reversal trigger has been confirmed yet.”
or, if evidence exists, list the bullish and bearish evidence separately.

### No Clear Reversal

Use:
“No meaningful reversal evidence has been detected yet.”

### Not Enough Data

Use:
“There is not enough recent price data to assess reversal evidence reliably.”

---

## Detected Evidence section

The Detected Evidence section should show only evidence that is actually detected.

Do not show missing checklist items.

If the existing reversal data has detected signal arrays, use them.

Possible data sources to inspect:
- snapshot.reversalWatch
- reversalWatch.reversalDecision
- reversalWatch.bullishSignals
- reversalWatch.bearishSignals
- reversalWatch.signals
- reversalWatch.detectedSignals
- reversalWatch.reversalArr
- window.__revArr3
- any helper currently used in the full Reversal tab

Use the same data source as the full Reversal tab if possible.

---

## Evidence grouping

If data allows, group evidence into:

1. Setup
2. Trigger
3. Confirmation

Example:

Detected Evidence

Setup
✓ Higher low forming

Trigger
✓ MACD histogram turning up
✓ Close above 20D average

Confirmation
✓ Higher high / higher low structure detected

If grouping is not available, group by direction:

Bullish Evidence
✓ MACD histogram turning up
✓ Close above 20D average

Bearish Evidence
✓ MACD histogram turning down
✓ Close below 20D average

If neither grouping nor directional arrays are available:
- Do not invent evidence.
- Show:
  “No clear reversal trigger has been confirmed yet.”

---

## Mixed Signals behaviour

For Mixed Reversal Signals:

If bullish and bearish detected evidence are available, show both:

What it means
Bullish and bearish reversal evidence are both present, so the signal is not yet decisive.

Current Signal
Mixed Reversal Signals

Detected Evidence

Bullish Evidence
✓ [detected bullish evidence]

Bearish Evidence
✓ [detected bearish evidence]

Watch Next
Watch whether price breaks higher or lower with follow-through volume.

If no specific evidence arrays are available, show:

Detected Evidence
No clear reversal trigger has been confirmed yet.

Do not say:
“No reversal evidence currently detected.”

---

## No Clear Reversal behaviour

For No Clear Reversal:

What it means
No meaningful reversal evidence has been detected yet.

Current Signal
No Clear Reversal

Detected Evidence
No clear reversal setup, trigger, or confirmation has been detected.

Watch Next
Watch for a clear break in price direction supported by volume.

---

## Watch Next wording

Use status-aware wording:

Bullish statuses:
“Watch whether price follows through above nearby resistance with supportive volume.”

Bearish statuses:
“Watch whether price confirms downside follow-through with increased selling pressure.”

Mixed:
“Watch whether price breaks higher or lower with follow-through volume.”

No clear / not enough data:
“Watch for a clear reversal setup, trigger, and confirmation before drawing conclusions.”

Keep this short in the side panel.

---

## Colour consistency

Use existing platform colour logic:

- Bullish Reversal Watch / Spark / Setup = blue
- Bullish Reversal Forming / Triggered / Confirming / Confirmed = green
- Bearish Reversal Watch / Setup = amber
- Bearish Reversal Forming / Triggered / Confirming / Confirmed = red
- Mixed Reversal Signals = amber
- No Clear Reversal / Not Enough Data = grey

Use existing helpers such as:
- revStatusColor()
- summaryCardDark()
- revDirLabelColor()

Do not introduce conflicting colours.

---

## Layout requirements

The expanded card should remain compact and mobile-friendly.

Use:
- clear section labels
- short lines
- small evidence rows
- no large tables
- no raw scores
- no overlong technical paragraphs

If using flex rows:
- allow text to wrap
- avoid clipping
- avoid fixed heights that cut off text
- use lineHeight around 1.35
- use minWidth: 0 where needed

---

## Full Detail button

Keep the existing Full Detail button.

Ensure:
- clicking Full Detail navigates to the Reversal tab
- on mobile, clicking the Reversal card itself only expands/collapses
- clicking Full Detail should use e.stopPropagation() if needed so it does not accidentally toggle the parent card

Do not change the mobile side-panel behaviour beyond this.

---

## Validation examples

Example 1 — Mixed Signals

Expected expanded card:

Reversal Evidence

What it means
Bullish and bearish reversal evidence are both present, so the signal is not yet decisive.

Current Signal
Mixed Reversal Signals

Detected Evidence
No clear reversal trigger has been confirmed yet.
(or show bullish/bearish detected evidence if available)

Watch Next
Watch whether price breaks higher or lower with follow-through volume.

Full Detail

Example 2 — Bearish Reversal Triggered

Expected expanded card:

Reversal Evidence

What it means
Bearish reversal conditions are developing and need follow-through.

Current Signal
Bearish Reversal Triggered

Detected Evidence
[show detected bearish items only]

Watch Next
Watch whether price confirms downside follow-through with increased selling pressure.

Example 3 — Bullish Reversal Watch

Expected expanded card:

Reversal Evidence

What it means
Early bullish reversal evidence is appearing, but confirmation is still needed.

Current Signal
Bullish Reversal Watch

Detected Evidence
[show detected bullish items only]

Watch Next
Watch whether price follows through above nearby resistance with supportive volume.

---

## Validation

After implementation:

1. Run npm run build or vite build.
2. Confirm no syntax errors.
3. Confirm Reversal expanded card no longer says “No reversal evidence currently detected” when status is Mixed Reversal Signals.
4. Confirm Mixed Signals has meaningful explanation.
5. Confirm Bullish/Bearish statuses have status-aware explanation.
6. Confirm only detected evidence is shown.
7. Confirm no missing checklist items are shown.
8. Confirm Full Detail still opens the Reversal tab.
9. Confirm mobile behaviour remains:
   - tap card = expand/collapse only
   - tap Full Detail = navigate to Reversal tab
10. Confirm no reversal calculation logic was changed.

Output:
Provide a concise summary of:
- root cause of poor Reversal expanded wording
- functions/components changed
- evidence data source used
- wording changes added
- mobile Full Detail behaviour confirmed
- build result

Keep changes small and safe.
