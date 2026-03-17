export async function onRequest(context) {
  const url    = new URL(context.request.url);
  const target = url.searchParams.get("url");
  const UA     = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  async function getYahooCrumb() {
    const homeRes = await fetch("https://finance.yahoo.com/quote/AAPL/", {
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
    });
    const rawCookie = homeRes.headers.get("set-cookie") || "";
    const cookies   = rawCookie.split(/,(?=[^ ].*?=)/).map(c => c.split(";")[0].trim()).join("; ");
    const crumbRes  = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": UA, "Accept": "*/*", "Cookie": cookies, "Referer": "https://finance.yahoo.com/" },
    });
    const crumb = (await crumbRes.text()).trim();
    return { crumb, cookies };
  }

  try {
    if (context.request.method === "OPTIONS") {
      return new Response(null, {
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
      });
    }

    // -----------------------------------------------------------------------
    // /eps?sym=AAPL
    // Yahoo fundamentals-timeseries: 10yr annualDilutedEPS, Revenue, NI, FCF, Debt
    // -----------------------------------------------------------------------
    if (url.pathname === "/eps") {
      const sym = (url.searchParams.get("sym") || "").toUpperCase().trim();
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

      const { crumb, cookies } = await getYahooCrumb();
      if (!crumb || crumb.includes("{")) {
        return new Response(JSON.stringify({ error: "Could not get Yahoo crumb" }), {
          status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      const period2 = Math.floor(Date.now() / 1000);
      // Confirmed working field names from yfinance source
      // EPS: try DilutedEPS first, fall back to BasicEPS
      const types   = "annualDilutedEPS,annualBasicEPS,annualTotalRevenue,annualNetIncome,annualFreeCashFlow,annualLongTermDebt";
      const tsUrl   = "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/" + sym
        + "?symbol=" + sym
        + "&type=" + types
        + "&period1=493590046&period2=" + period2
        + "&crumb=" + encodeURIComponent(crumb);

      const tsRes  = await fetch(tsUrl, {
        headers: { "User-Agent": UA, "Accept": "application/json", "Cookie": cookies, "Referer": "https://finance.yahoo.com/" },
      });
      const tsData = await tsRes.json();
      const result = tsData && tsData.timeseries && tsData.timeseries.result;

      if (!result || result.length === 0) {
        return new Response(JSON.stringify({ error: "No timeseries data for " + sym, raw: tsData }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Extract {year -> value} map from a named timeseries entry
      // Yahoo structure: entry.timestamp[] + entry[typeName][] with {reportedValue:{raw,fmt}}
      function indexByYear(typeName) {
        const map = {};
        const entry = result.find(r => r.meta && r.meta.type && r.meta.type[0] === typeName);
        if (!entry) return map;
        const ts   = entry.timestamp || [];
        const vals = entry[typeName] || [];
        ts.forEach((t, i) => {
          const yr = new Date(t * 1000).getFullYear();
          const item = vals[i];
          const v = item && item.reportedValue != null
            ? (typeof item.reportedValue === "object" ? item.reportedValue.raw : item.reportedValue)
            : (item && item.raw != null ? item.raw : null);
          if (yr && v != null) map[yr] = v;
        });
        return map;
      }

      const dilutedMap = indexByYear("annualDilutedEPS");
      const basicMap   = indexByYear("annualBasicEPS");
      // Use diluted EPS where available, fall back to basic
      const epsMap  = Object.keys({...basicMap, ...dilutedMap}).reduce((m, yr) => {
        m[yr] = dilutedMap[yr] != null ? dilutedMap[yr] : basicMap[yr];
        return m;
      }, {});
      const revMap  = indexByYear("annualTotalRevenue");
      const niMap   = indexByYear("annualNetIncome");
      const fcfMap  = indexByYear("annualFreeCashFlow");
      const debtMap = indexByYear("annualLongTermDebt");

      function fmtAmt(v) {
        if (v == null || v === 0) return "-";
        const a = Math.abs(v);
        const s = a >= 1e12 ? (a/1e12).toFixed(2)+"T"
                : a >= 1e9  ? (a/1e9).toFixed(1)+"B"
                : a >= 1e6  ? (a/1e6).toFixed(0)+"M"
                : a.toFixed(0);
        return (v < 0 ? "-$" : "$") + s;
      }

      const currentYear = new Date().getFullYear();
      const allYears = Array.from(new Set([
        ...Object.keys(epsMap).map(Number),
        ...Object.keys(revMap).map(Number),
      ])).filter(y => y < currentYear).sort((a, b) => b - a).slice(0, 10);

      const rows = allYears.map(y => ({
        year:      y,
        eps:       epsMap[y] != null ? Math.round(epsMap[y] * 100) / 100 : null,
        revenue:   fmtAmt(revMap[y]),
        netIncome: fmtAmt(niMap[y]),
        fcf:       fmtAmt(fcfMap[y]),
        debt:      fmtAmt(debtMap[y]),
        _yahoo:    true,
      }));

      return new Response(JSON.stringify({ data: rows, source: "yahoo-timeseries" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    // -----------------------------------------------------------------------
    // /anthropic — Claude API proxy
    // -----------------------------------------------------------------------
    if (url.pathname === "/anthropic") {
      const anthropicKey = context.env.ANTHROPIC_KEY;
      if (!anthropicKey) return new Response(JSON.stringify({ error: "ANTHROPIC_KEY not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      const body = await context.request.text();
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body,
      });
      const data = await res.text();
      return new Response(data, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    // -----------------------------------------------------------------------
    // URL proxy routes
    // -----------------------------------------------------------------------
    if (!target) return new Response("Missing url", { status: 400 });

    if (target.includes("financialmodelingprep.com")) {
      const fmpKey = context.env.FMP_KEY;
      if (!fmpKey) return new Response(JSON.stringify({ error: "FMP_KEY not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      const sep  = target.includes("?") ? "&" : "?";
      const res  = await fetch(target + sep + "apikey=" + fmpKey, { headers: { "User-Agent": UA } });
      const body = await res.text();
      return new Response(body, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (target.includes("alphavantage.co")) {
      const avKey = context.env.AV_KEY;
      if (!avKey) return new Response(JSON.stringify({ error: "AV_KEY not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      const sep  = target.includes("?") ? "&" : "?";
      const res  = await fetch(target + sep + "apikey=" + avKey, { headers: { "User-Agent": UA } });
      const body = await res.text();
      return new Response(body, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (target.includes("quoteSummary") || target.includes("fundamentals-timeseries")) {
      const { crumb, cookies } = await getYahooCrumb();
      if (!crumb || crumb.includes("{")) return new Response(
        JSON.stringify({ error: "Could not obtain Yahoo crumb" }),
        { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
      const sep      = target.includes("?") ? "&" : "?";
      const finalUrl = target + sep + "crumb=" + encodeURIComponent(crumb);
      const dataRes  = await fetch(finalUrl, {
        headers: { "User-Agent": UA, "Accept": "application/json", "Cookie": cookies, "Referer": "https://finance.yahoo.com/" },
      });
      const body = await dataRes.text();
      return new Response(body, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    const res  = await fetch(target, { headers: { "User-Agent": UA, "Accept": "application/json", "Referer": "https://finance.yahoo.com/" } });
    const body = await res.text();
    return new Response(body, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
