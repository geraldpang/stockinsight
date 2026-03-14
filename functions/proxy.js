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

  // ---------------------------------------------------------------------------
  // Macrotrends scraper — resolves ticker -> slug, fetches EPS + Revenue pages
  // ---------------------------------------------------------------------------
  async function scrapeMacrotrends(sym) {
    const MT_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    const headers = {
      "User-Agent":      MT_UA,
      "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer":         "https://www.macrotrends.net/",
    };

    // Step 1: Resolve ticker -> slug via Macrotrends search list
    let slug = sym.toLowerCase();
    try {
      const searchRes  = await fetch(
        "https://www.macrotrends.net/assets/php/ticker_search_list.php?_=" + Date.now(),
        { headers }
      );
      const searchText = await searchRes.text();
      // Each line: TICKER|Company Name|slug
      for (const line of searchText.split("\n")) {
        const parts = line.trim().split("|");
        if (parts.length >= 3 && parts[0].toUpperCase() === sym.toUpperCase()) {
          slug = parts[2].trim().toLowerCase();
          break;
        }
      }
    } catch (_) {}

    // Step 2: Fetch a Macrotrends page and extract the embedded data array
    async function fetchMTPage(mtUrl) {
      try {
        const res  = await fetch(mtUrl, { headers });
        if (!res.ok) return null;
        const html = await res.text();
        // Macrotrends embeds: var originalData = [{date:"...",value:"..."},...]
        let m = html.match(/var\s+originalData\s*=\s*(\[[\s\S]*?\]);/);
        if (!m) m = html.match(/var\s+chartData\s*=\s*(\[[\s\S]*?\]);/);
        if (!m) return null;
        return JSON.parse(m[1]);
      } catch (_) { return null; }
    }

    const tickerUpper = sym.toUpperCase();
    const epsUrl = "https://www.macrotrends.net/stocks/charts/" + tickerUpper + "/" + slug + "/eps-earnings-per-share-diluted";
    const revUrl = "https://www.macrotrends.net/stocks/charts/" + tickerUpper + "/" + slug + "/revenue";

    const [epsRaw, revRaw] = await Promise.all([fetchMTPage(epsUrl), fetchMTPage(revUrl)]);

    if (!epsRaw && !revRaw) {
      return { error: "Macrotrends scrape failed for " + sym, slug, epsUrl };
    }

    // Step 3: Aggregate quarterly data -> annual (last entry per year = full-year figure)
    function toAnnual(arr) {
      if (!arr) return {};
      const byYear = {};
      for (const item of arr) {
        const d = item.date || "";
        const v = item.value !== undefined ? item.value : null;
        if (!d || v === null || v === "") continue;
        const year = parseInt(d.substring(0, 4), 10);
        if (!year || year < 2005) continue;
        byYear[year] = parseFloat(v);
      }
      return byYear;
    }

    const epsAnnual = toAnnual(epsRaw);
    const revAnnual = toAnnual(revRaw);

    // Step 4: Build result array — 10 most recent completed years
    const currentYear = new Date().getFullYear();
    const allYears = Array.from(new Set([
      ...Object.keys(epsAnnual),
      ...Object.keys(revAnnual),
    ]))
      .map(Number)
      .filter(y => y < currentYear)
      .sort((a, b) => b - a)
      .slice(0, 10);

    const result = allYears.map(function(year) {
      const rev  = revAnnual[year];
      // Macrotrends revenue is in millions
      let revStr = "-";
      if (rev && rev > 0) {
        if (rev >= 1000000)   revStr = "$" + (rev / 1000000).toFixed(2) + "T";
        else if (rev >= 1000) revStr = "$" + (rev / 1000).toFixed(1) + "B";
        else                  revStr = "$" + rev.toFixed(0) + "M";
      }
      return {
        year,
        eps:     epsAnnual[year] !== undefined ? Math.round(epsAnnual[year] * 100) / 100 : null,
        revenue: revStr,
      };
    }).filter(r => r.eps !== null || r.revenue !== "-");

    return { data: result, slug, source: "macrotrends" };
  }

  try {
    // OPTIONS preflight
    if (context.request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // -----------------------------------------------------------------------
    // /eps?sym=AAPL  — Macrotrends historical EPS + Revenue
    // -----------------------------------------------------------------------
    if (url.pathname === "/eps") {
      const sym = (url.searchParams.get("sym") || "").toUpperCase().trim();
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      const result = await scrapeMacrotrends(sym);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // -----------------------------------------------------------------------
    // /anthropic — Claude API proxy (for MOAT, Financial, Technical tabs)
    // -----------------------------------------------------------------------
    if (url.pathname === "/anthropic") {
      const anthropicKey = context.env.ANTHROPIC_KEY;
      if (!anthropicKey) return new Response(JSON.stringify({ error: "ANTHROPIC_KEY not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      const body = await context.request.text();
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
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
    // All URL-based proxy routes
    // -----------------------------------------------------------------------
    if (!target) return new Response("Missing url", { status: 400 });

    // FMP
    if (target.includes("financialmodelingprep.com")) {
      const fmpKey = context.env.FMP_KEY;
      if (!fmpKey) return new Response(JSON.stringify({ error: "FMP_KEY not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
      const sep      = target.includes("?") ? "&" : "?";
      const res      = await fetch(target + sep + "apikey=" + fmpKey, { headers: { "User-Agent": UA } });
      const body     = await res.text();
      return new Response(body, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    // Alpha Vantage
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

    // Yahoo quoteSummary (requires crumb)
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

    // All other (Yahoo chart/price, etc.)
    const res  = await fetch(target, {
      headers: { "User-Agent": UA, "Accept": "application/json", "Referer": "https://finance.yahoo.com/" },
    });
    const body = await res.text();
    return new Response(body, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
