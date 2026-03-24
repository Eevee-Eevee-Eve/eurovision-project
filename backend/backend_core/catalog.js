const path = require('path');
const { ARTIST_CONTENT } = require('./artist-content');
const OFFICIAL_PARTICIPANTS = require('./participants_2026.json');
const LOCAL_MEDIA_MANIFEST = require(path.join(__dirname, 'public', 'media', 'acts', '2026', 'manifest.json'));

const STAGES = Object.freeze({
  semi1: {
    key: 'semi1',
    label: 'Semi-final 1',
    shortLabel: 'SF1',
    description: 'The first qualification night.',
    expectedEntries: 15,
  },
  semi2: {
    key: 'semi2',
    label: 'Semi-final 2',
    shortLabel: 'SF2',
    description: 'The second qualification night.',
    expectedEntries: 15,
  },
  final: {
    key: 'final',
    label: 'Grand Final',
    shortLabel: 'Final',
    description: 'The full arena show with every finalist.',
    expectedEntries: 26,
  },
});

const STAGE_KEYS = Object.keys(STAGES);
const DEFAULT_STAGE = 'semi1';

const ROOMS = Object.freeze([
  {
    slug: 'neon-arena',
    name: 'Евровидение у Морозовых 2026',
    tagline: 'Евровидение у Морозовых 2026',
    cityLabel: 'Общий эфир из разных городов',
    seasonYear: 2026,
    seasonLabel: 'Евровидение у Морозовых 2026',
    defaultStage: 'semi1',
  },
]);

const DEFAULT_ROOM_SLUG = ROOMS[0].slug;
const OFFICIAL_PARTICIPANTS_BY_CODE = Object.fromEntries(
  OFFICIAL_PARTICIPANTS.map((entry) => [entry.code, entry]),
);
const LOCAL_MEDIA_BY_CODE = Object.fromEntries(
  LOCAL_MEDIA_MANIFEST.map((entry) => [entry.code, entry]),
);

const STAGE_FILES = Object.freeze({
  semi1: require(path.join(__dirname, 'public', 'countries_semi1.json')),
  semi2: require(path.join(__dirname, 'public', 'countries_semi2.json')),
  final: require(path.join(__dirname, 'public', 'countries_final.json')),
});

const POSTER_TONES = [
  ['#7f5cff', '#201d55'],
  ['#ff5db4', '#33173d'],
  ['#5cf2ff', '#16354a'],
  ['#ff9960', '#3e2031'],
  ['#9d7dff', '#1b1735'],
  ['#4df0c0', '#173942'],
];

function parseStageEntry(name) {
  const match = String(name).match(/^(.*?)\s+(?:—|–|-)\s+(.*?)\s+(?:«|")(.+?)(?:»|")$/);
  if (!match) {
    return {
      country: name,
      artist: name,
      song: 'Live entry',
    };
  }

  return {
    country: match[1],
    artist: match[2],
    song: match[3],
  };
}

function normalizeInlineText(value) {
  return String(value || '')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPoster(code, stageIndex) {
  const seed = (code.charCodeAt(0) + code.charCodeAt(1) + stageIndex) % POSTER_TONES.length;
  const [primary, secondary] = POSTER_TONES[seed];

  return {
    primary,
    secondary,
  };
}

function getFinalRouteLabel(code) {
  if (STAGE_FILES.semi1.some((entry) => entry.code === code)) {
    return 'Qualified through Semi-final 1';
  }
  if (STAGE_FILES.semi2.some((entry) => entry.code === code)) {
    return 'Qualified through Semi-final 2';
  }
  return 'Automatic finalist';
}

function getStageContext(stageKey, entryCode, countryName, content) {
  if (content?.contexts?.[stageKey]) {
    return content.contexts[stageKey];
  }

  if (stageKey === 'final') {
    return {
      label: 'Road to the final',
      value: getFinalRouteLabel(entryCode),
    };
  }

  return {
    label: 'Selection path',
    value: `National selection data can be enriched for ${countryName}.`,
  };
}

function buildActsForStage(stageKey) {
  return STAGE_FILES[stageKey].map((entry, index) => {
    const parsed = parseStageEntry(entry.name);
    const poster = getPoster(entry.code, index);
    const content = ARTIST_CONTENT[entry.code] || null;
    const officialParticipant = OFFICIAL_PARTICIPANTS_BY_CODE[entry.code] || null;
    const localMedia = LOCAL_MEDIA_BY_CODE[entry.code] || null;
    const country = normalizeInlineText(content?.country || parsed.country);
    const artist = normalizeInlineText(content?.artist || parsed.artist);
    const song = normalizeInlineText(content?.song || parsed.song);
    const context = getStageContext(stageKey, entry.code, country, content);
    const semiResult = Number.isFinite(Number(entry.semiResult))
      ? Number(entry.semiResult)
      : Number.isFinite(Number(content?.semiResult))
        ? Number(content.semiResult)
        : null;
    const semiResultLocalized = content?.semiResultLocalized || (semiResult
      ? {
          en: `Finished #${semiResult} in the semi-final`,
          ru: `Занял${semiResult === 1 ? "" : ""} #${semiResult} в полуфинале`,
        }
      : null);

    return {
      code: entry.code,
      stageKey,
      country,
      artist,
      song,
      runningOrder: typeof entry.runningOrder === 'number' ? entry.runningOrder : null,
      seedOrder: index + 1,
      flagUrl: localMedia?.localFlagUrl || `https://flagcdn.com/w160/${entry.code.toLowerCase()}.png`,
      photoUrl: localMedia?.localPhotoUrl || officialParticipant?.imageUrl || null,
      profileUrl: officialParticipant?.profileUrl || null,
      videoUrl: officialParticipant?.videoUrl || null,
      portrait: {
        type: 'poster',
        initials: artist
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase(),
        ...poster,
      },
      factsLocalized: content?.facts || null,
      facts: content?.facts?.en || [
        `Artist: ${artist}`,
        `Song: "${song}"`,
        `Stage: ${STAGES[stageKey].label}`,
      ],
      contextLocalized: context?.label?.en ? context : null,
      contextLabel: context?.label?.en || context.label,
      contextValue: context?.value?.en || context.value,
      blurbLocalized: content?.blurb || null,
      blurb: content?.blurb?.en || `${artist} represents ${country} with "${song}".`,
      semiResult,
      semiResultLocalized,
    };
  });
}

const ACTS_BY_STAGE = Object.freeze({
  semi1: buildActsForStage('semi1'),
  semi2: buildActsForStage('semi2'),
  final: buildActsForStage('final'),
});

function getStageLineupMeta(stageKey) {
  const expectedEntries = STAGES[stageKey].expectedEntries;
  const currentEntries = ACTS_BY_STAGE[stageKey].length;

  return {
    expectedEntries,
    currentEntries,
    lineupReady: currentEntries === expectedEntries,
  };
}

function getRoomBySlug(roomSlug) {
  return ROOMS.find((room) => room.slug === roomSlug) || null;
}

function getAct(stageKey, code) {
  return ACTS_BY_STAGE[stageKey].find((act) => act.code === code) || null;
}

module.exports = {
  ACTS_BY_STAGE,
  DEFAULT_ROOM_SLUG,
  DEFAULT_STAGE,
  ROOMS,
  STAGES,
  STAGE_KEYS,
  getAct,
  getRoomBySlug,
  getStageLineupMeta,
};
