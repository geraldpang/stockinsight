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
    var knownRoutes = ["/proxy", "/anthropic", "/massive", "/eps"];
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

      var results = await Promise.all([
        // Existing
        fetch(BASE + "/v2/reference/news?ticker=" + sym + "&limit=10&order=desc&sort=published_utc&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/vX/reference/tickers/" + sym + "?apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v3/reference/dividends?ticker=" + sym + "&limit=10&order=desc&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v3/reference/splits?ticker=" + sym + "&order=desc&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        // New endpoints
        fetch(BASE + "/v2/aggs/ticker/" + sym + "/range/1/day/" + from1yr + "/" + toDate + "?adjusted=true&sort=desc&limit=365&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v2/snapshot/locale/us/markets/stocks/tickers/" + sym + "?apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/sma/" + sym + "?timespan=day&adjusted=true&window=50&series_type=close&order=desc&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/sma/" + sym + "?timespan=day&adjusted=true&window=200&series_type=close&order=desc&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/ema/" + sym + "?timespan=day&adjusted=true&window=20&series_type=close&order=desc&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/rsi/" + sym + "?timespan=day&adjusted=true&window=14&series_type=close&order=desc&limit=10&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/macd/" + sym + "?timespan=day&adjusted=true&short_window=12&long_window=26&signal_window=9&series_type=close&order=desc&limit=10&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v2/last/trade/" + sym + "?apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/sma/" + sym + "?timespan=week&adjusted=true&window=10&series_type=close&order=desc&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v1/indicators/sma/" + sym + "?timespan=week&adjusted=true&window=40&series_type=close&order=desc&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/stocks/filings/10-K/vX/sections?ticker=" + sym + "&section=business&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/stocks/filings/10-K/vX/sections?ticker=" + sym + "&section=risk_factors&limit=1&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
      ]);

      var newsData     = results[0];
      var tickerData   = results[1];
      var dividendData = results[2];
      var splitsData   = results[3];
      var aggsData     = results[4];
      var snapData     = results[5];
      var sma50Data    = results[6];
      var sma200Data   = results[7];
      var ema20Data    = results[8];
      var rsiData      = results[9];
      var macdData      = results[10];
      var lastTradeData = results[11];
      var wsma10Data    = results[12];
      var wsma40Data    = results[13];
      var tenKBizData   = results[14];
      var tenKRiskData  = results[15];

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
