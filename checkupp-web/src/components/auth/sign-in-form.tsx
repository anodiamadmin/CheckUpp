"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarCheck2,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest, authResponseSchema } from "@/lib/api/client";
import { useSessionStore, type SessionRole } from "@/lib/state/session-store";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignInFormProps {
  nextPath: string;
}

const isDevMode =
  (process.env.NEXT_PUBLIC_APP_ENV || "development") !== "production";
const fallbackDevRole = (
  process.env.NEXT_PUBLIC_DEV_USER_ROLE || "CLINICIAN"
).toUpperCase();
const devLoginEmail = (
  process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL || "clinician@checkupp.com"
)
  .trim()
  .toLowerCase();
const devLoginPassword =
  process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD || "Checkupp@2026";

const normalizeRole = (value: string): SessionRole => {
  const upper = value.toUpperCase();
  if (upper === "ADMIN" || upper === "CLINICIAN" || upper === "PATIENT") {
    return upper;
  }
  return "CLINICIAN";
};

const socialCapabilities = [
  {
    title: "Native API Session",
    description:
      "Uses the same JWT auth source as the mobile app and production API.",
    icon: ShieldCheck,
  },
  {
    title: "Consent-aware Access",
    description:
      "Clinician data views respect relationship and consent rules from API.",
    icon: Users,
  },
  {
    title: "Timeline Monitoring",
    description:
      "Review preventive care schedules and record history in one clinical workspace.",
    icon: CalendarCheck2,
  },
];

const toAuthErrorMessage = (err: unknown) => {
  if (!(err instanceof Error)) return "Authentication failed.";
  const knownCode =
    "code" in err ? String((err as { code?: unknown }).code ?? "") : "";

  if (knownCode === "AUTH_INVALID_CREDENTIALS") {
    return "Incorrect password. Please try again.";
  }

  return err.message || "Authentication failed.";
};

export const SignInForm = ({ nextPath }: SignInFormProps) => {
  const router = useRouter();
  const authReady = useSessionStore((state) => state.authReady);
  const accessToken = useSessionStore((state) => state.accessToken);
  const setSession = useSessionStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authReady && accessToken) {
      router.replace(nextPath);
    }
  }, [accessToken, authReady, nextPath, router]);

  const canUseDevLogin = (
    candidateEmail: string,
    candidatePassword: string,
  ) => {
    if (!isDevMode) return false;
    return (
      candidateEmail.trim().toLowerCase() === devLoginEmail &&
      candidatePassword === devLoginPassword
    );
  };

  const signInWithDevCredentials = (candidateEmail: string) => {
    setSession({
      accessToken: null,
      refreshToken: null,
      userEmail: candidateEmail.trim().toLowerCase(),
      userName: "CheckUpp Clinician",
      role: normalizeRole(fallbackDevRole),
    });

    toast.success("Signed in with local dev credentials.");
    router.replace(nextPath);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (canUseDevLogin(normalizedEmail, password)) {
      signInWithDevCredentials(normalizedEmail);
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest("/auth/signin", authResponseSchema, {
        method: "POST",
        body: {
          email: normalizedEmail,
          password,
        },
        includeAuth: false,
      });

      if (data.user.role !== "CLINICIAN" && data.user.role !== "ADMIN") {
        throw new Error("This account is not enabled for clinician portal access.");
      }

      setSession({
        accessToken: data.token,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        refreshExpiresAt: data.refreshExpiresAt,
        userId: data.user.id,
        userEmail: data.user.email,
        userName: data.user.name,
        role: data.user.role,
      });
      toast.success("Signed in successfully.");
      router.replace(nextPath);
    } catch (err) {
      const message = toAuthErrorMessage(err);
      if (canUseDevLogin(normalizedEmail, password)) {
        signInWithDevCredentials(normalizedEmail);
        return;
      }
      setError(message);
      toast.error("Sign-in failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-background">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-8 md:py-8">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>

        <div className="grid flex-1 gap-5 md:grid-cols-[1.02fr_0.98fr] md:items-center">
          <Card className="hidden h-full border-primary/20 bg-card/85 md:flex">
            <CardHeader className="pb-2">
              <Badge
                variant="outline"
                className="w-fit border-primary/30 bg-primary/10 text-primary"
              >
                CheckUpp Clinician Access
              </Badge>
              <CardTitle className="mt-3 text-3xl leading-tight">
                Securely monitor patient preventive care at scale.
              </CardTitle>
              <CardDescription className="max-w-prose">
                The clinician portal gives a role-scoped, consent-aware view
                into patient timelines, screening records, and supporting health
                documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {socialCapabilities.map((capability) => {
                const Icon = capability.icon;
                return (
                  <div
                    key={capability.title}
                    className="rounded-xl border border-border/80 bg-background/70 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/15 p-2">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {capability.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {capability.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/95 backdrop-blur">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Sign in to CheckUpp</CardTitle>
              <CardDescription>
                Continue with your clinician or admin account.
              </CardDescription>
              {isDevMode ? (
                <p className="text-xs text-muted-foreground">
                  Dev fallback: <strong>{devLoginEmail}</strong> /{" "}
                  <strong>{devLoginPassword}</strong>
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="clinician@checkupp.com"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                      className="pl-9"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? "Signing in..." : "Sign in with Email"}
                </Button>
              </form>

              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Authentication error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};
