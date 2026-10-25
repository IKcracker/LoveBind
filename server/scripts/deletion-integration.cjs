const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { runDeletionCleanup } = require('../dist/modules/account-deletion/cleanup');

module.exports = async function deletionIntegration(call, adminToken) {
  if (process.env.NODE_ENV !== 'test' || process.env.CI !== '1') throw new Error('Disposable test database only');
  const db = new PrismaClient();
  const password = 'Account-deletion-test-password!';
  async function member() {
    const email = randomUUID() + '@example.invalid';
    const result = await call('/auth/register', 'POST', { email, password, displayName: 'Deletion test', birthDate: '1998-01-01' });
    assert.equal(result.status, 201);
    const id = result.json.user.id;
    await db.profile.update({ where: { userId: id }, data: { city: 'Pretoria', bio: 'Test member',
      relationshipGoal: 'Long-term', photoObjectKey: 'profiles/' + id + '/' + randomUUID(), photoReviewStatus: 'APPROVED', isVisible: true } });
    await db.identityVerification.create({ data: { userId: id, providerSessionId: 'ci-' + randomUUID(),
      status: 'Approved', consentAt: new Date(), ageEvidenceStatus: 'VERIFIED', ageVerifiedAt: new Date() } });
    await db.user.update({ where: { id }, data: { status: 'ACTIVE', adminApprovalStatus: 'APPROVED' } });
    return { id, email, token: result.json.accessToken };
  }
  const remove = (m, body = { password, confirmation: 'DELETE' }) => call('/account/delete', 'POST', body, m.token);
  try {
    const a = await member(); const b = await member();
    const second = await call('/auth/login', 'POST', { email: a.email, password });
    assert.equal((await call('/account/delete', 'POST', { password, confirmation: 'DELETE' })).status, 401);
    assert.equal((await remove(a, { password, confirmation: 'DELETE', userId: b.id })).status, 400);
    assert.equal((await remove(a, { password: 'wrong', confirmation: 'DELETE' })).status, 401);
    assert.ok(await db.profile.findUnique({ where: { userId: a.id } }), 'bad confirmation does not delete');
    await call('/discovery/' + b.id + '/like', 'POST', {}, a.token);
    const matchResult = await call('/discovery/' + a.id + '/like', 'POST', {}, b.token);
    assert.equal(matchResult.json.matched, true);
    const matchId = matchResult.json.matchId;
    assert.equal((await call('/conversations/' + matchId + '/messages', 'POST', { content: 'Erase this conversation' }, a.token)).status, 201);
    assert.equal((await call('/quizzes/matches/' + matchId + '/start', 'POST', {}, a.token)).status, 201);
    const report = await db.safetyReport.create({ data: { reporterId: b.id, reportedId: a.id, category: 'SCAM', details: 'Restricted safety evidence' } });
    const moderator = await call('/auth/me', 'GET', undefined, adminToken);
    await db.photoModerationReview.create({ data: { profileUserId: a.id, moderatorId: moderator.json.id,
      photoObjectKey: 'private-old-key', decision: 'REJECTED', reason: 'Safety review' } });
    await db.wallet.create({ data: { userId: a.id, available: 0, reserved: 0 } });
    await db.purchase.create({ data: { userId: a.id, provider: 'test', transactionId: randomUUID(), credits: 0, status: 'REFUNDED' } });
    const result = await remove(a);
    assert.equal(result.status, 201, JSON.stringify(result.json));
    assert.equal(result.json.externalCleanup, 'PENDING');
    assert.equal((await db.user.findUnique({ where: { id: a.id } })).status, 'DELETED');
    for (const model of ['profile','partnerPreference','emailCredential','authSession','identityVerification','consentRecord'])
      assert.equal(await db[model].count({ where: { userId: a.id } }), 0, model + ' erased');
    assert.equal((await db.match.findUnique({ where: { id: matchId } })).status, 'CLOSED');
    assert.equal(await db.conversation.count({ where: { matchId } }), 0);
    assert.equal(await db.quizSession.count({ where: { matchId } }), 0);
    for (const token of [a.token, second.json.accessToken])
      assert.equal((await call('/auth/me', 'GET', undefined, token)).status, 401, 'all sessions invalid');
    assert.equal((await remove(a)).status, 401, 'replay cannot repeat work');
    assert.equal((await call('/auth/login', 'POST', { email: a.email, password })).status, 401);
    assert.equal((await call('/conversations/' + matchId + '/messages', 'GET', undefined, b.token)).status, 404);
    assert.equal((await call('/quizzes/matches/' + matchId, 'GET', undefined, b.token)).status, 404);
    assert.ok(!(await call('/discovery', 'GET', undefined, b.token)).json.candidates.some(x => x.id === a.id));
    assert.equal((await call('/safety/reports', 'GET', undefined, b.token)).status, 403);
    assert.ok((await call('/safety/reports', 'GET', undefined, adminToken)).json.reports.some(x => x.id === report.id));
    assert.equal(await db.purchase.count({ where: { userId: a.id } }), 1, 'financial evidence retained');
    const receipt = await db.accountDeletion.findUnique({ where: { userId: a.id } });
    assert.ok(JSON.stringify(receipt.photoReviewEvidence).includes('Safety review'));
    assert.ok(!JSON.stringify(receipt).includes('private-old-key'));
    // Stale requests and direct writes cannot recreate personal data or reactivate a tombstone.
    await assert.rejects(db.user.update({ where: { id: a.id }, data: { status: 'ACTIVE' } }));
    await assert.rejects(db.profile.create({ data: { userId: a.id, displayName: 'Resurrected', birthDate: new Date('1998-01-01') } }));
    await assert.rejects(db.partnerPreference.create({ data: { userId: a.id, minAge: 18, maxAge: 90, preferredCities: [], relationshipGoals: [] } }));
    await assert.rejects(db.authSession.create({ data: { userId: a.id, tokenDigest: randomUUID(), expiresAt: new Date(Date.now() + 60000) } }));
    await assert.rejects(db.match.update({ where: { id: matchId }, data: { status: 'ACTIVE' } }));
    assert.equal(await db.accountDeletion.count({ where: { userId: a.id } }), 1);

    // Retryable external failures must leave durable, non-sensitive diagnostics.
    const cleanupTime = new Date(Date.now() + 11 * 60_000);
    await runDeletionCleanup(db, cleanupTime, async () => { throw new Error('sensitive provider body'); });
    const tasks = await db.deletionTask.findMany({ where: { userId: a.id } });
    assert.equal(tasks.length, 2);
    assert.ok(tasks.every(t => !t.completedAt && t.lastError === 'EXTERNAL_CLEANUP_FAILED'));
    assert.ok(!JSON.stringify(tasks).includes('sensitive provider body'));
    let erased = 0;
    await runDeletionCleanup(db, new Date(cleanupTime.getTime() + 31 * 60_000), async () => { erased++; });
    assert.ok(erased >= 2);
    assert.ok((await db.deletionTask.findMany({ where: { userId: a.id } })).every(t => t.completedAt && t.target === null));
    // Holds delay evidence disposal, never account departure or provider cleanup.
    const expiry = new Date(Date.now() + 31 * 86400000);
    await db.accountDeletion.update({ where: { userId: a.id }, data: { holdUntil: new Date(expiry.getTime() + 86400000), holdReference: 'TEST-CASE' } });
    await runDeletionCleanup(db, expiry, async () => {});
    assert.ok(await db.safetyReport.findUnique({ where: { id: report.id } }));
    await db.accountDeletion.update({ where: { userId: a.id }, data: { holdUntil: null, holdReference: null } });
    await runDeletionCleanup(db, expiry, async () => {});
    assert.equal(await db.safetyReport.findUnique({ where: { id: report.id } }), null);
    assert.equal(await db.purchase.count({ where: { userId: a.id } }), 0);
    assert.deepEqual((await db.accountDeletion.findUnique({ where: { userId: a.id } })).photoReviewEvidence, []);

    const limited = await member();
    for (let i = 0; i < 5; i++) assert.equal((await remove(limited, { password: 'wrong', confirmation: 'DELETE' })).status, 401);
    assert.equal((await remove(limited)).status, 429);
    assert.ok(await db.profile.findUnique({ where: { userId: limited.id } }));
    const suspended = await member();
    await db.user.update({ where: { id: suspended.id }, data: { status: 'SUSPENDED' } });
    assert.equal((await call('/auth/login', 'POST', { email: suspended.email, password })).status, 201);
    assert.equal((await call('/discovery', 'GET', undefined, suspended.token)).status, 401);
    assert.equal((await remove(suspended)).status, 201, 'suspension does not block departure');

    // A concurrent personal-data write either commits before deletion and is erased,
    // or is rejected. It must never recreate data after deletion commits.
    const racing = await member();
    const race = await Promise.allSettled([remove(racing), db.partnerPreference.create({ data: {
      userId: racing.id, minAge: 18, maxAge: 90, preferredCities: [], relationshipGoals: [] } })]);
    assert.equal(race[0].status, 'fulfilled');
    assert.equal(race[0].value.status, 201);
    assert.equal(await db.partnerPreference.count({ where: { userId: racing.id } }), 0);
    console.log('Account deletion integration PASS: confirmation, revocation, privacy, holds, cleanup, races');
  } finally { await db.$disconnect(); }
};
