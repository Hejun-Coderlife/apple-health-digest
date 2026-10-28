// 生成一份仿真的 Apple 健康 export.xml（格式照真实导出），用来测试解析
// 用法：node gen.mjs 输出目录
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
const dir = path.join(outDir, 'apple_health_export');
fs.mkdirSync(dir, { recursive: true });
const out = fs.createWriteStream(path.join(dir, 'export.xml'));
let buf = [];
const w = s => { buf.push(s); if (buf.length > 5000) { out.write(buf.join('')); buf = []; } };

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pad = n => String(n).padStart(2, '0');
const fmt = t => { const d = new Date(t); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0800`; };
const DEV = 'device="&lt;&lt;HKDevice: 0x1&gt;, name:Apple Watch&gt;"';
const rec = (type, src, unit, a, b, v, kids = '') =>
  w(` <Record type="${type}" sourceName="${src}" sourceVersion="10.0" ${DEV} unit="${unit}" creationDate="${fmt(b)}" startDate="${fmt(a)}" endDate="${fmt(b)}" value="${v}"${kids ? '>\n' + kids + ' </Record>\n' : '/>\n'}`);

w(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!ELEMENT HealthData (ExportDate,Me,(Record|Correlation|Workout|ActivitySummary|ClinicalRecord|Audiogram|VisionPrescription)*)>
<!ATTLIST Record
  type          CDATA #REQUIRED
  value         CDATA #IMPLIED
>
]>
<HealthData locale="zh_CN">
 <ExportDate value="2025-10-20 09:00:00 +0800"/>
 <Me HKCharacteristicTypeIdentifierDateOfBirth="1990-06-15" HKCharacteristicTypeIdentifierBiologicalSex="HKBiologicalSexFemale" HKCharacteristicTypeIdentifierBloodType="HKBloodTypeNotSet" HKCharacteristicTypeIdentifierFitzpatrickSkinType="HKFitzpatrickSkinTypeNotSet" HKCharacteristicTypeIdentifierCardioFitnessMedicationsUse="None"/>
`);

