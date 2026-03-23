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
