"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  BellPlus,
  CheckCircle2,
  Columns3,
  ExternalLink,
  FileCheck2,
  Filter,
  MessageSquarePlus,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import type { PatientWorklistItem, WorklistQueryInput } from "@/lib/api/clinician";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { encodePatientRef } from "@/lib/ids/patient-ref";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import {
  useCreateCareTaskMutation,
  useCreateCohortMutation,
  useCreateReminderRequestMutation,
  useCreateSavedViewMutation,
  usePatientWorklistQuery,
  useSavedViewsQuery,
  useSendPatientMessageMutation,
} from "@/lib/query/clinician-hooks";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyStatePanel, ErrorStatePanel } from "@/components/layout/state-panels";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const PAGE_SIZE = 25;

const BUILT_IN_VIEWS = [
  { id: "all", label: "All patients", query: {} },
  { id: "needs_attention", label: "Needs attention", query: { attention: "needs_attention" } },
  { id: "overdue", label: "Overdue care", query: { view: "overdue" } },
  { id: "abnormal", label: "Abnormal results", query: { view: "abnormal" } },
  { id: "documents", label: "Docs to review", query: { view: "documents" } },
  { id: "inactive_mobile", label: "No mobile activity", query: { view: "inactive_mobile" } },
] as const;

type ActionKind = "task" | "message" | "reminder" | "cohort";

const patientName = (item: PatientWorklistItem) =>
  item.patient.name || item.patient.email || "Unnamed patient";

