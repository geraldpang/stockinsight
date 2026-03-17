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
    // OPTIONS preflight
    // -----------------------------------------------------------------------
    if (context.request.method === "OPTIONS") {
      return new Response(null, {
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
      });
    }

    // -----------------------------------------------------------------------
    // /eps?sym=AAPL
    // Massive.com Stocks API - SEC-sourced annual income statements
    // Endpoint: api.massive.com/v1/stocks/fundamentals/income-statements
    // Requires MASSIVE_KEY env var in Cloudflare
    // -----------------------------------------------------------------------
    if (url.pathname === "/eps") {
      const sym        = (url.searchParams.get("sym") || "").toUpperCase().trim();
      const massiveKey = context.env.MASSIVE_KEY;
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      if (!massiveKey) return new Response(JSON.stringify({ error: "MASSIVE_KEY not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

      function fmtAmt(v) {
        if (v == null || v === 0) return "-";
        const a = Math.abs(v);
        const s = a >= 1e12 ? (a/1e12).toFixed(2)+"T"
                : a >= 1e9  ? (a/1e9).toFixed(1)+"B"
                : a >= 1e6  ? (a/1e6).toFixed(0)+"M"
                : a.toFixed(0);
        return (v < 0 ? "-$" : "$") + s;
      }

      // Fetch annual income statements -- Massive v1 endpoint
      const isUrl = "https://api.massive.com/v1/stocks/fundamentals/income-statements"
        + "?ticker=" + sym
        + "&timeframe=annual"
        + "&limit=10"
        + "&apiKey=" + massiveKey;

      const isRes  = await fetch(isUrl, { headers: { "User-Agent": UA } });
      const isData = await isRes.json();

      if (!isData || !isData.results || isData.results.length === 0) {
        // Try legacy vX endpoint as fallback
        const vxUrl = "https://api.massive.com/vX/reference/financials"
          + "?ticker=" + sym
          + "&timeframe=annual"
          + "&limit=10"
          + "&apiKey=" + massiveKey;
        const vxRes  = await fetch(vxUrl, { headers: { "User-Agent": UA } });
        const vxData = await vxRes.json();
        return new Response(JSON.stringify({ error: "No results for " + sym, v1: isData, vx: vxData }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Also fetch cash flow statements for FCF
      const cfUrl = "https://api.massive.com/v1/stocks/fundamentals/cash-flow-statements"
        + "?ticker=" + sym
        + "&timeframe=annual"
        + "&limit=10"
        + "&apiKey=" + massiveKey;

      let cfByYear = {};
      try {
        const cfRes  = await fetch(cfUrl, { headers: { "User-Agent": UA } });
        const cfData = await cfRes.json();
        if (cfData && cfData.results) {
          cfData.results.forEach(function(r) {
            const yr = r.fiscal_year ? parseInt(r.fiscal_year, 10) : 0;
            if (yr) cfByYear[yr] = r;
          });
        }
      } catch (_) {}

      // Also fetch balance sheets for long-term debt
      const bsUrl = "https://api.massive.com/v1/stocks/fundamentals/balance-sheets"
        + "?ticker=" + sym
        + "&timeframe=annual"
        + "&limit=10"
        + "&apiKey=" + massiveKey;

      let bsByYear = {};
      try {
        const bsRes  = await fetch(bsUrl, { headers: { "User-Agent": UA } });
        const bsData = await bsRes.json();
        if (bsData && bsData.results) {
          bsData.results.forEach(function(r) {
            const yr = r.fiscal_year ? parseInt(r.fiscal_year, 10) : 0;
            if (yr) bsByYear[yr] = r;
          });
        }
      } catch (_) {}

      const rows = isData.results.map(function(r) {
        const yr  = r.fiscal_year ? parseInt(r.fiscal_year, 10) : 0;
        // EPS: prefer diluted, fall back to basic
        const eps = r.diluted_earnings_per_share != null ? r.diluted_earnings_per_share
                  : r.basic_earnings_per_share   != null ? r.basic_earnings_per_share
                  : r.eps_diluted                != null ? r.eps_diluted
                  : r.eps_basic                  != null ? r.eps_basic : null;
        const rev = r.revenues           != null ? r.revenues
                  : r.total_revenues     != null ? r.total_revenues
                  : r.net_revenues       != null ? r.net_revenues : null;
        const ni  = r.net_income_loss    != null ? r.net_income_loss
                  : r.net_income         != null ? r.net_income : null;
        // FCF from cash flow statement
        const cf  = cfByYear[yr] || {};
        const ocf = cf.net_cash_from_operating_activities != null ? cf.net_cash_from_operating_activities : null;
        const cap = cf.capital_expenditure != null ? cf.capital_expenditure : null;
        const fcf = (ocf != null && cap != null) ? ocf + cap : null;
        // Debt from balance sheet
        const bs   = bsByYear[yr] || {};
        const debt = bs.long_term_debt != null ? bs.long_term_debt : null;
        return {
          year:      yr,
          eps:       eps != null ? Math.round(eps * 100) / 100 : null,
          revenue:   fmtAmt(rev),
          netIncome: fmtAmt(ni),
          fcf:       fmtAmt(fcf),
          debt:      fmtAmt(debt),
          _yahoo:    true,
        };
      }).filter(function(r) { return r.year > 0; });

      rows.sort(function(a, b) { return b.year - a.year; });
      return new Response(JSON.stringify({ data: rows, source: "massive" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // -----------------------------------------------------------------------
    // ANTHROPIC API route - POST /anthropic
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

    // FMP - key injected server-side
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

    // Alpha Vantage - key injected server-side
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
}
