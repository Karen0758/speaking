import React, { useState, useEffect, useRef, useCallback } from "react";
import { analyzeSpeechText } from "./speechAnalysis.js";
import { useXfyunRealtimeTranscriber } from "./xfyun-client/useXfyunRealtimeTranscriber.js";
import { streamDeepSeek } from "./deepseekStream.js";
import FloatingStarKid from "./FloatingStarKid.jsx";

/* ───────── design tokens ───────── */
const C = {
  bg: "#FFFCF7",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  ink: "#2A2521",
  inkSoft: "#5C5349",
  muted: "#837868",
  accent: "#A85D00",
  accentLight: "#FFF4E0",
  accentMid: "#F5CE8B",
  green: "#2F7A3E",
  greenBg: "#EEF7EC",
  amber: "#96650A",
  amberBg: "#FFF6E3",
  red: "#B3392F",
  redBg: "#FDF0EC",
  border: "#EDE4D6",
  borderSoft: "#F6F1E8",
};

/* 圆角体系锁定为三档，全站只用这三个值 */
const R = { micro: 6, control: 10, card: 16, pill: 999 };

const TOPICS = {
  汇报: [
    "向老板汇报本月项目进展和遇到的最大困难",
    "在周会上介绍一个跨部门协作的新方案",
    "向不懂技术的高管解释一次线上事故的原因",
    "复盘上季度一个未达预期的项目",
    "向团队宣布一项组织架构调整",
    "给客户汇报一个已经延期的项目现状",
    "推荐团队开始使用一个新工具或流程",
    "介绍你的团队在下季度想重点做的三件事",
    "复盘一次和其他团队的协作冲突",
    "总结一个季度的团队成长和不足",
  ],
  面试: [
    "请介绍一下你自己",
    "讲一次你和同事有冲突后是怎么解决的",
    "你为什么想离开上一份工作",
    "说说你做过最有成就感的一个项目",
    "你的三个优点和三个缺点",
    "遇到过最难搞的用户或客户是怎么处理的",
    "如果你不同意老板的决定，你会怎么做",
    "五年后你希望自己在哪里",
    "描述一次你带来实质改变的经历",
    "为什么选择我们公司",
  ],
  闲聊: [
    "你觉得 AI 会取代大部分工作吗？为什么？",
    "远程办公和到岗上班，你更倾向哪个？",
    "最近看过最有意思的一本书或一部电影，讲讲为什么推荐",
    "如果明天不用上班，你最想做什么？",
    "社交媒体让人际关系变好了还是变差了？",
    "你怎么看「躺平」和「内卷」这两种态度？",
    "讲一个你最近改变了看法的事情",
    "如果给你一百万，但必须换一个城市生活，你选哪？",
    "你觉得什么样的人算「有趣」？",
    "未来十年，你觉得哪个行业最值得关注？",
  ],
};

/* ───────── icons ───────── */
const Icon = ({ name, size = 20, color = C.ink, strokeWidth = 1.5 }) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    back: <><polyline points="15 18 9 12 15 6"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    star: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    sparkles: <><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></>,
    chevDown: <><polyline points="6 9 12 15 18 9"/></>,
  };
  return <svg {...props}>{paths[name]}</svg>;
};

