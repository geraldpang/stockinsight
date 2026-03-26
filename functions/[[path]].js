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
    var knownRoutes = ["/proxy", "/anthropic", "/massive", "/eps", "/cache"];
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

    if (context.request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
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
      var tickerData   = slowResults[1];
      var dividendData = slowResults[2];
      var splitsData   = slowResults[3];
      var tenKBizData  = slowResults[4];
      var tenKRiskData = slowResults[5];

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
        ticker:    tickerData   && tickerData.results   ? tickerData.results   : null,
        dividends: dividendData && dividendData.results ? dividendData.results : [],
        splits:    splitsData   && splitsData.results   ? splitsData.results   : [],
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
          snapStatus:   snapData  ? (snapData.status  || "ok") : "null",
          aggsStatus:   aggsData  ? (aggsData.status  || "ok") : "null",
          indStatus:    rsiData   ? (rsiData.status   || "ok") : "null",
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
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      var action = url.searchParams.get("action") || "";
      var sym    = (url.searchParams.get("sym") || "").toUpperCase().trim();
      var tab    = (url.searchParams.get("tab") || "").toLowerCase().trim();

      // Config: read/write live_tickers list
      if (action === "config") {
        if (context.request.method === "POST") {
          var cfgBody = await context.request.text();
          await CACHE.put("config:live_tickers", cfgBody, { expirationTtl: 60 * 60 * 24 * 365 });
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        } else {
          var cfgVal = await CACHE.get("config:live_tickers");
          return new Response(JSON.stringify({ value: cfgVal ? JSON.parse(cfgVal) : [] }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
      }

      // Cache stats: list all cached keys with metadata
      if (action === "stats") {
        var listed = await CACHE.list({ prefix: "insight:" });
        var metaListed = await CACHE.list({ prefix: "meta:" });
        // Build meta map
        var metaMap = {};
        for (var mi = 0; mi < metaListed.keys.length; mi++) {
          var mk = metaListed.keys[mi].name;
          var mv = await CACHE.get(mk);
          if (mv) {
            try { metaMap[mk] = JSON.parse(mv); } catch(e) { metaMap[mk] = {}; }
          }
        }
        var keys = listed.keys.map(function(k) {
          var metaKey = k.name.replace("insight:", "meta:");
          var meta = metaMap[metaKey] || {};
          return { key: k.name, cachedAt: meta.cachedAt || null, size: meta.size || null };
        });
        return new Response(JSON.stringify({ keys: keys, count: keys.length }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      if (!sym || !tab) {
        return new Response(JSON.stringify({ error: "Missing sym or tab" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      var cacheKey = "insight:" + sym + ":" + tab;

      // Write to cache
      if (context.request.method === "POST") {
        var bodyText = await context.request.text();
        // Cache for 7 days
        await CACHE.put(cacheKey, bodyText, { expirationTtl: 60 * 60 * 24 * 7 });
        // Write metadata (cachedAt, size) — longer TTL so stats survive
        var metaKey = "meta:" + sym + ":" + tab;
        var metaVal = JSON.stringify({ cachedAt: new Date().toISOString(), size: bodyText.length });
        await CACHE.put(metaKey, metaVal, { expirationTtl: 60 * 60 * 24 * 8 });
        return new Response(JSON.stringify({ ok: true, key: cacheKey }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Read from cache
      var cached = await CACHE.get(cacheKey);
      if (cached) {
        return new Response(JSON.stringify({ hit: true, value: cached }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } else {
        return new Response(JSON.stringify({ hit: false }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
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
