/* 把 xiaoxing.html 和 assets 拷成可发布的 public/，
   这样 xiaoxing.html 仍是唯一的源文件，不用维护两份。 */
import { cp, mkdir, rm, copyFile } from 'node:fs/promises';

const OUT = 'public';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await copyFile('xiaoxing.html', `${OUT}/index.html`);
await cp('assets', `${OUT}/assets`, { recursive: true });
console.log('已生成 public/：index.html + assets/');
