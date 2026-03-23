/**
 * Eurovision backend v6
 */
const express = require('express');
const http = require('http');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Server: IOServer } = require('socket.io');
const {
  ACTS_BY_STAGE,
  DEFAULT_ROOM_SLUG,
  DEFAULT_STAGE,
  ROOMS,
  STAGES,
  STAGE_KEYS,
  getAct,
  getRoomBySlug,
  getStageLineupMeta,
} = require('./catalog');
const {
  POLICY_VERSION,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  buildAccountRecord,
  buildPublicName,
  deleteAvatarImage,
  getAvatarTheme,
  getSessionFromRequest,
  hashPassword,
  invalidateSession,
  issuePasswordReset,
  loadState,
  normalizeEmail,
  parseCookies,
  pruneExpiredState,
  sanitizeDisplayMode,
  sanitizeText,
  saveState,
  toAccountProfile,
  verifyPassword,
  writeAvatarImage,
  consumePasswordReset,
  createSession,
} = require('./data-store');

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT || 4000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ADMIN_KEY = process.env.ADMIN_KEY?.trim() || (IS_PRODUCTION ? '' : 'dev-admin-key');
const ADMIN_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL);
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL || CLIENT_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_SESSION_COOKIE_NAME = 'esc_admin_session';
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SMTP_HOST = String(process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = ['1', 'true', 'yes'].includes(String(process.env.SMTP_SECURE || '').toLowerCase());
const SMTP_USER = String(process.env.SMTP_USER || '').trim();
const SMTP_PASS = String(process.env.SMTP_PASS || '');
const SMTP_FROM = String(process.env.SMTP_FROM || '').trim();

const SCORING_PROFILES = {
  balanced: {
    key: 'balanced',
    label: 'Balanced',
    description: 'Recommended for bigger rooms. Exact and near placements matter, ties are much rarer.',
    distancePoints: [10, 7, 5, 3, 2, 1],
  },
  classic: {
    key: 'classic',
    label: 'Classic 3-2-1',
    description: 'Closest to the original prototype. Very easy to explain, but creates more ties.',
    distancePoints: [3, 2, 1],
  },
  precision: {
    key: 'precision',
    label: 'Precision',
    description: 'Rewards exact placement heavily and keeps a sharper spread near the correct spot.',
    distancePoints: [12, 8, 5, 3, 1],
  },
};
const DEFAULT_SCORING_PROFILE = 'balanced';

const LOCAL_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
]);

const allowedOrigins = new Set([...LOCAL_ORIGINS, CLIENT_ORIGIN].filter(Boolean));
const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.has(origin)) {
    return callback(null, true);
  }
  return callback(new Error('Origin not allowed'));
};

const io = new IOServer(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

function createStageBuckets(factory) {
  return STAGE_KEYS.reduce((acc, stage) => {
    acc[stage] = factory();
    return acc;
  }, {});
}

function createRoomState() {
  return {
    predictionWindows: createStageBuckets(() => true),
    users: {},
    predictions: createStageBuckets(() => ({})),
    results: createStageBuckets(() => []),
    resultBreakdown: createStageBuckets(() => ({})),
    locks: createStageBuckets(() => ({})),
    scores: createStageBuckets(() => ({})),
    removedAccounts: {},
    scoringProfile: DEFAULT_SCORING_PROFILE,
  };
}

const state = loadState(createRoomState, ROOMS);
const roomStates = state.roomStates;

function getScoringProfile(profileKey) {
  return SCORING_PROFILES[profileKey] || SCORING_PROFILES[DEFAULT_SCORING_PROFILE];
}

function normalizeRoomStateShape(room) {
  if (!room || typeof room !== 'object') {
    return createRoomState();
  }

  if (!room.predictionWindows || typeof room.predictionWindows !== 'object') {
    const legacyOpen = typeof room.predictionsOpen === 'boolean' ? room.predictionsOpen : true;
    room.predictionWindows = createStageBuckets(() => legacyOpen);
  }
  if (!room.users || typeof room.users !== 'object') {
    room.users = {};
  }
  if (!room.predictions || typeof room.predictions !== 'object') {
    room.predictions = createStageBuckets(() => ({}));
  }
  if (!room.results || typeof room.results !== 'object') {
    room.results = createStageBuckets(() => []);
  }
  if (!room.resultBreakdown || typeof room.resultBreakdown !== 'object') {
    room.resultBreakdown = createStageBuckets(() => ({}));
  }
  if (!room.locks || typeof room.locks !== 'object') {
    room.locks = createStageBuckets(() => ({}));
  }
  if (!room.scores || typeof room.scores !== 'object') {
    room.scores = createStageBuckets(() => ({}));
  }
  if (!room.removedAccounts || typeof room.removedAccounts !== 'object') {
    room.removedAccounts = {};
  }

  STAGE_KEYS.forEach((stage) => {
    room.predictionWindows[stage] = typeof room.predictionWindows[stage] === 'boolean' ? room.predictionWindows[stage] : true;
    room.predictions[stage] = room.predictions[stage] && typeof room.predictions[stage] === 'object' ? room.predictions[stage] : {};
    room.results[stage] = Array.isArray(room.results[stage]) ? room.results[stage] : [];
    room.resultBreakdown[stage] = room.resultBreakdown[stage] && typeof room.resultBreakdown[stage] === 'object'
      ? room.resultBreakdown[stage]
      : {};
    room.locks[stage] = room.locks[stage] && typeof room.locks[stage] === 'object' ? room.locks[stage] : {};
    room.scores[stage] = room.scores[stage] && typeof room.scores[stage] === 'object' ? room.scores[stage] : {};
  });

  room.scoringProfile = getScoringProfile(room.scoringProfile).key;
  delete room.predictionsOpen;
  return room;
}

ROOMS.forEach((room) => {
  roomStates[room.slug] = normalizeRoomStateShape(roomStates[room.slug]);
  state.roomStates[room.slug] = roomStates[room.slug];
});

if (!state.adminSessions || typeof state.adminSessions !== 'object') {
  state.adminSessions = {};
}

function pruneExpiredAdminSessions() {
  const now = Date.now();
  Object.entries(state.adminSessions).forEach(([key, session]) => {
    if (new Date(session.expiresAt).getTime() <= now) {
      delete state.adminSessions[key];
    }
  });
}

pruneExpiredState(state);
pruneExpiredAdminSessions();
saveState(state);

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '4mb' }));
app.use(rateLimit({
  windowMs: 60_000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
}));

