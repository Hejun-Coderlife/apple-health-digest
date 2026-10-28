// 把 index.html 套上 themes/ 里的每一款样式，生成 5 个可以直接双击打开的预览页
// 用法：node design/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const themes = fs.readdirSync(path.join(here, 'themes')).filter(f => f.endsWith('.css')).sort();
const pages = themes.map(f => ({ css: f, name: f.replace('.css', ''), file: '款式' + f.replace('.css', '.html') }));

for (const p of pages) {
  // 底部一条切换栏，方便来回比较（只在预览页里有）
  const bar = `<div id="pickTheme" style="position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:20;display:flex;gap:4px;padding:5px;border-radius:999px;background:rgba(20,20,20,.86);backdrop-filter:blur(10px);font:13px/1 -apple-system,'PingFang SC',sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25)">` +
    pages.map(q => `<a href="${encodeURI(q.file)}" style="padding:8px 14px;border-radius:999px;text-decoration:none;letter-spacing:.05em;${q === p ? 'background:#fff;color:#111;font-weight:600' : 'color:#ddd'}">${q.name}</a>`).join('') + '</div>';
  const css = fs.readFileSync(path.join(here, 'themes', p.css), 'utf8');
  const out = html
    .replace('<!--THEME-->', `<style>\n${css}</style>`)
    .replace('<div id="tip"></div>', '<div id="tip"></div>\n' + bar);
  fs.writeFileSync(path.join(here, p.file), out);
  console.log(p.file);
}
