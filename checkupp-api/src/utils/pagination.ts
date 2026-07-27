export interface PaginationInput {
  page: number;
  pageSize: number;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const toPositiveInt = (value: unknown, fallback: number) => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) return fallback;

  const normalized = Math.trunc(parsed);
  return normalized >= 1 ? normalized : fallback;
};

export const toSkipTake = (input: PaginationInput) => {
  const page = toPositiveInt(input.page, 1);
  const pageSize = Math.min(200, toPositiveInt(input.pageSize, 20));

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
};

export const withPagination = (
  input: PaginationInput,
  total: number,
): PaginationResult => {
  const page = toPositiveInt(input.page, 1);
  const pageSize = toPositiveInt(input.pageSize, 20);

  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};
