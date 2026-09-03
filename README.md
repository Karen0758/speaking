# momo · 开口练习

> English version first · 中文版见下方

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

---

# 中文版

一个练"难开口的话"的地方。

抽到一张场景卡，对着麦克风讲六十秒，然后拿到一份复盘：你说了什么、哪句话有漏洞、对方接下来大概率会追问什么。

不是背话术，是把你已经想清楚的事，练到能一口气讲出来。

---

## 它能帮你改善什么

**流畅度和语速** — 讲完立刻给出字数、时长、每分钟多少字，偏快或偏慢会直接说。这部分是本地真算的，不经过 AI。

**口癖词** — 统计「然后」「就是」「呃」「其实」「可能」这类词的真实出现次数，转写文本里会标红。练得多了，记录页会画出你最常说的那个词每分钟频次的变化曲线——是在往下走还是还在波动，一眼看得到。

**内容有没有说到点上** — 每张卡都写明了「要拿到什么」和「不能做什么」。复盘会逐项判断：目标达成了没有、限制有没有越界、对方最在意的点回应了没有，并且说清楚"部分达成"到底部分在哪。

**回答里的漏洞** — 这是最有用的一块。复盘会预演三条对方接下来会追问的话，每一条都追溯到你原话里的哪一句给了他这个口子。至少有一条是你完全没防到的盲区。

**逐句点评和示范重讲** — 挑出你的原话片段，说明问题在哪，给出可以直接替换的说法；最后按同一个场景重讲一遍作为参照。

**每一次都留档** — 记录页保留全部练习记录，每条都能点开，看到当时的评分、逐句点评、追问预演、示范重讲和完整转写。不是只给个分数就完事。

评分有五项：结构、内容、表达、用上背景、回应卡点。

---

## 题目

内置 58 道题，按你要开口的对象分成十类：

| | |
|---|---|
| 面试官 | 自我介绍、为什么离职、期望薪资、空窗期、现场解题 |
| 直属领导 | 拒绝加班、提离职、年终提意见、当众被追责 |
| 同事 | 被甩锅、升职后管原同事、全员会上被点名 |
| 伴侣 / 家人 / 朋友 | 冷战后开口、提同居、宣布家人反对的决定 |
| 陌生人 / 服务人员 / 同学 | 向交警陈述经过、窗口争取通融、小组作业摊牌 |
| **头脑风暴** | 议论题：考编还是去闯、断亲、AI 写的算不算你的作品 |

前九类是情境题——交代清楚事情到了哪一步、你为什么开不了口。头脑风暴是议论题，摆出两派各自最强的说法，然后问你站哪边、有没有遇到过类似的事。

题目都按「一次讲满六十到九十秒」的标准挑过。那些一句话就能办完的、或者必须靠对方接话才能推进的多轮拉扯（讲价、插队、催快递），都不在里面——它们是另一种能力，不适合这个模式。

时长可以在 30 到 300 秒之间按 30 秒一档调。

### 上传自己的题目

内置题目不够用，可以传自己的。支持 `.csv` / `.json` / `.xlsx`。

**只有「标题」是必填**，其余缺了就留空，不会替你编。表头中英文都认（「标题」「题目」「Title」是同一栏，「人物关系」和「对象」也是）。难度写「简单/中等/困难」或 `easy/medium/hard` 都行。

导入后会给一份如实的报告：进了几条、跳过哪几行、哪些字段留空了几条、哪些「对象」不在转盘的十类里（这类题只在题库里出现，不上转盘）。

上传的题追加到内置题库，不覆盖，筛选里多一个「来源」维度可以只看自己传的，也能一键清空自定义题而不动内置的。

**没有现成的题？** 上传弹窗里有一段写好的提示词，一键复制发给任意 AI，它会按格式给你生成，存成文件传回来就行。提示词里已经写死了字段名和所有可选值。另外附 CSV / JSON 模板下载。

---

## momo

右下角那个小精灵。

它不做评判，只是一直在。抽到卡会替你高兴，你开口时它在听（嘴会跟着你的音量动），倒计时最后十秒会提醒你收尾，卡壳超过几秒会递一句提示。讲完不管讲得怎么样，它都会说点什么——讲得好说"这段可以留着"，讲得一般说"已经开口了，就是进步"。

