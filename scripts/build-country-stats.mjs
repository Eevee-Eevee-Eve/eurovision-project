import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceUrl = "https://github.com/Spijkervet/eurovision-dataset/releases/download/2023/contestants.csv";
const sourcePath = path.join(root, "frontend/data/eurovision-contestants-1956-2023.csv");
const outputPath = path.join(root, "frontend/lib/eurovision-country-stats.ts");
const publicRoot = path.join(root, "frontend/public/stats-assets");
const flagsDir = path.join(publicRoot, "flags");
const highlightsDir = path.join(publicRoot, "highlights");
const heroDir = path.join(publicRoot, "country-heroes");

const COUNTRY_CODES = {
  Albania: "AL",
  Andorra: "AD",
  Armenia: "AM",
  Australia: "AU",
  Austria: "AT",
  Azerbaijan: "AZ",
  Belarus: "BY",
  Belgium: "BE",
  "Bosnia and Herzegovina": "BA",
  Bulgaria: "BG",
  Croatia: "HR",
  Cyprus: "CY",
  Czechia: "CZ",
  Denmark: "DK",
  Estonia: "EE",
  Finland: "FI",
  France: "FR",
  Georgia: "GE",
  Germany: "DE",
  Greece: "GR",
  Hungary: "HU",
  Iceland: "IS",
  Ireland: "IE",
  Israel: "IL",
  Italy: "IT",
  Latvia: "LV",
  Lithuania: "LT",
  Luxembourg: "LU",
  Malta: "MT",
  Moldova: "MD",
  Monaco: "MC",
  Montenegro: "ME",
  Morocco: "MA",
  Netherlands: "NL",
  "North Macedonia": "MK",
  Norway: "NO",
  Poland: "PL",
  Portugal: "PT",
  Romania: "RO",
  Russia: "RU",
  "San Marino": "SM",
  Serbia: "RS",
  "Serbia and Montenegro": "CS",
  Slovakia: "SK",
  Slovenia: "SI",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Turkey: "TR",
  Ukraine: "UA",
  "United Kingdom": "GB",
  Yugoslavia: "YU",
};

const NAME_FIXES = new Map([
  ["Bosnia & Herzegovina", "Bosnia and Herzegovina"],
  ["Czech Republic", "Czechia"],
  ["North MacedoniaN.Macedonia", "North Macedonia"],
  ["Serbia & Montenegro", "Serbia and Montenegro"],
]);

const FORMER_COUNTRIES = new Set(["CS", "YU"]);

const FORMER_FLAG_SVGS = {
  CS: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><path fill="#0033a0" d="M0 0h3v2H0z"/><path fill="#fff" d="M0 0h3v1.33H0z"/><path fill="#d71920" d="M0 0h3v.67H0z"/></svg>`,
  YU: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><path fill="#003893" d="M0 0h3v2H0z"/><path fill="#fff" d="M0 0h3v.67H0z"/><path fill="#de0000" d="M0 1.33h3V2H0z"/><path fill="#de0000" d="m1.5 .54.14.42h.44l-.36.26.14.42-.36-.26-.36.26.14-.42-.36-.26h.44z"/></svg>`,
};

