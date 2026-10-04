import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const langs = ['en', 'hi', 'mr'];
const namespaces = [
  'common',
  'home',
  'crop',
  'market',
  'weather',
  'risk',
  'assistant',
  'profile',
  'notifications',
  'soil',
];

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

let totalMissing = 0;
const localesDir = path.resolve(__dirname, '../src/locales');

console.log('🔍 Running automated i18n key parity check across en, hi, mr...\n');

for (const ns of namespaces) {
  const dict = {};
  for (const l of langs) {
    const file = path.join(localesDir, l, `${ns}.json`);
    if (!fs.existsSync(file)) {
      console.error(`❌ MISSING FILE: ${file}`);
      totalMissing++;
      continue;
    }
    dict[l] = new Set(getKeys(JSON.parse(fs.readFileSync(file, 'utf8'))));
  }

  const allKeys = new Set([...(dict.en || []), ...(dict.hi || []), ...(dict.mr || [])]);
  let nsMissing = 0;

  for (const l of langs) {
    if (!dict[l]) continue;
    const missing = [...allKeys].filter((k) => !dict[l].has(k));
    if (missing.length > 0) {
      console.error(`❌ [${ns}] Language [${l}] missing ${missing.length} keys:`);
      console.error(`   ${missing.join(', ')}`);
      nsMissing += missing.length;
      totalMissing += missing.length;
    }
  }

  if (nsMissing === 0) {
    console.log(`✅ [${ns}] 100% synchronized (${allKeys.size} keys in all 3 languages)`);
  }
}

if (totalMissing === 0) {
  console.log('\n🎉 PASS: All translation files have 100% key parity across en, hi, mr!');
  process.exit(0);
} else {
  console.error(`\n❌ FAIL: Found ${totalMissing} missing translation keys.`);
  process.exit(1);
}
