# momo · 开口练习

[English](README.md) · [简体中文](README.zh-CN.md)

## Momo Speaking

Momo Speaking is a gentle AI tool for practicing conversations that are hard to start.

Choose a person or a scenario, speak into your microphone for 30–300 seconds, and review what you said afterwards. It is designed for moments such as setting boundaries, saying no, handling interviews, asking for an exception, or explaining something difficult without turning it into a confrontation.

This is not a script generator. It helps you practise saying what you already mean until it becomes easier to say out loud.

### What it helps you practise

- **Fluency and pace** — local statistics show your speaking time, word count, and words per minute.
- **Filler words** — track words such as “um”, “actually”, and “then”; the History page shows how your frequency changes over time.
- **Staying on point** — every prompt includes a goal and a constraint. The review checks whether you addressed both.
- **Handling follow-up questions** — the AI previews questions your conversation partner may ask, traced back to your own words.
- **Line-by-line feedback** — see concrete strengths, specific improvements, and an example rewrite for the same situation.
- **Practice history** — revisit your transcripts, scores, notes, follow-ups, and rewrites whenever you need them.

### English and Chinese modes

The interface supports English and Chinese. English mode includes English prompt cards and uses English speech recognition and review instructions, so Momo Speaking can also be used for everyday spoken-English practice. Switch languages from the top-right corner.

### Prompt library

The built-in library contains 58 prompts across interviews, managers, colleagues, partners, family, friends, service staff, classmates, strangers, and brainstorming topics. Filter by audience, difficulty, category, or speaking action, and add your own `.csv`, `.json`, or `.xlsx` prompts without overwriting the built-in library.

### AI is optional

Word count, speaking time, pace, and filler-word counts are calculated locally. AI is only needed for the overall review, line-by-line notes, diagnosis, follow-up preview, and sample rewrite. Add your own compatible API endpoint, key, and model from the settings panel. Your transcript and API key stay in your browser by default.

### Try it

- **Live demo:** [momospeaking.vercel.app](https://momospeaking.vercel.app/)
- **Project story:** [Bilibili video](https://www.bilibili.com/video/BV1TZtJ6VExw/)
- **Competition:** [Alibaba Xiaoyoukewei AI-for-good competition](https://opc.aliyun.com/xiaoyoukewei?display_mode=3)

### Run locally

```bash
git clone https://github.com/Karen0758/speaking.git
cd speaking
open xiaoxing.html
```

The app is a single HTML file and can be opened directly in a browser. For the hosted version, Vercel runs `npm run build:site`, which copies `xiaoxing.html` and the assets into the deployment output.

### Deployment

Import this repository into Vercel and connect the `main` branch. Every push automatically creates a new deployment. To enable the hosted AI proxy, configure `AI_URL`, `AI_KEY`, and `AI_MODEL` as Vercel environment variables. Supabase login and cross-device metadata sync are optional.
