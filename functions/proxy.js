export async function onRequest(context) {
  const url    = new URL(context.request.url);
  const target = url.searchParams.get("url");
  const UA     = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // Helper: fetch Yahoo crumb + cookies
  async function getYahooCrumb() {
    const homeRes = await fetch("https://finance.yahoo.com/quote/AAPL/", {
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

  try {
    // /eps?sym=AAPL  -- Finnhub annual EPS + financials (real SEC data, free tier)
    // Requires FINNHUB_KEY env var in Cloudflare Pages
    if (url.pathname === "/eps") {
      var sym        = (url.searchParams.get("sym") || "").toUpperCase().trim();
      var finnhubKey = context.env.FINNHUB_KEY;
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      if (!finnhubKey) return new Response(JSON.stringify({ error: "FINNHUB_KEY not configured" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

      function fmtAmt(v) {
        if (v == null || v === 0) return "-";
        var a = Math.abs(v);
        if (a >= 1e12) return (v < 0 ? "-$" : "$") + (a/1e12).toFixed(2) + "T";
        if (a >= 1e9)  return (v < 0 ? "-$" : "$") + (a/1e9).toFixed(1)  + "B";
        if (a >= 1e6)  return (v < 0 ? "-$" : "$") + (a/1e6).toFixed(0)  + "M";
        return (v < 0 ? "-$" : "$") + a.toFixed(2);
      }

      var metricRes  = await fetch("https://finnhub.io/api/v1/stock/metric?symbol=" + sym + "&metric=all&token=" + finnhubKey, { headers: { "User-Agent": UA } });
      var metricData = await metricRes.json();

      if (!metricData || !metricData.series || !metricData.series.annual) {
        return new Response(JSON.stringify({ error: "No Finnhub data for " + sym, raw: metricData }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      var annual = metricData.series.annual;

      function buildMap(arr) {
        var map = {};
        if (!arr) return map;
        arr.forEach(function(item) {
          var yr = item.period ? parseInt(item.period.substring(0, 4), 10) : 0;
          if (yr) map[yr] = item.v;
        });
        return map;
      }

      var epsMap  = buildMap(annual.eps);
      var revMap  = buildMap(annual.revenue);
      var niMap   = buildMap(annual.netIncome);
      var fcfMap  = buildMap(annual.fcf);
      var debtMap = buildMap(annual.longTermDebt);

      var currentYear = new Date().getFullYear();
      var merged = Object.assign({}, epsMap, revMap);
      var allYears = Object.keys(merged).map(Number)
        .filter(function(y) { return y < currentYear; })
        .sort(function(a, b) { return b - a; })
        .slice(0, 10);

      if (allYears.length === 0) {
        return new Response(JSON.stringify({ error: "Empty series for " + sym, keys: Object.keys(annual) }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      var rows = allYears.map(function(yr) {
        return {
          year:      yr,
          eps:       epsMap[yr]  != null ? Math.round(epsMap[yr]  * 100) / 100 : null,
          revenue:   fmtAmt(revMap[yr]  != null ? revMap[yr]  * 1e6 : null),
          netIncome: fmtAmt(niMap[yr]   != null ? niMap[yr]   * 1e6 : null),
          fcf:       fmtAmt(fcfMap[yr]  != null ? fcfMap[yr]  * 1e6 : null),
          debt:      fmtAmt(debtMap[yr] != null ? debtMap[yr] * 1e6 : null),
          _yahoo:    true,
        };
      });

      return new Response(JSON.stringify({ data: rows, source: "finnhub" }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }


    // -----------------------------------------------------------------------
    // ANTHROPIC API route -- POST /anthropic
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // All URL-based proxy routes below
    // -----------------------------------------------------------------------
    if (!target) return new Response("Missing url", { status: 400 });

    // FMP -- key injected server-side
    if (target.includes("financialmodelingprep.com")) {
      const fmpKey = context.env.FMP_KEY;
      if (!fmpKey) return new Response(JSON.stringify({ error: "FMP_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      const sep      = target.includes("?") ? "&" : "?";
      const finalUrl = target + sep + "apikey=" + fmpKey;
      const res      = await fetch(finalUrl, { headers: { "User-Agent": UA } });
      const body     = await res.text();
      return new Response(body, {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Alpha Vantage -- key injected server-side
    if (target.includes("alphavantage.co")) {
      const avKey = context.env.AV_KEY;
      if (!avKey) return new Response(JSON.stringify({ error: "AV_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      const sep      = target.includes("?") ? "&" : "?";
      const finalUrl = target + sep + "apikey=" + avKey;
      const res      = await fetch(finalUrl, { headers: { "User-Agent": UA } });
      const body     = await res.text();
      return new Response(body, {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Yahoo endpoints that require crumb
    if (target.includes("quoteSummary") || target.includes("fundamentals-timeseries")) {
      const { crumb, cookies } = await getYahooCrumb();
      if (!crumb || crumb.includes("{")) {
        return new Response(JSON.stringify({ error: "Could not obtain Yahoo crumb", raw: crumb }), {
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
      const body = await dataRes.text();
      return new Response(body, {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // All other requests (chart/price etc.)
    const res  = await fetch(target, {
      headers: {
        "User-Agent": UA,
        "Accept":     "application/json",
        "Referer":    "https://finance.yahoo.com/",
      },
    });
    const body = await res.text();
    return new Response(body, {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}    // /eps?sym=AAPL  -- Finnhub annual EPS + Revenue (real SEC data, free tier)
    // Requires FINNHUB_KEY env var in Cloudflare Pages
    if (url.pathname === "/eps") {
      var sym        = (url.searchParams.get("sym") || "").toUpperCase().trim();
      var finnhubKey = context.env.FINNHUB_KEY;
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      if (!finnhubKey) return new Response(JSON.stringify({ error: "FINNHUB_KEY not configured" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

      function fmtAmt(v) {
        if (v == null || v === 0) return "-";
        var a = Math.abs(v);
        if (a >= 1e12) return (v < 0 ? "-$" : "$") + (a/1e12).toFixed(2) + "T";
        if (a >= 1e9)  return (v < 0 ? "-$" : "$") + (a/1e9).toFixed(1)  + "B";
        if (a >= 1e6)  return (v < 0 ? "-$" : "$") + (a/1e6).toFixed(0)  + "M";
        return (v < 0 ? "-$" : "$") + a.toFixed(2);
      }

      // Finnhub basic financials -- series.annual has EPS and revenue by year
      var metricRes  = await fetch("https://finnhub.io/api/v1/stock/metric?symbol=" + sym + "&metric=all&token=" + finnhubKey, { headers: { "User-Agent": UA } });
      var metricData = await metricRes.json();

      if (!metricData || !metricData.series || !metricData.series.annual) {
        return new Response(JSON.stringify({ error: "No Finnhub data for " + sym, raw: metricData }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      var annual = metricData.series.annual;

      // Build year->value maps from Finnhub series
      // Each series is [{period:"2024-09-28", v:6.08}, ...]
      function buildMap(arr) {
        var map = {};
        if (!arr) return map;
        arr.forEach(function(item) {
          var yr = item.period ? parseInt(item.period.substring(0, 4), 10) : 0;
          if (yr) map[yr] = item.v;
        });
        return map;
      }

      var epsMap  = buildMap(annual.eps);           // diluted EPS
      var revMap  = buildMap(annual.revenue);       // total revenue
      var niMap   = buildMap(annual.netIncome);     // net income
      var fcfMap  = buildMap(annual.fcf);           // free cash flow
      var debtMap = buildMap(annual.longTermDebt);  // long-term debt

      var currentYear = new Date().getFullYear();
      var allYears = Object.keys(Object.assign({}, epsMap, revMap))
        .map(Number)
        .filter(function(y) { return y < currentYear; })
        .sort(function(a, b) { return b - a; })
        .slice(0, 10);

      if (allYears.length === 0) {
        return new Response(JSON.stringify({ error: "No annual series data for " + sym, keys: Object.keys(annual) }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      var rows = allYears.map(function(yr) {
        return {
          year:      yr,
          eps:       epsMap[yr]  != null ? Math.round(epsMap[yr]  * 100) / 100 : null,
          revenue:   fmtAmt(revMap[yr]  != null ? revMap[yr]  * 1e6 : null), // Finnhub revenue in millions
          netIncome: fmtAmt(niMap[yr]   != null ? niMap[yr]   * 1e6 : null),
          fcf:       fmtAmt(fcfMap[yr]  != null ? fcfMap[yr]  * 1e6 : null),
          debt:      fmtAmt(debtMap[yr] != null ? debtMap[yr] * 1e6 : null),
          _yahoo:    true,
        };
      });

      return new Response(JSON.stringify({ data: rows, source: "finnhub" }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
