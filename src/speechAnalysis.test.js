import assert from "node:assert/strict";
import test from "node:test";

import { analyzeSpeechText } from "./speechAnalysis.js";

test("marks filler words and counts repeated speaking habits", () => {
  const analysis = analyzeSpeechText("嗯我觉得然后这个项目就是先做了调研，然后推进上线。", {
    scenario: "汇报",
    topic: "汇报项目进展",
  });

  const counts = Object.fromEntries(analysis.fillerStats.map((item) => [item.word, item.count]));
  assert.equal(counts["然后"], 2);
  assert.equal(counts["嗯"], 1);
  assert.equal(counts["就是"], 1);
  assert.equal(counts["这个"], 1);
  assert.equal(analysis.segments.some((segment) => segment.kind === "filler" && segment.text === "然后"), true);
});

test("suggests concrete next steps from scenario and spoken length", () => {
  const analysis = analyzeSpeechText("我负责了一个增长项目，主要目标是提升新用户激活。", {
    scenario: "面试",
    topic: "说说你最有成就感的项目",
  });

  assert.equal(analysis.suggestions.length, 3);
  assert.equal(analysis.suggestions[0].includes("STAR"), true);
});
