"use client";

import { FormEvent, useState } from "react";
import {
  ClipboardList,
  Building2,
  CheckCircle2,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  UserRoundPlus,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import type { AdminClinician, Organization } from "@/lib/api/clinician";
import { cn } from "@/lib/utils";
import {
  useAdminCliniciansQuery,
  useAuditLogsQuery,
  useCohortsQuery,
  useCreateClinicianMutation,
  useCreateOrganizationMutation,
  useOrganizationsQuery,
  useOrganizationPermissionsQuery,
  useUpdateClinicianMutation,
  useUpsertOrganizationPermissionMutation,
} from "@/lib/query/clinician-hooks";
import { useSessionStore } from "@/lib/state/session-store";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const slugPreview = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getMutationMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const formatDate = (value?: string | null) => {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString();
};

const OrganizationSelector = ({
  id,
  name,
  defaultValue,
  organizations,
  className,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  organizations: Organization[];
  className?: string;
}) => (
  <select
    id={id}
    name={name}
    defaultValue={defaultValue ?? ""}
    className={cn(
      "h-10 w-full border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20",
      className,
    )}
  >
    <option value="">No organization</option>
    {organizations.map((organization) => (
      <option key={organization.id} value={organization.id}>
        {organization.name}
      </option>
    ))}
  </select>
);

const ClinicianStatusBadge = ({ clinician }: { clinician: AdminClinician }) => {
  if (!clinician.isActive) {
    return <Badge variant="outline">Inactive</Badge>;
  }

  if (!clinician.user.emailVerified) {
    return (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
        Email unverified
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
      Active
    </Badge>
  );
};

export default function AdminPage() {
  const role = useSessionStore((state) => state.role);
  const [search, setSearch] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [permissionOrganizationId, setPermissionOrganizationId] = useState("");
  const organizationQuery = useOrganizationsQuery({ page: 1, pageSize: 100 });
  const cliniciansQuery = useAdminCliniciansQuery({
    page: 1,
    pageSize: 100,
    search: search.trim() || undefined,
  });
  const cohortsQuery = useCohortsQuery();
  const permissionsQuery = useOrganizationPermissionsQuery(permissionOrganizationId || null);
  const auditLogsQuery = useAuditLogsQuery({ page: 1, pageSize: 12 });
  const createOrganizationMutation = useCreateOrganizationMutation();
  const createClinicianMutation = useCreateClinicianMutation();
  const updateClinicianMutation = useUpdateClinicianMutation();
  const upsertPermissionMutation = useUpsertOrganizationPermissionMutation();

  const organizations = organizationQuery.data?.items ?? [];
  const clinicians = cliniciansQuery.data?.items ?? [];
  const cohorts = cohortsQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];
  const auditLogs = auditLogsQuery.data?.items ?? [];
  const activeClinicians = clinicians.filter((clinician) => clinician.isActive);

  useQueryErrorToast({
    isError: organizationQuery.isError,
    error: organizationQuery.error,
    title: "Failed to load organizations",
  });

  useQueryErrorToast({
    isError: cliniciansQuery.isError,
    error: cliniciansQuery.error,
    title: "Failed to load clinicians",
  });

  useQueryErrorToast({
    isError: permissionsQuery.isError,
    error: permissionsQuery.error,
    title: "Failed to load organization permissions",
  });

  const handleCreateOrganization = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();

    if (!name) {
      toast.error("Organization name is required.");
      return;
    }

    createOrganizationMutation.mutate(
      {
        name,
        slug: slug || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Organization created.");
          setOrganizationName("");
          form.reset();
        },
        onError: (error) => {
          toast.error("Failed to create organization", {
            description: getMutationMessage(error, "Please check the details and retry."),
          });
        },
      },
    );
  };

  const handleCreateClinician = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    createClinicianMutation.mutate(
      {
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
        password: String(formData.get("password") ?? ""),
        phoneNumber: String(formData.get("phoneNumber") ?? "").trim() || null,
        organizationId:
          String(formData.get("organizationId") ?? "").trim() || null,
        licenseNumber: String(formData.get("licenseNumber") ?? "").trim() || null,
        specialty: String(formData.get("specialty") ?? "").trim() || null,
        isActive: true,
        emailVerified: true,
      },
      {
        onSuccess: () => {
          toast.success("Clinician user created.");
          form.reset();
        },
        onError: (error) => {
          toast.error("Failed to create clinician", {
            description: getMutationMessage(error, "Please check the details and retry."),
          });
        },
      },
    );
  };

  const handleToggleClinician = (clinician: AdminClinician) => {
    updateClinicianMutation.mutate(
      {
        clinicianId: clinician.id,
        input: {
          isActive: !clinician.isActive,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            clinician.isActive ? "Clinician deactivated." : "Clinician activated.",
          );
        },
        onError: (error) => {
          toast.error("Failed to update clinician", {
            description: getMutationMessage(error, "Please try again."),
          });
        },
      },
    );
  };

  const handleUpsertPermission = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const organizationId = String(formData.get("organizationId") ?? "").trim();
    const userEmail = String(formData.get("userEmail") ?? "").trim().toLowerCase();
    const permissionRole = String(formData.get("permissionRole") ?? "ORG_ADMIN");

    if (!organizationId || !userEmail) {
      toast.error("Organization and user email are required.");
      return;
    }

    upsertPermissionMutation.mutate(
      {
        organizationId,
        userEmail,
        role: permissionRole,
        scopes: {
          manageClinicians: permissionRole !== "AUDITOR",
          viewAudit: true,
          manageCohorts: permissionRole !== "AUDITOR",
        },
      },
      {
        onSuccess: () => {
          toast.success("Organization permission saved.");
          form.reset();
        },
        onError: (error) => {
          toast.error("Failed to save permission", {
            description: getMutationMessage(error, "Please check the user and organization."),
          });
        },
      },
    );
  };

  const handleAssignOrganization = (
    clinician: AdminClinician,
    organizationId: string,
  ) => {
    updateClinicianMutation.mutate(
      {
        clinicianId: clinician.id,
        input: {
          organizationId: organizationId || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Clinician organization updated.");
        },
        onError: (error) => {
          toast.error("Failed to update organization", {
            description: getMutationMessage(error, "Please try again."),
          });
        },
      },
    );
  };

  if (role !== "ADMIN") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Admin access required</AlertTitle>
        <AlertDescription>
          This area is only available to CheckUpp admin users.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clinician Administration"
        description="Manage clinician users, organization assignment, and the operational structure behind the clinician portal."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Organizations</CardDescription>
            <CardTitle className="text-2xl">{organizations.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Clinics, hospitals, and care teams using CheckUpp.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clinician Users</CardDescription>
            <CardTitle className="text-2xl">{clinicians.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Accounts configured for clinician portal access.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Clinicians</CardDescription>
            <CardTitle className="text-2xl">{activeClinicians.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Active profiles that can operate in production.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-primary" />
              Organizations
            </CardTitle>
            <CardDescription>
              Create the organizations that clinicians belong to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleCreateOrganization}>
              <div className="space-y-2">
                <Label htmlFor="org-name">Name</Label>
                <Input
                  id="org-name"
                  name="name"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="e.g. CheckUpp Health Center"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug</Label>
                <Input
                  id="org-slug"
                  name="slug"
                  placeholder={slugPreview(organizationName) || "auto-generated"}
                />
              </div>
              <div className="flex items-end">
                <Button disabled={createOrganizationMutation.isPending} type="submit">
                  <Plus className="mr-1 size-4" />
                  Add
                </Button>
              </div>
            </form>

            <Separator />

            <div className="overflow-hidden border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Clinicians</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                        No organizations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    organizations.map((organization) => (
                      <TableRow key={organization.id}>
                        <TableCell className="font-medium">{organization.name}</TableCell>
                        <TableCell className="text-muted-foreground">{organization.slug}</TableCell>
                        <TableCell className="text-right">
                          {organization._count?.clinicians ?? 0}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRoundPlus className="size-4 text-primary" />
              Create Clinician
            </CardTitle>
            <CardDescription>
              Create native API login credentials and attach the clinician to an organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateClinician}>
              <div className="space-y-2">
                <Label htmlFor="clinician-name">Full name</Label>
                <Input id="clinician-name" name="name" placeholder="Dr. Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinician-email">Email</Label>
                <Input id="clinician-email" name="email" type="email" placeholder="jane@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinician-password">Temporary password</Label>
                <Input id="clinician-password" name="password" type="password" placeholder="At least 8 characters" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinician-phone">Phone</Label>
                <Input id="clinician-phone" name="phoneNumber" placeholder="+256..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinician-organization">Organization</Label>
                <OrganizationSelector
                  id="clinician-organization"
                  name="organizationId"
                  organizations={organizations}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinician-specialty">Specialty</Label>
                <Input id="clinician-specialty" name="specialty" placeholder="Preventive care" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinician-license">License number</Label>
                <Input id="clinician-license" name="licenseNumber" placeholder="License / council ID" />
              </div>
              <div className="flex items-end">
                <Button disabled={createClinicianMutation.isPending} type="submit">
                  <CheckCircle2 className="mr-1 size-4" />
                  Create Clinician
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Clinician Users</CardTitle>
              <CardDescription>
                Search, activate/deactivate, and reassign clinician accounts.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search clinicians"
                  className="w-full pl-9 md:w-72"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  void cliniciansQuery.refetch();
                  void organizationQuery.refetch();
                }}
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinician</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Patients</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinicians.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No clinicians found.
                    </TableCell>
                  </TableRow>
                ) : (
                  clinicians.map((clinician) => (
                    <TableRow key={clinician.id}>
                      <TableCell>
                        <div className="font-medium">{clinician.user.name}</div>
                        <div className="text-xs text-muted-foreground">{clinician.user.email}</div>
                      </TableCell>
                      <TableCell className="min-w-56">
                        <OrganizationSelector
                          id={`organization-${clinician.id}`}
                          name={`organization-${clinician.id}`}
                          defaultValue={clinician.organizationId}
                          organizations={organizations}
                          className="h-9"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-7 px-2 text-xs"
                          onClick={() => {
                            const selector = document.getElementById(
                              `organization-${clinician.id}`,
                            ) as HTMLSelectElement | null;
                            handleAssignOrganization(clinician, selector?.value ?? "");
                          }}
                        >
                          Save assignment
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {clinician.specialty || "—"}
                      </TableCell>
                      <TableCell>
                        <ClinicianStatusBadge clinician={clinician} />
                      </TableCell>
                      <TableCell>{clinician._count?.patientLinks ?? 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(clinician.user.lastLoginAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updateClinicianMutation.isPending}
                          onClick={() => handleToggleClinician(clinician)}
                        >
                          {clinician.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-primary" />
              Organization Permissions
            </CardTitle>
            <CardDescription>
              Grant organization-scoped admin, clinician-manager, or auditor access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleUpsertPermission}>
              <div className="space-y-2">
                <Label htmlFor="permission-organization">Organization</Label>
                <OrganizationSelector
                  id="permission-organization"
                  name="organizationId"
                  organizations={organizations}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permission-email">User email</Label>
                <Input id="permission-email" name="userEmail" type="email" placeholder="manager@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permission-role">Permission role</Label>
                <select
                  id="permission-role"
                  name="permissionRole"
                  className="h-9 w-full border border-input bg-background px-3 text-sm"
                  defaultValue="ORG_ADMIN"
                >
                  <option value="ORG_ADMIN">Org admin</option>
                  <option value="CLINICIAN_MANAGER">Clinician manager</option>
                  <option value="AUDITOR">Auditor</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={upsertPermissionMutation.isPending}>
                  Save Permission
                </Button>
              </div>
            </form>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Current permissions</p>
                <OrganizationSelector
                  id="permission-filter"
                  name="permissionFilter"
                  organizations={organizations}
                  className="h-8 max-w-64"
                  defaultValue={permissionOrganizationId}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const selector = document.getElementById("permission-filter") as HTMLSelectElement | null;
                    setPermissionOrganizationId(selector?.value ?? "");
                  }}
                >
                  Filter
                </Button>
              </div>
              <div className="overflow-hidden border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                          No organization permissions yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      permissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell>
                            <div className="font-medium">{permission.user?.name || "Unknown user"}</div>
                            <div className="text-xs text-muted-foreground">{permission.user?.email}</div>
                          </TableCell>
                          <TableCell>{permission.organization?.name || permission.organizationId}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{permission.role}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              Cohorts & Audit
            </CardTitle>
            <CardDescription>
              Monitor cohort setup and recent administrative/clinical audit events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Patient cohorts</p>
              <div className="overflow-hidden border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohorts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                          No cohorts yet. Create cohorts from patient worklist actions.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cohorts.slice(0, 8).map((cohort) => (
                        <TableRow key={cohort.id}>
                          <TableCell>
                            <div className="font-medium">{cohort.name}</div>
                            <div className="text-xs text-muted-foreground">{cohort.description || "No description"}</div>
                          </TableCell>
                          <TableCell>{cohort._count?.members ?? 0}</TableCell>
                          <TableCell>{formatDate(cohort.updatedAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Recent audit events</p>
              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <div className="border border-dashed p-4 text-sm text-muted-foreground">
                    No audit events returned.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{log.action}</p>
                        <Badge variant="outline">{log.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.resourceType} • {formatDate(log.createdAt)} • {log.actor?.email || "System"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
