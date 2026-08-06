export const FILLER_WORDS = [
  "然后",
  "就是",
  "呃",
  "嗯",
  "那个",
  "这个",
  "其实",
  "可能",
  "大概",
  "对吧",
  "啊",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(text, word) {
  const matches = text.match(new RegExp(escapeRegExp(word), "g"));
  return matches ? matches.length : 0;
}

export function segmentSpeechText(text, fillerWords = FILLER_WORDS) {
  if (!text) return [];
  const pattern = new RegExp(`(${fillerWords.map(escapeRegExp).join("|")})`, "g");
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({
      text: part,
      kind: fillerWords.includes(part) ? "filler" : "normal",
    }));
}

export function analyzeSpeechText(text, { scenario, topic } = {}) {
  const cleanText = text.trim();
  const fillerStats = FILLER_WORDS
    .map((word) => ({ word, count: countOccurrences(cleanText, word) }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "zh-CN"));

  const suggestions = [];
  if (scenario === "面试") {
    suggestions.push("用 STAR 补完整：情境、任务、行动、结果。");
    suggestions.push("加一个数字或结果，让经历更具体。");
    suggestions.push(topic ? "把回答扣回题目，不要只讲过程。" : "用一句话先说你的核心优势。");
  } else if (scenario === "闲聊") {
    suggestions.push("先亮明你的观点，再展开理由。");
    suggestions.push("举一个具体的例子来支撑你的看法。");
    suggestions.push("想想反对意见，主动回应会更有说服力。");
  } else {
    suggestions.push("先补一句结论，让听众知道重点。");
    suggestions.push("把进展、风险、下一步分开讲。");
    suggestions.push("加一个影响范围或时间点，信息会更稳。");
  }

  if (cleanText.length < 20) {
    suggestions[0] = scenario === "面试" ? "先用一句话给出直接答案。" : scenario === "闲聊" ? "先亮明你的态度：同意、反对还是看情况。" : "先说结论，再展开原因。";
  } else if (fillerStats[0]?.count >= 3) {
    suggestions[0] = `「${fillerStats[0].word}」有点多，下一句先停半秒再讲。`;
  }

  return {
    segments: segmentSpeechText(cleanText),
    fillerStats,
    suggestions,
  };
}
