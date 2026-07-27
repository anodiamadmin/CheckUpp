"use client";

import Link from "next/link";
import { FormEvent, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BellPlus,
  CheckCircle2,
  FileText,
  MessageSquarePlus,
  ShieldCheck,
  Syringe,
} from "lucide-react";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api/client";
import type { PatientTimeline } from "@/lib/api/clinician";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { decodePatientRef } from "@/lib/ids/patient-ref";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import {
  useCreateCareTaskMutation,
  useCreateReminderRequestMutation,
  usePatientTimelineQuery,
  useReviewDocumentMutation,
  useSendPatientMessageMutation,
  useUpdateCareTaskMutation,
  useUpdateReminderRequestMutation,
} from "@/lib/query/clinician-hooks";
import { EmptyStatePanel, ErrorStatePanel } from "@/components/layout/state-panels";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const formatBytes = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const consentBadge = (status?: string | null) => {
  const normalized = String(status ?? "NONE").toUpperCase();
  if (normalized === "ACTIVE") return "border-primary/30 bg-primary/10 text-primary";
  if (normalized === "REQUESTED") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-border bg-muted/40 text-muted-foreground";
};

const reviewForDocument = (
  timeline: PatientTimeline,
  walletDocumentId: string,
) => timeline.documentReviews.find((review) => review.walletDocumentId === walletDocumentId);

