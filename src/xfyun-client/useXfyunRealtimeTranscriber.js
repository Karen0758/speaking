import { useCallback, useRef, useState } from "react";

import { XfyunRealtimeTranscriber } from "./xfyunRealtimeTranscriber.js";

export function useXfyunRealtimeTranscriber({
  signerEndpoint = "/api/xfyun/realtime-url",
  onFinalText,
  onInterimText,
  onError,
} = {}) {
  const transcriberRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const stop = useCallback(async () => {
    await transcriberRef.current?.stop();
    transcriberRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    const transcriber = new XfyunRealtimeTranscriber({
      getRealtimeUrl: async () => {
        const res = await fetch(signerEndpoint);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error || "获取讯飞连接地址失败");
        return data.url;
      },
      onFinalText,
      onInterimText,
      onError: (err) => {
        setError(err);
        onError?.(err);
      },
    });

    transcriberRef.current = transcriber;
    try {
      await transcriber.start();
      setStatus("recording");
    } catch (err) {
      setError(err);
      setStatus("idle");
      onError?.(err);
      await transcriber.stop();
      transcriberRef.current = null;
    }
  }, [onError, onFinalText, onInterimText, signerEndpoint]);

  return { start, stop, status, error };
}
