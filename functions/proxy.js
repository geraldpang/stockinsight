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
    // -----------------------------------------------------------------------
    // /eps?sym=AAPL  -- Massive.com annual financials (real SEC-filed data)
    // Requires MASSIVE_KEY env var in Cloudflare Pages
    // -----------------------------------------------------------------------
    if (url.pathname === "/eps") {
      const sym        = (url.searchParams.get("sym") || "").toUpperCase().trim();
      const massiveKey = context.env.MASSIVE_KEY;
      if (!sym) {
        return new Response(JSON.stringify({ error: "Missing sym" }), {
          status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      if (!massiveKey) {
        return new Response(JSON.stringify({ error: "MASSIVE_KEY not configured" }), {
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      function fmtAmt(v) {
        if (v == null || v === 0) return "-";
        var a = Math.abs(v);
        if (a >= 1e12) return (v < 0 ? "-$" : "$") + (a/1e12).toFixed(2) + "T";
        if (a >= 1e9)  return (v < 0 ? "-$" : "$") + (a/1e9).toFixed(1)  + "B";
        if (a >= 1e6)  return (v < 0 ? "-$" : "$") + (a/1e6).toFixed(0)  + "M";
        return (v < 0 ? "-$" : "$") + a.toFixed(0);
      }
      var isRes  = await fetch("https://api.massive.com/v1/stocks/fundamentals/income-statements?ticker=" + sym + "&timeframe=annual&limit=10&apiKey=" + massiveKey, { headers: { "User-Agent": UA } });
      var isData = await isRes.json();
      if (!isData || !isData.results || isData.results.length === 0) {
        return new Response(JSON.stringify({ error: "No Massive data for " + sym, raw: isData }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      var cfByYear = {};
      try {
        var cfRes  = await fetch("https://api.massive.com/v1/stocks/fundamentals/cash-flow-statements?ticker=" + sym + "&timeframe=annual&limit=10&apiKey=" + massiveKey, { headers: { "User-Agent": UA } });
        var cfData = await cfRes.json();
        if (cfData && cfData.results) {
          cfData.results.forEach(function(r) {
            var yr = r.fiscal_year ? parseInt(r.fiscal_year, 10) : 0;
            if (yr) cfByYear[yr] = r;
          });
        }
      } catch (_) {}
      var bsByYear = {};
      try {
        var bsRes  = await fetch("https://api.massive.com/v1/stocks/fundamentals/balance-sheets?ticker=" + sym + "&timeframe=annual&limit=10&apiKey=" + massiveKey, { headers: { "User-Agent": UA } });
        var bsData = await bsRes.json();
        if (bsData && bsData.results) {
          bsData.results.forEach(function(r) {
            var yr = r.fiscal_year ? parseInt(r.fiscal_year, 10) : 0;
            if (yr) bsByYear[yr] = r;
          });
        }
      } catch (_) {}
      var rows = [];
      isData.results.forEach(function(r) {
        var yr  = r.fiscal_year ? parseInt(r.fiscal_year, 10) : 0;
        if (!yr) return;
        var eps = r.diluted_earnings_per_share != null ? r.diluted_earnings_per_share
                : r.basic_earnings_per_share   != null ? r.basic_earnings_per_share : null;
        var rev = r.revenues       != null ? r.revenues
                : r.total_revenues != null ? r.total_revenues : null;
        var ni  = r.net_income_loss != null ? r.net_income_loss
                : r.net_income      != null ? r.net_income : null;
        var cf  = cfByYear[yr] || {};
        var ocf = cf.net_cash_from_operating_activities != null ? cf.net_cash_from_operating_activities : null;
        var cap = cf.capital_expenditure != null ? cf.capital_expenditure : null;
        var bs  = bsByYear[yr] || {};
        rows.push({
          year:      yr,
          eps:       eps != null ? Math.round(eps * 100) / 100 : null,
          revenue:   fmtAmt(rev),
          netIncome: fmtAmt(ni),
          fcf:       (ocf != null && cap != null) ? fmtAmt(ocf + cap) : "-",
          debt:      bs.long_term_debt != null ? fmtAmt(bs.long_term_debt) : "-",
          _yahoo:    true,
        });
      });
      rows.sort(function(a, b) { return b.year - a.year; });
      return new Response(JSON.stringify({ data: rows, source: "massive" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
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
}
