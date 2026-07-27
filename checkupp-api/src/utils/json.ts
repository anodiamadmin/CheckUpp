export const parseJsonIfString = <T>(value: unknown): T | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value as T;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
};

export const ensureArray = <T>(value: unknown): T[] => {
  const parsed = parseJsonIfString<T[]>(value);
  return Array.isArray(parsed) ? parsed : [];
};

export const ensureObject = <T extends Record<string, unknown>>(value: unknown): T => {
  const parsed = parseJsonIfString<T>(value);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed;
  }

  return {} as T;
};
