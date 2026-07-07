import * as SecureStore from "expo-secure-store";
import {
  PracticeContactPayload,
  PracticeContactRecord,
  saveMyPracticeContact,
} from "@/lib/appwrite/practiceContacts";
import { queryKeys } from "@/lib/query/keys";
import useApiMutation from "@/lib/query/useApiMutation";
import { PracticeContactForm, PracticeContactStorageKeys } from "./types";

type SavePracticeContactVariables = {
  screeningName: string;
  contact: PracticeContactForm;
  storageKeys: PracticeContactStorageKeys;
  defaultHotdocUrl: string;
};

type SavePracticeContactResult = {
  screeningRecord: PracticeContactRecord | null;
  defaultRecord: PracticeContactRecord | null;
  contact: PracticeContactForm;
};

const toPayload = (
  contact: PracticeContactForm,
  overrides: Pick<PracticeContactPayload, "screeningName" | "isDefault">,
): PracticeContactPayload => ({
  ...overrides,
  hotdocUrl: contact.hotdocUrl || null,
  practicePhone: contact.practicePhone || null,
  practiceEmail: contact.practiceEmail || null,
});

const mergeContactRecord = (
  currentRecords: PracticeContactRecord[] | undefined,
  nextRecord: PracticeContactRecord | null,
  predicate: (record: PracticeContactRecord) => boolean,
) => {
  if (!nextRecord) {
    return currentRecords ?? [];
  }

  const existing = Array.isArray(currentRecords) ? currentRecords : [];
  const withoutTarget = existing.filter((record) => !predicate(record));
  return [nextRecord, ...withoutTarget];
};

const savePracticeContact = async ({
  screeningName,
  contact,
  storageKeys,
}: SavePracticeContactVariables): Promise<SavePracticeContactResult> => {
  let screeningRecord: PracticeContactRecord | null = null;
  let defaultRecord: PracticeContactRecord | null = null;

  try {
    [screeningRecord, defaultRecord] = await Promise.all([
      saveMyPracticeContact(
        toPayload(contact, {
          screeningName,
          isDefault: false,
        }),
      ),
      saveMyPracticeContact(
        toPayload(contact, {
          screeningName: null,
          isDefault: true,
        }),
      ),
    ]);
  } catch (error) {
    console.warn(
      "Failed to persist practice contact to API, caching locally:",
      error,
    );
  }

  await Promise.all([
    SecureStore.setItemAsync(storageKeys.screeningKey, JSON.stringify(contact)),
    SecureStore.setItemAsync(storageKeys.defaultKey, JSON.stringify(contact)),
  ]);

  return {
    screeningRecord,
    defaultRecord,
    contact,
  };
};

export const useSavePracticeContactMutation = () =>
  useApiMutation<SavePracticeContactResult, SavePracticeContactVariables>({
    mutationKey: ["practice-contacts", "save"],
    mutationFn: savePracticeContact,
    showSuccessToast: true,
    getSuccessMessage: () => "Practice contact saved",
    updateQueryData: ({ data, variables, queryClient }) => {
      queryClient.setQueryData(
        queryKeys.practiceContacts.screening(variables.screeningName),
        data.contact,
      );
      queryClient.setQueryData(
        queryKeys.practiceContacts.default(),
        data.contact,
      );
      queryClient.setQueryData<PracticeContactRecord[]>(
        queryKeys.practiceContacts.list(),
        (currentRecords) => {
          const withScreeningRecord = mergeContactRecord(
            currentRecords,
            data.screeningRecord,
            (record) => record.screeningName === variables.screeningName,
          );

          return mergeContactRecord(
            withScreeningRecord,
            data.defaultRecord,
            (record) => Boolean(record.isDefault),
          );
        },
      );
    },
    invalidateQueries: [queryKeys.practiceContacts.list()],
  });
