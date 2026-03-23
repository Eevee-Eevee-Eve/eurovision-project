import type { UiLanguage } from "./types";

type LegalConfig = {
  operatorName: string;
  operatorContact: string;
  dataRegion: string;
  retentionNotice: string;
  publicDisplayNotice: string;
  requiredStorage: Array<{
    key: string;
    type: string;
    purpose: string;
  }>;
};

const RAW_LEGAL_CONFIG = {
  operatorName: process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || "",
  operatorContact: process.env.NEXT_PUBLIC_OPERATOR_CONTACT?.trim() || "",
  dataRegion: process.env.NEXT_PUBLIC_DATA_REGION?.trim() || "",
  retentionNotice: process.env.NEXT_PUBLIC_DATA_RETENTION?.trim() || "",
  publicDisplayNotice: process.env.NEXT_PUBLIC_PUBLIC_DISPLAY_NOTICE?.trim() || "",
};

const LEGAL_DEFAULTS: Record<UiLanguage, Omit<LegalConfig, "requiredStorage">> = {
  ru: {
    operatorName: "Организатор текущего деплоя «Евровидение у Морозовых 2026»",
    operatorContact: "Свяжитесь с хостом комнаты через инвайт или канал координации этой Eurovision-вечеринки.",
    dataRegion: "Российская Федерация",
    retentionNotice:
      "Данные аккаунта, результаты комнаты и бюллетени хранятся до тех пор, пока организатор не сбросит комнату, пользователь не удалит аккаунт или сезон не будет отправлен в архив.",
    publicDisplayNotice:
      "Публичные таблицы и экран проектора показывают только выбранные поля публичного профиля: отображаемое имя, аватар, emoji-бейдж и очки комнаты.",
  },
  en: {
    operatorName: "The host operating Morozov Eurovision 2026",
    operatorContact: "Contact the room host through the invitation or event coordination channel used for this watch party.",
    dataRegion: "Configured by the deployment operator",
    retentionNotice:
      "Account data, room results, and ballots are kept until the operator resets the room, the user deletes the account, or the host archives the season.",
    publicDisplayNotice:
      "Public scoreboards and projector screens show only the chosen public profile fields: public name, avatar, emoji badge, and room scores.",
  },
};

const REQUIRED_STORAGE: Record<UiLanguage, LegalConfig["requiredStorage"]> = {
  ru: [
    {
      key: "esc_session",
      type: "HttpOnly cookie",
      purpose: "Поддерживает активную пользовательскую сессию между запросами и устройствами.",
    },
    {
      key: "esc_admin_session",
      type: "HttpOnly cookie",
      purpose: "Сохраняет админ-сессию control room после входа хоста.",
    },
    {
      key: "esc-ui-language",
      type: "localStorage",
      purpose: "Запоминает выбранный язык интерфейса на текущем устройстве.",
    },
    {
      key: "esc-room-ranking:{room}:{stage}",
      type: "localStorage",
      purpose: "Хранит локальный черновик рейтинга до официальной фиксации бюллетеня.",
    },
    {
      key: "esc-room-notes:{room}:{stage}",
      type: "localStorage",
      purpose: "Хранит личные заметки пользователя по артистам во время шоу.",
    },
    {
      key: "esc-compliance-notice-dismissed",
      type: "localStorage",
      purpose: "Запоминает, что notice об обязательном storage уже был закрыт.",
    },
  ],
  en: [
    {
      key: "esc_session",
      type: "HttpOnly cookie",
      purpose: "Keeps the signed-in account session active between requests and devices.",
    },
    {
      key: "esc_admin_session",
      type: "HttpOnly cookie",
      purpose: "Keeps the admin control room session active after the host authenticates.",
    },
    {
      key: "esc-ui-language",
      type: "localStorage",
      purpose: "Remembers the selected interface language on the current device.",
    },
    {
      key: "esc-room-ranking:{room}:{stage}",
      type: "localStorage",
      purpose: "Stores local draft rankings before a ballot is officially locked.",
    },
    {
      key: "esc-room-notes:{room}:{stage}",
      type: "localStorage",
      purpose: "Stores the viewer's private notes for acts during the show.",
    },
    {
      key: "esc-compliance-notice-dismissed",
      type: "localStorage",
      purpose: "Remembers that the required storage notice has already been dismissed.",
    },
  ],
};