一分钟没动静它会打个盹，你一动就醒。戳它一下有反应。

嫌它碍事可以关掉，关掉后左下角留一个"叫 momo 回来"的小按钮，状态会记住。转盘首页它不出现——那一页留白。

---

## 快速开始

**本地跑** — 不需要装任何东西，也不需要构建：

```bash
git clone https://github.com/Karen0758/speaking.git
cd speaking
open xiaoxing.html      # Windows 用 start，Linux 用 xdg-open
```

浏览器直接打开就能用。所有数据存在你自己的浏览器里，不上传任何地方。

**怎么用** — 首页转盘上左右拖动选人，点邮票进去看这一位下面的题目，点题目开练。或者直接进题库按对象、难度、领域、说话动作筛，点题目就开始。

**接 AI**（可选）— 口癖词、字数、语速是本地算的，不接 AI 也有。总评、逐句点评、追问预演、示范重讲需要 AI。点右上角「接上 AI」，填接口地址、密钥、模型 ID 三项。密钥可以选择只存在这次会话里，关掉标签页就清除。

请求从你的浏览器直接发给你填的接口，不经过任何第三方。

---

## 部署

配好了 Vercel，从这个仓库直接部署，push 自动上线。

1. vercel.com 用 GitHub 登录，Import 这个仓库，直接 Deploy
2. Settings → Environment Variables 加三个：`AI_URL`（完整端点）、`AI_KEY`、`AI_MODEL`
3. Redeploy 一次让环境变量生效

线上版本的密钥存在服务端环境变量里，浏览器拿不到，访客不用填任何东西就能用复盘。访客也可以填自己的密钥，填了就以他的为准。

`scripts/build-site.mjs` 会把 `xiaoxing.html` 拷成 `public/index.html`。源文件只有一份，继续改 `xiaoxing.html` 就行。

### 开启账号功能（可选）

1. supabase.com 建一个项目，把 `supabase-schema.sql` 整段贴进 SQL Editor 跑一次
2. 在 `xiaoxing.html` 里填上 `SUPA_URL` 和 `SUPA_ANON`（Settings → API 里的 Project URL 和 anon public key）
3. Authentication → Providers 里确认 Email 是开的

anon key 本来就是设计成公开的，数据隔离靠表上的行级安全策略——**那条策略不要删**。不填这两个常量的话，登录按钮不会出现，应用退回纯本地模式。

SQL 文件末尾还有三个视图（`stat_cards` / `stat_users` / `stat_fillers`），在 Supabase 后台直接查就能看到哪些题练得最多、每个人练了多久、口癖有没有随次数下降。前端不会调它们。

> 代理没有做频率限制。上线后拿到网址的人都能消耗你的额度，先小范围发比较稳。

---

## 需要知道的

**语音转写用的是浏览器自带的 Web Speech API**，只有 Chrome 和 Edge 支持。Safari 和 Firefox 打开会自动退回模拟文本，其他功能不受影响。麦克风需要 HTTPS 或者 `localhost`。

**默认所有数据都在本地。** 练习记录、上传的题目、AI 配置都存在浏览器的 localStorage 里。不登录的话换浏览器或者清缓存就没了。

**登录是可选的。** 登录之后只同步元数据——练了哪张卡、几秒、多少字、口癖各几次、五项评分、练习时间。**转写正文、AI 复盘正文、你填的 AI 密钥不上传**，只留在你自己的浏览器里。自己上传的题目只记 id 不记标题。账号页有一键删除全部云端记录的入口。

**这是一个 demo。** 前端是单个 HTML 文件，没有构建步骤，改完刷新就见效。

---

## 文件

```
xiaoxing.html              整个应用，单文件
assets/people/             十类对象的插画
assets/logo-h.png          横版 logo
api/ai.js                  线上部署用的 AI 代理
scripts/build-site.mjs     生成 public/ 的构建脚本
seed-cards-full-120.json   早期 120 题的完整留档
seed-cards-removed.json    精简时删掉的题目和逐条理由
```
