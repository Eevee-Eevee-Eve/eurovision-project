const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildAccountRecord,
  consumePasswordReset,
  createSession,
  getSessionFromRequest,
  hashPassword,
  invalidateSession,
  issuePasswordReset,
  toAccountProfile,
  verifyPassword,
} = require('../data-store');

test('password hashes verify only the original password', () => {
  const password = 'strong-password-2026';
  const { salt, hash } = hashPassword(password);
  const account = { passwordSalt: salt, passwordHash: hash };

  assert.equal(verifyPassword(account, password), true);
  assert.equal(verifyPassword(account, 'different-password'), false);
});

test('account profiles expose provider names but not password material', () => {
  const account = buildAccountRecord({
    email: 'viewer@example.com',
    password: 'strong-password-2026',
    firstName: 'Euro',
    lastName: 'Viewer',
    publicDisplayMode: 'first_name_last_initial',
    publicDisplayOptIn: true,
    oauthIdentities: {
      yandex: {
        subject: 'provider-subject',
        email: 'viewer@example.com',
      },
    },
  });

  const profile = toAccountProfile(account);

  assert.equal(profile.email, 'viewer@example.com');
  assert.equal(profile.publicName, 'Euro V.');
  assert.equal(profile.hasPassword, true);
  assert.deepEqual(profile.authProviders, ['yandex']);
  assert.equal(Object.hasOwn(profile, 'passwordHash'), false);
  assert.equal(Object.hasOwn(profile, 'passwordSalt'), false);
});

test('sessions store a hash and can be invalidated by the raw cookie token', () => {
  const state = { sessions: {} };
  const rawToken = createSession(state, 'account-1');
  const storedTokens = Object.keys(state.sessions);

  assert.equal(storedTokens.length, 1);
  assert.notEqual(storedTokens[0], rawToken);

  const request = { headers: { cookie: `esc_session=${encodeURIComponent(rawToken)}` } };
  assert.equal(getSessionFromRequest(state, request)?.accountId, 'account-1');

  invalidateSession(state, rawToken);
  assert.equal(getSessionFromRequest(state, request), null);
});

test('password reset tokens are one-time tokens', () => {
  const state = { passwordResets: {} };
  const rawToken = issuePasswordReset(state, 'account-1');

  assert.equal(consumePasswordReset(state, rawToken)?.accountId, 'account-1');
  assert.equal(consumePasswordReset(state, rawToken), null);
});