const MANUAL_FINALS = [
  // 2024 final
  ["CH", "Switzerland", "Nemo", "The Code", 2024, 1, "https://www.youtube.com/watch?v=CO_qJf-nW0k"],
  ["HR", "Croatia", "Baby Lasagna", "Rim Tim Tagi Dim", 2024, 2, "https://www.youtube.com/watch?v=EBsgTJQFl9k"],
  ["UA", "Ukraine", "alyona alyona & Jerry Heil", "Teresa & Maria", 2024, 3, "https://www.youtube.com/watch?v=k_8cNbF8FLI"],
  ["FR", "France", "Slimane", "Mon amour", 2024, 4, "https://www.youtube.com/watch?v=tfoOop2HXxQ"],
  ["IL", "Israel", "Eden Golan", "Hurricane", 2024, 5, "https://www.youtube.com/watch?v=lJYn09tuPw4"],
  ["IE", "Ireland", "Bambie Thug", "Doomsday Blue", 2024, 6, "https://www.youtube.com/watch?v=BNc5zTYkTaQ"],
  ["IT", "Italy", "Angelina Mango", "La noia", 2024, 7, "https://www.youtube.com/watch?v=OKzWskcTTA8"],
  ["AM", "Armenia", "Ladaniva", "Jako", 2024, 8, "https://www.youtube.com/watch?v=_6xfmW0Fc40"],
  ["SE", "Sweden", "Marcus & Martinus", "Unforgettable", 2024, 9, "https://www.youtube.com/watch?v=yekc8t0rJqA"],
  ["PT", "Portugal", "iolanda", "Grito", 2024, 10, "https://www.youtube.com/watch?v=K5wDGhcDSpQ"],
  ["GR", "Greece", "Marina Satti", "ZARI", 2024, 11, "https://www.youtube.com/watch?v=ENm1kkjM1tU"],
  ["DE", "Germany", "ISAAK", "Always on the Run", 2024, 12, "https://www.youtube.com/watch?v=twhq3S4YHdQ"],
  ["LU", "Luxembourg", "Tali", "Fighter", 2024, 13, "https://www.youtube.com/watch?v=Hk22kcBREgE"],
  ["LT", "Lithuania", "Silvester Belt", "Luktelk", 2024, 14, "https://www.youtube.com/watch?v=OrL668EQRu0"],
  ["CY", "Cyprus", "Silia Kapsis", "Liar", 2024, 15, "https://www.youtube.com/watch?v=8q5QozrtEPA"],
  ["LV", "Latvia", "Dons", "Hollow", 2024, 16, "https://www.youtube.com/watch?v=p8d_iE_5j18"],
  ["RS", "Serbia", "Teya Dora", "Ramonda", 2024, 17, "https://www.youtube.com/watch?v=O1iY93CqN1E"],
  ["GB", "United Kingdom", "Olly Alexander", "Dizzy", 2024, 18, "https://www.youtube.com/watch?v=mvs92WfR8lM"],
  ["FI", "Finland", "Windows95man", "No Rules!", 2024, 19, "https://www.youtube.com/watch?v=Tf1NS1vEhSg"],
  ["EE", "Estonia", "5MIINUST x Puuluup", "(nendest) narkootikumidest ei tea me (küll) midagi", 2024, 20, "https://www.youtube.com/watch?v=RSMMU2wX0Bk"],
  ["GE", "Georgia", "Nutsa Buzaladze", "Firefighter", 2024, 21, "https://www.youtube.com/watch?v=iq6d7D4O4pY"],
  ["ES", "Spain", "Nebulossa", "ZORRA", 2024, 22, "https://www.youtube.com/watch?v=K5HnZxWGlDk"],
  ["SI", "Slovenia", "Raiven", "Veronika", 2024, 23, "https://www.youtube.com/watch?v=uWcSsi7SliI"],
  ["AT", "Austria", "Kaleen", "We Will Rave", 2024, 24, "https://www.youtube.com/watch?v=Kqda15G4T-4"],
  ["NO", "Norway", "Gåte", "Ulveham", 2024, 25, "https://www.youtube.com/watch?v=UipzszlJwRQ"],
  // 2025 final
  ["AT", "Austria", "JJ", "Wasted Love", 2025, 1, "https://www.youtube.com/watch?v=-ieSTNpxvio"],
  ["IL", "Israel", "Yuval Raphael", "New Day Will Rise", 2025, 2, "https://www.youtube.com/watch?v=Q3BELu4z6-U"],
  ["EE", "Estonia", "Tommy Cash", "Espresso Macchiato", 2025, 3, "https://www.youtube.com/watch?v=5MS_Fczs_98"],
  ["SE", "Sweden", "KAJ", "Bara bada bastu", 2025, 4, "https://www.youtube.com/watch?v=ad9E9xM9yIg"],
  ["IT", "Italy", "Lucio Corsi", "Volevo essere un duro", 2025, 5, "https://www.youtube.com/watch?v=R0-i6L8IO98"],
  ["GR", "Greece", "Klavdia", "Asteromata", 2025, 6, "https://www.youtube.com/watch?v=4kQrA-O4Y4I"],
  ["FR", "France", "Louane", "maman", 2025, 7, "https://www.youtube.com/watch?v=Z2G3lYxS5fQ"],
  ["AL", "Albania", "Shkodra Elektronike", "Zjerm", 2025, 8, "https://www.youtube.com/watch?v=RNTDq2YJj6w"],
  ["UA", "Ukraine", "Ziferblat", "Bird of Pray", 2025, 9, "https://www.youtube.com/watch?v=8NgE_D3_xLE"],
  ["CH", "Switzerland", "Zoë Më", "Voyage", 2025, 10, "https://www.youtube.com/watch?v=D1AJplpU__E"],
  ["FI", "Finland", "Erika Vikman", "ICH KOMME", 2025, 11, "https://www.youtube.com/watch?v=Kg3QoTpnqyw"],
  ["NL", "Netherlands", "Claude", "C'est La Vie", 2025, 12, "https://www.youtube.com/watch?v=WbJ1cT-5vuc"],
  ["PL", "Poland", "Justyna Steczkowska", "GAJA", 2025, 13, "https://www.youtube.com/watch?v=Eyk9p4h1ueI"],
  ["SM", "San Marino", "Gabry Ponte", "Tutta L'Italia", 2025, 14, "https://www.youtube.com/watch?v=B0uJ_7f6f0o"],
  ["LV", "Latvia", "Tautumeitas", "Bur man laimi", 2025, 15, "https://www.youtube.com/watch?v=77No1avkSLs"],
  ["AM", "Armenia", "PARG", "SURVIVOR", 2025, 16, "https://www.youtube.com/watch?v=Ff1iPq-yP8k"],
  ["PT", "Portugal", "NAPA", "Deslocado", 2025, 17, "https://www.youtube.com/watch?v=jyLHgOKNfGI"],
  ["LU", "Luxembourg", "Laura Thorn", "La poupée monte le son", 2025, 18, "https://www.youtube.com/watch?v=TH3s2zkYh3Y"],
  ["MT", "Malta", "Miriana Conte", "SERVING", 2025, 19, "https://www.youtube.com/watch?v=8yAP8r0Edh4"],
  ["GB", "United Kingdom", "Remember Monday", "What The Hell Just Happened?", 2025, 20, "https://www.youtube.com/watch?v=J6jZ3N5y6Fo"],
  ["DE", "Germany", "Abor & Tynna", "Baller", 2025, 21, "https://www.youtube.com/watch?v=Eqd4fVYB6oA"],
  ["LT", "Lithuania", "Katarsis", "Tavo akys", 2025, 22, "https://www.youtube.com/watch?v=R3D-r4ogr7s"],
  ["NO", "Norway", "Kyle Alessandro", "Lighter", 2025, 23, "https://www.youtube.com/watch?v=ZtY1oLJdZOs"],
  ["DK", "Denmark", "Sissal", "Hallucination", 2025, 24, "https://www.youtube.com/watch?v=fQJ2qzzrx80"],
  ["ES", "Spain", "Melody", "Esa diva", 2025, 25, "https://www.youtube.com/watch?v=3F2rM8DQaWk"],
  ["IS", "Iceland", "VÆB", "RÓA", 2025, 26, "https://www.youtube.com/watch?v=GzE88IYzXLI"],
];