const attentionBadge = (item: PatientWorklistItem) => {
  if (item.attention.score >= 3) {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  if (item.attention.score > 0) {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }
  return "border-emerald-300 bg-emerald-50 text-emerald-800";
};

const consentBadge = (status?: string | null) => {
  const normalized = String(status ?? "NONE").toUpperCase();
  if (normalized === "ACTIVE") return "border-primary/30 bg-primary/10 text-primary";
  if (normalized === "REQUESTED") return "border-amber-300 bg-amber-50 text-amber-800";
  if (["REVOKED", "DECLINED", "EXPIRED"].includes(normalized)) {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  return "border-border bg-muted/40 text-muted-foreground";
};

const reasonLabel = (reason: string) =>
  reason
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");

const parseSavedFilters = (filters: unknown): Partial<WorklistQueryInput> => {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) return {};
  return filters as Partial<WorklistQueryInput>;
};

export default function PatientsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [activeView, setActiveView] = useState<(typeof BUILT_IN_VIEWS)[number]["id"]>("all");
  const [consentStatus, setConsentStatus] = useState("any");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [actionPatient, setActionPatient] = useState<PatientWorklistItem | null>(null);
  const [actionKind, setActionKind] = useState<ActionKind>("task");

  const builtInQuery = BUILT_IN_VIEWS.find((view) => view.id === activeView)?.query ?? {};
  const query: WorklistQueryInput = {
    page,
    pageSize: PAGE_SIZE,
    search: search.trim() || undefined,
    includeInactive,
    sortBy,
    sortDir,
    consentStatus: consentStatus === "any" ? undefined : consentStatus,
    ...builtInQuery,
  };

  const worklistQuery = usePatientWorklistQuery(query);
  const savedViewsQuery = useSavedViewsQuery();
  const createSavedViewMutation = useCreateSavedViewMutation();
  const createCareTaskMutation = useCreateCareTaskMutation();
  const sendMessageMutation = useSendPatientMessageMutation();
  const createReminderMutation = useCreateReminderRequestMutation();
  const createCohortMutation = useCreateCohortMutation();

  useQueryErrorToast({
    isError: worklistQuery.isError,
    error: worklistQuery.error,
    title: "Failed to load patient worklist",
  });

  const items = useMemo(
    () => worklistQuery.data?.items ?? [],
    [worklistQuery.data?.items],
  );
  const pagination = worklistQuery.data?.pagination;
  const savedViews = savedViewsQuery.data ?? [];

  const summary = useMemo(
    () => ({
      attention: items.filter((item) => item.attention.score > 0).length,
      overdue: items.reduce((total, item) => total + item.counts.overdueScreenings, 0),
      documents: items.reduce((total, item) => total + item.counts.documentsNeedReview, 0),
      tasks: items.reduce((total, item) => total + item.counts.openTasks, 0),
    }),
    [items],
  );

  const openAction = (patient: PatientWorklistItem, kind: ActionKind) => {
    setActionPatient(patient);
    setActionKind(kind);
  };

  const closeAction = () => setActionPatient(null);

  const handleSaveCurrentView = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      toast.error("Saved view name is required.");
      return;
    }

    createSavedViewMutation.mutate(
      {
        name,
        filters: query as Record<string, unknown>,
        columns: {
          pinned: ["patient", "attention", "nextAction"],
          visible: [
            "patient",
            "attention",
            "nextAction",
            "nextDue",
            "latestResult",
            "care",
            "documents",
            "immunization",
            "activity",
            "consent",
          ],
        },
        sort: { sortBy, sortDir },
        isDefault: false,
      },
      {
        onSuccess: () => {
          toast.success("Saved view created.");
          setSaveViewOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to save view.");
        },
      },
    );
  };

  const handleCreateAction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!actionPatient) return;

    const formData = new FormData(event.currentTarget);
    const patientId = actionPatient.patient.id;

    if (actionKind === "task") {
      createCareTaskMutation.mutate(
        {
          patientId,
          title: String(formData.get("title") ?? "").trim(),
          description: String(formData.get("description") ?? "").trim() || null,
          priority: String(formData.get("priority") ?? "MEDIUM"),
          category: String(formData.get("category") ?? "GENERAL").trim() || "GENERAL",
          dueAt: String(formData.get("dueAt") ?? "").trim() || null,
        },
        {
          onSuccess: () => {
            toast.success("Care task created.");
            closeAction();
          },
          onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create task."),
        },
      );
      return;
    }

    if (actionKind === "message") {
      sendMessageMutation.mutate(
        {
          patientId,
          body: String(formData.get("body") ?? "").trim(),
          channel: "IN_APP",
        },
        {
          onSuccess: () => {
            toast.success("Message queued for patient.");
            closeAction();
          },
          onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to send message."),
        },
      );
      return;
    }

    if (actionKind === "reminder") {
      createReminderMutation.mutate(
        {
          patientId,
          title: String(formData.get("title") ?? "").trim(),
          description: String(formData.get("description") ?? "").trim() || null,
          dueAt: String(formData.get("dueAt") ?? "").trim() || null,
          recurrence: String(formData.get("recurrence") ?? "").trim() || null,
        },
        {
          onSuccess: () => {
            toast.success("Reminder request created.");
            closeAction();
          },
          onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create reminder."),
        },
      );
      return;
    }

    createCohortMutation.mutate(
      {
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim() || null,
        patientIds: [patientId],
        filters: { source: "patient_worklist_action" },
      },
      {
        onSuccess: () => {
          toast.success("Cohort created.");
          closeAction();
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create cohort."),
      },
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patient Worklist"
        description="Operational, spreadsheet-style view of patients, mobile activity, care gaps, documents, tasks, reminders, and consent state."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSaveViewOpen(true)}>
              <Save className="mr-1 size-4" />
              Save View
            </Button>
            <Button
              variant="outline"
              onClick={() => worklistQuery.refetch()}
              disabled={worklistQuery.isFetching}
            >
              <RefreshCcw className={cn("mr-1 size-4", worklistQuery.isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Needs attention</CardDescription>
            <CardTitle className="text-2xl">{summary.attention}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Patients with one or more active signals.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue screenings</CardDescription>
            <CardTitle className="text-2xl">{summary.overdue}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Open preventive-care gaps on this page.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Documents to review</CardDescription>
            <CardTitle className="text-2xl">{summary.documents}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Uploaded docs without accepted review.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open care tasks</CardDescription>
            <CardTitle className="text-2xl">{summary.tasks}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Clinician-created tasks needing action.</CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Columns3 className="size-4 text-primary" />
                Worklist Controls
              </CardTitle>
              <CardDescription>
                Filter and sort like a lightweight clinical spreadsheet.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {BUILT_IN_VIEWS.map((view) => (
                <Button
                  key={view.id}
                  size="sm"
                  variant={activeView === view.id ? "default" : "outline"}
                  onClick={() => {
                    setPage(1);
                    setActiveView(view.id);
                  }}
                >
                  {view.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px_160px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                className="pl-9"
                placeholder="Search patient name or email"
              />
            </div>
            <Select
              value={consentStatus}
              onValueChange={(value) => {
                setPage(1);
                setConsentStatus(value ?? "any");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Consent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any consent</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="NONE">Missing</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value ?? "updatedAt")}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">Last updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="attention">Attention</SelectItem>
                <SelectItem value="nextDue">Next due</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortDir} onValueChange={(value) => setSortDir(value as "asc" | "desc")}>
              <SelectTrigger>
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 border border-border bg-muted/30 px-3">
              <Switch
                checked={includeInactive}
                onCheckedChange={(checked) => {
                  setPage(1);
                  setIncludeInactive(checked);
                }}
              />
              <span className="text-sm text-muted-foreground">Inactive links</span>
            </div>
          </div>

          {savedViews.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Filter className="size-3" />
                Saved
              </span>
              {savedViews.map((view) => (
                <Button
                  key={view.id}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const filters = parseSavedFilters(view.filters);
                    setSearch(String(filters.search ?? ""));
                    setIncludeInactive(Boolean(filters.includeInactive));
                    setConsentStatus(String(filters.consentStatus ?? "any"));
                    setSortBy(String(filters.sortBy ?? "updatedAt"));
                    setSortDir((filters.sortDir as "asc" | "desc") ?? "desc");
                    setActiveView("all");
                    setPage(1);
                  }}
                >
                  {view.name}
                </Button>
              ))}
            </div>
          ) : null}
        </CardHeader>

        <CardContent>
          {worklistQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : worklistQuery.isError ? (
            <ErrorStatePanel
              title="Unable to load patient worklist"
              description="Check the API session, clinician role, and worklist endpoint."
            />
          ) : items.length === 0 ? (
            <EmptyStatePanel
              title="No patients match this view"
              description="Try another saved view, search term, or consent filter."
            />
          ) : (
            <div className="max-h-[68vh] overflow-auto border bg-card">
              <table className="w-full min-w-[1380px] border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-muted text-xs uppercase tracking-wide text-muted-foreground shadow-sm">
                  <tr>
                    <th className="sticky left-0 z-30 min-w-72 border-r bg-muted px-3 py-2 text-left">Patient</th>
                    <th className="min-w-44 border-r px-3 py-2 text-left">Attention</th>
                    <th className="min-w-52 border-r px-3 py-2 text-left">Next Action</th>
                    <th className="min-w-48 border-r px-3 py-2 text-left">Next Due</th>
                    <th className="min-w-56 border-r px-3 py-2 text-left">Latest Result</th>
                    <th className="min-w-36 border-r px-3 py-2 text-left">Care</th>
                    <th className="min-w-36 border-r px-3 py-2 text-left">Documents</th>
                    <th className="min-w-40 border-r px-3 py-2 text-left">Immunization</th>
                    <th className="min-w-44 border-r px-3 py-2 text-left">Mobile Activity</th>
                    <th className="min-w-36 border-r px-3 py-2 text-left">Consent</th>
                    <th className="min-w-72 px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.patient.id} className="border-t hover:bg-accent/35">
                      <td className="sticky left-0 z-10 border-r bg-card px-3 py-3 align-top shadow-[8px_0_12px_-12px_rgba(0,0,0,0.35)]">
                        <div className="font-medium">{patientName(item)}</div>
                        <div className="text-xs text-muted-foreground">{item.patient.email || "No email"}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline">{item.relationship?.relationshipType ?? "No link"}</Badge>
                          {item.patient.gender ? <Badge variant="outline">{item.patient.gender}</Badge> : null}
                        </div>
                      </td>
                      <td className="border-r px-3 py-3 align-top">
                        <Badge variant="outline" className={attentionBadge(item)}>
                          {item.attention.label}
                        </Badge>
                        <div className="mt-2 space-y-1">
                          {item.attention.reasons.slice(0, 3).map((reason) => (
                            <div key={reason} className="text-xs text-muted-foreground">
                              • {reasonLabel(reason)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border-r px-3 py-3 align-top">
                        <div className="font-medium">{item.nextAction}</div>
                        {item.latestAbnormalResult ? (
                          <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                            <ShieldAlert className="size-3" />
                            Abnormal result available
                          </div>
                        ) : null}
                      </td>
                      <td className="border-r px-3 py-3 align-top">
                        {item.nextDue ? (
                          <>
                            <div className="font-medium">{item.nextDue.label}</div>
                            <div className={cn("text-xs", item.nextDue.overdue ? "text-destructive" : "text-muted-foreground")}>
                              {formatDate(item.nextDue.dueDate)}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No upcoming due item</span>
                        )}
                      </td>
                      <td className="border-r px-3 py-3 align-top">
                        {item.latestResult ? (
                          <>
                            <div className="font-medium">{item.latestResult.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.latestResult.outcomeStatus} • {formatDate(item.latestResult.performedAt)}
                            </div>
                            {item.latestResult.summary ? (
                              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.latestResult.summary}</div>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">No result</span>
                        )}
                      </td>
                      <td className="border-r px-3 py-3 align-top">
                        <div className="font-medium">{item.counts.openTasks} open</div>
                        <div className="text-xs text-muted-foreground">{item.counts.tasksDueSoon} due soon</div>
                      </td>
                      <td className="border-r px-3 py-3 align-top">
                        <div className="font-medium">{item.counts.documentsNeedReview} need review</div>
                        <div className="text-xs text-muted-foreground">{item.counts.documents} uploaded</div>
                      </td>
                      <td className="border-r px-3 py-3 align-top">
                        <div className="font-medium">{item.immunisation.status}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.immunisation.totalRecords} records
                          {item.immunisation.lastRecordedAt ? ` • ${formatDate(item.immunisation.lastRecordedAt)}` : ""}
                        </div>
                      </td>
                      <td className="border-r px-3 py-3 align-top">
                        <Badge
                          variant="outline"
                          className={
                            item.activity.staleMobileActivity
                              ? "border-amber-300 bg-amber-50 text-amber-800"
                              : "border-emerald-300 bg-emerald-50 text-emerald-800"
                          }
                        >
                          {item.activity.staleMobileActivity ? "Stale" : "Recent"}
                        </Badge>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(item.activity.lastMobileActivityAt)}
                        </div>
                      </td>
                      <td className="border-r px-3 py-3 align-top">
                        <Badge variant="outline" className={consentBadge(item.consent?.status)}>
                          {item.consent?.status ?? "Missing"}
                        </Badge>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Expires {formatDate(item.consent?.expiresAt)}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/app/patients/${encodePatientRef(item.patient.id)}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Open
                            <ExternalLink className="ml-1 size-3" />
                          </Link>
                          <Button size="sm" variant="outline" onClick={() => openAction(item, "task")}>
                            <Sparkles className="mr-1 size-3" />
                            Task
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAction(item, "message")}>
                            <MessageSquarePlus className="mr-1 size-3" />
                            Message
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAction(item, "reminder")}>
                            <BellPlus className="mr-1 size-3" />
                            Reminder
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1} • {pagination?.total ?? 0} total
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={(pagination?.page ?? 1) <= 1 || worklistQuery.isFetching}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={worklistQuery.isFetching || (!!pagination && pagination.page >= pagination.totalPages)}
                onClick={() => setPage((previous) => previous + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current worklist view</DialogTitle>
            <DialogDescription>
              Save the current filters, sorting, and default worklist columns for later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCurrentView}>
            <DialogBody className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="saved-view-name">View name</Label>
                <Input id="saved-view-name" name="name" placeholder="e.g. Overdue docs + care gaps" />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaveViewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSavedViewMutation.isPending}>
                <Save className="mr-1 size-4" />
                Save View
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(actionPatient)} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionKind === "task"
                ? "Create care task"
                : actionKind === "message"
                  ? "Send patient message"
                  : actionKind === "reminder"
                    ? "Create shared reminder"
                    : "Create cohort"}
            </DialogTitle>
            <DialogDescription>
              {actionPatient ? patientName(actionPatient) : "Selected patient"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAction}>
            <DialogBody className="space-y-3">
              {actionKind === "message" ? (
                <div className="space-y-2">
                  <Label htmlFor="message-body">Message</Label>
                  <Textarea id="message-body" name="body" placeholder="Write a concise, patient-friendly message..." />
                </div>
              ) : actionKind === "cohort" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cohort-name">Cohort name</Label>
                    <Input id="cohort-name" name="name" placeholder="e.g. Follow-up group" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cohort-description">Description</Label>
                    <Textarea id="cohort-description" name="description" placeholder="Why this patient belongs in the cohort" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="action-title">Title</Label>
                    <Input
                      id="action-title"
                      name="title"
                      placeholder={actionKind === "task" ? "Review abnormal result" : "Book your screening"}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {actionKind === "task" ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="task-category">Category</Label>
                          <Input id="task-category" name="category" placeholder="FOLLOW_UP" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="task-priority">Priority</Label>
                          <Select name="priority" defaultValue="MEDIUM">
                            <SelectTrigger id="task-priority">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="MEDIUM">Medium</SelectItem>
                              <SelectItem value="HIGH">High</SelectItem>
                              <SelectItem value="URGENT">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="reminder-recurrence">Recurrence</Label>
                        <Input id="reminder-recurrence" name="recurrence" placeholder="Optional, e.g. monthly" />
                      </div>
                    )}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="action-due">Due date</Label>
                      <Input id="action-due" name="dueAt" type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="action-description">Description</Label>
                    <Textarea id="action-description" name="description" placeholder="Context for the care team or patient..." />
                  </div>
                </>
              )}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeAction}>
                Cancel
              </Button>
              <Button type="submit">
                {actionKind === "message" ? (
                  <MessageSquarePlus className="mr-1 size-4" />
                ) : actionKind === "reminder" ? (
                  <BellPlus className="mr-1 size-4" />
                ) : actionKind === "cohort" ? (
                  <UsersRound className="mr-1 size-4" />
                ) : (
                  <CheckCircle2 className="mr-1 size-4" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <FileCheck2 className="mt-0.5 size-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              This worklist is backed by API-side patient signals, so it can safely support mobile reminders,
              document review, messages, care tasks, cohorts, and future saved organization views.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
