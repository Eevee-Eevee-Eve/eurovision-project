export function resolveMediaUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  if (value.startsWith("/")) {
    const envBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
    if (envBase) {
      return `${envBase.replace(/\/$/, "")}${value}`;
    }

    if (typeof window !== "undefined") {
      return `${window.location.protocol}//${window.location.hostname}:4000${value}`;
    }
  }

  return value;
}

function deriveActThumbnailUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const cleanValue = value.split(/[?#]/)[0];
  const match = cleanValue.match(/^(\/media\/acts\/2026\/)([^/]+)\.(?:jpe?g|png|webp)$/i);
  if (!match) {
    return null;
  }

  return `${match[1]}thumbs/${match[2]}.jpg`;
}

export function resolveActImageUrls(value?: string | null) {
  const full = resolveMediaUrl(value);
  const thumbnail = resolveMediaUrl(deriveActThumbnailUrl(value)) || full;

  return {
    full,
    thumbnail,
  };
}