function persistState() {
  pruneExpiredState(state);
  pruneExpiredAdminSessions();
  saveState(state);
}

function normalizeRoomSlug(value, { allowDefault = false } = {}) {
  if (value == null || value === '') {
    return allowDefault ? DEFAULT_ROOM_SLUG : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  return getRoomBySlug(value) ? value : null;
}

function getRoomState(roomSlug) {
  return roomStates[roomSlug];
}

function normalizeStage(value) {
  if (value == null || value === '') {
    return DEFAULT_STAGE;
  }
  if (typeof value !== 'string') {
    return null;
  }
  return STAGES[value] ? value : null;
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.cookie(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    expires: new Date(0),
    path: '/',
  });
}

function setAdminSessionCookie(res, token) {
  res.cookie(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    maxAge: ADMIN_SESSION_TTL_MS,
    path: '/',
  });
}

function clearAdminSessionCookie(res) {
  res.cookie(ADMIN_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    expires: new Date(0),
    path: '/',
  });
}

function hashAdminToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function createAdminSession() {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  state.adminSessions[hashAdminToken(rawToken)] = {
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS).toISOString(),
  };
  return rawToken;
}

function invalidateAdminSession(rawToken) {
  if (!rawToken) return;
  delete state.adminSessions[hashAdminToken(rawToken)];
}

