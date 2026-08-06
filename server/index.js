import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildXfyunRealtimeUrl } from "./xfyunSigner.js";

const SERVER_DIR = dirname(fileURLToPath(import.meta.url));

function loadDotEnv(path = resolve(SERVER_DIR, ".env")) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const PORT = Number(process.env.PORT || 8787);

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET" && url.pathname === "/api/xfyun/realtime-url") {
    try {
      const realtimeUrl = buildXfyunRealtimeUrl({
        appId: process.env.XFYUN_APP_ID,
        apiKey: process.env.XFYUN_API_KEY,
        apiSecret: process.env.XFYUN_API_SECRET,
        pd: url.searchParams.get("pd") || undefined,
      });

      sendJson(res, 200, { url: realtimeUrl });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/healthz") {
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Xfyun signer server listening on http://127.0.0.1:${PORT}`);
});
