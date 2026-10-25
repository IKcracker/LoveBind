/* Exercises a temporary, isolated PostgreSQL database in CI only. */
if (process.env.NODE_ENV !== 'test' || process.env.CI !== '1') {
  throw new Error('Integration smoke requires NODE_ENV=test and CI=1 with a disposable PostgreSQL database');
}
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
// A disposable test-only key shared with the API child; never use on real deployments.
process.env.LOVEBIND_CHAT_ENCRYPTION_KEY = 'c'.repeat(64);
process.env.LOVEBIND_QUIZ_ENCRYPTION_KEY = 'd'.repeat(64);

const port = Number(process.env.PORT || '4010');
const base = 'http://127.0.0.1:' + port;
const moderatorId = 'ciadmin' + randomUUID().replace(/-/g,'');
const moderatorEmail = 'moderator+' + randomUUID() + '@example.invalid';
const moderatorPassword = 'VeryLongModeratorPassword-2026!';
const envAdminEmail = 'envadmin+' + randomUUID() + '@example.invalid';
const envAdminPassword = 'StrongEnvAdminPassword-2026!';
const child = spawn(process.execPath, ['dist/main.js'], {
  cwd: require('node:path').join(__dirname, '..'),
  env: { ...process.env, PORT: String(port), CORS_ORIGINS: 'http://localhost:8081',
    LOVEBIND_MODERATOR_IDS: moderatorId,
    LOVEBIND_ADMIN_EMAIL: envAdminEmail,
    LOVEBIND_ADMIN_PASSWORD: envAdminPassword,
    DIDIT_API_KEY:'ci-fake-didit-key-not-used',
    LOVEBIND_CHAT_ENCRYPTION_KEY: process.env.LOVEBIND_CHAT_ENCRYPTION_KEY,
    LOVEBIND_QUIZ_ENCRYPTION_KEY: process.env.LOVEBIND_QUIZ_ENCRYPTION_KEY,
    R2_ACCOUNT_ID: 'ci-account', R2_BUCKET: 'ci-private',
    R2_ACCESS_KEY_ID: 'ci-test-key', R2_SECRET_ACCESS_KEY: 'ci-fake-key-not-used' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk.toString().slice(0, 1000); });
child.stderr.on('data', (chunk) => { logs += chunk.toString().slice(0, 1000); });
async function call(path, method = 'GET', body, token) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}
async function awaitReady() {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('API quit early: ' + logs.slice(-1500));
    try { if ((await call('/health')).status === 200) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('API health endpoint never became ready: ' + logs.slice(-1500));
}
async function smoke() {
  await awaitReady();
  const { PrismaClient } = require('@prisma/client');
  const { hashPassword } = require('../dist/modules/auth/password.js');
  const seed = new PrismaClient();
  try {
    await seed.user.create({data:{id:moderatorId, authSubject:randomUUID(),
      credential:{create:{email:moderatorEmail,passwordHash:await hashPassword(moderatorPassword)}},
      profile:{create:{displayName:'CI Moderator',birthDate:new Date('1993-01-01')}}}});
  } finally { await seed.$disconnect(); }

  assert.equal((await call('/health/db')).status, 200, 'PostgreSQL connection');
  const envAdminLogin = await call('/auth/login', 'POST', {email:envAdminEmail,password:envAdminPassword});
  assert.equal(envAdminLogin.status,201,'environment admin account bootstrapped');
  const envAdminToken=envAdminLogin.json.accessToken;
  assert.equal((await call('/moderation/access','GET',undefined,envAdminToken)).json.canModerate,true,
    'environment admin has moderator access');
  assert.equal((await call('/moderation/admin/overview','GET',undefined,envAdminToken)).status,200,
    'environment admin can load CRM');
  const envAdminMe=await call('/auth/me','GET',undefined,envAdminToken);
  assert.equal(envAdminMe.json.profile,null,'environment admin is not a dating profile');
  assert.equal((await call('/moderation/admin/members?q='+encodeURIComponent(envAdminEmail),'GET',undefined,envAdminToken)).json.total,0,
    'environment admin excluded from members directory');
  assert.equal((await call('/auth/login','POST',{email:envAdminEmail,password:'wrong'})).status,401,
    'invalid admin password denied');
  const noMemberRecheck=await call('/moderation/admin/members/unknown-member/recheck-age','POST',{},envAdminToken);
  assert.equal(noMemberRecheck.status,409,'cannot recheck an unverified or unknown member');
  assert.equal((await call('/moderation/admin/recheck-age/batch','POST',{},envAdminToken)).status,201,
    'empty batch is allowed');
  assert.equal((await call('/moderation/admin/members/unknown-member/age-rechecks','GET',undefined,envAdminToken)).status,200,
    'moderator can read age recheck history');
  assert.equal((await call('/auth/me')).status, 401, 'private endpoint rejects guests');
  const email = 'ci+' + randomUUID() + '@example.invalid';
  const registration = {
    email, password: 'ReallyLongTestPassword-2026!',
    displayName: 'Taylor', birthDate: '1995-02-21',
  };
  const underAge = await call('/auth/register', 'POST', { ...registration, birthDate: '2014-02-21' });
  assert.equal(underAge.status, 400, 'rejects minors');
  const created = await call('/auth/register', 'POST', registration);
  assert.equal(created.status, 201, 'register successful');
  assert.equal(created.json.user.status, 'PENDING', 'unverified accounts remain pending');
  assert.ok(created.json.accessToken, 'opaque bearer token issued');
  const token = created.json.accessToken;
  assert.equal((await call('/moderation/photos')).status, 401, 'moderation queue is authenticated');
  assert.equal((await call('/moderation/admin/overview')).status, 401,
    'admin dashboard cannot be viewed without login');
  assert.equal((await call('/moderation/admin/overview', 'GET', undefined, token)).status, 403,
    'member cannot access admin dashboard');
  assert.equal((await call('/moderation/admin/members', 'GET', undefined, token)).status, 403,
    'member directory restricted to admin');
  const adminSession = await call('/auth/login', 'POST', {
    email: moderatorEmail, password: moderatorPassword,
  });
  assert.equal(adminSession.status, 201, 'authorized moderator can log in');
  const adminToken = adminSession.json.accessToken;
  const overview = await call('/moderation/admin/overview', 'GET', undefined, adminToken);
  assert.equal(overview.status, 200, 'moderator dashboard available');
  const directory = await call('/moderation/admin/members?q=Taylor', 'GET', undefined, adminToken);
  assert.equal(directory.status, 200, 'member directory available');
  assert.ok(directory.json.members.some(x => x.id === created.json.user.id));
  assert.equal((await call('/moderation/admin/members/' + moderatorId + '/decision',
    'POST', { decision:'APPROVED' }, adminToken)).status, 403,
    'admin cannot approve own account');
  assert.equal((await call('/moderation/admin/members/' + created.json.user.id + '/decision',
    'POST', { decision:'APPROVED' }, adminToken)).status, 409,
    'admin cannot approve member without verified age and photo');

  assert.equal((await call('/moderation/access', 'GET', undefined, token)).status, 200);
  assert.equal((await call('/moderation/photos', 'GET', undefined, token)).status, 403,
    'ordinary users cannot review others');
  assert.equal((await call('/moderation/photos/test-user/decision', 'POST',
    {decision:'APPROVED'}, token)).status, 403,
    'ordinary users cannot grant photo approval');
  assert.equal((await call('/verification/me', 'GET', undefined, token)).status, 200,
    'identity status is private and queryable');
  const me = await call('/auth/me', 'GET', undefined, token);
  assert.equal(me.status, 200, 'session works');
  assert.equal(me.json.profile.displayName, 'Taylor', 'registration creates profile');
  assert.equal((await call('/profiles/me')).status, 401, 'profile requires a session');

  // Seed one isolated catalogue row. New profile cities must be selected from
  // the canonical GeoNames list rather than accepted as unchecked free text.
  const prisma = new PrismaClient();
  try {
    await prisma.geoCity.create({
      data: { id: 987654321, name: 'Pretoria', asciiName: 'Pretoria',
        countryCode: 'ZA', admin1Code: '06', population: 120000,
        latitude: -25.74, longitude: 28.19 },
    });
  } finally {
    await prisma.$disconnect();
  }
  const suggestions = await call('/locations/cities?q=Pre', 'GET', undefined, token);
  assert.equal(suggestions.status, 200, 'city suggestions return');
  assert.ok(suggestions.json.some(item => item.placeId === 'geonames:987654321'), 'test city suggested');
  const uncheckedCity = await call('/profiles/me', 'PUT', {
    city: 'Pretoria', bio: 'Reading and hiking', relationshipGoal: 'Long-term',
  }, token);
  assert.equal(uncheckedCity.status, 400, 'unchecked city rejected');
  const updated = await call('/profiles/me', 'PUT', {
    displayName: 'Taylor A', city: 'Pretoria', cityPlaceId: 'geonames:987654321',
    bio: 'Reading and hiking', relationshipGoal: 'Long-term',
  }, token);
  assert.equal(updated.status, 200, 'can update own profile');
  assert.equal(updated.json.city, 'Pretoria');
  const reject = await call('/moderation/admin/members/' + created.json.user.id + '/decision',
    'POST', { decision:'REJECTED', reason:'Profile verification remains incomplete' }, adminToken);
  assert.equal(reject.status, 201, 'admin rejection is recorded');
  assert.equal(reject.json.accountActive, false, 'rejected member stays inactive');
  assert.equal((await call('/moderation/admin/members/' + created.json.user.id + '/decision',
    'POST', { decision:'APPROVED' }, adminToken)).status, 409,
    'rejected account still cannot bypass age and photo verification');

  // Synthetic evidence on an isolated disposable CI DB only. Never write
  // provider approval values from application clients in any real environment.
  const synthetic = new PrismaClient();
  try {
    await synthetic.profile.update({where:{userId:created.json.user.id},data:{
      photoObjectKey:'profiles/' + created.json.user.id + '/ci-test-image',
      photoReviewStatus:'APPROVED',
    }});
    await synthetic.identityVerification.create({data:{
      userId:created.json.user.id,providerSessionId:'ci-' + randomUUID(),
      status:'Approved',consentAt:new Date(),ageEvidenceStatus:'VERIFIED',ageVerifiedAt:new Date(),
    }});
  } finally { await synthetic.$disconnect(); }
  const memberBeforeApproval = await call('/moderation/admin/members/' + created.json.user.id,
    'GET', undefined, adminToken);
  assert.equal(memberBeforeApproval.status, 200, 'admin can review synthetic member details');
  assert.equal(memberBeforeApproval.json.eligible, true, 'all evidence gates satisfied');
  const approve = await call('/moderation/admin/members/' + created.json.user.id + '/decision',
    'POST', { decision:'APPROVED', reason:'All synthetic checks passed' }, adminToken);
  assert.equal(approve.status, 201, 'explicit moderator approval allowed');
  assert.equal(approve.json.accountActive, true, 'approval activates eligible member');
  const activatedUser = await call('/auth/me','GET',undefined,token);
  assert.equal(activatedUser.json.status,'ACTIVE');
  const audit = await call('/moderation/admin/activity','GET',undefined,adminToken);
  assert.equal(audit.status,200);
  assert.ok(audit.json.events.some(e=>e.memberId===created.json.user.id && e.decision==='APPROVED'),
    'explicit approval appears in audit log');

  const badPrefs = await call('/preferences/me', 'PUT', {
    minAge: 15, maxAge: 30, preferredCities: [], relationshipGoals: [],
  }, token);
  assert.equal(badPrefs.status, 400, 'age constraints enforced');
  const prefs = await call('/preferences/me', 'PUT', {
    minAge: 23, maxAge: 35, preferredCities: ['Pretoria'], relationshipGoals: ['Long-term'],
  }, token);
  assert.equal(prefs.status, 200, 'preference creation works');
  const again = await call('/preferences/me', 'GET', undefined, token);
  assert.equal(again.json.minAge, 23, 'preference persisted');
  await require('./phase1-integration.cjs')(call, adminToken);
  await require('./deletion-integration.cjs')(call, adminToken);
  const login = await call('/auth/login', 'POST', { email, password: registration.password });
  assert.equal(login.status, 201, 'sign-in succeeds');
  assert.ok(login.json.accessToken);
  const wrongPassword = await call('/auth/login', 'POST', { email, password: 'incorrect' });
  assert.equal(wrongPassword.status, 401, 'invalid password rejected');
  assert.equal((await call('/auth/logout', 'POST', {}, token)).status, 201, 'logout succeeds');
  assert.equal((await call('/auth/me', 'GET', undefined, token)).status, 401, 'logged-out token denied');
  console.log('LoveBind integration smoke: registration, authentication, profiles, preferences and PostgreSQL PASS');
}
smoke().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  child.kill('SIGTERM');
});
