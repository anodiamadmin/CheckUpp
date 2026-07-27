const asDate = (value?: string | Date | null) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDate = (value?: string | Date | null) => {
  const date = asDate(value);
  if (!date) return "N/A";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const formatDateTime = (value?: string | Date | null) => {
  const date = asDate(value);
  if (!date) return "N/A";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
