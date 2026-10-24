/**
 * npm audit gate with ONE temporary, reviewable exception for an upstream
 * Expo CLI transitive advisory with no patched node-forge release available.
 * Every other high/critical vulnerability still fails CI. This does not
 * constitute a security fix: remove after updating the upstream dependency.
 */
const { spawnSync } = require('node:child_process');
const exception = 'GHSA-86w9-cpqp-85rv';
const deadline = new Date('2026-11-24T23:59:59Z');
const allowed = new Set([
  'node-forge', '@expo/code-signing-certificates', '@expo/cli',
  'expo', '@react-native-community/datetimepicker',
]);
const run = spawnSync('npm', ['audit', '--json', '--omit=dev', '--audit-level=high'], {
  encoding: 'utf8', maxBuffer: 12 * 1024 * 1024,
});
if (run.error) throw run.error;
let audit;
try {
  audit = JSON.parse(run.stdout);
} catch {
  process.stderr.write(run.stderr || run.stdout || 'npm audit did not return JSON');
  process.exit(1);
}
if (audit.error || (run.status !== 0 && run.status !== 1)) {
  console.error('npm audit failed, refusing to waive audit errors', audit.error || run.stderr);
  process.exit(1);
}
let failures = 0;
let waived = 0;
for (const [name, item] of Object.entries(audit.vulnerabilities || {})) {
  if (!['high', 'critical'].includes(item.severity)) continue;
  const onlyAllowedChain = allowed.has(name) && Array.isArray(item.via) && item.via.length > 0 &&
    item.via.every(v => typeof v === 'string'
      ? allowed.has(v)
      : !!v && typeof v.url === 'string' && v.url.endsWith('/' + exception));
  if (onlyAllowedChain && Date.now() <= deadline.getTime()) {
    console.warn('TEMPORARY SECURITY EXCEPTION: ' + name + ' via ' + exception +
      '; expiry ' + deadline.toISOString() + '. Not a patched vulnerability.');
    waived++;
  } else {
    console.error('UNRESOLVED ' + item.severity.toUpperCase() + ': ' + name);
    failures++;
  }
}
if (!audit.vulnerabilities || typeof audit.vulnerabilities !== 'object') {
  console.error('Malformed npm audit report');
  process.exit(1);
}
console.log('npm audit high/critical: ' + failures + ' blocking, ' + waived + ' documented temporary exemptions.');
if (failures) process.exit(1);