export default function PatientDashboardPage() {
  const params = useParams<{ patientId: string }>();
  const patientRef = params.patientId;
  const patientId = useMemo(() => decodePatientRef(patientRef), [patientRef]);
  const timelineQuery = usePatientTimelineQuery(patientId);
  const createTaskMutation = useCreateCareTaskMutation();
  const updateTaskMutation = useUpdateCareTaskMutation();
  const sendMessageMutation = useSendPatientMessageMutation();
  const createReminderMutation = useCreateReminderRequestMutation();
  const updateReminderMutation = useUpdateReminderRequestMutation();
  const reviewDocumentMutation = useReviewDocumentMutation();

  useQueryErrorToast({
    isError: timelineQuery.isError,
    error: timelineQuery.error,
    title: "Failed to load patient dashboard",
  });

  const timeline = timelineQuery.data;
  const patient = timeline?.patient;
  const dueItems = timeline?.screening?.dueItems ?? [];
  const records = timeline?.screening?.records ?? [];
  const documents = timeline?.walletDocuments ?? [];
  const tasks = timeline?.careTasks ?? [];
  const messages = timeline?.messages ?? [];
  const reminders = timeline?.reminderRequests ?? [];
  const immunisations = timeline?.immunisations ?? [];
  const abnormalRecords = records.filter(
    (record) => record.outcomeStatus === "ABNORMAL" || record.wasNormal === false,
  );
  const openTasks = tasks.filter((task) => !["DONE", "COMPLETED", "CANCELLED"].includes(task.status));

  const errorDescription = useMemo(() => {
    if (!(timelineQuery.error instanceof ApiClientError)) {
      return "You may not have an active patient relationship + consent, or the API request failed.";
    }
    if (timelineQuery.error.status === 403) {
      return "Access denied. This usually means patient relationship or consent is missing.";
    }
    return timelineQuery.error.message;
  }, [timelineQuery.error]);

  const handleCreateTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createTaskMutation.mutate(
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
          event.currentTarget.reset();
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create task."),
      },
    );
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    sendMessageMutation.mutate(
      {
        patientId,
        body: String(formData.get("body") ?? "").trim(),
        channel: "IN_APP",
      },
      {
        onSuccess: () => {
          toast.success("Message queued.");
          event.currentTarget.reset();
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to send message."),
      },
    );
  };

  const handleCreateReminder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
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
          event.currentTarget.reset();
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create reminder."),
      },
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={patient?.name || "Patient Dashboard"}
        description="Patient-centered dashboard for care gaps, documents, messages, reminders, immunizations, and mobile-shared data."
        actions={
          <Link href="/app/patients" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="mr-1 size-4" />
            Back to worklist
          </Link>
        }
      />

      {timelineQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : timelineQuery.isError ? (
        <ErrorStatePanel title="Patient dashboard unavailable" description={errorDescription} />
      ) : !timeline || !patient ? (
        <EmptyStatePanel title="No patient data" description="The API returned an empty dashboard payload." />
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Consent</CardDescription>
                <CardTitle className="text-base">
                  <Badge variant="outline" className={consentBadge(timeline.access.consent?.status)}>
                    {timeline.access.consent?.status ?? "Missing"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Expires {formatDate(timeline.access.consent?.expiresAt)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Open tasks</CardDescription>
                <CardTitle className="text-2xl">{openTasks.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Care-team follow-ups.</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Abnormal results</CardDescription>
                <CardTitle className="text-2xl">{abnormalRecords.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">From shared screening records.</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Documents</CardDescription>
                <CardTitle className="text-2xl">{documents.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Wallet uploads and links.</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Immunizations</CardDescription>
                <CardTitle className="text-2xl">{immunisations.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Mobile-shared vaccine records.</CardContent>
            </Card>
          </section>

          <Tabs defaultValue="summary">
            <TabsList className="flex w-full flex-wrap justify-start">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="tasks">Care Tasks</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="reminders">Reminders</TabsTrigger>
              <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Patient Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Name</p>
                      <p className="font-medium">{patient.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Email</p>
                      <p className="font-medium">{patient.email || "Not shared"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Phone</p>
                      <p className="font-medium">{patient.phoneNumber || "Not shared"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">DOB</p>
                      <p className="font-medium">{formatDate(patient.dob)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Gender</p>
                      <p className="font-medium">{patient.gender || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Patient since</p>
                      <p className="font-medium">{formatDate(patient.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Preventive Care Snapshot</CardTitle>
                    <CardDescription>Due items and latest records shared by mobile/API.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dueItems.length === 0 ? (
                      <EmptyStatePanel title="No due items" description="No screening due items returned." />
                    ) : (
                      dueItems.slice(0, 8).map((item) => (
                        <div key={item.id} className="border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{item.screeningDefinition?.displayName || "Screening"}</p>
                            <Badge variant={item.overdue ? "destructive" : "outline"}>
                              {item.overdue ? "Overdue" : item.completed ? "Completed" : "Upcoming"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Due {formatDate(item.dueDate)}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </section>
            </TabsContent>

            <TabsContent value="tasks" className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="size-4 text-primary" />
                    New Care Task
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleCreateTask}>
                    <div className="space-y-2">
                      <Label htmlFor="task-title">Title</Label>
                      <Input id="task-title" name="title" placeholder="Review uploaded lab result" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-due">Due date</Label>
                      <Input id="task-due" name="dueAt" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-description">Description</Label>
                      <Textarea id="task-description" name="description" />
                    </div>
                    <Button type="submit" disabled={createTaskMutation.isPending}>
                      Create Task
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Care Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasks.length === 0 ? (
                    <EmptyStatePanel title="No tasks yet" description="Create the first clinician task for this patient." />
                  ) : (
                    tasks.map((task) => (
                      <div key={task.id} className="border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {task.category} • {task.priority} • Due {formatDate(task.dueAt)}
                            </p>
                            {task.description ? <p className="mt-1 text-sm text-muted-foreground">{task.description}</p> : null}
                          </div>
                          <Badge variant="outline">{task.status}</Badge>
                        </div>
                        {!["DONE", "COMPLETED"].includes(task.status) ? (
                          <Button
                            className="mt-3"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateTaskMutation.mutate({
                                taskId: task.id,
                                patientId,
                                input: { status: "DONE" },
                              })
                            }
                          >
                            Mark Done
                          </Button>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-3">
              {documents.length === 0 ? (
                <EmptyStatePanel title="No documents" description="The patient has not shared wallet documents yet." />
              ) : (
                documents.map((doc) => {
                  const review = reviewForDocument(timeline, doc.id);
                  return (
                    <Card key={doc.id}>
                      <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.documentType} • {doc.fileType} • {formatBytes(doc.sizeBytes)} • Uploaded {formatDateTime(doc.createdAt)}
                          </p>
                          {doc.description ? <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p> : null}
                          <Badge className="mt-2" variant="outline">
                            Review: {review?.status ?? "PENDING"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {doc.publicUrl ? (
                            <a href={doc.publicUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                              Open
                            </a>
                          ) : null}
                          <Button
                            size="sm"
                            onClick={() =>
                              reviewDocumentMutation.mutate({
                                patientId,
                                walletDocumentId: doc.id,
                                status: "REVIEWED",
                                note: "Reviewed from clinician dashboard",
                              })
                            }
                          >
                            <FileText className="mr-1 size-4" />
                            Mark Reviewed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              reviewDocumentMutation.mutate({
                                patientId,
                                walletDocumentId: doc.id,
                                status: "NEEDS_REPLACEMENT",
                                note: "Please upload a clearer or updated copy.",
                              })
                            }
                          >
                            Request replacement
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="messages" className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquarePlus className="size-4 text-primary" />
                    New Message
                  </CardTitle>
                  <CardDescription>Creates an in-app message record for mobile consumption.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleSendMessage}>
                    <Textarea name="body" placeholder="Write a concise patient-facing message..." />
                    <Button type="submit" disabled={sendMessageMutation.isPending}>
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Message History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {messages.length === 0 ? (
                    <EmptyStatePanel title="No messages" description="No clinician-patient messages yet." />
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="border p-3">
                        <p className="text-sm">{message.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {message.channel} • {message.status} • {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reminders" className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BellPlus className="size-4 text-primary" />
                    Shared Reminder
                  </CardTitle>
                  <CardDescription>Creates a reminder request the mobile app can surface.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleCreateReminder}>
                    <Input name="title" placeholder="Book screening appointment" />
                    <Input name="dueAt" type="date" />
                    <Input name="recurrence" placeholder="Optional recurrence, e.g. monthly" />
                    <Textarea name="description" placeholder="Reminder details..." />
                    <Button type="submit" disabled={createReminderMutation.isPending}>
                      Create Reminder
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Reminder Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reminders.length === 0 ? (
                    <EmptyStatePanel title="No reminders" description="No shared reminders have been created." />
                  ) : (
                    reminders.map((reminder) => (
                      <div key={reminder.id} className="border p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{reminder.title}</p>
                          <Badge variant="outline">{reminder.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Due {formatDate(reminder.dueAt)} • {reminder.recurrence || "No recurrence"}
                        </p>
                        {reminder.description ? <p className="mt-1 text-sm text-muted-foreground">{reminder.description}</p> : null}
                        {!["DONE", "COMPLETED"].includes(reminder.status) ? (
                          <Button
                            className="mt-3"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateReminderMutation.mutate({
                                reminderId: reminder.id,
                                patientId,
                                input: { status: "DONE" },
                              })
                            }
                          >
                            Mark Done
                          </Button>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="immunizations" className="space-y-3">
              {immunisations.length === 0 ? (
                <EmptyStatePanel title="No immunization records" description="No immunization records are shared yet." />
              ) : (
                immunisations.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="flex items-center gap-2 font-medium">
                            <Syringe className="size-4 text-primary" />
                            {record.screeningDefinition?.displayName || "Immunization"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Performed {formatDate(record.performedAt)} • {record.outcomeStatus}
                          </p>
                        </div>
                        <Badge variant="outline">
                          <ShieldCheck className="mr-1 size-3" />
                          Mobile shared
                        </Badge>
                      </div>
                      <pre className="mt-3 max-h-56 overflow-auto border bg-muted/30 p-3 text-xs">
                        {JSON.stringify(record.immunisationDetail ?? {}, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