async function sendPasswordResetEmail(email, resetUrl) {
  const transport = getPasswordResetTransport();
  if (!transport) {
    throw new Error('Password recovery email is not configured on this deployment yet');
  }

  const subject = 'Reset your Morozov Eurovision 2026 password';
  const text = [
    'A password reset was requested for your Morozov Eurovision 2026 account.',
    '',
    `Open this link to set a new password: ${resetUrl}`,
    '',
    'If you did not request this reset, you can ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #161728;">
      <h2 style="margin-bottom: 12px;">Reset your Morozov Eurovision 2026 password</h2>
      <p>A password reset was requested for your Morozov Eurovision 2026 account.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this reset, you can ignore this email.</p>
    </div>
  `;

  const info = await transport.sendMail({
    from: SMTP_FROM,
    to: email,
    subject,
    text,
    html,
  });

  console.log(`Password reset email sent to ${email}: ${info.messageId || 'queued'}`);
}

function getAdminSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies[ADMIN_SESSION_COOKIE_NAME];
  if (!rawToken) {
    return null;
  }

  const session = state.adminSessions[hashAdminToken(rawToken)];
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    delete state.adminSessions[hashAdminToken(rawToken)];
    return null;
  }

  return {
    rawToken,
    ...session,
  };
}

function validateRanking(stageKey, ranking, { allowPartial = false } = {}) {
  if (!Array.isArray(ranking)) {
    return { ok: false, error: 'Invalid ranking payload' };
  }

  const validCodes = new Set(ACTS_BY_STAGE[stageKey].map((act) => act.code));
  const normalizedRanking = ranking.map((item) => sanitizeText(item, 8).toUpperCase());

  if (normalizedRanking.some((code) => !code || !validCodes.has(code))) {
    return { ok: false, error: 'Ranking contains unknown countries' };
  }

  if (new Set(normalizedRanking).size !== normalizedRanking.length) {
    return { ok: false, error: 'Ranking contains duplicate countries' };
  }

  if (!allowPartial && normalizedRanking.length !== validCodes.size) {
    return { ok: false, error: 'Ranking must include all countries for this stage' };
  }

  return { ok: true, ranking: normalizedRanking };
}

function validateResultBreakdown(stageKey, breakdown, ranking) {
  if (breakdown == null) {
    return { ok: true, breakdown: {} };
  }

  if (!Array.isArray(breakdown)) {
    return { ok: false, error: 'Invalid breakdown payload' };
  }

  const validCodes = new Set(ACTS_BY_STAGE[stageKey].map((act) => act.code));
  const rankingSet = new Set(ranking);
  const normalized = {};

  for (const row of breakdown) {
    const code = sanitizeText(row?.code, 8).toUpperCase();
    if (!code || !validCodes.has(code)) {
      return { ok: false, error: 'Breakdown contains unknown countries' };
    }
    if (!rankingSet.has(code)) {
      return { ok: false, error: 'Breakdown must match the published ranking' };
    }

    const jury = Number.isFinite(Number(row?.jury)) ? Number(row.jury) : 0;
    const tele = Number.isFinite(Number(row?.tele)) ? Number(row.tele) : 0;
    const total = Number.isFinite(Number(row?.total)) ? Number(row.total) : jury + tele;
    normalized[code] = { jury, tele, total };
  }

  return { ok: true, breakdown: normalized };
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function hasSmtpConfig() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) {
    return false;
  }
  if ((SMTP_USER && !SMTP_PASS) || (!SMTP_USER && SMTP_PASS)) {
    return false;
  }
  return true;
}

let passwordResetTransport = null;

function getPasswordResetTransport() {
  if (!hasSmtpConfig()) {
    return null;
  }

  if (!passwordResetTransport) {
    passwordResetTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }

  return passwordResetTransport;
}

function getAdminAuthMethods() {
  return {
    key: Boolean(ADMIN_KEY),
    emailPassword: Boolean(ADMIN_EMAIL && ADMIN_PASSWORD),
  };
}

function isAdminCredentialLoginValid(email, password) {
  return Boolean(
    ADMIN_EMAIL
    && ADMIN_PASSWORD
    && normalizeEmail(email) === ADMIN_EMAIL
    && String(password || '') === ADMIN_PASSWORD,
  );
}

function getPasswordResetMode() {
  if (hasSmtpConfig()) {
    return 'email';
  }
  return IS_PRODUCTION ? 'disabled' : 'preview';
}

function getAccountById(accountId) {
  return state.accounts[accountId] || null;
}

function getAccountByEmail(email) {
  const accountId = state.emailToAccountId[normalizeEmail(email)];
  return accountId ? getAccountById(accountId) : null;
}

function buildRoomUserFromAccount(account) {
  const profile = toAccountProfile(account);
  return {
    id: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    displayName: account.displayName,
    name: profile.publicName,
    emoji: account.emoji,
    avatarUrl: profile.avatarUrl,
    avatarTheme: profile.avatarTheme,
  };
}

function isAccountRemovedFromRoom(roomSlug, accountId) {
  return Boolean(getRoomState(roomSlug).removedAccounts[accountId]);
}

function ensureRoomMembership(roomSlug, account) {
  const room = getRoomState(roomSlug);
  if (room.removedAccounts[account.id]) {
    return { changed: false, blocked: true };
  }
  const nextUser = buildRoomUserFromAccount(account);
  const previous = room.users[account.id];
  room.users[account.id] = nextUser;
  return {
    changed: JSON.stringify(previous) !== JSON.stringify(nextUser),
    blocked: false,
  };
}

function syncAccountAcrossRooms(account) {
  ROOMS.forEach((room) => {
    if (roomStates[room.slug].users[account.id]) {
      roomStates[room.slug].users[account.id] = buildRoomUserFromAccount(account);
    }
  });
}

function dropAccountFromRoom(roomSlug, accountId) {
  const room = getRoomState(roomSlug);
  delete room.users[accountId];
  STAGE_KEYS.forEach((stage) => {
    delete room.predictions[stage][accountId];
    delete room.locks[stage][accountId];
    delete room.scores[stage][accountId];
  });
}

function removeAccountFromRoom(roomSlug, accountId) {
  const room = getRoomState(roomSlug);
  dropAccountFromRoom(roomSlug, accountId);
  room.removedAccounts[accountId] = {
    removedAt: new Date().toISOString(),
  };
}

function restoreAccountToRoom(roomSlug, accountId) {
  const room = getRoomState(roomSlug);
  delete room.removedAccounts[accountId];
}

function resetAccountInRoom(roomSlug, accountId, stageKey = null) {
  const room = getRoomState(roomSlug);
  const stages = stageKey ? [stageKey] : STAGE_KEYS;

  stages.forEach((stage) => {
    delete room.predictions[stage][accountId];
    delete room.locks[stage][accountId];
    delete room.scores[stage][accountId];
  });

  delete room.removedAccounts[accountId];
}

function removeAccountEverywhere(accountId) {
  ROOMS.forEach((room) => {
    dropAccountFromRoom(room.slug, accountId);
    delete getRoomState(room.slug).removedAccounts[accountId];
  });
}

function getDisplayName(user) {
  return user.name
    || [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    || user.displayName
    || `Viewer #${String(user.id || '').slice(0, 4).toUpperCase()}`;
}

function getDistancePoints(profile, distance) {
  return profile.distancePoints[distance] || 0;
}

function getPredictionScoreBreakdown(roomSlug, userId, stageKey) {
  const room = getRoomState(roomSlug);
  const ranking = room.predictions[stageKey][userId] || [];
  const results = room.results[stageKey];
  const profile = getScoringProfile(room.scoringProfile);
  const resultIndexMap = results.reduce((acc, code, index) => {
    acc[code] = index;
    return acc;
  }, {});

  return ranking.reduce((acc, countryCode, index) => {
    const resultIndex = resultIndexMap[countryCode];
    if (typeof resultIndex !== 'number') {
      return acc;
    }

    const distance = Math.abs(resultIndex - index);
    acc.points += getDistancePoints(profile, distance);
    acc.totalDistance += distance;
    acc.comparedEntries += 1;
    if (distance === 0) {
      acc.exactMatches.push(countryCode);
    }
    if (distance <= 2) {
      acc.closeMatches += 1;
    }
    return acc;
  }, {
    points: 0,
    closeMatches: 0,
    totalDistance: 0,
    comparedEntries: 0,
    exactMatches: [],
  });
}

function recomputeScores(roomSlug) {
  const room = getRoomState(roomSlug);

  STAGE_KEYS.forEach((stage) => {
    const stageScores = {};

    Object.keys(room.predictions[stage]).forEach((userId) => {
      stageScores[userId] = getPredictionScoreBreakdown(roomSlug, userId, stage).points;
    });

    room.scores[stage] = stageScores;
  });
}

function getStageMatches(roomSlug, userId, stageKey) {
  return getPredictionScoreBreakdown(roomSlug, userId, stageKey).exactMatches;
}

function buildPublicLeaderboardId(roomSlug, userId) {
  return crypto.createHash('sha256').update(`${roomSlug}:${userId}`).digest('hex').slice(0, 12);
}

function compareLeaderboardRows(a, b) {
  return b.points - a.points
    || b.exactMatchCount - a.exactMatchCount
    || b.closeMatchCount - a.closeMatchCount
    || a.totalDistance - b.totalDistance
    || a.name.localeCompare(b.name, 'ru');
}

function getRoomPredictionWindows(room) {
  return STAGE_KEYS.reduce((acc, stage) => {
    acc[stage] = Boolean(room.predictionWindows[stage]);
    return acc;
  }, {});
}

function isStageWindowOpen(roomSlug, stageKey) {
  const room = getRoomState(roomSlug);
  return Boolean(room.predictionWindows[stageKey]);
}

function getScoringProfilePayload() {
  return Object.values(SCORING_PROFILES).map((profile) => ({
    key: profile.key,
    label: profile.label,
    description: profile.description,
  }));
}

function buildRoomParticipantSnapshot(roomSlug, accountId) {
  const room = getRoomState(roomSlug);
  const roomUser = room.users[accountId];
  const account = getAccountById(accountId);
  const firstName = roomUser?.firstName || account?.firstName || '';
  const lastName = roomUser?.lastName || account?.lastName || '';
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()
    || roomUser?.name
    || account?.displayName
    || (account ? buildPublicName(account) : '')
    || `Viewer #${String(accountId || '').slice(0, 4).toUpperCase()}`;

  return {
    accountId,
    firstName,
    lastName,
    name,
    emoji: roomUser?.emoji || account?.emoji || 'EU',
    avatarUrl: roomUser?.avatarUrl || account?.avatarUrl || null,
    avatarTheme: roomUser?.avatarTheme || (account ? getAvatarTheme(account.id, name) : null),
    removed: Boolean(room.removedAccounts[accountId]),
    submittedStages: STAGE_KEYS.filter((stage) => Boolean(room.predictions[stage][accountId])),
    lockedStages: STAGE_KEYS.filter((stage) => Boolean(room.locks[stage][accountId])),
  };
}

function buildInternalLeaderboardRows(roomSlug, stageKey = null) {
  const room = getRoomState(roomSlug);

  return Object.values(room.users)
    .map((user) => {
      const stageBreakdowns = STAGE_KEYS.reduce((acc, stage) => {
        acc[stage] = getPredictionScoreBreakdown(roomSlug, user.id, stage);
        return acc;
      }, {});
      const stages = STAGE_KEYS.reduce((acc, stage) => {
        acc[stage] = {
          points: stageBreakdowns[stage].points,
          locked: Boolean(room.locks[stage][user.id]),
          submitted: Boolean(room.predictions[stage][user.id]),
          exactMatches: stageBreakdowns[stage].exactMatches,
        };
        return acc;
      }, {});

      const points = stageKey
        ? stageBreakdowns[stageKey].points
        : STAGE_KEYS.reduce((sum, stage) => sum + stageBreakdowns[stage].points, 0);
      const exactMatchCount = stageKey
        ? stageBreakdowns[stageKey].exactMatches.length
        : STAGE_KEYS.reduce((sum, stage) => sum + stageBreakdowns[stage].exactMatches.length, 0);
      const closeMatchCount = stageKey
        ? stageBreakdowns[stageKey].closeMatches
        : STAGE_KEYS.reduce((sum, stage) => sum + stageBreakdowns[stage].closeMatches, 0);
      const totalDistance = stageKey
        ? stageBreakdowns[stageKey].totalDistance
        : STAGE_KEYS.reduce((sum, stage) => sum + stageBreakdowns[stage].totalDistance, 0);

      return {
        ...buildRoomParticipantSnapshot(roomSlug, user.id),
        id: user.id,
        stages,
        stageBreakdowns,
        points,
        exactMatchCount,
        closeMatchCount,
        totalDistance,
      };
    })
    .sort(compareLeaderboardRows)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

function buildAdminUserList(roomSlug) {
  const room = getRoomState(roomSlug);
  const ids = new Set([
    ...Object.keys(room.users),
    ...Object.keys(room.removedAccounts),
  ]);

  return [...ids]
    .map((accountId) => {
      const snapshot = buildRoomParticipantSnapshot(roomSlug, accountId);
      return {
        id: accountId,
        firstName: snapshot.firstName,
        lastName: snapshot.lastName,
        name: snapshot.name,
        emoji: snapshot.emoji,
        avatarUrl: snapshot.avatarUrl,
        avatarTheme: snapshot.avatarTheme,
        removed: snapshot.removed,
        submittedStages: snapshot.submittedStages,
        lockedStages: snapshot.lockedStages,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function buildAdminRoomSnapshot(roomSlug) {
  const room = getRoomState(roomSlug);
  return {
    roomSlug,
    predictionWindows: getRoomPredictionWindows(room),
    scoringProfile: getScoringProfile(room.scoringProfile).key,
    scoringProfiles: getScoringProfilePayload(),
    participants: {
      activeCount: Object.keys(room.users).length,
      removedCount: Object.keys(room.removedAccounts).length,
    },
    stageOverview: STAGE_KEYS.reduce((acc, stage) => {
      acc[stage] = {
        submittedCount: Object.keys(room.predictions[stage]).length,
        lockedCount: Object.keys(room.locks[stage]).length,
        revealedCount: room.results[stage].length,
        ...getStageLineupMeta(stage),
      };
      return acc;
    }, {}),
  };
}

function buildLeaderboard(roomSlug, stageKey = null) {
  const rows = buildInternalLeaderboardRows(roomSlug, stageKey);

  return rows.map((row) => ({
    id: buildPublicLeaderboardId(roomSlug, row.id),
    emoji: row.emoji,
    name: row.name,
    avatarUrl: row.avatarUrl,
    avatarTheme: row.avatarTheme,
    points: row.points,
    matches: stageKey
      ? row.stageBreakdowns[stageKey].exactMatches
      : STAGE_KEYS.flatMap((stage) =>
        row.stageBreakdowns[stage].exactMatches.map((countryCode) => `${stage}:${countryCode}`),
      ),
    stages: row.stages,
    exactMatchCount: row.exactMatchCount,
    closeMatchCount: row.closeMatchCount,
    totalDistance: row.totalDistance,
    rank: row.rank,
  }));
}

function buildSeasonStats(roomSlug) {
  const roomMeta = getRoomBySlug(roomSlug);
  const room = getRoomState(roomSlug);
  const leaderboard = buildInternalLeaderboardRows(roomSlug);
  const completedStages = STAGE_KEYS.filter((stage) => room.results[stage].length > 0);

  const players = leaderboard.map((row) => {
    const stages = STAGE_KEYS.reduce((acc, stage) => {
      const breakdown = row.stageBreakdowns[stage];
      acc[stage] = {
        stage,
        points: breakdown.points,
        exactMatchCount: breakdown.exactMatches.length,
        closeMatchCount: breakdown.closeMatches,
        totalDistance: breakdown.totalDistance,
        comparedEntries: breakdown.comparedEntries,
        submitted: row.stages[stage].submitted,
        locked: row.stages[stage].locked,
        revealedResults: room.results[stage].length,
      };
      return acc;
    }, {});

    const submittedStages = STAGE_KEYS.filter((stage) => stages[stage].submitted).length;
    const lockedStages = STAGE_KEYS.filter((stage) => stages[stage].locked).length;
    const comparedEntries = STAGE_KEYS.reduce((sum, stage) => sum + stages[stage].comparedEntries, 0);
    const bestStage = [...STAGE_KEYS]
      .sort((a, b) => stages[b].points - stages[a].points || stages[b].exactMatchCount - stages[a].exactMatchCount)[0] || null;

    return {
      id: buildPublicLeaderboardId(roomSlug, row.id),
      rank: row.rank,
      name: row.name,
      emoji: row.emoji,
      avatarUrl: row.avatarUrl,
      avatarTheme: row.avatarTheme,
      totalPoints: row.points,
      exactMatchCount: row.exactMatchCount,
      closeMatchCount: row.closeMatchCount,
      averageDistance: comparedEntries ? Number((row.totalDistance / comparedEntries).toFixed(2)) : null,
      submittedStages,
      lockedStages,
      bestStage,
      stages,
    };
  });

  return {
    roomSlug,
    roomName: roomMeta?.name || roomSlug,
    seasonYear: roomMeta?.seasonYear || null,
    seasonLabel: roomMeta?.seasonLabel || (roomMeta?.seasonYear ? `Season ${roomMeta.seasonYear}` : 'Current season'),
    scoringProfile: getScoringProfile(room.scoringProfile).key,
    overview: {
      participants: players.length,
      completedStages: completedStages.length,
      revealedResults: STAGE_KEYS.reduce((sum, stage) => sum + room.results[stage].length, 0),
      leaderName: players[0]?.name || null,
      leaderPoints: players[0]?.totalPoints || 0,
    },
    players,
  };
}

function buildStageResults(roomSlug, stageKey) {
  const room = getRoomState(roomSlug);
  const ranking = room.results[stageKey];

  return ACTS_BY_STAGE[stageKey]
    .map((act) => {
      const resultIndex = ranking.indexOf(act.code);
      const breakdown = room.resultBreakdown[stageKey][act.code] || null;
      return {
        ...act,
        rank: resultIndex === -1 ? null : resultIndex + 1,
        revealed: resultIndex !== -1,
        juryPoints: breakdown ? breakdown.jury : null,
        telePoints: breakdown ? breakdown.tele : null,
        totalPoints: breakdown ? breakdown.total : null,
      };
    })
    .sort((a, b) => {
      if (a.rank == null && b.rank == null) return (a.runningOrder ?? a.seedOrder) - (b.runningOrder ?? b.seedOrder);
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank;
    });
}

function emitLeaderboard(roomSlug) {
  io.to(roomSlug).emit('leaderboardUpdate', buildLeaderboard(roomSlug));
}

function emitResults(roomSlug, stageKey) {
  io.to(roomSlug).emit('resultsUpdate', {
    roomSlug,
    stage: stageKey,
    results: buildStageResults(roomSlug, stageKey),
  });
}

function emitRoomState(roomSlug) {
  const room = getRoomState(roomSlug);
  io.to(roomSlug).emit('toggle', {
    roomSlug,
    predictionWindows: getRoomPredictionWindows(room),
  });
  emitLeaderboard(roomSlug);
  STAGE_KEYS.forEach((stage) => emitResults(roomSlug, stage));
}

function getAuthenticatedRequest(req) {
  const session = getSessionFromRequest(state, req);
  if (!session) {
    return null;
  }

  const account = getAccountById(session.accountId);
  if (!account) {
    invalidateSession(state, session.rawToken);
    persistState();
    return null;
  }

  return {
    session,
    account,
  };
}

function requireAuth(req, res, next) {
  const auth = getAuthenticatedRequest(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.account = auth.account;
  req.session = auth.session;
  return next();
}

function requireAdmin(req, res, next) {
  if (ADMIN_KEY && req.headers['x-admin'] === ADMIN_KEY) {
    req.adminAuthenticated = true;
    return next();
  }

  const adminSession = getAdminSessionFromRequest(req);
  if (!adminSession) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  req.adminAuthenticated = true;
  req.adminSession = adminSession;
  return next();
}

io.on('connection', (socket) => {
  const roomSlug = normalizeRoomSlug(socket.handshake.auth?.roomSlug || socket.handshake.query?.roomSlug);
  if (!roomSlug) {
    socket.disconnect(true);
    return;
  }

  socket.join(roomSlug);

  const room = getRoomState(roomSlug);
  socket.emit('toggle', {
    roomSlug,
    predictionWindows: getRoomPredictionWindows(room),
  });
  socket.emit('leaderboardUpdate', buildLeaderboard(roomSlug));
  STAGE_KEYS.forEach((stage) => {
    socket.emit('resultsUpdate', {
      roomSlug,
      stage,
      results: buildStageResults(roomSlug, stage),
    });
  });
});

app.get('/api/compliance', (req, res) => {
  return res.json({
    policyVersion: POLICY_VERSION,
    cookieMode: 'necessary_only',
    notices: {
      privacy: '/legal/privacy',
      cookies: '/legal/cookies',
    },
  });
});

app.get('/api/auth/session', (req, res) => {
  const auth = getAuthenticatedRequest(req);
  return res.json({
    policyVersion: POLICY_VERSION,
    passwordResetMode: getPasswordResetMode(),
    account: auth ? toAccountProfile(auth.account) : null,
  });
});

app.get('/api/admin/session', (req, res) => {
  const adminSession = getAdminSessionFromRequest(req);
  return res.json({
    authenticated: Boolean(adminSession),
    rooms: ROOMS,
    authMethods: getAdminAuthMethods(),
    scoringProfiles: getScoringProfilePayload(),
  });
});

app.post('/api/admin/session', (req, res) => {
  const key = String(req.body.key || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  const validByKey = Boolean(ADMIN_KEY && key && key === ADMIN_KEY);
  const validByCredentials = isAdminCredentialLoginValid(email, password);

  if (!validByKey && !validByCredentials) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = createAdminSession();
  setAdminSessionCookie(res, token);
  persistState();

  return res.json({
    authenticated: true,
    rooms: ROOMS,
    authMethods: getAdminAuthMethods(),
    scoringProfiles: getScoringProfilePayload(),
  });
});

app.post('/api/admin/logout', (req, res) => {
  const adminSession = getAdminSessionFromRequest(req);
  if (adminSession) {
    invalidateAdminSession(adminSession.rawToken);
    persistState();
  }
  clearAdminSessionCookie(res);
  return res.json({ ok: true });
});

app.post('/api/auth/register', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const firstName = sanitizeText(req.body.firstName, 64);
  const lastName = sanitizeText(req.body.lastName, 64);
  const roomSlug = normalizeRoomSlug(req.body.roomSlug);

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'Enter both first and last name' });
  }
  if (req.body.privacyAccepted !== true) {
    return res.status(400).json({ error: 'Privacy policy consent is required' });
  }
  if (req.body.roomSlug && !roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }
  if (getAccountByEmail(email)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const account = buildAccountRecord({
    email,
    password,
    firstName,
    lastName,
    displayName: sanitizeText(req.body.displayName, 64),
    emoji: sanitizeText(req.body.emoji, 16),
    publicDisplayMode: sanitizeDisplayMode(req.body.publicDisplayMode),
    publicDisplayOptIn: req.body.publicDisplayOptIn !== false,
  });

  state.accounts[account.id] = account;
  state.emailToAccountId[email] = account.id;

  if (roomSlug) {
    const membership = ensureRoomMembership(roomSlug, account);
    if (membership.blocked) {
      return res.status(403).json({ error: 'This account is not allowed to join the selected room right now' });
    }
  }

  const token = createSession(state, account.id);
  setSessionCookie(res, token);
  persistState();

  return res.status(201).json({
    account: toAccountProfile(account),
    roomSlug,
  });
});

app.post('/api/auth/login', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const roomSlug = normalizeRoomSlug(req.body.roomSlug);
  const account = getAccountByEmail(email);

  if (!account || !verifyPassword(account, password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (req.body.roomSlug && !roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  account.lastLoginAt = new Date().toISOString();
  account.updatedAt = account.lastLoginAt;

  if (roomSlug) {
    const membership = ensureRoomMembership(roomSlug, account);
    if (membership.blocked) {
      return res.status(403).json({ error: 'This account is not allowed to join the selected room right now' });
    }
  }

  const token = createSession(state, account.id);
  setSessionCookie(res, token);
  persistState();

  return res.json({
    account: toAccountProfile(account),
    roomSlug,
  });
});

app.post('/api/auth/logout', (req, res) => {
  const auth = getAuthenticatedRequest(req);
  if (auth) {
    invalidateSession(state, auth.session.rawToken);
    persistState();
  }
  clearSessionCookie(res);
  return res.json({ ok: true });
});

app.post('/api/auth/request-reset', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const passwordResetMode = getPasswordResetMode();
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  if (passwordResetMode === 'disabled') {
    return res.status(503).json({
      error: 'Password recovery email is not configured on this deployment yet',
    });
  }

  const account = getAccountByEmail(email);

  if (!account) {
    return res.json({
      ok: true,
      deliveryMode: passwordResetMode,
      message: passwordResetMode === 'email'
        ? 'If the account exists, a reset email has been sent.'
        : 'If the account exists, a reset link has been prepared in preview mode.',
    });
  }

  const token = issuePasswordReset(state, account.id);
  persistState();

  const resetUrl = `${APP_PUBLIC_URL}/account?mode=reset&token=${encodeURIComponent(token)}`;

  if (passwordResetMode === 'email') {
    sendPasswordResetEmail(email, resetUrl)
      .then(() => res.json({
        ok: true,
        deliveryMode: 'email',
        message: 'If the account exists, a reset email has been sent.',
      }))
      .catch((error) => {
        console.error('Failed to send password reset email', error);
        res.status(502).json({ error: 'Password reset email could not be sent' });
      });
    return;
  }

  console.log(`Password reset requested for ${email}: ${resetUrl}`);

  return res.json({
    ok: true,
    deliveryMode: 'preview',
    message: 'Local reset link preview generated.',
    previewResetToken: token,
    previewResetUrl: resetUrl,
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const token = sanitizeText(req.body.token, 256);
  const password = String(req.body.password || '');

  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const reset = consumePasswordReset(state, token);
  if (!reset) {
    return res.status(400).json({ error: 'Reset token is invalid or expired' });
  }

  const account = getAccountById(reset.accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const nextPassword = hashPassword(password);
  account.passwordSalt = nextPassword.salt;
  account.passwordHash = nextPassword.hash;
  account.updatedAt = new Date().toISOString();
  Object.entries(state.sessions).forEach(([key, session]) => {
    if (session.accountId === account.id) {
      delete state.sessions[key];
    }
  });

  const sessionToken = createSession(state, account.id);
  setSessionCookie(res, sessionToken);
  persistState();

  return res.json({ ok: true, account: toAccountProfile(account) });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const nextPassword = String(req.body.nextPassword || '');

  if (!verifyPassword(req.account, currentPassword)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (!validatePassword(nextPassword)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const nextHash = hashPassword(nextPassword);
  req.account.passwordSalt = nextHash.salt;
  req.account.passwordHash = nextHash.hash;
  req.account.updatedAt = new Date().toISOString();
  persistState();

  return res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  return res.json({ account: toAccountProfile(req.account) });
});

app.patch('/api/account', requireAuth, (req, res) => {
  const firstName = sanitizeText(req.body.firstName, 64);
  const lastName = sanitizeText(req.body.lastName, 64);

  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'Enter both first and last name' });
  }

  req.account.firstName = firstName;
  req.account.lastName = lastName;
  req.account.displayName = sanitizeText(req.body.displayName, 64);
  req.account.emoji = sanitizeText(req.body.emoji, 16) || req.account.emoji || 'EU';
  req.account.publicDisplayMode = sanitizeDisplayMode(req.body.publicDisplayMode);
  req.account.publicDisplayOptIn = req.body.publicDisplayOptIn !== false;
  if (req.account.publicDisplayOptIn && !req.account.consents.publicDisplayAcceptedAt) {
    req.account.consents.publicDisplayAcceptedAt = new Date().toISOString();
  }
  req.account.updatedAt = new Date().toISOString();

  syncAccountAcrossRooms(req.account);
  persistState();
  ROOMS.forEach((room) => emitLeaderboard(room.slug));

  return res.json({ account: toAccountProfile(req.account) });
});

app.post('/api/account/avatar', requireAuth, (req, res) => {
  const upload = writeAvatarImage(req.account.id, req.body.imageDataUrl);
  if (!upload.ok) {
    return res.status(400).json({ error: upload.error });
  }

  if (req.account.avatarUrl && req.account.avatarUrl !== upload.publicUrl) {
    deleteAvatarImage(req.account.avatarUrl);
  }

  req.account.avatarUrl = upload.publicUrl;
  req.account.updatedAt = new Date().toISOString();
  syncAccountAcrossRooms(req.account);
  persistState();
  ROOMS.forEach((room) => emitLeaderboard(room.slug));

  return res.json({ account: toAccountProfile(req.account) });
});

app.delete('/api/account/avatar', requireAuth, (req, res) => {
  deleteAvatarImage(req.account.avatarUrl);
  req.account.avatarUrl = null;
  req.account.updatedAt = new Date().toISOString();
  syncAccountAcrossRooms(req.account);
  persistState();
  ROOMS.forEach((room) => emitLeaderboard(room.slug));

  return res.json({ account: toAccountProfile(req.account) });
});

app.delete('/api/account', requireAuth, (req, res) => {
  const accountId = req.account.id;
  const email = req.account.email;

  deleteAvatarImage(req.account.avatarUrl);
  delete state.accounts[accountId];
  delete state.emailToAccountId[email];
  Object.entries(state.sessions).forEach(([key, session]) => {
    if (session.accountId === accountId) {
      delete state.sessions[key];
    }
  });
  Object.entries(state.passwordResets).forEach(([key, reset]) => {
    if (reset.accountId === accountId) {
      delete state.passwordResets[key];
    }
  });
  removeAccountEverywhere(accountId);
  persistState();
  ROOMS.forEach((room) => emitRoomState(room.slug));
  clearSessionCookie(res);

  return res.json({ ok: true });
});

app.post('/api/rooms/:roomSlug/join', requireAuth, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.params.roomSlug);
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  const membership = ensureRoomMembership(roomSlug, req.account);
  if (membership.blocked) {
    return res.status(403).json({ error: 'You have been removed from this room by the host' });
  }
  if (membership.changed) {
    persistState();
    emitLeaderboard(roomSlug);
  }

  return res.json({
    ok: true,
    roomSlug,
    user: buildRoomUserFromAccount(req.account),
  });
});

app.get('/api/rooms', (req, res) => {
  return res.json({
    defaultRoom: DEFAULT_ROOM_SLUG,
    rooms: ROOMS,
  });
});

app.get('/api/room/:roomSlug', (req, res) => {
  const roomSlug = normalizeRoomSlug(req.params.roomSlug);
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  const room = getRoomBySlug(roomSlug);
  const stateForRoom = getRoomState(roomSlug);

  return res.json({
    ...room,
    predictionWindows: getRoomPredictionWindows(stateForRoom),
    stages: STAGE_KEYS,
    stageMeta: STAGE_KEYS.reduce((acc, stage) => {
      acc[stage] = getStageLineupMeta(stage);
      return acc;
    }, {}),
    defaultStage: room.defaultStage || DEFAULT_STAGE,
    scoringProfile: getScoringProfile(stateForRoom.scoringProfile).key,
    scoringProfiles: getScoringProfilePayload(),
  });
});

app.get('/api/status', (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room);
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  const room = getRoomState(roomSlug);
  return res.json({
    roomSlug,
    predictionWindows: getRoomPredictionWindows(room),
    stages: STAGE_KEYS,
    stageMeta: STAGE_KEYS.reduce((acc, stage) => {
      acc[stage] = getStageLineupMeta(stage);
      return acc;
    }, {}),
    defaultStage: getRoomBySlug(roomSlug)?.defaultStage || DEFAULT_STAGE,
    scoringProfile: getScoringProfile(room.scoringProfile).key,
    scoringProfiles: getScoringProfilePayload(),
  });
});

app.get('/api/acts', (req, res) => {
  const stageKey = normalizeStage(req.query.stage);
  const roomSlug = normalizeRoomSlug(req.query.room);

  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }
  if (!stageKey) {
    return res.status(400).json({ error: 'Unknown stage' });
  }

  return res.json({
    roomSlug,
    stage: stageKey,
    stageLabel: STAGES[stageKey].label,
    ...getStageLineupMeta(stageKey),
    acts: ACTS_BY_STAGE[stageKey],
  });
});

app.get('/api/acts/:code', (req, res) => {
  const stageKey = normalizeStage(req.query.stage);
  if (!stageKey) {
    return res.status(400).json({ error: 'Unknown stage' });
  }

  const act = getAct(stageKey, sanitizeText(req.params.code, 8).toUpperCase());
  if (!act) {
    return res.sendStatus(404);
  }

  return res.json(act);
});

app.get('/api/results', (req, res) => {
  const stageKey = normalizeStage(req.query.stage);
  const roomSlug = normalizeRoomSlug(req.query.room);

  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }
  if (!stageKey) {
    return res.status(400).json({ error: 'Unknown stage' });
  }

  return res.json({
    roomSlug,
    stage: stageKey,
    scoringProfile: getScoringProfile(getRoomState(roomSlug).scoringProfile).key,
    results: buildStageResults(roomSlug, stageKey),
  });
});

app.post('/api/register', (req, res) => {
  return res.status(410).json({
    error: 'Legacy device registration is retired. Use account registration and room join instead.',
  });
});

app.get('/api/predictions/me', requireAuth, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room);
  const stageKey = normalizeStage(req.query.stage);

  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }
  if (!stageKey) {
    return res.status(400).json({ error: 'Unknown stage' });
  }

  if (isAccountRemovedFromRoom(roomSlug, req.account.id)) {
    return res.status(403).json({ error: 'You have been removed from this room by the host' });
  }

  const membership = ensureRoomMembership(roomSlug, req.account);
  if (membership.changed) {
    persistState();
    emitLeaderboard(roomSlug);
  }

  const room = getRoomState(roomSlug);
  return res.json({
    roomSlug,
    stage: stageKey,
    ranking: room.predictions[stageKey][req.account.id] || [],
    locked: Boolean(room.locks[stageKey][req.account.id]),
  });
});

