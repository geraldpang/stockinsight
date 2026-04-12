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

  try {

    // Only handle specific API routes -- pass everything else to the React app
    var knownRoutes = ["/proxy", "/anthropic", "/massive", "/eps", "/cache", "/simfin", "/stripe"];
    var isApiRoute  = false;
    for (var ri = 0; ri < knownRoutes.length; ri++) {
      if (url.pathname === knownRoutes[ri] || url.pathname.startsWith(knownRoutes[ri] + "?")) {
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
    var PREMIUM_ROUTES = ["/anthropic", "/massive", "/simfin"];
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
      var clerkSecretKey = context.env.CLERK_SECRET_KEY;
      var isAuthed = await verifyClerkToken(context.request, clerkSecretKey);
      if (!isAuthed) {
        return new Response(JSON.stringify({ error: "Unauthorised. Please sign in to access this ticker." }), {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
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
    // /massive?sym=AAPL -- Massive.com news + ticker ref + dividends + splits
    // Requires MASSIVE_KEY env var in Cloudflare Pages
    // -------------------------------------------------------------------------
    if (url.pathname === "/massive") {
      var sym        = (url.searchParams.get("sym") || "").toUpperCase().trim();
      if (sym === "BRKB") sym = "BRK-B";
      var massiveKey = context.env.MASSIVE_KEY;
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), { status:400, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"} });
      if (!massiveKey) return new Response(JSON.stringify({ error: "MASSIVE_KEY not configured" }), { status:500, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"} });

      var BASE = "https://api.polygon.io";
      var HDR  = { "User-Agent": UA };

      // Date helpers
      var today     = new Date();
      var toDate    = today.toISOString().slice(0,10);
      var fromDate  = new Date(today.getTime() - 730 * 86400000).toISOString().slice(0,10);
      var from1yr   = new Date(today.getTime() - 365 * 86400000).toISOString().slice(0,10);

      // Group A: fast indicators needed for Signal + Reversal (no 10-K, reduced aggs)
      var from30d  = new Date(today.getTime() - 60 * 86400000).toISOString().slice(0,10);
      var fastResults = await Promise.all([
        fetch(BASE + "/v2/aggs/ticker/" + sym + "/range/1/day/" + from30d + "/" + toDate + "?adjusted=true&sort=desc&limit=60&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v2/snapshot/locale/us/markets/stocks/tickers/" + sym + "?apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/sma/" + sym + "?timespan=day&adjusted=true&window=50&series_type=close&order=desc&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/sma/" + sym + "?timespan=day&adjusted=true&window=200&series_type=close&order=desc&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/ema/" + sym + "?timespan=day&adjusted=true&window=20&series_type=close&order=desc&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/rsi/" + sym + "?timespan=day&adjusted=true&window=14&series_type=close&order=desc&limit=10&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/macd/" + sym + "?timespan=day&adjusted=true&short_window=12&long_window=26&signal_window=9&series_type=close&order=desc&limit=10&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v2/last/trade/" + sym + "?apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/sma/" + sym + "?timespan=week&adjusted=true&window=10&series_type=close&order=desc&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/sma/" + sym + "?timespan=week&adjusted=true&window=40&series_type=close&order=desc&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
      ]);

      // Group B: slow reference data (news, dividends, 10-K) - fire in parallel, don't await
      var slowPromise = Promise.all([
        fetch(BASE + "/v2/reference/news?ticker=" + sym + "&limit=10&order=desc&sort=published_utc&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/vX/reference/financials/ratios?ticker=" + sym + "&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/vX/reference/financials/balance-sheets?ticker=" + sym + "&period=annual&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/vX/reference/tickers/" + sym + "?apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v3/reference/dividends?ticker=" + sym + "&limit=10&order=desc&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v3/reference/splits?ticker=" + sym + "&order=desc&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/stocks/filings/10-K/vX/sections?ticker=" + sym + "&section=business&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/stocks/filings/10-K/vX/sections?ticker=" + sym + "&section=risk_factors&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
      ]);

      var aggsData      = fastResults[0];
      var snapData      = fastResults[1];
      var sma50Data     = fastResults[2];
      var sma200Data    = fastResults[3];
      var ema20Data     = fastResults[4];
      var rsiData       = fastResults[5];
      var macdData      = fastResults[6];
      var lastTradeData = fastResults[7];
      var wsma10Data    = fastResults[8];
      var wsma40Data    = fastResults[9];

      // Await slow group now (by the time fast group finished, slow is likely done too)
      var slowResults  = await slowPromise;
      var newsData     = slowResults[0];
      var ratiosData   = slowResults[1];
      var bsData       = slowResults[2];
      var tickerData   = slowResults[3];
      var dividendData = slowResults[4];
      var splitsData   = slowResults[5];
      var tenKBizData  = slowResults[6];
      var tenKRiskData = slowResults[7];

      function indVal(d) {
        return d && d.results && d.results.values && d.results.values[0] ? d.results.values[0].value : null;
      }
      function indHistory(d) {
        if (!d || !d.results || !d.results.values) return [];
        return d.results.values.map(function(v) { return v.value != null ? v.value : null; });
      }
      function macdVals(d) {
        if (!d || !d.results || !d.results.values || !d.results.values[0]) return null;
        var v = d.results.values[0];
        return { macd: v.value, signal: v.signal, histogram: v.histogram };
      }
      function macdHistory(d) {
        if (!d || !d.results || !d.results.values) return [];
        return d.results.values.map(function(v) { return { macd: v.value, signal: v.signal, histogram: v.histogram }; });
      }

      var snap = snapData && snapData.ticker ? snapData.ticker : null;

      return new Response(JSON.stringify({
        news:      newsData     && newsData.results     ? newsData.results     : [],
        ratios:    ratiosData   && ratiosData.results   ? ratiosData.results[0] : null,
        balSheet:  bsData       && bsData.results       ? bsData.results[0]     : null,
        ticker:    tickerData   && tickerData.results   ? tickerData.results   : null,
        dividends: dividendData && dividendData.results ? dividendData.results : [],
        splits:    splitsData   && splitsData.results   ? splitsData.results   : [],
        // financials: removed - now using SimFin for balance sheet data
        aggs:      aggsData     && aggsData.results     ? aggsData.results.slice(0, 30) : [],
        snapshot: snap ? {
          open:      snap.day  ? snap.day.o  : null,
          high:      snap.day  ? snap.day.h  : null,
          low:       snap.day  ? snap.day.l  : null,
          close:     snap.day  ? snap.day.c  : null,
          volume:    snap.day  ? snap.day.v  : null,
          vwap:      snap.day  ? snap.day.vw : null,
          prevClose: snap.prevDay ? snap.prevDay.c : null,
          change:    snap.todaysChangePerc != null ? snap.todaysChangePerc : null,
        } : null,
        indicators: {
          sma50:       indVal(sma50Data),
          sma200:      indVal(sma200Data),
          ema20:       indVal(ema20Data),
          rsi14:       indVal(rsiData),
          rsiHistory:  indHistory(rsiData),
          macd:        macdVals(macdData),
          macdHistory: macdHistory(macdData),
          wsma10:      indVal(wsma10Data),
          wsma40:      indVal(wsma40Data),
        },
        tenK: {
          business:    tenKBizData  && tenKBizData.results  && tenKBizData.results[0]  ? tenKBizData.results[0].text   : null,
          riskFactors: tenKRiskData && tenKRiskData.results && tenKRiskData.results[0] ? tenKRiskData.results[0].text  : null,
          filingDate:  tenKBizData  && tenKBizData.results  && tenKBizData.results[0]  ? tenKBizData.results[0].filing_date : null,
        },
        lastTrade: lastTradeData && lastTradeData.results ? {
          price:  lastTradeData.results.p,
          size:   lastTradeData.results.s,
          time:   lastTradeData.results.t,
        } : null,
        _debug: {
          newsCount:    newsData     && newsData.results     ? newsData.results.length    : 0,
          aggsCount:    aggsData     && aggsData.results     ? aggsData.results.length    : 0,
          snapshotOk:   snap != null,
          sma50:        indVal(sma50Data),
          rsi14:        indVal(rsiData),
          newsStatus:   newsData  ? (newsData.status  || "ok") : "null",
          newsError:    newsData  ? (newsData.error   || null) : "fetch_failed",
          snapStatus:   snapData  ? (snapData.status  || "ok") : "null",
          aggsStatus:   aggsData  ? (aggsData.status  || "ok") : "null",
          indStatus:    rsiData   ? (rsiData.status   || "ok") : "null",
          tickerStatus: tickerData ? (tickerData.status || "ok") : "null",
          tickerError:  tickerData ? (tickerData.error  || null) : "fetch_failed",
          newsRaw:      newsData  ? JSON.stringify(newsData).slice(0, 200) : "null",
          tickerRaw:    tickerData ? JSON.stringify(tickerData).slice(0, 200) : "null",
        },
      }), { headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"} });
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

      // ── Write: store insight with metadata wrapper ────────────────────────
      if (context.request.method === "POST") {
        var bodyText = await context.request.text();
        var cachedAt = new Date().toISOString();
        var wrapped  = JSON.stringify({ text: bodyText, cachedAt: cachedAt, size: bodyText.length });
        await CACHE.put(cacheKey, wrapped, { expirationTtl: 60 * 60 * 24 * 7 });
        return new Response(JSON.stringify({ ok: true, key: cacheKey, cachedAt: cachedAt, size: bodyText.length }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // ── Read: unwrap metadata if present ──────────────────────────────────
      // Delete: clear all cached insights for a ticker
      if (context.request.method === "DELETE") {
        var delTabs = ["moat", "financial", "aiinsight"];
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

    // ── /eps  — 10yr annual EPS from Polygon financials ────────────────────
    if (url.pathname === "/eps") {
      var epsSym = (url.searchParams.get("sym") || "").toUpperCase().trim();
      var massiveKey2 = context.env.MASSIVE_KEY;
      if (!epsSym || !massiveKey2) {
        return new Response(JSON.stringify({ error: "Missing sym or MASSIVE_KEY" }), {
          status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      try {
        // Fetch EPS history and split history in parallel
        var epsAndSplits = await Promise.all([
          fetch("https://api.polygon.io/vX/reference/financials?ticker=" + epsSym + "&timeframe=annual&limit=10&apiKey=" + massiveKey2, { headers: { "User-Agent": UA } }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
          fetch("https://api.polygon.io/v3/reference/splits?ticker=" + epsSym + "&order=desc&apiKey=" + massiveKey2, { headers: { "User-Agent": UA } }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        ]);
        var pfData    = epsAndSplits[0];
        var splitData = epsAndSplits[1];

        // Build cumulative split adjustment factor per date
        // Each split: for dates BEFORE execution_date, multiply EPS by split_from/split_to
        var splits = [];
        if (splitData && splitData.results) {
          for (var si = 0; si < splitData.results.length; si++) {
            var sp = splitData.results[si];
            if (sp.execution_date && sp.split_from && sp.split_to) {
              splits.push({ date: sp.execution_date, factor: sp.split_from / sp.split_to });
            }
          }
        }

        function getAdjFactor(fiscalYearEndDate) {
          // For each split that happened AFTER this fiscal year end, apply the adjustment
          var factor = 1;
          for (var fi = 0; fi < splits.length; fi++) {
            if (splits[fi].date > fiscalYearEndDate) {
              factor = factor * splits[fi].factor;
            }
          }
          return factor;
        }

        var rows = [];
        if (pfData && pfData.results) {
          for (var pi = 0; pi < pfData.results.length; pi++) {
            var r = pfData.results[pi];
            var ic = r.financials && r.financials.income_statement;
            if (!ic) continue;
            var epsBasic   = ic.basic_earnings_per_share   && ic.basic_earnings_per_share.value;
            var epsDiluted = ic.diluted_earnings_per_share && ic.diluted_earnings_per_share.value;
            var eps = epsDiluted || epsBasic || null;
            var rev = ic.revenues && ic.revenues.value;
            var ni  = ic.net_income_loss && ic.net_income_loss.value;
            var yr  = r.fiscal_year ? parseInt(r.fiscal_year) : null;
            var endDate = r.end_date || (yr + "-12-31");
            if (yr && eps !== null) {
              var adj = getAdjFactor(endDate);
              rows.push({ year: yr, eps: eps * adj, epsRaw: eps, adjFactor: adj, endDate: endDate,
                          revenue: rev ? "$" + (rev/1e9).toFixed(1) + "B" : null,
                          netIncome: ni ? "$" + (ni/1e9).toFixed(1) + "B" : null });
            }
          }
        }
        rows.sort(function(a, b) { return b.year - a.year; });
        return new Response(JSON.stringify({ ok: true, rows: rows, splits: splits, source: "polygon" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: String(e), source: "polygon" }), {
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
      var PRICE_MONTHLY = "price_1TLEJoETaGzjK4K2F4TdQqU6";
      var PRICE_ANNUAL  = "price_1TLELbETaGzjK4K22khmlNIc";
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
        return new Response(JSON.stringify({ paid: subStatus === "active" }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
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
        var res = await fetch(STRIPE_BASE + "/checkout/sessions", { method: "POST", headers: stripeHeaders(), body: encodeForm(sessionParams) });
        var session = await res.json();
        if (!session.url) return new Response(JSON.stringify({ error: "Failed to create checkout session", detail: session }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        return new Response(JSON.stringify({ url: session.url }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      if (stripeAction === "portal") {
        if (!stripeKey) return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        var userId = await getClerkUserId(context.request);
        if (!userId) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        var customerId = CACHE ? await CACHE.get("stripe:cus:" + userId) : null;
        if (!customerId) return new Response(JSON.stringify({ error: "No subscription found" }), { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        var res = await fetch(STRIPE_BASE + "/billing_portal/sessions", { method: "POST", headers: stripeHeaders(), body: encodeForm({ customer: customerId, return_url: APP_URL }) });
        var portal = await res.json();
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
        if (eventType === "customer.subscription.deleted" || eventType === "customer.subscription.paused") {
          var cid = obj.customer || "";
          if (cid && CACHE) { var uid2 = await CACHE.get("stripe:uid:" + cid); if (uid2) await CACHE.put("stripe:sub:" + uid2, "cancelled", { expirationTtl: 60*60*24*400 }); }
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

    if (!target) return new Response("Missing url", { status: 400 });

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
      var PRICE_MONTHLY = "price_1TLEJoETaGzjK4K2F4TdQqU6";
      var PRICE_ANNUAL  = "price_1TLELbETaGzjK4K22khmlNIc";
      var APP_URL       = "https://nervousgeek.com";

      function stripeHeaders() {
        return {
          "Authorization": "Bearer " + stripeKey,
          "Content-Type":  "application/x-www-form-urlencoded",
        };
      }

      function encodeForm(obj) {
        return Object.keys(obj).map(function(k) {
          return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]);
        }).join("&");
      }

      // Get Clerk user ID from token
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

      // ── Status: check if user has active subscription ─────────────────────
      if (stripeAction === "status") {
        var userId = await getClerkUserId(context.request);
        if (!userId) return new Response(JSON.stringify({ paid: false }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
        var subStatus = CACHE ? await CACHE.get("stripe:sub:" + userId) : null;
        return new Response(JSON.stringify({ paid: subStatus === "active" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // ── Checkout: create Stripe checkout session ───────────────────────────
      if (stripeAction === "checkout") {
        if (!stripeKey) return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
        var userId = await getClerkUserId(context.request);
        var priceId = stripePlan === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;
        var sessionParams = {
          "mode":                                 "subscription",
          "line_items[0][price]":                 priceId,
          "line_items[0][quantity]":              "1",
          "success_url":                          APP_URL + "?payment=success",
          "cancel_url":                           APP_URL + "?payment=cancelled",
          "allow_promotion_codes":                "true",
        };
        if (userId) sessionParams["client_reference_id"] = userId;
        var res = await fetch(STRIPE_BASE + "/checkout/sessions", {
          method:  "POST",
          headers: stripeHeaders(),
          body:    encodeForm(sessionParams),
        });
        var session = await res.json();
        if (!session.url) return new Response(JSON.stringify({ error: "Failed to create checkout session", detail: session }), {
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
        return new Response(JSON.stringify({ url: session.url }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // ── Portal: customer subscription management ───────────────────────────
      if (stripeAction === "portal") {
        if (!stripeKey) return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
        var userId = await getClerkUserId(context.request);
        if (!userId) return new Response(JSON.stringify({ error: "Not signed in" }), {
          status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
        // Get Stripe customer ID from KV
        var customerId = CACHE ? await CACHE.get("stripe:cus:" + userId) : null;
        if (!customerId) return new Response(JSON.stringify({ error: "No subscription found" }), {
          status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
        var res = await fetch(STRIPE_BASE + "/billing_portal/sessions", {
          method:  "POST",
          headers: stripeHeaders(),
          body:    encodeForm({ customer: customerId, return_url: APP_URL }),
        });
        var portal = await res.json();
        return new Response(JSON.stringify({ url: portal.url }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // ── Webhook: handle Stripe events ─────────────────────────────────────
      if (stripeAction === "webhook" && context.request.method === "POST") {
        var rawBody  = await context.request.text();
        var sigHeader = context.request.headers.get("Stripe-Signature") || "";

        // Verify webhook signature
        async function verifyStripeSignature(body, sig, secret) {
          try {
            var parts = {};
            sig.split(",").forEach(function(p) { var kv = p.split("="); parts[kv[0]] = kv[1]; });
            var ts = parts["t"]; var v1 = parts["v1"];
            if (!ts || !v1) return false;
            var signedPayload = ts + "." + body;
            var enc = new TextEncoder();
            var key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
            var sig2 = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
            var hex  = Array.from(new Uint8Array(sig2)).map(function(b){ return b.toString(16).padStart(2,"0"); }).join("");
            return hex === v1;
          } catch(e) { return false; }
        }

        if (webhookSecret) {
          var valid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
          if (!valid) return new Response("Invalid signature", { status: 400 });
        }

        var event;
        try { event = JSON.parse(rawBody); } catch(e) {
          return new Response("Invalid JSON", { status: 400 });
        }

        var eventType = event.type || "";
        var obj       = event.data && event.data.object ? event.data.object : {};

        // Handle subscription events
        if (eventType === "checkout.session.completed") {
          var userId     = obj.client_reference_id || "";
          var customerId = obj.customer            || "";
          var subId      = obj.subscription        || "";
          if (userId && CACHE) {
            await CACHE.put("stripe:sub:" + userId, "active",     { expirationTtl: 60 * 60 * 24 * 400 });
            await CACHE.put("stripe:cus:" + userId, customerId,   { expirationTtl: 60 * 60 * 24 * 400 });
            await CACHE.put("stripe:sid:" + userId, subId,        { expirationTtl: 60 * 60 * 24 * 400 });
          }
        }

        if (eventType === "customer.subscription.deleted" || eventType === "customer.subscription.paused") {
          // Find userId by customerId
          var customerId = obj.customer || "";
          // We store sub status -- look up by iterating KV not possible easily
          // Instead store reverse lookup: customerId -> userId
          if (customerId && CACHE) {
            var uidKey = await CACHE.get("stripe:uid:" + customerId);
            if (uidKey) await CACHE.put("stripe:sub:" + uidKey, "cancelled", { expirationTtl: 60 * 60 * 24 * 400 });
          }
        }

        if (eventType === "checkout.session.completed" && obj.client_reference_id && obj.customer && CACHE) {
          // Store reverse lookup customerId -> userId
          await CACHE.put("stripe:uid:" + obj.customer, obj.client_reference_id, { expirationTtl: 60 * 60 * 24 * 400 });
        }

        if (eventType === "invoice.payment_succeeded") {
          var customerId = obj.customer || "";
          if (customerId && CACHE) {
            var uidKey = await CACHE.get("stripe:uid:" + customerId);
            if (uidKey) await CACHE.put("stripe:sub:" + uidKey, "active", { expirationTtl: 60 * 60 * 24 * 400 });
          }
        }

        if (eventType === "invoice.payment_failed") {
          var customerId = obj.customer || "";
          if (customerId && CACHE) {
            var uidKey = await CACHE.get("stripe:uid:" + customerId);
            if (uidKey) await CACHE.put("stripe:sub:" + uidKey, "past_due", { expirationTtl: 60 * 60 * 24 * 400 });
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown stripe action" }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