function localizeConfiguredValue(
  language: UiLanguage,
  configured: string,
  enDefault: string,
  ruDefault: string,
  aliases: Array<{ en: string; ru: string }> = [],
) {
  if (!configured) {
    return language === "ru" ? ruDefault : enDefault;
  }

  if (language === "ru") {
    if (configured === enDefault) {
      return ruDefault;
    }

    const matchedAlias = aliases.find((entry) => entry.en === configured);
    if (matchedAlias) {
      return matchedAlias.ru;
    }
  }

  return configured;
}

export function getLegalConfig(language: UiLanguage): LegalConfig {
  const defaults = LEGAL_DEFAULTS[language];

  return {
    operatorName: RAW_LEGAL_CONFIG.operatorName || defaults.operatorName,
    operatorContact: RAW_LEGAL_CONFIG.operatorContact || defaults.operatorContact,
    dataRegion: localizeConfiguredValue(
      language,
      RAW_LEGAL_CONFIG.dataRegion,
      LEGAL_DEFAULTS.en.dataRegion,
      LEGAL_DEFAULTS.ru.dataRegion,
      [
        {
          en: "Russian Federation",
          ru: "Российская Федерация",
        },
      ],
    ),
    retentionNotice: localizeConfiguredValue(
      language,
      RAW_LEGAL_CONFIG.retentionNotice,
      LEGAL_DEFAULTS.en.retentionNotice,
      LEGAL_DEFAULTS.ru.retentionNotice,
      [
        {
          en: "Account data, ballots, and room standings are kept until the host resets the room or archives the season.",
          ru: "Данные аккаунта, бюллетени и таблицы комнаты хранятся до тех пор, пока хост не сбросит комнату или не отправит сезон в архив.",
        },
      ],
    ),
    publicDisplayNotice: localizeConfiguredValue(
      language,
      RAW_LEGAL_CONFIG.publicDisplayNotice,
      LEGAL_DEFAULTS.en.publicDisplayNotice,
      LEGAL_DEFAULTS.ru.publicDisplayNotice,
      [
        {
          en: "Public scoreboards show only the selected public profile fields: public name, avatar, emoji badge, and room scores.",
          ru: "Публичные таблицы показывают только выбранные поля публичного профиля: отображаемое имя, аватар, emoji-бейдж и очки комнаты.",
        },
      ],
    ),
    requiredStorage: REQUIRED_STORAGE[language],
  };
}

export function hasConfiguredLegalContact() {
  return Boolean(process.env.NEXT_PUBLIC_OPERATOR_CONTACT?.trim());
}

