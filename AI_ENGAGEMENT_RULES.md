# nervousgeek.com -- AI Engagement Rules

## Project Identity
- **App name:** nervousgeek.com
- **Domain:** nervousgeek.com
- **GitHub:** https://github.com/geraldpang/stockinsight
- **Production URL:** https://nervousgeek.com
- **Staging URL:** https://staging.nervousgeek.com
- **Platform:** Cloudflare Pages
- **Clerk app name:** nervousgeek
- **Stack:** React + Vite, single App.jsx file, inline styles only (no CSS files)

---

## Rule 1 -- Mockup Before Implementation

**For any change involving layout or visual presentation, always provide a mockup for approval before writing any code.**

This applies to:
- New UI components or cards
- Changes to existing card layout, sizing or spacing
- Colour changes to UI elements
- Label or text format changes that affect visual appearance
- Grid or flex layout restructuring
- New pill boxes, badges, banners or indicators

Only proceed to code implementation after explicit confirmation from the user.

---

## Rule 2 -- Code Quality

1. No non-ASCII characters -- use String.fromCharCode() for special chars
2. Verify brace balance (0 diff required)
3. No self-closing <div /> -- always use <div></div>
4. React hooks must be at component level, never inside IIFEs
5. Use var not const/let inside IIFEs (esbuild compatibility)
6. Always run python3 sanity check: braces + non-ASCII + line count
7. Always quote object keys in NAMES and similar dicts

---

## Rule 3 -- Single Source of Truth for Calculations

All IV calculations computed once in vals block, stored in shared *Calc objects.

---

## Rule 4 -- Analysis Before Fixing

Analyse root cause before proposing fix. Verify financial formula changes with Python.

---

## Rule 5 -- Version Management

- Current stable version: v1.35 (App.jsx)
- Worker stable: path-v1.21.js
- Output: /mnt/user-data/outputs/
- Branch strategy:
  - main branch -> nervousgeek.com (production)
  - staging branch -> staging.nervousgeek.com (testing)
- KV namespaces: CACHE (production), CACHE_STAGING (staging)

---

## Rule 6 -- Colour System

Dark pill (summary cards):
- Green strong: bg #1e2a1e / border #2a5020 / fg #7abd00
- Amber:        bg #2a2010 / border #4a3810 / fg #EF9F27
- Red:          bg #2a1e1e / border #4a2020 / fg #e05050
- Grey:         bg #222    / border #333    / fg #444

Light pill (tab banners):
- Green:  bg #EAF3DE / border #7abd00 / fg #1a6a1a
- Amber:  bg #FAEEDA / border #d4a800 / fg #b88000
- Red:    bg #FCEBEB / border #e08080 / fg #c03030

Brand: LIME=#c8f000  ORANGE=#F05A1A  BG=#0e0e0c  Sidebar=#1c1c1e

---

## Rule 7 -- Intrinsic Value 5-Tier System

| Label | Condition | Score | Colour |
|---|---|---|---|
| Exceptional | Undervalued > 20% | 5 | Green #7abd00 |
| Undervalued | Undervalued 5-20% | 4 | Green #7abd00 |
| Fair | Undervalued 0-5% | 3 | Light green |
| Premium | Overvalued 0-10% | 2 | Amber #EF9F27 |
| Overvalued | Overvalued > 10% | 1 | Red #e05050 |

---

## Rule 8 -- Clerk Auth

- Clerk app: nervousgeek
- Prod Publishable Key: pk_live_Y2xlcmsubmVydm91c2dlZWsuY29tJA
- Production domain: nervousgeek.com
- Prod JWKS URL: https://clerk.nervousgeek.com/.well-known/jwks.json
- Token stored in window.__clerkToken

---

## Rule 9 -- Ticker Coverage

- Free (no login, AI included): NVDA, AAPL, MSFT, AMZN, GOOGL, AVGO, META, TSLA, LLY, BRKB
- Premium (login + subscription): all other S&P 500 tickers
- var FREE_TICKERS declared at module level -- always use local var, not window.FREE_TICKERS

---

## Rule 10 -- index.html Clerk Scripts

Production index.html must include in <head>:
```html
<script defer crossorigin="anonymous"
  src="https://clerk.nervousgeek.com/npm/@clerk/ui@1/dist/ui.browser.js">
</script>
<script defer crossorigin="anonymous"
  data-clerk-publishable-key="pk_live_Y2xlcmsubmVydm91c2dlZWsuY29tJA"
  src="https://clerk.nervousgeek.com/npm/@clerk/clerk-js@6/dist/clerk.browser.js">
</script>
```

---

## Rule 11 -- AI Usage (APPROVED CLAUDE CALLS ONLY)

**Only the following 3 approved Claude calls + 1 on-demand. Any new AI requirement must be discussed before implementation.**

| # | Call | Tab | Cache TTL | Audience |
|---|---|---|---|---|
| 1 | **Moat Analysis** | Economic Moat tab | 30 days | Paid + free tickers |
| 2 | **Fundamental AI** | AI Analysis tab | 30 days | Paid + free tickers |
| 3 | **Technical AI** | AI Analysis tab | 1 day | Paid + free tickers |
| 4 | **10-K Buffett Analysis** | Business tab (on-demand) | Session | Paid only |

