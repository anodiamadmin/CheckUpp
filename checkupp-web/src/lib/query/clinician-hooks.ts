"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCareTask,
  createCohort,
  createClinician,
  createOrganization,
  createReminderRequest,
  createSavedView,
  deleteSavedView,
  getCohorts,
  getClinicianPatients,
  getClinicianProfile,
  getAdminClinicians,
  getAuditLogs,
  getOrganizations,
  getOrganizationPermissions,
  getPatientTimeline,
  getPatientWorklist,
  getSavedViews,
  linkPatient,
  linkPatientByEmail,
  requestConsent,
  reviewDocument,
  revokeConsent,
  sendPatientMessage,
  unlinkPatient,
  updateCareTask,
  updateClinician,
  updateOrganization,
  updateReminderRequest,
  upsertOrganizationPermission,
  upsertClinicianProfile,
  type AdminListQueryInput,
  type AuditLogsQueryInput,
  type CliniciansAdminQueryInput,
  type CreateCareTaskInput,
  type CreateCohortInput,
  type CreateClinicianInput,
  type CreateOrganizationInput,
  type CreateReminderRequestInput,
  type CreateSavedViewInput,
  type LinkPatientByEmailInput,
  type LinkPatientInput,
  type PatientsQueryInput,
  type RequestConsentInput,
  type ReviewDocumentInput,
  type RevokeConsentInput,
  type SendPatientMessageInput,
  type TimelineQueryInput,
  type UpdateCareTaskInput,
  type UpdateClinicianInput,
  type UpdateOrganizationInput,
  type UpdateReminderRequestInput,
  type UpsertOrganizationPermissionInput,
  type UpsertClinicianProfileInput,
  type WorklistQueryInput,
} from "@/lib/api/clinician";
import { queryKeys } from "@/lib/query/keys";

export const useClinicianProfileQuery = () => {
  return useQuery({
    queryKey: queryKeys.clinicianProfile,
    queryFn: getClinicianProfile,
    staleTime: 60_000,
  });
};

export const useClinicianPatientsQuery = (query: PatientsQueryInput) => {
  return useQuery({
    queryKey: queryKeys.clinicianPatients(query),
    queryFn: () => getClinicianPatients(query),
    staleTime: 30_000,
  });
};

export const usePatientTimelineQuery = (
  patientId: string,
  query: TimelineQueryInput = {}
) => {
  return useQuery({
    queryKey: queryKeys.patientTimeline(patientId, query),
    queryFn: () => getPatientTimeline(patientId, query),
    staleTime: 15_000,
    enabled: Boolean(patientId),
  });
};

export const usePatientWorklistQuery = (query: WorklistQueryInput) => {
  return useQuery({
    queryKey: queryKeys.patientWorklist(query),
    queryFn: () => getPatientWorklist(query),
    staleTime: 20_000,
  });
};

export const useSavedViewsQuery = (viewType = "PATIENT_WORKLIST") => {
  return useQuery({
    queryKey: queryKeys.savedViews(viewType),
    queryFn: () => getSavedViews(viewType),
    staleTime: 60_000,
  });
};

export const useCohortsQuery = () => {
  return useQuery({
    queryKey: queryKeys.cohorts,
    queryFn: getCohorts,
    staleTime: 60_000,
  });
};

export const useOrganizationPermissionsQuery = (organizationId?: string | null) => {
  return useQuery({
    queryKey: queryKeys.organizationPermissions(organizationId),
    queryFn: () => getOrganizationPermissions(organizationId),
    staleTime: 60_000,
  });
};

export const useAuditLogsQuery = (query: AuditLogsQueryInput = {}) => {
  return useQuery({
    queryKey: queryKeys.auditLogs(query),
    queryFn: () => getAuditLogs(query),
    staleTime: 30_000,
  });
};

export const useOrganizationsQuery = (query: AdminListQueryInput = {}) => {
  return useQuery({
    queryKey: queryKeys.organizations(query),
    queryFn: () => getOrganizations(query),
    staleTime: 60_000,
  });
};

export const useAdminCliniciansQuery = (
  query: CliniciansAdminQueryInput = {},
) => {
  return useQuery({
    queryKey: queryKeys.adminClinicians(query),
    queryFn: () => getAdminClinicians(query),
    staleTime: 30_000,
  });
};

