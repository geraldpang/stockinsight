export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400 });

  const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  try {
    if (target.includes("quoteSummary")) {
      // Step 1: Hit Yahoo Finance to get session cookies
      const homeRes = await fetch("https://finance.yahoo.com/quote/AAPL/", {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });

      // Collect cookies
      const rawCookie = homeRes.headers.get("set-cookie") || "";
      const cookies = rawCookie.split(/,(?=[^ ].*?=)/).map(c => c.split(";")[0].trim()).join("; ");

      // Step 2: Get crumb
      const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
        headers: {
          "User-Agent": UA,
          "Accept": "*/*",
          "Cookie": cookies,
          "Referer": "https://finance.yahoo.com/",
        },
      });
      const crumb = (await crumbRes.text()).trim();

      if (!crumb || crumb.includes("{")) {
        return new Response(JSON.stringify({ error: "Could not obtain crumb", raw: crumb }), {
          status: 502,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Step 3: Fetch with crumb + cookies
      const sep = target.includes("?") ? "&" : "?";
      const finalUrl = target + sep + "crumb=" + encodeURIComponent(crumb);
      const dataRes = await fetch(finalUrl, {
        headers: {
          "User-Agent": UA,
          "Accept": "application/json",
          "Cookie": cookies,
          "Referer": "https://finance.yahoo.com/",
        },
      });
      const body = await dataRes.text();
      return new Response(body, {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

    } else {
      // Chart/price — no crumb needed
      const res = await fetch(target, {
        headers: {
          "User-Agent": UA,
          "Accept": "application/json",
          "Referer": "https://finance.yahoo.com/",
        },
      });
      const body = await res.text();
      return new Response(body, {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