app.post('/api/predictions/me', requireAuth, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.body.roomSlug);
  const stageKey = normalizeStage(req.body.stage);

  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }
  if (!stageKey) {
    return res.status(400).json({ error: 'Unknown stage' });
  }

  const room = getRoomState(roomSlug);
  const lineupMeta = getStageLineupMeta(stageKey);
  if (isAccountRemovedFromRoom(roomSlug, req.account.id)) {
    return res.status(403).json({ error: 'You have been removed from this room by the host' });
  }

  const membership = ensureRoomMembership(roomSlug, req.account);
  if (membership.changed) {
    persistState();
    emitLeaderboard(roomSlug);
  }

  if (!isStageWindowOpen(roomSlug, stageKey)) {
    return res.status(403).json({ error: 'Predictions are closed for this stage' });
  }

  if (!lineupMeta.lineupReady) {
    return res.status(409).json({ error: 'The lineup for this stage is not complete yet' });
  }

  const userId = req.account.id;
  if (room.locks[stageKey][userId]) {
    return res.status(409).json({ error: 'Prediction for this stage is already locked' });
  }

  const validation = validateRanking(stageKey, req.body.ranking, { allowPartial: false });
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  room.predictions[stageKey][userId] = validation.ranking;
  if (req.body.lock === true) {
    room.locks[stageKey][userId] = true;
  }

  recomputeScores(roomSlug);
  persistState();
  emitLeaderboard(roomSlug);

  return res.json({
    ok: true,
    roomSlug,
    stage: stageKey,
    locked: Boolean(room.locks[stageKey][userId]),
  });
});

