/* 复盘代理：密钥只存在 Vercel 环境变量里，浏览器永远拿不到。
   环境变量：AI_URL（完整端点）、AI_KEY、AI_MODEL */
export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({error:'只接受 POST'});

  const {AI_URL, AI_KEY, AI_MODEL} = process.env;
  if(!AI_URL || !AI_KEY || !AI_MODEL)
    return res.status(503).json({error:'服务端还没配好密钥，可以在设置里填自己的'});

  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : null;
  if(!messages || !messages.length) return res.status(400).json({error:'缺 messages'});

  /* 简单的滥用防线：单次请求体和输出长度都封顶 */
  const size = JSON.stringify(messages).length;
  if(size > 20000) return res.status(413).json({error:'内容太长'});
  const maxTokens = Math.min(Number(body.max_tokens) || 4000, 4000);

  const isAnthropic = /\/messages\/?$/.test(AI_URL);
  const headers = {'Content-Type':'application/json', 'Authorization':'Bearer '+AI_KEY};
  if(isAnthropic){ headers['x-api-key'] = AI_KEY; headers['anthropic-version'] = '2023-06-01'; }

  try{
    const r = await fetch(AI_URL, {
      method:'POST', headers,
      body: JSON.stringify({model:AI_MODEL, max_tokens:maxTokens, messages})
    });
    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    return res.send(text);
  }catch(e){
    return res.status(502).json({error:'上游没通：'+String(e.message || e)});
  }
}
