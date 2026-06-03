// deploy this to cloudflare worker, set HMAC_SECRET, re-generate the hash before deploying the web page
export default {
    async fetch(request, env, ctx) {
      const ALLOWED_ORIGINS = [
        "irodori.example.com",
      ];
  
      const ALLOWED_HOSTS = [
        "www.irodori.jpf.go.jp",
        "drive.usercontent.google.com",
        "www.jpf.or.kr",
      ];
  
      const origin = request.headers.get("Origin");
  
      // --- Origin whitelist ---
      if (!origin || !ALLOWED_ORIGINS.some(d => d === origin || origin.endsWith(`.${d}`))) {
        return new Response("Unauthorized", { status: 401 });
      }
  
      // --- Method restriction ---
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        return new Response("Method Not Allowed", { status: 405 });
      }
  
      // --- Preflight ---
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin),
        });
      }
  
      const url = new URL(request.url);
      const target = url.searchParams.get("url");
      const sig = url.searchParams.get("sig");
      const bypassCache = ["1", "true"].includes(url.searchParams.get("bypass_cache"))
  
      if (!target) return new Response("Missing target URL", { status: 400 });
      if (!sig) return new Response("Missing URL signature", { status: 400 });
  
      let targetUrl;
      try {
        targetUrl = new URL(target);
      } catch {
        return new Response("Invalid target URL", { status: 400 });
      }
  
      // --- Target allowlist ---
      if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
        return new Response("Forbidden target", { status: 403 });
      }
  
      // Convert secret and message strings to ArrayBuffers
      const encoder = new TextEncoder();
      const secretBuffer = encoder.encode(env.HMAC_SECRET);
      const messageBuffer = encoder.encode(targetUrl.toString());
  
      // Import the raw secret key into a CryptoKey object
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        secretBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
  
      const signatureBytes = hexToBytes(sig);
      const isValid = await crypto.subtle.verify(
        "HMAC",
        cryptoKey,
        signatureBytes,
        messageBuffer
      );
  
      if (!isValid) {
        return new Response("Invalid HMAC signature", { status: 403 });
      }
  
      // --- Normalize cache key ---
      const cacheKey = new Request(normalizeCacheKey(targetUrl), {
        method: "GET",
      });
  
      const cache = caches.default;
  
      // --- Cache lookup ---
      let cached = await cache.match(cacheKey);
      if (cached && !bypassCache) {
        return withCors(cached, origin);
      }
  
      if (bypassCache) {
        await cache.delete(cacheKey)
      }
  
      // --- Sanitize headers ---
      const headers = new Headers();
      const allowedHeaders = ["accept", "range", "user-agent"];
      for (const [k, v] of request.headers) {
        if (allowedHeaders.includes(k.toLowerCase())) {
          headers.set(k, v);
        }
      }
  
      // --- Fetch (Google Drive aware) ---
      let response;
      if (targetUrl.hostname.includes("googleusercontent.com")) {
        response = await handleGoogleDrive(targetUrl.toString(), headers);
      } else {
        response = await fetch(targetUrl.toString(), {
          method: "GET",
          headers,
        });
      }
  
      // --- Basic abuse protection (size limit) ---
      const contentLength = response.headers.get("content-length");
      if (contentLength && Number(contentLength) > 64 * 1024 * 1024) {
        return new Response("File too large", { status: 413 });
      }
  
      // --- Detect if this is actually a file ---
      const isFile = isActualFile(response);
  
      // --- Prepare response headers ---
      const newHeaders = new Headers(response.headers);
      newHeaders.delete("set-cookie");
  
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => {
        newHeaders.set(k, v);
      });
  
      const finalResponse = new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
  
      // --- Cache only real files ---
      if (isFile && response.ok) {
        ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
      }
  
      return finalResponse;
    },
  };
  
  
  
  // ================= HELPERS =================
  
  function corsHeaders(origin) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Range, Accept",
      "Access-Control-Allow-Credentials": "true",
    };
  }
  
  function withCors(response, origin) {
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => {
      headers.set(k, v);
    });
  
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  }
  
  
  // --- Normalize cache key ---
  function normalizeCacheKey(url) {
    const u = new URL(url);
  
    // Special handling for Google Drive
    if (u.hostname.includes("googleusercontent.com")) {
      const id = u.searchParams.get("id");
      return `https://gdrive-cache/${id}`;
    }
  
    // Generic normalization
    const ignoreParams = ["utm_source", "utm_medium", "utm_campaign", "token"];
    ignoreParams.forEach(p => u.searchParams.delete(p));
  
    const sorted = [...u.searchParams.entries()].sort();
    u.search = new URLSearchParams(sorted).toString();
  
    return u.toString();
  }
  
  
  // --- Detect real file ---
  function isActualFile(response) {
    const contentType = response.headers.get("content-type") || "";
    const disposition = response.headers.get("content-disposition") || "";
  
    if (/attachment/i.test(disposition)) return true;
  
    // Reject HTML (important for Google Drive warning page)
    if (contentType.includes("text/html")) return false;
  
    return /^(image|audio|video)\//.test(contentType) ||
           /(pdf|zip|octet-stream|woff|font)/i.test(contentType);
  }
  
  
  // --- Google Drive handler ---
  async function handleGoogleDrive(url, headers) {
    let res = await fetch(url, { headers });
  
    const contentType = res.headers.get("content-type") || "";
  
    // If HTML → likely confirm page
    if (contentType.includes("text/html")) {
      const text = await res.text();
  
      const match = text.match(/confirm=([0-9A-Za-z_]+)/);
      if (match) {
        const confirm = match[1];
  
        const newUrl = new URL(url);
        newUrl.searchParams.set("confirm", confirm);
  
        res = await fetch(newUrl.toString(), { headers });
      }
    }
  
    return res;
  }
  
  // Helper function to convert a Hexadecimal string into a Uint8Array
  function hexToBytes(hexString) {
    if (hexString.length % 2 !== 0) return new Uint8Array();
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
  }