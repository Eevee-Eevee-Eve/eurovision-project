import type { Language } from "./i18n";
import type { EurovisionCountryStat } from "./eurovision-country-stats";

type LocalizedText = Record<Language, string>;

export type CountryMilestone = {
  year: string;
  title: LocalizedText;
  text: LocalizedText;
};

export type CountrySource = {
  label: string;
  href: string;
};

type CountryStoryOverride = {
  slug?: string;
  milestones?: CountryMilestone[];
  sources?: CountrySource[];
};

const COUNTRY_SLUGS: Record<string, string> = {
  GB: "united-kingdom",
  CZ: "czechia",
  BA: "bosnia-herzegovina",
  MK: "north-macedonia",
  SM: "san-marino",
};

const COUNTRY_STORY_OVERRIDES: Record<string, CountryStoryOverride> = {
  SE: {
    milestones: [
      {
        year: "1974",
        title: { ru: "ABBA меняют масштаб конкурса", en: "ABBA changes the scale" },
        text: {
          ru: "Waterloo сделала шведскую победу одной из самых узнаваемых точек всей истории Евровидения.",
          en: "Waterloo turned Sweden's win into one of the contest's most recognisable historic moments.",
        },
      },
      {
        year: "2023",
        title: { ru: "Loreen берет вторую победу", en: "Loreen wins again" },
        text: {
          ru: "Tattoo принесла Швеции седьмую победу и вывела страну в один ряд с рекордсменами конкурса.",
          en: "Tattoo gave Sweden a seventh win and put the country level with the contest record holders.",
        },
      },
    ],
  },
  IE: {
    milestones: [
      {
        year: "1992-1994",
        title: { ru: "Три победы подряд", en: "Three wins in a row" },
        text: {
          ru: "Ирландия собрала редкую серию: три победных года подряд и статус главной силы 90-х.",
          en: "Ireland built a rare streak: three winning years in a row and a dominant 1990s reputation.",
        },
      },
    ],
  },
  IT: {
    milestones: [
      {
        year: "2011",
        title: { ru: "Возвращение в финал", en: "A serious comeback" },
        text: {
          ru: "После долгой паузы Италия вернулась и почти сразу снова стала одной из самых сильных стран финала.",
          en: "After a long break, Italy returned and quickly became one of the strongest final-night countries again.",
        },
      },
      {
        year: "2021",
        title: { ru: "Maneskin и новая волна", en: "Maneskin and a new wave" },
        text: {
          ru: "Zitti e buoni вернула Италии победу и сделала рок-группу международным символом конкурса.",
          en: "Zitti e buoni brought Italy back to the winner's circle and made the band a global Eurovision symbol.",
        },
      },
    ],
  },
  UA: {
    milestones: [
      {
        year: "2004",
        title: { ru: "Первая победа", en: "First win" },
        text: {
          ru: "Ruslana и Wild Dances быстро закрепили Украину как страну с сильной сценической идентичностью.",
          en: "Ruslana and Wild Dances quickly gave Ukraine a strong stage identity in the contest.",
        },
      },
      {
        year: "2022",
        title: { ru: "Победа Kalush Orchestra", en: "Kalush Orchestra win" },
        text: {
          ru: "Stefania стала одной из самых эмоциональных побед современной истории конкурса.",
          en: "Stefania became one of the most emotional wins in modern Eurovision history.",
        },
      },
    ],
  },
  LU: {
    milestones: [
      {
        year: "2024",
        title: { ru: "Возвращение после 31 года", en: "Return after 31 years" },
        text: {
          ru: "Люксембург снова вышел на сцену после паузы с 1993 года и вернул в конкурс одну из старых держав.",
          en: "Luxembourg returned after being absent since 1993, bringing an old Eurovision power back to the stage.",
        },
      },
    ],
  },
  PT: {
    milestones: [
      {
        year: "2017",
        title: { ru: "Первая победа Португалии", en: "Portugal's first win" },
        text: {
          ru: "Salvador Sobral принес стране первую победу после десятилетий ожидания.",
          en: "Salvador Sobral delivered the country's first win after decades of waiting.",
        },
      },
    ],
  },
  ES: {
    milestones: [
      {
        year: "1969",
        title: { ru: "Победа в год четырех победителей", en: "A four-winner year" },
        text: {
          ru: "Испания стала частью уникального финала, где сразу четыре страны разделили первое место.",
          en: "Spain was part of the unique final where four countries shared first place.",
        },
      },
    ],
  },
  RS: {
    milestones: [
      {
        year: "2007",
        title: { ru: "Победа с первого самостоятельного выхода", en: "Winning on independent debut" },
        text: {
          ru: "Molitva принесла Сербии победу в первый же год самостоятельного участия.",
          en: "Molitva gave Serbia victory in its first year competing independently.",
        },
      },
    ],
  },
  AU: {
    milestones: [
      {
        year: "2015",
        title: { ru: "Австралия входит в конкурс", en: "Australia joins the contest" },
        text: {
          ru: "Гостевое участие быстро превратилось в полноценную историю страны на Евровидении.",
          en: "A guest appearance quickly became a full Eurovision story for the country.",
        },
      },
      {
        year: "2016",
        title: { ru: "Почти победа", en: "Almost a win" },
        text: {
          ru: "Dami Im подняла Австралию на второе место уже на раннем этапе участия.",
          en: "Dami Im took Australia to second place early in its Eurovision run.",
        },
      },
    ],
  },
  MA: {
    milestones: [
      {
        year: "1980",
        title: { ru: "Единственный выход Марокко", en: "Morocco's only entry" },
        text: {
          ru: "Марокко остается редким историческим эпизодом конкурса: одна заявка и отдельная строка в архиве.",
          en: "Morocco remains a rare contest chapter: one entry and a distinct line in the archive.",
        },
      },
    ],
  },
};

