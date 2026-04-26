import type { ActEntry, BoardKey, StageKey } from "./types";

export type Language = "ru" | "en";

export const LANGUAGE_STORAGE_KEY = "esc-ui-language";

const COPY = {
  ru: {
    nav: {
      room: "Комната",
      vote: "Голосование",
      acts: "Артисты",
      live: "Эфир",
      players: "Участники",
      portal: "Евровидение у Морозовых 2026",
    },
    common: {
      live: "Эфир",
      points: "Баллы",
      room: "Комната",
      open: "Открыто",
      loading: "Загрузка...",
      locked: "Зафиксировано",
      draft: "Черновик",
      empty: "Пусто",
      overall: "Общий",
    },
    stageLabels: {
      semi1: "1-й полуфинал",
      semi2: "2-й полуфинал",
      final: "Финал",
    },
    boardLabels: {
      overall: "Общий зачёт",
      semi1: "1-й полуфинал",
      semi2: "2-й полуфинал",
      final: "Финал",
    },
    pages: {
      room: {
        title: "Хаб комнаты",
        kicker: "Евровидение у Морозовых 2026",
        description:
          "Мобильная комната для голосования с отдельными маршрутами для бюллетеня, карточек артистов, результатов эфира и таблицы участников.",
      },
      vote: {
        title: "Студия голосования",
        kicker: "Мобильный бюллетень",
        description:
          "Заметки, карточки артистов и полный точный рейтинг этапа, который интуитивно понятен на телефонах.",
      },
      acts: {
        title: "Гид по артистам",
        kicker: "Профили артистов",
        description:
          "Открывай любого исполнителя, читай факты и смотри контекст выступления прямо во время шоу.",
      },
      live: {
        title: "Результаты эфира",
        kicker: "Экран для проектора",
        description:
          "Отдельный экран для результатов этапа с анимированными перестановками и плотностью, удобной для ТВ.",
      },
      players: {
        title: "Таблица участников",
        kicker: "Результаты комнаты",
        description:
          "Отдельный экран результатов комнаты: общий зачёт и отдельные таблицы по этапам.",
      },
    },
    home: {
      kicker: "Евровидение у Морозовых 2026",
      title: "Голосование для телефонов и экранов проектора",
      description:
        "Одна система голосования, но несколько отдельных URL: мобильный бюллетень с заметками и полным рейтингом, плюс отдельные экраны для артистов и участников.",
      enterDefaultRoom: "Открыть основную комнату",
      openDisplayBoard: "Открыть экран результатов",
      fallbackWarning: "Используется локальная резервная комната, потому что API комнат сейчас недоступен.",
      phoneBallotTitle: "Бюллетень на телефоне",
      phoneBallotText: "Артисты, заметки, точная расстановка мест и фиксация голоса на одном экране.",
      displayModeTitle: "Экранный режим",
      displayModeText: "Отдельные URL для результатов артистов и таблицы участников комнаты.",
      notesFlowTitle: "Режим заметок",
      notesFlowText: "Цифровой аналог бумажного листа, который остаётся интуитивным.",
      roomsKicker: "Комнаты",
      roomsTitle: "Запуск комнат",
      roomTag: "Маршрут комнаты",
    },
    roomHub: {
      title: "Мобильное голосование и отдельные экраны для комнаты.",
      description:
        "Телефоны остаются сфокусированными на заметках и точной расстановке мест. ТВ и проекторы получают отдельные маршруты для артистов и таблицы участников.",
      openVoting: "Открыть голосование на телефоне",
      openProjector: "Открыть экран проектора",
      phoneUxTitle: "Сценарий для телефона",
      phoneUxText: "Артисты, заметки и полный порядок в одном мобильном сценарии.",
      displayRoutesTitle: "Маршруты для экрана",
      displayRoutesText: "Отдельные URL для проектора с результатами артистов и участников.",
      digitalNotesTitle: "Цифровые заметки",
      digitalNotesText: "Подход как у бумажного листа, но с сохранением по каждому артисту.",
      quickRoutes: "Быстрые маршруты",
      quickRoutesTitle: "Экраны комнаты",
      voteStudioTitle: "Студия голосования",
      voteStudioText: "Телефонный сценарий для рейтинга и заметок",
      actsGuideTitle: "Гид по артистам",
      actsGuideText: "Профили и факты во время шоу",
      liveResultsTitle: "Результаты эфира",
      liveResultsText: "Проекторный экран результатов этапа",
      playersBoardTitle: "Таблица участников",
      playersBoardText: "Результаты всех игроков комнаты",
      previewActs: "Превью артистов",
    },
    leaderboard: {
      kicker: "Таблица эфира",
      titleSuffix: "таблица участников",
      syncing: "Обновляю позиции...",
      loadError: "Не удалось загрузить превью таблицы участников.",
    },
    vote: {
      liveVotingWindow: "Окно голосования",
      heroTitle: "Твой голос формирует будущее",
      heroDescription:
        "Веди быстрые заметки по ходу выступлений, а потом выстрой всех артистов в один полный порядок. Без одинаковых мест, без скрытых жестов и без путаницы.",
      statusLabel: "Статус",
      votingOpen: "Голосование открыто.",
      votingClosed: "Голосование сейчас закрыто.",
      stageLocked: "Этот этап уже зафиксирован на этом устройстве.",
      stageEditable: "Черновик можно менять до момента фиксации.",
      actsLabel: "Артисты",
      actsText: "Каждый артист должен получить уникальное место.",
      notesLabel: "Заметки",
      notesText: "Это цифровой аналог бумажного листа для заметок.",
      ballotLabel: "Бюллетень",
      ballotText: (total: number) => `Список всегда поддерживает полный порядок от #1 до #${total}.`,
      deviceCheckIn: "Проверка устройства",
      deviceTitle: "Зарегистрируй этот телефон один раз",
      deviceText:
        "У каждого телефона один черновик и одна официальная отправка на этап. Зарегистрируйся один раз и меняй порядок, пока не зафиксируешь бюллетень.",
      firstName: "Имя",
      lastName: "Фамилия",
      verifyDevice: "Подтвердить устройство",
      checkingIn: "Проверяю...",
      votingOnPhone: "Голосование на этом телефоне",
      singleBallot: "Один бюллетень на этап",
      autoSave: "Черновик сохраняется локально",
      noNotesYet:
        "Пока нет заметок. Открой любого артиста, выбери тег и добавь короткую мысль, как на бумаге.",
      tapToAddNote: "Нажми и оставь заметку",
      notesAutosave: "Заметка сохраняется сразу на этом устройстве.",
      clearNote: "Очистить заметку",
      noteSavedBadge: "Есть заметка",
      tabActs: "Артисты",
      tabNotes: "Мои заметки",
      tabOrder: "Мой порядок",
      openAct: "Открыть",
      placeLabel: "Место",
      fullOrderReady: (filled: number, total: number) => `Полный порядок: ${filled}/${total}`,
      windowOpen: "Окно открыто",
      windowClosed: "Окно закрыто",
      savedOnPhone: "Черновик сохранён на этом телефоне",
      ballotLocked: "Бюллетень зафиксирован",
      locking: "Фиксирую...",
      submitBallot: "Отправить официальный бюллетень",
      enterNamesError: "Укажи и имя, и фамилию перед голосованием.",
      verifyError: "Сейчас не удалось подтвердить это устройство.",
      verifySuccess: "Устройство подтверждено. Теперь черновик сохраняется на этом телефоне.",
      needNameError: "Укажи имя перед фиксацией бюллетеня.",
      votingClosedError: "Хост комнаты сейчас закрыл окно голосования.",
      incompleteError: "Перед отправкой нужно заполнить полный порядок.",
      submitError: "Сейчас не удалось зафиксировать бюллетень.",
      submitSuccess: "Бюллетень для этого этапа зафиксирован. Теперь это официальный порядок.",
      exactPlacement: "Точное место",
      exactPlacementText: "Выбери точную позицию, а остальной список автоматически сдвинется.",
      higher: "Выше",
      lower: "Ниже",
      openFullOrder: "Открыть мой полный порядок",
      quickFacts: "Короткие факты",
      currentPlace: "Моё место",
      noteSummary: "Сводка заметки",
      notePlaceholder: "Добавь короткую мысль. Например: припев в лайве звучит сильнее.",
      orderReady: "Порядок готов",
      roomLabel: "Комната",
    },
    notes: {
      favorite: "Фаворит",
      watch: "Надо следить",
      vocals: "Вокал",
      skip: "Не моё",
    },
    acts: {
      heroKicker: "Гид по артистам",
      heroTitle: "Открывай артиста, читай факты и не теряй свой порядок",
      heroDescription:
        "Это быстрый экран-справочник для телефона. Открывай профиль во время шоу, читай реальные факты и возвращайся к рейтингу в любой момент.",
      openVoteStudio: "Открыть студию голосования",
      searchPlaceholder: "Искать по артисту, стране или песне",
      loadError: "Сейчас не удалось загрузить гид по артистам.",
      roomLabel: "Комната",
      currentPlace: "Моё место",
      runningOrder: (value: number) => `Порядок #${value}`,
      noteSummaryPrefix: "Моя заметка",
      aboutArtist: "Об исполнителе",
      stageMetaLabel: "Контекст выступления",
      noteSavedLocally: "Заметка уже сохранена на этом устройстве.",
    },
    live: {
      projectorMode: "Экран проектора",
      title: "Эфирная таблица для комнаты",
      description:
        "Используй этот URL на ТВ или проекторе. Открытые места артистов двигаются в той же визуальной логике, что и таблица участников.",
      revealed: "Открыто",
      display: "Экран",
      displayReady: "Готово для внешнего экрана",
      loadError: "Сейчас не удалось загрузить таблицу результатов этапа.",
      positionRevealed: "Позиция открыта",
      waitingReveal: "Ожидает открытия",
    },
    players: {
      kicker: "Таблица комнаты",
      title: "Кто точнее всех угадывает итоговую таблицу",
      description:
        "Это отдельный экран результатов для телефонов, ноутбуков и проекторов. Он использует тот же язык движения, что и таблица результатов артистов.",
      playersLabel: "Игроки",
      leaderLabel: "Лидер",
      liveLabel: "Эфир",
      noPlayersYet: "Пока нет игроков",
      exactMatches: (count: number) => `${count} точных совпадений`,
      pointsLabel: "Баллы",
      loadError: "Сейчас не удалось загрузить таблицу участников.",
    },
    movement: {
      steady: "Без изменений",
      up: (value: number) => `Вверх ${value}`,
      down: (value: number) => `Вниз ${value}`,
    },
    act: {
      artistFact: (artist: string) => `Артист: ${artist}`,
      songFact: (song: string) => `Песня: "${song}"`,
      runningOrderFact: (value: number, stageLabel: string) => `Порядок выступления: #${value} в этапе «${stageLabel}»`,
      blurb: (artist: string, country: string, song: string) => `${artist} представляет ${country} с песней "${song}".`,
      roadToFinal: "Путь в финал",
      selectionPath: "Путь отбора",
      qualifiedSemi1: "Прошёл через 1-й полуфинал",
      qualifiedSemi2: "Прошёл через 2-й полуфинал",
      automaticFinalist: "Автоматический финалист",
      nationalSelectionPlaceholder: (country: string) => `Данные о результате нацотбора для ${country} можно добавить отдельно.`,
    },
  },
  en: {
    nav: {
      room: "Room",
      vote: "Vote",
      acts: "Acts",
      live: "Live",
      players: "Players",
      portal: "Евровидение у Морозовых 2026",
    },
    common: {
      live: "Live",
      points: "Points",
      room: "Room",
      open: "Open",
      loading: "Loading...",
      locked: "Locked",
      draft: "Draft",
      empty: "Empty",
      overall: "Overall",
    },
    stageLabels: {
      semi1: "Semi-final 1",
      semi2: "Semi-final 2",
      final: "Grand Final",
    },
    boardLabels: {
      overall: "Overall",
      semi1: "Semi-final 1",
      semi2: "Semi-final 2",
      final: "Grand Final",
    },
    pages: {
      room: {
        title: "Room Hub",
        kicker: "Евровидение у Морозовых 2026",
        description:
          "A mobile-first Eurovision room with separate routes for ballots, artist profiles, live stage results, and player standings.",
      },
      vote: {
        title: "Vote Studio",
        kicker: "Mobile ballot",
        description:
          "Notes, artist profiles, and a full exact stage ranking designed to feel obvious on phones.",
      },
      acts: {
        title: "Acts Guide",
        kicker: "Artist profiles",
        description:
          "Open any performer, read the facts, and view stage-aware context while the show is running.",
      },
      live: {
        title: "Live Results",
        kicker: "Projector view",
        description:
          "A dedicated screen for stage standings with animated rank changes and display-friendly density.",
      },
      players: {
        title: "Players Board",
        kicker: "Room standings",
        description:
          "A standalone room standings screen with overall and stage-specific boards.",
      },
    },
    home: {
      kicker: "Евровидение у Морозовых 2026",
      title: "Eurovision voting for phones and projector screens",
      description:
        "One voting system, several shareable URLs: a mobile ballot flow with notes and full ranking, plus dedicated live boards for acts and players.",
      enterDefaultRoom: "Enter default room",
      openDisplayBoard: "Open display board",
      fallbackWarning: "Using the local room fallback because the rooms API is unavailable.",
      phoneBallotTitle: "Phone ballot",
      phoneBallotText: "Acts, notes, exact placement, and ballot lock-in on one screen.",
      displayModeTitle: "Display mode",
      displayModeText: "Separate URLs for stage results and room leaderboard screens.",
      notesFlowTitle: "Notes flow",
      notesFlowText: "A digital version of paper notes that still feels obvious.",
      roomsKicker: "Rooms",
      roomsTitle: "Room launcher",
      roomTag: "Room route",
    },
    roomHub: {
      title: "Mobile-first voting. Separate screens for the room.",
      description:
        "Phones stay focused on notes and exact ranking. TVs and projectors get dedicated live routes for acts and player standings.",
      openVoting: "Open voting on phone",
      openProjector: "Open projector board",
      phoneUxTitle: "Phone UX",
      phoneUxText: "Acts, notes, and full ranking live in one mobile flow.",
      displayRoutesTitle: "Display routes",
      displayRoutesText: "Projector-friendly URLs for act results and player standings.",
      digitalNotesTitle: "Digital notes",
      digitalNotesText: "A paper-sheet mindset, now saved per performer.",
      quickRoutes: "Quick routes",
      quickRoutesTitle: "Shareable room screens",
      voteStudioTitle: "Vote studio",
      voteStudioText: "Phone-first ranking and notes",
      actsGuideTitle: "Acts guide",
      actsGuideText: "Profiles and facts during the show",
      liveResultsTitle: "Live results",
      liveResultsText: "Projector-ready stage board",
      playersBoardTitle: "Players board",
      playersBoardText: "Standings for everyone in the room",
      previewActs: "Preview acts",
    },
    leaderboard: {
      kicker: "Live scoreboard",
      titleSuffix: "player board",
      syncing: "Syncing live positions...",
      loadError: "Unable to load the leaderboard preview.",
    },
    vote: {
      liveVotingWindow: "Live voting window",
      heroTitle: "Your vote stages the future",
      heroDescription:
        "Keep quick notes while the performances happen, then place every act into one complete order. No ties, no confusion, no hidden gestures.",
      statusLabel: "Status",
      votingOpen: "Voting is open.",
      votingClosed: "Voting is closed right now.",
      stageLocked: "This stage is locked on this device.",
      stageEditable: "Draft stays editable until you lock it.",
      actsLabel: "Acts",
      actsText: "Every act must end up with a unique place.",
      notesLabel: "Notes",
      notesText: "This is the digital version of the paper notes sheet.",
      ballotLabel: "Ballot",
      ballotText: (total: number) => `The list always keeps a full order from #1 to #${total}.`,
      deviceCheckIn: "Device check-in",
      deviceTitle: "Register this phone once",
      deviceText:
        "Each phone keeps one draft and one official submission per stage. Register once, then keep adjusting your order until you lock it.",
      firstName: "First name",
      lastName: "Last name",
      verifyDevice: "Verify this device",
      checkingIn: "Checking in...",
      votingOnPhone: "Voting on this phone",
      singleBallot: "Single ballot per stage",
      autoSave: "Draft auto-saves locally",
      noNotesYet:
        "No notes yet. Open any act, choose a tone, and add one short thought just like on paper.",
      tapToAddNote: "Tap to add a note",
      notesAutosave: "Your note is saved right away on this device.",
      clearNote: "Clear note",
      noteSavedBadge: "Note saved",
      tabActs: "Acts",
      tabNotes: "My Notes",
      tabOrder: "My Order",
      openAct: "Open",
      placeLabel: "Place",
      fullOrderReady: (filled: number, total: number) => `Full order ready: ${filled}/${total}`,
      windowOpen: "Window open",
      windowClosed: "Window closed",
      savedOnPhone: "Draft saved on this phone",
      ballotLocked: "Ballot locked",
      locking: "Locking...",
      submitBallot: "Submit official ballot",
      enterNamesError: "Enter both first and last name before voting.",
      verifyError: "Unable to verify this device right now.",
      verifySuccess: "Device verified. Your draft now stays on this phone.",
      needNameError: "Enter your name before locking the ballot.",
      votingClosedError: "Voting is currently closed by the room host.",
      incompleteError: "Complete the full ranking before submitting.",
      submitError: "Unable to lock the ballot right now.",
      submitSuccess: "Ballot locked for this stage. This order is now official.",
      exactPlacement: "Exact placement",
      exactPlacementText: "Pick the exact place and the rest of the order shifts automatically.",
      higher: "Higher",
      lower: "Lower",
      openFullOrder: "Open my full order",
      quickFacts: "Quick facts",
      currentPlace: "Current place",
      noteSummary: "Note summary",
      notePlaceholder: "Add one short thought. Example: chorus lands harder live.",
      orderReady: "Order ready",
      roomLabel: "Room",
    },
    notes: {
      favorite: "Favorite",
      watch: "Watch",
      vocals: "Vocals",
      skip: "Skip",
    },
    acts: {
      heroKicker: "Artist companion",
      heroTitle: "Tap any performer, read the story, keep your place",
      heroDescription:
        "This is the fast phone-side artist guide. Open a profile during the show, check the context, then jump back into ranking whenever you want.",
      openVoteStudio: "Open vote studio",
      searchPlaceholder: "Search by artist, country, or song",
      loadError: "Unable to load the acts directory right now.",
      roomLabel: "Room",
      currentPlace: "Current place",
      runningOrder: (value: number) => `Running #${value}`,
      noteSummaryPrefix: "My note",
      aboutArtist: "About the artist",
      stageMetaLabel: "Show context",
      noteSavedLocally: "This note is already saved on this device.",
    },
    live: {
      projectorMode: "Projector mode",
      title: "Broadcast board for the room",
      description:
        "Use this URL on a TV or projector. Revealed acts climb into the standings with the same motion language as the player leaderboard.",
      revealed: "Revealed",
      display: "Display",
      displayReady: "External screen ready",
      loadError: "Unable to load the live stage board.",
      positionRevealed: "Position revealed",
      waitingReveal: "Waiting to be revealed",
    },
    players: {
      kicker: "Room leaderboard",
      title: "Who is calling the scoreboard best",
      description:
        "This page is the dedicated standings screen for phones, laptops, and projector views. It uses the same movement graphics as the live act results board.",
      playersLabel: "Players",
      leaderLabel: "Leader",
      liveLabel: "Live",
      noPlayersYet: "No players yet",
      exactMatches: (count: number) => `${count} exact matches`,
      pointsLabel: "Points",
      loadError: "Unable to load the players board.",
    },
    movement: {
      steady: "Steady",
      up: (value: number) => `Up ${value}`,
      down: (value: number) => `Down ${value}`,
    },
    act: {
      artistFact: (artist: string) => `Artist: ${artist}`,
      songFact: (song: string) => `Song: "${song}"`,
      runningOrderFact: (value: number, stageLabel: string) => `Running order: #${value} in ${stageLabel}`,
      blurb: (artist: string, country: string, song: string) => `${artist} represents ${country} with "${song}".`,
      roadToFinal: "Road to the final",
      selectionPath: "Selection path",
      qualifiedSemi1: "Qualified through Semi-final 1",
      qualifiedSemi2: "Qualified through Semi-final 2",
      automaticFinalist: "Automatic finalist",
      nationalSelectionPlaceholder: (country: string) => `National selection result can be added for ${country}.`,
    },
  },
} as const;