app.get('/api/predictions/:userId', (req, res) => {
  return res.status(410).json({
    error: 'Public ballot lookup is retired. Use the authenticated /api/predictions/me endpoint.',
  });
});

app.post('/api/predictions', (req, res) => {
  return res.status(410).json({
    error: 'Public ballot submission is retired. Use the authenticated /api/predictions/me endpoint.',
  });
});

app.post('/api/results', requireAdmin, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.body.roomSlug);
  const stageKey = normalizeStage(req.body.stage);

  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }
  if (!stageKey) {
    return res.status(400).json({ error: 'Unknown stage' });
  }

  const room = getRoomState(roomSlug);
  const validation = validateRanking(stageKey, req.body.ranking || [], { allowPartial: true });
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }
  const breakdownValidation = validateResultBreakdown(stageKey, req.body.breakdown, validation.ranking);
  if (!breakdownValidation.ok) {
    return res.status(400).json({ error: breakdownValidation.error });
  }

  room.results[stageKey] = validation.ranking;
  room.resultBreakdown[stageKey] = breakdownValidation.breakdown;
  recomputeScores(roomSlug);
  persistState();
  emitLeaderboard(roomSlug);
  emitResults(roomSlug, stageKey);

  return res.json({
    ok: true,
    roomSlug,
    stage: stageKey,
    updated: room.results[stageKey].length,
  });
});

