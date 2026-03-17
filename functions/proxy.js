export async function onRequest(context) {
  const url    = new URL(context.request.url);
  const target = url.searchParams.get("url");
  const UA     = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
    // /eps?sym=AAPL -- SEC EDGAR XBRL API (100% free, official GAAP data)
    // Step 1: ticker -> CIK via data.sec.gov/submissions/
    // Step 2: CIK -> EarningsPerShareDiluted, Revenues, NetIncome, etc.
    // -------------------------------------------------------------------------
    if (url.pathname === "/eps") {
      var sym = (url.searchParams.get("sym") || "").toUpperCase().trim();
      if (!sym) {
        return new Response(JSON.stringify({ error: "Missing sym" }), {
          status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      var SEC_HDR = { "User-Agent": "StockInsight contact@colaboree.com", "Accept": "application/json" };

      // Step 1: resolve ticker to CIK
      var tickerRes = await fetch("https://data.sec.gov/submissions/CIK.json", { headers: SEC_HDR });
      // Actually use the company tickers JSON
      var tickersRes = await fetch("https://data.sec.gov/files/company_tickers.json", { headers: SEC_HDR });
      var tickersData = await tickersRes.json();

      var cik = null;
      var entries = Object.values(tickersData);
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].ticker && entries[i].ticker.toUpperCase() === sym) {
          cik = String(entries[i].cik_str).padStart(10, "0");
          break;
        }
      }
      if (!cik) {
        return new Response(JSON.stringify({ error: "CIK not found for " + sym }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Step 2: fetch XBRL concept data -- one call per concept
      async function fetchConcept(concept) {
        try {
          var r = await fetch(
            "https://data.sec.gov/api/xbrl/companyconcept/" + cik + "/us-gaap/" + concept + ".json",
            { headers: SEC_HDR }
          );
          if (!r.ok) return null;
          var d = await r.json();
          return d;
        } catch (_) { return null; }
      }

      // Extract annual (10-K) values keyed by fiscal year end date
      function extractAnnual(data, unit) {
        if (!data || !data.units) return {};
        var arr = data.units[unit];
        if (!arr) return {};
        var map = {};
        arr.forEach(function(item) {
          // Only 10-K annual filings, form = "10-K"
          if (item.form === "10-K" && item.end) {
            var yr = parseInt(item.end.substring(0, 4), 10);
            // Use most recent filing for each year (overwrite)
            if (!map[yr] || item.filed > map[yr].filed) {
              map[yr] = item;
            }
          }
        });
        var result = {};
        Object.keys(map).forEach(function(yr) { result[yr] = map[yr].val; });
        return result;
      }

      // Fetch all concepts in parallel
      var results = await Promise.all([
        fetchConcept("EarningsPerShareDiluted"),
        fetchConcept("Revenues"),
        fetchConcept("RevenueFromContractWithCustomerExcludingAssessedTax"),
        fetchConcept("NetIncomeLoss"),
        fetchConcept("NetCashProvidedByUsedInOperatingActivities"),
        fetchConcept("PaymentsToAcquirePropertyPlantAndEquipment"),
        fetchConcept("LongTermDebt"),
      ]);

      var epsMap  = extractAnnual(results[0], "USD/shares");
      var revMap  = extractAnnual(results[1], "USD");
      var rev2Map = extractAnnual(results[2], "USD");  // alternate revenue tag
      var niMap   = extractAnnual(results[3], "USD");
      var ocfMap  = extractAnnual(results[4], "USD");
      var capexMap= extractAnnual(results[5], "USD");
      var debtMap = extractAnnual(results[6], "USD");

      // Merge revenue maps (different companies use different tags)
      Object.keys(rev2Map).forEach(function(yr) {
        if (revMap[yr] == null) revMap[yr] = rev2Map[yr];
      });

      var currentYear = new Date().getFullYear();
      var allYears = [];
      var seen = {};
      [epsMap, revMap, niMap].forEach(function(m) {
        Object.keys(m).forEach(function(yr) {
          yr = parseInt(yr, 10);
          if (yr < currentYear && !seen[yr]) { seen[yr] = 1; allYears.push(yr); }
        });
      });
      allYears.sort(function(a, b) { return b - a; });
      allYears = allYears.slice(0, 10);

      if (allYears.length === 0) {
        return new Response(JSON.stringify({ error: "No annual data for " + sym + " (CIK " + cik + ")" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      var rows = allYears.map(function(yr) {
        var ocf   = ocfMap[yr]   != null ? ocfMap[yr]   : null;
        var capex = capexMap[yr] != null ? capexMap[yr] : null;
        var fcf   = (ocf != null && capex != null) ? ocf - capex : null;
        return {
          year:      yr,
          eps:       epsMap[yr] != null ? Math.round(epsMap[yr] * 100) / 100 : null,
          revenue:   fmtAmt(revMap[yr]  != null ? revMap[yr]  : null),
          netIncome: fmtAmt(niMap[yr]   != null ? niMap[yr]   : null),
          fcf:       fmtAmt(fcf),
          debt:      fmtAmt(debtMap[yr] != null ? debtMap[yr] : null),
          _yahoo:    true,
        };
      });

      return new Response(JSON.stringify({ data: rows, source: "sec-edgar", cik: cik }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
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
      const { crumb, cookies } = await getYahooCrumb();
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
