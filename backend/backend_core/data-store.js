const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'app-state.json');
const AVATAR_DIR = path.join(__dirname, 'public', 'uploads', 'avatars');

const SESSION_COOKIE_NAME = 'esc_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 20;
const POLICY_VERSION = '2026-03-21';
const AVATAR_MAX_BYTES = 1024 * 1024;

const AVATAR_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

function createEmptyState(createRoomState, rooms) {
  return {
    accounts: {},
    emailToAccountId: {},
    sessions: {},
    adminSessions: {},
    passwordResets: {},
    dynamicRooms: {},
    roomAccessSessions: {},
    roomStates: rooms.reduce((acc, room) => {
      acc[room.slug] = createRoomState();
      return acc;
    }, {}),
  };
}

function loadState(createRoomState, rooms) {
  ensureStorage();
  const fallback = createEmptyState(createRoomState, rooms);

  if (!fs.existsSync(STATE_FILE)) {
    return fallback;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const dynamicRooms = raw.dynamicRooms && typeof raw.dynamicRooms === 'object' ? raw.dynamicRooms : {};
    const roomStates = rooms.reduce((acc, room) => {
      acc[room.slug] = raw.roomStates?.[room.slug] || createRoomState();
      return acc;
    }, {});
    Object.keys(dynamicRooms).forEach((roomSlug) => {
      roomStates[roomSlug] = raw.roomStates?.[roomSlug] || createRoomState();
    });

    return {
      accounts: raw.accounts || {},
      emailToAccountId: raw.emailToAccountId || {},
      sessions: raw.sessions || {},
      adminSessions: raw.adminSessions || {},
      passwordResets: raw.passwordResets || {},
      dynamicRooms,
      roomAccessSessions: raw.roomAccessSessions || {},
      roomStates,
    };
  } catch (error) {
    console.error('Failed to load persisted state, starting fresh.', error);
    return fallback;
  }
}

function saveState(state) {
  ensureStorage();
  const tempFile = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tempFile, STATE_FILE);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizeText(value, maxLength = 80) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

function sanitizeDisplayMode(value) {
  return ['full_name', 'first_name_last_initial', 'display_name'].includes(value)
    ? value
    : 'full_name';
}

function getAvatarInitials(label) {
  return sanitizeText(label, 48)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'NA';
}

const AVATAR_TONES = [
  ['#ff6ca8', '#7f5cff'],
  ['#5cf2ff', '#1760a5'],
  ['#ffd36c', '#ff7a59'],
  ['#8ef0b1', '#0f7c73'],
  ['#f28cff', '#5117a5'],
  ['#80a8ff', '#243d7d'],
];