const H = 36e5, D = 864e5;
const phoneStart = Date.UTC(2019, 0, 1), watchStart = Date.UTC(2022, 2, 7), end = Date.UTC(2025, 9, 19);
const truth = { stepsDay: {}, sleepNight: {} };
const workouts = [];
for (let t = phoneStart; t <= end; t += D) {
  const watch = t >= watchStart && !(t >= Date.UTC(2023, 6, 1) && t < Date.UTC(2023, 6, 15)); // 中间两周没戴表
  const prog = Math.max(0, (t - watchStart) / (end - watchStart));
  // 步数：手机每小时一条；戴表时手表也记一份（稍多）
  let phone = 0, wat = 0;
  for (let h = 8; h < 22; h++) {
    const v = Math.round(200 + rnd() * 600);
    phone += v;
    rec('HKQuantityTypeIdentifierStepCount', '小红的iPhone', 'count', t + h * H, t + h * H + 50 * 6e4, v);
    if (watch) { const v2 = Math.round(v * 1.1); wat += v2; rec('HKQuantityTypeIdentifierStepCount', '小红的Apple Watch', 'count', t + h * H, t + h * H + 50 * 6e4, v2); }
  }
  truth.stepsDay[new Date(t).toISOString().slice(0, 10)] = Math.max(phone, wat);
  if (!watch) continue;
  // 心率每 3 分钟一条（带子节点）
  for (let m = 0; m < 1440; m += 3) {
    const a = t + m * 6e4;
    rec('HKQuantityTypeIdentifierHeartRate', '小红的Apple Watch', 'count/min', a, a, Math.round(60 + rnd() * 40),
      '  <MetadataEntry key="HKMetadataKeyHeartRateMotionContext" value="0"/>\n');
  }
  const rhr = 66 - 8 * prog + rnd() * 3;
  rec('HKQuantityTypeIdentifierRestingHeartRate', '小红的Apple Watch', 'count/min', t + 6 * H, t + 23 * H, rhr.toFixed(0));
  for (const hh of [3, 9, 15]) {
    rec('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', '小红的Apple Watch', 'ms', t + hh * H, t + hh * H + 6e4, (30 + 20 * prog + rnd() * 15).toFixed(4),
      '  <HeartRateVariabilityMetadataList>\n   <InstantaneousBeatsPerMinute bpm="62" time="3:00:01.00 AM"/>\n   <InstantaneousBeatsPerMinute bpm="63" time="3:00:02.00 AM"/>\n  </HeartRateVariabilityMetadataList>\n');
  }
  if (rnd() < 0.3) rec('HKQuantityTypeIdentifierVO2Max', '小红的Apple Watch', 'mL/min·kg', t + 18 * H, t + 18 * H, (32 + 6 * prog).toFixed(2));
  rec('HKQuantityTypeIdentifierOxygenSaturation', '小红的Apple Watch', '%', t + 2 * H, t + 2 * H, (0.95 + rnd() * 0.04).toFixed(2));
  if (rnd() < 0.2) rec('HKQuantityTypeIdentifierBodyMass', '健康', 'kg', t + 8 * H, t + 8 * H, (60 - 3 * prog).toFixed(1));
  rec('HKQuantityTypeIdentifierActiveEnergyBurned', '小红的Apple Watch', 'kcal', t + 12 * H, t + 13 * H, 300);
  // 睡眠：前一晚 23:xx 开始，分段；iPhone 另记一条 InBed
  let s = t - D + 23 * H + Math.round(rnd() * 90) * 6e4 - 30 * 6e4;
  const night = new Date(t).toISOString().slice(0, 10);
  rec('HKCategoryTypeIdentifierSleepAnalysis', '小红的iPhone', '', s - 10 * 6e4, s + 8 * H, 'HKCategoryValueSleepAnalysisInBed');
  let asleep = 0;
  const stages = ['AsleepCore', 'AsleepDeep', 'AsleepCore', 'AsleepREM', 'Awake', 'AsleepCore', 'AsleepREM', 'AsleepCore'];
  for (const st of stages) {
    const len = st === 'Awake' ? 5 : 40 + Math.round(rnd() * 30);
    if (st !== 'Awake') asleep += len;
    rec('HKCategoryTypeIdentifierSleepAnalysis', '小红的Apple Watch', '', s, s + len * 6e4, 'HKCategoryValueSleepAnalysis' + st);
    s += len * 6e4;
  }
  truth.sleepNight[night] = asleep;
  // 白天小睡（应被忽略）
  if (rnd() < 0.1) rec('HKCategoryTypeIdentifierSleepAnalysis', '小红的Apple Watch', '', t + 13 * H, t + 13.5 * H, 'HKCategoryValueSleepAnalysisAsleepCore');
  w(` <ActivitySummary dateComponents="${new Date(t).toISOString().slice(0, 10)}" activeEnergyBurned="${(350 + rnd() * 200).toFixed(3)}" activeEnergyBurnedGoal="400" activeEnergyBurnedUnit="kcal" appleMoveTime="0" appleMoveTimeGoal="0" appleExerciseTime="${Math.round(20 + rnd() * 30)}" appleExerciseTimeGoal="30" appleStandHours="${Math.round(8 + rnd() * 5)}" appleStandHoursGoal="12"/>\n`);
  if (rnd() < 0.4) {
    const type = rnd() < 0.5 ? 'Running' : rnd() < 0.5 ? 'Yoga' : 'TraditionalStrengthTraining';
    const dur = 30 + rnd() * 30;
    workouts.push(type);
    w(` <Workout workoutActivityType="HKWorkoutActivityType${type}" duration="${dur.toFixed(4)}" durationUnit="min" sourceName="小红的Apple Watch" sourceVersion="10.0" creationDate="${fmt(t + 19 * H)}" startDate="${fmt(t + 18 * H)}" endDate="${fmt(t + 19 * H)}">
  <MetadataEntry key="HKIndoorWorkout" value="0"/>
  <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" startDate="${fmt(t + 18 * H)}" endDate="${fmt(t + 19 * H)}" sum="250" unit="kcal"/>
 </Workout>\n`);
  }
}
w('</HealthData>\n');
out.write(buf.join(''));
out.end();
// ActivitySummary 末尾补一条全 0（未戴表）
fs.writeFileSync(path.join(outDir, 'truth.json'), JSON.stringify({ ...truth, workouts: workouts.length }));
console.log('done');