const COUNTRY_HERO_PHOTOS = {
  AT: {
    url: "https://storage.googleapis.com/eurovision-com.appspot.com/renditions/public/core_data/250508_corinne-cumming_ebu_00932_kczubtejpg/250508_Corinne-Cumming_EBU_00932_KCzuBte-fill_size%3D2560x1600-focal_point%3D2927x3041-focal_size%3D1024x1290-fill_size%3D2560x1600-focal_point%3D2927x3041-focal_size%3D1024x1290.jpg",
    credit: "Corinne Cumming / EBU",
    source: "https://www.eurovision.com/eurovision-song-contest/basel-2025/all-participants/jj/",
  },
  CH: {
    url: "https://storage.googleapis.com/eurovision-com.appspot.com/renditions/public/cms/01-0524-corinne-cumming-ebu-8814jpg/01-05.24%20Corinne%20Cumming%20-%20EBU%208814-fill_size%3D2560x1600.jpg",
    credit: "Corinne Cumming / EBU",
    source: "https://www.eurovision.com/eurovision-song-contest/malmo-2024/all-participants/nemo/",
  },
  DK: {
    url: "https://storage.googleapis.com/eurovision-com.appspot.com/renditions/public/core_data/deforest2_effected-cropped_t35d8jpjpg/deforest2_effected-cropped_t35D8jp-fill_size%3D2560x1600.jpg",
    credit: "EBU",
    source: "https://www.eurovision.com/eurovision-song-contest/malmo-2013/all-participants/emmelie-de-forest-1/",
  },
  IL: {
    url: "https://storage.googleapis.com/eurovision-com.appspot.com/renditions/public/core_data/sites/default/files/israeljpg/Israel-fill_size%3D2560x1600.jpg",
    credit: "EBU",
    source: "https://www.eurovision.com/eurovision-song-contest/lisbon-2018/all-participants/netta-1/",
  },
  IT: {
    url: "https://storage.googleapis.com/eurovision-com.appspot.com/renditions/public/cms/gabriele-giussani02-pref_ccjtxnw-copyjpg/GABRIELE%20GIUSSANI%2802%29%20pref_ccJtXnW%20copy-fill_size%3D2560x1600-fill_size%3D2560x1600.jpg",
    credit: "Gabriele Giussani / EBU",
    source: "https://www.eurovision.com/eurovision-song-contest/rotterdam-2021/all-participants/maneskin-1/",
  },
  NL: {
    url: "https://storage.googleapis.com/eurovision-com.appspot.com/renditions/public/core_data/duncan-laurence-participant-profile_pcdmdkppng/Duncan%20Laurence%20participant%20profile_PCdmdkP-fill_size%3D2560x1600.png",
    credit: "EBU",
    source: "https://www.eurovision.com/eurovision-song-contest/tel-aviv-2019/all-participants/duncan-laurence-1/",
  },
  PT: {
    url: "https://storage.googleapis.com/eurovision-com.appspot.com/renditions/public/core_data/salvador_portugal_2017_ubllnuwjpg/salvador_portugal_2017_ubllnUW-fill_size%3D2560x1600.jpg",
    credit: "EBU",
    source: "https://www.eurovision.com/eurovision-song-contest/kyiv-2017/all-participants/salvador-sobral-1/",
  },
  SE: {
    url: "https://storage.googleapis.com/eurovision-com.appspot.com/renditions/public/core_data/2023_mtszxrc0503-corinne-cumming-ebu-2602jpg/2023_mTsZxrC.05.03%20Corinne%20Cumming%20-%20EBU-2602-fill_size%3D2560x1600.jpg",
    credit: "Corinne Cumming / EBU",
    source: "https://www.eurovision.com/eurovision-song-contest/liverpool-2023/all-participants/loreen/",
  },
  UA: {
    url: "https://storage.googleapis.com/eurovision-com.appspot.com/renditions/public/core_data/kalush-orchestra-ukraine-wide_0_9uszmefjpg/Kalush%20Orchestra%20-%20Ukraine%20WIDE_0_9uSzMEF-fill_size%3D2560x1600.jpg",
    credit: "EBU",
    source: "https://www.eurovision.com/eurovision-song-contest/turin-2022/all-participants/kalush-orchestra-1/",
  },
};

