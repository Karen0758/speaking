import { createHmac, randomUUID } from "node:crypto";

const DEFAULT_BASE_URL = "wss://office-api-ast-dx.iflyaisol.com/ast/communicate/v1";

function encodeQueryValue(value) {
  return encodeURIComponent(String(value));
}

export function createXfyunSignatureBase(params) {
  return Object.entries(params)
    .filter(([key, value]) => key !== "signature" && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeQueryValue(key)}=${encodeQueryValue(value)}`)
    .join("&");
}

export function formatXfyunUtc(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
    offset,
  ].join("");
}

export function buildXfyunRealtimeUrl({
  appId,
  apiKey,
  apiSecret,
  uuid = randomUUID(),
  utc = formatXfyunUtc(),
  baseUrl = DEFAULT_BASE_URL,
  lang = "autodialect",
  audioEncode = "pcm_s16le",
  samplerate = 16000,
  pd,
  engVadMdn = 2,
}) {
  if (!appId || !apiKey || !apiSecret) {
    throw new Error("Missing XFYUN_APP_ID, XFYUN_API_KEY, or XFYUN_API_SECRET");
  }

  const params = {
    accessKeyId: apiKey,
    appId,
    uuid,
    utc,
    audio_encode: audioEncode,
    lang,
    samplerate,
    eng_vad_mdn: engVadMdn,
  };
  if (pd) params.pd = pd;

  const baseString = createXfyunSignatureBase(params);
  const signature = createHmac("sha1", apiSecret).update(baseString).digest("base64");
  const query = `${baseString}&signature=${encodeQueryValue(signature)}`;

  return `${baseUrl}?${query}`;
}
