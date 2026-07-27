import type {
  AdminListQueryInput,
  CliniciansAdminQueryInput,
  PatientsQueryInput,
  TimelineQueryInput,
  WorklistQueryInput,
  AuditLogsQueryInput,
} from "@/lib/api/clinician";

const clinicianPatientsBase = ["clinician-patients"] as const;
const patientWorklistBase = ["patient-worklist"] as const;
const organizationsBase = ["clinician-admin-organizations"] as const;
const adminCliniciansBase = ["clinician-admin-clinicians"] as const;
const savedViewsBase = ["clinician-saved-views"] as const;
const cohortsBase = ["clinician-cohorts"] as const;
const organizationPermissionsBase = ["organization-permissions"] as const;
const auditLogsBase = ["clinician-admin-audit-logs"] as const;

export const queryKeys = {
  clinicianProfile: ["clinician-profile"] as const,
  clinicianPatientsBase,
  clinicianPatients: (query: PatientsQueryInput) =>
    [...clinicianPatientsBase, query] as const,
  patientWorklistBase,
  patientWorklist: (query: WorklistQueryInput) =>
    [...patientWorklistBase, query] as const,
  savedViewsBase,
  savedViews: (viewType: string) => [...savedViewsBase, viewType] as const,
  cohortsBase,
  cohorts: [...cohortsBase] as const,
  organizationPermissionsBase,
  organizationPermissions: (organizationId?: string | null) =>
    [...organizationPermissionsBase, organizationId ?? "all"] as const,
  auditLogsBase,
  auditLogs: (query: AuditLogsQueryInput) => [...auditLogsBase, query] as const,
  organizationsBase,
  organizations: (query: AdminListQueryInput) =>
    [...organizationsBase, query] as const,
  adminCliniciansBase,
  adminClinicians: (query: CliniciansAdminQueryInput) =>
    [...adminCliniciansBase, query] as const,
  patientTimelineBase: (patientId: string) => ["patient-timeline", patientId] as const,
  patientTimeline: (patientId: string, query: TimelineQueryInput) =>
    ["patient-timeline", patientId, query] as const,
};
