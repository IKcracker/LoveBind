const assert = require('node:assert/strict');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

module.exports = async function phase1(call, adminToken) {
  const db = new PrismaClient();
  try {
    async function member(name, gender, partnerGenders = []) {
      const token = randomBytes(32).toString('base64url');
      const user = await db.user.create({ data: {
        authSubject: randomUUID(), status: 'ACTIVE', adminApprovalStatus: 'APPROVED',
        profile: { create: { displayName: name, gender, birthDate: new Date('1998-01-01'), city: 'Pretoria',
          bio: 'A synthetic adult member', relationshipGoal: 'Long-term', photoReviewStatus: 'APPROVED',
          photoObjectKey: 'ci-test/' + randomUUID(), isVisible: true } },
        preferences: { create: { minAge: 18, maxAge: 100, preferredCities: [], relationshipGoals: [], partnerGenders } },
        identityVerification: { create: { providerSessionId: 'ci-' + randomUUID(), status: 'Approved',
          consentAt: new Date(), ageEvidenceStatus: 'VERIFIED', ageVerifiedAt: new Date() } },
        sessions: { create: { tokenDigest: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } },
      } });
      return { id: user.id, token };
    }
    const a = await member('Phase1 Alex', 'MAN', ['WOMAN']);
    const b = await member('Phase1 Blair', 'WOMAN', ['MAN']);
    const c = await member('Phase1 Casey', 'WOMAN', ['WOMAN']);
    const d = await member('Phase1 Drew', null);
    const e = await member('Phase1 Ellis', 'WOMAN', ['MAN']);
    const f = await member('Phase1 Finn', 'MAN', ['WOMAN']);
    const ids = async m => (await call('/discovery', 'GET', undefined, m.token)).json.candidates.map(x => x.id);
    const like = (from, to) => call('/discovery/' + to.id + '/like', 'POST', {}, from.token);
    const block = (from, to) => call('/safety/members/' + to.id + '/block', 'POST', {}, from.token);
    const preferenceInput = { minAge: 18, maxAge: 100, preferredCities: [], relationshipGoals: [] };

    assert.ok((await ids(a)).includes(b.id), 'reciprocal gender preference candidate shown');
    assert.ok(!(await ids(a)).includes(c.id), 'candidate preferences must accept viewer');
    assert.ok(!(await ids(a)).includes(d.id), 'unspecified gender excluded by specific preferences');
    assert.equal((await like(a, c)).status, 409, 'direct likes cannot bypass preferences');
    await call('/preferences/me', 'PUT', { ...preferenceInput, preferredCities: ['Cape Town'] }, b.token);
    assert.ok(!(await ids(a)).includes(b.id), 'reciprocal city preference respected');
    await call('/preferences/me', 'PUT', { ...preferenceInput, relationshipGoals: ['Friendship'] }, b.token);
    assert.equal((await like(a, b)).status, 409, 'goal mismatch prevents matching');
    await call('/preferences/me', 'PUT', preferenceInput, b.token);
    assert.deepEqual((await call('/preferences/me', 'GET', undefined, b.token)).json.partnerGenders, ['MAN'], 'old clients preserve gender preferences');
    await call('/preferences/me', 'PUT', { ...preferenceInput, minAge: 80, maxAge: 100 }, b.token);
    assert.ok(!(await ids(a)).includes(b.id), 'reciprocal age range respected');
    assert.equal((await like(a, b)).status, 409, 'direct likes enforce reciprocal age range');
    await call('/preferences/me', 'PUT', preferenceInput, b.token);
    await db.identityVerification.update({ where: { userId: b.id }, data: { ageVerifiedAt: null } });
    assert.ok(!(await ids(a)).includes(b.id), 'missing age evidence excludes candidate');
    assert.equal((await like(a, b)).status, 409, 'direct like cannot bypass missing evidence');
    assert.equal((await call('/discovery', 'GET', undefined, b.token)).status, 409, 'missing evidence also excludes viewer');
    await db.identityVerification.update({ where: { userId: b.id }, data: { ageVerifiedAt: new Date() } });

    const harmless = await call('/profiles/me', 'PUT', { displayName: 'Phase1 Alex', bio: 'A synthetic adult member', occupation: 'Engineer' }, a.token);
    assert.equal(harmless.status, 200);
    assert.equal(harmless.json.isVisible, true, 'harmless full-form edit preserves visibility');
    const me = await call('/auth/me', 'GET', undefined, a.token);
    assert.equal(me.json.status, 'ACTIVE');
    assert.equal(me.json.adminApprovalStatus, 'APPROVED');

    assert.equal((await like(a, b)).json.matched, false);
    assert.ok((await call('/discovery/likes', 'GET', undefined, b.token)).json.likes.some(x => x.id === a.id), 'incoming interest shown');
    const matched = await like(b, a);
    assert.equal(matched.json.matched, true);
    const repeated = await like(b, a);
    assert.equal(repeated.json.matchId, matched.json.matchId, 'likes are idempotent');
    const match = await db.match.findUnique({ where: { id: matched.json.matchId }, include: { conversation: true } });
    assert.ok(match.conversation, 'mutual likes create a private conversation record');
    assert.deepEqual([match.userAId, match.userBId], [a.id, b.id].sort(), 'canonical pair');
    await call('/profiles/me/visibility', 'PUT', { visible: false }, b.token);
    assert.ok((await call('/discovery/matches', 'GET', undefined, a.token)).json.matches.some(x => x.id === match.id), 'hide from discovery retains existing matches');
    await call('/profiles/me/visibility', 'PUT', { visible: true }, b.token);
    assert.equal((await call('/safety/matches/' + match.id + '/unmatch', 'POST', {}, c.token)).status, 404, 'outsider cannot unmatch');

    assert.equal((await block(b, a)).status, 201);
    assert.equal((await block(b, a)).status, 201, 'block idempotent');
    for (const m of [a, b]) {
      assert.equal((await call('/discovery/matches', 'GET', undefined, m.token)).json.matches.length, 0, 'block removes matches both ways');
      assert.equal((await call('/discovery/likes', 'GET', undefined, m.token)).json.likes.length, 0, 'block removes likes both ways');
    }
    assert.ok(!(await ids(a)).includes(b.id));
    assert.ok(!(await ids(b)).includes(a.id));
    assert.equal((await like(a, b)).status, 409);
    assert.equal((await like(b, a)).status, 409);
    assert.equal((await call('/safety/blocks', 'GET', undefined, a.token)).json.blocks.length, 0, 'members cannot inspect who blocked them');
    assert.equal((await call('/safety/blocks', 'GET', undefined, b.token)).json.blocks.length, 1);
    await call('/safety/members/' + a.id + '/unblock', 'POST', {}, b.token);
    assert.equal((await like(a, b)).status, 409, 'unblock never reopens a closed match');

    assert.equal((await call('/discovery/' + e.id + '/pass', 'POST', {}, a.token)).status, 201);
    assert.ok(!(await ids(a)).includes(e.id), 'pass survives repeated fetch');
    assert.ok(!(await ids(e)).includes(a.id), 'pass excluded reciprocally');
    assert.equal((await like(e, a)).status, 409, 'passed pair cannot match through direct API');

    const concurrent = await Promise.all([like(f, e), like(e, f)]);
    assert.ok(concurrent.some(x => x.json.matched), 'simultaneous reciprocal likes create a match');
    const [userAId, userBId] = [e.id, f.id].sort();
    assert.equal(await db.match.count({ where: { userAId, userBId } }), 1, 'concurrent likes create exactly one match');
    const matchEF = await db.match.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
    assert.equal((await call('/safety/matches/' + matchEF.id + '/unmatch', 'POST', {}, f.token)).status, 201);
    assert.equal((await like(e, f)).status, 409, 'unmatch is permanent');

    const g = await member('Phase1 Gray', 'MAN', ['WOMAN']);
    const h = await member('Phase1 Harper', 'WOMAN', ['MAN']);
    await Promise.all([like(g, h), like(h, g), block(g, h)]);
    assert.equal((await like(h, g)).status, 409, 'racing likes cannot bypass a block');
    const pairGH = [g.id, h.id].sort();
    assert.equal(await db.match.count({ where: { userAId: pairGH[0], userBId: pairGH[1], status: 'ACTIVE' } }), 0, 'block wins regardless of concurrent ordering');
    assert.equal(await db.like.count({ where: { OR: [{ fromId: g.id, toId: h.id }, { fromId: h.id, toId: g.id }] } }), 0);

    const reportPath = '/safety/members/' + c.id + '/report';
    assert.equal((await call(reportPath, 'POST', { category: 'INVALID' }, a.token)).status, 400);
    const report = await call(reportPath, 'POST', { category: 'HARASSMENT', details: 'Synthetic integration evidence', block: true }, a.token);
    assert.equal(report.status, 201);
    assert.deepEqual(Object.keys(report.json).sort(), ['id', 'status'], 'report response does not leak identities or private notes');
    const retry = await call(reportPath, 'POST', { category: 'HARASSMENT', block: true }, a.token);
    assert.equal(retry.json.id, report.json.id, 'report retry deduplicated');
    assert.equal((await call('/safety/reports', 'GET', undefined, a.token)).status, 403);
    assert.equal((await call('/safety/reports')).status, 401);
    const queue = await call('/safety/reports', 'GET', undefined, adminToken);
    assert.ok(queue.json.reports.some(x => x.id === report.json.id), 'report reaches moderator queue');
    const reviewPath = '/safety/reports/' + report.json.id + '/review';
    assert.equal((await call(reviewPath, 'POST', { status: 'RESOLVED', resolution: 'Reviewed evidence' }, a.token)).status, 403);
    assert.equal((await call(reviewPath, 'POST', { status: 'REVIEWING', resolution: 'Investigating synthetic evidence' }, adminToken)).status, 201);
    assert.equal((await call(reviewPath, 'POST', { status: 'RESOLVED', resolution: 'Synthetic evidence reviewed and action recorded' }, adminToken)).status, 201);
    assert.ok((await db.safetyReport.findUnique({ where: { id: report.json.id } })).reviewedAt);
    assert.equal((await call(reviewPath, 'POST', { status: 'REVIEWING', resolution: 'Cannot reopen' }, adminToken)).status, 409);
    assert.equal((await block(a, a)).status, 400, 'self block rejected');
    assert.equal((await call('/safety/members/unknown-member/report', 'POST', { category: 'OTHER' }, a.token)).status, 404);

    const changed = await call('/profiles/me', 'PUT', { bio: 'Changed introduction needs moderation' }, a.token);
    assert.equal(changed.json.isVisible, false, 'response includes reconciled visibility');
    const pending = await call('/auth/me', 'GET', undefined, a.token);
    assert.equal(pending.json.adminApprovalStatus, 'PENDING');
    assert.equal(pending.json.status, 'PENDING');
    assert.equal((await call('/discovery', 'GET', undefined, a.token)).status, 409, 'pending profile cannot discover');
    await db.user.update({ where: { id: a.id }, data: { adminApprovalStatus: 'REJECTED' } });
    await call('/profiles/me', 'PUT', { occupation: 'Designer' }, a.token);
    assert.equal((await call('/auth/me', 'GET', undefined, a.token)).json.adminApprovalStatus, 'REJECTED', 'harmless edits cannot bypass rejection');
    console.log('Phase 1 integration: reciprocal eligibility, approval, likes, matches, blocks, passes, unmatch and reports PASS');
  } finally { await db.$disconnect(); }
};
