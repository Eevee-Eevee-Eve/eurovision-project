const DRAW_LABEL = { en: 'Draw result', ru: 'Жеребьёвка' };
const FINAL_ROUTE_LABEL = { en: 'Path to the final', ru: 'Путь в финал' };

const STAGE_LABELS = {
  semi1: { en: 'Semi-final 1', ru: '1-й полуфинал' },
  semi2: { en: 'Semi-final 2', ru: '2-й полуфинал' },
  final: { en: 'Grand Final', ru: 'Финал' },
};

const STAGE_GENITIVE_LABELS = {
  semi1: { ru: '1-го полуфинала' },
  semi2: { ru: '2-го полуфинала' },
  final: { ru: 'финала' },
};

const STAGE_PREPOSITIONAL_LABELS = {
  semi1: { ru: '1-м полуфинале' },
  semi2: { ru: '2-м полуфинале' },
  final: { ru: 'финале' },
};

const HALF_LABELS = {
  first: { en: 'First half', ru: 'Первая половина' },
  second: { en: 'Second half', ru: 'Вторая половина' },
};

const HALF_LOCATIVE_LABELS = {
  first: { ru: 'первой половине' },
  second: { ru: 'второй половине' },
};

const COUNTRY_NAMES_RU = {
  AL: 'Албанию',
  AM: 'Армению',
  AT: 'Австрию',
  AU: 'Австралию',
  AZ: 'Азербайджан',
  BE: 'Бельгию',
  BG: 'Болгарию',
  CH: 'Швейцарию',
  CY: 'Кипр',
  CZ: 'Чехию',
  DE: 'Германию',
  DK: 'Данию',
  EE: 'Эстонию',
  FI: 'Финляндию',
  FR: 'Францию',
  GB: 'Великобританию',
  GE: 'Грузию',
  GR: 'Грецию',
  HR: 'Хорватию',
  IL: 'Израиль',
  IT: 'Италию',
  LT: 'Литву',
  LU: 'Люксембург',
  LV: 'Латвию',
  MD: 'Молдову',
  ME: 'Черногорию',
  MT: 'Мальту',
  NO: 'Норвегию',
  PL: 'Польшу',
  PT: 'Португалию',
  RO: 'Румынию',
  RS: 'Сербию',
  SE: 'Швецию',
  SM: 'Сан-Марино',
  UA: 'Украину',
};