function getCountrySlug(country: EurovisionCountryStat) {
  return COUNTRY_STORY_OVERRIDES[country.code]?.slug
    || COUNTRY_SLUGS[country.code]
    || country.name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function formatYearList(years: number[], language: Language) {
  if (!years.length) {
    return language === "ru" ? "пока без побед" : "no wins yet";
  }

  return years.join(", ");
}

function getBestResultText(country: EurovisionCountryStat, language: Language) {
  if (country.highlightRank === 1) {
    return language === "ru"
      ? `Победа ${country.highlightYear}`
      : `${country.highlightYear} win`;
  }

  if (country.highlightRank) {
    return language === "ru"
      ? `Лучшее место: #${country.highlightRank}`
      : `Best place: #${country.highlightRank}`;
  }

  return language === "ru" ? "Лучший результат пока уточняется" : "Best result is still being shaped";
}

export function resolveCountryStatsParam(param: string, countries: EurovisionCountryStat[]) {
  const normalized = param.trim().toLowerCase();

  return countries.find((country) => {
    const slug = getCountrySlug(country);
    return country.code.toLowerCase() === normalized || country.name.toLowerCase() === normalized || slug === normalized;
  });
}

export function getCountryStory(country: EurovisionCountryStat, language: Language) {
  const override = COUNTRY_STORY_OVERRIDES[country.code];
  const milestones: CountryMilestone[] = [
    {
      year: String(country.firstYear),
      title: { ru: "Дебют на Евровидении", en: "Eurovision debut" },
      text: {
        ru: `Первая точка в архиве страны. Всего в базе сейчас ${country.appearances} участий.`,
        en: `The first point in the country's archive. The current database contains ${country.appearances} appearances.`,
      },
    },
  ];

  if (country.winYears.length) {
    const firstWin = country.winYears[0];
    const lastWin = country.winYears[country.winYears.length - 1];

    milestones.push({
      year: firstWin === lastWin ? String(firstWin) : `${firstWin}+`,
      title: { ru: "Победные годы", en: "Winning years" },
      text: {
        ru: `Побед: ${country.wins}. Годы: ${formatYearList(country.winYears, "ru")}. Это важная линия страны в общей таблице конкурса.`,
        en: `${country.wins} wins. Years: ${formatYearList(country.winYears, "en")}. This is the country's main winning line in the wider contest table.`,
      },
    });
  }

  if (country.highlightArtist && country.highlightYear) {
    milestones.push({
      year: String(country.highlightYear),
      title: { ru: "Лучший ориентир карточки", en: "Featured high point" },
      text: {
        ru: `${country.highlightArtist}${country.highlightSong ? ` · ${country.highlightSong}` : ""}: ${getBestResultText(country, "ru")}.`,
        en: `${country.highlightArtist}${country.highlightSong ? ` · ${country.highlightSong}` : ""}: ${getBestResultText(country, "en")}.`,
      },
    });
  }

  if (country.top10Rate >= 55) {
    milestones.push({
      year: `${country.top10Rate}%`,
      title: { ru: "Стабильная верхняя группа", en: "Reliable upper table" },
      text: {
        ru: `Топ-10 случался ${country.top10} раз. Для прогнозов это страна, которую опасно недооценивать.`,
        en: `Top 10 happened ${country.top10} times. In predictions, this is a country that is risky to underrate.`,
      },
    });
  } else if (country.lastPlaces >= 4) {
    milestones.push({
      year: String(country.lastPlaces),
      title: { ru: "Нервный низ таблицы", en: "Nervy lower table" },
      text: {
        ru: `Последних мест: ${country.lastPlaces}. История страны полезна для тех, кто любит искать рискованные прогнозы.`,
        en: `${country.lastPlaces} last places. The record is useful for players who like risky predictions.`,
      },
    });
  } else if (country.thirteenthPlaces >= 3) {
    milestones.push({
      year: "13",
      title: { ru: "Любовь к пограничным местам", en: "Borderline specialist" },
      text: {
        ru: `13-е место встречалось ${country.thirteenthPlaces} раза. Не легенда, но очень удобный мем для статистики.`,
        en: `13th place appeared ${country.thirteenthPlaces} times. Not a legend, but a useful stats meme.`,
      },
    });
  }

  const combinedMilestones = [...milestones, ...(override?.milestones || [])].sort((left, right) => {
    const leftYear = Number.parseInt(left.year, 10);
    const rightYear = Number.parseInt(right.year, 10);
    if (Number.isNaN(leftYear) || Number.isNaN(rightYear)) return 0;
    return leftYear - rightYear;
  });

  const sources: CountrySource[] = [
    {
      label: "Eurovision country profile",
      href: `https://www.eurovision.com/eurovision-song-contest/countries/${getCountrySlug(country)}/`,
    },
    {
      label: "Eurovision winners archive",
      href: "https://www.eurovisionworld.com/eurovision",
    },
    ...(country.heroPhotoSource ? [{ label: "Featured artist profile", href: country.heroPhotoSource }] : []),
    ...(override?.sources || []),
  ];

  return {
    bestResult: getBestResultText(country, language),
    winYears: formatYearList(country.winYears, language),
    milestones: combinedMilestones,
    sources,
  };
}
