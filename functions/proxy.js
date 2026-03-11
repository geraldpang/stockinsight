export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400 });

  const res = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
  });

  const body = await res.text();
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