const PROFILE_DETAILS = {
  AL: {
    en: 'Before Vienna 2026, Alis had already built an impressive profile on the Albanian scene.',
    ru: 'К 2026 году Alis уже успела собрать заметный профиль на албанской сцене.',
  },
  AM: {
    en: 'The Armenian entry arrives through broadcaster ARMTV.',
    ru: 'Армению в этом сезоне выбрал для конкурса вещатель ARMTV.',
  },
  AT: {
    en: 'Born in Hungary, COSMÓ grew up in Burgenland and now lives in Vienna.',
    ru: 'COSMÓ родился в Венгрии, вырос в Бургенланде и сейчас живёт в Вене.',
  },
  AU: {
    en: 'Beyond music, Delta Goodrem is also known as an actress, philanthropist, and entrepreneur.',
    ru: 'Помимо музыки, Delta Goodrem известна как актриса, филантроп и предприниматель.',
  },
  AZ: {
    en: 'JIVA performs under the name of Jamila Hashimova and is known for emotionally direct live vocals.',
    ru: 'JIVA — сценическое имя Jamila Hashimova, известной очень эмоциональной живой подачей.',
  },
  BE: {
    en: 'ESSYLA first gained broad attention after reaching the final of The Voice Belgique.',
    ru: 'Широкая аудитория узнала ESSYLA после выхода в финал The Voice Belgique.',
  },
  BG: {
    en: 'DARA is known for genre-blending pop and a commanding stage presence.',
    ru: 'DARA известна смелым смешением жанров и очень уверенной сценической подачей.',
  },
  CH: {
    en: 'Raised in Thun, Veronica Fusaro blends pop, soul, and rock with a confident live presence.',
    ru: 'Veronica Fusaro выросла в Туне и соединяет поп, соул и рок с сильным живым выступлением.',
  },
  CY: {
    en: 'Antigoni grew up in North London and writes from a Greek-Cypriot background.',
    ru: 'Antigoni выросла в Северном Лондоне и пишет музыку, опираясь на греко-кипрские корни.',
  },
  CZ: {
    en: 'Daniel Zizka is only 23 and is already seen as one of Czech music’s compelling young voices.',
    ru: 'Daniel Zizka всего 23 года, но его уже считают одним из самых ярких молодых голосов Чехии.',
  },
  DE: {
    en: 'Sarah Engels first became nationally known through Deutschland sucht den Superstar in 2011.',
    ru: 'Sarah Engels впервые стала известна на всю страну после участия в Deutschland sucht den Superstar в 2011 году.',
  },
  DK: {
    en: 'Søren Torpegaard Lund discovered musical theatre early while growing up in Gudme.',
    ru: 'Søren Torpegaard Lund ещё в детстве, когда жил в Гудме, понял, что его тянет к музыкальному театру.',
  },
  EE: {
    en: 'Vanilla Ninja reunites Lenna Kuurmaa, Piret Järvis-Milder, and Kerli Kivilaan.',
    ru: 'Vanilla Ninja снова объединяет Lenna Kuurmaa, Piret Järvis-Milder и Kerli Kivilaan.',
  },
  FI: {
    en: 'The duo unites popstar Pete Parkkonen with internationally acclaimed violinist Linda Lampenius.',
    ru: 'Этот дуэт объединяет поп-артиста Pete Parkkonen и всемирно известную скрипачку Linda Lampenius.',
  },
  FR: {
    en: 'Monroe grew up between France and the United States and first broke through after winning Prodiges.',
    ru: 'Monroe росла между Францией и США, а большой прорыв пришёл после победы в Prodiges.',
  },
  GB: {
    en: 'LOOK MUM NO COMPUTER tours with custom-built musical machines, including the stage synthesizer "Kosmo".',
    ru: 'LOOK MUM NO COMPUTER гастролирует с собственными музыкальными машинами, включая сценический синтезатор "Kosmo".',
  },
  GE: {
    en: 'Bzikebi already has Eurovision history after winning Junior Eurovision for Georgia in 2008.',
    ru: 'У Bzikebi уже есть история в семье Евровидения: группа выиграла Junior Eurovision для Грузии в 2008 году.',
  },
  GR: {
    en: 'Akylas broke through widely after the 2024 hit single "Atelié".',
    ru: 'Широкая известность к Akylas пришла после хита "Atelié" в 2024 году.',
  },
  HR: {
    en: 'LELEK formed in 2024 and mixes traditional Croatian influences with modern pop.',
    ru: 'LELEK появилась в 2024 году и смешивает традиционные хорватские мотивы с современным попом.',
  },
  IL: {
    en: 'Noam Bettan is frequently described as one of the standout voices of a new Israeli generation.',
    ru: 'Noam Bettan часто называют одним из самых заметных голосов нового поколения израильской сцены.',
  },
  IT: {
    en: 'Sal Da Vinci was born in New York during a tour by his father Mario Da Vinci.',
    ru: 'Sal Da Vinci родился в Нью-Йорке во время гастролей своего отца Mario Da Vinci.',
  },
  LT: {
    en: 'Lion Ceccah combines songwriting with musical theatre and advocacy for drag culture.',
    ru: 'Lion Ceccah совмещает авторскую музыку, музыкальный театр и активную работу в дрэг-культуре.',
  },
  LU: {
    en: 'Eva Marija fell in love with the violin after seeing Alexander Rybak win Eurovision 2009.',
    ru: 'Eva Marija полюбила скрипку после того, как увидела победу Александра Рыбака на Евровидении-2009.',
  },
  LV: {
    en: 'Atvara stands out for cinematic production and emotionally raw storytelling.',
    ru: 'Atvara особенно выделяется кинематографичным звучанием и очень эмоциональной манерой рассказа.',
  },
  MD: {
    en: 'Satoshi comes from Cahul in southwest Moldova.',
    ru: 'Satoshi родом из города Кагул на юго-западе Молдовы.',
  },
  ME: {
    en: 'Montenegro’s act was selected by broadcaster RTCG.',
    ru: 'Черногорскую заявку в этом сезоне выбрал вещатель RTCG.',
  },
  MT: {
    en: 'Malta’s act was selected by broadcaster MTPBS.',
    ru: 'Мальту на конкурс в этом сезоне отправил вещатель MTPBS.',
  },
  NO: {
    en: 'JONAS LOVV comes from Bergen and quickly built a reputation as a powerhouse performer.',
    ru: 'JONAS LOVV родом из Бергена и очень быстро заработал репутацию мощного лайв-исполнителя.',
  },
  PL: {
    en: 'ALICJA first rose to fame by winning The Voice of Poland.',
    ru: 'ALICJA впервые стала широко известна после победы в The Voice of Poland.',
  },
  PT: {
    en: 'Bandidos do Cante is made up of Miguel Costa, Duarte Farias, Francisco Raposo, Luís Aleixo, and Francisco Pestana.',
    ru: 'Bandidos do Cante — это коллектив из Miguel Costa, Duarte Farias, Francisco Raposo, Luís Aleixo и Francisco Pestana.',
  },
  RO: {
    en: 'Alexandra Căpitănescu came to national attention after winning The Voice of Romania in 2023.',
    ru: 'Alexandra Căpitănescu стала известна на всю страну после победы в The Voice of Romania в 2023 году.',
  },
  RS: {
    en: 'Serbia’s act travels to Vienna after selection by broadcaster RTS.',
    ru: 'Сербскую заявку в Вену отправил национальный вещатель RTS.',
  },
  SE: {
    en: 'Before FELICIA, many viewers knew the artist under the name Fröken Snusk.',
    ru: 'До образа FELICIA многие зрители знали артистку под именем Fröken Snusk.',
  },
  SM: {
    en: 'SENHIT already represented San Marino in 2011 and 2021, and "Adrenalina" later passed 20 million Spotify streams.',
    ru: 'SENHIT уже представляла Сан-Марино в 2011 и 2021 годах, а "Adrenalina" после этого набрала более 20 миллионов прослушиваний в Spotify.',
  },
  UA: {
    en: 'Victoria Leleka built the LELÉKA project between Kyiv, Berlin, Dresden, and film composition studies.',
    ru: 'Проект LELÉKA Виктория Лелека строила между Киевом, Берлином, Дрезденом и обучением кинокомпозиции.',
  },
};