function heroExtension(url) {
  return url.split("?")[0].match(/\.(png|webp|jpe?g)(?:-|$|%)/i)?.[1]?.toLowerCase().replace("jpeg", "jpg") || "jpg";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function cleanCountryName(name) {
  return NAME_FIXES.get(name) || name;
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1] || null;
}

async function download(url, destination, minBytes = 900) {
  const response = await fetch(url);
  if (!response.ok) return false;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < minBytes) return false;
  await fsp.writeFile(destination, buffer);
  return true;
}

async function ensureAssets(country) {
  await fsp.mkdir(flagsDir, { recursive: true });
  await fsp.mkdir(highlightsDir, { recursive: true });
  await fsp.mkdir(heroDir, { recursive: true });

  const formerFlag = FORMER_FLAG_SVGS[country.code];
  const flagPath = path.join(flagsDir, `${country.code.toLowerCase()}.${formerFlag ? "svg" : "png"}`);
  try {
    await fsp.access(flagPath);
  } catch {
    if (formerFlag) {
      await fsp.writeFile(flagPath, formerFlag);
    } else {
      await download(`https://flagcdn.com/w160/${country.code.toLowerCase()}.png`, flagPath, 100);
    }
  }

  const youtubeId = extractYoutubeId(country.highlightVideoUrl);
  if (youtubeId) {
    const imagePath = path.join(highlightsDir, `${country.code.toLowerCase()}.jpg`);
    try {
      await fsp.access(imagePath);
    } catch {
      await download(`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`, imagePath);
    }
  }

  const hero = COUNTRY_HERO_PHOTOS[country.code];
  if (hero?.url) {
    const heroPath = path.join(heroDir, `${country.code.toLowerCase()}.${heroExtension(hero.url)}`);
    try {
      await fsp.access(heroPath);
    } catch {
      await download(hero.url, heroPath);
    }
  }
}

