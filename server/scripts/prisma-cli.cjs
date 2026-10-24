const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { config } = require('dotenv');
const root = resolve(__dirname, '..');
config({ path: resolve(root, '.env.local'), override: false });
config({ path: resolve(root, '.env'), override: false });
const cli = resolve(root, 'node_modules', 'prisma', 'build', 'index.js');
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root, env: process.env, stdio: 'inherit',
});
if (result.error) { console.error(result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
