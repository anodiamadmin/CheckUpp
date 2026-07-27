"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const asErrorMessage = (value: unknown) => {
  if (value instanceof Error) return value.message;
  return "Request failed. Please retry.";
};

interface UseQueryErrorToastInput {
  isError: boolean;
  error: unknown;
  title: string;
}

export const useQueryErrorToast = ({ isError, error, title }: UseQueryErrorToastInput) => {
  const lastErrorMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isError) {
      lastErrorMessageRef.current = null;
      return;
    }

    const message = asErrorMessage(error);
    if (lastErrorMessageRef.current === message) return;

    lastErrorMessageRef.current = message;
    toast.error(title, { description: message });
  }, [error, isError, title]);
};
