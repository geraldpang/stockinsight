export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400 });

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://finance.yahoo.com",
    "Referer": "https://finance.yahoo.com/",
  };

  // For quoteSummary, we need a crumb + cookie from Yahoo
  if (target.includes("quoteSummary")) {
    try {
      // Step 1: Get cookie by visiting Yahoo Finance
      const cookieRes = await fetch("https://finance.yahoo.com/", { headers });
      const cookieHeader = cookieRes.headers.get("set-cookie") || "";
      const cookie = cookieHeader.split(";")[0];

      // Step 2: Get crumb
      const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
        headers: { ...headers, "Cookie": cookie }
      });
      const crumb = await crumbRes.text();

      // Step 3: Fetch with crumb
      const separator = target.includes("?") ? "&" : "?";
      const finalUrl = target + separator + "crumb=" + encodeURIComponent(crumb);
      const res = await fetch(finalUrl, {
        headers: { ...headers, "Cookie": cookie }
      });
      const body = await res.text();
      return new Response(body, {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }

  // For all other requests (price chart etc), just proxy directly
  const res = await fetch(target, { headers });
  const body = await res.text();
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    }
  });
}