**Prompt philosophy:**
- All prompts written for layman investors -- no jargon without explanation
- Missing data shows as N/A -- never blocks prompt from being sent
- All data extraction wrapped in try/catch
- Key Strength / Key Risk: 1-2 sentences plain English
- Summary: 2-3 sentences plain English
- max_tokens: Fundamental AI = 1200, Technical AI = 600

**AI trigger architecture:**
- Fund AI: polling interval every 2s, waits for ov + massive + moat cached, fires after 40s regardless
- Tech AI: fires directly in massive fetch callback, fallback in fund polling interval
- Both: allow free tickers regardless of isPaid status
- isPaid OR free ticker = AI allowed

---

## Rule 12 -- Left Panel Structure (v1.35)

```
[AI ANALYSIS]              <- lime header, PREMIUM badge
  [Fundamental AI]  [Technical AI]   <- colored pills by verdict

[FUNDAMENTAL ANALYSIS]     <- neutral dark card #1e1e1e
  [Economic Moat]  [Intrinsic Value]
  [Financial Strength]     <- flat pills, #2c2c2e border

[TECHNICAL ANALYSIS]       <- neutral dark card #1e1e1e
  [Trend + CAUTION?] [Momentum + CAUTION?]
  [Reversal Detection]     <- shows Bull X/5 + Bear X/5
```

---

## Rule 13 -- Technical Analysis Tabs (v1.35)

**Trend tab:**
- Summary banner (score/100, label, dots, plain English)
- 5 signals: WSMA, SMA200, SMA50, Golden/Death Cross, 52-week position
- Each signal: colored value, direction arrow (up/down/flat), context box, watch alert
- Overbought badges: SMA200 >25% extended, 52-week >95%

**Momentum tab:**
- Summary banner (score/100, label, dots, plain English)
- 3 signals: RSI, MACD, EMA20 -- each with dots, direction arrow, context, overbought badge
- Volume Analysis section: ratio, price+volume signal, VWAP, spike detection, accumulation/distribution

**Reversal tab:**
- Summary banner: side-by-side Bullish X/5 (green) + Bearish X/5 (red)
- Bullish signals (5): RSI Divergence, MACD Turning Up, Weekly SMA Cross (bull), RSI Base, 52W Low Base
- Bearish signals (5): RSI Bearish Divergence, MACD Turning Down, Weekly SMA Cross (bear), RSI Overbought Stalling, 52W High Base
- All 10 signals always shown -- active ones expand with What + Why it matters

**Volume tab:**
- Bullish X/5 + Bearish X/5 summary banner
- 5 bullish + 5 bearish volume signals with What + Why it matters

**Whale Tracker tab:**
- Whale Pressure score (-100 to +100) from 4 signals: Options OI skew, Options Vol skew, Volume spike, Insider buying
- Top 10 contracts by open interest table
- Institutional footprint: Institution %, Insider %, Short % Float
- Data source: Polygon /options endpoint

---

## Rule 14 -- Stripe Payments

- Monthly plan: price_1TLEJoETaGzjK4K2F4TdQqU6 ($10/mo)
- Annual plan:  price_1TLELbETaGzjK4K22khmlNIc ($96/yr)
- Cloudflare env var: STRIPE_SECRET_KEY
- Checkout requires valid Clerk token (user must be signed in first)

---

## Rule 15 -- Version Numbering

**Every new App.jsx output must increment the version number.**

- Current version: v1.35
- Format: v1.XX (increment minor by 1 on every output)
- Version appears in 3 places in App.jsx:
  1. Detail page desktop nav -- below "NervousGeek" label (fontSize 9, subdued)
  2. Detail page mobile nav -- below "NervousGeek" label (fontSize 9, subdued)
  3. Landing page logo -- below "nervousgeek" wordmark (fontSize 9, subdued lime)
- When starting a new chat, read the version currently in App.jsx and increment from there
- Never reuse the same version number across different outputs

---

## Rule 16 -- Economic Moat Labels

Moat scores use a 5-level scale (consistent across left panel pill and detail tab):

| Score | Label |
|---|---|
| 5 | Wide |
| 4 | Strong |
| 3 | Moderate |
| 2 | Narrow |
| 1 | Weak |

All three parsers must use this mapping: keyword detector, parseMoat() classification, and scoreLabel() in the detail tab.

---

## Rule 17 -- Landing Page Sections (v1.35)

Below the hero/search section, the landing page shows (when AI signals are available):

**AI Favourites** (left, 3fr):
- 2-column card grid of Buy/Strong Buy stocks
- Lime colour for Strong Buy, blue (#60b8f0) for Buy
- Click card navigates to stock detail

**Market News** (right, 2fr):
- News fetched from Massive/Polygon for top 4 AI-rated tickers
- Shows ticker badge, headline, source, date
- Sorted by date descending, max 8 items shown

Both sections only render when tickerSignals.length > 0.
