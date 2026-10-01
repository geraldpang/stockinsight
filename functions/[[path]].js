export async function onRequest(context) {
  const url    = new URL(context.request.url);
  const target = url.searchParams.get("url");
  const UA     = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  async function getYahooCrumb(sym) {
    var quoteUrl = sym ? "https://finance.yahoo.com/quote/" + sym + "/" : "https://finance.yahoo.com/";
    const homeRes = await fetch(quoteUrl, {
      headers: {
        "User-Agent":      UA,
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    const rawCookie = homeRes.headers.get("set-cookie") || "";
    const cookies   = rawCookie.split(/,(?=[^ ].*?=)/).map(c => c.split(";")[0].trim()).join("; ");
    const crumbRes  = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: {
        "User-Agent": UA,
        "Accept":     "*/*",
        "Cookie":     cookies,
        "Referer":    "https://finance.yahoo.com/",
      },
    });
    const crumb = (await crumbRes.text()).trim();
    return { crumb, cookies };
  }

  function fmtAmt(v) {
    if (v == null || v === 0) return "-";
    var a = Math.abs(v);
    if (a >= 1e12) return (v < 0 ? "-$" : "$") + (a / 1e12).toFixed(2) + "T";
    if (a >= 1e9)  return (v < 0 ? "-$" : "$") + (a / 1e9).toFixed(1)  + "B";
    if (a >= 1e6)  return (v < 0 ? "-$" : "$") + (a / 1e6).toFixed(0)  + "M";
    return (v < 0 ? "-$" : "$") + a.toFixed(2);
  }

  // ── adjustEpsForSplits (v2.249) ── used by /eps ───────────────────────────
  // rows: newest first { year, epsRaw, endDate, ni }. splits: [{ date, factor }].
  // currentShares: today's share count (post every split) from Yahoo, or null.
  // For each row, F = product of split factors dated AFTER its endDate.
  // Implied shares = ni / epsRaw. If implied shares * F is closer (log scale)
  // to today's share count than implied shares alone, the row is as-reported
  // -> eps = epsRaw / F. Otherwise it was already split-adjusted -> unchanged.
  // Without currentShares the newest row is the reference (fine unless a split
  // happened after the latest fiscal year). If the check cannot run (no NI,
  // NI and EPS of opposite sign) the row is left unchanged, flagged
  // "undetermined" in splitCheck.
  function adjustEpsForSplits(rows, splits, currentShares) {
    if (!rows.length) return [];
    var refShares = currentShares > 0 ? currentShares
                  : (rows[0].ni && rows[0].epsRaw ? rows[0].ni / rows[0].epsRaw : null);
    return rows.map(function(r) {
      var F = 1;
      for (var i = 0; i < splits.length; i++) if (splits[i].date > r.endDate) F *= splits[i].factor;
      if (F === 1) return Object.assign({}, r, { eps: r.epsRaw, adjFactor: 1, splitCheck: "no-later-split" });
      var shares = (r.ni && r.epsRaw) ? r.ni / r.epsRaw : null;
      if (!refShares || !shares || refShares <= 0 || shares <= 0) {
        return Object.assign({}, r, { eps: r.epsRaw, adjFactor: 1, splitCheck: "undetermined" });
      }
      var dAsIs = Math.abs(Math.log(refShares / shares));
      var dAdj  = Math.abs(Math.log(refShares / (shares * F)));
      return dAdj < dAsIs
        ? Object.assign({}, r, { eps: r.epsRaw / F, adjFactor: 1 / F, splitCheck: "adjusted-x" + F })
        : Object.assign({}, r, { eps: r.epsRaw, adjFactor: 1, splitCheck: "already-adjusted" });
    });
  }


  try {

    // Only handle specific API routes -- pass everything else to the React app
    var knownRoutes = ["/proxy", "/anthropic", "/eps", "/cache", "/simfin", "/stripe", "/watchlist"];
    var isApiRoute  = false;
    for (var ri = 0; ri < knownRoutes.length; ri++) {
      if (url.pathname === knownRoutes[ri] || url.pathname.startsWith(knownRoutes[ri])) {
        isApiRoute = true;
        break;
      }
    }
    if (!isApiRoute) {
      return context.next();
    }

    // -------------------------------------------------------------------------
    // Clerk JWT verification for premium ticker routes
    // Free tickers bypass auth. Premium tickers require a valid Clerk session.
    // -------------------------------------------------------------------------
    var FREE_TICKERS_W = ["NVDA","AAPL","MSFT","AMZN","GOOGL","AVGO","META","TSLA","LLY","BRKB"];
    var PREMIUM_ROUTES = ["/anthropic", "/simfin"];
    var isPremiumRoute = PREMIUM_ROUTES.indexOf(url.pathname) !== -1;
    var reqSym = (url.searchParams.get("sym") || "").toUpperCase().trim();
    var isFreeTickerReq = FREE_TICKERS_W.indexOf(reqSym) !== -1 || reqSym === "";

    async function verifyClerkToken(request, clerkSecretKey) {
      try {
        var authHeader = request.headers.get("Authorization") || "";
        var token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return false;
        // Verify JWT against Clerk JWKS
        var jwksUrl = "https://clerk.nervousgeek.com/.well-known/jwks.json";
        var jwksRes = await fetch(jwksUrl);
        var jwks = await jwksRes.json();
        // Decode JWT header to get kid
        var parts = token.split(".");
        if (parts.length !== 3) return false;
        var header = JSON.parse(atob(parts[0].replace(/-/g,"+").replace(/_/g,"/")));
        var key = (jwks.keys || []).find(function(k) { return k.kid === header.kid; });
        if (!key) return false;
        // Import key and verify
        var cryptoKey = await crypto.subtle.importKey(
          "jwk", key,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false, ["verify"]
        );
        var enc = new TextEncoder();
        var signingInput = enc.encode(parts[0] + "." + parts[1]);
        var sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g,"+").replace(/_/g,"/")), function(c){ return c.charCodeAt(0); });
        var valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, sigBytes, signingInput);
        if (!valid) return false;
        // Check expiry
        var payload = JSON.parse(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/")));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;
        return true;
      } catch(e) {
        return false;
      }
    }

    if (isPremiumRoute && !isFreeTickerReq) {
      // Admin key bypass — journal snapshot generation
      var adminKeyCheck = context.env.ADMIN_KEY || "stockinsight-admin";
      var reqAdminKey   = context.request.headers.get("X-Admin-Key") || "";
      var isAdminBypass = reqAdminKey === adminKeyCheck;

      if (!isAdminBypass) {
        var clerkSecretKey = context.env.CLERK_SECRET_KEY;
        var isAuthed = await verifyClerkToken(context.request, clerkSecretKey);
        if (!isAuthed) {
          return new Response(JSON.stringify({ error: "Unauthorised. Please sign in to access this ticker." }), {
            status: 401,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
      }
    }

    if (context.request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Stripe-Signature",
        },
      });
    }


    // -------------------------------------------------------------------------
    // /cache  -- Cloudflare KV cache read/write for AI insights
    // GET  /cache?sym=NVDA&tab=moat        -> read from KV
    // POST /cache?sym=NVDA&tab=moat        -> write to KV (body = insight text)
    // GET  /cache?action=config            -> read live_tickers config
    // POST /cache?action=config            -> write live_tickers config (body = JSON array)
    // -------------------------------------------------------------------------
    if (url.pathname === "/cache") {
      var CACHE = context.env.CACHE;
      if (!CACHE) {
        return new Response(JSON.stringify({ error: "CACHE KV not bound" }), {
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      var action = url.searchParams.get("action") || "";
      var sym    = (url.searchParams.get("sym") || "").toUpperCase().trim();
      var tab    = (url.searchParams.get("tab") || "").toLowerCase().trim();

      // ── Config: read/write live_tickers list ──────────────────────────────
      if (action === "config") {
        if (context.request.method === "POST") {
          var cfgBody = await context.request.text();
          await CACHE.put("config:live_tickers", cfgBody, { expirationTtl: 60 * 60 * 24 * 365 });
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        } else {
          var cfgVal = await CACHE.get("config:live_tickers");
          var cfgParsed = null;
          try { cfgParsed = cfgVal ? JSON.parse(cfgVal) : []; } catch(e) { cfgParsed = []; }
          return new Response(JSON.stringify({ ok: true, value: cfgParsed }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
      }

      // ── Stats: list all cached insight keys with metadata ─────────────────
      if (action === "stats") {
        var listed = await CACHE.list({ prefix: "insight:" });
        // Fetch all values in parallel for speed
        var names   = listed.keys.map(function(k) { return k.name; });
        var fetches = names.map(function(n) { return CACHE.get(n).catch(function(){ return null; }); });
        var vals    = await Promise.all(fetches);
        var keys    = names.map(function(kname, ki) {
          var kval     = vals[ki];
          var cachedAt = null;
          var size     = null;
          if (kval) {
            try {
              var kparsed = JSON.parse(kval);
              if (kparsed && kparsed.text) {
                cachedAt = kparsed.cachedAt || null;
                size     = kparsed.size || kparsed.text.length;
              } else {
                size = kval.length;
              }
            } catch(e) {
              size = kval.length;
            }
          }
          return { key: kname, cachedAt: cachedAt, size: size, exists: kval ? true : false };
        });
        return new Response(JSON.stringify({ ok: true, keys: keys, count: keys.length }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // ── Require sym + tab for read/write ──────────────────────────────────
      if (!sym || !tab) {
        return new Response(JSON.stringify({ error: "Missing sym or tab", sym: sym, tab: tab }), {
          status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      var cacheKey = "insight:" + sym + ":" + tab;

      // TTL per tab type
      var TTL_MAP = {
        "moat":           60 * 60 * 24 * 90,  // 90 days - moat rarely changes
        "financial":      60 * 60 * 24 * 30,  // 30 days - quarterly earnings cycle
        "aiinsight":      60 * 60 * 24 * 7,   // 7 days  - keep current
        "technical":      60 * 60 * 24 * 1,   // 1 day   - technical is short-term
        "business":       60 * 60 * 24 * 30,  // 30 days - business desc rarely changes
        "ai-fund":        60 * 60 * 24 * 30,  // 30 days - fundamental AI analysis
        "ai-tech":        60 * 60 * 24 * 1,   // 1 day   - technical AI analysis
      };
      var cacheTtl = TTL_MAP[tab] || 60 * 60 * 24 * 7;

      // ── Write: store insight with metadata wrapper ────────────────────────
      if (context.request.method === "POST") {
        var bodyText = await context.request.text();
        var cachedAt = new Date().toISOString();
        var wrapped  = JSON.stringify({ text: bodyText, cachedAt: cachedAt, size: bodyText.length });
        await CACHE.put(cacheKey, wrapped, { expirationTtl: cacheTtl });
        return new Response(JSON.stringify({ ok: true, key: cacheKey, cachedAt: cachedAt, size: bodyText.length }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // ── Read: unwrap metadata if present ──────────────────────────────────
      // Delete: clear all cached insights for a ticker
      if (context.request.method === "DELETE") {
        var delTabs = ["moat", "financial", "aiinsight", "ai-fund", "ai-tech"];
        for (var di = 0; di < delTabs.length; di++) {
          await CACHE.delete("insight:" + sym + ":" + delTabs[di]);
        }
        return new Response(JSON.stringify({ ok: true, sym: sym }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      var cached = await CACHE.get(cacheKey);
      if (cached) {
        var text     = cached;
        var cachedAt = null;
        var size     = cached.length;
        try {
          var cparsed = JSON.parse(cached);
          if (cparsed && cparsed.text) {
            text     = cparsed.text;
            cachedAt = cparsed.cachedAt || null;
            size     = cparsed.size     || cparsed.text.length;
          }
        } catch(e) {}
        return new Response(JSON.stringify({ hit: true, value: text, cachedAt: cachedAt, size: size, key: cacheKey }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      return new Response(JSON.stringify({ hit: false, key: cacheKey }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // ── /simfin — fetch data from SimFin API ────────────────────────────────
    if (url.pathname === "/simfin") {
      var sfSym = (url.searchParams.get("sym") || "").toUpperCase().trim();
      var sfKey = context.env.SIMFIN_KEY;
      // SimFin ticker translations (some tickers differ from standard)
      var SF_TICKER_MAP = { "GOOGL": "GOOG", "BRKB": "BRK.B" };
      if (SF_TICKER_MAP[sfSym]) sfSym = SF_TICKER_MAP[sfSym];
      if (!sfSym || !sfKey) {
        return new Response(JSON.stringify({ error: "Missing sym or SIMFIN_KEY" }), {
          status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      var sfBase  = "https://backend.simfin.com/api/v3";
      var sfHdr   = { "Authorization": "api-key " + sfKey, "Accept": "application/json" };
      var sfDiag  = { sym: sfSym, keyPresent: !!sfKey, keyPrefix: sfKey ? sfKey.slice(0,6) + "..." : "MISSING" };

      var sfStart = "2013-01-01";
      async function sfFetch(statement) {
        // BS requires period=Q4 (not fy) - fy only works for pl and cf
        var period = (statement === "bs") ? "Q4" : "fy";
        var sfUrl = sfBase + "/companies/statements/compact?ticker=" + sfSym + "&statements=" + statement + "&period=" + period + "&start=" + sfStart;
        sfDiag["url_" + statement] = sfUrl.replace(sfKey, "***");
        try {
          var resp = await fetch(sfUrl, { headers: sfHdr });
          sfDiag["status_" + statement] = resp.status;
          sfDiag["contentType_" + statement] = resp.headers.get("content-type") || "unknown";
          var txt = await resp.text();
          sfDiag["rawLen_" + statement] = txt.length;
          sfDiag["rawPreview_" + statement] = txt.slice(0, 150);
          try {
            return JSON.parse(txt);
          } catch(e) {
            return { error: "JSON parse failed", raw: txt.slice(0, 300), status: resp.status };
          }
        } catch(e) {
          sfDiag["fetchError_" + statement] = String(e);
          return { error: "Fetch failed: " + String(e) };
        }
      }

      try {
        // Parallel calls - START plan allows 5 req/sec
        var sfPair   = await Promise.all([ sfFetch("bs"), sfFetch("pl") ]);
        var sfBalance = sfPair[0];
        var sfIncome  = sfPair[1];
        return new Response(JSON.stringify({
          ok: true,
          sym: sfSym,
          income:  sfIncome,
          balance: sfBalance,
          diag:    sfDiag,
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: String(e), diag: sfDiag }), {
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // ── /eps  — 10yr annual EPS from SimFin (v2.249, replaces Polygon) ──────
    // Same response shape the Polygon version returned:
    //   { ok, rows:[{ year, eps, epsRaw, adjFactor, endDate, revenue, netIncome }],
    //     splits:[{ date, factor }], source }
    // rows newest first; eps is split-adjusted to today's share count.
    //
    // SimFin does not document whether its per-share figures are restated for
    // later splits, so each year is CHECKED rather than assumed: implied share
    // count (Net Income / EPS) is compared with the latest year's. If a later
    // split of factor F exists and that year's implied shares are ~F times
    // smaller, the year is as-reported and gets divided by F; if the share
    // counts already line up, the year is left alone (already adjusted).
    if (url.pathname === "/eps") {
      var epsSym = (url.searchParams.get("sym") || "").toUpperCase().trim();
      var sfKeyE = context.env.SIMFIN_KEY;
      if (!epsSym || !sfKeyE) {
        return new Response(JSON.stringify({ error: "Missing sym or SIMFIN_KEY" }), {
          status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      var SF_MAP_E = { "GOOGL": "GOOG", "BRKB": "BRK.B" };
      var sfSymE   = SF_MAP_E[epsSym] || epsSym;
      var ySymE    = epsSym === "BRKB" ? "BRK-B" : epsSym;
      try {
        var epsSrc = await Promise.all([
          fetch("https://backend.simfin.com/api/v3/companies/statements/compact?ticker=" + encodeURIComponent(sfSymE) + "&statements=pl&period=fy&start=2013-01-01",
                { headers: { "Authorization": "api-key " + sfKeyE, "Accept": "application/json" } })
            .then(function(r){ return r.json(); }).catch(function(){ return null; }),
          fetch("https://query1.finance.yahoo.com/v8/finance/chart/" + ySymE + "?interval=1mo&range=max&events=split",
                { headers: { "User-Agent": UA, "Accept": "application/json", "Referer": "https://finance.yahoo.com/" } })
            .then(function(r){ return r.json(); }).catch(function(){ return null; }),
          // Today's share count (all classes) -- reference for the split check
          (async function() {
            try {
              var ck = await getYahooCrumb(ySymE);
              if (!ck || !ck.crumb || ck.crumb.indexOf("{") !== -1) return null;
              var ksRes = await fetch("https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + ySymE + "?modules=defaultKeyStatistics&crumb=" + encodeURIComponent(ck.crumb),
                { headers: { "User-Agent": UA, "Accept": "application/json", "Cookie": ck.cookies, "Referer": "https://finance.yahoo.com/" } });
              var ksJ = await ksRes.json();
              var ks = ksJ && ksJ.quoteSummary && ksJ.quoteSummary.result && ksJ.quoteSummary.result[0] && ksJ.quoteSummary.result[0].defaultKeyStatistics;
              var sh = ks && ((ks.impliedSharesOutstanding && ks.impliedSharesOutstanding.raw) || (ks.sharesOutstanding && ks.sharesOutstanding.raw));
              return sh > 0 ? sh : null;
            } catch(e) { return null; }
          })(),
        ]);
        var sfPl   = epsSrc[0];
        var yChart = epsSrc[1];
        var curShares = epsSrc[2];

        // Splits from Yahoo: factor = shares multiplier (10-for-1 -> 10)
        var splitsE = [];
        var yRes = yChart && yChart.chart && yChart.chart.result && yChart.chart.result[0];
        var ySplits = yRes && yRes.events && yRes.events.splits ? yRes.events.splits : {};
        Object.keys(ySplits).forEach(function(k) {
          var s = ySplits[k];
          if (s && s.date && s.numerator > 0 && s.denominator > 0) {
            splitsE.push({ date: new Date(s.date * 1000).toISOString().slice(0, 10), factor: s.numerator / s.denominator });
          }
        });
        splitsE.sort(function(a, b) { return a.date < b.date ? 1 : -1; });

        // SimFin compact: [ { statements: [ { columns:[...], data:[[...]] } ] } ]
        var stmtE = sfPl && sfPl[0] && sfPl[0].statements && sfPl[0].statements[0];
        var colsE = stmtE ? stmtE.columns || [] : [];
        function ci(name) { return colsE.indexOf(name); }
        var iYr = ci("Fiscal Year"), iDate = ci("Report Date"), iEpsD = ci("Earnings Per Share, Diluted"),
            iEpsB = ci("Earnings Per Share, Basic"), iRev = ci("Revenue"), iNi = ci("Net Income");
        var raw = [];
        (stmtE && stmtE.data ? stmtE.data : []).forEach(function(row) {
          var yr  = iYr  !== -1 ? parseInt(row[iYr]) : null;
          var eps = iEpsD !== -1 && row[iEpsD] != null ? row[iEpsD] : (iEpsB !== -1 ? row[iEpsB] : null);
          if (!yr || eps == null) return;
          raw.push({ year: yr, epsRaw: eps,
                     endDate: iDate !== -1 && row[iDate] ? String(row[iDate]).slice(0, 10) : yr + "-12-31",
                     rev: iRev !== -1 ? row[iRev] : null, ni: iNi !== -1 ? row[iNi] : null });
        });
        raw.sort(function(a, b) { return b.year - a.year; });

        var rowsE = adjustEpsForSplits(raw, splitsE, curShares).slice(0, 10).map(function(r) {
          return { year: r.year, eps: r.eps, epsRaw: r.epsRaw, adjFactor: r.adjFactor, endDate: r.endDate, splitCheck: r.splitCheck,
                   revenue:   r.rev ? "$" + (r.rev / 1e9).toFixed(1) + "B" : null,
                   netIncome: r.ni  ? "$" + (r.ni  / 1e9).toFixed(1) + "B" : null };
        });
        return new Response(JSON.stringify({ ok: rowsE.length > 0, rows: rowsE, splits: splitsE, source: "simfin", sharesRef: curShares ? "yahoo_current" : "newest_simfin_row" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: String(e), source: "simfin" }), {
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    if (url.pathname === "/anthropic") {
      const anthropicKey = context.env.ANTHROPIC_KEY;
      if (!anthropicKey) {
        return new Response(JSON.stringify({ error: "ANTHROPIC_KEY not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      const body = await context.request.text();
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method:  "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body,
      });
      const data = await res.text();
      return new Response(data, {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // -------------------------------------------------------------------------
    // /stripe -- Stripe payment integration
    // GET  /stripe?action=checkout&plan=monthly  -> create checkout session
    // GET  /stripe?action=checkout&plan=annual   -> create checkout session
    // GET  /stripe?action=portal                 -> customer portal session
    // GET  /stripe?action=status                 -> check subscription status
    // POST /stripe?action=webhook                -> Stripe webhook handler
    // -------------------------------------------------------------------------
    if (url.pathname === "/stripe") {
      var stripeKey     = context.env.STRIPE_SECRET_KEY;
      var webhookSecret = context.env.STRIPE_WEBHOOK_SECRET;
      var CACHE         = context.env.CACHE;
      var stripeAction  = url.searchParams.get("action") || "";
      var stripePlan    = url.searchParams.get("plan")   || "monthly";
      var STRIPE_BASE   = "https://api.stripe.com/v1";
      var PRICE_MONTHLY = "price_1TROAzRHjAjfvcePzpMstCpG";
      var PRICE_ANNUAL  = "price_1TROAyRHjAjfvcePjuBXJeYr";
      var APP_URL       = "https://nervousgeek.com";

      function stripeHeaders() {
        return { "Authorization": "Bearer " + stripeKey, "Content-Type": "application/x-www-form-urlencoded" };
      }
      function encodeForm(obj) {
        return Object.keys(obj).map(function(k) { return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]); }).join("&");
      }
      async function getClerkUserId(request) {
        try {
          var authHeader = request.headers.get("Authorization") || "";
          var token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
          if (!token) return null;
          var parts = token.split(".");
          if (parts.length !== 3) return null;
          var payload = JSON.parse(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/")));
          return payload.sub || null;
        } catch(e) { return null; }
      }

      if (stripeAction === "status") {
        var userId = await getClerkUserId(context.request);
        if (!userId) return new Response(JSON.stringify({ paid: false }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        var subStatus = CACHE ? await CACHE.get("stripe:sub:" + userId) : null;
        var periodEnd = CACHE ? await CACHE.get("stripe:end:" + userId) : null;
        var paid       = subStatus === "active" || subStatus === "cancelling";
        var cancelling = subStatus === "cancelling";
        return new Response(JSON.stringify({ paid: paid, cancelling: cancelling, periodEnd: periodEnd }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      if (stripeAction === "checkout") {
        if (!stripeKey) return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        var userId = await getClerkUserId(context.request);
        var priceId = stripePlan === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;
        var sessionParams = {
          "mode": "subscription",
          "line_items[0][price]": priceId,
          "line_items[0][quantity]": "1",
          "success_url": APP_URL + "?payment=success",
          "cancel_url": APP_URL + "?payment=cancelled",
          "allow_promotion_codes": "true",
        };
        if (userId) sessionParams["client_reference_id"] = userId;
        var stripeRes = await fetch(STRIPE_BASE + "/checkout/sessions", { method: "POST", headers: stripeHeaders(), body: encodeForm(sessionParams) });
        var session = await stripeRes.json();
        if (!session.url) return new Response(JSON.stringify({ error: "Failed to create checkout session", detail: session }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        return new Response(JSON.stringify({ url: session.url }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      if (stripeAction === "portal") {
        if (!stripeKey) return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        var userId = await getClerkUserId(context.request);
        if (!userId) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        var customerId = CACHE ? await CACHE.get("stripe:cus:" + userId) : null;
        if (!customerId) return new Response(JSON.stringify({ error: "No subscription found" }), { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        var portalRes = await fetch(STRIPE_BASE + "/billing_portal/sessions", { method: "POST", headers: stripeHeaders(), body: encodeForm({ customer: customerId, return_url: APP_URL }) });
        var portal = await portalRes.json();
        return new Response(JSON.stringify({ url: portal.url }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      if (stripeAction === "webhook" && context.request.method === "POST") {
        var rawBody = await context.request.text();
        var sigHeader = context.request.headers.get("Stripe-Signature") || "";
        async function verifyStripeSignature(body, sig, secret) {
          try {
            var parts = {}; sig.split(",").forEach(function(p) { var kv = p.split("="); parts[kv[0]] = kv[1]; });
            var ts = parts["t"]; var v1 = parts["v1"];
            if (!ts || !v1) return false;
            var enc = new TextEncoder();
            var key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
            var sig2 = await crypto.subtle.sign("HMAC", key, enc.encode(ts + "." + body));
            var hex = Array.from(new Uint8Array(sig2)).map(function(b){ return b.toString(16).padStart(2,"0"); }).join("");
            return hex === v1;
          } catch(e) { return false; }
        }
        if (webhookSecret) {
          var valid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
          if (!valid) return new Response("Invalid signature", { status: 400 });
        }
        var event; try { event = JSON.parse(rawBody); } catch(e) { return new Response("Invalid JSON", { status: 400 }); }
        var eventType = event.type || "";
        var obj = event.data && event.data.object ? event.data.object : {};
        if (eventType === "checkout.session.completed") {
          var uid = obj.client_reference_id || ""; var cid = obj.customer || ""; var sid = obj.subscription || "";
          if (uid && CACHE) {
            await CACHE.put("stripe:sub:" + uid, "active",  { expirationTtl: 60*60*24*400 });
            await CACHE.put("stripe:cus:" + uid, cid,       { expirationTtl: 60*60*24*400 });
            await CACHE.put("stripe:sid:" + uid, sid,       { expirationTtl: 60*60*24*400 });
            await CACHE.put("stripe:uid:" + cid, uid,       { expirationTtl: 60*60*24*400 });
          }
        }
        if (eventType === "customer.subscription.updated") {
          var cid = obj.customer || "";
          var cancelAtEnd = obj.cancel_at_period_end || false;
          var periodEndTs = obj.current_period_end || null;
          var periodEndStr = periodEndTs ? new Date(periodEndTs * 1000).toISOString().split("T")[0] : "";
          if (cid && CACHE) {
            var uid2 = await CACHE.get("stripe:uid:" + cid);
            if (uid2) {
              if (cancelAtEnd) {
                await CACHE.put("stripe:sub:" + uid2, "cancelling", { expirationTtl: 60*60*24*400 });
                await CACHE.put("stripe:end:" + uid2, periodEndStr, { expirationTtl: 60*60*24*400 });
              } else {
                await CACHE.put("stripe:sub:" + uid2, "active", { expirationTtl: 60*60*24*400 });
              }
            }
          }
        }
        if (eventType === "customer.subscription.deleted" || eventType === "customer.subscription.paused") {
          var cid = obj.customer || "";
          if (cid && CACHE) {
            var uid2 = await CACHE.get("stripe:uid:" + cid);
            if (uid2) {
              await CACHE.put("stripe:sub:" + uid2, "cancelled", { expirationTtl: 60*60*24*400 });
              if (CACHE.delete) await CACHE.delete("stripe:end:" + uid2);
            }
          }
        }
        if (eventType === "invoice.payment_succeeded") {
          var cid = obj.customer || "";
          if (cid && CACHE) { var uid2 = await CACHE.get("stripe:uid:" + cid); if (uid2) await CACHE.put("stripe:sub:" + uid2, "active", { expirationTtl: 60*60*24*400 }); }
        }
        if (eventType === "invoice.payment_failed") {
          var cid = obj.customer || "";
          if (cid && CACHE) { var uid2 = await CACHE.get("stripe:uid:" + cid); if (uid2) await CACHE.put("stripe:sub:" + uid2, "past_due", { expirationTtl: 60*60*24*400 }); }
        }
        return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "Unknown stripe action" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    // ── Watchlist API (D1 database, per-user) ─────────────────────────────────
    if (url.pathname.startsWith("/watchlist")) {
      var wDB = context.env.DB;
      var wHeaders = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
      if (!wDB) return new Response(JSON.stringify({ error: "D1 not configured" }), { status: 500, headers: wHeaders });

      // Extract Clerk user_id directly from Bearer JWT (same logic as getClerkUserId)
      var wUserId = null;
      try {
        var wAuthHeader = context.request.headers.get("Authorization") || "";
        var wToken = wAuthHeader.startsWith("Bearer ") ? wAuthHeader.slice(7) : null;
        if (wToken) {
          var wParts = wToken.split(".");
          if (wParts.length === 3) {
            var wPayload = JSON.parse(atob(wParts[1].replace(/-/g,"+").replace(/_/g,"/")));
            wUserId = wPayload.sub || null;
          }
        }
      } catch(e) { wUserId = null; }
      if (!wUserId) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401, headers: wHeaders });

      // Premium gate: check Stripe subscription status or admin key
      var wAdminKey = context.env.ADMIN_KEY || "stockinsight-admin";
      var wReqAdmin = context.request.headers.get("X-Admin-Key") || "";
      var wIsAdmin  = wReqAdmin === wAdminKey;
      if (!wIsAdmin) {
        var wCACHE    = context.env.CACHE;
        var wSubStatus = wCACHE ? await wCACHE.get("stripe:sub:" + wUserId) : null;
        var wIsPaid    = wSubStatus === "active" || wSubStatus === "cancelling";
        if (!wIsPaid) return new Response(JSON.stringify({ error: "Premium required", code: "PREMIUM_REQUIRED" }), { status: 403, headers: wHeaders });
      }

      var wAction = url.searchParams.get("action");

      try {
        // GET — return watchlist items + latest snapshot per ticker + active locks
        if (context.request.method === "GET") {
          var wItems = await wDB.prepare(
            "SELECT * FROM watchlist_items WHERE user_id = ? ORDER BY created_at DESC"
          ).bind(wUserId).all();
          var tickers = (wItems.results || []).map(function(r){ return r.ticker; });
          var snapMap = {};
          if (tickers.length > 0) {
            // Latest snapshot per ticker for this user
            var placeholders = tickers.map(function(){ return "?"; }).join(",");
            var snaps = await wDB.prepare(
              "SELECT wss.* FROM watchlist_signal_snapshots wss " +
              "INNER JOIN (SELECT ticker, MAX(snapshot_date) AS md FROM watchlist_signal_snapshots WHERE user_id=? AND ticker IN (" + placeholders + ") GROUP BY ticker) latest " +
              "ON wss.user_id=? AND wss.ticker=latest.ticker AND wss.snapshot_date=latest.md"
            ).bind.apply(
              wDB.prepare(
                "SELECT wss.* FROM watchlist_signal_snapshots wss " +
                "INNER JOIN (SELECT ticker, MAX(snapshot_date) AS md FROM watchlist_signal_snapshots WHERE user_id=? AND ticker IN (" + placeholders + ") GROUP BY ticker) latest " +
                "ON wss.user_id=? AND wss.ticker=latest.ticker AND wss.snapshot_date=latest.md"
              ),
              [wUserId].concat(tickers).concat([wUserId])
            ).all();
            (snaps.results || []).forEach(function(s){ snapMap[s.ticker] = s; });

            // Previous 5 snapshots per ticker for arrow calculation.
            // FIX: previously "ORDER BY snapshot_date DESC LIMIT 6" with no exclusion of
            // today's own snapshot_date — since there's exactly one row per (user,ticker,day)
            // (see ON CONFLICT upsert in the "snapshot" action below), row 0 of that query was
            // always the SAME row as snapMap[ticker] (today's just-saved snapshot), not a real
            // prior day. The frontend's wlArrow() then averaged today's own rank in alongside
            // the last 4 real days, diluting every improving/weakening arrow toward "stable".
            // Explicitly exclude the latest snapshot_date (rather than a blind OFFSET 1) so
            // this still returns 5 genuine prior days even before today's snapshot exists yet.
            var prevMap = {};
            for (var ti = 0; ti < tickers.length; ti++) {
              var prevSnaps = await wDB.prepare(
                "SELECT snapshot_date,rba_rank,trend_rank,momentum_rank,reversal_rank,money_flow_rank " +
                "FROM watchlist_signal_snapshots WHERE user_id=? AND ticker=? " +
                "AND snapshot_date < (SELECT MAX(snapshot_date) FROM watchlist_signal_snapshots WHERE user_id=? AND ticker=?) " +
                "ORDER BY snapshot_date DESC LIMIT 5"
              ).bind(wUserId, tickers[ti], wUserId, tickers[ti]).all();
              prevMap[tickers[ti]] = (prevSnaps.results || []);
            }
            snapMap["__prev"] = prevMap;

            // Active signal locks per ticker — graceful fallback if table not yet created
            var lockMap = {};
            try {
              for (var li = 0; li < tickers.length; li++) {
                var lockRow = await wDB.prepare(
                  "SELECT * FROM watchlist_signal_locks WHERE user_id=? AND ticker=? AND is_active=1 ORDER BY COALESCE(position_updated_at, locked_at) DESC LIMIT 1"
                ).bind(wUserId, tickers[li]).first();
                if (lockRow) lockMap[tickers[li]] = lockRow;
              }
            } catch(lockErr) { lockMap = {}; /* table may not exist yet */ }
            snapMap["__locks"] = lockMap;
          }
          return new Response(JSON.stringify({ items: wItems.results || [], snapshots: snapMap }), { headers: wHeaders });
        }

        var wBody = {};
        try { wBody = await context.request.json(); } catch(e) {}

        // POST add
        if (wAction === "add") {
          var addTicker = (wBody.ticker || "").toUpperCase().trim();
          if (!addTicker) return new Response(JSON.stringify({ error: "ticker required" }), { status: 400, headers: wHeaders });
          await wDB.prepare(
            "INSERT INTO watchlist_items (user_id, ticker, company_name) VALUES (?,?,?) " +
            "ON CONFLICT(user_id, ticker) DO UPDATE SET company_name=excluded.company_name"
          ).bind(wUserId, addTicker, wBody.companyName || null).run();
          return new Response(JSON.stringify({ ok: true, ticker: addTicker }), { headers: wHeaders });
        }

        // POST remove
        if (wAction === "remove") {
          var remTicker = (wBody.ticker || "").toUpperCase().trim();
          if (!remTicker) return new Response(JSON.stringify({ error: "ticker required" }), { status: 400, headers: wHeaders });
          await wDB.prepare("DELETE FROM watchlist_items WHERE user_id=? AND ticker=?").bind(wUserId, remTicker).run();
          return new Response(JSON.stringify({ ok: true }), { headers: wHeaders });
        }

        // POST snapshot — store today's signal snapshot for one ticker
        if (wAction === "snapshot") {
          var sTicker = (wBody.ticker || "").toUpperCase().trim();
          var sDate   = new Date().toISOString().split("T")[0];
          if (!sTicker || !wBody.snap) return new Response(JSON.stringify({ error: "ticker and snap required" }), { status: 400, headers: wHeaders });
          var s = wBody.snap;
          await wDB.prepare(
            "INSERT INTO watchlist_signal_snapshots " +
            "(user_id,ticker,snapshot_date,close_price,price_change_pct,hi52,lo52," +
            "rba_verdict,rba_rank,trend_status,trend_score,trend_rank," +
            "momentum_status,momentum_score,momentum_rank," +
            "reversal_status,reversal_score,reversal_rank," +
            "money_flow_status,money_flow_score,money_flow_rank,signal_snapshot_json) " +
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) " +
            "ON CONFLICT(user_id,ticker,snapshot_date) DO UPDATE SET " +
            "close_price=excluded.close_price,price_change_pct=excluded.price_change_pct," +
            "hi52=excluded.hi52,lo52=excluded.lo52," +
            "rba_verdict=excluded.rba_verdict,rba_rank=excluded.rba_rank," +
            "trend_status=excluded.trend_status,trend_score=excluded.trend_score,trend_rank=excluded.trend_rank," +
            "momentum_status=excluded.momentum_status,momentum_score=excluded.momentum_score,momentum_rank=excluded.momentum_rank," +
            "reversal_status=excluded.reversal_status,reversal_score=excluded.reversal_score,reversal_rank=excluded.reversal_rank," +
            "money_flow_status=excluded.money_flow_status,money_flow_score=excluded.money_flow_score,money_flow_rank=excluded.money_flow_rank," +
            "signal_snapshot_json=excluded.signal_snapshot_json,created_at=datetime('now')"
          ).bind(
            wUserId, sTicker, sDate,
            s.closePrice||null, s.priceChangePct||null, s.hi52||null, s.lo52||null,
            s.rbaVerdict||null, s.rbaRank||null,
            s.trendStatus||null, s.trendScore||null, s.trendRank||null,
            s.momentumStatus||null, s.momentumScore||null, s.momentumRank||null,
            s.reversalStatus||null, s.reversalScore||null, s.reversalRank||null,
            s.moneyFlowStatus||null, s.moneyFlowScore||null, s.moneyFlowRank||null,
            JSON.stringify(s)
          ).run();
          return new Response(JSON.stringify({ ok: true }), { headers: wHeaders });
        }

        // POST lock — legacy manual lock action retained for backward compatibility.
        // Current UI uses savePosition instead. Do not remove — old lock rows in D1
        // may have been created via this action and are still read by the GET handler.
        if (wAction === "lock") {
          var lTicker = (wBody.ticker || "").toUpperCase().trim();
          if (!lTicker) return new Response(JSON.stringify({ error: "ticker required" }), { status: 400, headers: wHeaders });
          var ls = wBody.currentSnapshot || {};
          var lPrice = ls.closePrice || ls.close_price || null;
          try {
            await wDB.prepare(
              "UPDATE watchlist_signal_locks SET is_active=0 WHERE user_id=? AND ticker=? AND is_active=1"
            ).bind(wUserId, lTicker).run();
            await wDB.prepare(
              "INSERT INTO watchlist_signal_locks " +
              "(user_id,ticker,locked_price," +
              "locked_rba_verdict,locked_rba_rank," +
              "locked_trend_status,locked_trend_score,locked_trend_rank," +
              "locked_momentum_status,locked_momentum_score,locked_momentum_rank," +
              "locked_reversal_status,locked_reversal_score,locked_reversal_rank," +
              "locked_money_flow_status,locked_money_flow_score,locked_money_flow_rank," +
              "locked_snapshot_json,is_active) " +
              "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)"
            ).bind(
              wUserId, lTicker, lPrice,
              ls.rbaVerdict||null, ls.rbaRank||null,
              ls.trendStatus||null, ls.trendScore||null, ls.trendRank||null,
              ls.momentumStatus||null, ls.momentumScore||null, ls.momentumRank||null,
              ls.reversalStatus||null, ls.reversalScore||null, ls.reversalRank||null,
              ls.moneyFlowStatus||null, ls.moneyFlowScore||null, ls.moneyFlowRank||null,
              JSON.stringify(ls)
            ).run();
          } catch(lockWriteErr) {
            return new Response(JSON.stringify({ error: "Lock table not ready. Run DB migration first: watchlist_signal_locks" }), { status: 500, headers: wHeaders });
          }
          return new Response(JSON.stringify({ ok: true }), { headers: wHeaders });
        }

        // POST resetLock — deactivate the active lock for a ticker
        if (wAction === "resetLock") {
          var rlTicker = (wBody.ticker || "").toUpperCase().trim();
          if (!rlTicker) return new Response(JSON.stringify({ error: "ticker required" }), { status: 400, headers: wHeaders });
          try {
            await wDB.prepare(
              "UPDATE watchlist_signal_locks SET is_active=0 WHERE user_id=? AND ticker=? AND is_active=1"
            ).bind(wUserId, rlTicker).run();
          } catch(rlErr) { /* ignore if table doesn't exist */ }
          return new Response(JSON.stringify({ ok: true }), { headers: wHeaders });
        }

        // POST savePosition — save Avg Buy Price + Qty and capture a locked signal snapshot.
        // Reuses watchlist_signal_locks (Option A). New columns added via ALTER TABLE on first
        // use — wrapped in try/catch so existing rows without these columns are unaffected.
        if (wAction === "savePosition") {
          var pTicker = (wBody.ticker || "").toUpperCase().trim();
          if (!pTicker) return new Response(JSON.stringify({ error: "ticker required" }), { status: 400, headers: wHeaders });
          var pAvgBuy = wBody.avgBuyPrice != null ? parseFloat(wBody.avgBuyPrice) : null;
          var pQty    = wBody.quantity    != null ? parseFloat(wBody.quantity)    : null;
          if (pAvgBuy != null && (isNaN(pAvgBuy) || pAvgBuy < 0)) pAvgBuy = null;
          if (pQty    != null && (isNaN(pQty)    || pQty    < 0)) pQty    = null;
          var ps = wBody.currentSnapshot || {};
          var pLockedPrice = ps.closePrice || ps.close_price || null;
          var pFsStatus = (ps.forceStrike && ps.forceStrike.fsStatus) ? ps.forceStrike.fsStatus : (ps.fsStatus || null);
          // Best-effort schema migration: add position columns if not yet present.
          // ALTER TABLE ADD COLUMN is a no-op if column already exists in D1.
          var migCols = [
            "ALTER TABLE watchlist_signal_locks ADD COLUMN avg_buy_price REAL",
            "ALTER TABLE watchlist_signal_locks ADD COLUMN quantity REAL",
            "ALTER TABLE watchlist_signal_locks ADD COLUMN position_updated_at TEXT",
            "ALTER TABLE watchlist_signal_locks ADD COLUMN locked_force_strike_status TEXT",
          ];
          for (var mi = 0; mi < migCols.length; mi++) {
            try { await wDB.prepare(migCols[mi]).run(); } catch(e) { /* already exists */ }
          }
          try {
            await wDB.prepare(
              "UPDATE watchlist_signal_locks SET is_active=0 WHERE user_id=? AND ticker=? AND is_active=1"
            ).bind(wUserId, pTicker).run();
            await wDB.prepare(
              "INSERT INTO watchlist_signal_locks " +
              "(user_id,ticker,locked_price,avg_buy_price,quantity,position_updated_at," +
              "locked_rba_verdict,locked_rba_rank," +
              "locked_trend_status,locked_trend_score,locked_trend_rank," +
              "locked_momentum_status,locked_momentum_score,locked_momentum_rank," +
              "locked_reversal_status,locked_reversal_score,locked_reversal_rank," +
              "locked_money_flow_status,locked_money_flow_score,locked_money_flow_rank," +
              "locked_force_strike_status,locked_snapshot_json,is_active) " +
              "VALUES (?,?,?,?,?,datetime('now'),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)"
            ).bind(
              wUserId, pTicker, pLockedPrice, pAvgBuy, pQty,
              ps.rbaVerdict||null, ps.rbaRank||null,
              ps.trendStatus||null, ps.trendScore||null, ps.trendRank||null,
              ps.momentumStatus||null, ps.momentumScore||null, ps.momentumRank||null,
              ps.reversalStatus||null, ps.reversalScore||null, ps.reversalRank||null,
              ps.moneyFlowStatus||null, ps.moneyFlowScore||null, ps.moneyFlowRank||null,
              pFsStatus, JSON.stringify(ps)
            ).run();
          } catch(posErr) {
            return new Response(JSON.stringify({ error: "Position save failed: " + posErr.message }), { status: 500, headers: wHeaders });
          }
          return new Response(JSON.stringify({ ok: true }), { headers: wHeaders });
        }

        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: wHeaders });
      } catch(wErr) {
        return new Response(JSON.stringify({ error: "Watchlist DB error: " + wErr.message }), { status: 500, headers: wHeaders });
      }
    }

    if (target.includes("financialmodelingprep.com")) {
      const fmpKey = context.env.FMP_KEY;
      if (!fmpKey) return new Response(JSON.stringify({ error: "FMP_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      const sep = target.includes("?") ? "&" : "?";
      const res = await fetch(target + sep + "apikey=" + fmpKey, { headers: { "User-Agent": UA } });
      return new Response(await res.text(), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (target.includes("alphavantage.co")) {
      const avKey = context.env.AV_KEY;
      if (!avKey) return new Response(JSON.stringify({ error: "AV_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      const sep = target.includes("?") ? "&" : "?";
      const res = await fetch(target + sep + "apikey=" + avKey, { headers: { "User-Agent": UA } });
      return new Response(await res.text(), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (target.includes("quoteSummary") || target.includes("fundamentals-timeseries")) {
      var symForCrumb = target ? (target.match(/[?&/]([A-Z]{1,5})[?&/]/) || [])[1] || null : null;
      const { crumb, cookies } = await getYahooCrumb(symForCrumb);
      if (!crumb || crumb.includes("{")) {
        return new Response(JSON.stringify({ error: "Could not obtain Yahoo crumb" }), {
          status: 502,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      const sep      = target.includes("?") ? "&" : "?";
      const finalUrl = target + sep + "crumb=" + encodeURIComponent(crumb);
      const dataRes  = await fetch(finalUrl, {
        headers: {
          "User-Agent": UA,
          "Accept":     "application/json",
          "Cookie":     cookies,
          "Referer":    "https://finance.yahoo.com/",
        },
      });
      return new Response(await dataRes.text(), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const res = await fetch(target, {
      headers: { "User-Agent": UA, "Accept": "application/json", "Referer": "https://finance.yahoo.com/" },
    });
    return new Response(await res.text(), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