export const useUpsertClinicianProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertClinicianProfileInput) => upsertClinicianProfile(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clinicianProfile,
      });
    },
  });
};

export const useLinkPatientMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, input }: { patientId: string; input: LinkPatientInput }) =>
      linkPatient(patientId, input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.clinicianPatientsBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientTimelineBase(variables.patientId),
        }),
      ]);
    },
  });
};

export const useUnlinkPatientMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientId: string) => unlinkPatient(patientId),
    onSuccess: async (_data, patientId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.clinicianPatientsBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientTimelineBase(patientId),
        }),
      ]);
    },
  });
};

export const useLinkPatientByEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LinkPatientByEmailInput) => linkPatientByEmail(input),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.clinicianPatientsBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientTimelineBase(data.patientId),
        }),
      ]);
    },
  });
};

export const useRequestConsentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, input }: { patientId: string; input: RequestConsentInput }) =>
      requestConsent(patientId, input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.clinicianPatientsBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientTimelineBase(variables.patientId),
        }),
      ]);
    },
  });
};

export const useGrantConsentMutation = useRequestConsentMutation;

export const useRevokeConsentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, input }: { patientId: string; input: RevokeConsentInput }) =>
      revokeConsent(patientId, input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.clinicianPatientsBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientTimelineBase(variables.patientId),
        }),
      ]);
    },
  });
};

export const useCreateOrganizationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => createOrganization(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organizationsBase,
      });
    },
  });
};

export const useUpdateOrganizationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      input,
    }: {
      organizationId: string;
      input: UpdateOrganizationInput;
    }) => updateOrganization(organizationId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationsBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.adminCliniciansBase,
        }),
      ]);
    },
  });
};

export const useCreateClinicianMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClinicianInput) => createClinician(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.adminCliniciansBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationsBase,
        }),
      ]);
    },
  });
};

export const useUpdateClinicianMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clinicianId,
      input,
    }: {
      clinicianId: string;
      input: UpdateClinicianInput;
    }) => updateClinician(clinicianId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.adminCliniciansBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationsBase,
        }),
      ]);
    },
  });
};

export const useCreateSavedViewMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSavedViewInput) => createSavedView(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savedViewsBase,
      });
    },
  });
};

export const useDeleteSavedViewMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (viewId: string) => deleteSavedView(viewId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savedViewsBase,
      });
    },
  });
};

export const useCreateCareTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCareTaskInput) => createCareTask(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientWorklistBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientTimelineBase(variables.patientId),
        }),
      ]);
    },
  });
};

export const useUpdateCareTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      input,
    }: {
      taskId: string;
      input: UpdateCareTaskInput;
      patientId?: string;
    }) => updateCareTask(taskId, input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientWorklistBase,
        }),
        variables.patientId
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.patientTimelineBase(variables.patientId),
            })
          : Promise.resolve(),
      ]);
    },
  });
};

export const useSendPatientMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendPatientMessageInput) => sendPatientMessage(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientWorklistBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientTimelineBase(variables.patientId),
        }),
      ]);
    },
  });
};

export const useCreateReminderRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReminderRequestInput) =>
      createReminderRequest(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientWorklistBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientTimelineBase(variables.patientId),
        }),
      ]);
    },
  });
};

export const useUpdateReminderRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reminderId,
      input,
    }: {
      reminderId: string;
      input: UpdateReminderRequestInput;
      patientId?: string;
    }) => updateReminderRequest(reminderId, input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientWorklistBase,
        }),
        variables.patientId
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.patientTimelineBase(variables.patientId),
            })
          : Promise.resolve(),
      ]);
    },
  });
};

export const useReviewDocumentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReviewDocumentInput & { patientId?: string }) =>
      reviewDocument(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientWorklistBase,
        }),
        variables.patientId
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.patientTimelineBase(variables.patientId),
            })
          : Promise.resolve(),
      ]);
    },
  });
};

export const useCreateCohortMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCohortInput) => createCohort(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.cohortsBase,
      });
    },
  });
};

export const useUpsertOrganizationPermissionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertOrganizationPermissionInput) =>
      upsertOrganizationPermission(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationPermissionsBase,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.auditLogsBase,
        }),
      ]);
    },
  });
};
