Please refine the new #JOURNAL page based on the current output.

Current issue:
The Journal table is cleaner now, but Money Flow is still separated from Technical View. Also, the journal should support actual trade tracking by adding purchase price and purchase return. We also need Force Strike included as part of the signal snapshot.

Required changes:

1. Move Money Flow into Technical View
In the Journal tab table, remove the separate Money Flow column.

Technical View should now show all 4 technical factors:
T: Trend
M: Momentum
R: Reversal
F: Flow

Example:
T: Strong Uptrend
M: Building
R: Bull Watch
F: Constructive

Use compact labels where possible:
- Strong Multi-Timeframe Flow → Strong Flow
- Accumulation Trend Positive → Accumulating
- Early Accumulation → Early Accum.
- Constructive but Cooling → Constructive
- Short-Term Spike → ST Spike
- No Clear Signal / No Sustained Flow → No Signal

Keep the colour coding:
- Trend uses existing trend colour logic
- Momentum uses existing momentum colour logic
- Reversal uses revStatusColor()
- Money Flow uses smfStatusColor()

2. Add Force Strike into Technical View
Add a fifth optional line inside Technical View:

FS: ★★★★ / Active / None / N/A

Display rules:
- If Force Strike data exists for the row, show FS status and/or stars.
- If no Force Strike setup exists, show FS: None.
- If data is unavailable, show FS: N/A.

Example:
T: Uptrend
M: Strong
R: Bull Watch
F: Accumulating
FS: ★★★★

Keep it compact. Do not add a new main table column unless there is not enough space.

If Force Strike details are available, allow click/hover/expand to show:
- FS Score
- Trade Stars
- Pattern Age
- Entry
- Stop
- Risk %
- ATR(14)
- Risk / ATR
- Target
- Technical Support

Important:
Do not recalculate Force Strike inside JournalPage if existing Force Strike logic already exists elsewhere.
Prefer storing or reading Force Strike snapshot fields from the journal row.
Use tolerant helper functions because row field names may differ.

Add helper:
getForceStrike(row)

It should safely read possible fields such as:
row.forceStrike
row.force_strike
row.fs
row.fsScore
row.fs_score
row.tradeStars
row.trade_stars
row.patternAge
row.pattern_age
row.technicalSupport
row.technical_support

3. Add Purchase Price
Add a new editable field/column:
Purchase Price

Table columns should become:

Date
Ticker
Close
Purchase Price
Technical View
Return
Purchase Return
Outcome
Actions

Purchase Price behaviour:
- Default blank if user has not entered a purchase price.
- User can enter/edit purchase price directly in the Journal row.
- Save purchase price to backend if /journal supports update.
- If backend does not currently support update, add a safe /journal update action that only updates purchase_price for a specific journal row.
- Do not break existing D1 rows.

Use tolerant field names:
purchasePrice
purchase_price
entryPrice
entry_price

4. Add Purchase Return
Add a calculated column:
Purchase Return

Formula:
If purchase price exists and current/latest price exists:
Purchase Return % = ((latest price - purchase price) / purchase price) * 100

Display:
+5.2%
-3.1%
—

Use latest price if available.
Fallback order:
- row.latestPrice
- row.currentPrice
- row.close
- selected return window close if available

Colour:
- Positive = green
- Negative = red
- Missing = grey

This is different from signal return:
- Return = historical signal return based on selected 5D/10D/20D/30D/90D window
- Purchase Return = user’s actual trade return from entered purchase price

5. Outcome should consider selected signal return, not purchase return
Keep Outcome based on selected return window:
- Strong Win: return >= +5%
- Win: return > 0% and < +5%
- Neutral: return between -1% and 0%
- Failed: return < -1% and > -5%
- Strong Failed: return <= -5%
- Pending: return not available

Purchase Return is shown separately and should not override Outcome.

6. Add Summary KPI for Purchase Tracking
Add one extra KPI card:
Open Trade Return

Definition:
Average purchase return across rows where purchase price exists and latest/current price is available.

If no purchase prices are entered, show —
Subtitle:
based on purchase price

7. Update Setup Performance tab
Setup Performance should continue to use signal returns, not purchase returns.

8. Update Ticker Review tab
Ticker Review should include:
- Avg Signal Return
- Avg Purchase Return
- Last Purchase Return

9. Mobile
On mobile card layout, show:
Ticker / Date
Close
Purchase Price
Technical View including T/M/R/F/FS
Signal Return
Purchase Return
Outcome
Actions

10. CSV Export
CSV export must include:
- purchase_price
- purchase_return_pct
- force_strike_status
- force_strike_score
- trade_stars
- technical_support

11. Build and Safety
Run npm run build.
Do not add any new AI calls.
Do not remove existing journal loading, watchlist, add ticker, refresh all, update returns, or export CSV behaviour.
Do not change route structure.
