import { NextRequest, NextResponse } from "next/server";

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const VIDEO_ID_PATTERN = /"videoId":"([A-Za-z0-9_-]{11})"/;
const WATCH_URL_PATTERN = /watch\?v=([A-Za-z0-9_-]{11})/;

function buildSearchUrl(artist: string, song: string, country: string) {
  const query = [artist, song, country, "Eurovision 2026 live"]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function sanitizeExternalUrl(input: string | null) {
  if (!input) return null;

  try {
    const url = new URL(input);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    if (!YOUTUBE_HOSTS.has(url.hostname)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const artist = request.nextUrl.searchParams.get("artist")?.trim() || "";
  const song = request.nextUrl.searchParams.get("song")?.trim() || "";
  const country = request.nextUrl.searchParams.get("country")?.trim() || "";
  const explicitUrl = sanitizeExternalUrl(request.nextUrl.searchParams.get("url"));

  if (explicitUrl) {
    return NextResponse.redirect(explicitUrl);
  }

  const searchUrl = buildSearchUrl(artist, song, country);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const html = await response.text();
      const videoId =
        html.match(VIDEO_ID_PATTERN)?.[1] ||
        html.match(WATCH_URL_PATTERN)?.[1];

      if (videoId) {
        return NextResponse.redirect(`https://www.youtube.com/watch?v=${videoId}`);
      }
    }
  } catch {
    // Fall through to search results if YouTube result parsing fails.
  }

  return NextResponse.redirect(searchUrl);
}
