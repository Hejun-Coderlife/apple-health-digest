// 用 Node 跑 index.html 里的解析核心：node run.mjs 文件路径 [truth.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const core = html.slice(html.indexOf('// CORE-BEGIN'), html.indexOf('// CORE-END'));
const HD = new Function(core + '\nreturn HD;')();

const file = await fs.openAsBlob(process.argv[2]);
const t0 = performance.now();
const R = await HD.digest(file);
console.log(`records=${R.records} nights=${R.nights} workouts=${R.workouts.length} ${R.first}~${R.last} ${((performance.now() - t0) / 1000).toFixed(1)}s`);

if (process.argv[3]) {
  const T = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  let bad = 0;
  for (const r of R.rows) {
    if (T.stepsDay[r.date] != null && Math.round(r.steps) !== T.stepsDay[r.date]) bad++;
    if (T.sleepNight[r.date] != null && Math.round(r.sleep * 60) !== T.sleepNight[r.date]) { bad++; if (bad < 5) console.log('sleep', r.date, r.sleep * 60, T.sleepNight[r.date]); }
  }
  console.log('mismatch', bad, 'workouts expected', T.workouts);
}
const text = HD.buildText(R, { years: 3, gran: 'week', profile: true, prompt: true });
fs.writeFileSync(path.join(here, 'out-week.txt'), text);
fs.writeFileSync(path.join(here, 'out-month.txt'), HD.buildText(R, { years: 0, gran: 'month', profile: true, prompt: false }));
console.log('chars', text.length);
