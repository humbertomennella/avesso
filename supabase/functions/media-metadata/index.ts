import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
  });
}

function normalizeUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  return url;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let payload: { url?: string };
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const raw = String(payload?.url || "").trim();
  const url = normalizeUrl(raw);
  if (!url) return json({ error: "invalid_url" }, 400);

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let endpoint = "";
  let provider = "";

  if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) {
    endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(raw)}`;
    provider = "YouTube";
  } else if (host === "open.spotify.com") {
    endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(raw)}`;
    provider = "Spotify";
  } else {
    return json({ error: "unsupported_provider" }, 400);
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "AVESSO/1.0"
      }
    });
    if (!response.ok) return json({ title: null, provider, fallback: true }, 200);
    const data = await response.json();
    const title = String(data?.title || "").trim().slice(0, 220) || null;
    const author = String(data?.author_name || "").trim().slice(0, 120) || null;
    return json({ title, author, provider, fallback: !title });
  } catch {
    return json({ title: null, provider, fallback: true }, 200);
  }
});