app.post('/api/toggle', requireAdmin, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.body.roomSlug || req.query.room);
  const stageKey = normalizeStage(req.body.stage || req.query.stage);
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }
  if (!stageKey) {
    return res.status(400).json({ error: 'Unknown stage' });
  }

  const room = getRoomState(roomSlug);
  const nextOpen = typeof req.body.open === 'boolean'
    ? req.body.open
    : !room.predictionWindows[stageKey];
  room.predictionWindows[stageKey] = nextOpen;
  persistState();
  io.to(roomSlug).emit('toggle', {
    roomSlug,
    stage: stageKey,
    open: nextOpen,
    predictionWindows: getRoomPredictionWindows(room),
  });

  return res.json({
    roomSlug,
    stage: stageKey,
    open: nextOpen,
    predictionWindows: getRoomPredictionWindows(room),
  });
});

app.post('/api/reset', requireAdmin, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.body.roomSlug || req.query.room);
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  roomStates[roomSlug] = normalizeRoomStateShape(createRoomState());
  state.roomStates[roomSlug] = roomStates[roomSlug];
  persistState();
  emitRoomState(roomSlug);

  return res.json({ ok: true, roomSlug });
});

app.get('/api/admin/room-state', requireAdmin, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room);
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  return res.json(buildAdminRoomSnapshot(roomSlug));
});

