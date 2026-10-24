const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { config } = require('dotenv');
const root = resolve(__dirname, '..');
config({ path: resolve(root, '.env.local'), override: false });
config({ path: resolve(root, '.env'), override: false });
const cli = resolve(root, 'node_modules', 'prisma', 'build', 'index.js');
const args = process.argv.slice(2);
// The pooled connection is for runtime API queries. Prisma migrations require
// the direct Neon endpoint. Keep it optional so existing Render builds work.
const env = { ...process.env };
if (args[0] === 'migrate' && env.DIRECT_DATABASE_URL) {
  env.DATABASE_URL = env.DIRECT_DATABASE_URL;
}
const result = spawnSync(process.execPath, [cli, ...args], {
  cwd: root, env, stdio: 'inherit',
});
if (result.error) { console.error(result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
