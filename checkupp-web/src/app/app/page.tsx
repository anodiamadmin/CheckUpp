"use client";

import Link from "next/link";
import { ArrowRight, ShieldAlert, Timer, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { encodePatientRef } from "@/lib/ids/patient-ref";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClinicianPatientsQuery,
  useClinicianProfileQuery,
} from "@/lib/query/clinician-hooks";

export default function DashboardPage() {
  const profileQuery = useClinicianProfileQuery();
  const patientsQuery = useClinicianPatientsQuery({ page: 1, pageSize: 100 });

  useQueryErrorToast({
    isError: profileQuery.isError,
    error: profileQuery.error,
    title: "Failed to load clinician profile",
  });

  useQueryErrorToast({
    isError: patientsQuery.isError,
    error: patientsQuery.error,
    title: "Failed to load patient summary",
  });

  const isLoading = profileQuery.isLoading || patientsQuery.isLoading;
  const profile = profileQuery.data;
  const patients = patientsQuery.data?.items ?? [];
  const recentPatients = patients.slice(0, 5);
  const pendingRequests = patients.filter(
    (patient) => String(patient.consent?.status ?? "").toUpperCase() === "REQUESTED",
  );
  const isConsentActive = (status?: string) => {
    if (status !== "ACTIVE") return false;
    return true;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clinical Operations Dashboard"
        description="Quick view of profile readiness, linked patients, and timeline entry points."
        actions={
          <Link href="/app/patients" className={buttonVariants({ variant: "default" })}>
            Open Patients
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>Clinician</CardDescription>
            {profileQuery.isLoading ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <CardTitle className="text-xl">{profile?.user?.name || "Profile not set"}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              {profile?.isActive ? "Active" : "Setup required"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>Assigned Patients</CardDescription>
            {patientsQuery.isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <CardTitle className="text-xl">{patientsQuery.data?.pagination.total ?? 0}</CardTitle>
            )}
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Synced from clinician relationship records
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Data Access</CardDescription>
            <CardTitle className="text-xl">Audit Enabled</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            API reads and writes are logged for compliance tracking.
          </CardContent>
        </Card>

        <Card className="border-secondary/25">
          <CardHeader className="pb-2">
            <CardDescription>Pending Requests</CardDescription>
            {patientsQuery.isLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <CardTitle className="text-xl">{pendingRequests.length}</CardTitle>
            )}
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Awaiting patient consent approval
          </CardContent>
        </Card>
      </section>

      {profileQuery.isError ? (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>Profile access issue</AlertTitle>
          <AlertDescription>
            Could not load your clinician profile. Confirm this user has clinician role and profile setup in
            `checkupp-api`.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-secondary/25 bg-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="size-4 text-secondary" />
            Pending Consent Requests
          </CardTitle>
          <CardDescription>
            Clinician requests waiting on patient action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground">
              No pending requests right now.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRequests.slice(0, 6).map((patient) => (
                <div
                  key={`pending-${patient.id}`}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-card px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{patient.name || "Unnamed patient"}</p>
                    <p className="text-xs text-muted-foreground">{patient.email || "No email"}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested {patient.consent?.requestedAt ? `on ${new Date(patient.consent.requestedAt).toLocaleDateString()}` : "recently"}
                    </p>
                  </div>
                  <Link href="/app/patients" className={buttonVariants({ size: "sm", variant: "outline" })}>
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Patient Links</CardTitle>
          <CardDescription>Quick snapshot of the most recent records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentPatients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
              No linked patients yet.
            </div>
          ) : (
            <div className="space-y-2">
              {recentPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-card px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{patient.name || "Unnamed patient"}</p>
                    <p className="text-xs text-muted-foreground">{patient.email || "No email"}</p>
                  </div>
                  {isConsentActive(patient.consent?.status) ? (
                    <Link
                      href={`/app/patients/${encodePatientRef(patient.id)}/timeline`}
                      className={buttonVariants({ size: "sm", variant: "ghost" })}
                    >
                      Timeline
                      <ArrowRight className="ml-1 size-4" />
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Consent pending</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/15 p-2 text-primary">
              <Users className="size-4" />
            </div>
            <p className="text-sm text-foreground">Manage patient relationships and consent lifecycle.</p>
          </div>
          <Link href="/app/patients" className={cn(buttonVariants(), "shrink-0")}>
            Open Patients
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
