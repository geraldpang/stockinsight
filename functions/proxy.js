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
    // Scrape Macrotrends annual EPS table (HTML parse, no API key needed)
    // URL: macrotrends.net/stocks/charts/{SYM}/{slug}/eps-earnings-per-share-diluted
    // -----------------------------------------------------------------------
    if (url.pathname === "/eps") {
      const sym = (url.searchParams.get("sym") || "").toUpperCase().trim();
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

      const MT_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
      const MT_HEADERS = {
        "User-Agent":      MT_UA,
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer":         "https://www.macrotrends.net/",
      };

      // Step 1: Resolve ticker -> company slug via Macrotrends search list
      let slug = sym.toLowerCase();
      try {
        const searchRes  = await fetch("https://www.macrotrends.net/assets/php/ticker_search_list.php?_=" + Date.now(), { headers: MT_HEADERS });
        const searchText = await searchRes.text();
        // Format: TICKER|Company Name|slug  (one per line)
        for (const line of searchText.split(String.fromCharCode(10))) {
          const parts = line.trim().split("|");
          if (parts.length >= 3 && parts[0].toUpperCase() === sym) {
            // slug is the URL-safe company name e.g. "apple" or "microsoft"
            slug = parts[2].trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
            break;
          }
        }
      } catch (_) {}

      // Step 2: Fetch the EPS page
      const epsUrl = "https://www.macrotrends.net/stocks/charts/" + sym + "/" + slug + "/eps-earnings-per-share-diluted";
      let html = "";
      try {
        const pageRes = await fetch(epsUrl, { headers: MT_HEADERS });
        if (!pageRes.ok) {
          return new Response(JSON.stringify({ error: "Macrotrends returned " + pageRes.status, url: epsUrl }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        html = await pageRes.text();
      } catch (e) {
        return new Response(JSON.stringify({ error: "Fetch failed: " + e.message }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Step 3: Parse annual EPS table from HTML
      // Macrotrends has two tables with class "historical_data_table table"
      // First table = annual EPS, second = quarterly EPS
      // Each row has two <td>: year and EPS value (starting with $)
      function parseEpsTable(html, tableIndex) {
        // Find all tables with the right class
        const tableRegex = /<table[^>]+class="[^"]*historical_data_table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
        const tables = [];
        let m;
        while ((m = tableRegex.exec(html)) !== null) tables.push(m[1]);

        if (!tables[tableIndex]) return [];

        const tableHtml = tables[tableIndex];
        const rowRegex  = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        const results   = [];
        let firstRow    = true;

        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
          if (firstRow) { firstRow = false; continue; } // skip header row
          const rowHtml  = rowMatch[1];
          // Extract cell text -- strip all HTML tags
          const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
          const cells     = [];
          let cellMatch;
          while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
            const text = cellMatch[1].replace(/<[^>]+>/g, "").trim();
            if (text) cells.push(text);
          }
          if (cells.length >= 2) results.push({ label: cells[0], value: cells[1] });
        }
        return results;
      }

      const annualRows = parseEpsTable(html, 0);

      if (annualRows.length === 0) {
        // Macrotrends may have blocked or changed structure -- return debug info
        return new Response(JSON.stringify({
          error:  "Could not parse Macrotrends table",
          url:    epsUrl,
          htmlLen: html.length,
          sample: html.substring(0, 500),
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      // Step 4: Convert to {year, eps} rows
      // label = "2024", value = "$6.08" (or "$-1.23")
      const currentYear = new Date().getFullYear();
      const rows = [];

      for (const row of annualRows) {
        const yr = parseInt(row.label, 10);
        if (!yr || yr >= currentYear) continue;
        // Parse EPS -- strip $ and handle negatives like "$-1.23"
        const epsStr = row.value.replace(/[$,\s]/g, "");
        const eps    = parseFloat(epsStr);
        if (isNaN(eps)) continue;
        rows.push({
          year:    yr,
          eps:     Math.round(eps * 100) / 100,
          revenue: "-", // revenue fetched separately from yahooHistory
          _yahoo:  false,
        });
      }

      rows.sort((a, b) => b.year - a.year);

      return new Response(JSON.stringify({ data: rows.slice(0, 10), source: "macrotrends", url: epsUrl }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    // -----------------------------------------------------------------------
    // /anthropic -- Claude API proxy
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
