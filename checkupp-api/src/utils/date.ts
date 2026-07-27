export const toDate = (value?: string | Date | null): Date | undefined | null => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }

  return parsed;
};

export const addMonths = (source: Date, months: number): Date => {
  const next = new Date(source);
  const wholeMonths = Math.trunc(months);
  const monthRemainder = months - wholeMonths;

  next.setMonth(next.getMonth() + wholeMonths);

  if (monthRemainder !== 0) {
    next.setDate(next.getDate() + Math.round(monthRemainder * 30));
  }

  return next;
};

export const addDays = (source: Date, days: number): Date => {
  const next = new Date(source);
  next.setDate(next.getDate() + days);
  return next;
};