const COUNTRY_NAMES: Record<string, Record<Language, string>> = {
  AL: { ru: "Албания", en: "Albania" },
  AM: { ru: "Армения", en: "Armenia" },
  AT: { ru: "Австрия", en: "Austria" },
  AU: { ru: "Австралия", en: "Australia" },
  AZ: { ru: "Азербайджан", en: "Azerbaijan" },
  BE: { ru: "Бельгия", en: "Belgium" },
  BG: { ru: "Болгария", en: "Bulgaria" },
  CH: { ru: "Швейцария", en: "Switzerland" },
  CY: { ru: "Кипр", en: "Cyprus" },
  CZ: { ru: "Чехия", en: "Czechia" },
  DE: { ru: "Германия", en: "Germany" },
  DK: { ru: "Дания", en: "Denmark" },
  EE: { ru: "Эстония", en: "Estonia" },
  ES: { ru: "Испания", en: "Spain" },
  FI: { ru: "Финляндия", en: "Finland" },
  FR: { ru: "Франция", en: "France" },
  GB: { ru: "Великобритания", en: "United Kingdom" },
  GE: { ru: "Грузия", en: "Georgia" },
  GR: { ru: "Греция", en: "Greece" },
  HR: { ru: "Хорватия", en: "Croatia" },
  IE: { ru: "Ирландия", en: "Ireland" },
  IL: { ru: "Израиль", en: "Israel" },
  IS: { ru: "Исландия", en: "Iceland" },
  IT: { ru: "Италия", en: "Italy" },
  LT: { ru: "Литва", en: "Lithuania" },
  LU: { ru: "Люксембург", en: "Luxembourg" },
  LV: { ru: "Латвия", en: "Latvia" },
  MA: { ru: "Марокко", en: "Morocco" },
  MD: { ru: "Молдова", en: "Moldova" },
  ME: { ru: "Черногория", en: "Montenegro" },
  MT: { ru: "Мальта", en: "Malta" },
  NL: { ru: "Нидерланды", en: "Netherlands" },
  NO: { ru: "Норвегия", en: "Norway" },
  PL: { ru: "Польша", en: "Poland" },
  PT: { ru: "Португалия", en: "Portugal" },
  RO: { ru: "Румыния", en: "Romania" },
  RS: { ru: "Сербия", en: "Serbia" },
  SE: { ru: "Швеция", en: "Sweden" },
  SI: { ru: "Словения", en: "Slovenia" },
  SM: { ru: "Сан-Марино", en: "San Marino" },
  UA: { ru: "Украина", en: "Ukraine" },
};