function buildCountries() {
  const text = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, "utf8") : globalThis.__contestantsCsv;
  const [header, ...rows] = parseCsv(text);
  const column = Object.fromEntries(header.map((name, index) => [name, index]));
  const entriesByYear = new Map();
  const countries = new Map();

  function addEntry(entry) {
    const country = cleanCountryName(entry.country);
    const code = entry.code || COUNTRY_CODES[country];
    if (!country || !code) return;

    const rank = numberOrNull(entry.rank);
    const year = numberOrNull(entry.year);
    if (!rank || !year) return;

    if (!entriesByYear.has(year)) entriesByYear.set(year, []);
    entriesByYear.get(year).push({ ...entry, country, code, rank, year });

    if (!countries.has(country)) {
      countries.set(country, {
        code,
        name: country,
        years: new Set(),
        ranks: [],
        rows: [],
      });
    }

    const bucket = countries.get(country);
    bucket.years.add(year);
    bucket.ranks.push(rank);
    bucket.rows.push({ ...entry, country, code, rank, year });
  }

  for (const row of rows) {
    const country = cleanCountryName(row[column.to_country]);
    const codeFromId = /^[a-z]{2}$/.test(row[column.to_country_id]) ? row[column.to_country_id].toUpperCase() : null;
    const rank = row[column.place_final] || row[column.place_contest];
    addEntry({
      code: codeFromId || COUNTRY_CODES[country],
      country,
      artist: row[column.performer],
      song: row[column.song],
      year: row[column.year],
      rank,
      videoUrl: row[column.youtube_url],
    });
  }

  for (const [code, country, artist, song, year, rank, videoUrl] of MANUAL_FINALS) {
    addEntry({ code, country, artist, song, year, rank, videoUrl });
  }

  const lastPlaceByYear = new Map(
    [...entriesByYear.entries()].map(([year, entries]) => [year, Math.max(...entries.map((entry) => entry.rank))]),
  );

  return [...countries.values()]
    .map((country) => {
      const best = [...country.rows].sort((left, right) => left.rank - right.rank || right.year - left.year)[0];
      const appearances = country.years.size;
      const wins = country.ranks.filter((rank) => rank === 1).length;
      const top10 = country.ranks.filter((rank) => rank <= 10).length;
      const lastPlaces = country.rows.filter((row) => row.rank === lastPlaceByYear.get(row.year)).length;
      const thirteenthPlaces = country.ranks.filter((rank) => rank === 13).length;
      const averageRank = country.ranks.reduce((sum, rank) => sum + rank, 0) / country.ranks.length;
      const years = [...country.years].sort((left, right) => left - right);
      const winYears = country.rows.filter((row) => row.rank === 1).map((row) => row.year).sort((left, right) => left - right);
      const code = country.code;
      const assetCode = code.toLowerCase();
      const hero = COUNTRY_HERO_PHOTOS[code];

      return {
        code,
        name: country.name,
        flagUrl: `/stats-assets/flags/${assetCode}.${FORMER_FLAG_SVGS[code] ? "svg" : "png"}`,
        former: FORMER_COUNTRIES.has(code) || undefined,
        highlightArtist: best.artist,
        highlightSong: best.song,
        highlightPhoto: extractYoutubeId(best.videoUrl) ? `/stats-assets/highlights/${assetCode}.jpg` : undefined,
        heroPhoto: hero ? `/stats-assets/country-heroes/${assetCode}.${heroExtension(hero.url)}` : undefined,
        heroPhotoCredit: hero?.credit,
        heroPhotoSource: hero?.source,
        highlightVideoUrl: best.videoUrl || undefined,
        highlightRank: best.rank,
        highlightYear: best.year,
        firstYear: years[0],
        latestYear: years[years.length - 1],
        winYears,
        top10Rate: Number(((top10 / appearances) * 100).toFixed(0)),
        appearances,
        wins,
        top10,
        lastPlaces,
        thirteenthPlaces,
        averageRank: Number(averageRank.toFixed(1)),
      };
    })
    .sort((left, right) => right.wins - left.wins || right.top10 - left.top10 || left.name.localeCompare(right.name));
}

