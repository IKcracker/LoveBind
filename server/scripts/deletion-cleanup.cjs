// Run from the API directory on a private scheduled worker, never a public HTTP endpoint.
require('../dist/load-env');
const { PrismaClient } = require('@prisma/client');
const { runDeletionCleanup } = require('../dist/modules/account-deletion/cleanup');
const { retentionPolicy } = require('../dist/modules/account-deletion/deletion-policy');
retentionPolicy();
const db = new PrismaClient();
runDeletionCleanup(db).then(result => {
  console.log(JSON.stringify(result));
  if (result.pendingExternal) process.exitCode = 1; // Alert; failed tasks remain retryable.
}).catch(() => { console.error('Deletion cleanup failed; inspect restricted operational records'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
