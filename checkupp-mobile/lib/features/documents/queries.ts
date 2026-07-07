import { fetchUserFiles, searchUserFiles } from "@/lib/appwrite/userFiles";
import { queryKeys } from "@/lib/query/keys";
import useApiQuery from "@/lib/query/useApiQuery";

export const useWalletFiles = (userId?: string | null) =>
  useApiQuery(() => fetchUserFiles(userId || ""), {
    enabled: Boolean(userId),
    deps: [userId],
    queryKey: queryKeys.wallet.files(userId),
  });

export const useWalletSearch = (
  userId: string | null | undefined,
  query: string,
) =>
  useApiQuery(() => searchUserFiles(query, userId || ""), {
    enabled: Boolean(userId && query.trim()),
    deps: [query, userId],
    queryKey: queryKeys.wallet.search(userId, query),
  });
