const TARGET_SAMPLE_RATE = 16000;
const CHUNK_BYTES = 1280;

export function extractXfyunText(message) {
  const raw = typeof message === "string" ? JSON.parse(message) : message;
  const st = raw?.data?.cn?.st;
  if (!st?.rt) return { text: "", final: false, raw };

  const text = st.rt
    .flatMap((rt) => rt.ws || [])
    .flatMap((ws) => ws.cw || [])
    .map((cw) => cw.w || "")
    .join("");

  return {
    text,
    final: String(st.type) === "0",
    raw,
  };
}

export function downsampleBuffer(buffer, inputSampleRate, outputSampleRate = TARGET_SAMPLE_RATE) {
  if (outputSampleRate === inputSampleRate) return buffer;
  if (outputSampleRate > inputSampleRate) {
    throw new Error("Output sample rate must be lower than input sample rate");
  }

  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }

    result[offsetResult] = count ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

export function floatTo16BitPcm(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function appendBytes(queue, bytes) {
  for (let i = 0; i < bytes.byteLength; i += 1) queue.push(bytes[i]);
}

function shiftChunk(queue, size) {
  if (queue.length < size) return null;
  const chunk = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) chunk[i] = queue.shift();
  return chunk;
}

export class XfyunRealtimeTranscriber {
  constructor({
    getRealtimeUrl = async () => {
      const res = await fetch("/api/xfyun/realtime-url");
      if (!res.ok) throw new Error(`Failed to get Xfyun URL: ${res.status}`);
      const data = await res.json();
      if (!data.url) throw new Error(data.error || "Missing Xfyun realtime URL");
      return data.url;
    },
    onFinalText,
    onInterimText,
    onError,
  } = {}) {
    this.getRealtimeUrl = getRealtimeUrl;
    this.onFinalText = onFinalText;
    this.onInterimText = onInterimText;
    this.onError = onError;
    this.audioQueue = [];
    this.sessionId = "";
  }

  async start() {
    await this.stop();

    const realtimeUrl = await this.getRealtimeUrl();
    this.ws = new WebSocket(realtimeUrl);
    this.ws.binaryType = "arraybuffer";

    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = () => reject(new Error("Xfyun WebSocket connection failed"));
    });

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        this.sessionId = parsed.sid || parsed.sessionId || this.sessionId;
        if (parsed.msg_type === "result" && parsed.res_type === "asr") {
          const result = extractXfyunText(parsed);
          if (!result.text) return;
          if (result.final) this.onFinalText?.(result.text, result.raw);
          else this.onInterimText?.(result.text, result.raw);
        }
        if (parsed.msg_type === "error" || parsed.action === "error") {
          this.onError?.(new Error(parsed.desc || parsed.message || "Xfyun realtime error"));
        }
      } catch (error) {
        this.onError?.(error);
      }
    };

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const input = event.inputBuffer.getChannelData(0);
      const downsampled = downsampleBuffer(input, this.audioContext.sampleRate, TARGET_SAMPLE_RATE);
      const pcm = floatTo16BitPcm(downsampled);
      appendBytes(this.audioQueue, new Uint8Array(pcm.buffer));
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.flushTimer = window.setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const chunk = shiftChunk(this.audioQueue, CHUNK_BYTES);
      if (chunk) this.ws.send(chunk);
    }, 40);
  }

  async stop() {
    if (this.flushTimer) {
      window.clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const endMessage = this.sessionId ? { end: true, sessionId: this.sessionId } : { end: true };
      this.ws.send(JSON.stringify(endMessage));
      this.ws.close();
    }
    this.ws = null;
    this.audioQueue = [];
    this.sessionId = "";
  }
}