const LEGAL_COPY: Record<UiLanguage, {
  privacyTitle: string;
  privacyHeadline: string;
  privacyIntro: string;
  privacySections: Array<{ title: string; body: string }>;
  cookiesTitle: string;
  cookiesHeadline: string;
  cookiesIntro: string;
  cookiesRequiredTitle: string;
  cookiesRequiredBody: string;
  cookiesFutureTitle: string;
  cookiesFutureBody: string;
  complianceNotice: string;
  dismissNotice: string;
  accountConsentTitle: string;
  accountConsentText: string;
  accountConsentPrivacy: string;
  accountConsentPublic: string;
  accountConsentStorage: string;
  accountConsentTimeline: string;
  operatorLabel: string;
  contactLabel: string;
  regionLabel: string;
  retentionLabel: string;
  productionTip: string;
}> = {
  ru: {
    privacyTitle: "Конфиденциальность",
    privacyHeadline: "Политика обработки данных",
    privacyIntro:
      "Эта страница описывает, как текущий деплой «Евровидение у Морозовых 2026» обрабатывает данные аккаунта, публичные экранные имена и бюллетени голосования по полуфиналам и финалу.",
    privacySections: [
      {
        title: "Что хранит портал",
        body: "Сервис хранит данные аккаунта, настройки публичного профиля, участие в комнатах, бюллетени по этапам, расчёт очков и минимальные сессионные данные, которые нужны для работы голосования на телефонах, ноутбуках и экранных маршрутах.",
      },
      {
        title: "Аккаунт и профиль",
        body: "Аккаунт может содержать email, имя, фамилию, публичное отображаемое имя, emoji-бейдж, аватар, хеш пароля, отметки о согласиях и технические временные метки входа и обновления профиля. Email никогда не показывается на публичных таблицах.",
      },
      {
        title: "Голосование и данные комнаты",
        body: "Участие в комнате, ранжирование стран по этапам, статусы lock, breakdown итогов и сезонная таблица хранятся для честного проведения Semi-final 1, Semi-final 2 и Grand Final у всех подключённых зрителей.",
      },
      {
        title: "Публичное отображение",
        body: "__PUBLIC_DISPLAY_NOTICE__",
      },
      {
        title: "Управление своими данными",
        body: "На странице аккаунта пользователь может обновить имя и фамилию, сменить пароль, загрузить или удалить аватар, поменять режим публичного имени, отключить публичное отображение и полностью удалить аккаунт.",
      },
      {
        title: "РФ и Европа",
        body: "Для пользователей из РФ сервис рассматривает имя, фамилию, email, аватар и любые сочетания полей, по которым можно идентифицировать человека, как персональные данные. Для пользователей из Европы сервис строится вокруг необходимых storage-механизмов для работы и отдельного согласия на публичное отображение профиля.",
      },
    ],
    cookiesTitle: "Cookies",
    cookiesHeadline: "Cookies и локальное хранилище",
    cookiesIntro:
      "В текущем деплое используются только технически необходимые механизмы хранения. Аналитика, рекламные пиксели и маркетинговые cookies по умолчанию не включены.",
    cookiesRequiredTitle: "Только обязательные механизмы",
    cookiesRequiredBody:
      "Эти элементы хранения нужны, чтобы пользователь мог войти в аккаунт, продолжить черновик бюллетеня, сохранить язык интерфейса и дать хосту возможность безопасно вести лайв-результаты и админ-управление во время шоу.",
    cookiesFutureTitle: "Если появится трекинг",
    cookiesFutureBody:
      "Если позже будут добавлены аналитика, пиксели, экспериментальные инструменты или любая необязательная телеметрия, перед их запуском нужен отдельный consent-баннер с понятным выбором принять или отклонить.",
    complianceNotice:
      "Проект «Евровидение у Морозовых 2026» использует только обязательные cookie и localStorage для входа, сохранения черновиков, языка интерфейса и live-синхронизации комнаты.",
    dismissNotice: "Понятно",
    accountConsentTitle: "Согласия и публичный профиль",
    accountConsentText:
      "При регистрации пользователь подтверждает политику обработки данных. Отдельная настройка управляет тем, как профиль показывается на публичных таблицах и экранных маршрутах комнаты.",
    accountConsentPrivacy:
      "Согласие на политику обработки данных обязательно для создания аккаунта и работы сервиса.",
    accountConsentPublic:
      "Публичное отображение управляет тем, будет ли имя, аватар и emoji виден в live-таблицах и на проекторе.",
    accountConsentStorage:
      "Черновики бюллетеня и заметки сохраняются локально только на текущем устройстве, пока пользователь не отправит финальный ответ или не очистит данные браузера.",
    accountConsentTimeline:
      "Ниже показаны даты, когда был принят privacy policy и, при необходимости, отдельное согласие на публичное отображение профиля.",
    operatorLabel: "Оператор",
    contactLabel: "Контакт",
    regionLabel: "Регион хранения",
    retentionLabel: "Срок хранения",
    productionTip:
      "Перед публичным запуском задай `NEXT_PUBLIC_OPERATOR_CONTACT`, чтобы здесь показывался прямой контакт оператора.",
  },
  en: {
    privacyTitle: "Privacy",
    privacyHeadline: "Privacy Notice",
    privacyIntro:
      "This page explains how the current Morozov Eurovision 2026 deployment handles account data, public profile choices, and Eurovision ballots across both semi-finals and the final.",
    privacySections: [
      {
        title: "What the portal stores",
        body: "The service stores account credentials, public profile settings, room participation, stage ballots, score calculations, and the minimum session data required to keep voting working across phones, laptops, and display routes.",
      },
      {
        title: "Account and profile data",
        body: "Account records may contain email, first name, last name, public display name, emoji badge, avatar, password hash, consent timestamps, and technical timestamps for login and profile updates. Public scoreboards never show the private email address.",
      },
      {
        title: "Voting and room data",
        body: "Room participation, stage rankings, lock states, published result breakdowns, and the season standings are stored so the host can run Semi-final 1, Semi-final 2, and the Grand Final consistently for everyone connected.",
      },
      {
        title: "Public display",
        body: "__PUBLIC_DISPLAY_NOTICE__",
      },
      {
        title: "User controls",
        body: "From the account page, a user can update first and last name, change the password, upload or remove an avatar, switch public display mode, opt out of public display, or delete the account entirely.",
      },
      {
        title: "Russia and Europe",
        body: "For Russian users, the service treats first name, last name, email, avatar, and any identifying profile combination as personal data. For European users, the service is structured around required storage for operation and separate consent for public display choices.",
      },
    ],
    cookiesTitle: "Cookies",
    cookiesHeadline: "Cookies and Local Storage",
    cookiesIntro:
      "This deployment uses required storage only. Optional analytics, ad-tech, and marketing cookies are not enabled by default.",
    cookiesRequiredTitle: "Required mechanisms only",
    cookiesRequiredBody:
      "These storage entries exist so people can sign in, continue ballot drafts, preserve language choice, and let the host run live scoring and admin controls safely during the show.",
    cookiesFutureTitle: "If tracking is added later",
    cookiesFutureBody:
      "If analytics, pixels, experiments, or any optional telemetry are introduced later, the deployment should add a proper consent banner with clear accept and reject choices before those tools run.",
    complianceNotice:
      "Morozov Eurovision 2026 uses required cookies and local storage only for sign-in, ballot drafts, language choice, and live room synchronization.",
    dismissNotice: "Got it",
    accountConsentTitle: "Consents and public profile",
    accountConsentText:
      "Registration records consent to the privacy notice. A separate profile setting controls whether your chosen public name, avatar, and emoji are shown on scoreboards and projector screens.",
    accountConsentPrivacy:
      "Accepting the privacy notice is required to create an account and operate the service.",
    accountConsentPublic:
      "Public display controls whether your name, avatar, and emoji appear on live room boards and display routes.",
    accountConsentStorage:
      "Ballot drafts and notes are saved locally on the current device only, until the final ballot is submitted or the browser data is cleared.",
    accountConsentTimeline:
      "The timestamps below show when the privacy policy was accepted and, when applicable, when public display consent was recorded.",
    operatorLabel: "Operator",
    contactLabel: "Contact",
    regionLabel: "Storage region",
    retentionLabel: "Retention",
    productionTip:
      "Before public launch, set `NEXT_PUBLIC_OPERATOR_CONTACT` so this page shows a direct operator contact.",
  },
};

export function getLegalCopy(language: UiLanguage) {
  const legalConfig = getLegalConfig(language);
  const publicDisplayTitle = language === "ru" ? "Публичное отображение" : "Public display";

  return {
    ...LEGAL_COPY[language],
    privacySections: LEGAL_COPY[language].privacySections.map((section) => (
      section.title === publicDisplayTitle
        ? { ...section, body: legalConfig.publicDisplayNotice }
        : section
    )),
  };
}
