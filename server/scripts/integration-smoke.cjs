/* Exercises a temporary, isolated PostgreSQL database in CI only. */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');

const port = Number(process.env.PORT || '4010');
const base = 'http://127.0.0.1:' + port;
const child = spawn(process.execPath, ['dist/main.js'], {
  cwd: require('node:path').join(__dirname, '..'),
  env: { ...process.env, PORT: String(port), CORS_ORIGINS: 'http://localhost:8081' },
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
  assert.equal((await call('/health/db')).status, 200, 'PostgreSQL connection');
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
  const me = await call('/auth/me', 'GET', undefined, token);
  assert.equal(me.status, 200, 'session works');
  assert.equal(me.json.profile.displayName, 'Taylor', 'registration creates profile');
  assert.equal((await call('/profiles/me')).status, 401, 'profile requires a session');

  // Seed one isolated catalogue row. New profile cities must be selected from
  // the canonical GeoNames list rather than accepted as unchecked free text.
  const { PrismaClient } = require('@prisma/client');
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
