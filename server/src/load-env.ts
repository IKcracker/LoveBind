import { config } from 'dotenv';
import { resolve } from 'node:path';

// Runtime environment (CI or hosting) takes priority.
config({ path: resolve(process.cwd(), '.env.local'), override: false });
config({ path: resolve(process.cwd(), '.env'), override: false });