function context(label, valueEn, valueRu) {
  return { label, value: { en: valueEn, ru: valueRu } };
}

function buildSemiSlot(stageKey, half) {
  return context(
    DRAW_LABEL,
    `${HALF_LABELS[half].en} of ${STAGE_LABELS[stageKey].en}`,
    `${HALF_LABELS[half].ru} ${STAGE_GENITIVE_LABELS[stageKey].ru}`,
  );
}

function buildFinalRoute(kind) {
  if (kind === 'host') {
    return context(
      FINAL_ROUTE_LABEL,
      'Automatic finalist as the host broadcaster',
      'Автоматический финалист как страна-хозяйка',
    );
  }

  return context(
    FINAL_ROUTE_LABEL,
    'Automatic finalist as a pre-qualified broadcaster',
    'Автоматический финалист как заранее отобранный вещатель',
  );
}

function buildBlurb(entry, code) {
  const countryNameRu = COUNTRY_NAMES_RU[code] || entry.country;
  if (entry.stage === 'final') {
    const qualifierLineEn = entry.autoQualifier === 'host'
      ? 'The act is already in the Grand Final in Vienna.'
      : 'The act is already qualified for the Grand Final in Vienna.';
    const qualifierLineRu = entry.autoQualifier === 'host'
      ? 'Исполнитель уже находится в финале в Вене как представитель страны-хозяйки.'
      : 'Исполнитель уже квалифицирован в финал в Вене.';

    return {
      en: `${entry.summary.en} ${entry.artist} represents ${entry.country} with "${entry.song}" at Eurovision 2026. ${qualifierLineEn}`,
      ru: `${entry.summary.ru} ${entry.artist} представляет ${countryNameRu} с песней "${entry.song}" на Евровидении-2026. ${qualifierLineRu}`,
    };
  }

  return {
    en: `${entry.summary.en} ${entry.artist} represents ${entry.country} with "${entry.song}" at Eurovision 2026.`,
    ru: `${entry.summary.ru} ${entry.artist} представляет ${countryNameRu} с песней "${entry.song}" на Евровидении-2026.`,
  };
}

