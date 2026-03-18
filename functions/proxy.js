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
      var massiveKey = context.env.MASSIVE_KEY;
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), { status:400, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"} });
      if (!massiveKey) return new Response(JSON.stringify({ error: "MASSIVE_KEY not configured" }), { status:500, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"} });

      var BASE = "https://api.polygon.io";
      var HDR  = { "User-Agent": UA };

      var results = await Promise.all([
        fetch(BASE + "/v2/reference/news?ticker=" + sym + "&limit=10&order=desc&sort=published_utc&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/vX/reference/tickers/" + sym + "?apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v3/reference/dividends?ticker=" + sym + "&limit=10&order=desc&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
        fetch(BASE + "/v3/reference/splits?ticker=" + sym + "&order=desc&apiKey=" + massiveKey, { headers: HDR }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
      ]);

      var newsData     = results[0];
      var tickerData   = results[1];
      var dividendData = results[2];
      var splitsData   = results[3];

      return new Response(JSON.stringify({
        news:      newsData     && newsData.results     ? newsData.results      : [],
        ticker:    tickerData   && tickerData.results   ? tickerData.results    : null,
        dividends: dividendData && dividendData.results ? dividendData.results  : [],
        splits:    splitsData   && splitsData.results   ? splitsData.results    : [],
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
