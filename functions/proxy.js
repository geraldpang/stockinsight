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
    // /eps?sym=AAPL  -- Macrotrends EPS scraper (annual diluted EPS)
    // -----------------------------------------------------------------------
    if (url.pathname === "/eps") {
      const sym = (url.searchParams.get("sym") || "").toUpperCase().trim();
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

      const MT_HEADERS = {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer":         "https://www.macrotrends.net/",
        "Cache-Control":   "no-cache",
      };

      // Step 1: Resolve slug from Macrotrends search list
      // Format per line: TICKER|Company Name|url-slug
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

      // Step 2: Fetch EPS page HTML
      const epsUrl = "https://www.macrotrends.net/stocks/charts/" + sym + "/" + slug + "/eps-earnings-per-share-diluted";
      let html = "";
      try {
        const pr = await fetch(epsUrl, { headers: MT_HEADERS });
        if (!pr.ok) {
          return new Response(JSON.stringify({ error: "HTTP " + pr.status, url: epsUrl }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        html = await pr.text();
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, url: epsUrl }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Step 3: Extract annual EPS data
      // Macrotrends embeds the chart data as a JS variable in the page:
      // var originalData = [{"date":"2024","value":"6.08"},...]
      // This is more reliable than parsing the HTML table
      const rows = [];
      const currentYear = new Date().getFullYear();

      // Method A: Try embedded JS data (most reliable)
      const jsMatch = html.match(/var\s+originalData\s*=\s*(\[[\s\S]*?\]);/);
      if (jsMatch) {
        try {
          const arr = JSON.parse(jsMatch[1]);
          for (const item of arr) {
            // Annual data has date like "2024" (4 digits), quarterly like "2024-03"
            if (item.date && /^\d{4}$/.test(item.date.trim()) && item.value != null && item.value !== "") {
              const yr  = parseInt(item.date.trim(), 10);
              const eps = parseFloat(item.value);
              if (yr && yr < currentYear && !isNaN(eps)) {
                rows.push({ year: yr, eps: Math.round(eps * 100) / 100, revenue: "-", _yahoo: false });
              }
            }
          }
        } catch (_) {}
      }

      // Method B: Fallback -- parse HTML table rows
      if (rows.length === 0) {
        // Find rows with pattern: <td>2024</td><td>$6.08</td>
        const trRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let trMatch;
        while ((trMatch = trRegex.exec(html)) !== null) {
          const cells = [];
          let tdMatch;
          const trHtml = trMatch[0];
          const tdRe   = /<td[^>]*>([\s\S]*?)<\/td>/gi;
          while ((tdMatch = tdRe.exec(trHtml)) !== null) {
            cells.push(tdMatch[1].replace(/<[^>]+>/g, "").trim());
          }
          if (cells.length >= 2) {
            const yr  = parseInt(cells[0], 10);
            const val = cells[1].replace(/[$,\s]/g, "");
            const eps = parseFloat(val);
            if (yr >= 2000 && yr < currentYear && !isNaN(eps)) {
              rows.push({ year: yr, eps: Math.round(eps * 100) / 100, revenue: "-", _yahoo: false });
            }
          }
        }
      }

      if (rows.length === 0) {
        return new Response(JSON.stringify({
          error:   "No EPS data found",
          url:     epsUrl,
          slug:    slug,
          htmlLen: html.length,
          hasOriginalData: html.includes("originalData"),
          sample:  html.substring(0, 800),
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
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
}    // -----------------------------------------------------------------------
    // /eps?sym=AAPL  -- Macrotrends annual EPS scraper
    // Data is embedded as JS variable: var originalData = [{date:"...",value:"..."},...]
    // Annual page: macrotrends.net/stocks/charts/{SYM}/{slug}/eps-earnings-per-share-diluted
    // -----------------------------------------------------------------------
    if (url.pathname === "/eps") {
      const sym = (url.searchParams.get("sym") || "").toUpperCase().trim();
      if (!sym) return new Response(JSON.stringify({ error: "Missing sym" }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

      const MT_HEADERS = {
        "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection":      "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest":  "document",
        "Sec-Fetch-Mode":  "navigate",
        "Sec-Fetch-Site":  "none",
        "Cache-Control":   "max-age=0",
      };

      // Step 1: Resolve ticker -> slug from Macrotrends search list
      let slug = sym.toLowerCase();
      try {
        const searchRes  = await fetch(
          "https://www.macrotrends.net/assets/php/ticker_search_list.php?_=" + Date.now(),
          { headers: MT_HEADERS }
        );
        const searchText = await searchRes.text();
        for (const line of searchText.split("\n")) {
          const parts = line.trim().split("|");
          if (parts.length >= 3 && parts[0].toUpperCase() === sym) {
            slug = parts[2].trim().toLowerCase();
            break;
          }
        }
      } catch (_) {}

      // Step 2: Fetch the EPS page
      const epsUrl  = "https://www.macrotrends.net/stocks/charts/" + sym + "/" + slug + "/eps-earnings-per-share-diluted";
      let html = "";
      try {
        const res = await fetch(epsUrl, { headers: MT_HEADERS });
        html = await res.text();
      } catch (e) {
        return new Response(JSON.stringify({ error: "Fetch error: " + e.message, url: epsUrl }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Step 3: Extract data from embedded JS variable
      // Macrotrends embeds: var originalData = [{"date":"2024-09-27","value":"6.08"},...]
      // Annual EPS page has this variable containing quarterly data that we aggregate to annual
      let rawData = null;

      // Try originalData first
      let m = html.match(/var\s+originalData\s*=\s*(\[\s*\{[\s\S]*?\}\s*\])/);
      if (!m) {
        // Try chartData
        m = html.match(/var\s+chartData\s*=\s*(\[\s*\{[\s\S]*?\}\s*\])/);
      }
      if (!m) {
        // Try any JS array with date/value pattern
        m = html.match(/"date"\s*:\s*"\d{4}-\d{2}-\d{2}"[\s\S]*?"value"\s*:\s*"[^"]*"/);
        if (m) {
          // Find the surrounding array
          const pos = html.indexOf(m[0]);
          const arrStart = html.lastIndexOf("[", pos);
          const arrEnd   = html.indexOf("]", pos) + 1;
          if (arrStart > 0 && arrEnd > arrStart) {
            try { rawData = JSON.parse(html.substring(arrStart, arrEnd)); } catch(_) {}
          }
        }
      } else {
        try { rawData = JSON.parse(m[1]); } catch(_) {}
      }

      if (!rawData || rawData.length === 0) {
        // Return debug info so we can see what Macrotrends actually sent back
        return new Response(JSON.stringify({
          error:   "Could not find data in Macrotrends page",
          url:     epsUrl,
          slug:    slug,
          htmlLen: html.length,
          blocked: html.includes("Access Denied") || html.includes("403") || html.length < 1000,
          sample:  html.substring(0, 800),
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      // Step 4: Aggregate to annual EPS (take last entry per calendar year = full-year)
      // Macrotrends quarterly data for annual page = each item is one fiscal quarter
      // The annual figure = last Q of each fiscal year
      const currentYear = new Date().getFullYear();
      const byYear = {};
      for (const item of rawData) {
        const yr = item.date ? parseInt(item.date.substring(0, 4), 10) : 0;
        if (!yr || yr >= currentYear) continue;
        const v = parseFloat((item.value || "").replace(/[$,]/g, ""));
        if (!isNaN(v)) byYear[yr] = v; // last entry per year wins (newest quarter of that year)
      }

      const rows = Object.keys(byYear)
        .map(Number)
        .sort((a, b) => b - a)
        .slice(0, 10)
        .map(yr => ({
          year:    yr,
          eps:     Math.round(byYear[yr] * 100) / 100,
          revenue: "-",
          _yahoo:  false,
        }));

      return new Response(JSON.stringify({ data: rows, source: "macrotrends", url: epsUrl, slug }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
