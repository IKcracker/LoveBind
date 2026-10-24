const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);
const violations = [];
for (const path of tracked) {
  if (/(^|\/)\.env(\.|$)/.test(path) && !path.endsWith('.env.example')) {
    violations.push(path + ': tracked environment file');
    continue;
  }
  if (/\.(pem|p8|p12|key|jks)$/.test(path)) {
    violations.push(path + ': tracked signing key');
    continue;
  }
  if (path.endsWith('.lock') || path.endsWith('package-lock.json')) continue;
  const data = fs.readFileSync(path);
  if (data.includes(0)) continue;
  const text = data.toString('utf8');
  if (/postgres(?:ql)?:\/\/[^\s:/]+:(?!PASSWORD|YOUR_PASSWORD|CHANGE_ME|ci-only)[^\s@]{8,}@/i.test(text) &&
      !path.endsWith('.env.example')) violations.push(path + ': possible embedded PostgreSQL credential');
  if (/sk-proj-[a-zA-Z0-9_-]{20,}/.test(text)) violations.push(path + ': possible OpenAI API secret');
  if (/npg_[a-zA-Z0-9]{15,}/.test(text)) violations.push(path + ': possible Neon credential');
}
if (violations.length) {
  console.error('Potential committed secrets found:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('Tracked-file secret hygiene checks passed (heuristic, not comprehensive).');