app.post('/api/admin/scoring', requireAdmin, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.body.roomSlug || req.query.room);
  const scoringProfile = getScoringProfile(req.body.scoringProfile).key;

  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  const room = getRoomState(roomSlug);
  room.scoringProfile = scoringProfile;
  recomputeScores(roomSlug);
  persistState();
  emitLeaderboard(roomSlug);

  return res.json({
    roomSlug,
    scoringProfile,
    scoringProfiles: getScoringProfilePayload(),
  });
});

app.get('/api/users', requireAdmin, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room);
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  return res.json(buildAdminUserList(roomSlug));
});

app.post('/api/users/:id/reset', requireAdmin, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room);
  const stageKey = req.body.stage ? normalizeStage(req.body.stage) : null;
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }
  if (req.body.stage && !stageKey) {
    return res.status(400).json({ error: 'Unknown stage' });
  }

  resetAccountInRoom(roomSlug, req.params.id, stageKey);
  recomputeScores(roomSlug);
  persistState();
  emitRoomState(roomSlug);
  return res.json({
    reset: req.params.id,
    roomSlug,
    stage: stageKey,
  });
});

app.post('/api/users/:id/restore', requireAdmin, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room);
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  restoreAccountToRoom(roomSlug, req.params.id);
  persistState();
  emitRoomState(roomSlug);
  return res.json({ restored: req.params.id, roomSlug });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room);
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  removeAccountFromRoom(roomSlug, req.params.id);
  persistState();
  emitRoomState(roomSlug);
  return res.json({ removed: req.params.id, roomSlug });
});