const ROOM_META: Record<string, { tagline: Record<Language, string>; cityLabel: Record<Language, string> }> = {
  "neon-arena": {
    tagline: {
      ru: "Евровидение у Морозовых 2026",
      en: "Morozov Eurovision 2026",
    },
    cityLabel: {
      ru: "Общий эфир из разных городов",
      en: "Shared watch party across cities",
    },
  },
};

export function getCopy(language: Language) {
  return COPY[language];
}

export function getStageLabel(language: Language, stageKey: StageKey) {
  return COPY[language].stageLabels[stageKey];
}

export function getBoardLabel(language: Language, boardKey: BoardKey) {
  return COPY[language].boardLabels[boardKey];
}

export function getCountryName(language: Language, code: string, fallback: string) {
  return COUNTRY_NAMES[code]?.[language] || fallback;
}

export function getRoomTagline(language: Language, roomSlug: string, fallback: string) {
  return ROOM_META[roomSlug]?.tagline[language] || fallback;
}

export function getRoomCityLabel(language: Language, roomSlug: string, fallback: string) {
  return ROOM_META[roomSlug]?.cityLabel[language] || fallback;
}

export function getLocalizedActFacts(language: Language, act: ActEntry) {
  if (act.factsLocalized?.[language]?.length) {
    return act.factsLocalized[language];
  }

  const copy = getCopy(language);
  const stageLabel = getStageLabel(language, act.stageKey);
  return [
    copy.act.artistFact(act.artist),
    copy.act.songFact(act.song),
    act.runningOrder
      ? copy.act.runningOrderFact(act.runningOrder, stageLabel)
      : language === "ru"
        ? `Этап: ${stageLabel}`
        : `Stage: ${stageLabel}`,
  ];
}

