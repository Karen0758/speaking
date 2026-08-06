const DEEPSEEK_URL = "https://wanqing.streamlakeapi.com/api/gateway/v1/messages";
const DEEPSEEK_KEY = import.meta.env.VITE_DEEPSEEK_KEY;

if (!DEEPSEEK_KEY) {
  console.warn("缺少 VITE_DEEPSEEK_KEY，请复制 .env.example 为 .env.local 并填入密钥。");
}
const DEEPSEEK_MODEL = "ep-2wt0ee-1785658859439536998";

/**
 * Stream a DeepSeek (Anthropic-format) completion.
 *
 * @param {object} opts
 * @param {string} opts.prompt - user message content
 * @param {number} [opts.maxTokens=1024]
 * @param {AbortSignal} [opts.signal] - pass to allow cancellation
 * @param {(chunk: string) => void} opts.onText - called with each text delta
 * @param {() => void} [opts.onDone] - called when stream finishes
 * @returns {Promise<string>} full accumulated text
 */
export async function streamDeepSeek({ prompt, maxTokens = 1024, signal, onText, onDone }) {
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: maxTokens,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`DeepSeek API error ${res.status}: ${body}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload);

        // Anthropic streaming format: content_block_delta
        if (parsed.type === "content_block_delta") {
          const text = parsed.delta?.text || "";
          if (text) {
            full += text;
            onText?.(text);
          }
        }
      } catch {
        // skip unparseable lines
      }
    }
  }

  onDone?.();
  return full;
}

/**
 * Non-streaming call — convenience wrapper that collects the full response.
 */
export async function callDeepSeek({ prompt, maxTokens = 1024, signal }) {
  let result = "";
  await streamDeepSeek({
    prompt,
    maxTokens,
    signal,
    onText: (t) => { result += t; },
  });
  return result;
}