app.get('/api/leaderboard', (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room);
  const stageKey = req.query.stage ? normalizeStage(req.query.stage) : null;

  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }
  if (req.query.stage && !stageKey) {
    return res.status(400).json({ error: 'Unknown stage' });
  }

  return res.json(buildLeaderboard(roomSlug, stageKey));
});

app.get('/api/stats/season', (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room);
  if (!roomSlug) {
    return res.status(404).json({ error: 'Unknown room' });
  }

  return res.json(buildSeasonStats(roomSlug));
});

app.get(['/', '/index.html'], (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room, { allowDefault: true }) || DEFAULT_ROOM_SLUG;
  return res.redirect(`${APP_PUBLIC_URL}/${roomSlug}`);
});

app.get('/predict.html', (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room, { allowDefault: true }) || DEFAULT_ROOM_SLUG;
  const room = getRoomBySlug(roomSlug);
  const stageKey = normalizeStage(req.query.stage) || room?.defaultStage || DEFAULT_STAGE;
  return res.redirect(`${APP_PUBLIC_URL}/${roomSlug}/vote/${stageKey}`);
});

app.get('/leaderboard.html', (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room, { allowDefault: true }) || DEFAULT_ROOM_SLUG;
  const boardKey = req.query.stage ? normalizeStage(req.query.stage) || 'overall' : 'overall';
  return res.redirect(`${APP_PUBLIC_URL}/${roomSlug}/players/${boardKey}`);
});

app.get('/admin.html', (req, res) => {
  const roomSlug = normalizeRoomSlug(req.query.room, { allowDefault: true }) || DEFAULT_ROOM_SLUG;
  return res.redirect(`${APP_PUBLIC_URL}/admin?room=${roomSlug}`);
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, servedPath) => {
    if (/[\\/]public[\\/](?:media|uploads)[\\/]/.test(servedPath)) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  },
}));

server.listen(PORT, () => {
  console.log(`Eurovision backend is running on port ${PORT}`);
});
