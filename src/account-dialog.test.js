import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../xiaoxing.html', import.meta.url), 'utf8');

test('signed-in account dialog uses the compact single-column layout', () => {
  assert.match(html, /class="acctClose"[^>]*onclick="closeAcct\(\)"/);
  assert.match(html, /<div class="acctProfile">[\s\S]*id="acctAva"[\s\S]*id="acctEmailShow"/);
  assert.match(html, /<div class="acctActions">[\s\S]*class="acctSync"[^>]*>立即同步<[\s\S]*class="acctSignOut"[^>]*>退出登录</);
  assert.match(html, /<div class="acctDanger">[\s\S]*class="acctWipe"[^>]*>删除我的云端记录</);
  assert.match(html, /\.acctSync[^}]*white-space:\s*nowrap/);
});

test('account dialog offers and persists all three font choices', () => {
  const signedIn = html.match(/<div id="acctSignedIn"[\s\S]*?<div class="acctActions">/)?.[0] || '';
  const signedOut = html.match(/<div id="acctSignedOut">[\s\S]*?<div id="acctPick"/)?.[0] || '';
  assert.doesNotMatch(signedOut, /fontChoice/);
  assert.match(signedIn, /class="acctPersonalPopover"/);
  assert.match(signedIn, /class="fontChoice" data-font="wenkai"[^>]*>霞鹜文楷</);
  assert.match(signedIn, /class="fontChoice" data-font="sans"[^>]*>思源黑体</);
  assert.match(signedIn, /class="fontChoice" data-font="serif"[^>]*>思源宋体</);
  assert.match(signedIn, /onclick="openAIFromAccount\(\)"[^>]*>[^<]*AI API 设置/);
  assert.match(html, /const KEY_FONT = 'momo:font'/);
  assert.match(html, /document\.documentElement\.dataset\.font = font/);
  assert.match(html, /localStorage\.setItem\(KEY_FONT, font\)/);
});