if (!fs.existsSync(sourcePath)) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Unable to download Eurovision dataset: ${response.status}`);
  }
  globalThis.__contestantsCsv = await response.text();
}

const countries = buildCountries();
for (const country of countries) {
  await ensureAssets(country);
}

const exportCountries = countries.map(({ highlightVideoUrl, ...country }) => country);
const body = `// Generated by scripts/build-country-stats.mjs.
// Base data: Spijkervet/eurovision-dataset release 2023, with manual 2024-2025 final rows.

export type EurovisionCountryStat = {
  code: string;
  name: string;
  flagUrl: string;
  former?: boolean;
  highlightArtist?: string;
  highlightSong?: string;
  highlightPhoto?: string;
  heroPhoto?: string;
  heroPhotoCredit?: string;
  heroPhotoSource?: string;
  highlightRank?: number;
  highlightYear?: number;
  firstYear: number;
  latestYear: number;
  winYears: number[];
  top10Rate: number;
  appearances: number;
  wins: number;
  top10: number;
  lastPlaces: number;
  thirteenthPlaces: number;
  averageRank: number;
};

export const EUROVISION_COUNTRY_STATS: EurovisionCountryStat[] = ${JSON.stringify(exportCountries, null, 2)};
`;

await fsp.writeFile(outputPath, body);
console.log(`Wrote ${exportCountries.length} countries to ${path.relative(root, outputPath)}`);
