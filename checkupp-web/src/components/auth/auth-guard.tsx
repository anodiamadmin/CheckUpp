"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useSessionStore } from "@/lib/state/session-store";

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const authReady = useSessionStore((state) => state.authReady);
  const accessToken = useSessionStore((state) => state.accessToken);
  const userEmail = useSessionStore((state) => state.userEmail);
  const role = useSessionStore((state) => state.role);
  const clearSession = useSessionStore((state) => state.clearSession);

  const isAuthorizedRole = role === "CLINICIAN" || role === "ADMIN";
  const hasSession = Boolean(accessToken || userEmail);

  useEffect(() => {
    if (!authReady || hasSession) return;

    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/auth/sign-in${next}`);
  }, [authReady, hasSession, pathname, router]);

  if (!authReady || !hasSession) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="w-full max-w-sm border-border/70">
          <CardContent className="flex items-center justify-center gap-2 py-8">
            <Spinner className="size-5 text-primary" />
            <span className="text-sm text-muted-foreground">Securing session…</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthorizedRole) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="w-full max-w-md border-destructive/30">
          <CardContent className="space-y-4 py-8 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Unauthorized Role</p>
              <p className="text-sm text-muted-foreground">
                This portal is only for clinician and admin accounts.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                clearSession();
                router.replace("/auth/sign-in");
              }}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