/* ───────── dialog ───────── */
const Dialog = ({ open, onClose, children, title }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
      <div className="dialog-enter" style={{
        position: "relative", width: "100%", maxWidth: 560,
        background: C.surface, borderRadius: R.card, padding: "24px 28px 28px",
        maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 24px 48px -12px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          {title && <div style={{ fontSize: 17, fontWeight: 600, color: C.ink, letterSpacing: "-0.01em" }}>{title}</div>}
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: R.control, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="x" size={14} color={C.muted} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ───────── toast ───────── */
const Toast = ({ message, visible }) => {
  if (!visible) return null;
  return (
    <div className="toast-enter" style={{
      position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
      zIndex: 200, padding: "10px 20px", borderRadius: R.control,
      background: C.ink, color: "#fff", fontSize: 13, fontWeight: 500,
      boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
    }}>
      {message}
    </div>
  );
};

/* ───────── main ───────── */
export default function App() {
  const [screen, setScreen] = useState("home");
  const [scenario, setScenario] = useState(null);
  const [topic, setTopic] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [assistPrompt, setAssistPrompt] = useState(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [toast, setToast] = useState(null);
  const [micLevel, setMicLevel] = useState(0);
  const [jobProfile, setJobProfile] = useState({ role: "", resumeSummary: "", practiceCount: 0 });
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ role: "", resumeSummary: "" });
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  const fileInputRef = useRef(null);

  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const lastSpeechRef = useRef(Date.now());
  const timerRef = useRef(null);
  const pauseCheckRef = useRef(null);
  const audioCtxRef = useRef(null);
  const assistPromptRef = useRef(null);
  const transcriptRef = useRef("");
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);
  const assistAbortRef = useRef(null);
  const reviewAbortRef = useRef(null);

  useEffect(() => { assistPromptRef.current = assistPrompt; }, [assistPrompt]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const {
    start: startXfyunTranscription,
    stop: stopXfyunTranscription,
    status: transcriptionStatus,
  } = useXfyunRealtimeTranscriber({
    signerEndpoint: "http://127.0.0.1:8787/api/xfyun/realtime-url",
    onFinalText: (text) => {
      setTranscript((t) => t + text);
      setInterimText("");
      lastSpeechRef.current = Date.now();
      if (assistAbortRef.current) assistAbortRef.current.abort();
      if (assistPromptRef.current) setAssistPrompt(null);
    },
    onInterimText: (text) => {
      setInterimText(text);
      if (text.trim()) {
        lastSpeechRef.current = Date.now();
        if (assistAbortRef.current) assistAbortRef.current.abort();
      }
    },
    onError: () => { showToast("转写连接失败"); },
  });

  const playSound = (type) => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const beep = (freq, when, dur, vol = 0.07, wave = "sine") => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq; osc.type = wave;
        gain.gain.setValueAtTime(vol, now + when);
        gain.gain.exponentialRampToValueAtTime(0.001, now + when + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + when); osc.stop(now + when + dur);
      };
      if (type === "click") beep(800, 0, 0.03, 0.04, "square");
      else if (type === "reel") beep(500, 0, 0.025, 0.03, "square");
      else if (type === "ding") { beep(880, 0, 0.12, 0.08); beep(1320, 0.06, 0.18, 0.06); }
      else if (type === "start") { beep(523, 0, 0.08); beep(659, 0.08, 0.08); beep(784, 0.16, 0.12); }
      else if (type === "end") { beep(784, 0, 0.12); beep(523, 0.12, 0.12); beep(392, 0.24, 0.25); }
      else if (type === "assist") beep(1200, 0, 0.06, 0.04);
    } catch (e) {}
  };

  const startMicVis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256; source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setMicLevel(Math.min(data.reduce((a, b) => a + b, 0) / data.length / 80, 1));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {}
  };
  const stopMicVis = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
    setMicLevel(0);
  };

  const drawTopic = () => {
    playSound("click"); setIsDrawing(true); setTopic(null);
    const pool = TOPICS[scenario];
    const final = pool[Math.floor(Math.random() * pool.length)];
    let cycles = 0; let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1 + Math.floor(Math.random() * 2)) % pool.length;
      setReelIndex(idx); playSound("reel"); cycles++;
      if (cycles >= 14) { clearInterval(iv); setTopic(final); setIsDrawing(false); playSound("ding"); }
    }, 130);
  };

  const startPractice = () => {
    playSound("start"); setScreen("practice"); setTimeLeft(60);
    setTranscript(""); setInterimText(""); setAssistPrompt(null); setShowTranscript(false);
    isRecordingRef.current = true; setIsRecording(true); lastSpeechRef.current = Date.now();
    if (scenario === "面试") setJobProfile((p) => ({ ...p, practiceCount: p.practiceCount + 1 }));
    startMicVis();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { finishPractice(); return 0; } return t - 1; });
    }, 1000);
    startXfyunTranscription();
    pauseCheckRef.current = setInterval(() => {
      if (Date.now() - lastSpeechRef.current > 3500 && !assistPromptRef.current && !assistLoading) fetchAssist();
    }, 800);
  };

  const scenarioLabel = scenario === "面试" ? "求职面试" : scenario === "闲聊" ? "观点闲聊" : "工作汇报";

  const profileContext = () => {
    if (scenario !== "面试") return "";
    const parts = [];
    if (jobProfile.role) parts.push(`目标岗位：${jobProfile.role}`);
    if (jobProfile.resumeSummary) parts.push(`用户简历重点：${jobProfile.resumeSummary}`);
    return parts.length ? `\n【用户求职背景】\n${parts.join("\n")}\n` : "";
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFileName(file.name); setResumeParsing(true);
    try {
      let rawText = "";
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.mjs";
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          rawText += content.items.map((it) => it.str).join(" ") + "\n";
        }
      } else { rawText = await file.text(); }
      rawText = rawText.slice(0, 6000);
      setProfileDraft((d) => ({ ...d, resumeSummary: "" }));
      const summary = await streamDeepSeek({
        prompt: `下面是一份简历的文本。请提炼出面试练习会用到的重点：核心岗位方向、3-5 段关键经历（含量化成果）、主要技能。用简洁的要点，150 字以内，中文。只返回提炼内容。\n\n简历：\n${rawText}`,
        maxTokens: 1000,
        onText: (chunk) => { setProfileDraft((d) => ({ ...d, resumeSummary: d.resumeSummary + chunk })); },
      });
      if (summary && summary.trim()) showToast("简历已解析");
    } catch (err) {
      console.error("简历解析失败:", err);
      showToast("解析失败，可手动粘贴重点");
    }
    setResumeParsing(false);
  };

  const openProfileSheet = () => {
    setProfileDraft({ role: jobProfile.role, resumeSummary: jobProfile.resumeSummary });
    setResumeFileName(""); setShowProfileSheet(true);
  };
  const saveProfile = () => {
    setJobProfile((p) => ({ ...p, role: profileDraft.role, resumeSummary: profileDraft.resumeSummary }));
    setShowProfileSheet(false); showToast("档案已保存");
  };

  const abortAssist = useCallback(() => {
    if (assistAbortRef.current) { assistAbortRef.current.abort(); assistAbortRef.current = null; }
  }, []);

  const fetchAssist = async () => {
    abortAssist(); setAssistLoading(true); setAssistPrompt(null);
    const said = transcriptRef.current.trim();
    const controller = new AbortController();
    assistAbortRef.current = controller;
    let soundPlayed = false;
    try {
      await streamDeepSeek({
        prompt: `用户正在练习${scenarioLabel}。${profileContext()}\n题目：${topic}\n用户到现在讲的内容：${said ? `"${said}"` : "（还没开始讲）"}\n用户此刻卡壳了。请给一句非常简短（12字以内）、温柔的提示，帮他继续说下去${scenario === "面试" && jobProfile.resumeSummary ? "，可以引导他结合自己的经历" : ""}。只返回提示本身。`,
        maxTokens: 100, signal: controller.signal,
        onText: (chunk) => {
          if (!isRecordingRef.current) return;
          setAssistPrompt((prev) => (prev || "") + chunk);
          if (!soundPlayed) { playSound("assist"); soundPlayed = true; }
          setAssistLoading(false);
        },
      });
    } catch (e) { if (e.name !== "AbortError") console.warn("assist error", e); }
    setAssistLoading(false);
  };

  const finishPractice = useCallback(async () => {
    if (!isRecordingRef.current && screen === "practice") return;
    isRecordingRef.current = false; setIsRecording(false);
    clearInterval(timerRef.current); clearInterval(pauseCheckRef.current);
    abortAssist();
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) {}
    await stopXfyunTranscription(); stopMicVis(); playSound("end");
    setScreen("review"); setReviewLoading(true);

    const rubric = scenario === "面试"
      ? "从以下维度评价：1.结构清晰度（STAR等）2.具体性（例子、数字）3.相关性 4.表达流畅度"
      : scenario === "闲聊"
        ? "从以下维度评价：1.观点清晰度（有没有明确立场）2.论据支撑（有没有例子或逻辑）3.表达流畅度 4.趣味性"
        : "从以下维度评价：1.结构清晰度（结论先行）2.信息密度 3.受众意识 4.表达流畅度";
    const said = transcriptRef.current.trim();
    const reviewController = new AbortController();
    reviewAbortRef.current = reviewController;
    try {
      const fullText = await streamDeepSeek({
        prompt: `用户刚练习完口语。场景：${scenarioLabel}${profileContext()}\n题目：${topic}\n发言：${said ? `"${said}"` : "（几乎没说话）"}\n${rubric}${scenario === "面试" && jobProfile.resumeSummary ? "\n注意：请结合用户的简历重点和目标岗位，判断他讲的经历是否切题、是否突出了岗位需要的能力。" : ""}\n严格返回JSON，不要markdown代码块：\n{"overall":"一句话总评20字内","scores":{"结构":1-10,"内容":1-10,"表达":1-10},"fillerWords":[{"word":"然后","count":3}],"highlight":"用户原话最亮一句或空","improvements":["建议1","建议2"],"rewriteExample":"示范重讲开头30秒，80字左右"}`,
        maxTokens: 1000, signal: reviewController.signal,
        onText: () => {},
      });
      setReviewData(JSON.parse(fullText.replace(/```json|```/g, "").trim()));
    } catch (e) {
      if (e.name !== "AbortError") setReviewData({ error: "复盘生成失败，再试一次吧" });
    }
    setReviewLoading(false);
  }, [scenario, topic, screen, stopXfyunTranscription, abortAssist]);

  const resetAll = () => {
    setScreen("home"); setScenario(null); setTopic(null);
    setTranscript(""); setInterimText(""); setAssistPrompt(null); setReviewData(null);
  };

  /* ── 角色状态：由应用真实状态驱动，不是循环播放 ── */
  const [justDrew, setJustDrew] = useState(false);
  const [longIdle, setLongIdle] = useState(false);

  useEffect(() => {
    if (!topic || isDrawing) return;
    setJustDrew(true);
    const id = setTimeout(() => setJustDrew(false), 1800);
    return () => clearTimeout(id);
  }, [topic, isDrawing]);

  useEffect(() => {
    let id = null;
    const arm = () => {
      setLongIdle(false);
      clearTimeout(id);
      id = setTimeout(() => setLongIdle(true), 30000);
    };
    arm();
    window.addEventListener("pointerdown", arm, { passive: true });
    window.addEventListener("keydown", arm);
    return () => {
      clearTimeout(id);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [screen]);

  const avgScore = reviewData?.scores
    ? Object.values(reviewData.scores).reduce((a, b) => a + b, 0) / Object.values(reviewData.scores).length
    : 0;

  const kid = (() => {
    if (screen === "home") return longIdle ? ["sleepy", "我先眯一会儿"] : ["idle", "今天想练哪一种？"];
    if (screen === "topic") {
      if (isDrawing) return ["cast", "抽题中"];
      if (justDrew) return ["cheer", "就这题吧"];
      return topic ? ["idle", "准备好就开麦"] : ["idle", "抽一道题试试"];
    }
    if (screen === "practice") {
      if (!isRecording) return ["idle", "等你开口"];
      if (timeLeft <= 10) return ["surprise", `还剩 ${timeLeft} 秒`];
      if (assistLoading || assistPrompt) return ["shy", "要不要提个醒"];
      return micLevel > 0.06 ? ["sing", "我在听"] : ["idle", "慢慢说，不着急"];
    }
    if (screen === "review") {
      if (reviewLoading) return ["cast", "正在看你刚才说了什么"];
      if (reviewData?.error) return ["sad", "这次没读出来"];
      if (avgScore >= 8) return ["cheer", "这次讲得真好"];
      if (avgScore >= 6) return ["wink", "比上次稳"];
      if (avgScore > 0) return ["shy", "已经开口了，就是进步"];
    }
    return ["idle", ""];
  })();

  const progress = (60 - timeLeft) / 60;
  const scoreColor = (v) => v >= 7 ? C.green : v >= 5 ? C.amber : v > 0 ? C.red : C.muted;
  const liveTranscript = `${transcript}${interimText}`.trim();
  const liveAnalysis = analyzeSpeechText(liveTranscript, { scenario, topic });
  const statusLabel = transcriptionStatus === "recording" ? "实时转写中" : transcriptionStatus === "connecting" ? "正在连接" : "等待开麦";

  /* ── shared inline style helpers ── */
  const btnBase = { border: "none", cursor: "pointer", fontFamily: "inherit", transition: "transform 0.1s, opacity 0.15s" };
  const btnPrimary = { ...btnBase, background: C.ink, color: "#fff", borderRadius: R.control, padding: "12px 20px", fontSize: 14, fontWeight: 500 };
  const btnSecondary = { ...btnBase, background: C.surface, color: C.ink, borderRadius: R.control, padding: "12px 20px", fontSize: 14, fontWeight: 500, border: `1px solid ${C.border}` };
  const btnGhost = { ...btnBase, background: "none", color: C.inkSoft, padding: "8px 12px", fontSize: 13, fontWeight: 500 };
  const sectionCard = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: R.card, padding: 24 };
  const label = { fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.06em" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html { font-size: 16px; }
        body { font-family: 'Outfit', 'Noto Sans SC', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; color: ${C.ink}; background: ${C.bg}; }
        .mono { font-family: 'JetBrains Mono', 'Noto Sans SC', monospace; font-feature-settings: 'tnum'; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dialogIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes toastUp { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes reelSlide { 0% { opacity: 0; transform: translateY(50%); } 40% { opacity: 1; } 60% { opacity: 1; } 100% { opacity: 0; transform: translateY(-50%); } }
        @keyframes topicReveal { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes assistIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .fade-up { animation: fadeUp 0.35s ease-out; }
        .fade-in { animation: fadeIn 0.25s ease-out; }
        .dialog-enter { animation: dialogIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .toast-enter { animation: toastUp 0.25s ease-out; }
        .pulse-slow { animation: pulse 2s ease-in-out infinite; }
        .shimmer { background: linear-gradient(90deg, ${C.borderSoft}, ${C.border}, ${C.borderSoft}); background-size: 200% 100%; animation: shimmer 1.5s linear infinite; }
        .reel-slide { animation: reelSlide 0.14s linear; }
        .topic-reveal { animation: topicReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .assist-in { animation: assistIn 0.3s ease-out; }

        .btn-hover:hover { opacity: 0.85; }
        .btn-hover:active { transform: scale(0.98); }

        .filler-mark { background: ${C.redBg}; color: ${C.red}; border-radius: 3px; padding: 0 2px; }

        .starkid-float:focus-visible { box-shadow: 0 0 0 3px ${C.accentLight}; border-radius: ${R.card}px; }
        .starkid-close { opacity: 0; transition: opacity 0.18s ease; }
        .starkid-float:hover .starkid-close,
        .starkid-float:focus-within .starkid-close { opacity: 1; }
        @media (hover: none) { .starkid-close { opacity: 1; } }

        .layout-practice { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: stretch; }
        .layout-review { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
        .layout-home { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; min-height: calc(100dvh - 200px); }
        .scores-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .insights-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        @media (max-width: 900px) {
          .layout-practice { grid-template-columns: 1fr; }
          .layout-review { grid-template-columns: 1fr; }
          .layout-home { grid-template-columns: 1fr; min-height: auto; gap: 32px; }
                    .insights-row { grid-template-columns: 1fr; }
        }

        .transcript-area { min-height: 360px; max-height: calc(100dvh - 340px); overflow-y: auto; }
        @media (max-width: 900px) { .transcript-area { min-height: 240px; max-height: none; } }

        input:focus, textarea:focus { outline: none; border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentLight}; }
      `}</style>

      <Toast message={toast} visible={!!toast} />

      <div style={{ minHeight: "100dvh", padding: "0 28px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* ── NAV (persistent) ── */}
          <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderBottom: screen === "home" ? "none" : `1px solid ${C.border}` }}>
            <div onClick={screen !== "home" ? resetAll : undefined} style={{ display: "flex", alignItems: "center", gap: 10, cursor: screen !== "home" ? "pointer" : "default" }}>
              <div style={{ width: 28, height: 28, borderRadius: R.micro, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="mic" size={14} color="#fff" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>开麦</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {screen !== "home" && (
                <button className="btn-hover" onClick={() => { playSound("click"); if (screen === "practice") finishPractice(); else { setTopic(null); setReviewData(null); setScreen("topic"); } }}
                  style={btnGhost}>
                  {screen === "practice" ? "结束练习" : "换一题"}
                </button>
              )}
              <span className="mono" style={{ fontSize: 11, color: C.muted, padding: "4px 8px", background: C.borderSoft, borderRadius: R.micro }}>v0.3</span>
            </div>
          </nav>

          {/* ════════ HOME ════════ */}
          {screen === "home" && (
            <div className="fade-up layout-home" style={{ padding: "0 0 48px" }}>
              <div>
                <h1 style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 16, maxWidth: 480 }}>
                  练一分钟<br />讲给自己听
                </h1>
                <p style={{ fontSize: 16, color: C.inkSoft, lineHeight: 1.7, maxWidth: 400, marginBottom: 32 }}>
                  随机抽题，限时一分钟。卡住了 AI 给提示，讲完自动复盘打分。
                </p>
                <div style={{ padding: "16px 20px", borderRadius: R.control, background: C.accentLight, borderLeft: `3px solid ${C.accent}` }}>
                  <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginBottom: 4 }}>试试这个</div>
                  <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.6 }}>先说结论，再说原因。即使没想好细节，先把观点抛出来。</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { key: "汇报", title: "工作汇报", desc: "结论先行，向上管理", icon: "target" },
                  { key: "面试", title: "求职面试", desc: "STAR 结构，讲好经历", icon: "star" },
                  { key: "闲聊", title: "观点闲聊", desc: "观点表达，逻辑清晰", icon: "sparkles" },
                ].map((item) => (
                  <div key={item.key} className="btn-hover"
                    onClick={() => { setScenario(item.key); playSound("click"); setScreen("topic"); }}
                    style={{
                      ...sectionCard, cursor: "pointer", display: "flex", alignItems: "center", gap: 20,
                      padding: "24px 28px",
                    }}>
                    <div style={{ width: 48, height: 48, borderRadius: R.control, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${C.border}` }}>
                      <Icon name={item.icon} size={20} color={C.inkSoft} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 3 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: C.muted }}>{item.desc} / {TOPICS[item.key].length} 题</div>
                    </div>
                    <Icon name="back" size={18} color={C.muted} strokeWidth={1.5} />
                  </div>
                ))}
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8, paddingLeft: 4 }}>
                  推荐使用 Chrome 浏览器，需开启麦克风权限。
                </div>
              </div>
            </div>
          )}

          {/* ════════ TOPIC ════════ */}
          {screen === "topic" && (
            <div className="fade-up" style={{ maxWidth: 640, padding: "32px 0 48px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                <button className="btn-hover" onClick={() => { playSound("click"); setScreen("home"); setTopic(null); }} style={btnSecondary}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="back" size={14} color={C.ink} /> 返回</span>
                </button>
                <span className="mono" style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>
                  {scenarioLabel}
                </span>
              </div>

              {/* profile card (interview only) */}
              {scenario === "面试" && (
                <div className="btn-hover" onClick={openProfileSheet} style={{
                  ...sectionCard, cursor: "pointer", marginBottom: 20,
                  display: "flex", alignItems: "center", gap: 16,
                  background: jobProfile.role ? C.ink : C.surface,
                  color: jobProfile.role ? "#fff" : C.ink,
                  border: jobProfile.role ? "none" : `1px dashed ${C.border}`,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: R.control, flexShrink: 0,
                    background: jobProfile.role ? "rgba(255,255,255,0.12)" : C.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="target" size={18} color={jobProfile.role ? "#fff" : C.muted} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {jobProfile.role ? (
                      <>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{jobProfile.role}</div>
                        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                          {jobProfile.resumeSummary ? "简历已上传" : "未上传简历"} / 已练 {jobProfile.practiceCount} 次
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>建立求职档案</div>
                        <div style={{ fontSize: 12, color: C.muted }}>AI 提示和复盘会更贴合你的背景</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* topic card */}
              <div style={{
                borderRadius: R.card, overflow: "hidden", marginBottom: 20,
                background: topic && !isDrawing ? C.surface : C.ink,
                border: topic && !isDrawing ? `1px solid ${C.border}` : "none",
                transition: "background 0.3s",
              }}>
                <div style={{ padding: "32px 28px" }}>
                  <div style={{ ...label, color: topic && !isDrawing ? C.accent : "rgba(255,255,255,0.4)", marginBottom: 20 }}>
                    {topic && !isDrawing ? "你的题目" : "随机题库"}
                  </div>
                  <div style={{ minHeight: 80, display: "flex", alignItems: "center" }}>
                    {isDrawing ? (
                      <div key={reelIndex} className="reel-slide" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.5, color: "rgba(255,255,255,0.85)", width: "100%" }}>
                        {(TOPICS[scenario] || [])[reelIndex % (TOPICS[scenario] || []).length]}
                      </div>
                    ) : topic ? (
                      <div className="topic-reveal" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.5, color: C.ink, letterSpacing: "-0.01em" }}>
                        {topic}
                      </div>
                    ) : (
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 15, lineHeight: 1.6 }}>
                        点击下方按钮随机抽一道题
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {!topic && !isDrawing && (
                  <button className="btn-hover" onClick={drawTopic} style={{ ...btnPrimary, width: "100%", padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Icon name="refresh" size={16} color="#fff" /> 抽一道题
                  </button>
                )}
                {isDrawing && (
                  <button disabled style={{ ...btnPrimary, width: "100%", padding: "14px", opacity: 0.5, cursor: "default" }}>
                    抽题中...
                  </button>
                )}
                {topic && !isDrawing && (
                  <>
                    <button className="btn-hover" onClick={startPractice} style={{
                      ...btnPrimary, width: "100%", padding: "14px",
                      background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}>
                      <Icon name="mic" size={16} color="#fff" /> 开始练习
                    </button>
                    <button className="btn-hover" onClick={drawTopic} style={{ ...btnSecondary, width: "100%", padding: "12px" }}>
                      换一题
                    </button>
                  </>
                )}
              </div>

              {/* profile dialog */}
              <Dialog open={showProfileSheet} onClose={() => setShowProfileSheet(false)} title="求职档案">
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
                  填上目标岗位、上传简历，AI 的提示和复盘会更贴合你的背景。
                </p>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ ...label, marginBottom: 8 }}>目标岗位</div>
                  <input value={profileDraft.role} onChange={(e) => setProfileDraft((d) => ({ ...d, role: e.target.value }))}
                    placeholder="例如：字节跳动 产品经理"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: R.control, border: `1px solid ${C.border}`, fontSize: 14, color: C.ink, fontFamily: "inherit", background: C.bg }}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ ...label, marginBottom: 8 }}>简历（可选）</div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.doc,.docx" style={{ display: "none" }} onChange={handleResumeUpload} />
                  {!profileDraft.resumeSummary ? (
                    <button className="btn-hover" onClick={() => fileInputRef.current?.click()} disabled={resumeParsing}
                      style={{ width: "100%", padding: "20px", borderRadius: R.control, border: `1px dashed ${C.border}`, background: C.bg, cursor: resumeParsing ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      {resumeParsing ? (
                        <span className="shimmer" style={{ padding: "4px 14px", borderRadius: R.micro, fontSize: 13, color: C.inkSoft }}>
                          解析中 {resumeFileName}
                        </span>
                      ) : (
                        <>
                          <Icon name="upload" size={18} color={C.muted} />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>上传简历</span>
                          <span style={{ fontSize: 11, color: C.muted }}>PDF / TXT，在设备上解析</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div style={{ padding: "14px 16px", borderRadius: R.control, background: C.greenBg }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon name="check" size={14} color={C.green} strokeWidth={2} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>已提炼</span>
                        </div>
                        <button onClick={() => { setProfileDraft((d) => ({ ...d, resumeSummary: "" })); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          style={{ ...btnGhost, fontSize: 12, padding: "4px 8px" }}>重新上传</button>
                      </div>
                      <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto" }}>
                        {profileDraft.resumeSummary}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                    只保存提炼后的重点，不保存原文。
                    {!profileDraft.resumeSummary && !resumeParsing && (
                      <span onClick={() => setProfileDraft((d) => ({ ...d, resumeSummary: " " }))} style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }}> 手动粘贴</span>
                    )}
                  </div>
                  {profileDraft.resumeSummary && (
                    <textarea value={profileDraft.resumeSummary} onChange={(e) => setProfileDraft((d) => ({ ...d, resumeSummary: e.target.value }))}
                      placeholder="粘贴或编辑简历重点..." rows={4}
                      style={{ width: "100%", marginTop: 10, padding: "10px 14px", borderRadius: R.control, border: `1px solid ${C.border}`, fontSize: 13, color: C.ink, fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, background: C.bg }}
                    />
                  )}
                </div>
                <button className="btn-hover" onClick={saveProfile} style={{ ...btnPrimary, width: "100%", padding: "12px" }}>
                  保存
                </button>
              </Dialog>
            </div>
          )}

          {/* ════════ PRACTICE ════════ */}
          {screen === "practice" && (
            <div className="fade-in" style={{ padding: "20px 0" }}>
              <div className="layout-practice">
                {/* left: controls */}
                <aside style={{ ...sectionCard, display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="pulse-slow" style={{ width: 8, height: 8, borderRadius: R.micro, background: C.red }} />
                    <span className="mono" style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>REC</span>
                    <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{statusLabel}</span>
                  </div>

                  {/* topic */}
                  <div style={{ padding: "14px 16px", borderRadius: R.control, background: C.bg, borderLeft: `3px solid ${C.accent}` }}>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, color: C.ink }}>{topic}</div>
                  </div>

                  {/* timer */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                      width: 100, height: 100, borderRadius: "50%",
                      border: `3px solid ${timeLeft <= 10 ? C.red : C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", flexShrink: 0, transition: "border-color 0.3s",
                    }}>
                      {/* progress ring */}
                      <svg width={100} height={100} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
                        <circle cx={50} cy={50} r={47} fill="none" stroke={timeLeft <= 10 ? C.red : C.accent}
                          strokeWidth={3} strokeDasharray={295} strokeDashoffset={295 * (1 - progress)}
                          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }} />
                      </svg>
                      <span className="mono" style={{ fontSize: 28, fontWeight: 600, color: timeLeft <= 10 ? C.red : C.ink }}>
                        {timeLeft}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...label, marginBottom: 6 }}>音量</div>
                      <div style={{ height: 6, borderRadius: R.micro, background: C.borderSoft, overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(4, micLevel * 100)}%`, height: "100%", background: C.accent, borderRadius: R.micro, transition: "width 0.1s" }} />
                      </div>
                    </div>
                  </div>

                  {/* AI hint */}
                  <div style={{ padding: "16px", borderRadius: R.control, background: C.accentLight, minHeight: 80, position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Icon name="sparkles" size={14} color={C.accent} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>AI 提示</span>
                    </div>
                    {assistPrompt ? (
                      <div className="assist-in" style={{ fontSize: 14, color: C.ink, lineHeight: 1.6, fontWeight: 500 }}>{assistPrompt}</div>
                    ) : assistLoading ? (
                      <div className="shimmer" style={{ display: "inline-block", padding: "6px 14px", borderRadius: R.micro, fontSize: 12, color: C.muted }}>思考中</div>
                    ) : (
                      <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>{liveAnalysis.suggestions[0]}</div>
                    )}
                  </div>

                  <button className="btn-hover" onClick={finishPractice} style={{ ...btnPrimary, width: "100%", padding: "12px" }}>
                    结束并复盘
                  </button>
                </aside>

                {/* right: transcript */}
                <main style={{ ...sectionCard, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>实时转写</h2>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: R.pill, background: C.greenBg, color: C.green }}>
                      <span style={{ width: 6, height: 6, borderRadius: R.micro, background: C.green }} />
                      <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{statusLabel}</span>
                    </div>
                  </div>

                  <div className="transcript-area" style={{ padding: 20, borderRadius: R.control, background: C.bg, border: `1px solid ${C.borderSoft}`, fontSize: 18, lineHeight: 2, color: C.ink }}>
                    {liveTranscript ? (
                      <>
                        {liveAnalysis.segments.map((seg, i) =>
                          seg.kind === "filler"
                            ? <mark key={i} className="filler-mark">{seg.text}</mark>
                            : <span key={i}>{seg.text}</span>
                        )}
                        {interimText && <span style={{ color: C.accent, opacity: 0.5 }}>|</span>}
                      </>
                    ) : (
                      <span style={{ color: C.muted }}>开始说话后，转写内容出现在这里。</span>
                    )}
                  </div>

                  <div className="insights-row">
                    <div style={{ padding: 16, borderRadius: R.control, background: C.redBg }}>
                      <div style={{ ...label, color: C.red, marginBottom: 10 }}>口语词</div>
                      {liveAnalysis.fillerStats.length ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {liveAnalysis.fillerStats.slice(0, 6).map((item) => (
                            <span key={item.word} className="mono" style={{ padding: "4px 8px", borderRadius: R.micro, background: C.surface, fontSize: 12, color: C.inkSoft }}>
                              {item.word} <span style={{ color: C.red, fontWeight: 600 }}>x{item.count}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: C.muted }}>暂无</div>
                      )}
                    </div>
                    <div style={{ padding: 16, borderRadius: R.control, background: C.accentLight }}>
                      <div style={{ ...label, color: C.accent, marginBottom: 10 }}>建议</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {liveAnalysis.suggestions.map((s, i) => (
                          <div key={i} style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, display: "flex", gap: 8 }}>
                            <span className="mono" style={{ color: C.muted, flexShrink: 0 }}>{i + 1}</span>
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          )}

          {/* ════════ REVIEW ════════ */}
          {screen === "review" && (
            <div className="fade-up" style={{ padding: "28px 0 48px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>复盘</h1>
                  <p style={{ fontSize: 14, color: C.muted }}>{scenarioLabel} / {topic}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="btn-hover" onClick={() => { setTopic(null); setTranscript(""); setInterimText(""); setAssistPrompt(null); setReviewData(null); setScreen("topic"); }}
                    style={btnPrimary}>再练一题</button>
                  <button className="btn-hover" onClick={resetAll} style={btnSecondary}>
                    <Icon name="home" size={14} color={C.ink} />
                  </button>
                </div>
              </div>

              {reviewLoading && (
                <div style={{ ...sectionCard, textAlign: "center", padding: "80px 20px" }}>
                  <div className="shimmer" style={{ display: "inline-block", padding: "8px 24px", borderRadius: R.micro, fontSize: 14, color: C.muted }}>
                    生成中
                  </div>
                </div>
              )}

              {reviewData?.error && (
                <div style={{ ...sectionCard, background: C.redBg, border: "none" }}>
                  <div style={{ color: C.red, fontSize: 14, fontWeight: 500 }}>{reviewData.error}</div>
                </div>
              )}

              {reviewData && !reviewData.error && (
                <div className="layout-review">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* overall */}
                    <div style={{ ...sectionCard, borderLeft: `3px solid ${C.accent}` }}>
                      <div style={{ ...label, marginBottom: 8 }}>总评</div>
                      <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.5 }}>{reviewData.overall}</div>
                    </div>

                    {/* scores */}
                    <div className="scores-row">
                      {reviewData.scores && Object.entries(reviewData.scores).map(([k, v]) => (
                        <div key={k} style={{ ...sectionCard, textAlign: "center", padding: "20px 12px" }}>
                          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{k}</div>
                          <div className="mono" style={{ fontSize: 32, fontWeight: 600, color: scoreColor(v), lineHeight: 1 }}>
                            {v}<span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>/10</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* filler */}
                    {reviewData.fillerWords?.length > 0 && (
                      <div style={sectionCard}>
                        <div style={{ ...label, marginBottom: 12 }}>口癖词</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {reviewData.fillerWords.map((f, i) => (
                            <span key={i} className="mono" style={{ padding: "4px 10px", borderRadius: R.micro, background: C.bg, fontSize: 12, color: C.inkSoft }}>
                              {f.word} <span style={{ color: C.red }}>x{f.count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* highlight */}
                    {reviewData.highlight && (
                      <div style={{ ...sectionCard, borderLeft: `3px solid ${C.green}` }}>
                        <div style={{ ...label, color: C.green, marginBottom: 8 }}>亮点</div>
                        <div style={{ fontSize: 15, lineHeight: 1.6 }}>"{reviewData.highlight}"</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* improvements */}
                    {reviewData.improvements?.length > 0 && (
                      <div style={sectionCard}>
                        <div style={{ ...label, marginBottom: 14 }}>可以改进</div>
                        {reviewData.improvements.map((im, i) => (
                          <div key={i} style={{
                            padding: "12px 0",
                            borderTop: i > 0 ? `1px solid ${C.borderSoft}` : "none",
                            display: "flex", gap: 10, fontSize: 14, lineHeight: 1.6,
                          }}>
                            <span className="mono" style={{ color: C.muted, flexShrink: 0 }}>{i + 1}</span>
                            <span>{im}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* rewrite */}
                    {reviewData.rewriteExample && (
                      <div style={{ ...sectionCard, background: C.bg }}>
                        <div style={{ ...label, marginBottom: 10 }}>示范重讲</div>
                        <div style={{ fontSize: 15, lineHeight: 1.75 }}>{reviewData.rewriteExample}</div>
                      </div>
                    )}

                    {/* transcript */}
                    {transcript && (
                      <div style={sectionCard}>
                        <button className="btn-hover" onClick={() => setShowTranscript((v) => !v)}
                          style={{ ...btnGhost, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0 }}>
                          <span style={{ fontWeight: 600 }}>完整转写</span>
                          <Icon name="chevDown" size={16} color={C.muted} />
                        </button>
                        {showTranscript && (
                          <div className="fade-in" style={{ marginTop: 16, fontSize: 14, lineHeight: 1.8, color: C.inkSoft, maxHeight: 400, overflowY: "auto" }}>
                            {transcript}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <FloatingStarKid
        state={kid[0]}
        caption={kid[1]}
        micLevel={screen === "practice" ? micLevel : 0}
        size={190}
      />
    </>
  );
}