export function getLocalizedActBlurb(language: Language, act: ActEntry) {
  if (act.blurbLocalized?.[language]) {
    return act.blurbLocalized[language];
  }

  const copy = getCopy(language);
  const country = getCountryName(language, act.code, act.country);
  return copy.act.blurb(act.artist, country, act.song);
}

export function getLocalizedActContext(language: Language, act: ActEntry) {
  if (act.stageKey === "final" && act.semiResultLocalized?.[language]) {
    return {
      label: getCopy(language).act.roadToFinal,
      value: act.semiResultLocalized[language],
    };
  }

  if (act.stageKey === "final" && act.semiResult != null) {
    return {
      label: getCopy(language).act.roadToFinal,
      value: language === "ru"
        ? `Занял #${act.semiResult} в полуфинале`
        : `Finished #${act.semiResult} in the semi-final`,
    };
  }

  if (act.contextLocalized) {
    return {
      label: act.contextLocalized.label[language],
      value: act.contextLocalized.value[language],
    };
  }

  const copy = getCopy(language);
  const country = getCountryName(language, act.code, act.country);

  if (act.stageKey === "final") {
    let value = act.contextValue;
    if (act.contextValue === "Qualified through Semi-final 1") {
      value = copy.act.qualifiedSemi1;
    } else if (act.contextValue === "Qualified through Semi-final 2") {
      value = copy.act.qualifiedSemi2;
    } else if (act.contextValue === "Automatic finalist") {
      value = copy.act.automaticFinalist;
    }

    return {
      label: copy.act.roadToFinal,
      value,
    };
  }

  return {
    label: copy.act.selectionPath,
    value: copy.act.nationalSelectionPlaceholder(country),
  };
}
