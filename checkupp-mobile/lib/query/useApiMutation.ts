import { useToast } from "@/components/ToastProvider";
import {
  MutationFunction,
  MutationKey,
  QueryKey,
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";

type InvalidateTarget =
  | QueryKey
  | {
      queryKey: QueryKey;
      exact?: boolean;
    };

type CacheUpdateParams<TData, TVariables> = {
  data: TData;
  variables: TVariables;
  queryClient: ReturnType<typeof useQueryClient>;
};

interface UseApiMutationOptions<
  TData,
  TVariables = void,
  TError = Error,
  TContext = unknown,
> extends Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  "mutationFn" | "mutationKey"
> {
  mutationFn: MutationFunction<TData, TVariables>;
  mutationKey?: MutationKey;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  getSuccessMessage?: (data: TData, variables: TVariables) => string | null;
  getErrorMessage?: (error: TError, variables: TVariables) => string | null;
  invalidateQueries?: InvalidateTarget[];
  updateQueryData?: (params: CacheUpdateParams<TData, TVariables>) => void;
}

const normalizeMessage = (message: string | null | undefined) =>
  message?.trim() || null;

const getDefaultErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

const isInvalidateDescriptor = (
  target: InvalidateTarget,
): target is { queryKey: QueryKey; exact?: boolean } =>
  typeof target === "object" && target !== null && "queryKey" in target;

const normalizeInvalidateTarget = (
  target: InvalidateTarget,
): { queryKey: QueryKey; exact?: boolean } =>
  isInvalidateDescriptor(target) ? target : { queryKey: target, exact: false };

const useApiMutation = <
  TData,
  TVariables = void,
  TError = Error,
  TContext = unknown,
>(
  options: UseApiMutationOptions<TData, TVariables, TError, TContext>,
) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const toastRef = useRef(showToast);

  useEffect(() => {
    toastRef.current = showToast;
  }, [showToast]);

  const {
    mutationFn,
    mutationKey,
    showErrorToast = true,
    showSuccessToast = false,
    getSuccessMessage,
    getErrorMessage,
    invalidateQueries = [],
    updateQueryData,
    onSuccess,
    onError,
    onSettled,
    ...rest
  } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    mutationKey,
    mutationFn,
    ...rest,
    onSuccess: async (data, variables, onMutateResult, context) => {
      updateQueryData?.({ data, variables, queryClient });

      if (invalidateQueries.length > 0) {
        await Promise.all(
          invalidateQueries.map((target) => {
            const normalized = normalizeInvalidateTarget(target);
            return queryClient.invalidateQueries({
              queryKey: normalized.queryKey,
              exact: normalized.exact,
            });
          }),
        );
      }

      await onSuccess?.(data, variables, onMutateResult, context);

      const successMessage = normalizeMessage(
        getSuccessMessage?.(data, variables),
      );
      if (showSuccessToast && successMessage) {
        toastRef.current(successMessage, "success");
      }
    },
    onError: async (error, variables, onMutateResult, context) => {
      await onError?.(error, variables, onMutateResult, context);

      const errorMessage = normalizeMessage(
        getErrorMessage?.(error, variables) ?? getDefaultErrorMessage(error),
      );
      if (showErrorToast && errorMessage) {
        toastRef.current(errorMessage, "error");
      }
    },
    onSettled: async (data, error, variables, onMutateResult, context) => {
      await onSettled?.(data, error, variables, onMutateResult, context);
    },
  });
};

export type { InvalidateTarget, UseApiMutationOptions };
export default useApiMutation;
