"use client";

import { useEffect, type ReactNode } from "react";
import { useSessionStore } from "@/lib/state/session-store";

interface AuthBootstrapProps {
  children: ReactNode;
}

export const AuthBootstrap = ({ children }: AuthBootstrapProps) => {
  const setAuthReady = useSessionStore((state) => state.setAuthReady);

  useEffect(() => {
    setAuthReady(true);
  }, [setAuthReady]);

  return <>{children}</>;
};
