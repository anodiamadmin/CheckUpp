import { useToast } from "@/components/ToastProvider";
import {
  QueryKey,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { DependencyList, useEffect, useMemo, useRef } from "react";

type RefetchOnMountOption = boolean | "always";

interface UseApiQueryOptions<TData> {
  enabled?: boolean;
  deps?: DependencyList;
  initialData?: TData;
  showErrorToast?: boolean;
  queryKey?: QueryKey;
  staleTime?: number;
  gcTime?: number;
  refetchOnMount?: RefetchOnMountOption;
}

type DataUpdater<TData> = TData | ((previousData: TData | undefined) => TData);

const normalizeQueryKeyPart = (value: unknown) => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const useApiQuery = <TData = any>(
  fn: () => Promise<TData>,
  options: UseApiQueryOptions<TData> = {},
) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const {
    enabled = true,
    deps = [],
    initialData,
    showErrorToast = true,
    queryKey,
    staleTime = 30_000,
    gcTime = 5 * 60_000,
    refetchOnMount,
  } = options;

  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const toastRef = useRef(showToast);
  useEffect(() => {
    toastRef.current = showToast;
  }, [showToast]);

  const resolvedQueryKey = useMemo<QueryKey>(() => {
    if (queryKey) return queryKey;
    return ["useApiQuery", ...deps.map(normalizeQueryKeyPart)];
    // `deps` intentionally drives the generated query key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, ...deps]);

  const query = useQuery<TData>({
    queryKey: resolvedQueryKey,
    queryFn: async () => fnRef.current(),
    enabled,
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime,
    gcTime,
    ...(refetchOnMount !== undefined ? { refetchOnMount } : {}),
  });

  useEffect(() => {
    if (!showErrorToast || !query.error) return;
    const errorMessage =
      query.error instanceof Error
        ? query.error.message
        : "An unexpected error occurred";
    toastRef.current(errorMessage, "error");
  }, [query.error, showErrorToast]);

  const setData = (updater: DataUpdater<TData>) => {
    queryClient.setQueryData<TData>(resolvedQueryKey, (previousData) =>
      typeof updater === "function"
        ? (updater as (previousData: TData | undefined) => TData)(previousData)
        : updater,
    );
  };

  const setLoading = (_value: boolean) => {
    // TanStack Query controls loading state from network lifecycle.
  };

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: resolvedQueryKey,
      exact: true,
    });

  return {
    data: query.data,
    // Treat cached/background refetches as non-blocking so screens don't flash
    // full-screen loaders when data is already available.
    loading: query.isPending,
    fetching: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    setLoading,
    setData,
    invalidate,
    queryKey: resolvedQueryKey,
    query: query as UseQueryResult<TData>,
  };
};

export type { DataUpdater, UseApiQueryOptions };
export default useApiQuery;
