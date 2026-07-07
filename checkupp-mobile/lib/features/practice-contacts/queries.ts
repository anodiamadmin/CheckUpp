import * as SecureStore from "expo-secure-store";
import {
  listMyPracticeContacts,
  PracticeContactRecord,
} from "@/lib/appwrite/practiceContacts";
import { queryKeys } from "@/lib/query/keys";
import useApiQuery from "@/lib/query/useApiQuery";
import {
  PracticeContactForm,
  PracticeContactStorageKeys,
} from "./types";

const normalizeContact = (
  source:
    | Partial<PracticeContactForm>
    | {
        hotdocUrl?: string | null;
        practicePhone?: string | null;
        practiceEmail?: string | null;
      }
    | null
    | undefined,
  defaultHotdocUrl: string,
): PracticeContactForm => ({
  hotdocUrl: source?.hotdocUrl || defaultHotdocUrl,
  practicePhone: source?.practicePhone || "",
  practiceEmail: source?.practiceEmail || "",
});

const loadStoredContact = async (
  storageKeys: PracticeContactStorageKeys,
): Promise<Partial<PracticeContactForm>> => {
  const [screeningContact, defaultContactValue] = await Promise.all([
    SecureStore.getItemAsync(storageKeys.screeningKey),
    SecureStore.getItemAsync(storageKeys.defaultKey),
  ]);

  const fallbackValue = screeningContact || defaultContactValue;
  if (!fallbackValue) {
    return {};
  }

  try {
    return JSON.parse(fallbackValue) as Partial<PracticeContactForm>;
  } catch {
    return {};
  }
};

const resolvePreferredContact = ({
  contacts,
  screeningName,
  defaultHotdocUrl,
  storedContact,
}: {
  contacts: PracticeContactRecord[];
  screeningName: string;
  defaultHotdocUrl: string;
  storedContact: Partial<PracticeContactForm>;
}) => {
  const remoteScreeningContact = contacts.find(
    (entry) => entry.screeningName === screeningName,
  );
  const remoteDefaultContact = contacts.find((entry) => entry.isDefault);

  return normalizeContact(
    remoteScreeningContact || remoteDefaultContact || storedContact,
    defaultHotdocUrl,
  );
};

export const loadPracticeContact = async ({
  screeningName,
  storageKeys,
  defaultHotdocUrl,
}: {
  screeningName: string;
  storageKeys: PracticeContactStorageKeys;
  defaultHotdocUrl: string;
}) => {
  const storedContact = await loadStoredContact(storageKeys);

  try {
    const contacts = await listMyPracticeContacts();
    return resolvePreferredContact({
      contacts,
      screeningName,
      defaultHotdocUrl,
      storedContact,
    });
  } catch (error) {
    console.warn("Falling back to local practice contact cache:", error);
    return normalizeContact(storedContact, defaultHotdocUrl);
  }
};

export const usePracticeContact = ({
  screeningName,
  storageKeys,
  defaultHotdocUrl,
}: {
  screeningName: string;
  storageKeys: PracticeContactStorageKeys;
  defaultHotdocUrl: string;
}) =>
  useApiQuery(
    () =>
      loadPracticeContact({
        screeningName,
        storageKeys,
        defaultHotdocUrl,
      }),
    {
      deps: [screeningName, storageKeys.defaultKey, storageKeys.screeningKey],
      initialData: normalizeContact(undefined, defaultHotdocUrl),
      queryKey: queryKeys.practiceContacts.screening(screeningName),
      showErrorToast: false,
    },
  );

export { normalizeContact };