function buildFacts(entry, code) {
  const detail = PROFILE_DETAILS[code];
  if (entry.stage === 'final') {
    return {
      en: detail
        ? [
            detail.en,
            `The act is already in the Grand Final and will also vote in ${STAGE_LABELS[entry.previewSemi].en}.`,
          ]
        : [`The act is already in the Grand Final and will also vote in ${STAGE_LABELS[entry.previewSemi].en}.`],
      ru: detail
        ? [
            detail.ru,
            `Исполнитель уже находится в финале и при этом голосует в ${STAGE_PREPOSITIONAL_LABELS[entry.previewSemi].ru}.`,
          ]
        : [`Исполнитель уже находится в финале и при этом голосует в ${STAGE_PREPOSITIONAL_LABELS[entry.previewSemi].ru}.`],
    };
  }

  return {
    en: detail ? [detail.en] : [],
    ru: detail ? [detail.ru] : [],
  };
}

function buildContexts(entry) {
  if (entry.stage === 'final') {
    return { final: buildFinalRoute(entry.autoQualifier) };
  }

  return { [entry.stage]: buildSemiSlot(entry.stage, entry.half) };
}

const PARTICIPANTS_2026 = {
  AL: {
    country: 'Albania',
    artist: 'Alis',
    song: 'Nân',
    stage: 'semi2',
    half: 'second',
    summary: {
      en: 'At a very young age, Alis has already built a strong profile in the Albanian music scene.',
      ru: 'Несмотря на юный возраст, Alis уже успела ярко заявить о себе на албанской сцене.',
    },
  },
  AM: {
    country: 'Armenia',
    artist: 'SIMÓN',
    song: 'Paloma Rumba',
    stage: 'semi2',
    half: 'first',
    summary: {
      en: 'SIMÓN heads to Vienna as the act chosen by the Armenian broadcaster ARMTV.',
      ru: 'SIMÓN едет в Вену как артист, выбранный армянским вещателем ARMTV.',
    },
  },
  AT: {
    country: 'Austria',
    artist: 'COSMÓ',
    song: 'Tanzschein',
    stage: 'final',
    autoQualifier: 'host',
    previewSemi: 'semi2',
    summary: {
      en: 'Hungarian-born COSMÓ grew up in Burgenland, Austria, and now lives in Vienna.',
      ru: 'COSMÓ родился в Венгрии, вырос в австрийском Бургенланде и сейчас живёт в Вене.',
    },
  },
  AU: {
    country: 'Australia',
    artist: 'Delta Goodrem',
    song: 'Eclipse',
    stage: 'semi2',
    half: 'second',
    summary: {
      en: 'Delta Goodrem is one of Australia’s best-known singer-songwriters, actresses, and entrepreneurs.',
      ru: 'Delta Goodrem — одна из самых известных австралийских певиц, авторов песен, актрис и предпринимателей.',
    },
  },
  AZ: {
    country: 'Azerbaijan',
    artist: 'JIVA',
    song: 'Just Go',
    stage: 'semi2',
    half: 'first',
    summary: {
      en: 'JIVA, born Jamila Hashimova, is known for strong vocals and sincere live delivery.',
      ru: 'JIVA, она же Jamila Hashimova, известна сильным вокалом и очень искренней подачей на сцене.',
    },
  },
  BE: {
    country: 'Belgium',
    artist: 'ESSYLA',
    song: 'Dancing on the Ice',
    stage: 'semi1',
    half: 'second',
    summary: {
      en: 'ESSYLA broke through to a wider audience after reaching the final of The Voice Belgique.',
      ru: 'ESSYLA стала широко известна после выхода в финал The Voice Belgique.',
    },
  },
  BG: {
    country: 'Bulgaria',
    artist: 'DARA',
    song: 'Bangaranga',
    stage: 'semi2',
    half: 'first',
    summary: {
      en: 'DARA is one of the central figures of contemporary Bulgarian pop.',
      ru: 'DARA считается одной из ключевых фигур современной болгарской поп-сцены.',
    },
  },
  CH: {
    country: 'Switzerland',
    artist: 'Veronica Fusaro',
    song: 'Alice',
    stage: 'semi2',
    half: 'first',
    summary: {
      en: 'Veronica Fusaro blends pop, soul, and rock with sharp lyrics and a confident live presence.',
      ru: 'Veronica Fusaro соединяет поп, соул и рок, а ещё известна точными текстами и сильной живой подачей.',
    },
  },
  CY: {
    country: 'Cyprus',
    artist: 'Antigoni',
    song: 'JALLA',
    stage: 'semi2',
    half: 'second',
    summary: {
      en: 'Antigoni grew up in North London and brings Greek-Cypriot roots into her songwriting.',
      ru: 'Antigoni выросла в Северном Лондоне и приносит в свою музыку греко-кипрские корни.',
    },
  },
  CZ: {
    country: 'Czechia',
    artist: 'Daniel Zizka',
    song: 'CROSSROADS',
    stage: 'semi2',
    half: 'first',
    summary: {
      en: 'Daniel Zizka is already regarded as one of the defining young voices in Czech music.',
      ru: 'Daniel Zizka уже считают одним из самых ярких голосов нового поколения чешской музыки.',
    },
  },
  DE: {
    country: 'Germany',
    artist: 'Sarah Engels',
    song: 'Fire',
    stage: 'final',
    autoQualifier: 'prequalified',
    previewSemi: 'semi1',
    summary: {
      en: 'Sarah Engels first became nationally known in 2011 through Deutschland sucht den Superstar.',
      ru: 'Sarah Engels впервые получила широкую известность в 2011 году после участия в Deutschland sucht den Superstar.',
    },
  },
  DK: {
    country: 'Denmark',
    artist: 'Søren Torpegaard Lund',
    song: 'Før Vi Går Hjem',
    stage: 'semi2',
    half: 'second',
    summary: {
      en: 'Søren Torpegaard Lund found his calling in musical theatre while growing up in Gudme.',
      ru: 'Søren Torpegaard Lund нашёл своё призвание в музыкальном театре ещё в детстве, когда рос в Гудме.',
    },
  },
  EE: {
    country: 'Estonia',
    artist: 'Vanilla Ninja',
    song: 'Too Epic To Be True',
    stage: 'semi1',
    half: 'second',
    summary: {
      en: 'Vanilla Ninja reunites Lenna Kuurmaa, Piret Järvis-Milder, and Kerli Kivilaan.',
      ru: 'Vanilla Ninja снова собирает вместе Lenna Kuurmaa, Piret Järvis-Milder и Kerli Kivilaan.',
    },
  },
  FI: {
    country: 'Finland',
    artist: 'Linda Lampenius x Pete Parkkonen',
    song: 'Liekinheitin',
    stage: 'semi1',
    half: 'first',
    summary: {
      en: 'Pete Parkkonen and violin star Linda Lampenius bring together two very different musical careers.',
      ru: 'Pete Parkkonen и звезда скрипки Linda Lampenius объединяют на этой заявке два очень разных музыкальных пути.',
    },
  },
  FR: {
    country: 'France',
    artist: 'Monroe',
    song: 'Regarde !',
    stage: 'final',
    autoQualifier: 'prequalified',
    previewSemi: 'semi2',
    summary: {
      en: 'At 17, Monroe already broke through nationally after winning Prodiges in 2025.',
      ru: 'В свои 17 лет Monroe уже успела ярко заявить о себе на всю страну после победы в Prodiges в 2025 году.',
    },
  },
  GB: {
    country: 'United Kingdom',
    artist: 'LOOK MUM NO COMPUTER',
    song: 'Eins, Zwei, Drei',
    stage: 'final',
    autoQualifier: 'prequalified',
    previewSemi: 'semi2',
    summary: {
      en: 'LOOK MUM NO COMPUTER is an electronic artist and inventor known for building custom musical machines.',
      ru: 'LOOK MUM NO COMPUTER — электронный артист и изобретатель, прославившийся собственными музыкальными машинами.',
    },
  },
  GE: {
    country: 'Georgia',
    artist: 'Bzikebi',
    song: 'On Replay',
    stage: 'semi1',
    half: 'first',
    summary: {
      en: 'Bzikebi won Junior Eurovision for Georgia back in 2008 when the members were only 10 years old.',
      ru: 'Bzikebi уже побеждали на Junior Eurovision для Грузии в 2008 году, когда участникам было всего по десять лет.',
    },
  },
  GR: {
    country: 'Greece',
    artist: 'Akylas',
    song: 'Ferto',
    stage: 'semi1',
    half: 'first',
    summary: {
      en: 'Akylas broke through widely after the 2024 hit "Atelié".',
      ru: 'Akylas громко выстрелил после хита «Atelié» в 2024 году.',
    },
  },
  HR: {
    country: 'Croatia',
    artist: 'LELEK',
    song: 'Andromeda',
    stage: 'semi1',
    half: 'first',
    summary: {
      en: 'LELEK is an ethno-pop group formed in 2024 that mixes Croatian tradition with modern pop.',
      ru: 'LELEK — этно-поп-группа, созданная в 2024 году и соединяющая хорватскую традицию с современной поп-музыкой.',
    },
  },
  IL: {
    country: 'Israel',
    artist: 'Noam Bettan',
    song: 'Michelle',
    stage: 'semi1',
    half: 'second',
    summary: {
      en: 'Noam Bettan is regarded as one of the most distinctive voices of a new Israeli generation.',
      ru: 'Noam Bettan считают одним из самых узнаваемых голосов нового поколения израильских артистов.',
    },
  },
  IT: {
    country: 'Italy',
    artist: 'Sal Da Vinci',
    song: 'Per Sempre Sì',
    stage: 'final',
    autoQualifier: 'prequalified',
    previewSemi: 'semi1',
    summary: {
      en: 'Sal Da Vinci is the stage name of Neapolitan singer and actor Salvatore Michael Sorrentino.',
      ru: 'Sal Da Vinci — сценическое имя неаполитанского певца и актёра Salvatore Michael Sorrentino.',
    },
  },
  LT: {
    country: 'Lithuania',
    artist: 'Lion Ceccah',
    song: 'Sólo Quiero Más',
    stage: 'semi1',
    half: 'second',
    summary: {
      en: 'Lion Ceccah is a performer, songwriter, drag culture advocate, and musical theatre specialist from Vilnius.',
      ru: 'Lion Ceccah — артист, автор песен, представитель дрэг-культуры и специалист по музыкальному театру из Вильнюса.',
    },
  },
  LU: {
    country: 'Luxembourg',
    artist: 'Eva Marija',
    song: 'Mother Nature',
    stage: 'semi2',
    half: 'first',
    summary: {
      en: 'Eva Marija fell in love with the violin at three after seeing Alexander Rybak win Eurovision 2009.',
      ru: 'Eva Marija влюбилась в скрипку в три года после победы Александра Рыбака на Евровидении-2009.',
    },
  },
  LV: {
    country: 'Latvia',
    artist: 'Atvara',
    song: 'Ā’nā',
    stage: 'semi2',
    half: 'second',
    summary: {
      en: 'Atvara is known for powerful vocals, cinematic production, and emotionally direct storytelling.',
      ru: 'Atvara известна мощным вокалом, кинематографичным звучанием и очень эмоциональной манерой рассказа.',
    },
  },
  MD: {
    country: 'Moldova',
    artist: 'Satoshi',
    song: 'Viva, Moldova!',
    stage: 'semi1',
    half: 'first',
    summary: {
      en: 'Satoshi is a singer, songwriter, and rapper from Cahul in southwest Moldova.',
      ru: 'Satoshi — певец, автор песен и рэпер из Кагула на юго-западе Молдовы.',
    },
  },
  ME: {
    country: 'Montenegro',
    artist: 'Tamara Živković',
    song: 'Nova Zora',
    stage: 'semi1',
    half: 'second',
    summary: {
      en: 'Tamara Živković represents Montenegro after being selected by RTCG.',
      ru: 'Tamara Živković представляет Черногорию после отбора вещателем RTCG.',
    },
  },
  MT: {
    country: 'Malta',
    artist: 'AIDAN',
    song: 'Bella',
    stage: 'semi2',
    half: 'second',
    summary: {
      en: 'AIDAN returns to Eurovision after being selected by the Maltese broadcaster MTPBS.',
      ru: 'AIDAN возвращается на Евровидение после отбора мальтийским вещателем MTPBS.',
    },
  },
  NO: {
    country: 'Norway',
    artist: 'JONAS LOVV',
    song: 'YA YA YA',
    stage: 'semi2',
    half: 'second',
    summary: {
      en: 'JONAS LOVV quickly built a reputation in Norway as a powerhouse live performer.',
      ru: 'JONAS LOVV очень быстро заработал репутацию одного из самых мощных лайв-исполнителей Норвегии.',
    },
  },
  PL: {
    country: 'Poland',
    artist: 'ALICJA',
    song: 'Pray',
    stage: 'semi1',
    half: 'second',
    summary: {
      en: 'ALICJA rose to fame after winning The Voice of Poland and is now one of the country’s standout voices.',
      ru: 'ALICJA прославилась после победы в The Voice of Poland и теперь считается одним из самых заметных голосов страны.',
    },
  },
  PT: {
    country: 'Portugal',
    artist: 'Bandidos do Cante',
    song: 'Rosa',
    stage: 'semi1',
    half: 'first',
    summary: {
      en: 'Bandidos do Cante is made up of Miguel Costa, Duarte Farias, Francisco Raposo, Luís Aleixo, and Francisco Pestana.',
      ru: 'Bandidos do Cante — это коллектив из Miguel Costa, Duarte Farias, Francisco Raposo, Luís Aleixo и Francisco Pestana.',
    },
  },
  RO: {
    country: 'Romania',
    artist: 'Alexandra Căpitănescu',
    song: 'Choke Me',
    stage: 'semi2',
    half: 'first',
    summary: {
      en: 'Alexandra Căpitănescu won The Voice of Romania in 2023.',
      ru: 'Alexandra Căpitănescu выиграла The Voice of Romania в 2023 году.',
    },
  },
  RS: {
    country: 'Serbia',
    artist: 'LAVINA',
    song: 'Kraj Mene',
    stage: 'semi1',
    half: 'second',
    summary: {
      en: 'LAVINA carries Serbia’s hopes after being selected by RTS.',
      ru: 'LAVINA везёт надежды Сербии после отбора национальным вещателем RTS.',
    },
  },
  SE: {
    country: 'Sweden',
    artist: 'FELICIA',
    song: 'My System',
    stage: 'semi1',
    half: 'first',
    summary: {
      en: 'FELICIA rose fast in Sweden with strong stage charisma and was previously known as Fröken Snusk.',
      ru: 'FELICIA очень быстро стала заметной в Швеции благодаря сценической харизме и раньше выступала под именем Fröken Snusk.',
    },
  },
  SM: {
    country: 'San Marino',
    artist: 'SENHIT',
    song: 'Superstar',
    stage: 'semi1',
    half: 'second',
    summary: {
      en: 'SENHIT returns as one of the most recognizable Eurovision veterans, with two previous San Marino appearances.',
      ru: 'SENHIT возвращается как одна из самых узнаваемых ветеранов Евровидения, уже дважды представлявшая Сан-Марино.',
    },
  },
  UA: {
    country: 'Ukraine',
    artist: 'LELÉKA',
    song: 'Ridnym',
    stage: 'semi2',
    half: 'second',
    summary: {
      en: 'LELÉKA is Victoria Leleka’s project, shaped between Kyiv, Berlin, Dresden, and film composition studies.',
      ru: 'LELÉKA — проект Виктории Лелеки, сформированный между Киевом, Берлином, Дрезденом и изучением кинокомпозиции.',
    },
  },
};

const ARTIST_CONTENT = Object.fromEntries(
  Object.entries(PARTICIPANTS_2026).map(([code, entry]) => [
    code,
    {
      country: entry.country,
      artist: entry.artist,
      song: entry.song,
      blurb: buildBlurb(entry, code),
      facts: buildFacts(entry, code),
      contexts: buildContexts(entry),
    },
  ]),
);

module.exports = { ARTIST_CONTENT };
