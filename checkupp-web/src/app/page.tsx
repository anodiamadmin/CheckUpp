import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  CalendarCheck2,
  FileText,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const capabilities = [
  {
    title: "Timeline Monitoring",
    description:
      "Consolidated patient timelines with screening due items, records, snapshots, and pregnancy planning data.",
    icon: CalendarCheck2,
  },
  {
    title: "Consent Governance",
    description:
      "Clinician-to-patient data access is controlled through explicit grant/revoke consent workflows.",
    icon: ShieldCheck,
  },
  {
    title: "Document Visibility",
    description:
      "Patient wallet files and supporting records are visible in-context for faster clinical review.",
    icon: FileText,
  },
];

const processSteps = [
  "Authenticate clinician via Firebase auth token parity with mobile",
  "Load patient relationship + consent scoped access model",
  "Render longitudinal timeline from checkupp-api clinical domain tables",
  "Audit all sensitive access for healthcare compliance posture",
];

export default async function LandingPage() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.get("checkupp_web_session")?.value === "1";
  const primaryButtonClass =
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90";
  const outlineButtonClass =
    "inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted";

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="relative flex w-full flex-col gap-10 px-6 py-10 md:px-10 md:py-16 lg:px-14 xl:px-16">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Stethoscope className="size-5" />
              </div>
              <div>
                <p className="text-base font-semibold tracking-tight">
                  CheckUpp
                </p>
                <p className="text-xs text-muted-foreground">
                  Clinician Platform
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href={hasSession ? "/app" : "/auth/sign-in"}
                className={outlineButtonClass}
              >
                {hasSession ? "Open Dashboard" : "Sign In"}
              </Link>
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-5">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary"
              >
                Production-grade clinician workspace
              </Badge>
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
                Monitor patient preventive care with secure, structured
                timelines.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                CheckUpp Clinician web aligns with your mobile ecosystem while
                introducing auditable relationship, consent, and timeline
                workflows powered by your dedicated API.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={hasSession ? "/app/patients" : "/auth/sign-in"}
                  className={primaryButtonClass}
                >
                  {hasSession ? "Go To Patients" : "Get Started"}
                  <ArrowRight className="ml-1 size-4" />
                </Link>
                <Link href="/app/profile" className={outlineButtonClass}>
                  Configure Clinician Profile
                </Link>
              </div>
            </div>

            <Card className="border-primary/20 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-primary" />
                  Clinical Operations Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Auth Model
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      Firebase Token Parity
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      API Layer
                    </p>
                    <p className="mt-1 text-sm font-medium">Prisma + Express</p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Data Control
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      Consent + Relationship
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Audit Posture
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      Read/Write Logging
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid w-full gap-4 px-6 py-8 md:grid-cols-3 md:px-10 md:py-12 lg:px-14 xl:px-16">
        {capabilities.map((capability) => {
          const Icon = capability.icon;
          return (
            <Card
              key={capability.title}
              className="border-border/80 bg-card/90"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-4 text-primary" />
                  {capability.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {capability.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="w-full px-6 pb-12 md:px-10 md:pb-16 lg:px-14 xl:px-16">
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Operational Flow</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {processSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-2"
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    "bg-primary/15 text-primary",
                  )}
                >
                  {index + 1}
                </span>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
