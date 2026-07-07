import {
  deletePregnancyData,
  markCheckupAsCompleted,
  savePregnancyPlannerData,
} from "@/lib/appwrite/pregnancy";
import { queryKeys } from "@/lib/query/keys";
import useApiMutation from "@/lib/query/useApiMutation";
import { normalizePregnancyPlan } from "./queries";
import {
  PregnancyCheckupItem,
  PregnancyPlanSnapshot,
  SavePregnancyPlanInput,
} from "./types";

const toSerializableCheckups = (checkupDates: PregnancyCheckupItem[]) =>
  checkupDates.map((item) => ({
    name: item.name,
    date: item.date,
    completed: item.completed,
    icon: item.icon,
    color: item.color,
    bgColor: item.bgColor,
    borderColor: item.borderColor,
    textColor: item.textColor,
  }));

const createSnapshot = (
  data: SavePregnancyPlanInput,
): PregnancyPlanSnapshot => ({
  conceptionDate: data.conceptionDate.toISOString(),
  expectedDueDate: data.expectedDueDate.toISOString(),
  estimatedCheckupDates: toSerializableCheckups(data.estimatedCheckupDates),
});

export const useSavePregnancyPlanMutation = (userId?: string | null) =>
  useApiMutation<any, SavePregnancyPlanInput>({
    mutationKey: ["pregnancy", "save"],
    mutationFn: async (data) => {
      return savePregnancyPlannerData({
        conceptionDate: data.conceptionDate,
        expectedDueDate: data.expectedDueDate,
        estimatedCheckUpDates: JSON.stringify(
          toSerializableCheckups(data.estimatedCheckupDates),
        ),
        userId,
      });
    },
    updateQueryData: ({ data, variables, queryClient }) => {
      queryClient.setQueryData(
        queryKeys.pregnancy.plan(userId),
        normalizePregnancyPlan(data) ?? createSnapshot(variables),
      );
    },
  });

export const useMarkPregnancyCheckupCompletedMutation = (
  userId?: string | null,
) =>
  useApiMutation<any, string>({
    mutationKey: ["pregnancy", "checkup-complete"],
    mutationFn: async (checkupName) =>
      markCheckupAsCompleted(userId || "", checkupName),
    updateQueryData: ({ data, variables, queryClient }) => {
      queryClient.setQueryData<PregnancyPlanSnapshot | null>(
        queryKeys.pregnancy.plan(userId),
        (currentPlan) => {
          const normalizedResponse = normalizePregnancyPlan(data);
          if (normalizedResponse) {
            return normalizedResponse;
          }

          if (!currentPlan) {
            return currentPlan;
          }

          return {
            ...currentPlan,
            estimatedCheckupDates: currentPlan.estimatedCheckupDates.map(
              (item) =>
                item.name === variables ? { ...item, completed: true } : item,
            ),
          };
        },
      );
    },
  });

export const useDeletePregnancyPlanMutation = (userId?: string | null) =>
  useApiMutation<any, void>({
    mutationKey: ["pregnancy", "delete"],
    mutationFn: async () => deletePregnancyData(userId || ""),
    updateQueryData: ({ queryClient }) => {
      queryClient.setQueryData(queryKeys.pregnancy.plan(userId), null);
    },
  });
