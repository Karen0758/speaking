import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('homepage includes a GitHub link to the speaking repository', () => {
  const html = fs.readFileSync(new URL('../xiaoxing.html', import.meta.url), 'utf8');
  assert.match(html, /href="https:\/\/github\.com\/Karen0758\/speaking"/);
  assert.match(html, /aria-label="GitHub repository"/);
});

test('wheel controls reserve separate positions for account and GitHub', () => {
  const html = fs.readFileSync(new URL('../xiaoxing.html', import.meta.url), 'utf8');
  assert.match(html, /\.wheelGithub\{position:absolute;right:12px;/);
  assert.match(html, /\.wheelAcct\{position:absolute;right:58px;/);
});