function getAvatarTheme(seed, label) {
  const source = `${seed}:${label}`;
  let score = 0;
  for (const char of source) {
    score += char.charCodeAt(0);
  }
  const [primary, secondary] = AVATAR_TONES[score % AVATAR_TONES.length];

  return {
    primary,
    secondary,
    initials: getAvatarInitials(label),
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(account, password) {
  if (!account?.passwordSalt || !account?.passwordHash) {
    return false;
  }
  const { hash } = hashPassword(password, account.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(account.passwordHash, 'hex'));
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createSession(state, accountId) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  state.sessions[tokenHash] = {
    accountId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  return rawToken;
}

function parseCookies(header) {
  return String(header || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [name, ...rest] = pair.split('=');
      acc[name] = decodeURIComponent(rest.join('='));
      return acc;
    }, {});
}

function getSessionFromRequest(state, req) {
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const session = state.sessions[tokenHash];
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    delete state.sessions[tokenHash];
    return null;
  }

  return {
    rawToken,
    tokenHash,
    ...session,
  };
}

function invalidateSession(state, rawToken) {
  if (!rawToken) return;
  delete state.sessions[hashToken(rawToken)];
}

function issuePasswordReset(state, accountId) {
  const rawToken = crypto.randomBytes(24).toString('base64url');
  const tokenHash = hashToken(rawToken);
  state.passwordResets[tokenHash] = {
    accountId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
  };
  return rawToken;
}

function consumePasswordReset(state, rawToken) {
  const tokenHash = hashToken(rawToken);
  const reset = state.passwordResets[tokenHash];
  if (!reset) {
    return null;
  }

  delete state.passwordResets[tokenHash];

  if (new Date(reset.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return reset;
}

function pruneExpiredState(state) {
  const now = Date.now();
  Object.entries(state.sessions).forEach(([key, session]) => {
    if (new Date(session.expiresAt).getTime() <= now) {
      delete state.sessions[key];
    }
  });
  Object.entries(state.passwordResets).forEach(([key, reset]) => {
    if (new Date(reset.expiresAt).getTime() <= now) {
      delete state.passwordResets[key];
    }
  });
  Object.entries(state.roomAccessSessions || {}).forEach(([key, session]) => {
    if (!session?.expiresAt || new Date(session.expiresAt).getTime() <= now) {
      delete state.roomAccessSessions[key];
    }
  });
}

function writeAvatarImage(accountId, dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) {
    return { ok: false, error: 'Unsupported image format' };
  }

  const [, mimeType, base64Payload] = match;
  const buffer = Buffer.from(base64Payload, 'base64');

  if (!buffer.length || buffer.length > AVATAR_MAX_BYTES) {
    return { ok: false, error: 'Avatar image is too large' };
  }

  ensureStorage();
  const extension = AVATAR_EXTENSIONS[mimeType];
  const fileName = `${accountId}.${extension}`;
  const absolutePath = path.join(AVATAR_DIR, fileName);
  fs.writeFileSync(absolutePath, buffer);

  return {
    ok: true,
    publicUrl: `/uploads/avatars/${fileName}`,
  };
}

function deleteAvatarImage(avatarUrl) {
  if (!avatarUrl) return;
  const fileName = path.basename(String(avatarUrl));
  const absolutePath = path.join(AVATAR_DIR, fileName);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

function buildPublicName(account) {
  const firstName = sanitizeText(account.firstName, 64);
  const lastName = sanitizeText(account.lastName, 64);
  const displayName = sanitizeText(account.displayName, 64);

  if (account.publicDisplayOptIn === false) {
    return `Viewer #${account.id.slice(0, 4).toUpperCase()}`;
  }

  if (account.publicDisplayMode === 'display_name' && displayName) {
    return displayName;
  }

  if (account.publicDisplayMode === 'first_name_last_initial') {
    const initial = lastName ? `${lastName[0].toUpperCase()}.` : '';
    return [firstName, initial].filter(Boolean).join(' ').trim();
  }

  return [firstName, lastName].filter(Boolean).join(' ').trim() || displayName || `Viewer #${account.id.slice(0, 4).toUpperCase()}`;
}

function buildAccountRecord(payload) {
  const email = normalizeEmail(payload.email);
  const firstName = sanitizeText(payload.firstName, 64);
  const lastName = sanitizeText(payload.lastName, 64);
  const displayName = sanitizeText(payload.displayName, 64);
  const emoji = sanitizeText(payload.emoji, 16) || 'EU';
  const publicDisplayMode = sanitizeDisplayMode(payload.publicDisplayMode);
  const { salt, hash } = hashPassword(payload.password);
  const now = new Date().toISOString();
  const account = {
    id: uuidv4(),
    email,
    passwordSalt: salt,
    passwordHash: hash,
    firstName,
    lastName,
    displayName,
    emoji,
    avatarUrl: null,
    publicDisplayMode,
    publicDisplayOptIn: Boolean(payload.publicDisplayOptIn),
    consents: {
      policyVersion: POLICY_VERSION,
      privacyAcceptedAt: now,
      publicDisplayAcceptedAt: payload.publicDisplayOptIn ? now : null,
    },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  return account;
}

function toAccountProfile(account) {
  const label = buildPublicName(account);
  return {
    id: account.id,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    displayName: account.displayName,
    publicName: label,
    emoji: account.emoji,
    avatarUrl: account.avatarUrl || null,
    avatarTheme: getAvatarTheme(account.id, label),
    publicDisplayMode: account.publicDisplayMode,
    publicDisplayOptIn: account.publicDisplayOptIn,
    consents: account.consents,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    lastLoginAt: account.lastLoginAt,
  };
}

module.exports = {
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
};
