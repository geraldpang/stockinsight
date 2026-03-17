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
    // /eps?sym=AAPL -- Scrape Macrotrends for 10-year annual diluted EPS
    // -----------------------------------------------------------------------
    if (url.pathname === "/eps") {
      const sym = (url.searchParams.get("sym") || "").toUpperCase().trim();
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

      const MT_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
      const MT_HEADERS = {
        "User-Agent":      MT_UA,
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer":         "https://www.macrotrends.net/",
      };

      // Step 1: Resolve ticker -> slug (e.g. AAPL -> apple)
      let slug = sym.toLowerCase();
      try {
        const sr = await fetch("https://www.macrotrends.net/assets/php/ticker_search_list.php?_=" + Date.now(), { headers: MT_HEADERS });
        const st = await sr.text();
        for (const line of st.split("\n")) {
          const parts = line.trim().split("|");
          if (parts.length >= 3 && parts[0].toUpperCase() === sym) {
            slug = parts[2].trim().toLowerCase();
            break;
          }
        }
      } catch (_) {}

      // Step 2: Fetch EPS page
      const epsUrl = "https://www.macrotrends.net/stocks/charts/" + sym + "/" + slug + "/eps-earnings-per-share-diluted";
      let html = "";
      try {
        const res = await fetch(epsUrl, { headers: MT_HEADERS });
        html = await res.text();
      } catch (e) {
        return new Response(JSON.stringify({ error: "Fetch failed: " + e.message, url: epsUrl }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Step 3: Extract embedded JS data array
      // Macrotrends embeds: var originalData = [{"date":"2024-09-27","value":"6.08"},...]
      let rawData = null;
      let m = html.match(/var\s+originalData\s*=\s*(\[\s*\{[\s\S]*?\}\s*\])/);
      if (!m) m = html.match(/var\s+chartData\s*=\s*(\[\s*\{[\s\S]*?\}\s*\])/);
      if (m) {
        try { rawData = JSON.parse(m[1]); } catch (_) {}
      }

      if (!rawData || rawData.length === 0) {
        return new Response(JSON.stringify({
          error:   "Could not parse Macrotrends data",
          url:     epsUrl,
          slug:    slug,
          htmlLen: html.length,
          blocked: html.includes("Access Denied") || html.length < 1000,
          sample:  html.substring(0, 500),
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      // Step 4: Aggregate quarterly entries to annual
      // Last entry per fiscal year = full-year EPS
      const currentYear = new Date().getFullYear();
      const byYear = {};
      for (const item of rawData) {
        const yr = item.date ? parseInt(item.date.substring(0, 4), 10) : 0;
        if (!yr || yr >= currentYear) continue;
        const v = parseFloat((item.value || "").replace(/[$,]/g, ""));
        if (!isNaN(v)) byYear[yr] = v;
      }

      const rows = Object.keys(byYear)
        .map(Number).sort((a, b) => b - a).slice(0, 10)
        .map(yr => ({ year: yr, eps: Math.round(byYear[yr] * 100) / 100, revenue: "-", _yahoo: false }));

      return new Response(JSON.stringify({ data: rows, source: "macrotrends", url: epsUrl, slug }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // -----------------------------------------------------------------------
    // /anthropic -- Claude API proxy (AI insight tabs)
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
}
